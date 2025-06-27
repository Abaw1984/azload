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
  type:
    | "BEAM"
    | "COLUMN"
    | "BRACE"
    | "TRUSS"
    | "RAFTER"
    | "PURLIN"
    | "GIRT"
    | "CRANE_RAIL"
    | "CANTILEVER";
  releases?: {
    start: {
      dx: boolean;
      dy: boolean;
      dz: boolean;
      rx: boolean;
      ry: boolean;
      rz: boolean;
    };
    end: {
      dx: boolean;
      dy: boolean;
      dz: boolean;
      rx: boolean;
      ry: boolean;
      rz: boolean;
    };
  };
}

export interface Plate {
  id: string;
  nodeIds: string[];
  materialId: string;
  thickness: number;
  type: "FLOOR" | "ROOF" | "WALL" | "SHEAR_WALL";
}

export interface Section {
  id: string;
  name: string;
  type:
    | "I"
    | "W"
    | "S"
    | "HP"
    | "HSS"
    | "BOX"
    | "L"
    | "C"
    | "MC"
    | "PIPE"
    | "CIRCULAR"
    | "GENERIC";
  aiscDesignation?: string;
  properties: {
    area?: number;
    ix?: number;
    iy?: number;
    iz?: number;
    depth?: number;
    width?: number;
    flangeWidth?: number;
    flangeThickness?: number;
    webThickness?: number;
    legLength1?: number;
    legLength2?: number;
    legThickness?: number;
    outsideDiameter?: number;
    wallThickness?: number;
  };
}

export interface Material {
  id: string;
  name: string;
  type: "STEEL" | "CONCRETE" | "WOOD" | "ALUMINUM" | "COMPOSITE";
  properties: {
    density: number;
    elasticModulus: number;
    poissonRatio: number;
    yieldStrength: number;
    ultimateStrength: number;
    thermalExpansion?: number;
  };
}

export interface LoadCase {
  id: string;
  name: string;
  type: LoadType;
  loads: Load[];
}

export interface Load {
  id: string;
  type: "POINT" | "DISTRIBUTED" | "MOMENT";
  memberId?: string;
  nodeId?: string;
  direction: "X" | "Y" | "Z" | "RX" | "RY" | "RZ";
  magnitude: number;
  position?: number; // For distributed loads
  startPosition?: number;
  endPosition?: number;
}

export interface Support {
  id: string;
  nodeId: string;
  restraints: {
    dx: boolean;
    dy: boolean;
    dz: boolean;
    rx: boolean;
    ry: boolean;
    rz: boolean;
  };
}

export interface Release {
  id: string;
  memberId: string;
  location: "START" | "END";
  releases: {
    dx: boolean;
    dy: boolean;
    dz: boolean;
    rx: boolean;
    ry: boolean;
    rz: boolean;
  };
}

// Building classification types
export type BuildingType =
  | "SINGLE_GABLE_HANGAR"
  | "DOUBLE_GABLE_HANGAR"
  | "MULTI_GABLE_HANGAR"
  | "ARCH_HANGAR"
  | "TRUSS_SINGLE_GABLE"
  | "TRUSS_DOUBLE_GABLE"
  | "TRUSS_MULTI_GABLE"
  | "RIGID_FRAME_SINGLE_GABLE"
  | "RIGID_FRAME_DOUBLE_GABLE"
  | "RIGID_FRAME_MULTI_GABLE"
  | "MONO_SLOPE_BUILDING"
  | "FLAT_ROOF_BUILDING"
  | "WAREHOUSE_BUILDING"
  | "INDUSTRIAL_BUILDING"
  | "COMMERCIAL_BUILDING"
  | "OFFICE_BUILDING"
  | "RETAIL_BUILDING"
  | "MIXED_USE_BUILDING"
  | "RESIDENTIAL_BUILDING"
  | "EDUCATIONAL_BUILDING"
  | "HEALTHCARE_BUILDING"
  | "RELIGIOUS_BUILDING"
  | "RECREATIONAL_BUILDING"
  | "TRANSPORTATION_BUILDING"
  | "UTILITY_BUILDING"
  | "AGRICULTURAL_BUILDING"
  | "STORAGE_BUILDING"
  | "MANUFACTURING_BUILDING"
  | "ASSEMBLY_BUILDING"
  | "HAZARDOUS_BUILDING"
  | "INSTITUTIONAL_BUILDING"
  | "MERCANTILE_BUILDING"
  | "BUSINESS_BUILDING"
  | "FACTORY_INDUSTRIAL_BUILDING"
  | "HIGH_HAZARD_BUILDING"
  | "STORAGE_MODERATE_HAZARD_BUILDING"
  | "STORAGE_LOW_HAZARD_BUILDING"
  | "UTILITY_MISCELLANEOUS_BUILDING";

// Member tagging types
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
  | "SIGNAGE_POLE"
  | "FOUNDATION_BEAM"
  | "FLOOR_BEAM"
  | "CEILING_BEAM"
  | "GRADE_BEAM"
  | "TRANSFER_BEAM"
  | "SPANDREL_BEAM"
  | "GIRDER"
  | "TIE_BEAM"
  | "COLLAR_BEAM"
  | "RIDGE_BEAM"
  | "HIP_BEAM"
  | "VALLEY_BEAM"
  | "RAFTER_TIE"
  | "TRUSS_TOP_CHORD"
  | "TRUSS_BOTTOM_CHORD"
  | "TRUSS_WEB_MEMBER"
  | "DIAGONAL_BRACE"
  | "X_BRACE"
  | "K_BRACE"
  | "CHEVRON_BRACE"
  | "LATERAL_BRACE"
  | "WIND_BRACE"
  | "SEISMIC_BRACE"
  | "COMPRESSION_STRUT"
  | "TENSION_ROD"
  | "CABLE"
  | "POST"
  | "PIER"
  | "PILE"
  | "LINTEL"
  | "SILL_PLATE"
  | "TOP_PLATE"
  | "STUD"
  | "JOIST"
  | "HANGAR_DOOR_FRAME"
  | "WINDOW_FRAME"
  | "CURTAIN_WALL_MULLION"
  | "CLADDING_SUPPORT"
  | "EQUIPMENT_SUPPORT"
  | "PIPE_SUPPORT"
  | "UTILITY_BEAM"
  | "DEFAULT";

// Load types
export type LoadType =
  | "DEAD"
  | "LIVE"
  | "WIND"
  | "SEISMIC"
  | "SNOW"
  | "CRANE"
  | "THERMAL"
  | "SETTLEMENT"
  | "CONSTRUCTION"
  | "IMPACT"
  | "FATIGUE"
  | "BLAST"
  | "FIRE"
  | "FLOOD"
  | "ICE"
  | "RAIN"
  | "SOIL_PRESSURE"
  | "HYDROSTATIC"
  | "PRESTRESS"
  | "SHRINKAGE"
  | "CREEP"
  | "USER_DEFINED";

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
    boundingBox?: {
      min: { x: number; y: number; z: number };
      max: { x: number; y: number; z: number };
    };
    coordinateSystem?: string;
    origin?: { x: number; y: number; z: number };
  };
  aiDetection?: {
    confidence: number;
    suggestedType: BuildingType;
    memberTags: { [memberId: string]: MemberTag };
    needsReview: boolean;
    reasoning?: string[];
  };
  // STAGED PARSING: Material validation results
  materialValidation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    materialsAssigned: boolean;
    sectionsAssigned: boolean;
    membersWithoutMaterials: string[];
    membersWithoutSections: string[];
  };
  // Enterprise Compliance & Audit Trail
  parsingAccuracy: {
    dimensionalAccuracy: number; // 1:1 match percentage with original file
    sectionAccuracy: number; // AISC database match percentage
    unitsVerified: boolean;
    originalFileHash: string; // For integrity verification
    parsingTimestamp: Date;
    parserVersion: string;
  };
  qualityAssurance?: {
    engineerReview: {
      required: boolean;
      completed: boolean;
      engineerLicense?: string;
      reviewDate?: Date;
      comments?: string;
      digitalSignature?: string;
    };
    complianceChecks: {
      aiscCompliant: boolean;
      asceCompliant: boolean;
      codeVersion: string;
      lastChecked: Date;
    };
  };
}

// Master Control Point (MCP) - Central state management
export interface MasterControlPoint {
  id: string;
  modelId: string;
  modelName: string;
  createdAt: Date;
  lastModified: Date;
  isLocked: boolean;
  confirmedByUser: boolean;

  // Units and System
  units: StructuralModel["units"];
  unitsSystem: "METRIC" | "IMPERIAL";

  // Building Classification
  buildingType: BuildingType;
  buildingTypeConfidence: number;
  aiReasoning: string[];
  manualOverride: boolean;

  // Height Classification
  heightClassification: "LOW_RISE" | "MID_RISE" | "HIGH_RISE";

  // Aspect Ratios
  aspectRatio: {
    H_L: number; // Height to Length
    L_B: number; // Length to Width
  };

  // Structural Properties
  structuralRigidity: "RIGID" | "SEMI_RIGID" | "FLEXIBLE";
  planIrregularity: "REGULAR" | "IRREGULAR";
  verticalIrregularity:
    | "NONE"
    | "SOFT_STORY"
    | "WEAK_STORY"
    | "MASS_IRREGULARITY"
    | "GEOMETRIC_IRREGULARITY";
  diaphragmType: "RIGID" | "SEMI_RIGID" | "FLEXIBLE";

  // Roof Information
  roofType:
    | "FLAT"
    | "GABLE"
    | "HIP"
    | "SHED"
    | "GAMBREL"
    | "MANSARD"
    | "MONO_SLOPE"
    | "ARCH";
  roofSlopeDegrees: number;

  // Frame Configuration
  framesX: number; // Number of frames in X direction
  framesY: number; // Number of frames in Y direction
  baySpacingX: number[]; // Bay spacings in X direction
  baySpacingY: number[]; // Bay spacings in Y direction

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
    roofSlope: number;
    frameCount: number;
    endFrameCount: number;
  };

  // Frame and Bay Details
  frames: {
    id: string;
    type: "MAIN" | "END" | "INTERMEDIATE";
    location: number;
    members: string[];
  }[];

  // Member Tags - Final confirmed tags
  memberTags: {
    memberId: string;
    tag: MemberTag;
    autoTag: MemberTag;
    manualOverride: boolean;
    confidence: number;
  }[];

  // Plate Classifications
  plates: {
    plateId: string;
    classification: "ROOF_DECK" | "FLOOR_DECK" | "WALL_PANEL" | "SHEAR_WALL";
    confidence: number;
  }[];

  // Load Path Analysis
  loadPaths: {
    id: string;
    type: "GRAVITY" | "LATERAL" | "SEISMIC" | "WIND";
    members: string[];
    efficiency: number;
  }[];

  // Machine learning training data
  mlTrainingData: {
    userOverrides: {
      id: string;
      timestamp: Date;
      originalValue: any;
      userValue: any;
      field: string;
      confidence: number;
      engineerLicense?: string;
      auditTrail?: {
        ipAddress: string;
        userAgent: string;
        sessionId: string;
        verificationMethod: "MANUAL" | "DIGITAL_SIGNATURE" | "BIOMETRIC";
      };
      complianceFlags?: {
        aiscCompliant: boolean;
        asceCompliant: boolean;
        qaqcVerified: boolean;
        professionalSeal: boolean;
      };
    }[];
    feedbackScore: number;
  };

  // Validation Status
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    lastValidated: Date;
  };
}
