// Core structural model types

export interface Node {
  id: string;
  x: number;
  y: number;
  z: number;
  restraints?: {
    dx: boolean;
    dy: boolean;
    dz: boolean;
    rx: boolean;
    ry: boolean;
    rz: boolean;
  };
}

export interface Member {
  id: string;
  startNodeId: string;
  endNodeId: string;
  sectionId: string;
  materialId: string;
  type: MemberType;
  tag?: MemberTag;
  length?: number;
  angle?: number;
}

export interface Plate {
  id: string;
  nodeIds: string[];
  thickness: number;
  materialId: string;
  normal?: { x: number; y: number; z: number };
}

export interface Section {
  id: string;
  name: string;
  type: "I" | "C" | "L" | "T" | "BOX" | "PIPE" | "RECT" | "CIRCULAR";
  properties: {
    area: number;
    ix: number;
    iy: number;
    iz: number;
    depth?: number;
    width?: number;
    thickness?: number;
  };
}

export interface Material {
  id: string;
  name: string;
  type: "STEEL" | "CONCRETE" | "ALUMINUM" | "WOOD";
  properties: {
    density: number;
    elasticModulus: number;
    poissonRatio: number;
    yieldStrength?: number;
    ultimateStrength?: number;
  };
}

export interface LoadCase {
  id: string;
  name: string;
  type: LoadType;
  description?: string;
  loads: Load[];
}

export interface Load {
  id: string;
  type: "NODAL" | "MEMBER" | "SURFACE" | "PRESSURE";
  targetId: string; // Node ID, Member ID, or Plate ID
  direction: "X" | "Y" | "Z" | "LOCAL_X" | "LOCAL_Y" | "LOCAL_Z";
  magnitude: number;
  position?: number; // For member loads (0 to 1)
  distribution?: "UNIFORM" | "TRIANGULAR" | "TRAPEZOIDAL";
}

export type MemberType =
  | "BEAM"
  | "COLUMN"
  | "BRACE"
  | "TRUSS_CHORD"
  | "TRUSS_DIAGONAL"
  | "RAFTER"
  | "PURLIN"
  | "GIRT"
  | "STRUT"
  | "CRANE_RAIL"
  | "CANTILEVER";

export type MemberTag =
  | "MAIN_FRAME_COLUMN"
  | "MAIN_FRAME_RAFTER"
  | "END_FRAME_COLUMN"
  | "END_FRAME_RAFTER"
  | "ROOF_PURLIN"
  | "WALL_GIRT"
  | "ROOF_BRACING"
  | "WALL_BRACING"
  | "CRANE_BEAM"
  | "MEZZANINE_BEAM"
  | "CANOPY_BEAM"
  | "FASCIA_BEAM"
  | "PARAPET"
  | "SIGNAGE_POLE";

export type LoadType =
  | "DEAD"
  | "LIVE"
  | "WIND"
  | "SEISMIC"
  | "SNOW"
  | "CRANE"
  | "THERMAL"
  | "SETTLEMENT";

export type BuildingType =
  | "SINGLE_GABLE_HANGAR"
  | "MULTI_GABLE_HANGAR"
  | "TRUSS_SINGLE_GABLE"
  | "TRUSS_DOUBLE_GABLE"
  | "MONO_SLOPE_HANGAR"
  | "MONO_SLOPE_BUILDING"
  | "CAR_SHED_CANOPY"
  | "CANTILEVER_ROOF"
  | "SIGNAGE_BILLBOARD"
  | "STANDING_WALL"
  | "ELEVATOR_SHAFT"
  | "SYMMETRIC_MULTI_STORY"
  | "COMPLEX_MULTI_STORY"
  | "TEMPORARY_STRUCTURE";

// Support definition for 3D visualization
export interface Support {
  id: string;
  nodeId: string;
  type: "FIXED" | "PINNED" | "ROLLER" | "CUSTOM";
  restraints: {
    dx: boolean;
    dy: boolean;
    dz: boolean;
    rx: boolean;
    ry: boolean;
    rz: boolean;
  };
  originalDefinition: string;
}

// Release definition for 3D visualization
export interface Release {
  id: string;
  memberId: string;
  end: "START" | "END";
  releases: {
    fx: boolean;
    fy: boolean;
    fz: boolean;
    mx: boolean;
    my: boolean;
    mz: boolean;
  };
  originalDefinition: string;
}

export interface StructuralModel {
  id: string;
  name: string;
  type: "STAAD" | "SAP2000";
  units: {
    length: "M" | "MM" | "FT" | "IN";
    force: "N" | "KN" | "LB" | "KIP";
    mass: "KG" | "LB" | "SLUG";
    temperature: "C" | "F";
  };
  unitsSystem?: "METRIC" | "IMPERIAL";
  nodes: Node[];
  members: Member[];
  plates: Plate[];
  sections: Section[];
  materials: Material[];
  loadCases: LoadCase[];
  supports?: Support[]; // Support definitions for 3D visualization
  releases?: Release[]; // Release definitions for 3D visualization
  buildingType?: BuildingType;
  geometry?: {
    eaveHeight: number;
    meanRoofHeight: number;
    totalHeight: number;
    baySpacings: number[];
    frameCount: number;
    endFrameCount: number;
    roofSlope: number;
    buildingLength: number;
    buildingWidth: number;
  };
  aiDetection?: {
    confidence: number;
    suggestedType: BuildingType;
    memberTags: { [memberId: string]: MemberTag };
    needsReview: boolean;
  };
}

export interface WindLoadParameters {
  basicWindSpeed: number; // mph or m/s
  exposureCategory: "B" | "C" | "D";
  topographicFactor: number;
  directionality: number;
  gustFactor: number;
  enclosureClassification: "OPEN" | "PARTIALLY_ENCLOSED" | "ENCLOSED";
  internalPressureCoefficient: number;
  buildingHeight: number;
  buildingLength: number;
  buildingWidth: number;
  roofSlope: number;
}

export interface SeismicLoadParameters {
  siteClass: "A" | "B" | "C" | "D" | "E" | "F";
  ss: number; // Mapped spectral acceleration
  s1: number; // Mapped spectral acceleration
  fa: number; // Site coefficient
  fv: number; // Site coefficient
  importanceFactor: number;
  responseModificationFactor: number;
  overstrengthFactor: number;
  deflectionAmplificationFactor: number;
  seismicWeight: number;
}

export interface SnowLoadParameters {
  groundSnowLoad: number;
  exposureFactor: number;
  thermalFactor: number;
  importanceFactor: number;
  roofSlope: number;
  roofLength: number;
  isWarmRoof: boolean;
  hasParapet: boolean;
}

export interface LoadCalculationResult {
  loadType: LoadType;
  parameters: any;
  loads: Load[];
  summary: {
    totalForce: { x: number; y: number; z: number };
    totalMoment: { x: number; y: number; z: number };
    maxPressure: number;
    minPressure: number;
  };
  codeReferences: string[];
  warnings: string[];
}

// Master Control Point (MCP) - Single source of truth for all model data
export interface MasterControlPoint {
  id: string;
  modelId: string;
  modelName: string;
  createdAt: Date;
  lastModified: Date;
  isLocked: boolean; // Once locked, cannot be modified
  confirmedByUser: boolean;

  // Units - must match parsed model units
  units: {
    length: "M" | "MM" | "FT" | "IN";
    force: "N" | "KN" | "LB" | "KIP";
    mass: "KG" | "LB" | "SLUG";
    temperature: "C" | "F";
  };

  // Unit System Classification
  unitsSystem: "METRIC" | "IMPERIAL";

  // Building Classification
  buildingType: BuildingType;
  buildingTypeConfidence: number; // 0-1
  aiReasoning: string[];
  manualOverride: boolean;

  // Height Classification
  heightClassification: "LOW_RISE" | "HIGH_RISE";

  // Aspect Ratios
  aspectRatio: {
    H_L: number; // Height to Length ratio
    L_B: number; // Length to Breadth ratio
  };

  // Structural Properties
  structuralRigidity: "RIGID" | "SEMI_RIGID" | "FLEXIBLE";
  planIrregularity: "REGULAR" | "IRREGULAR";
  verticalIrregularity: "NONE" | "MINOR" | "MAJOR";
  diaphragmType: "RIGID" | "FLEXIBLE";

  // Roof Information
  roofType:
    | "GABLE"
    | "MONO_SLOPE"
    | "HIP"
    | "FLAT"
    | "SHED"
    | "GAMBREL"
    | "MANSARD";
  roofSlopeDegrees: number;

  // Frame Configuration
  framesX: number; // Total frames in X direction
  framesY: number; // Total frames in Y direction
  baySpacingX: number[]; // Array of bay spacings in X direction
  baySpacingY: number[]; // Array of bay spacings in Y direction

  // Special Features Detection
  specialFeatures: {
    canopy: boolean;
    cantilever: boolean;
    parapets: boolean;
    craneBeam: boolean;
    mezzanine: boolean;
    signage: boolean;
    elevatorShaft: boolean;
  };

  // Geometry Dimensions (Legacy - kept for compatibility)
  dimensions: {
    eaveHeight: number;
    roofMeanHeight: number;
    totalHeight: number;
    buildingLength: number;
    buildingWidth: number;
    roofSlope: number; // degrees
    frameCount: number;
    endFrameCount: number;
  };

  // Frame and Bay Details
  frames: {
    frameId: string;
    baySpacing: number;
    isEndFrame: boolean;
    confirmedByUser: boolean;
  }[];

  // Member Tags - Final confirmed tags
  memberTags: {
    memberId: string;
    tag: MemberTag;
    autoTag: MemberTag; // Original AI suggestion
    manualOverride: boolean;
    confidence: number;
  }[];

  // Plate Classifications
  plates: {
    plateId: string;
    type: "ROOF" | "WALL" | "FLOOR" | "FOUNDATION";
    normalVector: { x: number; y: number; z: number };
    area: number;
  }[];

  // Load Path Analysis
  loadPaths: {
    pathId: string;
    description: string;
    memberIds: string[];
    loadTypes: LoadType[];
    criticalPath: boolean;
  }[];

  // Machine learning training data
  mlTrainingData: {
    userOverrides: {
      timestamp: Date;
      originalValue: any;
      userValue: any;
      field: string;
      confidence: number;
    }[];
    feedbackScore: number; // User satisfaction with AI predictions
  };

  // AI Assistant Integration
  aiAssistantData?: {
    lastPredictionId?: string;
    confirmedPredictions: string[];
    rejectedPredictions: string[];
    userCorrectionCount: number;
    averageConfidenceAccepted: number;
  };

  // Validation Status
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    lastValidated: Date;
  };
}

// AI Assistant Module - Separate from MCP
export interface AIAssistantPrediction {
  id: string;
  timestamp: Date;
  modelId: string;

  // Building Type Prediction
  buildingTypePrediction: {
    suggestedType: BuildingType;
    confidence: number;
    reasoning: string[];
    alternativeTypes: { type: BuildingType; confidence: number }[];
  };

  // Member Tag Predictions
  memberTagPredictions: {
    memberId: string;
    suggestedTag: MemberTag;
    confidence: number;
    reasoning: string;
    alternativeTags: { tag: MemberTag; confidence: number }[];
  }[];

  // Frame Definition Predictions
  frameDefinitions: {
    frameId: string;
    baySpacing: number;
    isEndFrame: boolean;
    confidence: number;
  }[];

  // Global Checks and Constraints
  ruleBasedValidation: {
    passed: boolean;
    violations: string[];
    warnings: string[];
  };

  // Overall prediction status
  status: "PENDING_REVIEW" | "USER_CONFIRMED" | "USER_MODIFIED" | "REJECTED";
  userFeedback?: {
    overallSatisfaction: number; // 1-5 scale
    comments?: string;
    timestamp: Date;
  };
}

// User Correction Tracking for ML Training
export interface UserCorrection {
  id: string;
  predictionId: string;
  timestamp: Date;
  userId?: string;
  projectId?: string;

  // What was corrected
  correctionType:
    | "BUILDING_TYPE"
    | "MEMBER_TAG"
    | "FRAME_DEFINITION"
    | "GEOMETRY";

  // Original AI prediction
  originalPrediction: {
    value: any;
    confidence: number;
    reasoning?: string;
  };

  // User's correction
  userCorrection: {
    value: any;
    reasoning?: string;
  };

  // Context for ML training
  modelContext: {
    modelType: "STAAD" | "SAP2000";
    modelSize: { nodes: number; members: number };
    geometryData: {
      buildingLength: number;
      buildingWidth: number;
      totalHeight: number;
      aspectRatio: number;
    };
    unitsSystem: "METRIC" | "IMPERIAL";
  };
}

// AI Assistant State
export interface AIAssistantState {
  isAnalyzing: boolean;
  currentPrediction: AIAssistantPrediction | null;
  predictionHistory: AIAssistantPrediction[];
  corrections: UserCorrection[];
  error: string | null;

  // ML Training Data Export
  trainingDataReady: boolean;
  lastExportDate?: Date;
}

// MCP State Management
export interface MCPState {
  current: MasterControlPoint | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

// MCP Update Actions
export type MCPAction =
  | { type: "INITIALIZE_MCP"; payload: MasterControlPoint }
  | {
      type: "UPDATE_BUILDING_TYPE";
      payload: { buildingType: BuildingType; manualOverride: boolean };
    }
  | {
      type: "UPDATE_MEMBER_TAG";
      payload: { memberId: string; tag: MemberTag; manualOverride: boolean };
    }
  | {
      type: "UPDATE_DIMENSIONS";
      payload: Partial<MasterControlPoint["dimensions"]>;
    }
  | { type: "LOCK_MCP" }
  | { type: "VALIDATE_MCP" }
  | { type: "SET_ERROR"; payload: string }
  | { type: "CLEAR_ERROR" };

export interface AnalysisProject {
  id: string;
  name: string;
  model: StructuralModel;
  mcp: MasterControlPoint | null; // Reference to MCP
  loadResults: LoadCalculationResult[];
  status: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  reportGenerated: boolean;
  exportedModel?: {
    filename: string;
    downloadUrl: string;
    generatedAt: Date;
  };
}
