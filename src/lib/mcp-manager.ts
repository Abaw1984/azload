import React from "react";
import {
  StructuralModel,
  MasterControlPoint,
  BuildingType,
  MemberTag,
  LoadType,
} from "@/types/model";

// Additional types needed for MCP that aren't in the main types
export type HeightClassification = "LOW_RISE" | "MID_RISE" | "HIGH_RISE";
export type StructuralRigidity = "RIGID" | "SEMI_RIGID" | "FLEXIBLE";
export type RoofType = "FLAT" | "LOW_SLOPE" | "MEDIUM_SLOPE" | "STEEP_SLOPE";
export type UnitsSystem = "METRIC" | "IMPERIAL";

// MCP-specific member tagging interface
export interface MemberTagging {
  memberId: string;
  tag: MemberTag;
  confidence: number;
  isManualOverride: boolean;
  createdAt: Date;
}

/**
 * Master Control Point (MCP) Manager
 * Centralized state management for structural model analysis
 */
class MCPManagerClass {
  private static instance: MCPManagerClass;
  private state: {
    current: MasterControlPoint | null;
    isInitialized: boolean;
    error: string | null;
  } = {
    current: null,
    isInitialized: false,
    error: null,
  };

  private listeners: Set<() => void> = new Set();

  private constructor() {}

  static getInstance(): MCPManagerClass {
    if (!MCPManagerClass.instance) {
      MCPManagerClass.instance = new MCPManagerClass();
    }
    return MCPManagerClass.instance;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  getState() {
    return { ...this.state };
  }

  async initializeFromModel(model: StructuralModel): Promise<void> {
    console.log("🤖 MCP MANAGER: Initializing from model...", {
      modelName: model.name,
      nodes: model.nodes?.length || 0,
      members: model.members?.length || 0,
      timestamp: new Date().toISOString(),
    });

    try {
      this.state.error = null;

      // Create MCP from model data - matching the actual interface
      const mcp: MasterControlPoint = {
        id: crypto.randomUUID(),
        modelId: model.id,
        modelName: model.name,
        createdAt: new Date(),
        lastModified: new Date(),
        isLocked: false,
        confirmedByUser: false,

        // Units - must match parsed model units
        units: model.units,
        unitsSystem: model.unitsSystem || "METRIC",

        // Building Classification
        buildingType: this.classifyBuildingType(model),
        buildingTypeConfidence: 0.85,
        aiReasoning: ["Automated classification based on geometry analysis"],
        manualOverride: false,

        // Height Classification
        heightClassification:
          this.classifyHeight(model) === "HIGH_RISE" ? "HIGH_RISE" : "LOW_RISE",

        // Aspect Ratios
        aspectRatio: {
          H_L:
            (model.geometry?.totalHeight || 0) /
            (model.geometry?.buildingLength || 1),
          L_B:
            (model.geometry?.buildingLength || 0) /
            (model.geometry?.buildingWidth || 1),
        },

        // Structural Properties
        structuralRigidity: this.classifyRigidity(model),
        planIrregularity: "REGULAR",
        verticalIrregularity: "NONE",
        diaphragmType: "RIGID",

        // Roof Information
        roofType: this.classifyRoofTypeForMCP(model),
        roofSlopeDegrees: model.geometry?.roofSlope || 0,

        // Frame Configuration
        framesX: model.geometry?.frameCount || 1,
        framesY: 1,
        baySpacingX: model.geometry?.baySpacings || [30],
        baySpacingY: [30],

        // Special Features Detection
        specialFeatures: {
          canopy: false,
          cantilever: false,
          parapets: false,
          craneBeam: false,
          mezzanine: false,
          signage: false,
          elevatorShaft: false,
        },

        // Geometry Dimensions (Legacy - kept for compatibility)
        dimensions: {
          eaveHeight: model.geometry?.eaveHeight || 0,
          roofMeanHeight: model.geometry?.meanRoofHeight || 0,
          totalHeight: model.geometry?.totalHeight || 0,
          buildingLength: model.geometry?.buildingLength || 0,
          buildingWidth: model.geometry?.buildingWidth || 0,
          roofSlope: model.geometry?.roofSlope || 0,
          frameCount: model.geometry?.frameCount || 0,
          endFrameCount: model.geometry?.endFrameCount || 2,
        },

        // Frame and Bay Details
        frames: [],

        // Member Tags - Final confirmed tags
        memberTags: this.generateMemberTagsForMCP(model),

        // Plate Classifications
        plates: [],

        // Load Path Analysis
        loadPaths: [],

        // Machine learning training data
        mlTrainingData: {
          userOverrides: [],
          feedbackScore: 0,
        },

        // Validation Status
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          lastValidated: new Date(),
        },
      };

      this.state.current = mcp;
      this.state.isInitialized = true;

      console.log("✅ MCP MANAGER: Initialization complete:", {
        mcpId: mcp.id,
        buildingType: mcp.buildingType,
        confidence: (mcp.buildingTypeConfidence * 100).toFixed(1) + "%",
        memberTags: mcp.memberTags.length,
        isLocked: mcp.isLocked,
      });

      this.notify();
    } catch (error) {
      console.error("❌ MCP MANAGER: Initialization failed:", error);
      this.state.error =
        error instanceof Error ? error.message : "Unknown error";
      this.state.isInitialized = false;
      this.notify();
      throw error;
    }
  }

  private classifyBuildingType(model: StructuralModel): BuildingType {
    const geometry = model.geometry;
    if (!geometry) return "TRUSS_SINGLE_GABLE";

    const aspectRatio = geometry.buildingLength / geometry.buildingWidth;
    const roofSlope = geometry.roofSlope || 0;

    if (roofSlope > 15 && aspectRatio > 2) {
      return "SINGLE_GABLE_HANGAR";
    } else if (roofSlope > 10) {
      return "TRUSS_SINGLE_GABLE";
    } else if (roofSlope < 5) {
      return "FLAT_ROOF_BUILDING";
    }

    return "TRUSS_SINGLE_GABLE";
  }

  private classifyHeight(model: StructuralModel): HeightClassification {
    const height = model.geometry?.totalHeight || 0;
    const units = model.unitsSystem;

    if (units === "IMPERIAL") {
      return height > 720
        ? "HIGH_RISE"
        : height > 360
          ? "MID_RISE"
          : "LOW_RISE";
    } else {
      return height > 200
        ? "HIGH_RISE"
        : height > 100
          ? "MID_RISE"
          : "LOW_RISE";
    }
  }

  private classifyRigidity(model: StructuralModel): StructuralRigidity {
    const memberCount = model.members?.length || 0;
    const nodeCount = model.nodes?.length || 0;
    const ratio = memberCount / Math.max(nodeCount, 1);

    return ratio > 1.5 ? "RIGID" : ratio > 1.0 ? "SEMI_RIGID" : "FLEXIBLE";
  }

  private classifyRoofType(model: StructuralModel): RoofType {
    const roofSlope = model.geometry?.roofSlope || 0;

    if (roofSlope < 2) return "FLAT";
    if (roofSlope < 15) return "LOW_SLOPE";
    if (roofSlope < 30) return "MEDIUM_SLOPE";
    return "STEEP_SLOPE";
  }

  private classifyRoofTypeForMCP(
    model: StructuralModel,
  ): MasterControlPoint["roofType"] {
    const roofSlope = model.geometry?.roofSlope || 0;
    const buildingType = this.classifyBuildingType(model);

    if (roofSlope < 2) return "FLAT";
    if (buildingType.includes("GABLE")) return "GABLE";
    if (buildingType.includes("MONO")) return "MONO_SLOPE";
    return "GABLE";
  }

  private generateMemberTags(model: StructuralModel): MemberTagging[] {
    const tags: MemberTagging[] = [];
    const members = model.members || [];
    const nodes = model.nodes || [];

    members.forEach((member) => {
      const startNode = nodes.find((n) => n.id === member.startNodeId);
      const endNode = nodes.find((n) => n.id === member.endNodeId);

      if (!startNode || !endNode) return;

      let tag: MemberTag = "DEFAULT";

      // Simple classification based on member orientation
      const isVertical =
        Math.abs(endNode.y - startNode.y) > Math.abs(endNode.x - startNode.x);
      const isHorizontal =
        Math.abs(endNode.x - startNode.x) > Math.abs(endNode.y - startNode.y);

      if (isVertical) {
        tag = "MAIN_FRAME_COLUMN";
      } else if (isHorizontal) {
        tag = "MAIN_FRAME_RAFTER";
      }

      tags.push({
        memberId: member.id,
        tag,
        confidence: 0.7,
        isManualOverride: false,
        createdAt: new Date(),
      });
    });

    return tags;
  }

  private generateMemberTagsForMCP(
    model: StructuralModel,
  ): MasterControlPoint["memberTags"] {
    const tags: MasterControlPoint["memberTags"] = [];
    const members = model.members || [];
    const nodes = model.nodes || [];

    members.forEach((member) => {
      const startNode = nodes.find((n) => n.id === member.startNodeId);
      const endNode = nodes.find((n) => n.id === member.endNodeId);

      if (!startNode || !endNode) return;

      let tag: MemberTag = "DEFAULT";

      // Simple classification based on member orientation
      const isVertical =
        Math.abs(endNode.y - startNode.y) > Math.abs(endNode.x - startNode.x);
      const isHorizontal =
        Math.abs(endNode.x - startNode.x) > Math.abs(endNode.y - startNode.y);

      if (isVertical) {
        tag = "MAIN_FRAME_COLUMN";
      } else if (isHorizontal) {
        tag = "MAIN_FRAME_RAFTER";
      }

      tags.push({
        memberId: member.id,
        tag,
        autoTag: tag,
        manualOverride: false,
        confidence: 0.7,
      });
    });

    return tags;
  }

  updateMemberTag(
    memberId: string,
    tag: MemberTag,
    isManual: boolean = false,
  ): void {
    if (!this.state.current || this.state.current.isLocked) {
      console.warn("Cannot update member tag: MCP not available or locked");
      return;
    }

    const existingTagIndex = this.state.current.memberTags.findIndex(
      (mt) => mt.memberId === memberId,
    );

    const newTag: MasterControlPoint["memberTags"][0] = {
      memberId,
      tag,
      autoTag: tag,
      manualOverride: isManual,
      confidence: isManual ? 1.0 : 0.8,
    };

    if (existingTagIndex >= 0) {
      this.state.current.memberTags[existingTagIndex] = newTag;
    } else {
      this.state.current.memberTags.push(newTag);
    }

    this.state.current.lastModified = new Date();
    this.notify();
  }

  lockMCP(): void {
    if (!this.state.current) {
      console.warn("Cannot lock MCP: No MCP available");
      return;
    }

    this.state.current.isLocked = true;
    this.state.current.lastModified = new Date();
    console.log("🔒 MCP LOCKED:", this.state.current.id);
    this.notify();
  }

  unlockMCP(): void {
    if (!this.state.current) {
      console.warn("Cannot unlock MCP: No MCP available");
      return;
    }

    this.state.current.isLocked = false;
    this.state.current.lastModified = new Date();
    console.log("🔓 MCP UNLOCKED:", this.state.current.id);
    this.notify();
  }

  resetMCP(): void {
    this.state.current = null;
    this.state.isInitialized = false;
    this.state.error = null;
    console.log("🔄 MCP RESET");
    this.notify();
  }

  updateBuildingType(
    buildingType: BuildingType,
    confidence: number = 1.0,
  ): void {
    if (!this.state.current || this.state.current.isLocked) {
      console.warn("Cannot update building type: MCP not available or locked");
      return;
    }

    this.state.current.buildingType = buildingType;
    this.state.current.buildingTypeConfidence = confidence;
    this.state.current.lastModified = new Date();
    console.log("🏗️ Building type updated:", buildingType);
    this.notify();
  }
}

// Export singleton instance
export const MCPManager = MCPManagerClass.getInstance();

// React hook for using MCP state
export function useMCP() {
  const [state, setState] = React.useState(() => MCPManager.getState());

  React.useEffect(() => {
    const unsubscribe = MCPManager.subscribe(() => {
      setState(MCPManager.getState());
    });
    return unsubscribe;
  }, []);

  return {
    ...state,
    initializeFromModel: MCPManager.initializeFromModel.bind(MCPManager),
    updateMemberTag: MCPManager.updateMemberTag.bind(MCPManager),
    lockMCP: MCPManager.lockMCP.bind(MCPManager),
    unlockMCP: MCPManager.unlockMCP.bind(MCPManager),
    resetMCP: MCPManager.resetMCP.bind(MCPManager),
    updateBuildingType: MCPManager.updateBuildingType.bind(MCPManager),
  };
}
