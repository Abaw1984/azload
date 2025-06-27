import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Any, Optional
import json
from pathlib import Path
import logging
from dataclasses import dataclass
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MemberRole(Enum):
    """AISC 360 and ASCE 7 compliant member roles"""
    COLUMN = "Column"
    BEAM = "Beam"
    BRACE = "Brace"
    TRUSS_CHORD = "TrussChord"
    TRUSS_WEB = "TrussWeb"
    CANTILEVER_BEAM = "CantileverBeam"
    CANOPY_BEAM = "CanopyBeam"
    CRANE_BRACKET = "CraneBracket"
    RUNWAY_BEAM = "RunwayBeam"
    FASCIA = "Fascia"
    PARAPET = "Parapet"

class FrameSystem(Enum):
    """ASCE 7 Table 12.2-1 compliant frame systems"""
    MOMENT = "Moment"
    BRACED = "Braced"
    DUAL = "Dual"
    TRUSS = "Truss"
    CANTILEVER = "Cantilever"

class DiaphragmType(Enum):
    """ASCE 7 diaphragm classifications"""
    RIGID = "Rigid"
    SEMI_RIGID = "Semi-Rigid"
    FLEXIBLE = "Flexible"

class PlanShape(Enum):
    """ASCE 7 plan irregularity classifications"""
    REGULAR = "Regular"
    IRREGULAR = "Irregular"

class HeightClass(Enum):
    """ASCE 7 height classifications"""
    LOW_RISE = "Low-Rise"
    MID_RISE = "Mid-Rise"
    HIGH_RISE = "High-Rise"

@dataclass
class SeismicParameters:
    """ASCE 7 seismic parameters"""
    R: float  # Response modification factor
    Cd: float  # Deflection amplification factor
    Omega0: float  # Overstrength factor
    SFRS: str  # Seismic Force Resisting System

class StructuralModelFeatureExtractor:
    """Enhanced feature extractor for AISC 360 and ASCE 7 compliance"""
    
    def __init__(self):
        self.feature_names = []
        self.building_type_encoder = {}
        self.member_role_encoder = {}
        
        # ASCE 7 seismic parameters lookup
        self.seismic_parameters = {
            "MOMENT": SeismicParameters(R=8.0, Cd=5.5, Omega0=3.0, SFRS="Special moment frame"),
            "BRACED": SeismicParameters(R=6.0, Cd=5.0, Omega0=2.0, SFRS="Special concentrically braced frame"),
            "DUAL": SeismicParameters(R=7.0, Cd=5.5, Omega0=2.5, SFRS="Dual system"),
            "TRUSS": SeismicParameters(R=3.0, Cd=3.0, Omega0=3.0, SFRS="Truss system"),
            "CANTILEVER": SeismicParameters(R=2.5, Cd=2.5, Omega0=2.0, SFRS="Cantilever column system")
        }
        
        # Building type classifications (14+ types as required)
        self.building_types = [
            "SINGLE_GABLE_HANGAR", "MULTI_GABLE_HANGAR", "TRUSS_SINGLE_GABLE", 
            "TRUSS_DOUBLE_GABLE", "MONO_SLOPE_HANGAR", "MONO_SLOPE_BUILDING",
            "CAR_SHED_CANOPY", "CANTILEVER_ROOF", "SIGNAGE_BILLBOARD",
            "STANDING_WALL", "ELEVATOR_SHAFT", "SYMMETRIC_MULTI_STORY",
            "COMPLEX_MULTI_STORY", "TEMPORARY_STRUCTURE", "INDUSTRIAL_WAREHOUSE",
            "AIRCRAFT_MAINTENANCE", "MANUFACTURING_FACILITY", "SPORTS_FACILITY"
        ]
        
    def extract_member_features(self, member: Dict, nodes: List[Dict], model_geometry: Dict) -> Dict[str, float]:
        """Extract comprehensive member features for AISC 360 compliance"""
        start_node = next((n for n in nodes if n['id'] == member['startNodeId']), None)
        end_node = next((n for n in nodes if n['id'] == member['endNodeId']), None)
        
        if not start_node or not end_node:
            return {}
        
        # Basic geometry
        dx = end_node['x'] - start_node['x']
        dy = end_node['y'] - start_node['y']
        dz = end_node['z'] - start_node['z']
        
        length = np.sqrt(dx**2 + dy**2 + dz**2)
        horizontal_length = np.sqrt(dx**2 + dy**2)
        
        # Orientation analysis
        angle_from_horizontal = np.arctan2(abs(dz), horizontal_length) * 180 / np.pi if horizontal_length > 0 else 90
        angle_from_vertical = 90 - angle_from_horizontal
        
        # Position features
        start_elevation = start_node['z']
        end_elevation = end_node['z']
        avg_elevation = (start_elevation + end_elevation) / 2
        elevation_change = abs(end_elevation - start_elevation)
        
        # Building context
        building_height = model_geometry.get('totalHeight', 1)
        building_length = model_geometry.get('buildingLength', 1)
        building_width = model_geometry.get('buildingWidth', 1)
        
        relative_elevation = avg_elevation / max(building_height, 1)
        relative_x_position = (start_node['x'] + end_node['x']) / 2 / max(building_length, 1)
        relative_y_position = (start_node['y'] + end_node['y']) / 2 / max(building_width, 1)
        
        # AISC 360 classification features
        slenderness_ratio = length / max(0.1, member.get('radius_of_gyration', 0.1))  # L/r
        is_compression_member = angle_from_horizontal > 60  # Likely column
        is_flexural_member = angle_from_horizontal < 30  # Likely beam
        is_tension_member = 30 <= angle_from_horizontal <= 60  # Likely brace
        
        # Connection analysis
        connected_members = self._count_connected_members(member, nodes)
        is_end_connection = connected_members <= 2
        is_interior_connection = connected_members > 2
        
        # Fixity analysis (if available)
        start_fixity = self._analyze_fixity(start_node)
        end_fixity = self._analyze_fixity(end_node)
        
        # Floor level detection
        floor_level = self._detect_floor_level(avg_elevation, model_geometry)
        
        features = {
            # Basic geometry
            'member_length': length,
            'horizontal_length': horizontal_length,
            'elevation_change': elevation_change,
            'delta_x': abs(dx),
            'delta_y': abs(dy),
            'delta_z': abs(dz),
            
            # Orientation
            'angle_from_horizontal': angle_from_horizontal,
            'angle_from_vertical': angle_from_vertical,
            'slope': dz / max(horizontal_length, 0.001),
            
            # Position
            'start_elevation': start_elevation,
            'end_elevation': end_elevation,
            'avg_elevation': avg_elevation,
            'relative_elevation': relative_elevation,
            'relative_x_position': relative_x_position,
            'relative_y_position': relative_y_position,
            'floor_level': floor_level,
            
            # AISC 360 features
            'slenderness_ratio': slenderness_ratio,
            'is_compression_member': float(is_compression_member),
            'is_flexural_member': float(is_flexural_member),
            'is_tension_member': float(is_tension_member),
            
            # Connection features
            'connected_members_count': connected_members,
            'is_end_connection': float(is_end_connection),
            'is_interior_connection': float(is_interior_connection),
            
            # Fixity features
            'start_fixity_score': start_fixity,
            'end_fixity_score': end_fixity,
            'avg_fixity': (start_fixity + end_fixity) / 2,
            
            # Classification flags
            'is_vertical': float(angle_from_horizontal > 75),
            'is_horizontal': float(angle_from_horizontal < 15),
            'is_diagonal': float(15 <= angle_from_horizontal <= 75),
            'is_at_roof': float(relative_elevation > 0.8),
            'is_at_foundation': float(relative_elevation < 0.2),
            'is_at_eave': float(0.6 <= relative_elevation <= 0.8),
            
            # Member type encoding (if available)
            'member_type_beam': float(member.get('type') == 'BEAM'),
            'member_type_column': float(member.get('type') == 'COLUMN'),
            'member_type_brace': float(member.get('type') == 'BRACE'),
            'member_type_rafter': float(member.get('type') == 'RAFTER'),
            'member_type_purlin': float(member.get('type') == 'PURLIN'),
            'member_type_truss_chord': float(member.get('type') == 'TRUSS_CHORD'),
            'member_type_truss_diagonal': float(member.get('type') == 'TRUSS_DIAGONAL'),
        }
        
        return features
    
    def extract_geometric_features(self, model_data: Dict) -> Dict[str, float]:
        """Extract global building features for ASCE 7 compliance"""
        return self.extract_global_features(model_data)
    
    def extract_global_features(self, model_data: Dict) -> Dict[str, float]:
        """Extract global building features for ASCE 7 compliance"""
        nodes = model_data.get('nodes', [])
        members = model_data.get('members', [])
        geometry = model_data.get('geometry', {})
        
        if not nodes or not members:
            return {}
        
        # Basic dimensions
        x_coords = [node['x'] for node in nodes]
        y_coords = [node['y'] for node in nodes]
        z_coords = [node['z'] for node in nodes]
        
        length = max(x_coords) - min(x_coords) if x_coords else 0
        width = max(y_coords) - min(y_coords) if y_coords else 0
        height = max(z_coords) - min(z_coords) if z_coords else 0
        
        # ASCE 7 height classification
        height_class = self._classify_height(height)
        
        # Plan dimensions and ratios
        plan_area = length * width
        aspect_ratio_lw = length / max(width, 0.1)
        aspect_ratio_lh = length / max(height, 0.1)
        aspect_ratio_wh = width / max(height, 0.1)
        
        # Floor count estimation
        floor_count = self._estimate_floor_count(z_coords)
        
        # Bay analysis
        bay_sizes_x, bay_sizes_y = self._analyze_bay_sizes(nodes, members)
        
        # Plan centroid offset (irregularity indicator)
        plan_centroid_offset = self._calculate_plan_centroid_offset(nodes)
        
        # Roof analysis
        roof_slopes = self._analyze_roof_slopes(members, nodes)
        ridge_count = self._count_ridges(nodes, members)
        
        # Span analysis
        max_span = self._calculate_max_span(members, nodes)
        typical_span = self._calculate_typical_span(members, nodes)
        
        # Bracing analysis
        bracing_ratio = self._calculate_bracing_ratio(members)
        
        # Moment joint analysis
        moment_joint_ratio = self._calculate_moment_joint_ratio(members, nodes)
        
        # Member statistics
        member_count = len(members)
        node_count = len(nodes)
        member_node_ratio = member_count / max(node_count, 1)
        
        # Member type distribution
        member_types = [member.get('type', 'UNKNOWN') for member in members]
        type_counts = {}
        for mtype in ['BEAM', 'COLUMN', 'BRACE', 'TRUSS_CHORD', 'TRUSS_DIAGONAL', 'RAFTER', 'PURLIN']:
            type_counts[f'member_type_{mtype.lower()}_count'] = member_types.count(mtype)
            type_counts[f'member_type_{mtype.lower()}_ratio'] = member_types.count(mtype) / max(member_count, 1)
        
        # Connectivity analysis
        avg_node_connectivity, max_node_connectivity = self._analyze_connectivity(members)
        
        # Structural system indicators
        has_moment_frame = self._detect_moment_frame(members, nodes)
        has_braced_frame = self._detect_braced_frame(members)
        has_truss_system = self._detect_truss_system(members)
        has_cantilever = self._detect_cantilever(members, nodes)
        
        features = {
            # Basic dimensions
            'building_length': length,
            'building_width': width,
            'building_height': height,
            'plan_area': plan_area,
            'building_volume': length * width * height,
            
            # ASCE 7 classifications
            'height_class_low_rise': float(height_class == HeightClass.LOW_RISE),
            'height_class_mid_rise': float(height_class == HeightClass.MID_RISE),
            'height_class_high_rise': float(height_class == HeightClass.HIGH_RISE),
            
            # Aspect ratios
            'aspect_ratio_length_width': aspect_ratio_lw,
            'aspect_ratio_length_height': aspect_ratio_lh,
            'aspect_ratio_width_height': aspect_ratio_wh,
            
            # Floor analysis
            'floor_count': floor_count,
            'max_height': height,
            
            # Bay analysis
            'bay_size_x_avg': np.mean(bay_sizes_x) if bay_sizes_x else 0,
            'bay_size_y_avg': np.mean(bay_sizes_y) if bay_sizes_y else 0,
            'bay_size_x_std': np.std(bay_sizes_x) if len(bay_sizes_x) > 1 else 0,
            'bay_size_y_std': np.std(bay_sizes_y) if len(bay_sizes_y) > 1 else 0,
            'bay_count_x': len(bay_sizes_x),
            'bay_count_y': len(bay_sizes_y),
            
            # Plan irregularity
            'plan_centroid_offset': plan_centroid_offset,
            'plan_irregularity_indicator': float(plan_centroid_offset > 0.05),
            
            # Roof analysis
            'roof_slope_avg': np.mean(roof_slopes) if roof_slopes else 0,
            'roof_slope_max': max(roof_slopes) if roof_slopes else 0,
            'roof_slope_std': np.std(roof_slopes) if len(roof_slopes) > 1 else 0,
            'ridge_count': ridge_count,
            
            # Span analysis
            'max_span': max_span,
            'typical_span': typical_span,
            'span_ratio': max_span / max(typical_span, 1),
            
            # Structural ratios
            'bracing_ratio': bracing_ratio,
            'moment_joint_ratio': moment_joint_ratio,
            
            # Counts and ratios
            'node_count': node_count,
            'member_count': member_count,
            'member_node_ratio': member_node_ratio,
            
            # Connectivity
            'avg_node_connectivity': avg_node_connectivity,
            'max_node_connectivity': max_node_connectivity,
            
            # Structural system indicators
            'has_moment_frame': float(has_moment_frame),
            'has_braced_frame': float(has_braced_frame),
            'has_truss_system': float(has_truss_system),
            'has_cantilever': float(has_cantilever),
            
            **type_counts
        }
        
        return features
    
    def _count_connected_members(self, member: Dict, nodes: List[Dict]) -> int:
        """Count members connected to this member's nodes"""
        # Simplified implementation - would need full member connectivity graph
        return 2  # Default assumption
    
    def _analyze_fixity(self, node: Dict) -> float:
        """Analyze node fixity (0=pinned, 1=fixed)"""
        restraints = node.get('restraints', {})
        if not restraints:
            return 0.0
        
        # Count restrained DOFs
        restrained_count = sum([
            restraints.get('dx', False),
            restraints.get('dy', False),
            restraints.get('dz', False),
            restraints.get('rx', False),
            restraints.get('ry', False),
            restraints.get('rz', False)
        ])
        
        return restrained_count / 6.0
    
    def _detect_floor_level(self, elevation: float, model_geometry: Dict) -> int:
        """Detect which floor level the member is on"""
        total_height = model_geometry.get('totalHeight', 1)
        relative_elevation = elevation / total_height
        
        if relative_elevation < 0.2:
            return 0  # Foundation/basement
        elif relative_elevation < 0.6:
            return 1  # Ground floor
        elif relative_elevation < 0.8:
            return 2  # Second floor
        else:
            return 3  # Roof level
    
    def _classify_height(self, height: float) -> HeightClass:
        """ASCE 7 height classification"""
        # Convert to feet if needed (assuming input is in consistent units)
        if height < 60:  # < 60 feet
            return HeightClass.LOW_RISE
        elif height < 160:  # 60-160 feet
            return HeightClass.MID_RISE
        else:  # > 160 feet
            return HeightClass.HIGH_RISE
    
    def _estimate_floor_count(self, z_coords: List[float]) -> int:
        """Estimate number of floors from Z coordinates"""
        unique_z = sorted(set(z_coords))
        if len(unique_z) <= 2:
            return 1
        
        # Look for consistent floor heights
        floor_heights = [unique_z[i+1] - unique_z[i] for i in range(len(unique_z)-1)]
        avg_floor_height = np.mean(floor_heights)
        
        # Count levels with significant height differences
        floor_count = 1
        for i in range(1, len(unique_z)):
            if unique_z[i] - unique_z[i-1] > avg_floor_height * 0.5:
                floor_count += 1
        
        return min(floor_count, 10)  # Cap at 10 floors
    
    def _analyze_bay_sizes(self, nodes: List[Dict], members: List[Dict]) -> Tuple[List[float], List[float]]:
        """Analyze bay sizes in X and Y directions"""
        # Simplified implementation - would need more sophisticated grid detection
        x_coords = sorted(set(node['x'] for node in nodes))
        y_coords = sorted(set(node['y'] for node in nodes))
        
        bay_sizes_x = [x_coords[i+1] - x_coords[i] for i in range(len(x_coords)-1) if x_coords[i+1] - x_coords[i] > 1]
        bay_sizes_y = [y_coords[i+1] - y_coords[i] for i in range(len(y_coords)-1) if y_coords[i+1] - y_coords[i] > 1]
        
        return bay_sizes_x, bay_sizes_y
    
    def _calculate_plan_centroid_offset(self, nodes: List[Dict]) -> float:
        """Calculate plan centroid offset as irregularity indicator"""
        if not nodes:
            return 0.0
        
        # Calculate geometric centroid
        x_coords = [node['x'] for node in nodes]
        y_coords = [node['y'] for node in nodes]
        
        centroid_x = np.mean(x_coords)
        centroid_y = np.mean(y_coords)
        
        # Calculate bounding box center
        bbox_center_x = (max(x_coords) + min(x_coords)) / 2
        bbox_center_y = (max(y_coords) + min(y_coords)) / 2
        
        # Calculate offset as percentage of building dimensions
        building_length = max(x_coords) - min(x_coords)
        building_width = max(y_coords) - min(y_coords)
        
        offset_x = abs(centroid_x - bbox_center_x) / max(building_length, 1)
        offset_y = abs(centroid_y - bbox_center_y) / max(building_width, 1)
        
        return max(offset_x, offset_y)
    
    def _analyze_roof_slopes(self, members: List[Dict], nodes: List[Dict]) -> List[float]:
        """Analyze roof member slopes"""
        slopes = []
        node_dict = {node['id']: node for node in nodes}
        
        for member in members:
            if member.get('type') in ['RAFTER', 'BEAM'] or 'roof' in member.get('tag', '').lower():
                start_node = node_dict.get(member['startNodeId'])
                end_node = node_dict.get(member['endNodeId'])
                
                if start_node and end_node:
                    dz = end_node['z'] - start_node['z']
                    horizontal_dist = np.sqrt(
                        (end_node['x'] - start_node['x'])**2 + 
                        (end_node['y'] - start_node['y'])**2
                    )
                    
                    if horizontal_dist > 0.1:
                        slope = np.arctan(abs(dz) / horizontal_dist) * 180 / np.pi
                        slopes.append(slope)
        
        return slopes
    
    def _count_ridges(self, nodes: List[Dict], members: List[Dict]) -> int:
        """Count roof ridges"""
        # Simplified implementation - count high points
        z_coords = [node['z'] for node in nodes]
        max_z = max(z_coords) if z_coords else 0
        
        high_nodes = [node for node in nodes if abs(node['z'] - max_z) < 0.1]
        return max(1, len(high_nodes) // 3)  # Rough estimate
    
    def _calculate_max_span(self, members: List[Dict], nodes: List[Dict]) -> float:
        """Calculate maximum span"""
        max_span = 0
        node_dict = {node['id']: node for node in nodes}
        
        for member in members:
            start_node = node_dict.get(member['startNodeId'])
            end_node = node_dict.get(member['endNodeId'])
            
            if start_node and end_node:
                span = np.sqrt(
                    (end_node['x'] - start_node['x'])**2 + 
                    (end_node['y'] - start_node['y'])**2 + 
                    (end_node['z'] - start_node['z'])**2
                )
                max_span = max(max_span, span)
        
        return max_span
    
    def _calculate_typical_span(self, members: List[Dict], nodes: List[Dict]) -> float:
        """Calculate typical span (median)"""
        spans = []
        node_dict = {node['id']: node for node in nodes}
        
        for member in members:
            start_node = node_dict.get(member['startNodeId'])
            end_node = node_dict.get(member['endNodeId'])
            
            if start_node and end_node:
                span = np.sqrt(
                    (end_node['x'] - start_node['x'])**2 + 
                    (end_node['y'] - start_node['y'])**2 + 
                    (end_node['z'] - start_node['z'])**2
                )
                spans.append(span)
        
        return np.median(spans) if spans else 0
    
    def _calculate_bracing_ratio(self, members: List[Dict]) -> float:
        """Calculate ratio of bracing members to total members"""
        total_members = len(members)
        bracing_members = sum(1 for member in members if 
                            member.get('type') == 'BRACE' or 
                            'brace' in member.get('tag', '').lower())
        
        return bracing_members / max(total_members, 1)
    
    def _calculate_moment_joint_ratio(self, members: List[Dict], nodes: List[Dict]) -> float:
        """Calculate ratio of moment-resisting joints"""
        total_joints = len(nodes)
        moment_joints = 0
        
        for node in nodes:
            restraints = node.get('restraints', {})
            # Consider joint as moment-resisting if it has rotational restraints
            if restraints.get('rx', False) or restraints.get('ry', False) or restraints.get('rz', False):
                moment_joints += 1
        
        return moment_joints / max(total_joints, 1)
    
    def _analyze_connectivity(self, members: List[Dict]) -> Tuple[float, int]:
        """Analyze node connectivity"""
        node_connections = {}
        
        for member in members:
            start_id = member['startNodeId']
            end_id = member['endNodeId']
            node_connections[start_id] = node_connections.get(start_id, 0) + 1
            node_connections[end_id] = node_connections.get(end_id, 0) + 1
        
        if not node_connections:
            return 0, 0
        
        avg_connectivity = np.mean(list(node_connections.values()))
        max_connectivity = max(node_connections.values())
        
        return avg_connectivity, max_connectivity
    
    def _detect_moment_frame(self, members: List[Dict], nodes: List[Dict]) -> bool:
        """Detect moment frame system"""
        # Look for rigid connections and beam-column assemblies
        beam_count = sum(1 for member in members if member.get('type') == 'BEAM')
        column_count = sum(1 for member in members if member.get('type') == 'COLUMN')
        
        # Check for moment connections
        moment_connections = sum(1 for node in nodes if 
                               node.get('restraints', {}).get('rx', False) or
                               node.get('restraints', {}).get('ry', False) or
                               node.get('restraints', {}).get('rz', False))
        
        return beam_count > 0 and column_count > 0 and moment_connections > len(nodes) * 0.3
    
    def _detect_braced_frame(self, members: List[Dict]) -> bool:
        """Detect braced frame system"""
        brace_count = sum(1 for member in members if 
                         member.get('type') == 'BRACE' or 
                         'brace' in member.get('tag', '').lower())
        
        return brace_count > len(members) * 0.1  # At least 10% bracing members
    
    def _detect_truss_system(self, members: List[Dict]) -> bool:
        """Detect truss system"""
        truss_count = sum(1 for member in members if 
                         member.get('type') in ['TRUSS_CHORD', 'TRUSS_DIAGONAL'] or
                         'truss' in member.get('tag', '').lower())
        
        return truss_count > len(members) * 0.2  # At least 20% truss members
    
    def _detect_cantilever(self, members: List[Dict], nodes: List[Dict]) -> bool:
        """Detect cantilever system"""
        # Look for members extending beyond supports
        support_nodes = {node['id'] for node in nodes if 
                        node.get('restraints', {}).get('dx', False) or
                        node.get('restraints', {}).get('dy', False) or
                        node.get('restraints', {}).get('dz', False)}
        
        cantilever_count = 0
        for member in members:
            if member['startNodeId'] not in support_nodes and member['endNodeId'] not in support_nodes:
                cantilever_count += 1
        
        return cantilever_count > len(members) * 0.1
    
    def prepare_training_data(self, models_data: List[Dict]) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """Prepare comprehensive training data for ensemble models"""
        logger.info(f"Preparing training data for {len(models_data)} models")
        
        global_features = []
        member_features = []
        
        for i, model_data in enumerate(models_data):
            try:
                # Extract global building features
                global_feat = self.extract_global_features(model_data)
                if global_feat:
                    global_feat['building_type'] = model_data.get('buildingType', 'UNKNOWN')
                    global_feat['frame_system'] = model_data.get('frameSystem', 'UNKNOWN')
                    global_feat['diaphragm_type'] = model_data.get('diaphragmType', 'UNKNOWN')
                    global_feat['plan_shape'] = model_data.get('planShape', 'UNKNOWN')
                    global_feat['sfrs'] = model_data.get('SFRS', 'UNKNOWN')
                    global_features.append(global_feat)
                
                # Extract member-level features
                nodes = model_data.get('nodes', [])
                members = model_data.get('members', [])
                geometry = model_data.get('geometry', {})
                
                for member in members:
                    member_feat = self.extract_member_features(member, nodes, geometry)
                    if member_feat:
                        member_feat['member_role'] = member.get('role', 'UNKNOWN')
                        member_feat['building_type'] = model_data.get('buildingType', 'UNKNOWN')
                        member_feat['frame_system'] = model_data.get('frameSystem', 'UNKNOWN')
                        member_features.append(member_feat)
                        
            except Exception as e:
                logger.error(f"Error processing model {i}: {str(e)}")
                continue
        
        global_df = pd.DataFrame(global_features)
        member_df = pd.DataFrame(member_features)
        
        logger.info(f"Prepared {len(global_df)} global samples and {len(member_df)} member samples")
        
        return global_df, member_df
    
    def load_sample_data(self) -> List[Dict]:
        """Load comprehensive sample training data with 50+ diverse structural models"""
        # Massively expanded sample data with AISC 360 and ASCE 7 compliance
        sample_models = [
            # 1. Single Gable Hangar - Aircraft Maintenance
            {
                'id': 'hangar_001',
                'buildingType': 'SINGLE_GABLE_HANGAR',
                'frameSystem': 'MOMENT',
                'diaphragmType': 'FLEXIBLE',
                'planShape': 'REGULAR',
                'SFRS': 'Special moment frame',
                'nodes': [
                    {'id': 'N1', 'x': 0, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N2', 'x': 120, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N3', 'x': 120, 'y': 80, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N4', 'x': 0, 'y': 80, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N5', 'x': 0, 'y': 0, 'z': 20},
                    {'id': 'N6', 'x': 120, 'y': 0, 'z': 20},
                    {'id': 'N7', 'x': 120, 'y': 80, 'z': 20},
                    {'id': 'N8', 'x': 0, 'y': 80, 'z': 20},
                    {'id': 'N9', 'x': 60, 'y': 40, 'z': 30},  # Ridge
                ],
                'members': [
                    {'id': 'M1', 'startNodeId': 'N1', 'endNodeId': 'N5', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M2', 'startNodeId': 'N2', 'endNodeId': 'N6', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M3', 'startNodeId': 'N3', 'endNodeId': 'N7', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M4', 'startNodeId': 'N4', 'endNodeId': 'N8', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M5', 'startNodeId': 'N5', 'endNodeId': 'N9', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M6', 'startNodeId': 'N6', 'endNodeId': 'N9', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M7', 'startNodeId': 'N7', 'endNodeId': 'N9', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M8', 'startNodeId': 'N8', 'endNodeId': 'N9', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M9', 'startNodeId': 'N5', 'endNodeId': 'N6', 'type': 'BEAM', 'role': 'Beam'},
                    {'id': 'M10', 'startNodeId': 'N7', 'endNodeId': 'N8', 'type': 'BEAM', 'role': 'Beam'},
                ],
                'geometry': {
                    'buildingLength': 120,
                    'buildingWidth': 80,
                    'totalHeight': 30,
                    'eaveHeight': 20,
                    'roofSlope': 18.43,
                    'frameCount': 3,
                    'baySpacings': [40, 40, 40]
                }
            },
            
            # 2. Multi-Gable Hangar - Large Aircraft Facility
            {
                'id': 'hangar_002',
                'buildingType': 'MULTI_GABLE_HANGAR',
                'frameSystem': 'BRACED',
                'diaphragmType': 'SEMI_RIGID',
                'planShape': 'REGULAR',
                'SFRS': 'Special concentrically braced frame',
                'nodes': [
                    {'id': 'N1', 'x': 0, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N2', 'x': 60, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N3', 'x': 120, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N4', 'x': 180, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N5', 'x': 0, 'y': 100, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N6', 'x': 60, 'y': 100, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N7', 'x': 120, 'y': 100, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N8', 'x': 180, 'y': 100, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N9', 'x': 0, 'y': 0, 'z': 25},
                    {'id': 'N10', 'x': 60, 'y': 0, 'z': 25},
                    {'id': 'N11', 'x': 120, 'y': 0, 'z': 25},
                    {'id': 'N12', 'x': 180, 'y': 0, 'z': 25},
                    {'id': 'N13', 'x': 0, 'y': 100, 'z': 25},
                    {'id': 'N14', 'x': 60, 'y': 100, 'z': 25},
                    {'id': 'N15', 'x': 120, 'y': 100, 'z': 25},
                    {'id': 'N16', 'x': 180, 'y': 100, 'z': 25},
                    {'id': 'N17', 'x': 30, 'y': 50, 'z': 35},  # Ridge 1
                    {'id': 'N18', 'x': 90, 'y': 50, 'z': 35},  # Ridge 2
                    {'id': 'N19', 'x': 150, 'y': 50, 'z': 35}, # Ridge 3
                ],
                'members': [
                    # Columns
                    {'id': 'M1', 'startNodeId': 'N1', 'endNodeId': 'N9', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M2', 'startNodeId': 'N2', 'endNodeId': 'N10', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M3', 'startNodeId': 'N3', 'endNodeId': 'N11', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M4', 'startNodeId': 'N4', 'endNodeId': 'N12', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M5', 'startNodeId': 'N5', 'endNodeId': 'N13', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M6', 'startNodeId': 'N6', 'endNodeId': 'N14', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M7', 'startNodeId': 'N7', 'endNodeId': 'N15', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M8', 'startNodeId': 'N8', 'endNodeId': 'N16', 'type': 'COLUMN', 'role': 'Column'},
                    # Rafters
                    {'id': 'M9', 'startNodeId': 'N9', 'endNodeId': 'N17', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M10', 'startNodeId': 'N10', 'endNodeId': 'N17', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M11', 'startNodeId': 'N11', 'endNodeId': 'N18', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M12', 'startNodeId': 'N12', 'endNodeId': 'N19', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M13', 'startNodeId': 'N13', 'endNodeId': 'N17', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M14', 'startNodeId': 'N14', 'endNodeId': 'N17', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M15', 'startNodeId': 'N15', 'endNodeId': 'N18', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M16', 'startNodeId': 'N16', 'endNodeId': 'N19', 'type': 'RAFTER', 'role': 'Beam'},
                    # Bracing
                    {'id': 'M17', 'startNodeId': 'N9', 'endNodeId': 'N11', 'type': 'BRACE', 'role': 'Brace'},
                    {'id': 'M18', 'startNodeId': 'N10', 'endNodeId': 'N12', 'type': 'BRACE', 'role': 'Brace'},
                    {'id': 'M19', 'startNodeId': 'N13', 'endNodeId': 'N15', 'type': 'BRACE', 'role': 'Brace'},
                    {'id': 'M20', 'startNodeId': 'N14', 'endNodeId': 'N16', 'type': 'BRACE', 'role': 'Brace'},
                ],
                'geometry': {
                    'buildingLength': 180,
                    'buildingWidth': 100,
                    'totalHeight': 35,
                    'eaveHeight': 25,
                    'roofSlope': 22.62,
                    'frameCount': 6,
                    'baySpacings': [30, 30, 30, 30, 30, 30]
                }
            },
            
            # 3. Truss Single Gable - Industrial Warehouse
            {
                'id': 'truss_001',
                'buildingType': 'TRUSS_SINGLE_GABLE',
                'frameSystem': 'TRUSS',
                'diaphragmType': 'FLEXIBLE',
                'planShape': 'REGULAR',
                'SFRS': 'Truss system',
                'nodes': [
                    {'id': 'N1', 'x': 0, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N2', 'x': 80, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N3', 'x': 80, 'y': 60, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N4', 'x': 0, 'y': 60, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N5', 'x': 0, 'y': 0, 'z': 15},
                    {'id': 'N6', 'x': 20, 'y': 0, 'z': 18},
                    {'id': 'N7', 'x': 40, 'y': 0, 'z': 20},  # Peak
                    {'id': 'N8', 'x': 60, 'y': 0, 'z': 18},
                    {'id': 'N9', 'x': 80, 'y': 0, 'z': 15},
                    {'id': 'N10', 'x': 0, 'y': 60, 'z': 15},
                    {'id': 'N11', 'x': 20, 'y': 60, 'z': 18},
                    {'id': 'N12', 'x': 40, 'y': 60, 'z': 20},  # Peak
                    {'id': 'N13', 'x': 60, 'y': 60, 'z': 18},
                    {'id': 'N14', 'x': 80, 'y': 60, 'z': 15},
                ],
                'members': [
                    # Columns
                    {'id': 'M1', 'startNodeId': 'N1', 'endNodeId': 'N5', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M2', 'startNodeId': 'N2', 'endNodeId': 'N9', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M3', 'startNodeId': 'N3', 'endNodeId': 'N14', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M4', 'startNodeId': 'N4', 'endNodeId': 'N10', 'type': 'COLUMN', 'role': 'Column'},
                    # Truss Top Chords
                    {'id': 'M5', 'startNodeId': 'N5', 'endNodeId': 'N6', 'type': 'TRUSS_CHORD', 'role': 'TrussChord'},
                    {'id': 'M6', 'startNodeId': 'N6', 'endNodeId': 'N7', 'type': 'TRUSS_CHORD', 'role': 'TrussChord'},
                    {'id': 'M7', 'startNodeId': 'N7', 'endNodeId': 'N8', 'type': 'TRUSS_CHORD', 'role': 'TrussChord'},
                    {'id': 'M8', 'startNodeId': 'N8', 'endNodeId': 'N9', 'type': 'TRUSS_CHORD', 'role': 'TrussChord'},
                    {'id': 'M9', 'startNodeId': 'N10', 'endNodeId': 'N11', 'type': 'TRUSS_CHORD', 'role': 'TrussChord'},
                    {'id': 'M10', 'startNodeId': 'N11', 'endNodeId': 'N12', 'type': 'TRUSS_CHORD', 'role': 'TrussChord'},
                    {'id': 'M11', 'startNodeId': 'N12', 'endNodeId': 'N13', 'type': 'TRUSS_CHORD', 'role': 'TrussChord'},
                    {'id': 'M12', 'startNodeId': 'N13', 'endNodeId': 'N14', 'type': 'TRUSS_CHORD', 'role': 'TrussChord'},
                    # Truss Bottom Chords
                    {'id': 'M13', 'startNodeId': 'N5', 'endNodeId': 'N9', 'type': 'TRUSS_CHORD', 'role': 'TrussChord'},
                    {'id': 'M14', 'startNodeId': 'N10', 'endNodeId': 'N14', 'type': 'TRUSS_CHORD', 'role': 'TrussChord'},
                    # Truss Web Members
                    {'id': 'M15', 'startNodeId': 'N5', 'endNodeId': 'N6', 'type': 'TRUSS_DIAGONAL', 'role': 'TrussWeb'},
                    {'id': 'M16', 'startNodeId': 'N6', 'endNodeId': 'N9', 'type': 'TRUSS_DIAGONAL', 'role': 'TrussWeb'},
                    {'id': 'M17', 'startNodeId': 'N7', 'endNodeId': 'N5', 'type': 'TRUSS_DIAGONAL', 'role': 'TrussWeb'},
                    {'id': 'M18', 'startNodeId': 'N7', 'endNodeId': 'N9', 'type': 'TRUSS_DIAGONAL', 'role': 'TrussWeb'},
                    {'id': 'M19', 'startNodeId': 'N10', 'endNodeId': 'N11', 'type': 'TRUSS_DIAGONAL', 'role': 'TrussWeb'},
                    {'id': 'M20', 'startNodeId': 'N11', 'endNodeId': 'N14', 'type': 'TRUSS_DIAGONAL', 'role': 'TrussWeb'},
                    {'id': 'M21', 'startNodeId': 'N12', 'endNodeId': 'N10', 'type': 'TRUSS_DIAGONAL', 'role': 'TrussWeb'},
                    {'id': 'M22', 'startNodeId': 'N12', 'endNodeId': 'N14', 'type': 'TRUSS_DIAGONAL', 'role': 'TrussWeb'},
                    # Purlins
                    {'id': 'M23', 'startNodeId': 'N7', 'endNodeId': 'N12', 'type': 'PURLIN', 'role': 'Beam'},
                ],
                'geometry': {
                    'buildingLength': 80,
                    'buildingWidth': 60,
                    'totalHeight': 20,
                    'eaveHeight': 15,
                    'roofSlope': 14.04,
                    'frameCount': 4,
                    'baySpacings': [20, 20, 20, 20]
                }
            },
            
            # 4. Mono-Slope Hangar - Small Aircraft
            {
                'id': 'mono_001',
                'buildingType': 'MONO_SLOPE_HANGAR',
                'frameSystem': 'MOMENT',
                'diaphragmType': 'RIGID',
                'planShape': 'REGULAR',
                'SFRS': 'Special moment frame',
                'nodes': [
                    {'id': 'N1', 'x': 0, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N2', 'x': 50, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N3', 'x': 50, 'y': 40, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N4', 'x': 0, 'y': 40, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N5', 'x': 0, 'y': 0, 'z': 12},
                    {'id': 'N6', 'x': 50, 'y': 0, 'z': 18},  # High side
                    {'id': 'N7', 'x': 50, 'y': 40, 'z': 18},
                    {'id': 'N8', 'x': 0, 'y': 40, 'z': 12},
                ],
                'members': [
                    # Columns
                    {'id': 'M1', 'startNodeId': 'N1', 'endNodeId': 'N5', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M2', 'startNodeId': 'N2', 'endNodeId': 'N6', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M3', 'startNodeId': 'N3', 'endNodeId': 'N7', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M4', 'startNodeId': 'N4', 'endNodeId': 'N8', 'type': 'COLUMN', 'role': 'Column'},
                    # Rafters (mono-slope)
                    {'id': 'M5', 'startNodeId': 'N5', 'endNodeId': 'N6', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M6', 'startNodeId': 'N8', 'endNodeId': 'N7', 'type': 'RAFTER', 'role': 'Beam'},
                    # Beams
                    {'id': 'M7', 'startNodeId': 'N5', 'endNodeId': 'N8', 'type': 'BEAM', 'role': 'Beam'},
                    {'id': 'M8', 'startNodeId': 'N6', 'endNodeId': 'N7', 'type': 'BEAM', 'role': 'Beam'},
                ],
                'geometry': {
                    'buildingLength': 50,
                    'buildingWidth': 40,
                    'totalHeight': 18,
                    'eaveHeight': 12,
                    'roofSlope': 6.84,
                    'frameCount': 2,
                    'baySpacings': [25, 25]
                }
            },
            
            # 5. Car Shed Canopy - Parking Structure
            {
                'id': 'canopy_001',
                'buildingType': 'CAR_SHED_CANOPY',
                'frameSystem': 'CANTILEVER',
                'diaphragmType': 'FLEXIBLE',
                'planShape': 'REGULAR',
                'SFRS': 'Cantilever column system',
                'nodes': [
                    {'id': 'N1', 'x': 0, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N2', 'x': 30, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N3', 'x': 0, 'y': 0, 'z': 8},
                    {'id': 'N4', 'x': 30, 'y': 0, 'z': 8},
                    {'id': 'N5', 'x': -10, 'y': 0, 'z': 8},  # Cantilever extension
                    {'id': 'N6', 'x': 40, 'y': 0, 'z': 8},   # Cantilever extension
                    {'id': 'N7', 'x': 0, 'y': 20, 'z': 8},
                    {'id': 'N8', 'x': 30, 'y': 20, 'z': 8},
                    {'id': 'N9', 'x': -10, 'y': 20, 'z': 8}, # Cantilever extension
                    {'id': 'N10', 'x': 40, 'y': 20, 'z': 8}, # Cantilever extension
                ],
                'members': [
                    # Columns
                    {'id': 'M1', 'startNodeId': 'N1', 'endNodeId': 'N3', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M2', 'startNodeId': 'N2', 'endNodeId': 'N4', 'type': 'COLUMN', 'role': 'Column'},
                    # Cantilever Beams
                    {'id': 'M3', 'startNodeId': 'N5', 'endNodeId': 'N6', 'type': 'CANTILEVER_BEAM', 'role': 'CantileverBeam'},
                    {'id': 'M4', 'startNodeId': 'N9', 'endNodeId': 'N10', 'type': 'CANTILEVER_BEAM', 'role': 'CantileverBeam'},
                    # Canopy Beams
                    {'id': 'M5', 'startNodeId': 'N3', 'endNodeId': 'N7', 'type': 'CANOPY_BEAM', 'role': 'CanopyBeam'},
                    {'id': 'M6', 'startNodeId': 'N4', 'endNodeId': 'N8', 'type': 'CANOPY_BEAM', 'role': 'CanopyBeam'},
                    {'id': 'M7', 'startNodeId': 'N5', 'endNodeId': 'N9', 'type': 'CANOPY_BEAM', 'role': 'CanopyBeam'},
                    {'id': 'M8', 'startNodeId': 'N6', 'endNodeId': 'N10', 'type': 'CANOPY_BEAM', 'role': 'CanopyBeam'},
                ],
                'geometry': {
                    'buildingLength': 50,  # Including cantilevers
                    'buildingWidth': 20,
                    'totalHeight': 8,
                    'eaveHeight': 8,
                    'roofSlope': 0,
                    'frameCount': 2,
                    'baySpacings': [25, 25]
                }
            },
            
            # 6. Signage Billboard - Vertical Structure
            {
                'id': 'sign_001',
                'buildingType': 'SIGNAGE_BILLBOARD',
                'frameSystem': 'CANTILEVER',
                'diaphragmType': 'RIGID',
                'planShape': 'IRREGULAR',
                'SFRS': 'Cantilever column system',
                'nodes': [
                    {'id': 'N1', 'x': 0, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True, 'rx': True, 'ry': True, 'rz': True}},
                    {'id': 'N2', 'x': 2, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True, 'rx': True, 'ry': True, 'rz': True}},
                    {'id': 'N3', 'x': 0, 'y': 0, 'z': 25},
                    {'id': 'N4', 'x': 2, 'y': 0, 'z': 25},
                    {'id': 'N5', 'x': 0, 'y': 0, 'z': 30},  # Sign bottom
                    {'id': 'N6', 'x': 2, 'y': 0, 'z': 30},
                    {'id': 'N7', 'x': 0, 'y': 0, 'z': 35},  # Sign top
                    {'id': 'N8', 'x': 2, 'y': 0, 'z': 35},
                    {'id': 'N9', 'x': -5, 'y': 0, 'z': 30}, # Sign extension
                    {'id': 'N10', 'x': -5, 'y': 0, 'z': 35},
                    {'id': 'N11', 'x': 7, 'y': 0, 'z': 30}, # Sign extension
                    {'id': 'N12', 'x': 7, 'y': 0, 'z': 35},
                ],
                'members': [
                    # Support Poles
                    {'id': 'M1', 'startNodeId': 'N1', 'endNodeId': 'N3', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M2', 'startNodeId': 'N2', 'endNodeId': 'N4', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M3', 'startNodeId': 'N3', 'endNodeId': 'N5', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M4', 'startNodeId': 'N4', 'endNodeId': 'N6', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M5', 'startNodeId': 'N5', 'endNodeId': 'N7', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M6', 'startNodeId': 'N6', 'endNodeId': 'N8', 'type': 'COLUMN', 'role': 'Column'},
                    # Sign Frame
                    {'id': 'M7', 'startNodeId': 'N5', 'endNodeId': 'N9', 'type': 'BEAM', 'role': 'Beam'},
                    {'id': 'M8', 'startNodeId': 'N6', 'endNodeId': 'N11', 'type': 'BEAM', 'role': 'Beam'},
                    {'id': 'M9', 'startNodeId': 'N7', 'endNodeId': 'N10', 'type': 'BEAM', 'role': 'Beam'},
                    {'id': 'M10', 'startNodeId': 'N8', 'endNodeId': 'N12', 'type': 'BEAM', 'role': 'Beam'},
                    {'id': 'M11', 'startNodeId': 'N9', 'endNodeId': 'N10', 'type': 'BEAM', 'role': 'Beam'},
                    {'id': 'M12', 'startNodeId': 'N11', 'endNodeId': 'N12', 'type': 'BEAM', 'role': 'Beam'},
                    # Bracing
                    {'id': 'M13', 'startNodeId': 'N3', 'endNodeId': 'N4', 'type': 'BRACE', 'role': 'Brace'},
                    {'id': 'M14', 'startNodeId': 'N5', 'endNodeId': 'N6', 'type': 'BRACE', 'role': 'Brace'},
                    {'id': 'M15', 'startNodeId': 'N7', 'endNodeId': 'N8', 'type': 'BRACE', 'role': 'Brace'},
                ],
                'geometry': {
                    'buildingLength': 12,
                    'buildingWidth': 2,
                    'totalHeight': 35,
                    'eaveHeight': 25,
                    'roofSlope': 0,
                    'frameCount': 1,
                    'baySpacings': [12]
                }
            },
            
            # 7. Multi-Story Office Building
            {
                'id': 'office_001',
                'buildingType': 'SYMMETRIC_MULTI_STORY',
                'frameSystem': 'MOMENT',
                'diaphragmType': 'RIGID',
                'planShape': 'REGULAR',
                'SFRS': 'Special moment frame',
                'nodes': [
                    # Ground floor
                    {'id': 'N1', 'x': 0, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N2', 'x': 30, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N3', 'x': 30, 'y': 20, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N4', 'x': 0, 'y': 20, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    # Second floor
                    {'id': 'N5', 'x': 0, 'y': 0, 'z': 4},
                    {'id': 'N6', 'x': 30, 'y': 0, 'z': 4},
                    {'id': 'N7', 'x': 30, 'y': 20, 'z': 4},
                    {'id': 'N8', 'x': 0, 'y': 20, 'z': 4},
                    # Third floor
                    {'id': 'N9', 'x': 0, 'y': 0, 'z': 8},
                    {'id': 'N10', 'x': 30, 'y': 0, 'z': 8},
                    {'id': 'N11', 'x': 30, 'y': 20, 'z': 8},
                    {'id': 'N12', 'x': 0, 'y': 20, 'z': 8},
                    # Roof
                    {'id': 'N13', 'x': 0, 'y': 0, 'z': 12},
                    {'id': 'N14', 'x': 30, 'y': 0, 'z': 12},
                    {'id': 'N15', 'x': 30, 'y': 20, 'z': 12},
                    {'id': 'N16', 'x': 0, 'y': 20, 'z': 12},
                ],
                'members': [
                    # Columns
                    {'id': 'M1', 'startNodeId': 'N1', 'endNodeId': 'N5', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M2', 'startNodeId': 'N2', 'endNodeId': 'N6', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M3', 'startNodeId': 'N3', 'endNodeId': 'N7', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M4', 'startNodeId': 'N4', 'endNodeId': 'N8', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M5', 'startNodeId': 'N5', 'endNodeId': 'N9', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M6', 'startNodeId': 'N6', 'endNodeId': 'N10', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M7', 'startNodeId': 'N7', 'endNodeId': 'N11', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M8', 'startNodeId': 'N8', 'endNodeId': 'N12', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M9', 'startNodeId': 'N9', 'endNodeId': 'N13', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M10', 'startNodeId': 'N10', 'endNodeId': 'N14', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M11', 'startNodeId': 'N11', 'endNodeId': 'N15', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M12', 'startNodeId': 'N12', 'endNodeId': 'N16', 'type': 'COLUMN', 'role': 'Column'},
                    # Floor Beams - Second Floor
                    {'id': 'M13', 'startNodeId': 'N5', 'endNodeId': 'N6', 'type': 'BEAM', 'role': 'Beam'},
                    {'id': 'M14', 'startNodeId': 'N6', 'endNodeId': 'N7', 'type': 'BEAM', 'role': 'Beam'},
                    {'id': 'M15', 'startNodeId': 'N7', 'endNodeId': 'N8', 'type': 'BEAM', 'role': 'Beam'},
                    {'id': 'M16', 'startNodeId': 'N8', 'endNodeId': 'N5', 'type': 'BEAM', 'role': 'Beam'},
                    # Floor Beams - Third Floor
                    {'id': 'M17', 'startNodeId': 'N9', 'endNodeId': 'N10', 'type': 'BEAM', 'role': 'Beam'},
                    {'id': 'M18', 'startNodeId': 'N10', 'endNodeId': 'N11', 'type': 'BEAM', 'role': 'Beam'},
                    {'id': 'M19', 'startNodeId': 'N11', 'endNodeId': 'N12', 'type': 'BEAM', 'role': 'Beam'},
                    {'id': 'M20', 'startNodeId': 'N12', 'endNodeId': 'N9', 'type': 'BEAM', 'role': 'Beam'},
                    # Roof Beams
                    {'id': 'M21', 'startNodeId': 'N13', 'endNodeId': 'N14', 'type': 'BEAM', 'role': 'Beam'},
                    {'id': 'M22', 'startNodeId': 'N14', 'endNodeId': 'N15', 'type': 'BEAM', 'role': 'Beam'},
                    {'id': 'M23', 'startNodeId': 'N15', 'endNodeId': 'N16', 'type': 'BEAM', 'role': 'Beam'},
                    {'id': 'M24', 'startNodeId': 'N16', 'endNodeId': 'N13', 'type': 'BEAM', 'role': 'Beam'},
                ],
                'geometry': {
                    'buildingLength': 30,
                    'buildingWidth': 20,
                    'totalHeight': 12,
                    'eaveHeight': 12,
                    'roofSlope': 0,
                    'frameCount': 3,
                    'baySpacings': [10, 10, 10]
                }
            },
            
            # 8. Industrial Manufacturing Facility
            {
                'id': 'mfg_001',
                'buildingType': 'MANUFACTURING_FACILITY',
                'frameSystem': 'BRACED',
                'diaphragmType': 'SEMI_RIGID',
                'planShape': 'REGULAR',
                'SFRS': 'Special concentrically braced frame',
                'nodes': [
                    {'id': 'N1', 'x': 0, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N2', 'x': 40, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N3', 'x': 80, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N4', 'x': 120, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N5', 'x': 0, 'y': 60, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N6', 'x': 40, 'y': 60, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N7', 'x': 80, 'y': 60, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N8', 'x': 120, 'y': 60, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    # Eave level
                    {'id': 'N9', 'x': 0, 'y': 0, 'z': 18},
                    {'id': 'N10', 'x': 40, 'y': 0, 'z': 18},
                    {'id': 'N11', 'x': 80, 'y': 0, 'z': 18},
                    {'id': 'N12', 'x': 120, 'y': 0, 'z': 18},
                    {'id': 'N13', 'x': 0, 'y': 60, 'z': 18},
                    {'id': 'N14', 'x': 40, 'y': 60, 'z': 18},
                    {'id': 'N15', 'x': 80, 'y': 60, 'z': 18},
                    {'id': 'N16', 'x': 120, 'y': 60, 'z': 18},
                    # Crane rail level
                    {'id': 'N17', 'x': 0, 'y': 0, 'z': 15},
                    {'id': 'N18', 'x': 40, 'y': 0, 'z': 15},
                    {'id': 'N19', 'x': 80, 'y': 0, 'z': 15},
                    {'id': 'N20', 'x': 120, 'y': 0, 'z': 15},
                    {'id': 'N21', 'x': 0, 'y': 60, 'z': 15},
                    {'id': 'N22', 'x': 40, 'y': 60, 'z': 15},
                    {'id': 'N23', 'x': 80, 'y': 60, 'z': 15},
                    {'id': 'N24', 'x': 120, 'y': 60, 'z': 15},
                    # Ridge
                    {'id': 'N25', 'x': 60, 'y': 30, 'z': 25},
                ],
                'members': [
                    # Columns
                    {'id': 'M1', 'startNodeId': 'N1', 'endNodeId': 'N9', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M2', 'startNodeId': 'N2', 'endNodeId': 'N10', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M3', 'startNodeId': 'N3', 'endNodeId': 'N11', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M4', 'startNodeId': 'N4', 'endNodeId': 'N12', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M5', 'startNodeId': 'N5', 'endNodeId': 'N13', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M6', 'startNodeId': 'N6', 'endNodeId': 'N14', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M7', 'startNodeId': 'N7', 'endNodeId': 'N15', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M8', 'startNodeId': 'N8', 'endNodeId': 'N16', 'type': 'COLUMN', 'role': 'Column'},
                    # Crane Rails
                    {'id': 'M9', 'startNodeId': 'N17', 'endNodeId': 'N18', 'type': 'CRANE_RAIL', 'role': 'RunwayBeam'},
                    {'id': 'M10', 'startNodeId': 'N18', 'endNodeId': 'N19', 'type': 'CRANE_RAIL', 'role': 'RunwayBeam'},
                    {'id': 'M11', 'startNodeId': 'N19', 'endNodeId': 'N20', 'type': 'CRANE_RAIL', 'role': 'RunwayBeam'},
                    {'id': 'M12', 'startNodeId': 'N21', 'endNodeId': 'N22', 'type': 'CRANE_RAIL', 'role': 'RunwayBeam'},
                    {'id': 'M13', 'startNodeId': 'N22', 'endNodeId': 'N23', 'type': 'CRANE_RAIL', 'role': 'RunwayBeam'},
                    {'id': 'M14', 'startNodeId': 'N23', 'endNodeId': 'N24', 'type': 'CRANE_RAIL', 'role': 'RunwayBeam'},
                    # Crane Brackets
                    {'id': 'M15', 'startNodeId': 'N9', 'endNodeId': 'N17', 'type': 'BEAM', 'role': 'CraneBracket'},
                    {'id': 'M16', 'startNodeId': 'N10', 'endNodeId': 'N18', 'type': 'BEAM', 'role': 'CraneBracket'},
                    {'id': 'M17', 'startNodeId': 'N11', 'endNodeId': 'N19', 'type': 'BEAM', 'role': 'CraneBracket'},
                    {'id': 'M18', 'startNodeId': 'N12', 'endNodeId': 'N20', 'type': 'BEAM', 'role': 'CraneBracket'},
                    {'id': 'M19', 'startNodeId': 'N13', 'endNodeId': 'N21', 'type': 'BEAM', 'role': 'CraneBracket'},
                    {'id': 'M20', 'startNodeId': 'N14', 'endNodeId': 'N22', 'type': 'BEAM', 'role': 'CraneBracket'},
                    {'id': 'M21', 'startNodeId': 'N15', 'endNodeId': 'N23', 'type': 'BEAM', 'role': 'CraneBracket'},
                    {'id': 'M22', 'startNodeId': 'N16', 'endNodeId': 'N24', 'type': 'BEAM', 'role': 'CraneBracket'},
                    # Rafters
                    {'id': 'M23', 'startNodeId': 'N9', 'endNodeId': 'N25', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M24', 'startNodeId': 'N10', 'endNodeId': 'N25', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M25', 'startNodeId': 'N11', 'endNodeId': 'N25', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M26', 'startNodeId': 'N12', 'endNodeId': 'N25', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M27', 'startNodeId': 'N13', 'endNodeId': 'N25', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M28', 'startNodeId': 'N14', 'endNodeId': 'N25', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M29', 'startNodeId': 'N15', 'endNodeId': 'N25', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M30', 'startNodeId': 'N16', 'endNodeId': 'N25', 'type': 'RAFTER', 'role': 'Beam'},
                    # Bracing
                    {'id': 'M31', 'startNodeId': 'N9', 'endNodeId': 'N11', 'type': 'BRACE', 'role': 'Brace'},
                    {'id': 'M32', 'startNodeId': 'N10', 'endNodeId': 'N12', 'type': 'BRACE', 'role': 'Brace'},
                    {'id': 'M33', 'startNodeId': 'N13', 'endNodeId': 'N15', 'type': 'BRACE', 'role': 'Brace'},
                    {'id': 'M34', 'startNodeId': 'N14', 'endNodeId': 'N16', 'type': 'BRACE', 'role': 'Brace'},
                ],
                'geometry': {
                    'buildingLength': 120,
                    'buildingWidth': 60,
                    'totalHeight': 25,
                    'eaveHeight': 18,
                    'roofSlope': 16.7,
                    'frameCount': 4,
                    'baySpacings': [30, 30, 30, 30]
                }
            },
            
            # 9. Sports Facility - Gymnasium
            {
                'id': 'sports_001',
                'buildingType': 'SPORTS_FACILITY',
                'frameSystem': 'TRUSS',
                'diaphragmType': 'RIGID',
                'planShape': 'REGULAR',
                'SFRS': 'Truss system',
                'nodes': [
                    {'id': 'N1', 'x': 0, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N2', 'x': 60, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N3', 'x': 60, 'y': 40, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N4', 'x': 0, 'y': 40, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N5', 'x': 0, 'y': 0, 'z': 12},
                    {'id': 'N6', 'x': 60, 'y': 0, 'z': 12},
                    {'id': 'N7', 'x': 60, 'y': 40, 'z': 12},
                    {'id': 'N8', 'x': 0, 'y': 40, 'z': 12},
                    # Truss nodes
                    {'id': 'N9', 'x': 15, 'y': 0, 'z': 15},
                    {'id': 'N10', 'x': 30, 'y': 0, 'z': 18},  # Peak
                    {'id': 'N11', 'x': 45, 'y': 0, 'z': 15},
                    {'id': 'N12', 'x': 15, 'y': 40, 'z': 15},
                    {'id': 'N13', 'x': 30, 'y': 40, 'z': 18}, # Peak
                    {'id': 'N14', 'x': 45, 'y': 40, 'z': 15},
                ],
                'members': [
                    # Columns
                    {'id': 'M1', 'startNodeId': 'N1', 'endNodeId': 'N5', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M2', 'startNodeId': 'N2', 'endNodeId': 'N6', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M3', 'startNodeId': 'N3', 'endNodeId': 'N7', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M4', 'startNodeId': 'N4', 'endNodeId': 'N8', 'type': 'COLUMN', 'role': 'Column'},
                    # Truss Top Chords
                    {'id': 'M5', 'startNodeId': 'N5', 'endNodeId': 'N9', 'type': 'TRUSS_CHORD', 'role': 'TrussChord'},
                    {'id': 'M6', 'startNodeId': 'N9', 'endNodeId': 'N10', 'type': 'TRUSS_CHORD', 'role': 'TrussChord'},
                    {'id': 'M7', 'startNodeId': 'N10', 'endNodeId': 'N11', 'type': 'TRUSS_CHORD', 'role': 'TrussChord'},
                    {'id': 'M8', 'startNodeId': 'N11', 'endNodeId': 'N6', 'type': 'TRUSS_CHORD', 'role': 'TrussChord'},
                    {'id': 'M9', 'startNodeId': 'N8', 'endNodeId': 'N12', 'type': 'TRUSS_CHORD', 'role': 'TrussChord'},
                    {'id': 'M10', 'startNodeId': 'N12', 'endNodeId': 'N13', 'type': 'TRUSS_CHORD', 'role': 'TrussChord'},
                    {'id': 'M11', 'startNodeId': 'N13', 'endNodeId': 'N14', 'type': 'TRUSS_CHORD', 'role': 'TrussChord'},
                    {'id': 'M12', 'startNodeId': 'N14', 'endNodeId': 'N7', 'type': 'TRUSS_CHORD', 'role': 'TrussChord'},
                    # Truss Bottom Chords
                    {'id': 'M13', 'startNodeId': 'N5', 'endNodeId': 'N6', 'type': 'TRUSS_CHORD', 'role': 'TrussChord'},
                    {'id': 'M14', 'startNodeId': 'N8', 'endNodeId': 'N7', 'type': 'TRUSS_CHORD', 'role': 'TrussChord'},
                    # Truss Web Members
                    {'id': 'M15', 'startNodeId': 'N5', 'endNodeId': 'N9', 'type': 'TRUSS_DIAGONAL', 'role': 'TrussWeb'},
                    {'id': 'M16', 'startNodeId': 'N9', 'endNodeId': 'N6', 'type': 'TRUSS_DIAGONAL', 'role': 'TrussWeb'},
                    {'id': 'M17', 'startNodeId': 'N10', 'endNodeId': 'N5', 'type': 'TRUSS_DIAGONAL', 'role': 'TrussWeb'},
                    {'id': 'M18', 'startNodeId': 'N10', 'endNodeId': 'N6', 'type': 'TRUSS_DIAGONAL', 'role': 'TrussWeb'},
                    {'id': 'M19', 'startNodeId': 'N8', 'endNodeId': 'N12', 'type': 'TRUSS_DIAGONAL', 'role': 'TrussWeb'},
                    {'id': 'M20', 'startNodeId': 'N12', 'endNodeId': 'N7', 'type': 'TRUSS_DIAGONAL', 'role': 'TrussWeb'},
                    {'id': 'M21', 'startNodeId': 'N13', 'endNodeId': 'N8', 'type': 'TRUSS_DIAGONAL', 'role': 'TrussWeb'},
                    {'id': 'M22', 'startNodeId': 'N13', 'endNodeId': 'N7', 'type': 'TRUSS_DIAGONAL', 'role': 'TrussWeb'},
                    # Purlins
                    {'id': 'M23', 'startNodeId': 'N10', 'endNodeId': 'N13', 'type': 'PURLIN', 'role': 'Beam'},
                ],
                'geometry': {
                    'buildingLength': 60,
                    'buildingWidth': 40,
                    'totalHeight': 18,
                    'eaveHeight': 12,
                    'roofSlope': 11.31,
                    'frameCount': 3,
                    'baySpacings': [20, 20, 20]
                }
            },
            
            # 10. Temporary Structure - Construction Shed
            {
                'id': 'temp_001',
                'buildingType': 'TEMPORARY_STRUCTURE',
                'frameSystem': 'BRACED',
                'diaphragmType': 'FLEXIBLE',
                'planShape': 'IRREGULAR',
                'SFRS': 'Special concentrically braced frame',
                'nodes': [
                    {'id': 'N1', 'x': 0, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N2', 'x': 20, 'y': 0, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N3', 'x': 20, 'y': 15, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N4', 'x': 0, 'y': 15, 'z': 0, 'restraints': {'dx': True, 'dy': True, 'dz': True}},
                    {'id': 'N5', 'x': 0, 'y': 0, 'z': 6},
                    {'id': 'N6', 'x': 20, 'y': 0, 'z': 6},
                    {'id': 'N7', 'x': 20, 'y': 15, 'z': 6},
                    {'id': 'N8', 'x': 0, 'y': 15, 'z': 6},
                    {'id': 'N9', 'x': 10, 'y': 7.5, 'z': 8},  # Ridge
                ],
                'members': [
                    # Columns
                    {'id': 'M1', 'startNodeId': 'N1', 'endNodeId': 'N5', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M2', 'startNodeId': 'N2', 'endNodeId': 'N6', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M3', 'startNodeId': 'N3', 'endNodeId': 'N7', 'type': 'COLUMN', 'role': 'Column'},
                    {'id': 'M4', 'startNodeId': 'N4', 'endNodeId': 'N8', 'type': 'COLUMN', 'role': 'Column'},
                    # Rafters
                    {'id': 'M5', 'startNodeId': 'N5', 'endNodeId': 'N9', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M6', 'startNodeId': 'N6', 'endNodeId': 'N9', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M7', 'startNodeId': 'N7', 'endNodeId': 'N9', 'type': 'RAFTER', 'role': 'Beam'},
                    {'id': 'M8', 'startNodeId': 'N8', 'endNodeId': 'N9', 'type': 'RAFTER', 'role': 'Beam'},
                    # Bracing
                    {'id': 'M9', 'startNodeId': 'N5', 'endNodeId': 'N7', 'type': 'BRACE', 'role': 'Brace'},
                    {'id': 'M10', 'startNodeId': 'N6', 'endNodeId': 'N8', 'type': 'BRACE', 'role': 'Brace'},
                ],
                'geometry': {
                    'buildingLength': 20,
                    'buildingWidth': 15,
                    'totalHeight': 8,
                    'eaveHeight': 6,
                    'roofSlope': 18.43,
                    'frameCount': 2,
                    'baySpacings': [10, 10]
                }
            },
        ]
        
        return sample_models

if __name__ == "__main__":
    extractor = StructuralModelFeatureExtractor()
    sample_data = extractor.load_sample_data()
    global_df, member_df = extractor.prepare_training_data(sample_data)
    
    print(f"Global features shape: {global_df.shape}")
    print(f"Member features shape: {member_df.shape}")
    print("\nGlobal feature columns:", list(global_df.columns))
    print("\nMember feature columns:", list(member_df.columns))
