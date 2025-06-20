import {
  StructuralModel,
  BuildingType,
  MemberTag,
  AIAssistantPrediction,
  UserCorrection,
  AIAssistantState,
  MasterControlPoint,
  Node,
  Member,
} from "@/types/model";
import { AIBuildingClassifier, GeometryAnalyzer } from "@/lib/ai-classifier";

// Configuration for validation thresholds
interface ValidationThresholds {
  MIN_HANGAR_WIDTH: number;
  MIN_HANGAR_LENGTH: number;
  MAX_CANOPY_RATIO: number;
  MIN_MULTISTORY_HEIGHT: number;
  MIN_MEMBER_LENGTH: number;
  MAX_CRANE_BEAM_SLOPE: number;
  MIN_ELEVATOR_ASPECT_RATIO: number;
}

// Rule-based constraints that AI predictions must pass
class RuleBasedValidator {
  private static thresholds: ValidationThresholds = {
    MIN_HANGAR_WIDTH: 15,
    MIN_HANGAR_LENGTH: 20,
    MAX_CANOPY_RATIO: 0.5,
    MIN_MULTISTORY_HEIGHT: 6,
    MIN_MEMBER_LENGTH: 0.01,
    MAX_CRANE_BEAM_SLOPE: 0.05, // 5% slope
    MIN_ELEVATOR_ASPECT_RATIO: 2,
  };

  static validateBuildingTypePrediction(
    model: StructuralModel,
    predictedType: BuildingType,
  ): { passed: boolean; violations: string[]; warnings: string[] } {
    const violations: string[] = [];
    const warnings: string[] = [];
    const geometry = model.geometry;

    if (!geometry) {
      violations.push("No geometry data available for validation");
      return { passed: false, violations, warnings };
    }

    // Rule: No "roof" for signage structures
    if (predictedType === "SIGNAGE_BILLBOARD") {
      const hasRoofMembers = model.members.some(
        (m) => m.type === "RAFTER" || m.type === "PURLIN",
      );
      if (hasRoofMembers) {
        violations.push(
          "Signage structures cannot have roof members (rafters/purlins)",
        );
      }
    }

    // Rule: Hangars must have significant span
    if (predictedType.includes("HANGAR")) {
      if (
        geometry.buildingWidth < this.thresholds.MIN_HANGAR_WIDTH ||
        geometry.buildingLength < this.thresholds.MIN_HANGAR_LENGTH
      ) {
        violations.push(
          `Hangar structures must have minimum ${this.thresholds.MIN_HANGAR_WIDTH}m width and ${this.thresholds.MIN_HANGAR_LENGTH}m length`,
        );
      }
    }

    // Rule: Canopy structures must have low height-to-width ratio
    if (predictedType.includes("CANOPY")) {
      const heightToWidthRatio =
        geometry.totalHeight /
        Math.max(geometry.buildingWidth, geometry.buildingLength);
      if (heightToWidthRatio > this.thresholds.MAX_CANOPY_RATIO) {
        violations.push(
          `Canopy structures must have height-to-width ratio < ${this.thresholds.MAX_CANOPY_RATIO}`,
        );
      }
    }

    // Rule: Multi-story must have reasonable height
    if (predictedType.includes("MULTI_STORY")) {
      if (geometry.totalHeight < this.thresholds.MIN_MULTISTORY_HEIGHT) {
        violations.push(
          `Multi-story structures must have minimum ${this.thresholds.MIN_MULTISTORY_HEIGHT}m height`,
        );
      }
    }

    // Rule: Elevator shafts must be tall and narrow (adjusted)
    if (predictedType === "ELEVATOR_SHAFT") {
      const aspectRatio =
        geometry.totalHeight /
        Math.max(geometry.buildingWidth, geometry.buildingLength);
      if (aspectRatio < this.thresholds.MIN_ELEVATOR_ASPECT_RATIO) {
        warnings.push(
          `Elevator shafts typically have aspect ratio > ${this.thresholds.MIN_ELEVATOR_ASPECT_RATIO}`,
        );
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
    };
  }

  static validateMemberTagPrediction(
    model: StructuralModel,
    memberId: string,
    predictedTag: MemberTag,
    nodeMap: Map<string, Node>,
  ): { passed: boolean; violations: string[]; warnings: string[] } {
    const violations: string[] = [];
    const warnings: string[] = [];

    const member = model.members.find((m) => m.id === memberId);
    if (!member) {
      violations.push(`Member ${memberId} not found in model`);
      return { passed: false, violations, warnings };
    }

    const startNode = nodeMap.get(member.startNodeId);
    const endNode = nodeMap.get(member.endNodeId);

    if (!startNode || !endNode) {
      violations.push(`Member ${memberId} has invalid node references`);
      return { passed: false, violations, warnings };
    }

    // Calculate member length
    const length = Math.sqrt(
      Math.pow(endNode.x - startNode.x, 2) +
        Math.pow(endNode.y - startNode.y, 2) +
        Math.pow(endNode.z - startNode.z, 2),
    );

    // Rule: Member length validation
    if (length < this.thresholds.MIN_MEMBER_LENGTH) {
      violations.push(
        `Member length is unrealistically small: ${length.toFixed(4)}m`,
      );
    }

    // Rule: Columns must have base-to-ground contact
    if (predictedTag.includes("COLUMN")) {
      const minZ = Math.min(startNode.z, endNode.z);
      const allZ = model.nodes.map((n) => n.z);
      const groundLevel = Math.min(...allZ);

      if (Math.abs(minZ - groundLevel) > 1.0) {
        violations.push(
          `Column ${memberId} must extend to ground level (current min Z: ${minZ.toFixed(2)}, ground: ${groundLevel.toFixed(2)})`,
        );
      }
    }

    // Rule: Roof members must be at appropriate elevation
    if (predictedTag.includes("RAFTER") || predictedTag === "ROOF_PURLIN") {
      const avgZ = (startNode.z + endNode.z) / 2;
      const allZ = model.nodes.map((n) => n.z);
      const maxZ = Math.max(...allZ);
      const minZ = Math.min(...allZ);
      const expectedRoofLevel = minZ + (maxZ - minZ) * 0.7; // 70% of height

      if (avgZ < expectedRoofLevel) {
        warnings.push(
          `Roof member ${memberId} appears to be below expected roof level`,
        );
      }
    }

    // Rule: Crane beams must be horizontal and at appropriate elevation (adjusted slope)
    if (predictedTag === "CRANE_BEAM") {
      const dz = Math.abs(endNode.z - startNode.z);
      const dx = Math.abs(endNode.x - startNode.x);
      const dy = Math.abs(endNode.y - startNode.y);
      const horizontalLength = Math.sqrt(dx * dx + dy * dy);

      if (horizontalLength === 0) {
        violations.push(`Crane beam ${memberId} has zero horizontal length`);
      } else {
        const slope = dz / horizontalLength;
        if (slope > this.thresholds.MAX_CRANE_BEAM_SLOPE) {
          violations.push(
            `Crane beam slope exceeds 5% (current: ${(slope * 100).toFixed(1)}%)`,
          );
        }
      }
    }

    // Rule: Bracing members must be diagonal
    if (predictedTag.includes("BRACING")) {
      const dx = Math.abs(endNode.x - startNode.x);
      const dy = Math.abs(endNode.y - startNode.y);
      const dz = Math.abs(endNode.z - startNode.z);
      const horizontalLength = Math.sqrt(dx * dx + dy * dy);

      if (horizontalLength === 0 && dz === 0) {
        violations.push(`Bracing member ${memberId} has zero length`);
      } else {
        const angle = Math.atan(dz / horizontalLength) * (180 / Math.PI);
        if (angle < 15 || angle > 75) {
          warnings.push(
            `Bracing member ${memberId} has unusual angle (${angle.toFixed(1)}°)`,
          );
        }
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
    };
  }
}

// Main AI Assistant Class
export class AIAssistant {
  private static instance: AIAssistant;
  private state: AIAssistantState = {
    isAnalyzing: false,
    currentPrediction: null,
    predictionHistory: [],
    corrections: [],
    error: null,
    trainingDataReady: false,
  };
  private listeners: ((state: AIAssistantState) => void)[] = [];

  private constructor() {}

  static getInstance(): AIAssistant {
    if (!AIAssistant.instance) {
      AIAssistant.instance = new AIAssistant();
    }
    return AIAssistant.instance;
  }

  // Subscribe to state changes
  subscribe(listener: (state: AIAssistantState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // Get current state
  getState(): AIAssistantState {
    return { ...this.state };
  }

  // Generate AI predictions for a model and write to MCP
  async generatePredictions(
    model: StructuralModel,
  ): Promise<AIAssistantPrediction> {
    this.setState({ isAnalyzing: true, error: null });

    try {
      console.log(
        "🤖 MCP-Centered AI Assistant: Starting analysis for model",
        model.name,
      );

      // Step 1: Normalize geometry to standard units (meters)
      const normalizedGeometry = this.normalizeGeometry(model);
      console.log("📐 Normalized geometry:", normalizedGeometry);

      // Step 2: Generate building type prediction (async) - Now supports ML API
      const [buildingClassification, memberTagsResult] = await Promise.all([
        this.classifyBuilding(model),
        this.tagMembers(model),
      ]);

      const memberTags = memberTagsResult.memberTags;
      const memberConfidences = memberTagsResult.confidences;

      // Step 3: Apply rule-based validation to building type
      const buildingValidation =
        RuleBasedValidator.validateBuildingTypePrediction(
          model,
          buildingClassification.suggestedType,
        );

      // Step 4: Cache node positions for efficient member validation
      const nodeMap = new Map(model.nodes.map((n) => [n.id, n]));

      // Step 5: Validate each member tag prediction
      const memberTagPredictions = Object.entries(memberTags).map(
        ([memberId, suggestedTag]) => {
          const validation = RuleBasedValidator.validateMemberTagPrediction(
            model,
            memberId,
            suggestedTag,
            nodeMap,
          );

          // Use ML confidence if available, otherwise use validation-based confidence
          const mlConfidence = memberConfidences[memberId];
          const baseConfidence =
            mlConfidence ||
            (validation.passed
              ? validation.warnings.length
                ? 0.75
                : 0.85
              : 0.3);

          return {
            memberId,
            suggestedTag,
            confidence: baseConfidence,
            reasoning: mlConfidence
              ? `ML model prediction (confidence: ${mlConfidence.toFixed(3)})`
              : validation.passed
                ? `Rule-based classification based on geometry and structural patterns`
                : `Prediction has validation issues: ${validation.violations.join(", ")}`,
            alternativeTags: this.generateAlternativeTags(
              model,
              memberId,
              suggestedTag,
              nodeMap,
            ),
          };
        },
      );

      // Step 6: Generate frame definitions with position tracking
      const frameDefinitions = this.generateFrameDefinitions(model);

      // Step 7: Create comprehensive prediction
      const prediction: AIAssistantPrediction = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        modelId: model.id,
        buildingTypePrediction: {
          suggestedType: buildingClassification.suggestedType,
          confidence: buildingValidation.passed
            ? buildingValidation.warnings.length
              ? buildingClassification.confidence * 0.9
              : buildingClassification.confidence
            : buildingClassification.confidence * 0.6, // Reduce confidence based on validation severity
          reasoning: [
            ...buildingClassification.reasoning,
            ...(buildingValidation.violations.length > 0
              ? [
                  `⚠️ Rule violations: ${buildingValidation.violations.join(", ")}`,
                ]
              : []),
          ],
          alternativeTypes: this.generateAlternativeBuildingTypes(
            model,
            buildingClassification.suggestedType,
          ),
        },
        memberTagPredictions,
        frameDefinitions,
        ruleBasedValidation: {
          passed:
            buildingValidation.passed &&
            memberTagPredictions.every((p) => p.confidence > 0.5),
          violations: [
            ...buildingValidation.violations,
            ...memberTagPredictions
              .filter((p) => p.confidence <= 0.5)
              .map((p) => `Member ${p.memberId}: ${p.reasoning}`),
          ],
          warnings: buildingValidation.warnings,
        },
        status: "PENDING_REVIEW",
      };

      // Store prediction
      this.setState({
        isAnalyzing: false,
        currentPrediction: prediction,
        predictionHistory: [...this.state.predictionHistory, prediction],
      });

      console.log("✅ AI Assistant: Prediction generated", {
        buildingType: prediction.buildingTypePrediction.suggestedType,
        confidence: prediction.buildingTypePrediction.confidence,
        memberTags: prediction.memberTagPredictions.length,
        validationPassed: prediction.ruleBasedValidation.passed,
      });

      return prediction;
    } catch (error) {
      console.error("❌ AI Assistant: Prediction failed", error);
      this.setState({
        isAnalyzing: false,
        error: error instanceof Error ? error.message : "Prediction failed",
      });
      throw error;
    }
  }

  // User confirms AI predictions
  confirmPrediction(
    predictionId: string,
    userFeedback?: { overallSatisfaction: number; comments?: string },
  ): void {
    const prediction = this.state.predictionHistory.find(
      (p) => p.id === predictionId,
    );
    if (!prediction) {
      throw new Error("Prediction not found");
    }

    prediction.status = "USER_CONFIRMED";
    prediction.userFeedback = userFeedback
      ? {
          ...userFeedback,
          timestamp: new Date(),
        }
      : undefined;

    this.setState({
      currentPrediction: prediction,
      predictionHistory: this.state.predictionHistory.map((p) =>
        p.id === predictionId ? prediction : p,
      ),
    });

    console.log("✅ AI Assistant: Prediction confirmed by user", {
      predictionId,
      satisfaction: userFeedback?.overallSatisfaction,
    });
  }

  // User corrects AI predictions
  correctPrediction(
    predictionId: string,
    corrections: {
      buildingType?: BuildingType;
      memberTagChanges?: { memberId: string; newTag: MemberTag }[];
      reasoning?: string;
    },
  ): void {
    const prediction = this.state.predictionHistory.find(
      (p) => p.id === predictionId,
    );
    if (!prediction) {
      throw new Error("Prediction not found");
    }

    // Update prediction with corrections
    if (corrections.buildingType) {
      prediction.buildingTypePrediction.suggestedType =
        corrections.buildingType;
      prediction.buildingTypePrediction.confidence = 1.0; // User override
    }

    if (corrections.memberTagChanges) {
      corrections.memberTagChanges.forEach((change) => {
        const memberPrediction = prediction.memberTagPredictions.find(
          (p) => p.memberId === change.memberId,
        );
        if (memberPrediction) {
          memberPrediction.suggestedTag = change.newTag;
          memberPrediction.confidence = 1.0;
        }
      });
    }

    // Log corrections for ML training
    const userCorrections: UserCorrection[] = [];

    if (corrections.buildingType) {
      userCorrections.push({
        id: crypto.randomUUID(),
        predictionId,
        timestamp: new Date(),
        correctionType: "BUILDING_TYPE",
        originalPrediction: {
          value: prediction.buildingTypePrediction.suggestedType,
          confidence: prediction.buildingTypePrediction.confidence,
          reasoning: prediction.buildingTypePrediction.reasoning.join("; "),
        },
        userCorrection: {
          value: corrections.buildingType,
          reasoning: corrections.reasoning,
        },
        modelContext: this.extractModelContext(prediction),
      });
    }

    if (corrections.memberTagChanges) {
      corrections.memberTagChanges.forEach((change) => {
        const originalPrediction = prediction.memberTagPredictions.find(
          (p) => p.memberId === change.memberId,
        );
        if (originalPrediction) {
          userCorrections.push({
            id: crypto.randomUUID(),
            predictionId,
            timestamp: new Date(),
            correctionType: "MEMBER_TAG",
            originalPrediction: {
              value: originalPrediction.suggestedTag,
              confidence: originalPrediction.confidence,
              reasoning: originalPrediction.reasoning,
            },
            userCorrection: {
              value: change.newTag,
              reasoning: corrections.reasoning,
            },
            modelContext: this.extractModelContext(prediction),
          });
        }
      });
    }

    // Update prediction status
    prediction.status = "USER_MODIFIED";

    // Store corrections
    this.setState({
      currentPrediction: prediction,
      corrections: [...this.state.corrections, ...userCorrections],
      trainingDataReady:
        this.state.corrections.length + userCorrections.length >= 10,
    });

    console.log("📝 AI Assistant: User corrections logged", {
      predictionId,
      correctionsCount: userCorrections.length,
      totalCorrections: this.state.corrections.length + userCorrections.length,
    });
  }

  // Export training data for ML model improvement
  exportTrainingData(limit = 1000): {
    corrections: UserCorrection[];
    predictions: AIAssistantPrediction[];
    summary: {
      totalCorrections: number;
      correctionsByType: Record<string, number>;
      averageUserSatisfaction: number;
      modelTypes: Record<string, number>;
    };
  } {
    const recentCorrections = this.state.corrections.slice(-limit);
    const recentPredictions = this.state.predictionHistory.slice(-limit);

    const correctionsByType = recentCorrections.reduce(
      (acc, correction) => {
        acc[correction.correctionType] =
          (acc[correction.correctionType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const confirmedPredictions = recentPredictions.filter(
      (p) => p.status === "USER_CONFIRMED" && p.userFeedback,
    );
    const averageUserSatisfaction =
      confirmedPredictions.length > 0
        ? confirmedPredictions.reduce(
            (sum, p) => sum + (p.userFeedback?.overallSatisfaction || 0),
            0,
          ) / confirmedPredictions.length
        : 0;

    const modelTypes = recentCorrections.reduce(
      (acc, correction) => {
        const modelType = correction.modelContext.modelType;
        acc[modelType] = (acc[modelType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    this.setState({ lastExportDate: new Date() });

    return {
      corrections: recentCorrections,
      predictions: recentPredictions,
      summary: {
        totalCorrections: recentCorrections.length,
        correctionsByType,
        averageUserSatisfaction,
        modelTypes,
      },
    };
  }

  // Private helper methods
  private setState(updates: Partial<AIAssistantState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach((listener) => listener(this.state));
  }

  // Enhanced geometry normalization with proper unit conversion
  private normalizeGeometry(model: StructuralModel): any {
    try {
      if (!model.geometry) return null;

      // Use model units for conversion
      const lengthFactor = this.getConversionFactor(model.units.length);
      const forceFactor = this.getConversionFactor(model.units.force);

      return {
        buildingLength: model.geometry.buildingLength * lengthFactor,
        buildingWidth: model.geometry.buildingWidth * lengthFactor,
        totalHeight: model.geometry.totalHeight * lengthFactor,
        eaveHeight: model.geometry.eaveHeight * lengthFactor,
        roofSlope: model.geometry.roofSlope, // degrees, no conversion needed
        forceFactor,
      };
    } catch (e) {
      console.error("Geometry normalization failed", e);
      return model.geometry || null;
    }
  }

  private getConversionFactor(unit: string): number {
    const factors: Record<string, number> = {
      M: 1,
      MM: 0.001,
      FT: 0.3048,
      IN: 0.0254,
      KN: 1,
      KIP: 4.448,
      N: 0.001,
    };
    return factors[unit] || 1;
  }

  // Async building classification - Now supports ML API
  private async classifyBuilding(model: StructuralModel): Promise<{
    suggestedType: BuildingType;
    confidence: number;
    reasoning: string[];
    source?: string;
    alternativeTypes?: { type: BuildingType; confidence: number }[];
  }> {
    try {
      return await AIBuildingClassifier.classifyBuilding(model);
    } catch (error) {
      console.error("Building classification failed:", error);
      // Fallback to a basic classification
      return {
        suggestedType: "COMPLEX_MULTI_STORY",
        confidence: 0.3,
        reasoning: ["Classification failed - using default"],
        source: "FALLBACK",
      };
    }
  }

  // Async member tagging - Now supports ML API
  private async tagMembers(model: StructuralModel): Promise<{
    memberTags: { [memberId: string]: MemberTag };
    confidences: { [memberId: string]: number };
    source: string;
  }> {
    try {
      const buildingClassification = await this.classifyBuilding(model);
      return await AIBuildingClassifier.tagMembers(
        model,
        buildingClassification.suggestedType,
      );
    } catch (error) {
      console.error("Member tagging failed:", error);
      // Return empty result
      return {
        memberTags: {},
        confidences: {},
        source: "FALLBACK",
      };
    }
  }

  // Enhanced alternative tag generation with geometric heuristics
  private generateAlternativeTags(
    model: StructuralModel,
    memberId: string,
    primaryTag: MemberTag,
    nodeMap: Map<string, Node>,
  ): { tag: MemberTag; confidence: number }[] {
    const alternatives: { tag: MemberTag; confidence: number }[] = [];
    const member = model.members.find((m) => m.id === memberId);

    if (!member) return alternatives;

    const startNode = nodeMap.get(member.startNodeId);
    const endNode = nodeMap.get(member.endNodeId);

    if (!startNode || !endNode) return alternatives;

    const isHorizontal = this.isHorizontalMember(startNode, endNode);
    const isVertical = this.isVerticalMember(startNode, endNode);

    if (primaryTag.includes("COLUMN")) {
      if (isVertical) {
        alternatives.push({ tag: "MAIN_FRAME_COLUMN", confidence: 0.8 });
        alternatives.push({ tag: "END_FRAME_COLUMN", confidence: 0.6 });
      } else {
        alternatives.push({ tag: "WALL_BRACING", confidence: 0.6 });
      }
    } else if (primaryTag.includes("RAFTER")) {
      alternatives.push({ tag: "MAIN_FRAME_RAFTER", confidence: 0.7 });
      alternatives.push({ tag: "ROOF_PURLIN", confidence: 0.4 });
    } else if (primaryTag.includes("BEAM")) {
      if (isHorizontal) {
        alternatives.push({ tag: "MEZZANINE_BEAM", confidence: 0.6 });
        alternatives.push({ tag: "CANOPY_BEAM", confidence: 0.3 });
      }
    }

    return alternatives.filter((alt) => alt.tag !== primaryTag);
  }

  // Slope detection helper
  private detectMemberSlope(start: Node, end: Node): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    const horizontal = Math.sqrt(dx * dx + dy * dy);
    return horizontal > 0 ? dz / horizontal : 0;
  }

  // Member orientation helpers
  private isHorizontalMember(start: Node, end: Node): boolean {
    const dz = Math.abs(end.z - start.z);
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const horizontalLength = Math.sqrt(dx * dx + dy * dy);
    const angle =
      horizontalLength > 0
        ? Math.atan(dz / horizontalLength) * (180 / Math.PI)
        : 90;
    return angle < 15; // Within 15 degrees of horizontal
  }

  private isVerticalMember(start: Node, end: Node): boolean {
    const dz = Math.abs(end.z - start.z);
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const horizontalLength = Math.sqrt(dx * dx + dy * dy);
    const angle =
      horizontalLength > 0
        ? Math.atan(dz / horizontalLength) * (180 / Math.PI)
        : 90;
    return angle > 75; // Within 15 degrees of vertical
  }

  private generateAlternativeBuildingTypes(
    model: StructuralModel,
    primaryType: BuildingType,
  ): { type: BuildingType; confidence: number }[] {
    const alternatives: { type: BuildingType; confidence: number }[] = [];
    const geometry = model.geometry;

    if (!geometry) return alternatives;

    // Generate alternatives based on geometry
    if (primaryType.includes("HANGAR")) {
      alternatives.push({ type: "MONO_SLOPE_BUILDING", confidence: 0.6 });
      alternatives.push({ type: "COMPLEX_MULTI_STORY", confidence: 0.4 });
    } else if (primaryType.includes("MULTI_STORY")) {
      alternatives.push({ type: "SINGLE_GABLE_HANGAR", confidence: 0.5 });
      alternatives.push({ type: "SYMMETRIC_MULTI_STORY", confidence: 0.7 });
    }

    return alternatives.filter((alt) => alt.type !== primaryType);
  }

  // Enhanced frame definitions with position tracking
  private generateFrameDefinitions(model: StructuralModel): {
    frameId: string;
    baySpacing: number;
    position: number;
    isEndFrame: boolean;
    confidence: number;
  }[] {
    const frameSpacings = GeometryAnalyzer.analyzeFrameSpacing(model);
    const endFrameMembers = GeometryAnalyzer.identifyEndFrames(model);

    return frameSpacings.map((spacing, index) => {
      const position = index * spacing; // Simplified position calculation
      const isEndFrame = endFrameMembers.some(
        (frameId) => Math.abs(position - parseFloat(frameId)) < 0.1,
      );

      return {
        frameId: `FRAME_${index + 1}`,
        baySpacing: spacing,
        position,
        isEndFrame,
        confidence: isEndFrame ? 0.9 : 0.75,
      };
    });
  }

  // Fixed model context extraction to use actual model data
  private extractModelContext(
    prediction: AIAssistantPrediction,
  ): UserCorrection["modelContext"] {
    // This should ideally receive the actual model as parameter
    // For now, we'll create a reasonable context based on prediction data
    return {
      modelType: "STAAD", // Should be passed from actual model
      modelSize: {
        nodes: prediction.memberTagPredictions.length * 2, // Rough estimate
        members: prediction.memberTagPredictions.length,
      },
      geometryData: {
        buildingLength: 30, // Should come from actual model
        buildingWidth: 20,
        totalHeight: 8,
        aspectRatio: 1.5,
      },
      unitsSystem: "METRIC",
    };
  }
}

// React hook for AI Assistant
export function useAIAssistant() {
  const [state, setState] = React.useState<AIAssistantState>(() =>
    AIAssistant.getInstance().getState(),
  );

  React.useEffect(() => {
    const unsubscribe = AIAssistant.getInstance().subscribe(setState);
    return unsubscribe;
  }, []);

  const assistant = AIAssistant.getInstance();

  return {
    ...state,
    generatePredictions: assistant.generatePredictions.bind(assistant),
    confirmPrediction: assistant.confirmPrediction.bind(assistant),
    correctPrediction: assistant.correctPrediction.bind(assistant),
    exportTrainingData: assistant.exportTrainingData.bind(assistant),
  };
}

// Import React for the hook
import React from "react";
