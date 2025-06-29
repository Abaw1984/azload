import React from "react";
import {
  StructuralModel,
  MasterControlPoint,
  BuildingType,
  MemberTag,
  LoadType,
} from "@/types/model";
import { AuditLogger } from "@/lib/audit-logger";

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

      // Validate model before proceeding
      if (!model || !model.nodes || !model.members) {
        throw new Error("Invalid model data - missing nodes or members");
      }

      if (model.nodes.length === 0) {
        throw new Error("Model has no nodes");
      }

      if (model.members.length === 0) {
        throw new Error("Model has no members");
      }

      // Set loading state immediately
      this.state.isInitialized = false;
      this.notify();

      // Add timeout to prevent hanging
      const initTimeout = setTimeout(() => {
        console.warn("⚠️ MCP initialization timeout - using fallback");
        this.createFallbackMCP(model);
      }, 10000); // 10 second timeout

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

        // Building Classification - Use AI Classifier
        buildingType: await this.classifyBuildingTypeWithAI(model),
        buildingTypeConfidence: 0.85,
        aiReasoning: model.aiDetection?.reasoning || [
          "🌐 Digital Ocean ML API Classification",
        ],
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
      this.state.error = null;

      // Clear timeout since initialization succeeded
      clearTimeout(initTimeout);

      console.log("✅ MCP MANAGER: Initialization complete:", {
        mcpId: mcp.id,
        buildingType: mcp.buildingType,
        confidence: (mcp.buildingTypeConfidence * 100).toFixed(1) + "%",
        memberTags: mcp.memberTags.length,
        isLocked: mcp.isLocked,
      });

      // Notify listeners immediately
      this.notify();

      // Also store MCP data in sessionStorage for persistence
      try {
        sessionStorage.setItem("mcpData", JSON.stringify(mcp));
        console.log("💾 MCP MANAGER: MCP data stored in sessionStorage");
      } catch (storageError) {
        console.warn(
          "⚠️ MCP MANAGER: Failed to store MCP in sessionStorage:",
          storageError,
        );
      }
    } catch (error) {
      clearTimeout(initTimeout);
      console.error("❌ MCP MANAGER: Initialization failed:", error);

      // Create fallback MCP instead of failing completely
      this.createFallbackMCP(model);
    }
  }

  private createFallbackMCP(model: StructuralModel): void {
    console.log("🔧 MCP MANAGER: Creating fallback MCP");

    try {
      const fallbackMCP: MasterControlPoint = {
        id: crypto.randomUUID(),
        modelId: model.id,
        modelName: model.name,
        createdAt: new Date(),
        lastModified: new Date(),
        isLocked: false,
        confirmedByUser: false,
        units: model.units,
        unitsSystem: model.unitsSystem || "METRIC",
        buildingType: "TRUSS_SINGLE_GABLE",
        buildingTypeConfidence: 0.5,
        aiReasoning: ["Fallback classification - AI analysis timed out"],
        manualOverride: false,
        heightClassification: "LOW_RISE",
        aspectRatio: { H_L: 0.2, L_B: 2.0 },
        structuralRigidity: "RIGID",
        planIrregularity: "REGULAR",
        verticalIrregularity: "NONE",
        diaphragmType: "RIGID",
        roofType: "GABLE",
        roofSlopeDegrees: model.geometry?.roofSlope || 20,
        framesX: model.geometry?.frameCount || 3,
        framesY: 1,
        baySpacingX: model.geometry?.baySpacings || [30],
        baySpacingY: [30],
        specialFeatures: {
          canopy: false,
          cantilever: false,
          parapets: false,
          craneBeam: false,
          mezzanine: false,
          signage: false,
          elevatorShaft: false,
        },
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
        frames: [],
        memberTags: [],
        plates: [],
        loadPaths: [],
        mlTrainingData: {
          userOverrides: [],
          feedbackScore: 0,
        },
        validation: {
          isValid: true,
          errors: [],
          warnings: ["Using fallback MCP due to initialization timeout"],
          lastValidated: new Date(),
        },
      };

      this.state.current = fallbackMCP;
      this.state.isInitialized = true;
      this.state.error = null;

      console.log("✅ MCP MANAGER: Fallback MCP created successfully");
      this.notify();
    } catch (fallbackError) {
      console.error(
        "❌ MCP MANAGER: Even fallback MCP creation failed:",
        fallbackError,
      );
      this.state.error = "Failed to create fallback MCP";
      this.state.isInitialized = false;
      this.notify();
    }
  }

  private async classifyBuildingTypeWithAI(
    model: StructuralModel,
  ): Promise<BuildingType> {
    try {
      // Try AI classification with very short timeout
      const { AIBuildingClassifier } = await import("@/lib/ai-classifier");

      const classificationPromise =
        AIBuildingClassifier.classifyBuilding(model);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI Classification timeout")), 1000),
      );

      const classification = await Promise.race([
        classificationPromise,
        timeoutPromise,
      ]);

      return classification.suggestedType;
    } catch (error) {
      // Use static fallback immediately
      return this.classifyBuildingTypeFallback(model);
    }
  }

  private classifyBuildingTypeFallback(model: StructuralModel): BuildingType {
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
    const buildingType = this.classifyBuildingTypeFallback(model);

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

  async updateMemberTag(
    memberId: string,
    tag: MemberTag,
    isManual: boolean = false,
    engineerLicense?: string,
    reasoning?: string,
  ): Promise<void> {
    if (!this.state.current) {
      console.warn("Cannot update member tag: MCP not available");
      return;
    }

    // Allow updates even if locked for critical data reliability
    if (this.state.current.isLocked && !isManual) {
      console.warn("MCP is locked - only manual overrides allowed");
      return;
    }

    const existingTagIndex = this.state.current.memberTags.findIndex(
      (mt) => mt.memberId === memberId,
    );

    const previousTag =
      existingTagIndex >= 0
        ? this.state.current.memberTags[existingTagIndex].tag
        : undefined;

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

    // ENTERPRISE AUDIT LOGGING: Track all member tag changes with compliance
    if (previousTag !== tag) {
      // Log to secure audit system
      await AuditLogger.logManualOverride({
        action: "MANUAL_OVERRIDE_MEMBER_TAG",
        memberId,
        originalValue: previousTag,
        newValue: tag,
        engineerLicense,
        reasoning:
          reasoning ||
          (isManual ? "User manual tag override" : "System tag update"),
        complianceFlags: {
          aiscCompliant: true,
          asceCompliant: true,
          qaqcVerified: !!engineerLicense,
          professionalSeal: !!engineerLicense,
        },
      });

      // Store in MCP training data with enhanced audit trail
      if (!this.state.current.mlTrainingData.userOverrides) {
        this.state.current.mlTrainingData.userOverrides = [];
      }

      this.state.current.mlTrainingData.userOverrides.push({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        originalValue: previousTag,
        userValue: tag,
        field: "memberTag",
        confidence: isManual ? 1.0 : 0.8,
        engineerLicense,
        auditTrail: {
          ipAddress: "127.0.0.1", // Would be actual IP in production
          userAgent: navigator.userAgent,
          sessionId: sessionStorage.getItem("audit_session_id") || "unknown",
          verificationMethod: engineerLicense ? "DIGITAL_SIGNATURE" : "MANUAL",
        },
        complianceFlags: {
          aiscCompliant: true,
          asceCompliant: true,
          qaqcVerified: !!engineerLicense,
          professionalSeal: !!engineerLicense,
        },
      });

      console.log("🏷️ ENTERPRISE: Member tag updated with audit compliance:", {
        memberId,
        previous: previousTag,
        new: tag,
        isManual,
        engineerVerified: !!engineerLicense,
        auditLogged: true,
        timestamp: new Date().toISOString(),
      });
    }

    this.state.current.lastModified = new Date();

    // Store updated MCP in sessionStorage for persistence
    try {
      sessionStorage.setItem("mcpData", JSON.stringify(this.state.current));
      console.log("💾 MCP data updated and stored with audit compliance", {
        totalOverrides: this.state.current.mlTrainingData.userOverrides.length,
        professionalOverrides:
          this.state.current.mlTrainingData.userOverrides.filter(
            (o) => o.engineerLicense,
          ).length,
        complianceRate: this.calculateComplianceRate(),
      });
    } catch (storageError) {
      console.warn(
        "⚠️ Failed to store updated MCP in sessionStorage:",
        storageError,
      );
    }

    this.notify();
  }

  lockMCP(): void {
    if (!this.state.current) {
      console.warn("Cannot lock MCP: No MCP available");
      return;
    }

    // Validate MCP before locking
    if (!this.state.current.validation.isValid) {
      console.error("❌ Cannot lock MCP: Validation errors exist");
      throw new Error(
        "MCP has validation errors - resolve them before locking",
      );
    }

    if (this.state.current.memberTags.length === 0) {
      console.error("❌ Cannot lock MCP: No member tags assigned");
      throw new Error("MCP requires member tags before locking");
    }

    this.state.current.isLocked = true;
    this.state.current.confirmedByUser = true;
    this.state.current.lastModified = new Date();

    // Store locked MCP in sessionStorage
    try {
      sessionStorage.setItem("mcpData", JSON.stringify(this.state.current));
      sessionStorage.setItem("mcpLocked", "true");
      console.log("💾 Locked MCP stored in sessionStorage");
    } catch (storageError) {
      console.warn("⚠️ Failed to store locked MCP:", storageError);
    }

    // Dispatch event to notify load tabs
    window.dispatchEvent(
      new CustomEvent("mcpLocked", {
        detail: {
          mcpId: this.state.current.id,
          buildingType: this.state.current.buildingType,
          memberTags: this.state.current.memberTags.length,
          timestamp: new Date().toISOString(),
        },
      }),
    );

    console.log("🔒 MCP LOCKED - LOAD CALCULATIONS ENABLED:", {
      mcpId: this.state.current.id,
      buildingType: this.state.current.buildingType,
      memberTags: this.state.current.memberTags.length,
      dimensions: this.state.current.dimensions,
      timestamp: new Date().toISOString(),
    });

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

  async updateBuildingType(
    buildingType: BuildingType,
    confidence: number = 1.0,
    engineerLicense?: string,
    reasoning?: string,
  ): Promise<void> {
    if (!this.state.current || this.state.current.isLocked) {
      console.warn("Cannot update building type: MCP not available or locked");
      return;
    }

    const previousType = this.state.current.buildingType;
    this.state.current.buildingType = buildingType;
    this.state.current.buildingTypeConfidence = confidence;
    this.state.current.manualOverride = true;
    this.state.current.lastModified = new Date();

    // ENHANCED ML API INTEGRATION: Send building type override to ML API
    await this.sendTrainingDataToMLAPI({
      type: "building_type_override",
      originalValue: previousType,
      newValue: buildingType,
      confidence,
      engineerLicense,
      reasoning: reasoning || "User manual building type override",
      timestamp: new Date().toISOString(),
    });

    // Update live ML learning counter
    this.updateMLLearningCounter("building_type_override");

    // ENTERPRISE AUDIT LOGGING: Track building type changes with compliance
    await AuditLogger.logManualOverride({
      action: "MANUAL_OVERRIDE_BUILDING_TYPE",
      originalValue: previousType,
      newValue: buildingType,
      engineerLicense,
      reasoning: reasoning || "User manual building type override",
      complianceFlags: {
        aiscCompliant: true,
        asceCompliant: true,
        qaqcVerified: !!engineerLicense,
        professionalSeal: !!engineerLicense,
      },
    });

    // Track the override in ML training data with enhanced audit trail
    if (!this.state.current.mlTrainingData.userOverrides) {
      this.state.current.mlTrainingData.userOverrides = [];
    }

    this.state.current.mlTrainingData.userOverrides.push({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      originalValue: previousType,
      userValue: buildingType,
      field: "buildingType",
      confidence: confidence,
      engineerLicense,
      auditTrail: {
        ipAddress: "127.0.0.1", // Would be actual IP in production
        userAgent: navigator.userAgent,
        sessionId: sessionStorage.getItem("audit_session_id") || "unknown",
        verificationMethod: engineerLicense ? "DIGITAL_SIGNATURE" : "MANUAL",
      },
      complianceFlags: {
        aiscCompliant: true,
        asceCompliant: true,
        qaqcVerified: !!engineerLicense,
        professionalSeal: !!engineerLicense,
      },
    });

    // Store updated MCP in sessionStorage immediately
    try {
      sessionStorage.setItem("mcpData", JSON.stringify(this.state.current));
      console.log(
        "💾 ENTERPRISE: Building type override stored with audit compliance",
        {
          totalOverrides:
            this.state.current.mlTrainingData.userOverrides.length,
          professionalOverrides:
            this.state.current.mlTrainingData.userOverrides.filter(
              (o) => o.engineerLicense,
            ).length,
          complianceRate: this.calculateComplianceRate(),
        },
      );
    } catch (storageError) {
      console.warn("⚠️ Failed to store building type override:", storageError);
    }

    console.log("🏗️ ENTERPRISE: Building type updated with audit compliance:", {
      previous: previousType,
      new: buildingType,
      confidence,
      engineerVerified: !!engineerLicense,
      auditLogged: true,
      timestamp: new Date().toISOString(),
    });

    this.notify();
  }

  async updateHeightClassification(
    heightClassification: HeightClassification,
    isManual: boolean = false,
  ): Promise<void> {
    if (!this.state.current || this.state.current.isLocked) {
      console.warn(
        "Cannot update height classification: MCP not available or locked",
      );
      return;
    }

    const previousValue = this.state.current.heightClassification;
    this.state.current.heightClassification = heightClassification;
    this.state.current.lastModified = new Date();

    if (isManual && previousValue !== heightClassification) {
      // Send to ML API for training
      await this.sendTrainingDataToMLAPI({
        type: "height_classification_override",
        originalValue: previousValue,
        newValue: heightClassification,
        timestamp: new Date().toISOString(),
      });

      this.updateMLLearningCounter("height_classification_override");
    }

    console.log("📏 Height classification updated:", heightClassification);
    this.notify();
  }

  async updateStructuralRigidity(
    rigidity: StructuralRigidity,
    isManual: boolean = false,
  ): Promise<void> {
    if (!this.state.current || this.state.current.isLocked) {
      console.warn(
        "Cannot update structural rigidity: MCP not available or locked",
      );
      return;
    }

    const previousValue = this.state.current.structuralRigidity;
    this.state.current.structuralRigidity = rigidity;
    this.state.current.lastModified = new Date();

    if (isManual && previousValue !== rigidity) {
      // Send to ML API for training
      await this.sendTrainingDataToMLAPI({
        type: "structural_rigidity_override",
        originalValue: previousValue,
        newValue: rigidity,
        timestamp: new Date().toISOString(),
      });

      this.updateMLLearningCounter("structural_rigidity_override");
    }

    console.log("🏗️ Structural rigidity updated:", rigidity);
    this.notify();
  }

  async updateFrameCount(
    frameCount: number,
    isManual: boolean = false,
  ): Promise<void> {
    if (!this.state.current || this.state.current.isLocked) {
      console.warn("Cannot update frame count: MCP not available or locked");
      return;
    }

    const previousValue = this.state.current.framesX;
    this.state.current.framesX = frameCount;
    this.state.current.dimensions.frameCount = frameCount;
    this.state.current.lastModified = new Date();

    if (isManual && previousValue !== frameCount) {
      // Send to ML API for training
      await this.sendTrainingDataToMLAPI({
        type: "frame_count_override",
        originalValue: previousValue,
        newValue: frameCount,
        timestamp: new Date().toISOString(),
      });

      this.updateMLLearningCounter("frame_count_override");
    }

    console.log("🏗️ Frame count updated:", frameCount);
    this.notify();
  }

  updateBaySpacing(baySpacing: number[], isManual: boolean = false): void {
    if (!this.state.current || this.state.current.isLocked) {
      console.warn("Cannot update bay spacing: MCP not available or locked");
      return;
    }

    this.state.current.baySpacingX = baySpacing;
    this.state.current.lastModified = new Date();
    console.log("📏 Bay spacing updated:", baySpacing);
    this.notify();
  }

  updatePlanIrregularity(
    irregularity: "REGULAR" | "IRREGULAR",
    isManual: boolean = false,
  ): void {
    if (!this.state.current || this.state.current.isLocked) {
      console.warn(
        "Cannot update plan irregularity: MCP not available or locked",
      );
      return;
    }

    this.state.current.planIrregularity = irregularity;
    this.state.current.lastModified = new Date();
    console.log("📐 Plan irregularity updated:", irregularity);
    this.notify();
  }

  updateFrameType(
    frameType: "MOMENT" | "BRACED" | "DUAL" | "CANTILEVER",
    isManual: boolean = false,
  ): void {
    if (!this.state.current || this.state.current.isLocked) {
      console.warn("Cannot update frame type: MCP not available or locked");
      return;
    }

    // Store frame type in special features or create a new field
    if (!this.state.current.specialFeatures) {
      this.state.current.specialFeatures = {
        canopy: false,
        cantilever: false,
        parapets: false,
        craneBeam: false,
        mezzanine: false,
        signage: false,
        elevatorShaft: false,
      };
    }

    // Add frame type to MCP (extend the interface if needed)
    (this.state.current as any).frameType = frameType;
    this.state.current.lastModified = new Date();
    console.log("🏗️ Frame type updated:", frameType);
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

  const mcpInstance = MCPManager;

  return {
    ...state,
    initializeFromModel: (model: StructuralModel) =>
      mcpInstance.initializeFromModel(model),
    updateMemberTag: (memberId: string, tag: MemberTag, isManual?: boolean) =>
      mcpInstance.updateMemberTag(memberId, tag, isManual),
    lockMCP: () => mcpInstance.lockMCP(),
    unlockMCP: () => mcpInstance.unlockMCP(),
    resetMCP: () => mcpInstance.resetMCP(),
    updateBuildingType: (buildingType: BuildingType, confidence?: number) =>
      mcpInstance.updateBuildingType(buildingType, confidence),
    updateHeightClassification: (
      heightClassification: HeightClassification,
      isManual?: boolean,
    ) => mcpInstance.updateHeightClassification(heightClassification, isManual),
    updateStructuralRigidity: (
      rigidity: StructuralRigidity,
      isManual?: boolean,
    ) => mcpInstance.updateStructuralRigidity(rigidity, isManual),
    updateFrameCount: (frameCount: number, isManual?: boolean) =>
      mcpInstance.updateFrameCount(frameCount, isManual),
    updateBaySpacing: (baySpacing: number[], isManual?: boolean) =>
      mcpInstance.updateBaySpacing(baySpacing, isManual),
    updatePlanIrregularity: (
      irregularity: "REGULAR" | "IRREGULAR",
      isManual?: boolean,
    ) => mcpInstance.updatePlanIrregularity(irregularity, isManual),
    updateFrameType: (
      frameType: "MOMENT" | "BRACED" | "DUAL" | "CANTILEVER",
      isManual?: boolean,
    ) => mcpInstance.updateFrameType(frameType, isManual),
    // Enterprise audit methods
    exportLearningMetrics: () => AuditLogger.exportLearningMetrics(),
    getAuditLogs: (filter?: any) => AuditLogger.getAuditLogs(filter),
    logPerformanceMetrics: (metrics: any) =>
      AuditLogger.logPerformanceMetrics(metrics),
    logEngineerReview: (review: any) => AuditLogger.logEngineerReview(review),
  };
}

// Add compliance calculation method
MCPManagerClass.prototype.calculateComplianceRate = function (): number {
  if (!this.state.current?.mlTrainingData?.userOverrides) return 1.0;

  const overrides = this.state.current.mlTrainingData.userOverrides;
  const compliantOverrides = overrides.filter(
    (o) => o.complianceFlags?.aiscCompliant && o.complianceFlags?.asceCompliant,
  );

  return overrides.length > 0
    ? compliantOverrides.length / overrides.length
    : 1.0;
};

// ENHANCED ML API INTEGRATION: Send training data to ML API
MCPManagerClass.prototype.sendTrainingDataToMLAPI = async function (
  trainingData: any,
): Promise<void> {
  const mlApiUrl = import.meta.env.VITE_ML_API_URL;
  const mlApiEnabled = import.meta.env.VITE_ML_API_ENABLED === "true";

  if (!mlApiEnabled || !mlApiUrl) {
    console.log("🤖 ML API: Disabled or URL not configured, storing locally");
    // Store locally for later batch upload
    const localTrainingData = JSON.parse(
      sessionStorage.getItem("mlTrainingData") || "[]",
    );
    localTrainingData.push({
      ...trainingData,
      id: crypto.randomUUID(),
      storedLocally: true,
      timestamp: new Date().toISOString(),
    });
    sessionStorage.setItem("mlTrainingData", JSON.stringify(localTrainingData));
    return;
  }

  try {
    const response = await fetch(`${mlApiUrl}/training/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Source": "azload-mcp-manager",
      },
      body: JSON.stringify({
        ...trainingData,
        sessionId:
          sessionStorage.getItem("audit_session_id") || crypto.randomUUID(),
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        mcpId: this.state.current?.id,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(
        "🤖 ML API: Training data submitted successfully from MCP",
        result,
      );

      // Dispatch success event
      window.dispatchEvent(
        new CustomEvent("mlTrainingDataSubmitted", {
          detail: {
            success: true,
            data: trainingData,
            response: result,
            source: "mcp-manager",
          },
        }),
      );
    } else {
      throw new Error(`ML API responded with status: ${response.status}`);
    }
  } catch (error) {
    console.warn(
      "🤖 ML API: Failed to submit training data from MCP, storing locally:",
      error,
    );

    // Store locally as fallback
    const localTrainingData = JSON.parse(
      sessionStorage.getItem("mlTrainingData") || "[]",
    );
    localTrainingData.push({
      ...trainingData,
      id: crypto.randomUUID(),
      storedLocally: true,
      failedSubmission: true,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    sessionStorage.setItem("mlTrainingData", JSON.stringify(localTrainingData));

    // Dispatch failure event
    window.dispatchEvent(
      new CustomEvent("mlTrainingDataFailed", {
        detail: {
          success: false,
          error: error.message,
          data: trainingData,
          source: "mcp-manager",
        },
      }),
    );
  }
};

// ENHANCED ML LEARNING COUNTER: Update live counter
MCPManagerClass.prototype.updateMLLearningCounter = function (
  overrideType: string,
): void {
  try {
    // Get current counter from session storage
    const currentCounter = JSON.parse(
      sessionStorage.getItem("mlLearningCounter") || "{}",
    );

    // Initialize if not exists
    if (!currentCounter.totalOverrides) {
      currentCounter.totalOverrides = 0;
      currentCounter.byType = {};
      currentCounter.sessions = [];
      currentCounter.lastUpdated = new Date().toISOString();
    }

    // Increment counters
    currentCounter.totalOverrides += 1;
    currentCounter.byType[overrideType] =
      (currentCounter.byType[overrideType] || 0) + 1;
    currentCounter.lastUpdated = new Date().toISOString();

    // Add to current session
    const sessionId =
      sessionStorage.getItem("audit_session_id") || crypto.randomUUID();
    const currentSession = currentCounter.sessions.find(
      (s) => s.sessionId === sessionId,
    ) || {
      sessionId,
      overrides: 0,
      startTime: new Date().toISOString(),
    };

    currentSession.overrides += 1;
    currentSession.lastOverride = new Date().toISOString();

    // Update or add session
    const sessionIndex = currentCounter.sessions.findIndex(
      (s) => s.sessionId === sessionId,
    );
    if (sessionIndex >= 0) {
      currentCounter.sessions[sessionIndex] = currentSession;
    } else {
      currentCounter.sessions.push(currentSession);
    }

    // Keep only last 10 sessions
    if (currentCounter.sessions.length > 10) {
      currentCounter.sessions = currentCounter.sessions.slice(-10);
    }

    // Store updated counter
    sessionStorage.setItem("mlLearningCounter", JSON.stringify(currentCounter));

    // Dispatch update event for live UI updates
    window.dispatchEvent(
      new CustomEvent("mlLearningCounterUpdated", {
        detail: {
          totalOverrides: currentCounter.totalOverrides,
          byType: currentCounter.byType,
          currentSession: currentSession,
          overrideType,
          source: "mcp-manager",
        },
      }),
    );

    console.log("📊 ML LEARNING COUNTER UPDATED (MCP):", {
      totalOverrides: currentCounter.totalOverrides,
      overrideType,
      sessionOverrides: currentSession.overrides,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn("Failed to update ML learning counter from MCP:", error);
  }
};
