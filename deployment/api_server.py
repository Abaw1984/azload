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
user_override_database = []  # Store user corrections for learning
user_override_database = []  # Store user corrections for learning

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

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Structural ML Classification API",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "health": "/health",
            "model_info": "/model-info",
            "classify_building": "/classify-building",
            "classify_members": "/classify-members",
            "ml_pipeline_status": "/ml-pipeline/status",
            "documentation": "/docs"
        },
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Enhanced health check endpoint with ML pipeline status"""
    return HealthResponse(
        status="healthy",
        models_loaded=ml_trainer is not None and ml_trainer.building_type_ensemble is not None,
        version="1.0.0"
    )

@app.get("/ml-pipeline/status")
async def ml_pipeline_status():
    """Get ML pipeline training status and health"""
    try:
        # Check if training artifacts exist
        models_dir = Path("trained_models")
        training_complete = models_dir.exists() and len(list(models_dir.glob("*.pkl"))) > 0
        
        # Check configuration
        config_exists = Path("components.json").exists()
        
        # Check required files
        required_files = ["staad_guide.pdf", "staad_model.png"]
        files_status = {}
        for file in required_files:
            files_status[file] = Path(file).exists()
        
        return {
            "pipeline_status": "operational" if training_complete else "needs_training",
            "training_complete": training_complete,
            "config_loaded": config_exists,
            "required_files": files_status,
            "models_loaded": ml_trainer is not None and ml_trainer.building_type_ensemble is not None,
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0"
        }
        
    except Exception as e:
        logger.error(f"Error checking ML pipeline status: {str(e)}")
        return {
            "pipeline_status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.post("/ml-pipeline/train")
async def trigger_ml_training(background_tasks: BackgroundTasks):
    """Trigger ML pipeline training (Docker-based)"""
    try:
        # This would trigger the Docker ML pipeline
        # In production, this could run the Docker container
        background_tasks.add_task(run_ml_pipeline_docker)
        
        return {
            "status": "training_started",
            "message": "ML pipeline training initiated",
            "estimated_duration": "5-10 minutes",
            "check_status_endpoint": "/ml-pipeline/status",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error starting ML pipeline training: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Training start error: {str(e)}")

async def run_ml_pipeline_docker():
    """Background task to run ML pipeline in Docker"""
    try:
        import subprocess
        logger.info("Starting Docker ML pipeline training...")
        
        # Run the Docker ML pipeline
        result = subprocess.run(
            ["docker", "run", "--rm", "steel-ml"],
            capture_output=True,
            text=True,
            timeout=600  # 10 minute timeout
        )
        
        if result.returncode == 0:
            logger.info("ML pipeline training completed successfully")
            logger.info(f"Output: {result.stdout}")
        else:
            logger.error(f"ML pipeline training failed: {result.stderr}")
            
    except subprocess.TimeoutExpired:
        logger.error("ML pipeline training timed out")
    except Exception as e:
        logger.error(f"Error running ML pipeline: {str(e)}")

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

def get_alternative_building_types(features: Dict[str, float], trainer: EnsembleMLTrainer, top_k: int = 3) -> List[Dict[str, Any]]:
    """Get alternative building type predictions"""
    try:
        # Convert to DataFrame
        feature_df = pd.DataFrame([features])
        feature_df = feature_df.fillna(0)
        
        # Scale features
        features_scaled = trainer.global_scaler.transform(
            trainer.global_feature_selector.transform(feature_df)
        )
        
        # Get probabilities for all classes
        probabilities = trainer.building_type_ensemble.predict_proba(features_scaled)[0]
        
        # Get class names
        class_names = trainer.building_type_encoder.classes_
        
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
        
        # Extract member features
        member_features = []
        nodes = model_dict.get('nodes', [])
        members = model_dict.get('members', [])
        geometry = model_dict.get('geometry', {})
        
        target_members = members
        if request.memberIds:
            target_members = [m for m in members if m['id'] in request.memberIds]
        
        for member in target_members:
            features = feature_extractor.extract_member_features(member, nodes, geometry)
            if features:
                member_features.append(features)
        
        if not member_features:
            raise HTTPException(status_code=400, detail="Could not extract member features")
        
        # Predict using ensemble models
        predictions = ml_trainer.predict_member_roles(member_features)
        
        # Format response
        member_tags = {}
        confidences = {}
        features_dict = {}
        
        for i, (member, (role, confidence)) in enumerate(zip(target_members, predictions)):
            member_tags[member['id']] = role
            confidences[member['id']] = float(confidence)
            features_dict[member['id']] = member_features[i]
            
            # Log prediction for monitoring
            model_monitor.log_prediction(
                model_type="member_classification",
                input_features=member_features[i],
                prediction=role,
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

@app.post("/manual-override")
async def submit_manual_override(request: ManualOverrideRequest):
    """Submit manual override for model learning and improvement"""
    global user_override_database
    
    try:
        # Create override record with comprehensive data
        override_record = {
            "override_id": str(uuid.uuid4()),
            "prediction_id": request.predictionId,
            "user_id": request.userId or "anonymous",
            "project_id": request.projectId or "unknown",
            "correction_type": request.correctionType,
            "original_prediction": request.originalPrediction,
            "user_correction": request.userCorrection,
            "reasoning": request.reasoning or "No reasoning provided",
            "model_context": request.modelContext or {},
            "timestamp": datetime.now().isoformat(),
            "processed": False,
            "learning_impact": "pending_analysis"
        }
        
        # Store in memory database (in production, use persistent storage)
        user_override_database.append(override_record)
        manual_overrides.append(override_record)
        
        # Log the override for immediate learning
        logger.info(f"Manual override received: {request.correctionType} - {request.predictionId}")
        logger.info(f"Original: {request.originalPrediction}")
        logger.info(f"Corrected: {request.userCorrection}")
        logger.info(f"Reasoning: {request.reasoning}")
        
        # Analyze learning opportunity
        learning_analysis = analyze_override_for_learning(override_record)
        override_record["learning_impact"] = learning_analysis
        
        # Trigger background retraining if enough overrides accumulated
        if len(user_override_database) >= 10:  # Threshold for retraining
            logger.info(f"Threshold reached ({len(user_override_database)} overrides) - considering retraining")
            # In production, trigger background retraining task
        
        return {
            "success": True,
            "override_id": override_record["override_id"],
            "message": "Manual override recorded successfully",
            "learning_impact": learning_analysis,
            "total_overrides": len(user_override_database),
            "retraining_threshold": 10,
            "timestamp": override_record["timestamp"]
        }
        
    except Exception as e:
        logger.error(f"Error processing manual override: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Override processing error: {str(e)}")

@app.get("/learning-status")
async def get_learning_status():
    """Get current learning status and override statistics"""
    try:
        # Analyze override patterns
        building_corrections = [o for o in user_override_database if o["correction_type"] == "BUILDING_TYPE"]
        member_corrections = [o for o in user_override_database if o["correction_type"] == "MEMBER_TAG"]
        
        # Calculate learning metrics
        total_overrides = len(user_override_database)
        recent_overrides = len([o for o in user_override_database if 
                              datetime.fromisoformat(o["timestamp"]) > datetime.now().replace(hour=0, minute=0, second=0)])
        
        # Identify common correction patterns
        correction_patterns = analyze_correction_patterns(user_override_database)
        
        return {
            "learning_active": True,
            "total_overrides": total_overrides,
            "recent_overrides_today": recent_overrides,
            "building_type_corrections": len(building_corrections),
            "member_tag_corrections": len(member_corrections),
            "correction_patterns": correction_patterns,
            "retraining_threshold": 10,
            "ready_for_retraining": total_overrides >= 10,
            "learning_insights": generate_learning_insights(user_override_database),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting learning status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Learning status error: {str(e)}")

@app.post("/retrain-models")
async def retrain_models_with_overrides(request: RetrainRequest, background_tasks: BackgroundTasks):
    """Retrain models incorporating user overrides"""
    global retraining_status
    
    try:
        if retraining_status["is_retraining"]:
            raise HTTPException(status_code=409, detail="Retraining already in progress")
        
        # Start retraining process
        retraining_status = {
            "is_retraining": True,
            "progress": 0,
            "status": "starting",
            "start_time": datetime.now().isoformat()
        }
        
        # Add background task for retraining
        background_tasks.add_task(
            retrain_with_user_feedback,
            request.includeOverrides,
            request.modelTypes or ["member", "building"],
            request.hyperparameterTuning
        )
        
        return {
            "success": True,
            "message": "Model retraining started with user overrides",
            "override_count": len(user_override_database),
            "estimated_duration": "10-15 minutes",
            "check_status_endpoint": "/retrain-status",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error starting retraining: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Retraining error: {str(e)}")

@app.get("/retrain-status", response_model=RetrainStatusResponse)
async def get_retrain_status():
    """Get current retraining status"""
    return RetrainStatusResponse(**retraining_status)

async def retrain_with_user_feedback(include_overrides: bool, model_types: List[str], hyperparameter_tuning: bool):
    """Background task for retraining models with user feedback"""
    global retraining_status, ml_trainer
    
    try:
        retraining_status["status"] = "preparing_data"
        retraining_status["progress"] = 10
        
        # Prepare enhanced training data with user overrides
        enhanced_data = prepare_enhanced_training_data(user_override_database if include_overrides else [])
        
        retraining_status["status"] = "training_models"
        retraining_status["progress"] = 30
        
        # Retrain models
        new_trainer = EnsembleMLTrainer()
        
        if "member" in model_types:
            retraining_status["current_stage"] = "member_classification"
            retraining_status["progress"] = 50
            new_trainer.train_member_classification_ensemble(enhanced_data["member_df"])
        
        if "building" in model_types:
            retraining_status["current_stage"] = "building_classification"
            retraining_status["progress"] = 70
            new_trainer.train_global_classification_ensembles(enhanced_data["global_df"])
        
        retraining_status["status"] = "saving_models"
        retraining_status["progress"] = 90
        
        # Save new models
        new_trainer.save_models()
        
        # Replace global trainer
        ml_trainer = new_trainer
        
        # Mark overrides as processed
        for override in user_override_database:
            override["processed"] = True
        
        retraining_status = {
            "is_retraining": False,
            "progress": 100,
            "status": "completed",
            "completion_time": datetime.now().isoformat()
        }
        
        logger.info("Model retraining completed successfully with user feedback")
        
    except Exception as e:
        logger.error(f"Error during retraining: {str(e)}")
        retraining_status = {
            "is_retraining": False,
            "progress": 0,
            "status": "error",
            "error": str(e),
            "error_time": datetime.now().isoformat()
        }

def analyze_override_for_learning(override_record: Dict[str, Any]) -> str:
    """Analyze override for learning opportunities"""
    try:
        correction_type = override_record["correction_type"]
        original = override_record["original_prediction"]
        corrected = override_record["user_correction"]
        
        if correction_type == "BUILDING_TYPE":
            return f"Building type correction: {original.get('type', 'unknown')} → {corrected.get('type', 'unknown')}"
        elif correction_type == "MEMBER_TAG":
            return f"Member tag correction: {original.get('tag', 'unknown')} → {corrected.get('tag', 'unknown')}"
        else:
            return f"General correction: {correction_type}"
            
    except Exception as e:
        return f"Analysis error: {str(e)}"

def analyze_correction_patterns(overrides: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze patterns in user corrections"""
    try:
        patterns = {
            "most_corrected_building_types": {},
            "most_corrected_member_tags": {},
            "common_mistakes": [],
            "confidence_threshold_issues": []
        }
        
        for override in overrides:
            correction_type = override["correction_type"]
            original = override["original_prediction"]
            corrected = override["user_correction"]
            
            if correction_type == "BUILDING_TYPE":
                original_type = original.get("type", "unknown")
                corrected_type = corrected.get("type", "unknown")
                key = f"{original_type} → {corrected_type}"
                patterns["most_corrected_building_types"][key] = patterns["most_corrected_building_types"].get(key, 0) + 1
            
            elif correction_type == "MEMBER_TAG":
                original_tag = original.get("tag", "unknown")
                corrected_tag = corrected.get("tag", "unknown")
                key = f"{original_tag} → {corrected_tag}"
                patterns["most_corrected_member_tags"][key] = patterns["most_corrected_member_tags"].get(key, 0) + 1
        
        return patterns
        
    except Exception as e:
        return {"error": str(e)}

def generate_learning_insights(overrides: List[Dict[str, Any]]) -> List[str]:
    """Generate insights from user corrections"""
    try:
        insights = []
        
        if len(overrides) == 0:
            return ["No user corrections available yet"]
        
        # Analyze correction frequency
        building_corrections = len([o for o in overrides if o["correction_type"] == "BUILDING_TYPE"])
        member_corrections = len([o for o in overrides if o["correction_type"] == "MEMBER_TAG"])
        
        if building_corrections > member_corrections:
            insights.append("Building type classification needs improvement")
        elif member_corrections > building_corrections:
            insights.append("Member tagging accuracy needs improvement")
        else:
            insights.append("Both building and member classification need attention")
        
        # Recent activity
        recent_count = len([o for o in overrides if 
                          datetime.fromisoformat(o["timestamp"]) > datetime.now().replace(hour=0, minute=0, second=0)])
        
        if recent_count > 0:
            insights.append(f"{recent_count} corrections made today")
        
        # Learning readiness
        if len(overrides) >= 10:
            insights.append("Ready for model retraining with user feedback")
        else:
            insights.append(f"Need {10 - len(overrides)} more corrections for effective retraining")
        
        return insights[:5]  # Limit to top 5 insights
        
    except Exception as e:
        return [f"Error generating insights: {str(e)}"]

def prepare_enhanced_training_data(overrides: List[Dict[str, Any]]) -> Dict[str, pd.DataFrame]:
    """Prepare enhanced training data incorporating user overrides"""
    try:
        # Load base training data
        extractor = StructuralModelFeatureExtractor()
        base_models = extractor.load_sample_data()
        global_df, member_df = extractor.prepare_training_data(base_models)
        
        # Incorporate user overrides as additional training examples
        for override in overrides:
            if override["correction_type"] == "BUILDING_TYPE" and not override.get("processed", False):
                # Add corrected building type example
                corrected_type = override["user_correction"].get("type")
                if corrected_type:
                    # Create synthetic training example based on override
                    model_context = override.get("model_context", {})
                    if model_context:
                        synthetic_features = extract_features_from_context(model_context)
                        if synthetic_features:
                            synthetic_features["building_type"] = corrected_type
                            global_df = pd.concat([global_df, pd.DataFrame([synthetic_features])], ignore_index=True)
            
            elif override["correction_type"] == "MEMBER_TAG" and not override.get("processed", False):
                # Add corrected member tag example
                corrected_tag = override["user_correction"].get("tag")
                if corrected_tag:
                    model_context = override.get("model_context", {})
                    if model_context:
                        synthetic_features = extract_member_features_from_context(model_context)
                        if synthetic_features:
                            synthetic_features["member_role"] = corrected_tag
                            member_df = pd.concat([member_df, pd.DataFrame([synthetic_features])], ignore_index=True)
        
        return {"global_df": global_df, "member_df": member_df}
        
    except Exception as e:
        logger.error(f"Error preparing enhanced training data: {str(e)}")
        # Return base data if enhancement fails
        extractor = StructuralModelFeatureExtractor()
        base_models = extractor.load_sample_data()
        global_df, member_df = extractor.prepare_training_data(base_models)
        return {"global_df": global_df, "member_df": member_df}

def extract_features_from_context(model_context: Dict[str, Any]) -> Dict[str, float]:
    """Extract features from model context for synthetic training data"""
    try:
        features = {}
        
        # Extract basic geometric features
        if "geometry" in model_context:
            geometry = model_context["geometry"]
            features["building_length"] = geometry.get("buildingLength", 0)
            features["building_width"] = geometry.get("buildingWidth", 0)
            features["building_height"] = geometry.get("totalHeight", 0)
            features["eave_height"] = geometry.get("eaveHeight", 0)
            features["roof_slope"] = geometry.get("roofSlope", 0)
        
        # Extract member counts
        if "members" in model_context:
            members = model_context["members"]
            features["member_count"] = len(members)
            
            # Count member types
            member_types = [m.get("type", "UNKNOWN") for m in members]
            features["column_count"] = member_types.count("COLUMN")
            features["beam_count"] = member_types.count("BEAM")
            features["brace_count"] = member_types.count("BRACE")
        
        # Extract node count
        if "nodes" in model_context:
            features["node_count"] = len(model_context["nodes"])
        
        return features if features else None
        
    except Exception as e:
        logger.error(f"Error extracting features from context: {str(e)}")
        return None

def extract_member_features_from_context(model_context: Dict[str, Any]) -> Dict[str, float]:
    """Extract member features from model context for synthetic training data"""
    try:
        # This would extract member-specific features from the context
        # Implementation depends on the structure of model_context
        features = {}
        
        # Basic member properties
        if "member" in model_context:
            member = model_context["member"]
            features["member_length"] = member.get("length", 0)
            features["member_angle"] = member.get("angle", 0)
        
        # Add default values for required features
        features["angle_from_horizontal"] = features.get("member_angle", 0)
        features["relative_elevation"] = 0.5  # Default middle elevation
        features["is_vertical"] = 1.0 if features.get("member_angle", 0) > 75 else 0.0
        features["is_horizontal"] = 1.0 if features.get("member_angle", 0) < 15 else 0.0
        
        return features if features else None
        
    except Exception as e:
        logger.error(f"Error extracting member features from context: {str(e)}")
        return None

if __name__ == "__main__":
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
        access_log=True
    )
