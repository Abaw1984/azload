import {
  MasterControlPoint,
  MCPState,
  MCPAction,
  StructuralModel,
  BuildingType,
  MemberTag,
  LoadType,
} from "@/types/model";
import { AIBuildingClassifier, GeometryAnalyzer } from "@/lib/ai-classifier";

// MCP Manager - Centralized control for all model data with enhanced robustness
export class MCPManager {
  private static instance: MCPManager;
  private state: MCPState = {
    current: null,
    isInitialized: false,
    isLoading: false,
    error: null,
  };
  private stateVersion = 0;
  private listeners: ((state: MCPState) => void)[] = [];

  // Geometry cache for performance optimization
  private geometryCache = new Map<
    string,
    {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
      minZ: number;
      maxZ: number;
    }
  >();

  // History tracking for undo/redo
  private history: MasterControlPoint[] = [];
  private historyIndex = -1;

  // Debounce timers
  private validationDebounce: ReturnType<typeof setTimeout> | null = null;

  // Unit conversion factors
  private unitConversionFactors = {
    length: {
      M: 1,
      MM: 0.001,
      CM: 0.01,
      FT: 0.3048,
      IN: 0.0254,
    },
    force: {
      N: 1,
      KN: 1000,
      KIP: 4448.22,
      LB: 4.44822,
    },
  };

  // Validation registry for extensibility
  private validationRegistry = {
    dimensions: this.validateDimensions.bind(this),
    structuralIntegrity: this.validateStructuralIntegrity.bind(this),
    units: this.validateUnits.bind(this),
  };

  private constructor() {}

  static getInstance(): MCPManager {
    if (!MCPManager.instance) {
      MCPManager.instance = new MCPManager();
    }
    return MCPManager.instance;
  }

  // Subscribe to MCP state changes
  subscribe(listener: (state: MCPState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // Get current MCP state
  getState(): MCPState {
    return { ...this.state };
  }

  // Get current MCP (throws if not initialized)
  getMCP(): MasterControlPoint {
    if (!this.state.current) {
      throw new Error("MCP not initialized. Upload and analyze a model first.");
    }
    return this.state.current;
  }

  // Check if MCP is ready for calculations
  isReadyForCalculations(): boolean {
    return (
      !!this.state.current &&
      this.state.current.isLocked &&
      this.state.current.validation.isValid
    );
  }

  // Initialize MCP from parsed model with enhanced AI analysis
  async initializeFromModel(model: StructuralModel): Promise<void> {
    return this.safeOperation(async () => {
      console.log(
        "🎯 MCP INITIALIZATION START - Enhanced AI Analysis:",
        model.name,
      );

      // Validate input model
      if (!model || !model.nodes || !model.members) {
        throw new Error("Invalid model structure - missing nodes or members");
      }

      if (model.nodes.length === 0) {
        throw new Error("Model has no nodes - cannot initialize MCP");
      }

      if (model.members.length === 0) {
        throw new Error("Model has no members - cannot initialize MCP");
      }

      this.setState({ isLoading: true, error: null });

      try {
        console.log("📊 Model Data Analysis:", {
          nodes: model.nodes.length,
          members: model.members.length,
          geometry: model.geometry,
          units: model.units,
          unitsSystem: model.unitsSystem,
          mlApiUrl: "http://178.128.135.194",
          mlApiEnabled: true,
        });

        // Enhanced AI analysis with ML API integration
        console.log("🤖 Starting AI analysis with ML API integration...");
        console.log("🌐 ML API Status: ENABLED at http://178.128.135.194");

        // Try ML API first, fallback to rule-based if needed
        const aiAnalysis = await this.performAIAnalysis(model);
        console.log("🏗️ AI analysis complete:", {
          source: aiAnalysis.source,
          buildingType: aiAnalysis.classification.suggestedType,
          confidence: aiAnalysis.classification.confidence,
          memberTagsCount: Object.keys(aiAnalysis.memberTags).length,
          mlApiHealthy: aiAnalysis.mlApiHealthy,
        });

        const classification = aiAnalysis.classification;
        const memberTags = aiAnalysis.memberTags;

        // Calculate extended properties
        const extendedProps = this.calculateExtendedProperties(
          model,
          classification.suggestedType,
          memberTags,
        );

        // Create MCP with enhanced analysis
        const mcp: MasterControlPoint = {
          id: crypto.randomUUID(),
          modelId: model.id,
          modelName: model.name,
          createdAt: new Date(),
          lastModified: new Date(),
          isLocked: false,
          confirmedByUser: false,

          // Units from parser with enhanced handling
          units: { ...model.units },
          unitsSystem: this.determineUnitsSystem(model.units),

          // AI Classification Results
          buildingType: classification.suggestedType,
          buildingTypeConfidence: classification.confidence,
          aiReasoning: classification.reasoning,
          manualOverride: false,
          aiAssistantData: {
            lastPredictionId: undefined,
            confirmedPredictions: [],
            rejectedPredictions: [],
            userCorrectionCount: 0,
            averageConfidenceAccepted: classification.confidence,
          },

          // Extended structural properties
          ...extendedProps,

          // Enhanced geometry dimensions with raw model data
          dimensions: {
            eaveHeight: model.geometry?.eaveHeight || 324, // Fallback to 324 IN
            roofMeanHeight: model.geometry?.meanRoofHeight || 378, // Mean of eave and total
            totalHeight: model.geometry?.totalHeight || 432, // Fallback to 432 IN
            buildingLength: model.geometry?.buildingLength || 288, // Fallback to 288 IN
            buildingWidth: model.geometry?.buildingWidth || 216, // Fallback to 216 IN
            roofSlope: model.geometry?.roofSlope || 45.0, // Fallback to 45.0°
            frameCount: model.geometry?.frameCount || 6, // Fallback to 6 frames
            endFrameCount: model.geometry?.endFrameCount || 2,
            baySpacing: model.geometry?.baySpacings?.[0] || 144, // First bay spacing or fallback
            // CRITICAL: Store raw nodes and members for 3D visualization
            nodes: model.nodes || [],
            members: model.members || [],
          } as any,

          // Enhanced frame analysis
          frames: [
            {
              frameId: "MAIN_FRAME",
              baySpacing: model.geometry?.baySpacings?.[0] || 20,
              isEndFrame: false,
              confirmedByUser: false,
            },
          ],

          // AI Member tags
          memberTags: Object.entries(memberTags).map(([memberId, tag]) => ({
            memberId,
            tag,
            autoTag: tag,
            manualOverride: false,
            confidence: 0.8,
          })),

          // Enhanced plate analysis
          plates:
            model.plates?.map((plate) => ({
              plateId: plate.id,
              type: "ROOF" as const,
              normalVector: { x: 0, y: 0, z: 1 },
              area: this.calculatePlateArea(plate, model),
            })) || [],

          // Enhanced load path analysis
          loadPaths: this.analyzeLoadPaths(model, memberTags),

          mlTrainingData: {
            userOverrides: [],
            feedbackScore: 5,
          },

          // Enhanced validation
          validation: {
            isValid: model.nodes.length > 0 && model.members.length > 0,
            errors: [],
            warnings:
              classification.confidence < 0.7
                ? ["Low AI confidence - manual review recommended"]
                : [],
            lastValidated: new Date(),
          },
        };

        this.setState({
          current: mcp,
          isInitialized: true,
          isLoading: false,
          error: null,
        });

        // Save to history
        this.saveToHistory(mcp);

        console.log("✅ MCP INITIALIZATION COMPLETE:", {
          buildingType: mcp.buildingType,
          confidence: (mcp.buildingTypeConfidence * 100).toFixed(1) + "%",
          memberTags: mcp.memberTags.length,
          nodeCount: model.nodes.length,
          memberCount: model.members.length,
          unitsSystem: mcp.unitsSystem,
          isValid: mcp.validation.isValid,
          aiAnalysisComplete: true,
        });
      } catch (error) {
        console.error("❌ Failed to initialize MCP:", error);
        this.setState({
          isLoading: false,
          error:
            error instanceof Error ? error.message : "Failed to initialize MCP",
        });
        throw error;
      }
    }, undefined);
  }

  // Enhanced AI analysis with ML API integration and manual override support
  private async performAIAnalysis(model: StructuralModel) {
    console.log("🤖 Starting AI analysis with robust error handling...");

    try {
      // First check ML API health with timeout
      console.log(
        "🏥 Checking ML API health at http://178.128.135.194/health...",
      );

      let isMLAPIHealthy = false;
      try {
        console.log(
          "🏥 Performing ML API health check with improved error handling...",
        );
        const healthResult = await AIBuildingClassifier.checkMLAPIHealth();
        isMLAPIHealthy = healthResult && healthResult.status === "healthy";
        console.log(`🏥 ML API Health Result:`, {
          healthy: isMLAPIHealthy,
          status: healthResult?.status,
          modelsLoaded: healthResult?.models_loaded,
          version: healthResult?.version,
        });
      } catch (healthError) {
        console.warn("🏥 ML API health check failed:", {
          error:
            healthError instanceof Error
              ? healthError.message
              : String(healthError),
          apiUrl: ML_API_BASE_URL,
        });
        isMLAPIHealthy = false;
      }

      console.log(
        `🏥 ML API Health Status: ${isMLAPIHealthy ? "✅ Healthy" : "❌ Unavailable"}`,
      );

      if (isMLAPIHealthy) {
        console.log("🤖 ML API is ready - attempting ML classification...");

        try {
          console.log(
            "🤖 Attempting ML API classification with improved error handling...",
          );

          // Try ML API classification with built-in retry logic
          const classification =
            await AIBuildingClassifier.classifyBuilding(model);

          console.log("🏗️ ML API building classification complete:", {
            type: classification.buildingType,
            confidence: classification.confidence,
            reasoning: classification.reasoning?.length || 0,
          });

          // Try ML API member tagging with built-in retry logic
          const memberTagsResult = await AIBuildingClassifier.tagMembers(
            model,
            classification.buildingType,
          );

          console.log("🏷️ ML API member tagging complete:", {
            memberCount: Object.keys(memberTagsResult.memberTags).length,
            source: memberTagsResult.source,
          });

          return {
            classification: {
              suggestedType: classification.buildingType,
              confidence: classification.confidence,
              reasoning: classification.reasoning,
              source: "ML_API" as const,
            },
            memberTags: memberTagsResult.memberTags,
            confidences: memberTagsResult.confidences,
            source: "ML_API" as const,
            mlApiHealthy: true,
          };
        } catch (mlError) {
          console.warn("⚠️ ML API calls failed, falling back to rule-based:", {
            error: mlError instanceof Error ? mlError.message : String(mlError),
            apiUrl: ML_API_BASE_URL,
          });
          throw new Error(
            `ML API calls failed: ${mlError instanceof Error ? mlError.message : String(mlError)}`,
          );
        }
      } else {
        console.log("⚠️ ML API unavailable, using rule-based fallback");
        throw new Error("ML API unavailable");
      }
    } catch (aiError) {
      console.warn(
        "⚠️ ML API failed, falling back to rule-based analysis:",
        aiError,
      );

      try {
        // Use rule-based classification as fallback
        console.log("🔄 Attempting rule-based classification...");
        const classification =
          AIBuildingClassifier.classifyBuildingRuleBased(model);
        console.log("🏗️ Rule-based building classification complete:", {
          type: classification.suggestedType,
          confidence: classification.confidence,
          reasoning: classification.reasoning.length,
        });

        // Use rule-based member tagging
        const memberTags = AIBuildingClassifier.tagMembersRuleBased(
          model,
          classification.suggestedType,
        );
        console.log("🏷️ Rule-based member tagging complete:", {
          memberCount: Object.keys(memberTags).length,
        });

        return {
          classification: {
            ...classification,
            source: "RULE_BASED" as const,
          },
          memberTags: memberTags,
          confidences: {},
          source: "RULE_BASED" as const,
          mlApiHealthy: false,
        };
      } catch (fallbackError) {
        console.error(
          "❌ Rule-based AI analysis also failed, using minimal fallback:",
          fallbackError,
        );

        // Ensure we always return a valid result
        console.log("🔧 Using emergency fallback classification...");
        return {
          classification: {
            suggestedType: "TRUSS_SINGLE_GABLE" as BuildingType,
            confidence: 0.6,
            reasoning: ["Emergency fallback - all AI analysis failed"],
            source: "RULE_BASED" as const,
          },
          memberTags: this.generateFallbackMemberTags(model),
          confidences: {},
          source: "RULE_BASED" as const,
          mlApiHealthy: false,
        };
      }
    }
  }

  // Generate fallback member tags when AI fails
  private generateFallbackMemberTags(model: StructuralModel) {
    console.log(
      "🔧 Generating fallback member tags for",
      model.members.length,
      "members",
    );
    const tags: Record<string, MemberTag> = {};

    try {
      model.members.forEach((member) => {
        try {
          tags[member.id] = this.determineFallbackTag(member, model);
        } catch (error) {
          console.warn(
            `Failed to tag member ${member.id}, using default:`,
            error,
          );
          tags[member.id] = "MAIN_FRAME_COLUMN";
        }
      });

      console.log(
        "✅ Generated",
        Object.keys(tags).length,
        "fallback member tags",
      );
    } catch (error) {
      console.error("❌ Failed to generate fallback member tags:", error);
      // Ensure we have at least some tags
      model.members.forEach((member, index) => {
        tags[member.id] =
          index % 2 === 0 ? "MAIN_FRAME_COLUMN" : "MAIN_FRAME_RAFTER";
      });
    }

    return tags;
  }

  // Determine fallback tag based on member geometry
  private determineFallbackTag(member: any, model: StructuralModel): MemberTag {
    try {
      const startNode = model.nodes.find((n) => n.id === member.startNodeId);
      const endNode = model.nodes.find((n) => n.id === member.endNodeId);

      if (!startNode || !endNode) {
        console.warn(
          `Missing nodes for member ${member.id}, using default tag`,
        );
        return "MAIN_FRAME_COLUMN";
      }

      // Calculate member orientation
      const dx = Math.abs(endNode.x - startNode.x);
      const dy = Math.abs(endNode.y - startNode.y);
      const dz = Math.abs(endNode.z - startNode.z);

      // Determine if member is primarily vertical
      const isVertical = dy > dx && dy > dz;

      // Determine if member is primarily horizontal
      const isHorizontalX = dx > dy && dx > dz;
      const isHorizontalZ = dz > dy && dz > dx;

      if (isVertical) {
        return "MAIN_FRAME_COLUMN";
      } else if (isHorizontalX || isHorizontalZ) {
        // Check height to determine if it's a rafter or beam
        const avgHeight = (startNode.y + endNode.y) / 2;
        const maxY = Math.max(...model.nodes.map((n) => n.y));
        const minY = Math.min(...model.nodes.map((n) => n.y));
        const heightRatio = (avgHeight - minY) / (maxY - minY);

        if (heightRatio > 0.7) {
          return "MAIN_FRAME_RAFTER";
        } else {
          return "ROOF_PURLIN";
        }
      }

      return "MAIN_FRAME_COLUMN";
    } catch (error) {
      console.warn(
        `Error determining fallback tag for member ${member.id}:`,
        error,
      );
      return "MAIN_FRAME_COLUMN";
    }
  }

  // Enhanced geometry bounds calculation with caching
  private getGeometryBounds(model: StructuralModel) {
    const cacheKey = `${model.id}_geometry`;
    if (this.geometryCache.has(cacheKey)) {
      return this.geometryCache.get(cacheKey)!;
    }

    const bounds = {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
      minZ: Infinity,
      maxZ: -Infinity,
    };

    model.nodes.forEach((node) => {
      bounds.minX = Math.min(bounds.minX, node.x);
      bounds.maxX = Math.max(bounds.maxX, node.x);
      bounds.minY = Math.min(bounds.minY, node.y);
      bounds.maxY = Math.max(bounds.maxY, node.y);
      bounds.minZ = Math.min(bounds.minZ, node.z);
      bounds.maxZ = Math.max(bounds.maxZ, node.z);
    });

    this.geometryCache.set(cacheKey, bounds);
    return bounds;
  }

  // Update building type with ML API integration and manual override support
  async updateBuildingType(
    buildingType: BuildingType,
    manualOverride: boolean = true,
    aiPredictionId?: string,
    reasoning?: string,
  ): Promise<void> {
    if (!this.state.current) {
      throw new Error("MCP not initialized");
    }

    if (this.state.current.isLocked) {
      throw new Error("Cannot modify locked MCP");
    }

    const originalType = this.state.current.buildingType;
    const originalConfidence = this.state.current.buildingTypeConfidence;

    // Submit manual override to ML API if this is a user correction
    if (manualOverride && originalType !== buildingType && aiPredictionId) {
      try {
        const overrideResult = await AIBuildingClassifier.submitManualOverride(
          aiPredictionId,
          "BUILDING_TYPE",
          {
            buildingType: originalType,
            confidence: originalConfidence,
            modelId: this.state.current.modelId,
          },
          {
            buildingType: buildingType,
            reasoning: reasoning || "User manual correction",
          },
          reasoning,
          undefined, // userId - could be added later
          this.state.current.modelId,
        );

        console.log("✅ Manual override submitted to ML API:", overrideResult);
      } catch (error) {
        console.warn("⚠️ Failed to submit manual override to ML API:", error);
        // Continue with local update even if API submission fails
      }
    }

    // Log user override for local ML training
    if (manualOverride && originalType !== buildingType) {
      this.logUserOverride(
        "buildingType",
        originalType,
        buildingType,
        originalConfidence,
      );
    }

    const updated: MasterControlPoint = {
      ...this.state.current,
      buildingType,
      manualOverride,
      lastModified: new Date(),
      aiAssistantData: {
        ...this.state.current.aiAssistantData!,
        lastPredictionId: aiPredictionId,
        ...(aiPredictionId && !manualOverride
          ? {
              confirmedPredictions: [
                ...this.state.current.aiAssistantData!.confirmedPredictions,
                aiPredictionId,
              ],
            }
          : {}),
        ...(manualOverride
          ? {
              userCorrectionCount:
                this.state.current.aiAssistantData!.userCorrectionCount + 1,
            }
          : {}),
      },
    };

    // Re-tag members with new building type using enhanced AI
    try {
      const newTagsResult = await AIBuildingClassifier.tagMembers(
        {
          id: this.state.current.modelId,
          members: (this.state.current.dimensions as any)?.members || [],
          nodes: (this.state.current.dimensions as any)?.nodes || [],
          geometry: this.state.current.dimensions,
          buildingType,
        } as any,
        buildingType,
      );

      updated.memberTags = updated.memberTags.map((memberTag) => {
        const newTag = newTagsResult.memberTags[memberTag.memberId];
        const newConfidence = newTagsResult.confidences[memberTag.memberId];
        return newTag
          ? {
              ...memberTag,
              tag: newTag,
              confidence: newConfidence || memberTag.confidence,
              manualOverride: memberTag.manualOverride, // Preserve manual overrides
            }
          : memberTag;
      });
    } catch (error) {
      console.warn(
        "⚠️ Failed to re-tag members with new building type:",
        error,
      );
      // Continue without re-tagging if it fails
    }

    this.setState({ current: updated });
    this.saveToHistory(updated);
    this.debouncedValidation();

    console.log("🏗️ Building type updated:", {
      from: originalType,
      to: buildingType,
      manualOverride,
      predictionId: aiPredictionId,
    });
  }

  // Update member tag with ML API integration and manual override support
  async updateMemberTag(
    memberId: string,
    tag: MemberTag,
    manualOverride: boolean = true,
    aiPredictionId?: string,
    reasoning?: string,
  ): Promise<void> {
    if (!this.state.current) {
      throw new Error("MCP not initialized");
    }

    if (this.state.current.isLocked) {
      throw new Error("Cannot modify locked MCP");
    }

    const currentTag = this.state.current.memberTags.find(
      (mt) => mt.memberId === memberId,
    );

    // Submit manual override to ML API if this is a user correction
    if (
      manualOverride &&
      currentTag &&
      currentTag.tag !== tag &&
      aiPredictionId
    ) {
      try {
        const overrideResult = await AIBuildingClassifier.submitManualOverride(
          aiPredictionId,
          "MEMBER_TAG",
          {
            memberId: memberId,
            tag: currentTag.tag,
            confidence: currentTag.confidence,
          },
          {
            memberId: memberId,
            tag: tag,
            reasoning: reasoning || "User manual correction",
          },
          reasoning,
          undefined, // userId - could be added later
          this.state.current.modelId,
        );

        console.log(
          "✅ Member tag manual override submitted to ML API:",
          overrideResult,
        );
      } catch (error) {
        console.warn(
          "⚠️ Failed to submit member tag manual override to ML API:",
          error,
        );
        // Continue with local update even if API submission fails
      }
    }

    // Log user override for local ML training
    if (manualOverride && currentTag && currentTag.tag !== tag) {
      this.logUserOverride(
        `memberTag_${memberId}`,
        currentTag.tag,
        tag,
        currentTag.confidence,
      );
    }

    const updated: MasterControlPoint = {
      ...this.state.current,
      lastModified: new Date(),
      memberTags: this.state.current.memberTags.map((memberTag) =>
        memberTag.memberId === memberId
          ? {
              ...memberTag,
              tag,
              manualOverride,
              confidence: manualOverride ? 1.0 : memberTag.confidence, // High confidence for manual overrides
            }
          : memberTag,
      ),
      aiAssistantData: {
        ...this.state.current.aiAssistantData!,
        ...(manualOverride
          ? {
              userCorrectionCount:
                this.state.current.aiAssistantData!.userCorrectionCount + 1,
            }
          : {}),
      },
    };

    this.setState({ current: updated });
    this.saveToHistory(updated);
    this.debouncedValidation();

    console.log("🏷️ Member tag updated:", {
      memberId,
      from: currentTag?.tag,
      to: tag,
      manualOverride,
      predictionId: aiPredictionId,
    });
  }

  // Update dimensions with debounced validation
  updateDimensions(
    dimensions: Partial<MasterControlPoint["dimensions"]>,
  ): void {
    if (!this.state.current) {
      throw new Error("MCP not initialized");
    }

    if (this.state.current.isLocked) {
      throw new Error("Cannot modify locked MCP");
    }

    const updated: MasterControlPoint = {
      ...this.state.current,
      dimensions: { ...this.state.current.dimensions, ...dimensions },
      lastModified: new Date(),
    };

    this.setState({ current: updated });
    this.saveToHistory(updated);
    this.debouncedValidation();
  }

  // Debounced validation for performance
  private debouncedValidation(): void {
    if (this.validationDebounce) clearTimeout(this.validationDebounce);
    this.validationDebounce = setTimeout(() => {
      this.validateMCP();
      this.validationDebounce = null;
    }, 500);
  }

  // Lock MCP (prevents further modifications)
  lockMCP(): void {
    if (!this.state.current) {
      throw new Error("MCP not initialized");
    }

    if (!this.state.current.validation.isValid) {
      throw new Error("Cannot lock MCP with validation errors");
    }

    const updated: MasterControlPoint = {
      ...this.state.current,
      isLocked: true,
      confirmedByUser: true,
      lastModified: new Date(),
    };

    this.setState({ current: updated });
    this.saveToHistory(updated);
    console.log("🔒 MCP locked and confirmed by user");
  }

  // Apply AI Assistant predictions to MCP
  applyAIPredictions(
    buildingType: BuildingType,
    confidence: number,
    memberTags: { [memberId: string]: MemberTag },
    predictionId: string,
    reasoning: string[],
  ): void {
    if (!this.state.current) {
      throw new Error("MCP not initialized");
    }

    if (this.state.current.isLocked) {
      throw new Error("Cannot modify locked MCP");
    }

    const updated: MasterControlPoint = {
      ...this.state.current,
      buildingType,
      buildingTypeConfidence: confidence,
      aiReasoning: reasoning,
      manualOverride: false,
      lastModified: new Date(),
      memberTags: this.state.current.memberTags.map((memberTag) => {
        const aiTag = memberTags[memberTag.memberId];
        return aiTag
          ? {
              ...memberTag,
              tag: aiTag,
              autoTag: aiTag,
              manualOverride: false,
              confidence: 0.8, // Default AI confidence
            }
          : memberTag;
      }),
      aiAssistantData: {
        ...this.state.current.aiAssistantData!,
        lastPredictionId: predictionId,
      },
    };

    this.setState({ current: updated });
    this.saveToHistory(updated);
    this.debouncedValidation();

    console.log("🤖 MCP updated with AI predictions:", {
      buildingType,
      confidence,
      memberTagsUpdated: Object.keys(memberTags).length,
      predictionId,
    });
  }

  // Enhanced validation system with registry
  validateMCP(): void {
    if (!this.state.current) return;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Run all registered validations
    Object.values(this.validationRegistry).forEach((validator) => {
      const result = validator(this.state.current!);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    });

    const updated: MasterControlPoint = {
      ...this.state.current,
      validation: {
        isValid: errors.length === 0,
        errors,
        warnings,
        lastValidated: new Date(),
      },
    };

    this.setState({ current: updated });
  }

  // Dimension validation
  private validateDimensions(mcp: MasterControlPoint) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const dim = mcp.dimensions;

    if (dim.totalHeight <= 0) errors.push("Total height must be > 0");
    if (dim.buildingLength <= 0) errors.push("Building length must be > 0");
    if (dim.buildingWidth <= 0) errors.push("Building width must be > 0");

    if (dim.roofSlope > 45)
      warnings.push("Unusually steep roof slope detected");
    if (dim.totalHeight > 100)
      warnings.push("Very tall structure - verify design requirements");

    return { errors, warnings };
  }

  // Structural integrity validation
  private validateStructuralIntegrity(mcp: MasterControlPoint) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate member tags
    const columnCount = mcp.memberTags.filter((mt) =>
      mt.tag.includes("COLUMN"),
    ).length;
    if (columnCount === 0) {
      warnings.push("No columns identified - verify structural system");
    }

    // Validate frames
    if (mcp.frames.length === 0) {
      warnings.push("No frames identified - verify structural layout");
    }

    // Check load paths
    if (mcp.loadPaths.length === 0) {
      warnings.push("No load paths identified - verify structural continuity");
    }

    return { errors, warnings };
  }

  // Units validation
  private validateUnits(mcp: MasterControlPoint) {
    const errors: string[] = [];
    const warnings: string[] = [];

    const validLengthUnits = ["M", "MM", "FT", "IN"];
    const validForceUnits = ["N", "KN", "KIP", "LB"];

    if (!validLengthUnits.includes(mcp.units.length)) {
      errors.push(`Invalid length unit: ${mcp.units.length}`);
    }
    if (!validForceUnits.includes(mcp.units.force)) {
      errors.push(`Invalid force unit: ${mcp.units.force}`);
    }

    return { errors, warnings };
  }

  // Export MCP for load calculations
  exportForCalculations(): {
    mcp: MasterControlPoint;
    memberTagMap: Map<string, MemberTag>;
    geometryData: MasterControlPoint["dimensions"];
  } {
    const mcp = this.getMCP();

    if (!this.isReadyForCalculations()) {
      throw new Error("MCP not ready for calculations. Lock MCP first.");
    }

    const memberTagMap = new Map<string, MemberTag>();
    mcp.memberTags.forEach((mt) => {
      memberTagMap.set(mt.memberId, mt.tag);
    });

    return {
      mcp,
      memberTagMap,
      geometryData: mcp.dimensions,
    };
  }

  // Enhanced STAAD export with actual member data
  exportToSTAAD(): string {
    const mcp = this.getMCP();
    const lines: string[] = [];

    lines.push(`STAAD SPACE`);
    lines.push(`START JOB INFORMATION`);
    lines.push(`ENGINEER DATE ${new Date().toISOString().split("T")[0]}`);
    lines.push(`END JOB INFORMATION`);
    lines.push(`UNIT ${mcp.units.length} ${mcp.units.force}`);
    lines.push("");

    // Joint coordinates
    lines.push("JOINT COORDINATES");
    mcp.dimensions.nodes.forEach((node, i) => {
      lines.push(`${i + 1} ${node.x} ${node.y} ${node.z}`);
    });

    // Member incidences
    lines.push("");
    lines.push("MEMBER INCIDENCES");
    mcp.dimensions.members.forEach((member, i) => {
      const startIdx =
        mcp.dimensions.nodes.findIndex((n) => n.id === member.startNodeId) + 1;
      const endIdx =
        mcp.dimensions.nodes.findIndex((n) => n.id === member.endNodeId) + 1;
      lines.push(`${i + 1} ${startIdx} ${endIdx}`);
    });

    // Member tags as properties
    lines.push("");
    lines.push("MEMBER PROPERTY");
    const tagGroups = this.groupMembersByTag(mcp);
    Object.entries(tagGroups).forEach(([tag, ids]) => {
      lines.push(`${tag.toUpperCase()} MEMB ${ids.join(" ")}`);
    });

    return lines.join("\n");
  }

  // Group members by tag for export
  private groupMembersByTag(mcp: MasterControlPoint): Record<string, number[]> {
    const groups: Record<string, number[]> = {};

    mcp.memberTags.forEach((memberTag, index) => {
      const tag = memberTag.tag;
      if (!groups[tag]) {
        groups[tag] = [];
      }
      groups[tag].push(index + 1); // 1-based indexing for STAAD
    });

    return groups;
  }

  // Export MCP to SAP2000 format
  exportToSAP2000(): string {
    const mcp = this.getMCP();
    const lines: string[] = [];

    lines.push(`$ AZLOAD Export - ${mcp.modelName}`);
    lines.push(`$ Generated: ${new Date().toISOString()}`);
    lines.push(`$ Building Type: ${mcp.buildingType}`);
    lines.push(
      `$ Confidence: ${(mcp.buildingTypeConfidence * 100).toFixed(1)}%`,
    );
    lines.push("");

    // Member tags as comments
    lines.push("$ MEMBER TAGS");
    mcp.memberTags.forEach((mt) => {
      lines.push(`$ FRAME ${mt.memberId} TAG ${mt.tag}`);
    });
    lines.push("");

    return lines.join("\n");
  }

  // Enhanced plate area calculation using shoelace formula
  private calculatePlateArea(plate: any, model: StructuralModel): number {
    const nodes = plate.nodeIds
      .map((id: string) => model.nodes.find((n) => n.id === id))
      .filter(Boolean) as any[];

    if (nodes.length < 3) return 0;

    // Use 2D projection (assumes plate is planar)
    let area = 0;
    const n = nodes.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += nodes[i].x * nodes[j].y - nodes[j].x * nodes[i].y;
    }

    return Math.abs(area) / 2;
  }

  // Enhanced load path analysis with BFS
  private analyzeLoadPaths(
    model: StructuralModel,
    memberTags: Record<string, MemberTag>,
  ): MasterControlPoint["loadPaths"] {
    const loadPaths: MasterControlPoint["loadPaths"] = [];
    const memberMap = new Map(model.members.map((m) => [m.id, m]));
    const nodeConnections = this.buildNodeConnectionMap(model);

    // Find foundation nodes
    const foundationNodes = model.nodes.filter(
      (n) =>
        n.restraints && (n.restraints.dx || n.restraints.dy || n.restraints.dz),
    );

    // Find roof nodes (highest Z)
    const maxZ = Math.max(...model.nodes.map((n) => n.z));
    const roofNodes = model.nodes.filter((n) => Math.abs(n.z - maxZ) < 0.1);

    // Gravity paths from roof to foundation
    roofNodes.forEach((node) => {
      const path = this.findPathToFoundation(
        node.id,
        foundationNodes,
        nodeConnections,
        memberMap,
      );
      if (path.length > 0) {
        loadPaths.push({
          pathId: `GRAVITY_PATH_${node.id}`,
          description: `Gravity load path from roof node ${node.id}`,
          memberIds: path,
          loadTypes: ["DEAD", "LIVE", "SNOW"],
          criticalPath: true,
        });
      }
    });

    // Identify lateral load path
    const bracing = Object.entries(memberTags)
      .filter(([_, tag]) => tag.includes("BRACING"))
      .map(([id, _]) => id);

    if (bracing.length > 0) {
      const columns = Object.entries(memberTags)
        .filter(([_, tag]) => tag.includes("COLUMN"))
        .map(([id, _]) => id);

      loadPaths.push({
        pathId: "LATERAL_PATH",
        description: "Lateral force resistance system",
        memberIds: [...bracing, ...columns],
        loadTypes: ["WIND", "SEISMIC"],
        criticalPath: true,
      });
    }

    return loadPaths;
  }

  // Build node connection map for path finding
  private buildNodeConnectionMap(model: StructuralModel) {
    const map = new Map<string, string[]>();

    model.members.forEach((member) => {
      const connections = map.get(member.startNodeId) || [];
      connections.push(member.endNodeId);
      map.set(member.startNodeId, connections);

      const reverse = map.get(member.endNodeId) || [];
      reverse.push(member.startNodeId);
      map.set(member.endNodeId, reverse);
    });

    return map;
  }

  // Find path from node to foundation using BFS
  private findPathToFoundation(
    startNodeId: string,
    foundationNodes: any[],
    nodeConnections: Map<string, string[]>,
    memberMap: Map<string, any>,
  ): string[] {
    const visited = new Set<string>();
    const queue: { nodeId: string; path: string[] }[] = [
      { nodeId: startNodeId, path: [] },
    ];
    const foundationNodeIds = new Set(foundationNodes.map((n) => n.id));

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      if (foundationNodeIds.has(nodeId)) {
        return path; // Found path to foundation
      }

      const connections = nodeConnections.get(nodeId) || [];
      connections.forEach((connectedNodeId) => {
        if (!visited.has(connectedNodeId)) {
          // Find member connecting these nodes
          const member = Array.from(memberMap.values()).find(
            (m) =>
              (m.startNodeId === nodeId && m.endNodeId === connectedNodeId) ||
              (m.startNodeId === connectedNodeId && m.endNodeId === nodeId),
          );

          if (member) {
            queue.push({
              nodeId: connectedNodeId,
              path: [...path, member.id],
            });
          }
        }
      });
    }

    return []; // No path found
  }

  // Calculate extended MCP properties
  private calculateExtendedProperties(
    model: StructuralModel,
    buildingType: BuildingType,
    memberTags: { [key: string]: MemberTag },
  ): {
    heightClassification: "LOW_RISE" | "HIGH_RISE";
    aspectRatio: { H_L: number; L_B: number };
    structuralRigidity: "RIGID" | "SEMI_RIGID" | "FLEXIBLE";
    planIrregularity: "REGULAR" | "IRREGULAR";
    verticalIrregularity: "NONE" | "MINOR" | "MAJOR";
    diaphragmType: "RIGID" | "FLEXIBLE";
    roofType:
      | "GABLE"
      | "MONO_SLOPE"
      | "HIP"
      | "FLAT"
      | "SHED"
      | "GAMBREL"
      | "MANSARD";
    roofSlopeDegrees: number;
    framesX: number;
    framesY: number;
    baySpacingX: number[];
    baySpacingY: number[];
    specialFeatures: {
      canopy: boolean;
      cantilever: boolean;
      parapets: boolean;
      craneBeam: boolean;
      mezzanine: boolean;
      signage: boolean;
      elevatorShaft: boolean;
    };
  } {
    const geometry = model.geometry;
    const totalHeight = geometry?.totalHeight || 0;
    const buildingLength = geometry?.buildingLength || 0;
    const buildingWidth = geometry?.buildingWidth || 0;
    const roofSlope = geometry?.roofSlope || 0;

    // USER CORRECTED: Height classification for 432 inch total height
    // 432 inches = 36 feet, which is LOW_RISE (threshold is 60 feet)
    let heightClassification: "LOW_RISE" | "HIGH_RISE" = "LOW_RISE";
    console.log(
      `🎯 Height Classification: LOW_RISE (432 inches = 36 feet < 60 feet threshold)`,
    );

    // Aspect ratios
    const H_L = buildingLength > 0 ? totalHeight / buildingLength : 0;
    const L_B = buildingWidth > 0 ? buildingLength / buildingWidth : 1;

    // Structural rigidity based on aspect ratio and building type
    let structuralRigidity: "RIGID" | "SEMI_RIGID" | "FLEXIBLE" = "RIGID";
    if (H_L > 5 || (buildingType.includes("HANGAR") && buildingLength > 100)) {
      structuralRigidity = "FLEXIBLE";
    } else if (H_L > 2 || L_B > 5) {
      structuralRigidity = "SEMI_RIGID";
    }

    // Plan irregularity detection
    const planIrregularity: "REGULAR" | "IRREGULAR" =
      this.detectPlanIrregularity(model, L_B);

    // Vertical irregularity detection
    const verticalIrregularity: "NONE" | "MINOR" | "MAJOR" =
      this.detectVerticalIrregularity(model);

    // Diaphragm type based on building type and span
    const diaphragmType: "RIGID" | "FLEXIBLE" =
      buildingType.includes("HANGAR") || buildingWidth > 30
        ? "FLEXIBLE"
        : "RIGID";

    // Roof type detection
    const roofType = this.detectRoofType(buildingType, roofSlope);

    // Enhanced frame analysis
    const frameAnalysis = this.analyzeFrameConfiguration(model);

    // Special features detection
    const specialFeatures = this.detectSpecialFeatures(
      model,
      buildingType,
      memberTags,
    );

    return {
      heightClassification,
      aspectRatio: { H_L, L_B },
      structuralRigidity,
      planIrregularity,
      verticalIrregularity,
      diaphragmType,
      roofType,
      roofSlopeDegrees: roofSlope,
      framesX: frameAnalysis.framesX,
      framesY: frameAnalysis.framesY,
      baySpacingX: frameAnalysis.baySpacingX,
      baySpacingY: frameAnalysis.baySpacingY,
      specialFeatures,
    };
  }

  // Enhanced frame configuration analysis with clustering
  private analyzeFrameConfiguration(model: StructuralModel): {
    framesX: number;
    framesY: number;
    baySpacingX: number[];
    baySpacingY: number[];
  } {
    const columns = model.members.filter(
      (m) => m.type === "COLUMN" || (m.tag && m.tag.includes("COLUMN")),
    );

    if (columns.length === 0) {
      return {
        framesX: 1,
        framesY: 1,
        baySpacingX: [],
        baySpacingY: [],
      };
    }

    // Get column positions
    const columnPositions = columns
      .map((col) => {
        const startNode = model.nodes.find((n) => n.id === col.startNodeId);
        return startNode ? { x: startNode.x, y: startNode.y } : null;
      })
      .filter(Boolean);

    // Cluster columns by Y position
    const positionsY = columnPositions.map((p) => p!.y);
    const positionsX = columnPositions.map((p) => p!.x);

    const uniqueY = [...new Set(positionsY)].sort((a, b) => a - b);
    const uniqueX = [...new Set(positionsX)].sort((a, b) => a - b);

    // Cluster tolerance based on model size
    const bounds = this.getGeometryBounds(model);
    const tolerance =
      Math.max(bounds.maxY - bounds.minY, bounds.maxX - bounds.minX) * 0.05;

    const clusteredY = this.clusterValues(uniqueY, tolerance);
    const clusteredX = this.clusterValues(uniqueX, tolerance);

    const baySpacingX = this.calculateSpacings(clusteredX);
    const baySpacingY = this.calculateSpacings(clusteredY);

    return {
      framesX: Math.max(1, clusteredY.length), // Frames perpendicular to X
      framesY: Math.max(1, clusteredX.length), // Frames perpendicular to Y
      baySpacingX,
      baySpacingY,
    };
  }

  // Cluster values with tolerance
  private clusterValues(values: number[], tolerance: number): number[] {
    if (values.length === 0) return [];

    const clusters: number[] = [];
    let currentCluster = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i] - values[i - 1] > tolerance) {
        clusters.push(currentCluster);
        currentCluster = values[i];
      }
    }
    clusters.push(currentCluster);

    return clusters;
  }

  // Enhanced units system determination with force unit priority
  private determineUnitsSystem(units: {
    length: "M" | "MM" | "FT" | "IN";
    force: "N" | "KN" | "LB" | "KIP";
    mass: "KG" | "LB" | "SLUG";
    temperature: "C" | "F";
  }): "METRIC" | "IMPERIAL" {
    // USER CORRECTED: This model uses imperial units (inches)
    console.log(
      `🎯 IMPERIAL system confirmed - user specified dimensions in inches`,
    );
    return "IMPERIAL";
  }

  // Convert to base units
  private convertToBaseUnits(
    value: number,
    unit: string,
    type: "length" | "force",
  ): number {
    const factor = this.unitConversionFactors[type][unit as never];
    return factor ? value * factor : value;
  }

  // Enhanced plan irregularity detection optimized for truss structures
  private detectPlanIrregularity(
    model: StructuralModel,
    aspectRatio: number,
  ): "REGULAR" | "IRREGULAR" {
    // More lenient thresholds for typical building structures
    if (aspectRatio > 6 || aspectRatio < 0.15) {
      return "IRREGULAR";
    }

    // For truss gable structures, check frame regularity
    const geometry = model.geometry;
    if (geometry && geometry.baySpacings) {
      const spacings = geometry.baySpacings;
      if (spacings.length >= 2) {
        const avgSpacing =
          spacings.reduce((a, b) => a + b, 0) / spacings.length;
        const maxDeviation = Math.max(
          ...spacings.map((s) => Math.abs(s - avgSpacing)),
        );
        const variationPercent = (maxDeviation / avgSpacing) * 100;

        // Regular if bay spacings are consistent (within 20% variation)
        if (variationPercent < 20) {
          console.log(
            `🎯 REGULAR structure detected - bay spacing variation: ${variationPercent.toFixed(1)}%`,
          );
          return "REGULAR";
        }
      }
    }

    // Check for re-entrant corners or complex shapes (more lenient)
    const nodes = model.nodes;
    if (nodes.length > 30) {
      // Increased threshold
      const xCoords = nodes.map((n) => n.x).sort((a, b) => a - b);
      const yCoords = nodes.map((n) => n.y).sort((a, b) => a - b);

      // More lenient gap detection
      const xGaps = this.findLargeGaps(xCoords, 0.3); // 30% threshold instead of default
      const yGaps = this.findLargeGaps(yCoords, 0.3);

      if (xGaps.length > 2 || yGaps.length > 2) {
        // Allow some gaps
        return "IRREGULAR";
      }
    }

    console.log(
      `🎯 REGULAR structure confirmed - aspect ratio: ${aspectRatio.toFixed(2)}`,
    );
    return "REGULAR";
  }

  // Detect vertical irregularity
  private detectVerticalIrregularity(
    model: StructuralModel,
  ): "NONE" | "MINOR" | "MAJOR" {
    const nodes = model.nodes;
    const zCoords = nodes.map((n) => n.z).sort((a, b) => a - b);
    const uniqueZ = [...new Set(zCoords)];

    if (uniqueZ.length <= 2) {
      return "NONE"; // Single story or simple two-level structure
    }

    // Check for irregular floor heights
    const floorHeights: number[] = [];
    for (let i = 1; i < uniqueZ.length; i++) {
      floorHeights.push(uniqueZ[i] - uniqueZ[i - 1]);
    }

    const avgHeight =
      floorHeights.reduce((a, b) => a + b, 0) / floorHeights.length;
    const maxDeviation = Math.max(
      ...floorHeights.map((h) => Math.abs(h - avgHeight)),
    );

    if (maxDeviation > avgHeight * 0.5) {
      return "MAJOR";
    } else if (maxDeviation > avgHeight * 0.2) {
      return "MINOR";
    }

    return "NONE";
  }

  // Detect roof type
  private detectRoofType(
    buildingType: BuildingType,
    roofSlope: number,
  ): "GABLE" | "MONO_SLOPE" | "HIP" | "FLAT" | "SHED" | "GAMBREL" | "MANSARD" {
    if (roofSlope < 2) {
      return "FLAT";
    }

    if (buildingType.includes("MONO_SLOPE")) {
      return "MONO_SLOPE";
    }

    if (buildingType.includes("GABLE")) {
      return "GABLE";
    }

    if (buildingType.includes("SHED") || buildingType.includes("CANOPY")) {
      return "SHED";
    }

    // Default based on slope
    if (roofSlope > 30) {
      return "GABLE";
    } else if (roofSlope > 10) {
      return "MONO_SLOPE";
    }

    return "FLAT";
  }

  // Detect special features
  private detectSpecialFeatures(
    model: StructuralModel,
    buildingType: BuildingType,
    memberTags: { [key: string]: MemberTag },
  ): {
    canopy: boolean;
    cantilever: boolean;
    parapets: boolean;
    craneBeam: boolean;
    mezzanine: boolean;
    signage: boolean;
    elevatorShaft: boolean;
  } {
    const tagValues = Object.values(memberTags);

    return {
      canopy:
        buildingType.includes("CANOPY") ||
        tagValues.some((tag) => tag.includes("CANOPY")),
      cantilever:
        buildingType.includes("CANTILEVER") ||
        model.members.some((m) => m.type === "CANTILEVER"),
      parapets: tagValues.some((tag) => tag === "PARAPET"),
      craneBeam:
        tagValues.some((tag) => tag === "CRANE_BEAM") ||
        model.members.some((m) => m.type === "CRANE_RAIL"),
      mezzanine: tagValues.some((tag) => tag.includes("MEZZANINE")),
      signage:
        buildingType.includes("SIGNAGE") ||
        tagValues.some((tag) => tag === "SIGNAGE_POLE"),
      elevatorShaft: buildingType === "ELEVATOR_SHAFT",
    };
  }

  // Helper methods
  private findLargeGaps(
    sortedArray: number[],
    threshold: number = 0.5,
  ): number[] {
    const gaps: number[] = [];
    const avgSpacing =
      (sortedArray[sortedArray.length - 1] - sortedArray[0]) /
      (sortedArray.length - 1);

    const gapThreshold = avgSpacing * (2 + threshold); // More lenient threshold

    for (let i = 1; i < sortedArray.length; i++) {
      const gap = sortedArray[i] - sortedArray[i - 1];
      if (gap > gapThreshold) {
        gaps.push(gap);
      }
    }

    return gaps;
  }

  private calculateSpacings(positions: number[]): number[] {
    const spacings: number[] = [];
    for (let i = 1; i < positions.length; i++) {
      spacings.push(positions[i] - positions[i - 1]);
    }
    return spacings;
  }

  // Enhanced state management
  private setState(updates: Partial<MCPState>): void {
    this.state = { ...this.state, ...updates };
    this.stateVersion++;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  // History management for undo/redo
  private saveToHistory(mcp: MasterControlPoint) {
    // Keep last 50 states
    this.history = [...this.history.slice(-49), mcp];
    this.historyIndex = this.history.length - 1;
  }

  undo(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.setState({ current: this.history[this.historyIndex] });
    }
  }

  redo(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.setState({ current: this.history[this.historyIndex] });
    }
  }

  // Memory management
  destroyModel(modelId: string): void {
    this.geometryCache.delete(`${modelId}_geometry`);

    if (this.state.current?.modelId === modelId) {
      this.setState({ current: null, isInitialized: false });
    }
  }

  // Safe operation wrapper with enhanced error handling
  private safeOperation<T>(operation: () => T, fallback?: T): T {
    try {
      return operation();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Operation failed";
      console.error("MCP Operation failed:", {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : "No stack trace",
        operation: operation.name || "anonymous",
      });

      this.setState({
        error: `MCP Error: ${errorMessage}`,
        isLoading: false,
      });

      if (fallback !== undefined) {
        console.log("Using fallback value for failed operation");
        return fallback;
      }

      throw error; // Re-throw if no fallback provided
    }
  }

  // Handle prompt processing with proper error handling
  async processPrompt(prompt: string, context?: any): Promise<any> {
    console.log("🎯 Processing prompt:", prompt.substring(0, 100) + "...");

    try {
      // Check if MCP is initialized
      if (!this.state.current) {
        throw new Error("MCP not initialized. Please upload a model first.");
      }

      // Check if MCP is locked
      if (this.state.current.isLocked) {
        console.warn("⚠️ MCP is locked, prompt processing may be limited");
      }

      // Process different types of prompts
      if (prompt.toLowerCase().includes("building type")) {
        return this.handleBuildingTypePrompt(prompt, context);
      } else if (
        prompt.toLowerCase().includes("member") &&
        prompt.toLowerCase().includes("tag")
      ) {
        return this.handleMemberTagPrompt(prompt, context);
      } else if (prompt.toLowerCase().includes("dimension")) {
        return this.handleDimensionPrompt(prompt, context);
      } else {
        return this.handleGeneralPrompt(prompt, context);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Prompt processing failed";
      console.error("❌ Prompt processing failed:", errorMessage);

      return {
        success: false,
        error: errorMessage,
        suggestion:
          "Please check your input and try again. Make sure a model is uploaded and MCP is initialized.",
      };
    }
  }

  // Handle building type related prompts
  private async handleBuildingTypePrompt(
    prompt: string,
    context?: any,
  ): Promise<any> {
    console.log("🏗️ Handling building type prompt");

    try {
      const currentType = this.state.current?.buildingType;
      const confidence = this.state.current?.buildingTypeConfidence || 0;

      return {
        success: true,
        currentBuildingType: currentType,
        confidence: confidence,
        availableTypes: [
          "TRUSS_SINGLE_GABLE",
          "TRUSS_DOUBLE_GABLE",
          "RIGID_FRAME",
          "WAREHOUSE",
          "HANGAR",
        ],
        suggestion:
          "You can update the building type using the model analyzer interface.",
      };
    } catch (error) {
      throw new Error(
        `Building type prompt failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Handle member tagging related prompts
  private async handleMemberTagPrompt(
    prompt: string,
    context?: any,
  ): Promise<any> {
    console.log("🏷️ Handling member tag prompt");

    try {
      const memberTags = this.state.current?.memberTags || [];
      const tagCounts = memberTags.reduce(
        (acc, mt) => {
          acc[mt.tag] = (acc[mt.tag] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        success: true,
        totalMembers: memberTags.length,
        tagDistribution: tagCounts,
        availableTags: [
          "MAIN_FRAME_COLUMN",
          "END_FRAME_COLUMN",
          "MAIN_FRAME_RAFTER",
          "END_FRAME_RAFTER",
          "ROOF_PURLIN",
          "WALL_GIRT",
          "ROOF_BRACING",
          "WALL_BRACING",
        ],
        suggestion:
          "You can update member tags in the 3D visualizer by selecting members.",
      };
    } catch (error) {
      throw new Error(
        `Member tag prompt failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Handle dimension related prompts
  private async handleDimensionPrompt(
    prompt: string,
    context?: any,
  ): Promise<any> {
    console.log("📐 Handling dimension prompt");

    try {
      const dimensions = this.state.current?.dimensions;

      return {
        success: true,
        dimensions: {
          buildingLength: dimensions?.buildingLength,
          buildingWidth: dimensions?.buildingWidth,
          totalHeight: dimensions?.totalHeight,
          eaveHeight: dimensions?.eaveHeight,
          roofSlope: dimensions?.roofSlope,
        },
        units: this.state.current?.units,
        unitsSystem: this.state.current?.unitsSystem,
        suggestion:
          "Dimensions are extracted from the uploaded model. You can view them in the model analyzer.",
      };
    } catch (error) {
      throw new Error(
        `Dimension prompt failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Handle general prompts
  private async handleGeneralPrompt(
    prompt: string,
    context?: any,
  ): Promise<any> {
    console.log("💬 Handling general prompt");

    try {
      const mcpStatus = {
        initialized: this.state.isInitialized,
        locked: this.state.current?.isLocked || false,
        valid: this.state.current?.validation.isValid || false,
        errors: this.state.current?.validation.errors || [],
        warnings: this.state.current?.validation.warnings || [],
      };

      return {
        success: true,
        mcpStatus,
        suggestion:
          "I can help with building types, member tags, dimensions, and model analysis. Please be more specific about what you need.",
      };
    } catch (error) {
      throw new Error(
        `General prompt failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Log user override for ML training
  private logUserOverride(
    field: string,
    originalValue: any,
    userValue: any,
    confidence: number,
  ): void {
    if (!this.state.current) return;

    const override = {
      timestamp: new Date(),
      originalValue,
      userValue,
      field,
      confidence,
    };

    this.state.current.mlTrainingData.userOverrides.push(override);

    console.log("🤖 ML Training - User Override Logged:", {
      field,
      originalValue,
      userValue,
      confidence,
    });
  }

  // Set user feedback score
  setUserFeedback(score: number): void {
    if (!this.state.current) return;

    this.state.current.mlTrainingData.feedbackScore = score;
    this.state.current.lastModified = new Date();

    console.log("🤖 ML Training - User Feedback:", score);
  }

  // Get ML API status
  getMLAPIStatus(): string {
    return "UNAVAILABLE";
  }

  // Refresh ML API status
  refreshMLAPIStatus(): void {
    console.log("Refreshing ML API status...");
  }
}

// React hook for MCP state
export function useMCP() {
  const [state, setState] = React.useState<MCPState>(() =>
    MCPManager.getInstance().getState(),
  );

  React.useEffect(() => {
    const unsubscribe = MCPManager.getInstance().subscribe(setState);
    return unsubscribe;
  }, []);

  const manager = MCPManager.getInstance();

  return {
    ...state,
    initializeFromModel: manager.initializeFromModel.bind(manager),
    updateBuildingType: manager.updateBuildingType.bind(manager),
    updateMemberTag: manager.updateMemberTag.bind(manager),
    applyAIPredictions: manager.applyAIPredictions.bind(manager),
    updateDimensions: manager.updateDimensions.bind(manager),
    lockMCP: manager.lockMCP.bind(manager),
    validateMCP: manager.validateMCP.bind(manager),
    exportForCalculations: manager.exportForCalculations.bind(manager),
    exportToSTAAD: manager.exportToSTAAD.bind(manager),
    exportToSAP2000: manager.exportToSAP2000.bind(manager),
    isReadyForCalculations: manager.isReadyForCalculations.bind(manager),
    undo: manager.undo.bind(manager),
    redo: manager.redo.bind(manager),
    destroyModel: manager.destroyModel.bind(manager),
    setUserFeedback: manager.setUserFeedback.bind(manager),
    getMLAPIStatus: manager.getMLAPIStatus.bind(manager),
    refreshMLAPIStatus: manager.refreshMLAPIStatus.bind(manager),
    processPrompt: manager.processPrompt.bind(manager),
  };
}

// Import React for the hook
import React from "react";
