import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple
import joblib
import json
from pathlib import Path
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

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
    """Utility class for model validation and testing"""
    
    def __init__(self):
        pass
    
    def validate_model_input(self, model_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Validate model input data"""
        errors = []
        
        # Check required fields
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
            for i, node in enumerate(nodes):
                if not isinstance(node, dict):
                    errors.append(f"Node {i} must be a dictionary")
                    continue
                
                required_node_fields = ['id', 'x', 'y', 'z']
                for field in required_node_fields:
                    if field not in node:
                        errors.append(f"Node {i} missing required field: {field}")
                    elif field != 'id' and not isinstance(node[field], (int, float)):
                        errors.append(f"Node {i} field {field} must be numeric")
        
        # Validate members
        members = model_data.get('members', [])
        if not isinstance(members, list):
            errors.append("Members must be a list")
        elif len(members) == 0:
            errors.append("Model must have at least one member")
        else:
            node_ids = {node['id'] for node in nodes} if isinstance(nodes, list) else set()
            
            for i, member in enumerate(members):
                if not isinstance(member, dict):
                    errors.append(f"Member {i} must be a dictionary")
                    continue
                
                required_member_fields = ['id', 'startNodeId', 'endNodeId']
                for field in required_member_fields:
                    if field not in member:
                        errors.append(f"Member {i} missing required field: {field}")
                
                # Check node references
                if 'startNodeId' in member and member['startNodeId'] not in node_ids:
                    errors.append(f"Member {i} references non-existent start node: {member['startNodeId']}")
                if 'endNodeId' in member and member['endNodeId'] not in node_ids:
                    errors.append(f"Member {i} references non-existent end node: {member['endNodeId']}")
        
        return len(errors) == 0, errors
    
    def validate_prediction_confidence(self, confidence: float, threshold: float = 0.5) -> Tuple[bool, str]:
        """Validate prediction confidence"""
        if confidence < threshold:
            return False, f"Low confidence prediction: {confidence:.3f} < {threshold}"
        return True, "Confidence acceptable"
    
    def validate_feature_completeness(self, features: Dict[str, float], required_features: List[str]) -> Tuple[bool, List[str]]:
        """Validate that all required features are present"""
        missing_features = []
        for feature in required_features:
            if feature not in features:
                missing_features.append(feature)
        
        return len(missing_features) == 0, missing_features

class ModelMonitor:
    """Utility class for monitoring model performance over time"""
    
    def __init__(self, log_file: str = "model_predictions.log"):
        self.log_file = Path(log_file)
        self.predictions_log = []
    
    def log_prediction(self, model_type: str, input_features: Dict[str, Any], 
                      prediction: str, confidence: float, timestamp: str = None):
        """Log a prediction for monitoring"""
        if timestamp is None:
            timestamp = pd.Timestamp.now().isoformat()
        
        log_entry = {
            'timestamp': timestamp,
            'model_type': model_type,
            'prediction': prediction,
            'confidence': confidence,
            'input_features': input_features
        }
        
        self.predictions_log.append(log_entry)
        
        # Append to log file
        with open(self.log_file, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
    
    def analyze_prediction_patterns(self) -> Dict[str, Any]:
        """Analyze patterns in predictions"""
        if not self.predictions_log:
            return {}
        
        df = pd.DataFrame(self.predictions_log)
        
        analysis = {
            'total_predictions': len(df),
            'avg_confidence': df['confidence'].mean(),
            'min_confidence': df['confidence'].min(),
            'max_confidence': df['confidence'].max(),
            'prediction_distribution': df['prediction'].value_counts().to_dict(),
            'low_confidence_count': len(df[df['confidence'] < 0.5]),
            'model_type_distribution': df['model_type'].value_counts().to_dict()
        }
        
        return analysis
    
    def get_performance_metrics(self, time_window: str = '24H') -> Dict[str, Any]:
        """Get performance metrics for a specific time window"""
        if not self.predictions_log:
            return {}
        
        df = pd.DataFrame(self.predictions_log)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Filter by time window
        cutoff_time = pd.Timestamp.now() - pd.Timedelta(time_window)
        recent_df = df[df['timestamp'] >= cutoff_time]
        
        if recent_df.empty:
            return {}
        
        metrics = {
            'predictions_in_window': len(recent_df),
            'avg_confidence_in_window': recent_df['confidence'].mean(),
            'prediction_rate': len(recent_df) / pd.Timedelta(time_window).total_seconds() * 3600,  # per hour
            'low_confidence_rate': len(recent_df[recent_df['confidence'] < 0.5]) / len(recent_df)
        }
        
        return metrics

if __name__ == "__main__":
    # Example usage
    evaluator = ModelEvaluator()
    validator = ModelValidator()
    monitor = ModelMonitor()
    
    print("Model utilities loaded successfully")
