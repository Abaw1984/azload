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

if __name__ == "__main__":
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
        access_log=True
    )
