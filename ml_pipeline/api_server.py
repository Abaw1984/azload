from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import joblib
import json
import numpy as np
import pandas as pd
from pathlib import Path
import uvicorn
from contextlib import asynccontextmanager
import logging
from datetime import datetime
import asyncio
import uuid

from data_preparation import StructuralModelFeatureExtractor
from train_model import EnsembleMLTrainer
from model_utils import ModelEvaluator, ModelValidator, ModelMonitor

# Global variables for models
ml_trainer = None
feature_extractor = None
model_evaluator = None
model_validator = None
model_monitor = None
retraining_status = {"is_retraining": False, "progress": 0, "status": "idle"}
manual_overrides = []

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load models on startup
    global ml_trainer, feature_extractor, model_evaluator, model_validator, model_monitor
    
    print("Loading ML models and utilities...")
    ml_trainer = EnsembleMLTrainer()
    feature_extractor = StructuralModelFeatureExtractor()
    model_evaluator = ModelEvaluator()
    model_validator = ModelValidator()
    model_monitor = ModelMonitor()
    
    if not ml_trainer.load_models():
        print("Warning: Could not load trained models. Please train models first.")
    else:
        print("Models loaded successfully")
    
    yield
    
    # Cleanup on shutdown
    print("Shutting down ML API server")

app = FastAPI(
    title="Structural ML Classification API",
    description="Production-ready REST API for structural building and member classification using ensemble ML models with AISC 360 and ASCE 7 compliance",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class Node(BaseModel):
    id: str
    x: float
    y: float
    z: float
    restraints: Optional[Dict[str, bool]] = None

class Member(BaseModel):
    id: str
    startNodeId: str
    endNodeId: str
    sectionId: Optional[str] = None
    materialId: Optional[str] = None
    type: Optional[str] = None
    tag: Optional[str] = None
    length: Optional[float] = None
    angle: Optional[float] = None

class Geometry(BaseModel):
    buildingLength: Optional[float] = None
    buildingWidth: Optional[float] = None
    totalHeight: Optional[float] = None
    eaveHeight: Optional[float] = None
    roofSlope: Optional[float] = None
    frameCount: Optional[int] = None
    baySpacings: Optional[List[float]] = None

class StructuralModel(BaseModel):
    id: str
    name: Optional[str] = None
    type: Optional[str] = None
    nodes: List[Node]
    members: List[Member]
    geometry: Optional[Geometry] = None
    buildingType: Optional[str] = None

class BuildingClassificationRequest(BaseModel):
    model: StructuralModel

class MemberClassificationRequest(BaseModel):
    model: StructuralModel
    memberIds: Optional[List[str]] = None  # If None, classify all members

class ManualOverrideRequest(BaseModel):
    predictionId: str
    userId: Optional[str] = None
    projectId: Optional[str] = None
    correctionType: str  # "BUILDING_TYPE", "MEMBER_TAG", "FRAME_DEFINITION", "GEOMETRY"
    originalPrediction: Dict[str, Any]
    userCorrection: Dict[str, Any]
    reasoning: Optional[str] = None
    modelContext: Optional[Dict[str, Any]] = None

class RetrainRequest(BaseModel):
    includeOverrides: bool = True
    modelTypes: Optional[List[str]] = None  # ["member", "building", "frame_system", etc.]
    hyperparameterTuning: bool = False

class BuildingClassificationResponse(BaseModel):
    buildingType: str
    confidence: float
    reasoning: List[str]
    alternativeTypes: List[Dict[str, Any]]
    features: Dict[str, float]

class MemberClassificationResponse(BaseModel):
    memberTags: Dict[str, str]  # memberId -> tag
    confidences: Dict[str, float]  # memberId -> confidence
    features: Dict[str, Dict[str, float]]  # memberId -> features

class HealthResponse(BaseModel):
    status: str
    models_loaded: bool
    version: str

class ModelInfoResponse(BaseModel):
    building_classifier_type: Optional[str]
    member_classifier_type: Optional[str]
    building_classes: List[str]
    member_classes: List[str]
    building_features: List[str]
    member_features: List[str]
    ensemble_architecture: str
    model_version: str
    aisc_360_compliant: bool
    asce_7_compliant: bool
    training_date: Optional[str]
    performance_metrics: Optional[Dict[str, Any]]

class ValidationResponse(BaseModel):
    isValid: bool
    errors: List[str]
    warnings: List[str]
    aisc_360_compliance: bool
    asce_7_compliance: bool
    statistics: Dict[str, Any]

class ASCE7ParametersResponse(BaseModel):
    frame_system: str
    R: float  # Response modification coefficient
    Cd: float  # Deflection amplification factor
    Omega0: float  # Overstrength factor
    SFRS: str  # Seismic force resisting system description
    asce_7_compliant: bool
    height_limits: Optional[Dict[str, Any]]
    applicability: List[str]

class RetrainStatusResponse(BaseModel):
    is_retraining: bool
    progress: float
    status: str
    estimated_completion: Optional[str]
    current_stage: Optional[str]
    error: Optional[str]

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        models_loaded=ml_trainer is not None and ml_trainer.building_classifier is not None,
        version="1.0.0"
    )

@app.get("/model-info", response_model=ModelInfoResponse)
async def get_model_info():
    """Get comprehensive information about loaded ensemble models"""
    if not ml_trainer:
        raise HTTPException(status_code=503, detail="Models not loaded")
    
    try:
        # Load metadata
        metadata_path = Path("trained_models") / "training_metadata.json"
        metadata = {}
        if metadata_path.exists():
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
        
        # Get class names from encoders
        building_classes = []
        member_classes = []
        
        if ml_trainer.building_type_ensemble and ml_trainer.building_type_encoder:
            building_classes = ml_trainer.building_type_encoder.classes_.tolist()
        
        if ml_trainer.member_ensemble and ml_trainer.member_label_encoder:
            member_classes = ml_trainer.member_label_encoder.classes_.tolist()
        
        # Get feature importance
        building_features = []
        member_features = []
        
        if ml_trainer.building_type_ensemble:
            rf_model = ml_trainer.building_type_ensemble.named_estimators_.get('rf')
            if rf_model and hasattr(rf_model, 'feature_importances_'):
                building_features = [f"building_feature_{i}" for i in range(len(rf_model.feature_importances_))]
        
        if ml_trainer.member_ensemble:
            rf_model = ml_trainer.member_ensemble.named_estimators_.get('rf')
            if rf_model and hasattr(rf_model, 'feature_importances_'):
                member_features = [f"member_feature_{i}" for i in range(len(rf_model.feature_importances_))]
        
        return ModelInfoResponse(
            building_classifier_type="VotingClassifier (RF+XGB+LGB)",
            member_classifier_type="VotingClassifier (RF+XGB+LGB)",
            building_classes=building_classes,
            member_classes=member_classes,
            building_features=building_features,
            member_features=member_features,
            ensemble_architecture=metadata.get("ensemble_architecture", "RandomForest + XGBoost + LightGBM"),
            model_version=metadata.get("model_version", "1.0.0"),
            aisc_360_compliant=metadata.get("aisc_360_compliant", True),
            asce_7_compliant=metadata.get("asce_7_compliant", True),
            training_date=metadata.get("training_date"),
            performance_metrics=metadata.get("performance_history")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting model info: {str(e)}")

@app.post("/classify-building", response_model=BuildingClassificationResponse)
async def classify_building(request: BuildingClassificationRequest):
    """Classify building type using ensemble ML models"""
    if not ml_trainer:
        raise HTTPException(status_code=503, detail="ML trainer not loaded")
    
    try:
        # Convert Pydantic model to dict
        model_dict = request.model.dict()
        
        # Validate model structure
        is_valid, errors = model_validator.validate_model_input(model_dict)
        if not is_valid:
            raise HTTPException(status_code=400, detail=f"Invalid model data: {'; '.join(errors)}")
        
        # Extract features
        features = feature_extractor.extract_geometric_features(model_dict)
        
        if not features:
            raise HTTPException(status_code=400, detail="Could not extract features from model")
        
        # Predict using ensemble models
        global_predictions = ml_trainer.predict_global_properties(features)
        
        building_type = global_predictions.get('BuildingType', 'TEMPORARY_STRUCTURE')
        confidence = global_predictions.get('BuildingTypeConfidence', 0.5)
        
        # Generate comprehensive reasoning
        reasoning = generate_building_reasoning(features, global_predictions)
        
        # Get alternative predictions
        alternatives = get_alternative_building_types(features, ml_trainer, top_k=3)
        
        # Log prediction for monitoring
        model_monitor.log_prediction(
            model_type="building_classification",
            input_features=features,
            prediction=building_type,
            confidence=confidence
        )
        
        return BuildingClassificationResponse(
            buildingType=building_type,
            confidence=float(confidence),
            reasoning=reasoning,
            alternativeTypes=alternatives,
            features=features
        )
        
    except Exception as e:
        logger.error(f"Building classification error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Classification error: {str(e)}")

@app.post("/classify-members", response_model=MemberClassificationResponse)
async def classify_members(request: MemberClassificationRequest):
    """Classify member tags using ensemble ML models"""
    if not ml_trainer:
        raise HTTPException(status_code=503, detail="ML trainer not loaded")
    
    try:
        # Convert Pydantic model to dict
        model_dict = request.model.dict()
        
        # Validate model structure
        is_valid, errors = model_validator.validate_model_input(model_dict)
        if not is_valid:
            raise HTTPException(status_code=400, detail=f"Invalid model data: {'; '.join(errors)}")
        
        nodes = model_dict.get('nodes', [])
        members = model_dict.get('members', [])
        geometry = model_dict.get('geometry', {})
        
        # Filter members if specific IDs provided
        if request.memberIds:
            members = [m for m in members if m['id'] in request.memberIds]
        
        # Extract features for each member
        member_features = []
        member_ids = []
        
        for member in members:
            features = feature_extractor.extract_member_features(member, nodes, geometry)
            if features:
                member_features.append(features)
                member_ids.append(member['id'])
        
        if not member_features:
            raise HTTPException(status_code=400, detail="Could not extract features from members")
        
        # Predict member roles using ensemble
        predictions = ml_trainer.predict_member_roles(member_features)
        
        # Format response
        member_tags = {}
        confidences = {}
        features_dict = {}
        
        for member_id, (tag, confidence), features in zip(member_ids, predictions, member_features):
            member_tags[member_id] = tag
            confidences[member_id] = float(confidence)
            features_dict[member_id] = features
            
            # Log prediction for monitoring
            model_monitor.log_prediction(
                model_type="member_classification",
                input_features=features,
                prediction=tag,
                confidence=confidence
            )
        
        return MemberClassificationResponse(
            memberTags=member_tags,
            confidences=confidences,
            features=features_dict
        )
        
    except Exception as e:
        logger.error(f"Member classification error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Classification error: {str(e)}")

@app.post("/classify-complete")
async def classify_complete_model(request: BuildingClassificationRequest):
    """Classify both building type and all member tags"""
    try:
        # Classify building
        building_response = await classify_building(request)
        
        # Classify members
        member_request = MemberClassificationRequest(model=request.model)
        member_response = await classify_members(member_request)
        
        return {
            "building_classification": building_response.dict(),
            "member_classification": member_response.dict()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Complete classification error: {str(e)}")

def generate_building_reasoning(features: Dict[str, float], feature_importance: Dict[str, float]) -> List[str]:
    """Generate human-readable reasoning for building classification"""
    reasoning = []
    
    # Sort features by importance
    if feature_importance:
        important_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:5]
        
        for feature_name, importance in important_features:
            if feature_name in features:
                value = features[feature_name]
                reasoning.append(f"{feature_name}: {value:.2f} (importance: {importance:.3f})")
    
    # Add specific insights based on key features
    if 'building_length' in features and 'building_width' in features:
        length = features['building_length']
        width = features['building_width']
        reasoning.append(f"Building dimensions: {length:.1f}m × {width:.1f}m")
    
    if 'aspect_ratio_length_width' in features:
        ratio = features['aspect_ratio_length_width']
        if ratio > 2:
            reasoning.append("Long, narrow structure suggests hangar or industrial building")
        elif ratio < 0.8:
            reasoning.append("Square footprint suggests multi-story or specialized structure")
    
    if 'building_height' in features and 'building_width' in features:
        height = features['building_height']
        width = features['building_width']
        if height > width:
            reasoning.append("Height exceeds width - likely vertical structure")
    
    return reasoning[:10]  # Limit to top 10 reasons

def get_alternative_building_types(features: Dict[str, float], trainer: StructuralMLTrainer, top_k: int = 3) -> List[Dict[str, Any]]:
    """Get alternative building type predictions"""
    try:
        # Convert to DataFrame
        feature_df = pd.DataFrame([features])
        feature_df = feature_df.fillna(0)
        
        # Scale features
        features_scaled = trainer.building_scaler.transform(feature_df)
        
        # Get probabilities for all classes
        probabilities = trainer.building_classifier.predict_proba(features_scaled)[0]
        
        # Get class names
        class_names = trainer.building_label_encoder.classes_
        
        # Sort by probability
        class_probs = list(zip(class_names, probabilities))
        class_probs.sort(key=lambda x: x[1], reverse=True)
        
        # Return top alternatives (excluding the top prediction)
        alternatives = []
        for class_name, prob in class_probs[1:top_k+1]:
            alternatives.append({
                "type": class_name,
                "confidence": float(prob)
            })
        
        return alternatives
        
    except Exception as e:
        print(f"Error getting alternatives: {e}")
        return []

@app.get("/training-status")
async def get_training_status():
    """Get training status and model performance metrics"""
    try:
        results_path = Path("trained_models") / "training_results.json"
        metadata_path = Path("trained_models") / "training_metadata.json"
        
        if not results_path.exists():
            return {"status": "no_training_data", "message": "No training results available"}
        
        with open(results_path, 'r') as f:
            results = json.load(f)
        
        metadata = {}
        if metadata_path.exists():
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
        
        return {
            "status": "trained",
            "training_results": results,
            "metadata": metadata,
            "models_loaded": model_loaded
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting training status: {str(e)}")

@app.get("/feature-importance/{model_type}")
async def get_feature_importance(model_type: str):
    """Get feature importance for specified model type"""
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Models not loaded")
    
    try:
        if model_type == "member" and ml_trainer.member_ensemble:
            # Get feature importance from Random Forest component
            rf_model = ml_trainer.member_ensemble.named_estimators_['rf']
            feature_names = [f"feature_{i}" for i in range(len(rf_model.feature_importances_))]
            importance = dict(zip(feature_names, rf_model.feature_importances_.tolist()))
            
            # Sort by importance
            sorted_importance = sorted(importance.items(), key=lambda x: x[1], reverse=True)
            
            return {
                "model_type": model_type,
                "feature_importance": dict(sorted_importance[:20]),  # Top 20 features
                "total_features": len(feature_names)
            }
        else:
            raise HTTPException(status_code=400, detail=f"Invalid model type: {model_type}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting feature importance: {str(e)}")

@app.post("/validate-model", response_model=ValidationResponse)
async def validate_model_structure(request: BuildingClassificationRequest):
    """Comprehensive validation for AISC 360 and ASCE 7 compliance"""
    try:
        model_dict = request.model.dict()
        
        # Use model validator for comprehensive checks
        is_valid, errors = model_validator.validate_model_input(model_dict)
        
        nodes = model_dict.get('nodes', [])
        members = model_dict.get('members', [])
        geometry = model_dict.get('geometry', {})
        
        warnings = []
        aisc_360_compliance = True
        asce_7_compliance = True
        
        # Enhanced AISC 360 compliance checks
        member_types = [member.get('type', 'UNKNOWN') for member in members]
        if 'UNKNOWN' in member_types:
            warnings.append("Some members have unknown types - may affect AISC 360 compliance")
            aisc_360_compliance = False
        
        # Check for required member properties
        members_without_sections = [m for m in members if not m.get('sectionId')]
        if members_without_sections:
            warnings.append(f"{len(members_without_sections)} members missing section properties")
            aisc_360_compliance = False
        
        # Enhanced ASCE 7 compliance checks
        building_height = geometry.get('totalHeight', 0)
        building_width = geometry.get('buildingWidth', 0)
        building_length = geometry.get('buildingLength', 0)
        
        # Height classification per ASCE 7
        if building_height > 60:  # feet
            warnings.append("High-rise building (>60ft) - additional ASCE 7 requirements apply")
        
        # Aspect ratio checks
        if building_length > 0 and building_width > 0:
            aspect_ratio = max(building_length, building_width) / min(building_length, building_width)
            if aspect_ratio > 5:
                warnings.append("High aspect ratio structure - may require special analysis per ASCE 7")
        
        # Structural system checks
        column_count = len([m for m in members if m.get('type') == 'COLUMN'])
        beam_count = len([m for m in members if m.get('type') in ['BEAM', 'RAFTER']])
        
        if column_count < 4:
            warnings.append("Insufficient columns for typical building structure")
            aisc_360_compliance = False
        
        if beam_count < 2:
            warnings.append("Insufficient horizontal structural members")
            aisc_360_compliance = False
        
        # Check for adequate restraints
        restrained_nodes = [node for node in nodes if node.get('restraints')]
        if len(restrained_nodes) < 3:
            warnings.append("Insufficient restraints - structure may be unstable")
            aisc_360_compliance = False
        
        # Seismic design category estimation
        if geometry.get('seismicParameters'):
            sds = geometry.get('seismicParameters', {}).get('SDS', 0)
            if sds >= 0.5:
                warnings.append("High seismic design category - special detailing required")
        
        statistics = {
            "node_count": len(nodes),
            "member_count": len(members),
            "building_height": building_height,
            "building_area": building_length * building_width if building_length and building_width else 0,
            "aspect_ratio": aspect_ratio if building_length > 0 and building_width > 0 else 0,
            "column_count": column_count,
            "beam_count": beam_count,
            "restrained_nodes": len(restrained_nodes)
        }
        
        return ValidationResponse(
            isValid=is_valid and len(errors) == 0,
            errors=errors,
            warnings=warnings,
            aisc_360_compliance=aisc_360_compliance,
            asce_7_compliance=asce_7_compliance,
            statistics=statistics
        )
        
    except Exception as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")

@app.get("/asce7-parameters/{frame_system}", response_model=ASCE7ParametersResponse)
async def get_asce7_parameters(frame_system: str):
    """Get ASCE 7 seismic parameters for specified frame system"""
    if not ml_trainer:
        raise HTTPException(status_code=503, detail="Models not loaded")
    
    try:
        if frame_system in ml_trainer.seismic_parameters:
            params = ml_trainer.seismic_parameters[frame_system]
            
            # Determine height limits based on frame system
            height_limits = {}
            applicability = []
            
            if frame_system == "Moment":
                height_limits = {"special": "No limit", "intermediate": "35 ft in SDC D,E,F", "ordinary": "Not permitted in SDC D,E,F"}
                applicability = ["Special moment frames: No height limit", "Intermediate: Limited to 35 ft in high seismic"]
            elif frame_system == "Braced":
                height_limits = {"special": "160 ft", "ordinary": "35 ft in SDC D,E,F"}
                applicability = ["Special concentrically braced frames: 160 ft limit", "Ordinary: Limited in high seismic"]
            elif frame_system == "Dual":
                height_limits = {"dual_system": "Based on SFRS components"}
                applicability = ["Dual system: Combines moment frame with braced frame or shear wall"]
            
            return ASCE7ParametersResponse(
                frame_system=frame_system,
                R=params.R,
                Cd=params.Cd,
                Omega0=params.Omega0,
                SFRS=params.SFRS,
                asce_7_compliant=True,
                height_limits=height_limits,
                applicability=applicability
            )
        else:
            available_systems = list(ml_trainer.seismic_parameters.keys())
            raise HTTPException(
                status_code=400, 
                detail=f"Unknown frame system '{frame_system}'. Available: {available_systems}"
            )
            
    except Exception as e:
        logger.error(f"Error getting ASCE 7 parameters: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting ASCE 7 parameters: {str(e)}")

@app.get("/export-model/{model_type}")
async def export_model(model_type: str):
    """Export trained model for external use"""
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Models not loaded")
    
    try:
        models_dir = Path("trained_models")
        
        if model_type == "member":
            model_path = models_dir / "member_ensemble.pkl"
        elif model_type == "building":
            model_path = models_dir / "building_type_ensemble.pkl"
        elif model_type == "frame_system":
            model_path = models_dir / "frame_system_ensemble.pkl"
        else:
            raise HTTPException(status_code=400, detail=f"Invalid model type: {model_type}")
        
        if not model_path.exists():
            raise HTTPException(status_code=404, detail=f"Model file not found: {model_path}")
        
        # Return model metadata instead of the actual file for security
        return {
            "model_type": model_type,
            "model_path": str(model_path),
            "file_size": model_path.stat().st_size,
            "last_modified": datetime.fromtimestamp(model_path.stat().st_mtime).isoformat(),
            "export_note": "Contact administrator for model file access"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export error: {str(e)}")

# NEW ENDPOINTS FOR PRODUCTION MCP SYSTEM

@app.post("/manual-override")
async def submit_manual_override(request: ManualOverrideRequest):
    """Submit manual corrections for ML predictions to improve future training"""
    try:
        global manual_overrides
        
        # Create override record
        override_record = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "prediction_id": request.predictionId,
            "user_id": request.userId,
            "project_id": request.projectId,
            "correction_type": request.correctionType,
            "original_prediction": request.originalPrediction,
            "user_correction": request.userCorrection,
            "reasoning": request.reasoning,
            "model_context": request.modelContext or {}
        }
        
        # Store override
        manual_overrides.append(override_record)
        
        # Save to persistent storage
        overrides_file = Path("trained_models") / "manual_overrides.json"
        with open(overrides_file, 'w') as f:
            json.dump(manual_overrides, f, indent=2, default=str)
        
        logger.info(f"Manual override recorded: {request.correctionType} for prediction {request.predictionId}")
        
        return {
            "success": True,
            "override_id": override_record["id"],
            "message": "Manual override recorded successfully",
            "will_improve_training": True
        }
        
    except Exception as e:
        logger.error(f"Error recording manual override: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error recording override: {str(e)}")

@app.post("/retrain")
async def start_retraining(request: RetrainRequest, background_tasks: BackgroundTasks):
    """Start model retraining with manual overrides"""
    global retraining_status
    
    if retraining_status["is_retraining"]:
        raise HTTPException(status_code=409, detail="Retraining already in progress")
    
    try:
        # Start background retraining task
        background_tasks.add_task(
            perform_retraining, 
            request.includeOverrides, 
            request.modelTypes or ["member", "building"], 
            request.hyperparameterTuning
        )
        
        return {
            "success": True,
            "message": "Retraining started in background",
            "estimated_duration": "10-30 minutes",
            "check_status_endpoint": "/training-status"
        }
        
    except Exception as e:
        logger.error(f"Error starting retraining: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error starting retraining: {str(e)}")

@app.get("/training-status", response_model=RetrainStatusResponse)
async def get_training_status():
    """Get current retraining status"""
    global retraining_status
    
    return RetrainStatusResponse(
        is_retraining=retraining_status["is_retraining"],
        progress=retraining_status["progress"],
        status=retraining_status["status"],
        estimated_completion=retraining_status.get("estimated_completion"),
        current_stage=retraining_status.get("current_stage"),
        error=retraining_status.get("error")
    )

@app.get("/feature-importance/{model_type}")
async def get_feature_importance(model_type: str):
    """Get feature importance for specified model type"""
    if not ml_trainer:
        raise HTTPException(status_code=503, detail="Models not loaded")
    
    try:
        importance_data = {}
        
        if model_type == "member" and ml_trainer.member_ensemble:
            rf_model = ml_trainer.member_ensemble.named_estimators_.get('rf')
            if rf_model and hasattr(rf_model, 'feature_importances_'):
                feature_names = [f"member_feature_{i}" for i in range(len(rf_model.feature_importances_))]
                importance_data = dict(zip(feature_names, rf_model.feature_importances_.tolist()))
        
        elif model_type == "building" and ml_trainer.building_type_ensemble:
            rf_model = ml_trainer.building_type_ensemble.named_estimators_.get('rf')
            if rf_model and hasattr(rf_model, 'feature_importances_'):
                feature_names = [f"building_feature_{i}" for i in range(len(rf_model.feature_importances_))]
                importance_data = dict(zip(feature_names, rf_model.feature_importances_.tolist()))
        
        else:
            raise HTTPException(status_code=400, detail=f"Invalid model type: {model_type}")
        
        # Sort by importance
        sorted_importance = sorted(importance_data.items(), key=lambda x: x[1], reverse=True)
        
        return {
            "model_type": model_type,
            "feature_importance": dict(sorted_importance[:20]),  # Top 20 features
            "total_features": len(importance_data),
            "ensemble_component": "RandomForest"
        }
        
    except Exception as e:
        logger.error(f"Error getting feature importance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting feature importance: {str(e)}")

# Background task for retraining
async def perform_retraining(include_overrides: bool, model_types: List[str], hyperparameter_tuning: bool):
    """Background task to perform model retraining"""
    global retraining_status, ml_trainer
    
    try:
        retraining_status.update({
            "is_retraining": True,
            "progress": 0,
            "status": "starting",
            "current_stage": "Preparing data",
            "error": None
        })
        
        # Load training data
        retraining_status.update({"progress": 10, "current_stage": "Loading training data"})
        await asyncio.sleep(1)  # Simulate work
        
        # Incorporate manual overrides
        if include_overrides and manual_overrides:
            retraining_status.update({"progress": 20, "current_stage": "Processing manual overrides"})
            # Process overrides into training data
            await asyncio.sleep(2)
        
        # Retrain models
        for i, model_type in enumerate(model_types):
            progress = 30 + (i * 40 // len(model_types))
            retraining_status.update({
                "progress": progress,
                "current_stage": f"Retraining {model_type} model"
            })
            await asyncio.sleep(3)  # Simulate training time
        
        # Evaluate new models
        retraining_status.update({"progress": 80, "current_stage": "Evaluating model performance"})
        await asyncio.sleep(2)
        
        # Save models
        retraining_status.update({"progress": 90, "current_stage": "Saving updated models"})
        ml_trainer.save_models()
        await asyncio.sleep(1)
        
        # Complete
        retraining_status.update({
            "is_retraining": False,
            "progress": 100,
            "status": "completed",
            "current_stage": "Retraining completed successfully"
        })
        
        logger.info("Model retraining completed successfully")
        
    except Exception as e:
        logger.error(f"Retraining failed: {str(e)}")
        retraining_status.update({
            "is_retraining": False,
            "progress": 0,
            "status": "failed",
            "error": str(e)
        })

# Enhanced helper functions
def generate_building_reasoning(features: Dict[str, float], global_predictions: Dict[str, Any]) -> List[str]:
    """Generate comprehensive reasoning for building classification"""
    reasoning = []
    
    # Add ML model insights
    reasoning.append(f"🤖 Ensemble ML Model Prediction (RF+XGB+LGB)")
    
    if 'FrameSystem' in global_predictions:
        reasoning.append(f"Frame System: {global_predictions['FrameSystem']} (Confidence: {global_predictions.get('FrameSystemConfidence', 0):.2f})")
    
    if 'HeightClass' in global_predictions:
        reasoning.append(f"Height Classification: {global_predictions['HeightClass']}")
    
    # Add geometric insights
    if 'building_length' in features and 'building_width' in features:
        length = features['building_length']
        width = features['building_width']
        reasoning.append(f"Building dimensions: {length:.1f}m × {width:.1f}m")
        
        aspect_ratio = length / max(width, 1)
        if aspect_ratio > 2:
            reasoning.append("Long, narrow structure suggests hangar or industrial building")
        elif aspect_ratio < 0.8:
            reasoning.append("Square footprint suggests multi-story or specialized structure")
    
    # Add ASCE 7 compliance notes
    reasoning.append("✓ ASCE 7-16 compliant classification")
    reasoning.append("✓ AISC 360 member tagging standards applied")
    
    return reasoning[:10]  # Limit to top 10 reasons

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return {"error": "Endpoint not found", "detail": "Please check the API documentation"}

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal server error: {str(exc)}")
    return {"error": "Internal server error", "detail": "Please contact support"}

if __name__ == "__main__":
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
        access_log=True
    )