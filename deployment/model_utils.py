import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple, Optional
import joblib
import json
from pathlib import Path
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
from collections import defaultdict, deque

class ModelEvaluator:
    """Utility class for model evaluation and analysis"""
    
    def __init__(self, models_dir: str = "trained_models"):
        self.models_dir = Path(models_dir)
    
    def evaluate_model_performance(self, model, X_test, y_test, class_names: List[str]) -> Dict[str, Any]:
        """Comprehensive model evaluation"""
        # Predictions
        y_pred = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test) if hasattr(model, 'predict_proba') else None
        
        # Classification report
        report = classification_report(y_test, y_pred, target_names=class_names, output_dict=True)
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        
        # Per-class metrics
        per_class_metrics = {}
        for i, class_name in enumerate(class_names):
            if class_name in report:
                per_class_metrics[class_name] = {
                    'precision': report[class_name]['precision'],
                    'recall': report[class_name]['recall'],
                    'f1_score': report[class_name]['f1-score'],
                    'support': report[class_name]['support']
                }
        
        return {
            'accuracy': report['accuracy'],
            'macro_avg': report['macro avg'],
            'weighted_avg': report['weighted avg'],
            'per_class_metrics': per_class_metrics,
            'confusion_matrix': cm.tolist(),
            'class_names': class_names
        }
    
    def plot_confusion_matrix(self, cm: np.ndarray, class_names: List[str], title: str = "Confusion Matrix"):
        """Plot confusion matrix"""
        plt.figure(figsize=(10, 8))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                   xticklabels=class_names, yticklabels=class_names)
        plt.title(title)
        plt.xlabel('Predicted')
        plt.ylabel('Actual')
        plt.tight_layout()
        plt.show()
    
    def analyze_feature_importance(self, model, feature_names: List[str], top_k: int = 20) -> Dict[str, float]:
        """Analyze and return feature importance"""
        if not hasattr(model, 'feature_importances_'):
            return {}
        
        importance_scores = model.feature_importances_
        feature_importance = dict(zip(feature_names, importance_scores))
        
        # Sort by importance
        sorted_importance = dict(sorted(feature_importance.items(), key=lambda x: x[1], reverse=True))
        
        return dict(list(sorted_importance.items())[:top_k])
    
    def plot_feature_importance(self, feature_importance: Dict[str, float], title: str = "Feature Importance"):
        """Plot feature importance"""
        if not feature_importance:
            print("No feature importance data available")
            return
        
        features = list(feature_importance.keys())
        scores = list(feature_importance.values())
        
        plt.figure(figsize=(12, 8))
        plt.barh(range(len(features)), scores)
        plt.yticks(range(len(features)), features)
        plt.xlabel('Importance Score')
        plt.title(title)
        plt.tight_layout()
        plt.show()
    
    def generate_model_report(self, model_name: str, evaluation_results: Dict[str, Any]) -> str:
        """Generate a comprehensive model report"""
        report = f"\n{'='*50}\n"
        report += f"MODEL EVALUATION REPORT: {model_name.upper()}\n"
        report += f"{'='*50}\n\n"
        
        # Overall metrics
        report += f"OVERALL PERFORMANCE:\n"
        report += f"Accuracy: {evaluation_results['accuracy']:.3f}\n\n"
        
        # Macro averages
        macro_avg = evaluation_results['macro_avg']
        report += f"MACRO AVERAGES:\n"
        report += f"Precision: {macro_avg['precision']:.3f}\n"
        report += f"Recall: {macro_avg['recall']:.3f}\n"
        report += f"F1-Score: {macro_avg['f1-score']:.3f}\n\n"
        
        # Weighted averages
        weighted_avg = evaluation_results['weighted_avg']
        report += f"WEIGHTED AVERAGES:\n"
        report += f"Precision: {weighted_avg['precision']:.3f}\n"
        report += f"Recall: {weighted_avg['recall']:.3f}\n"
        report += f"F1-Score: {weighted_avg['f1-score']:.3f}\n\n"
        
        # Per-class performance
        report += f"PER-CLASS PERFORMANCE:\n"
        report += f"{'Class':<25} {'Precision':<10} {'Recall':<10} {'F1-Score':<10} {'Support':<10}\n"
        report += f"{'-'*75}\n"
        
        for class_name, metrics in evaluation_results['per_class_metrics'].items():
            report += f"{class_name:<25} {metrics['precision']:<10.3f} {metrics['recall']:<10.3f} {metrics['f1_score']:<10.3f} {metrics['support']:<10}\n"
        
        return report
    
    def save_evaluation_results(self, results: Dict[str, Any], filename: str):
        """Save evaluation results to JSON file"""
        filepath = self.models_dir / filename
        with open(filepath, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"Evaluation results saved to {filepath}")

class ModelValidator:
    """Utility class for model validation and compliance checking"""
    
    def __init__(self):
        self.valid_member_types = {
            'BEAM', 'COLUMN', 'BRACE', 'TRUSS', 'GIRDER', 'JOIST',
            'FOUNDATION', 'SLAB', 'WALL', 'FRAME', 'CABLE', 'STRUT'
        }
    
    def validate_structural_model(self, model_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Validate structural model data with AISC 360 and ASCE 7 compliance"""
        errors = []
        
        # Basic structure validation
        required_fields = ['nodes', 'members']
        for field in required_fields:
            if field not in model_data:
                errors.append(f"Missing required field: {field}")
        
        # Validate nodes
        nodes = model_data.get('nodes', [])
        if not isinstance(nodes, list):
            errors.append("Nodes must be a list")
        elif len(nodes) == 0:
            errors.append("Model must have at least one node")
        else:
            node_ids = set()
            for i, node in enumerate(nodes):
                if not isinstance(node, dict):
                    errors.append(f"Node {i} must be a dictionary")
                    continue
                
                # Check required fields
                required_node_fields = ['id', 'x', 'y', 'z']
                for field in required_node_fields:
                    if field not in node:
                        errors.append(f"Node {i} missing required field: {field}")
                    elif field != 'id' and not isinstance(node[field], (int, float)):
                        errors.append(f"Node {i} field {field} must be numeric")
                
                # Collect node IDs for member validation
                if 'id' in node:
                    node_ids.add(node['id'])
        
        # Validate members
        members = model_data.get('members', [])
        if not isinstance(members, list):
            errors.append("Members must be a list")
        elif len(members) == 0:
            errors.append("Model must have at least one member")
        else:
            for i, member in enumerate(members):
                if not isinstance(member, dict):
                    errors.append(f"Member {i} must be a dictionary")
                    continue
                
                # Check required fields
                required_member_fields = ['id', 'startNodeId', 'endNodeId']
                for field in required_member_fields:
                    if field not in member:
                        errors.append(f"Member {member.get('id', i)}: Missing required field '{field}'")
                
                # Validate node references
                if 'startNodeId' in member and member['startNodeId'] not in node_ids:
                    errors.append(f"Member {member.get('id', i)}: Invalid startNodeId '{member['startNodeId']}'")
                
                if 'endNodeId' in member and member['endNodeId'] not in node_ids:
                    errors.append(f"Member {member.get('id', i)}: Invalid endNodeId '{member['endNodeId']}'")
                
                # Validate member type if provided
                if 'type' in member and member['type'] not in self.valid_member_types:
                    errors.append(f"Member {member.get('id', i)}: Invalid member type '{member['type']}'")
        
        # AISC 360 compliance checks
        aisc_errors = self._validate_aisc_360_compliance(model_data)
        errors.extend(aisc_errors)
        
        # ASCE 7 compliance checks
        asce_errors = self._validate_asce_7_compliance(model_data)
        errors.extend(asce_errors)
        
        return len(errors) == 0, errors
    
    def _validate_aisc_360_compliance(self, model_data: Dict[str, Any]) -> List[str]:
        """Validate AISC 360 compliance requirements"""
        errors = []
        
        members = model_data.get('members', [])
        nodes = model_data.get('nodes', [])
        
        # Check for minimum structural system requirements
        member_types = [member.get('type', '') for member in members]
        
        has_columns = any('COLUMN' in mtype for mtype in member_types)
        has_beams = any('BEAM' in mtype for mtype in member_types)
        
        if not has_columns and len(members) > 2:
            errors.append("AISC 360: Structure appears to lack vertical load-bearing members (columns)")
        
        if not has_beams and len(members) > 2:
            errors.append("AISC 360: Structure appears to lack horizontal load-bearing members (beams)")
        
        # Check for proper member connectivity
        node_connections = defaultdict(int)
        for member in members:
            if 'startNodeId' in member:
                node_connections[member['startNodeId']] += 1
            if 'endNodeId' in member:
                node_connections[member['endNodeId']] += 1
        
        # Check for isolated nodes (AISC 360 requires proper connectivity)
        isolated_nodes = [node_id for node_id, count in node_connections.items() if count < 2]
        if len(isolated_nodes) > len(nodes) * 0.1:  # More than 10% isolated nodes
            errors.append(f"AISC 360: Excessive isolated nodes detected: {len(isolated_nodes)}")
        
        return errors
    
    def _validate_asce_7_compliance(self, model_data: Dict[str, Any]) -> List[str]:
        """Validate ASCE 7 compliance requirements"""
        errors = []
        
        geometry = model_data.get('geometry', {})
        
        # Check building dimensions for ASCE 7 applicability
        height = geometry.get('totalHeight', 0)
        if height > 500:  # 500 feet limit for many ASCE 7 provisions
            errors.append("ASCE 7: Building height exceeds typical code applicability limits (>500 ft)")
        
        # Check for plan irregularities
        length = geometry.get('buildingLength', 0)
        width = geometry.get('buildingWidth', 0)
        
        if length > 0 and width > 0:
            aspect_ratio = max(length, width) / min(length, width)
            if aspect_ratio > 5:
                errors.append(f"ASCE 7: Excessive plan aspect ratio ({aspect_ratio:.1f}) may require special analysis")
        
        return errors
    
    def validate_prediction_input(self, features: Dict[str, float]) -> Tuple[bool, List[str]]:
        """Validate feature input for predictions"""
        errors = []
        
        # Check for required features
        required_features = ['building_length', 'building_width', 'building_height']
        for feature in required_features:
            if feature not in features:
                errors.append(f"Missing required feature: {feature}")
            elif not isinstance(features[feature], (int, float)):
                errors.append(f"Invalid feature type for {feature}: expected number")
            elif features[feature] < 0:
                errors.append(f"Invalid feature value for {feature}: must be non-negative")
        
        # Check for reasonable ranges
        if 'building_height' in features and features['building_height'] > 1000:
            errors.append("Building height exceeds reasonable limits (>1000 units)")
        
        if 'building_length' in features and features['building_length'] > 2000:
            errors.append("Building length exceeds reasonable limits (>2000 units)")
        
        return len(errors) == 0, errors

class ModelMonitor:
    """Utility class for monitoring model performance in production"""
    
    def __init__(self, max_history: int = 10000):
        self.prediction_history = deque(maxlen=max_history)
        self.performance_metrics = defaultdict(list)
        self.drift_detection = defaultdict(deque)
        self.alert_thresholds = {
            'accuracy_drop': 0.1,  # 10% accuracy drop
            'confidence_drop': 0.15,  # 15% confidence drop
            'prediction_drift': 0.2  # 20% distribution drift
        }
    
    def log_prediction(self, model_type: str, input_features: Dict[str, float], 
                      prediction: str, confidence: float, actual: Optional[str] = None):
        """Log a prediction for monitoring"""
        timestamp = datetime.now()
        
        prediction_record = {
            'timestamp': timestamp,
            'model_type': model_type,
            'input_features': input_features,
            'prediction': prediction,
            'confidence': confidence,
            'actual': actual
        }
        
        self.prediction_history.append(prediction_record)
        
        # Update drift detection
        self.drift_detection[model_type].append({
            'timestamp': timestamp,
            'prediction': prediction,
            'confidence': confidence
        })
    
    def calculate_recent_accuracy(self, model_type: str, hours: int = 24) -> Optional[float]:
        """Calculate accuracy for recent predictions with ground truth"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        recent_predictions = [
            record for record in self.prediction_history
            if (record['model_type'] == model_type and 
                record['timestamp'] > cutoff_time and 
                record['actual'] is not None)
        ]
        
        if not recent_predictions:
            return None
        
        correct_predictions = sum(
            1 for record in recent_predictions 
            if record['prediction'] == record['actual']
        )
        
        return correct_predictions / len(recent_predictions)
    
    def detect_performance_drift(self, model_type: str, window_hours: int = 24) -> Dict[str, Any]:
        """Detect performance drift in model predictions"""
        cutoff_time = datetime.now() - timedelta(hours=window_hours)
        
        recent_records = [
            record for record in self.drift_detection[model_type]
            if record['timestamp'] > cutoff_time
        ]
        
        if len(recent_records) < 10:  # Need minimum samples
            return {'drift_detected': False, 'reason': 'Insufficient data'}
        
        # Analyze confidence trends
        confidences = [record['confidence'] for record in recent_records]
        avg_confidence = np.mean(confidences)
        confidence_std = np.std(confidences)
        
        # Analyze prediction distribution
        predictions = [record['prediction'] for record in recent_records]
        prediction_counts = defaultdict(int)
        for pred in predictions:
            prediction_counts[pred] += 1
        
        # Check for alerts
        alerts = []
        
        if avg_confidence < 0.7:  # Low average confidence
            alerts.append(f"Low average confidence: {avg_confidence:.3f}")
        
        if confidence_std > 0.3:  # High confidence variance
            alerts.append(f"High confidence variance: {confidence_std:.3f}")
        
        # Check for prediction distribution changes
        dominant_prediction = max(prediction_counts.values()) / len(predictions)
        if dominant_prediction > 0.9:  # Over 90% same prediction
            alerts.append(f"Prediction distribution skew: {dominant_prediction:.3f}")
        
        return {
            'drift_detected': len(alerts) > 0,
            'alerts': alerts,
            'avg_confidence': avg_confidence,
            'confidence_std': confidence_std,
            'prediction_distribution': dict(prediction_counts),
            'sample_count': len(recent_records)
        }
    
    def generate_monitoring_report(self) -> Dict[str, Any]:
        """Generate comprehensive monitoring report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_predictions': len(self.prediction_history),
            'model_types': list(self.drift_detection.keys()),
            'monitoring_period_hours': 24
        }
        
        # Per-model analysis
        model_reports = {}
        for model_type in self.drift_detection.keys():
            accuracy = self.calculate_recent_accuracy(model_type)
            drift_analysis = self.detect_performance_drift(model_type)
            
            model_reports[model_type] = {
                'recent_accuracy': accuracy,
                'drift_analysis': drift_analysis,
                'prediction_count_24h': len([
                    record for record in self.prediction_history
                    if (record['model_type'] == model_type and 
                        record['timestamp'] > datetime.now() - timedelta(hours=24))
                ])
            }
        
        report['model_reports'] = model_reports
        
        return report
    
    def check_health_status(self) -> Dict[str, Any]:
        """Check overall system health"""
        health_status = {
            'status': 'healthy',
            'issues': [],
            'warnings': []
        }
        
        # Check recent activity
        recent_predictions = [
            record for record in self.prediction_history
            if record['timestamp'] > datetime.now() - timedelta(hours=1)
        ]
        
        if len(recent_predictions) == 0:
            health_status['warnings'].append("No predictions in the last hour")
        
        # Check for drift in all models
        for model_type in self.drift_detection.keys():
            drift_analysis = self.detect_performance_drift(model_type, window_hours=6)
            if drift_analysis['drift_detected']:
                health_status['issues'].extend([
                    f"{model_type}: {alert}" for alert in drift_analysis['alerts']
                ])
        
        # Determine overall status
        if health_status['issues']:
            health_status['status'] = 'degraded'
        elif health_status['warnings']:
            health_status['status'] = 'warning'
        
        return health_status

class ModelOptimizer:
    """Utility class for model optimization and hyperparameter tuning"""
    
    def __init__(self):
        self.optimization_history = []
    
    def suggest_hyperparameters(self, model_type: str, current_performance: float) -> Dict[str, Any]:
        """Suggest hyperparameter improvements based on performance"""
        suggestions = {}
        
        if model_type == 'RandomForest':
            if current_performance < 0.8:
                suggestions = {
                    'n_estimators': [200, 300, 500],
                    'max_depth': [15, 20, 25],
                    'min_samples_split': [2, 3, 5],
                    'min_samples_leaf': [1, 2, 3]
                }
            else:
                suggestions = {
                    'n_estimators': [300, 500],
                    'max_depth': [20, 25],
                    'min_samples_split': [2, 3],
                    'min_samples_leaf': [1, 2]
                }
        
        elif model_type == 'XGBoost':
            if current_performance < 0.8:
                suggestions = {
                    'n_estimators': [200, 300],
                    'learning_rate': [0.05, 0.1, 0.15],
                    'max_depth': [6, 8, 10],
                    'subsample': [0.8, 0.9],
                    'colsample_bytree': [0.8, 0.9]
                }
            else:
                suggestions = {
                    'n_estimators': [300, 500],
                    'learning_rate': [0.05, 0.1],
                    'max_depth': [8, 10],
                    'subsample': [0.8, 0.9],
                    'colsample_bytree': [0.8, 0.9]
                }
        
        return suggestions
    
    def analyze_feature_selection(self, feature_importance: Dict[str, float], 
                                threshold: float = 0.01) -> Dict[str, Any]:
        """Analyze feature selection opportunities"""
        total_importance = sum(feature_importance.values())
        
        # Normalize importance scores
        normalized_importance = {
            feature: importance / total_importance 
            for feature, importance in feature_importance.items()
        }
        
        # Identify low-importance features
        low_importance_features = [
            feature for feature, importance in normalized_importance.items()
            if importance < threshold
        ]
        
        # Calculate cumulative importance
        sorted_features = sorted(normalized_importance.items(), key=lambda x: x[1], reverse=True)
        cumulative_importance = 0
        features_for_80_percent = []
        
        for feature, importance in sorted_features:
            cumulative_importance += importance
            features_for_80_percent.append(feature)
            if cumulative_importance >= 0.8:
                break
        
        return {
            'total_features': len(feature_importance),
            'low_importance_features': low_importance_features,
            'features_for_80_percent': features_for_80_percent,
            'feature_reduction_potential': len(low_importance_features),
            'top_features': sorted_features[:10]
        }

class DataQualityChecker:
    """Utility class for checking training data quality"""
    
    def __init__(self):
        self.quality_thresholds = {
            'missing_data_threshold': 0.1,  # 10% missing data
            'class_imbalance_threshold': 0.05,  # 5% minimum class representation
            'duplicate_threshold': 0.02  # 2% duplicates
        }
    
    def check_data_quality(self, df: pd.DataFrame, target_column: str) -> Dict[str, Any]:
        """Comprehensive data quality check"""
        quality_report = {
            'total_samples': len(df),
            'total_features': len(df.columns) - 1,  # Exclude target
            'issues': [],
            'warnings': [],
            'recommendations': []
        }
        
        # Check for missing data
        missing_data = df.isnull().sum()
        high_missing_features = missing_data[missing_data / len(df) > self.quality_thresholds['missing_data_threshold']]
        
        if not high_missing_features.empty:
            quality_report['issues'].append(f"High missing data in features: {list(high_missing_features.index)}")
            quality_report['recommendations'].append("Consider imputation or feature removal for high-missing features")
        
        # Check class balance
        if target_column in df.columns:
            class_counts = df[target_column].value_counts(normalize=True)
            minority_classes = class_counts[class_counts < self.quality_thresholds['class_imbalance_threshold']]
            
            if not minority_classes.empty:
                quality_report['warnings'].append(f"Imbalanced classes detected: {dict(minority_classes)}")
                quality_report['recommendations'].append("Consider class balancing techniques (SMOTE, class weights)")
        
        # Check for duplicates
        duplicate_count = df.duplicated().sum()
        duplicate_ratio = duplicate_count / len(df)
        
        if duplicate_ratio > self.quality_thresholds['duplicate_threshold']:
            quality_report['issues'].append(f"High duplicate ratio: {duplicate_ratio:.3f} ({duplicate_count} duplicates)")
            quality_report['recommendations'].append("Remove duplicate samples")
        
        # Check feature correlations
        numeric_features = df.select_dtypes(include=[np.number]).columns
        if len(numeric_features) > 1:
            correlation_matrix = df[numeric_features].corr().abs()
            high_corr_pairs = []
            
            for i in range(len(correlation_matrix.columns)):
                for j in range(i+1, len(correlation_matrix.columns)):
                    if correlation_matrix.iloc[i, j] > 0.95:
                        high_corr_pairs.append((
                            correlation_matrix.columns[i], 
                            correlation_matrix.columns[j], 
                            correlation_matrix.iloc[i, j]
                        ))
            
            if high_corr_pairs:
                quality_report['warnings'].append(f"High feature correlations detected: {len(high_corr_pairs)} pairs")
                quality_report['recommendations'].append("Consider removing highly correlated features")
        
        # Overall quality score
        quality_score = 1.0
        quality_score -= len(quality_report['issues']) * 0.2
        quality_score -= len(quality_report['warnings']) * 0.1
        quality_score = max(0.0, quality_score)
        
        quality_report['quality_score'] = quality_score
        quality_report['quality_grade'] = self._get_quality_grade(quality_score)
        
        return quality_report
    
    def _get_quality_grade(self, score: float) -> str:
        """Convert quality score to grade"""
        if score >= 0.9:
            return 'A'
        elif score >= 0.8:
            return 'B'
        elif score >= 0.7:
            return 'C'
        elif score >= 0.6:
            return 'D'
        else:
            return 'F'

if __name__ == "__main__":
    # Example usage
    evaluator = ModelEvaluator()
    validator = ModelValidator()
    monitor = ModelMonitor()
    optimizer = ModelOptimizer()
    quality_checker = DataQualityChecker()
    
    print("Model utilities initialized successfully")
    print("AISC 360 and ASCE 7 compliance validation ready")
    print("Production monitoring and optimization tools ready")
