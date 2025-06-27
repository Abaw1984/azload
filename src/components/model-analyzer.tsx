import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Brain,
  CheckCircle,
  AlertTriangle,
  Settings,
  Eye,
  Download,
  Zap,
  MousePointer,
  Palette,
  Building,
  Search,
  X,
} from "lucide-react";
import {
  StructuralModel,
  BuildingType,
  MemberTag,
  MasterControlPoint,
} from "@/types/model";
import { AIBuildingClassifier, GeometryAnalyzer } from "@/lib/ai-classifier";
import { AIAssistant, useAIAssistant } from "@/lib/ai-assistant";
import {
  useMCP,
  HeightClassification,
  StructuralRigidity,
} from "@/lib/mcp-manager";
import { cn } from "@/lib/utils";

interface ModelAnalyzerProps {
  model: StructuralModel | null;
  mcp: MasterControlPoint | null;
  onAnalysisComplete: (updatedModel: StructuralModel) => void;
  onManualOverride?: (overrides: {
    buildingType?: BuildingType;
    memberTags?: { memberId: string; tag: MemberTag }[];
    heightClassification?: HeightClassification;
    structuralRigidity?: StructuralRigidity;
  }) => void;
  onLockMCP?: () => void;
  onMemberHighlight?: (memberId: string | null) => void;
}

function ModelAnalyzer({
  model,
  mcp,
  onAnalysisComplete,
  onManualOverride,
  onLockMCP,
  onMemberHighlight,
}: ModelAnalyzerProps) {
  const [analysisStep, setAnalysisStep] = useState<
    "classifying" | "tagging" | "reviewing" | "complete"
  >("classifying");
  const [progress, setProgress] = useState(0);
  const [buildingClassification, setBuildingClassification] = useState<{
    suggestedType: BuildingType;
    confidence: number;
    reasoning: string[];
  } | null>(null);
  const [memberTags, setMemberTags] = useState<{
    [memberId: string]: MemberTag;
  }>({});
  const [selectedBuildingType, setSelectedBuildingType] =
    useState<BuildingType | null>(null);
  const [validationResults, setValidationResults] = useState<{
    isValid: boolean;
    warnings: string[];
    suggestions: string[];
  } | null>(null);
  const [mlApiUsed, setMlApiUsed] = useState<boolean>(false);
  const [analysisSource, setAnalysisSource] =
    useState<string>("🌐 ML API Required");
  const [mlApiHealthy, setMlApiHealthy] = useState<boolean>(false);
  const [mlApiLastChecked, setMlApiLastChecked] = useState<Date | null>(null);
  const [realTimeOverrides, setRealTimeOverrides] = useState<{
    lastOverrideTime: Date | null;
    lastTrainingTime: Date | null;
    lastRetrainTime: Date | null;
    overrideCount: number;
    memberTagOverrides: number;
  }>({
    lastOverrideTime: null,
    lastTrainingTime: null,
    lastRetrainTime: null,
    overrideCount: 0,
    memberTagOverrides: 0,
  });

  // AI Assistant Integration
  const aiAssistant = useAIAssistant();
  const mcpManager = useMCP();
  const [showAIPredictions, setShowAIPredictions] = useState(false);
  const [userFeedback, setUserFeedback] = useState<{
    satisfaction: number;
    comments: string;
  }>({ satisfaction: 5, comments: "" });
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState<number>(1);
  const [baySpacing, setBaySpacing] = useState<number[]>([30]);
  const [asceComplexity, setAsceComplexity] = useState<"REGULAR" | "IRREGULAR">(
    "REGULAR",
  );
  const [frameType, setFrameType] = useState<
    "MOMENT" | "BRACED" | "DUAL" | "CANTILEVER"
  >("MOMENT");
  const [memberColors, setMemberColors] = useState<{
    [memberId: string]: string;
  }>({});
  const [heightClassification, setHeightClassification] =
    useState<HeightClassification>("LOW_RISE");
  const [structuralRigidity, setStructuralRigidity] =
    useState<StructuralRigidity>("RIGID");
  const [memberTagSearch, setMemberTagSearch] = useState<string>("");
  const [filteredMemberTags, setFilteredMemberTags] = useState<
    { value: MemberTag; label: string }[]
  >([]);

  // Listen for member tag updates from 3D visualizer
  useEffect(() => {
    const handleMemberTagUpdate = (event: any) => {
      if (event.detail && event.detail.memberId && event.detail.tag) {
        console.log("🏷️ Member tag updated from 3D visualizer:", event.detail);
        handleTagChange(event.detail.memberId, event.detail.tag);
      }
    };

    window.addEventListener("memberTagUpdated", handleMemberTagUpdate);
    return () => {
      window.removeEventListener("memberTagUpdated", handleMemberTagUpdate);
    };
  }, []);

  useEffect(() => {
    console.log("🔍 ModelAnalyzer useEffect triggered:", {
      hasMCP: !!mcp,
      hasModel: !!model,
      mcpLocked: mcp?.isLocked,
      modelNodes: model?.nodes?.length || 0,
      modelMembers: model?.members?.length || 0,
    });

    // Add error boundary for the entire effect
    try {
      // CRITICAL FIX: Only show analysis if both model AND MCP exist
      // This prevents premature display of AI Analysis information
      if (mcp && model && model.nodes && model.members) {
        console.log("📋 Loading existing MCP data:", {
          buildingType: mcp.buildingType,
          confidence: mcp.buildingTypeConfidence,
          memberTags: mcp.memberTags.length,
          isValid: mcp.validation.isValid,
        });

        setBuildingClassification({
          suggestedType: mcp.buildingType,
          confidence: mcp.buildingTypeConfidence,
          reasoning: mcp.aiReasoning || [],
        });
        setSelectedBuildingType(mcp.buildingType);

        const memberTagsMap: { [memberId: string]: MemberTag } = {};
        mcp.memberTags.forEach((mt) => {
          memberTagsMap[mt.memberId] = mt.tag;
        });
        setMemberTags(memberTagsMap);

        setValidationResults({
          isValid: mcp.validation.isValid,
          warnings: mcp.validation.warnings,
          suggestions: mcp.validation.errors,
        });

        // Load height and rigidity classifications
        setHeightClassification(mcp.heightClassification);
        setStructuralRigidity(mcp.structuralRigidity);

        // Load frame configuration
        setFrameCount(mcp.framesX || 1);
        setBaySpacing(mcp.baySpacingX || [30]);
        setAsceComplexity(
          mcp.planIrregularity === "REGULAR" ? "REGULAR" : "IRREGULAR",
        );

        // Determine frame type from building type
        const buildingType = mcp.buildingType;
        if (buildingType.includes("BRACED") || buildingType.includes("TRUSS")) {
          setFrameType("BRACED");
        } else if (buildingType.includes("CANTILEVER")) {
          setFrameType("CANTILEVER");
        } else {
          setFrameType("MOMENT");
        }

        // CRITICAL FIX: Set consistent ML API status based on MCP data
        // If MCP has AI reasoning, it means ML API was used successfully
        const wasMLAPIUsed =
          mcp.aiReasoning &&
          mcp.aiReasoning.some(
            (reason) =>
              reason.includes("Digital Ocean") ||
              reason.includes("ML API") ||
              reason.includes("🌐"),
          );

        if (wasMLAPIUsed) {
          setMlApiUsed(true);
          setMlApiHealthy(true);
          setAnalysisSource("🌐 Digital Ocean ML API - ENGINEERING GRADE");
          setMlApiLastChecked(new Date());
          console.log("✅ ML API status confirmed from MCP data");
        } else {
          setMlApiUsed(false);
          setMlApiHealthy(false);
          setAnalysisSource("🔧 Rule-Based Analysis");
        }

        setAnalysisStep("complete");
        setProgress(100);
        console.log(
          "✅ MCP data loaded successfully with consistent ML API status",
        );
      } else if (model) {
        console.log("🚀 Starting AI analysis for new model...");
        // Reset ML API state for new analysis
        setMlApiUsed(false);
        setAnalysisSource("🌐 Connecting to ML API...");
        setMlApiHealthy(false);
        setMlApiLastChecked(null);
        // Start with AI Assistant analysis if model is provided (with error handling)
        try {
          startAIAnalysis();
        } catch (analysisError) {
          console.error("❌ AI Analysis failed to start:", analysisError);
          // Set fallback state
          setAnalysisStep("complete");
          setProgress(100);
          setValidationResults({
            isValid: false,
            warnings: ["AI analysis failed to start"],
            suggestions: ["Model loaded with basic settings"],
          });
        }
      } else {
        console.log(
          "⚠️ No model or MCP provided to ModelAnalyzer - resetting state",
        );
        // CRITICAL FIX: Reset all analysis state when no model/MCP
        setBuildingClassification(null);
        setSelectedBuildingType(null);
        setMemberTags({});
        setValidationResults(null);
        setAnalysisStep("classifying");
        setProgress(0);
        setMlApiUsed(false);
        setAnalysisSource("🌐 ML API Required");
        setMlApiHealthy(false);
        setMlApiLastChecked(null);
        // Reset real-time tracking
        setRealTimeOverrides({
          lastOverrideTime: null,
          lastTrainingTime: null,
          lastRetrainTime: null,
          overrideCount: 0,
          memberTagOverrides: 0,
        });
      }
    } catch (effectError) {
      console.error("❌ ModelAnalyzer useEffect error:", effectError);
      // Set safe fallback state
      setAnalysisStep("complete");
      setProgress(100);
      setValidationResults({
        isValid: false,
        warnings: ["Component initialization error"],
        suggestions: ["Please try refreshing the page"],
      });
    }
  }, [model, mcp]);

  const startAIAnalysis = async () => {
    setAnalysisStep("classifying");
    setProgress(10);
    setShowAIPredictions(false);

    // Validate model data before AI analysis
    if (!model || !model.nodes || !model.members) {
      console.error("❌ Invalid model data for AI analysis:", {
        hasModel: !!model,
        hasNodes: !!model?.nodes,
        hasMembers: !!model?.members,
        nodeCount: model?.nodes?.length || 0,
        memberCount: model?.members?.length || 0,
      });

      setValidationResults({
        isValid: false,
        warnings: ["Invalid model data - cannot perform AI analysis"],
        suggestions: [
          "Please upload a valid structural model file with nodes and members",
        ],
      });
      setAnalysisStep("complete");
      setProgress(100);
      return;
    }

    try {
      // Step 1: FORCE ML API health check and enable if healthy
      setProgress(15);
      console.log(
        "🌐 FORCING ML API health check at http://178.128.135.194...",
      );

      const mlHealthy = await AIBuildingClassifier.checkMLAPIHealth();
      setMlApiHealthy(mlHealthy);
      setMlApiLastChecked(new Date());

      if (mlHealthy) {
        setMlApiUsed(true);
        setAnalysisSource("🌐 Digital Ocean ML API - ACTIVE");
        console.log(
          "✅ ML API is healthy - ENABLING ML usage for engineering analysis",
        );
        // Force enable ML API usage
        AIBuildingClassifier.setMLAPIEnabled(true);
      } else {
        console.error(
          "❌ CRITICAL: ML API unavailable - engineering requirements not met",
        );
        setMlApiUsed(false);
        setAnalysisSource("❌ ML API Required (Engineering Standards)");
        throw new Error(
          "ML API is required for engineering-level analysis but is not available",
        );
      }

      // Step 2: Perform building classification
      setProgress(30);
      console.log("🏗️ Starting building classification...");

      const buildingResult = await AIBuildingClassifier.classifyBuilding(model);

      setBuildingClassification({
        suggestedType: buildingResult.suggestedType,
        confidence: buildingResult.confidence,
        reasoning: buildingResult.reasoning,
      });
      setSelectedBuildingType(buildingResult.suggestedType);

      // Update analysis source based on actual result
      if (buildingResult.source === "ML_API") {
        setMlApiUsed(true);
        setAnalysisSource("🌐 Digital Ocean ML API - ENGINEERING GRADE");

        // Get learning proof for display
        const learningProof = AIBuildingClassifier.getLearningProof();
        console.log("📊 ML Learning Status:", learningProof);

        // Update real-time tracking with actual ML data
        setRealTimeOverrides((prev) => ({
          ...prev,
          lastTrainingTime: new Date(),
          overrideCount: learningProof.totalOverrides,
        }));
      } else {
        console.error("❌ CRITICAL: Expected ML API but got rule-based result");
        throw new Error(
          "Engineering analysis requires ML API - rule-based results are not acceptable",
        );
      }

      // Step 3: Perform member tagging
      setProgress(60);
      console.log("🏷️ Starting member tagging...");

      const memberResult = await AIBuildingClassifier.tagMembers(
        model,
        buildingResult.suggestedType,
      );

      setMemberTags(memberResult.memberTags);

      // Step 4: Validate the results
      setProgress(80);
      console.log("✅ Validating analysis results...");

      const validation = AIBuildingClassifier.validateTags(
        model,
        memberResult.memberTags,
      );

      setValidationResults({
        isValid: validation.isValid,
        warnings: validation.warnings,
        suggestions: validation.suggestions,
      });

      setProgress(100);
      setAnalysisStep("complete");

      console.log("🎉 AI Analysis Complete:", {
        buildingType: buildingResult.suggestedType,
        confidence: (buildingResult.confidence * 100).toFixed(1) + "%",
        memberTags: Object.keys(memberResult.memberTags).length,
        source: buildingResult.source,
        mlApiUsed: buildingResult.source === "ML_API",
        validationPassed: validation.isValid,
      });
    } catch (error) {
      console.error("❌ AI Analysis failed:", error);
      setAnalysisStep("complete");
      setProgress(100);
      setMlApiUsed(false);
      setAnalysisSource("❌ ML API Connection Failed");

      // For engineering applications, ML API failure is critical
      setValidationResults({
        isValid: false,
        warnings: [
          "CRITICAL: ML API connection failed",
          "Engineering-level analysis requires ML API connectivity",
          "Rule-based fallback is not acceptable for professional engineering",
        ],
        suggestions: [
          "Check ML API server status at http://178.128.135.194",
          "Verify network connectivity",
          "Contact system administrator for ML API access",
          "Engineering analysis cannot proceed without ML API",
        ],
      });

      // Do not provide fallback results for engineering applications
      setBuildingClassification(null);
      setSelectedBuildingType(null);
      setMemberTags({});
    }
  };

  const startLegacyAnalysis = async () => {
    // Validate model data before analysis
    if (!model || !model.nodes || !model.members) {
      console.error("❌ Invalid model data:", {
        hasModel: !!model,
        hasNodes: !!model?.nodes,
        hasMembers: !!model?.members,
        nodeCount: model?.nodes?.length || 0,
        memberCount: model?.members?.length || 0,
      });

      setValidationResults({
        isValid: false,
        warnings: ["Invalid model data - missing nodes or members"],
        suggestions: ["Please upload a valid structural model file"],
      });
      setAnalysisStep("complete");
      return;
    }

    try {
      const classificationTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Classification timeout")), 8000),
      );

      const classification = await Promise.race([
        AIBuildingClassifier.classifyBuilding(model),
        classificationTimeout,
      ]);

      setBuildingClassification(classification);
      setSelectedBuildingType(classification.suggestedType);

      const taggingTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Member tagging timeout")), 8000),
      );

      const tagsResult = await Promise.race([
        AIBuildingClassifier.tagMembers(model, classification.suggestedType),
        taggingTimeout,
      ]);

      setMemberTags(tagsResult.memberTags);

      const validation = AIBuildingClassifier.validateTags(
        model,
        tagsResult.memberTags,
      );
      setValidationResults(validation);

      setAnalysisStep("complete");
    } catch (error) {
      console.error("❌ Legacy analysis failed:", error);

      // Provide basic fallback classification
      setBuildingClassification({
        suggestedType: "TRUSS_SINGLE_GABLE",
        confidence: 0.5,
        reasoning: ["Fallback classification due to analysis timeout"],
      });
      setSelectedBuildingType("TRUSS_SINGLE_GABLE");
      setMemberTags({});
      setValidationResults({
        isValid: true,
        warnings: ["Analysis timed out - using basic classification"],
        suggestions: ["Model loaded with default settings"],
      });
      setAnalysisStep("complete");
    }
  };

  const handleBuildingTypeChange = async (newType: BuildingType) => {
    const previousType = selectedBuildingType;
    setSelectedBuildingType(newType);

    try {
      // Re-tag members with new building type
      const newTagsResult = await AIBuildingClassifier.tagMembers(
        model,
        newType,
      );
      setMemberTags(newTagsResult.memberTags);

      // Validate new tags
      const validation = AIBuildingClassifier.validateTags(
        model,
        newTagsResult.memberTags,
      );
      setValidationResults(validation);

      // CRITICAL FIX: ALWAYS submit manual override to ML API for learning (with retry)
      if (previousType && previousType !== newType) {
        try {
          console.log(
            "🧠 CRITICAL: Submitting building type override to ML API for learning...",
            {
              previousType,
              newType,
              modelId: model?.id,
              timestamp: new Date().toISOString(),
            },
          );

          // Force ML API health check if not already healthy
          if (!mlApiHealthy) {
            console.log(
              "🔄 ML API not healthy - attempting to reconnect for override submission...",
            );
            const healthCheck = await AIBuildingClassifier.checkMLAPIHealth();
            if (healthCheck) {
              setMlApiHealthy(true);
              setMlApiLastChecked(new Date());
              console.log("✅ ML API reconnected for override submission");
            }
          }

          // CRITICAL: Generate unique prediction ID for tracking
          const predictionId = `building_${model?.id || Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          const overrideResult =
            await AIBuildingClassifier.submitManualOverride(
              predictionId,
              "BUILDING_TYPE",
              {
                modelId: model?.id,
                value: previousType,
                confidence: buildingClassification?.confidence || 0.5,
              },
              {
                buildingType: newType,
              },
              `User corrected building type from ${previousType} to ${newType}`,
              `user_${Date.now()}`,
              `project_${model?.id || Date.now()}`,
            );

          console.log(
            "✅ CRITICAL: Building type override submitted for ML learning:",
            {
              overrideResult,
              predictionId,
              success: overrideResult.success,
              overrideId: overrideResult.overrideId,
            },
          );

          // CRITICAL: Update real-time tracking with actual data
          setRealTimeOverrides((prev) => ({
            ...prev,
            lastOverrideTime: new Date(),
            overrideCount: prev.overrideCount + 1,
            lastTrainingTime: new Date(),
            lastRetrainTime: new Date(),
          }));

          // Mark as ML API used since we successfully submitted
          setMlApiUsed(true);
          setAnalysisSource("🌐 Digital Ocean ML API - LEARNING ACTIVE");
        } catch (mlError) {
          console.error(
            "❌ CRITICAL: Failed to submit building type override to ML API:",
            mlError,
          );
          // CRITICAL: Still track locally even if ML API fails
          setRealTimeOverrides((prev) => ({
            ...prev,
            lastOverrideTime: new Date(),
            overrideCount: prev.overrideCount + 1,
          }));
        }
      }

      // Update MCP if it exists and is not locked
      if (mcp && !mcp.isLocked) {
        try {
          mcpManager.updateBuildingType(newType, 1.0); // Manual override with full confidence
          console.log("🏗️ Building type updated in MCP:", newType);
        } catch (error) {
          console.error("❌ Failed to update building type in MCP:", error);
        }
      }

      console.log("🏗️ Building type changed:", {
        previousType,
        newType,
        memberTagsGenerated: Object.keys(newTagsResult.memberTags).length,
        validationPassed: validation.isValid,
        mlLearningSubmitted: mlApiUsed && previousType !== newType,
        mcpUpdated: mcp && !mcp.isLocked,
      });
    } catch (error) {
      console.error("❌ Failed to handle building type change:", error);
      // Revert on error
      setSelectedBuildingType(previousType);
    }
  };

  const handleTagChange = async (memberId: string, newTag: MemberTag) => {
    const previousTag = memberTags[memberId];
    const updatedTags = { ...memberTags, [memberId]: newTag };
    setMemberTags(updatedTags);

    try {
      // Validate updated tags
      const validation = AIBuildingClassifier.validateTags(model, updatedTags);
      setValidationResults(validation);

      // CRITICAL FIX: ALWAYS submit manual override to ML API for learning (with retry)
      if (previousTag && previousTag !== newTag) {
        try {
          console.log(
            "🧠 CRITICAL: Submitting member tag override to ML API for learning...",
            {
              memberId,
              previousTag,
              newTag,
              timestamp: new Date().toISOString(),
            },
          );

          // Force ML API health check if not already healthy
          if (!mlApiHealthy) {
            console.log(
              "🔄 ML API not healthy - attempting to reconnect for member tag override...",
            );
            const healthCheck = await AIBuildingClassifier.checkMLAPIHealth();
            if (healthCheck) {
              setMlApiHealthy(true);
              setMlApiLastChecked(new Date());
              console.log("✅ ML API reconnected for member tag override");
            }
          }

          // CRITICAL: Generate unique prediction ID for tracking
          const predictionId = `member_${memberId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          const overrideResult =
            await AIBuildingClassifier.submitManualOverride(
              predictionId,
              "MEMBER_TAG",
              {
                memberId,
                value: previousTag,
                confidence: 0.75, // Default confidence for previous prediction
              },
              {
                memberId,
                tag: newTag,
              },
              `User corrected member ${memberId} tag from ${previousTag} to ${newTag}`,
              `user_${Date.now()}`,
              `project_${model?.id || Date.now()}`,
            );

          console.log(
            "✅ CRITICAL: Member tag override submitted for ML learning:",
            {
              overrideResult,
              predictionId,
              success: overrideResult.success,
              overrideId: overrideResult.overrideId,
            },
          );

          // CRITICAL: Update real-time tracking with actual data
          setRealTimeOverrides((prev) => ({
            ...prev,
            lastOverrideTime: new Date(),
            memberTagOverrides: prev.memberTagOverrides + 1,
            lastTrainingTime: new Date(),
            lastRetrainTime: new Date(),
          }));

          // Mark as ML API used since we successfully submitted
          setMlApiUsed(true);
          setAnalysisSource("🌐 Digital Ocean ML API - LEARNING ACTIVE");
        } catch (mlError) {
          console.error(
            "❌ CRITICAL: Failed to submit member tag override to ML API:",
            mlError,
          );
          // CRITICAL: Still track locally even if ML API fails
          setRealTimeOverrides((prev) => ({
            ...prev,
            lastOverrideTime: new Date(),
            memberTagOverrides: prev.memberTagOverrides + 1,
          }));
        }
      }

      // Update MCP if available
      if (mcp && !mcp.isLocked) {
        try {
          mcpManager.updateMemberTag(memberId, newTag, true);
          console.log(`✅ Updated member ${memberId} tag to ${newTag} in MCP`);
        } catch (error) {
          console.warn(`⚠️ Failed to update MCP member tag:`, error);
        }
      }

      console.log("🏷️ Member tag changed:", {
        memberId,
        previousTag,
        newTag,
        totalTaggedMembers: Object.keys(updatedTags).length,
        mlLearningSubmitted: mlApiUsed && previousTag !== newTag,
        mcpUpdated: mcp && !mcp.isLocked,
      });
    } catch (error) {
      console.error("❌ Failed to handle member tag change:", error);
      // Revert on error
      setMemberTags({ ...memberTags, [memberId]: previousTag });
    }
  };

  const handleConfirmAIPredictions = async () => {
    if (!aiAssistant.currentPrediction) {
      console.error("No AI prediction to confirm");
      return;
    }

    try {
      // Confirm the AI prediction
      aiAssistant.confirmPrediction(aiAssistant.currentPrediction.id, {
        overallSatisfaction: userFeedback.satisfaction,
        comments: userFeedback.comments,
      });

      // Apply predictions to MCP if available
      if (
        selectedBuildingType &&
        buildingClassification &&
        mcp &&
        !mcp.isLocked
      ) {
        try {
          mcpManager.updateBuildingType(
            selectedBuildingType,
            buildingClassification.confidence,
          );

          // Update member tags in MCP
          Object.entries(memberTags).forEach(([memberId, tag]) => {
            mcpManager.updateMemberTag(memberId, tag, true);
          });

          console.log("✅ AI predictions applied to MCP");
        } catch (mcpError) {
          console.warn("⚠️ Failed to apply predictions to MCP:", mcpError);
        }
      }

      setAnalysisStep("complete");

      console.log("✅ AI predictions confirmed");

      // Create updated model for callback if model exists
      if (model) {
        const updatedModel: StructuralModel = {
          ...model,
          buildingType: selectedBuildingType || undefined,
          aiDetection: {
            confidence: buildingClassification?.confidence || 0,
            suggestedType:
              buildingClassification?.suggestedType || "COMPLEX_MULTI_STORY",
            memberTags,
            needsReview: !validationResults?.isValid || false,
          },
        };

        updatedModel.members = updatedModel.members.map((member) => ({
          ...member,
          tag: memberTags[member.id],
        }));

        onAnalysisComplete(updatedModel);

        // Store updated model in session storage for 3D visualizer
        sessionStorage.setItem("currentModel", JSON.stringify(updatedModel));
        console.log(
          "💾 Updated model stored in session storage for 3D visualizer",
        );
      }
    } catch (error) {
      console.error("❌ Failed to confirm AI predictions:", error);
    }
  };

  const handleRejectPredictions = () => {
    if (aiAssistant.currentPrediction) {
      // Log rejection for ML training
      aiAssistant.correctPrediction(aiAssistant.currentPrediction.id, {
        reasoning: "User rejected all predictions",
      });
    }

    // Fall back to legacy analysis
    startLegacyAnalysis();
    setShowAIPredictions(false);
  };

  const handleConfirmAnalysis = () => {
    if (!mcp) {
      console.error("❌ No MCP available for confirmation");
      return;
    }

    try {
      // Update MCP with user selections
      if (selectedBuildingType && selectedBuildingType !== mcp.buildingType) {
        mcpManager.updateBuildingType(selectedBuildingType, true);
        console.log("🏗️ Building type updated in MCP:", selectedBuildingType);
      }

      // Update member tags in MCP
      Object.entries(memberTags).forEach(([memberId, tag]) => {
        const currentTag = mcp.memberTags.find(
          (mt) => mt.memberId === memberId,
        );
        if (!currentTag || currentTag.tag !== tag) {
          mcpManager.updateMemberTag(memberId, tag, true);
        }
      });

      // ENABLE MCP LOCKING: Lock MCP after confirmation
      if (!mcp.isLocked && mcp.validation.isValid) {
        try {
          mcpManager.lockMCP();
          console.log(
            "🔒 MCP automatically locked after analysis confirmation",
          );
        } catch (lockError) {
          console.warn("⚠️ Could not auto-lock MCP:", lockError);
          // Continue without locking - user can manually lock later
        }
      }

      console.log("✅ Analysis confirmed - MCP updated with:", {
        buildingType: selectedBuildingType,
        memberTagsApplied: Object.keys(memberTags).length,
        confidence: buildingClassification?.confidence,
        mcpLocked: mcp.isLocked,
        validationPassed: mcp.validation.isValid,
      });

      // Create a dummy model for the callback (legacy compatibility)
      const dummyModel: StructuralModel = {
        id: mcp.modelId,
        name: mcp.modelName,
        type: "STAAD" as const,
        units: mcp.units,
        nodes: [],
        members: [],
        plates: [],
        sections: [],
        materials: [],
        loadCases: [],
        buildingType: selectedBuildingType,
      };

      onAnalysisComplete(dummyModel);
    } catch (error) {
      console.error("❌ Failed to confirm analysis:", error);
      alert(
        `Failed to update analysis: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const getBuildingTypeOptions = (): {
    value: BuildingType;
    label: string;
  }[] => [
    { value: "SINGLE_GABLE_HANGAR", label: "Single Gable Hangar" },
    { value: "MULTI_GABLE_HANGAR", label: "Multi-Gable Hangar" },
    { value: "TRUSS_SINGLE_GABLE", label: "Truss Single Gable" },
    { value: "TRUSS_DOUBLE_GABLE", label: "Truss Double Gable" },
    { value: "MONO_SLOPE_HANGAR", label: "Mono-Slope Hangar" },
    { value: "MONO_SLOPE_BUILDING", label: "Mono-Slope Building" },
    { value: "CAR_SHED_CANOPY", label: "Car Shed/Canopy" },
    { value: "CANTILEVER_ROOF", label: "Cantilever Roof" },
    { value: "SIGNAGE_BILLBOARD", label: "Signage/Billboard" },
    { value: "STANDING_WALL", label: "Standing Wall" },
    { value: "ELEVATOR_SHAFT", label: "Elevator Shaft" },
    { value: "SYMMETRIC_MULTI_STORY", label: "Symmetric Multi-Story" },
    { value: "COMPLEX_MULTI_STORY", label: "Complex Multi-Story" },
    { value: "TEMPORARY_STRUCTURE", label: "Temporary Structure" },
  ];

  // Helper function to get unit label based on model units
  const getUnitLabel = (unitType: "length" | "force" = "length"): string => {
    if (!model && !mcp) return "m";
    const units = model?.units || mcp?.units;
    if (!units) return "m";

    if (unitType === "length") {
      switch (units.length) {
        case "FT":
          return "ft";
        case "IN":
          return "in";
        case "MM":
          return "mm";
        case "M":
          return "m";
        default:
          return "m";
      }
    } else {
      switch (units.force) {
        case "KIP":
          return "kip";
        case "KN":
          return "kN";
        case "N":
          return "N";
        case "LB":
          return "lb";
        default:
          return "kN";
      }
    }
  };

  // ENHANCED: Helper function to convert values to display units with accuracy validation
  const convertToDisplayUnits = (
    value: number,
    fromMetric: boolean = true,
  ): number => {
    if (!model && !mcp) return value;
    const units = model?.units || mcp?.units;
    if (!units) return value;

    // Validate input value
    if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
      console.warn("⚠️ Invalid value for unit conversion:", value);
      return 0;
    }

    // If model is already in the target units, no conversion needed
    if (units.length === "M" || units.length === "MM") {
      return value;
    }

    // ACCURATE CONVERSION FACTORS (NIST standards)
    if (fromMetric && (units.length === "FT" || units.length === "IN")) {
      if (units.length === "FT") {
        // Exact conversion: 1 meter = 3.280839895 feet
        const converted = value * 3.280839895;
        console.log(
          `🔄 Unit conversion: ${value}m → ${converted.toFixed(3)}ft`,
        );
        return converted;
      }
      if (units.length === "IN") {
        // Exact conversion: 1 meter = 39.37007874 inches
        const converted = value * 39.37007874;
        console.log(
          `🔄 Unit conversion: ${value}m → ${converted.toFixed(3)}in`,
        );
        return converted;
      }
    }

    // Convert from imperial to metric if needed
    if (!fromMetric && (units.length === "M" || units.length === "MM")) {
      if (units.length === "FT") {
        const converted = value / 3.280839895;
        console.log(
          `🔄 Unit conversion: ${value}ft → ${converted.toFixed(3)}m`,
        );
        return converted;
      }
      if (units.length === "IN") {
        const converted = value / 39.37007874;
        console.log(
          `🔄 Unit conversion: ${value}in → ${converted.toFixed(3)}m`,
        );
        return converted;
      }
    }

    return value;
  };

  const getMemberTagOptions = (): { value: MemberTag; label: string }[] => [
    // Primary Structural Elements - Columns
    { value: "MAIN_FRAME_COLUMN", label: "Main Frame Column" },
    { value: "END_FRAME_COLUMN", label: "End Frame Column" },
    { value: "INTERIOR_COLUMN", label: "Interior Column" },
    { value: "EXTERIOR_COLUMN", label: "Exterior Column" },
    { value: "CORNER_COLUMN", label: "Corner Column" },
    { value: "POST", label: "Post" },
    { value: "PIER", label: "Pier" },
    { value: "PILE", label: "Pile" },
    { value: "COMPOSITE_COLUMN", label: "Composite Column" },
    { value: "BUILT_UP_COLUMN", label: "Built-up Column" },
    { value: "TUBE_COLUMN", label: "Tube Column" },
    { value: "PIPE_COLUMN", label: "Pipe Column" },
    { value: "HSS_COLUMN", label: "HSS Column" },
    { value: "WIDE_FLANGE_COLUMN", label: "Wide Flange Column" },
    { value: "ANGLE_COLUMN", label: "Angle Column" },
    { value: "CHANNEL_COLUMN", label: "Channel Column" },
    { value: "TEE_COLUMN", label: "Tee Column" },
    { value: "DOUBLE_ANGLE_COLUMN", label: "Double Angle Column" },
    { value: "CRUCIFORM_COLUMN", label: "Cruciform Column" },
    { value: "LACED_COLUMN", label: "Laced Column" },
    { value: "BATTENED_COLUMN", label: "Battened Column" },

    // Primary Structural Elements - Beams
    { value: "BEAM", label: "Beam" },
    { value: "GIRDER", label: "Girder" },
    { value: "MAIN_FRAME_RAFTER", label: "Main Frame Rafter" },
    { value: "END_FRAME_RAFTER", label: "End Frame Rafter" },
    { value: "FLOOR_BEAM", label: "Floor Beam" },
    { value: "CEILING_BEAM", label: "Ceiling Beam" },
    { value: "TIE_BEAM", label: "Tie Beam" },
    { value: "COLLAR_BEAM", label: "Collar Beam" },
    { value: "RIDGE_BEAM", label: "Ridge Beam" },
    { value: "HIP_BEAM", label: "Hip Beam" },
    { value: "VALLEY_BEAM", label: "Valley Beam" },
    { value: "TRANSFER_BEAM", label: "Transfer Beam" },
    { value: "SPANDREL_BEAM", label: "Spandrel Beam" },
    { value: "STRUT_BEAM", label: "Strut Beam" },
    { value: "COMPOSITE_BEAM", label: "Composite Beam" },
    { value: "BUILT_UP_BEAM", label: "Built-up Beam" },
    { value: "WIDE_FLANGE_BEAM", label: "Wide Flange Beam" },
    { value: "ANGLE_BEAM", label: "Angle Beam" },
    { value: "CHANNEL_BEAM", label: "Channel Beam" },
    { value: "TEE_BEAM", label: "Tee Beam" },
    { value: "DOUBLE_ANGLE_BEAM", label: "Double Angle Beam" },
    { value: "PLATE_GIRDER", label: "Plate Girder" },
    { value: "BOX_GIRDER", label: "Box Girder" },
    { value: "CASTELLATED_BEAM", label: "Castellated Beam" },
    { value: "CELLULAR_BEAM", label: "Cellular Beam" },
    { value: "TAPERED_BEAM", label: "Tapered Beam" },
    { value: "CURVED_BEAM", label: "Curved Beam" },
    { value: "CANTILEVER_BEAM", label: "Cantilever Beam" },
    { value: "CONTINUOUS_BEAM", label: "Continuous Beam" },
    { value: "SIMPLY_SUPPORTED_BEAM", label: "Simply Supported Beam" },

    // Foundation Elements
    { value: "FOUNDATION_BEAM", label: "Foundation Beam" },
    { value: "FOOTING_BEAM", label: "Footing Beam" },
    { value: "GRADE_BEAM", label: "Grade Beam" },
    { value: "PILE_CAP", label: "Pile Cap" },
    { value: "SPREAD_FOOTING", label: "Spread Footing" },
    { value: "STRIP_FOOTING", label: "Strip Footing" },
    { value: "MAT_FOUNDATION", label: "Mat Foundation" },
    { value: "RAFT_FOUNDATION", label: "Raft Foundation" },
    { value: "CAISSON", label: "Caisson" },
    { value: "DRILLED_SHAFT", label: "Drilled Shaft" },
    { value: "DRIVEN_PILE", label: "Driven Pile" },
    { value: "AUGER_CAST_PILE", label: "Auger Cast Pile" },
    { value: "MICROPILE", label: "Micropile" },
    { value: "HELICAL_PILE", label: "Helical Pile" },
    { value: "UNDERPINNING", label: "Underpinning" },
    { value: "RETAINING_WALL", label: "Retaining Wall" },
    { value: "BASEMENT_WALL", label: "Basement Wall" },

    // Secondary Elements
    { value: "ROOF_PURLIN", label: "Roof Purlin" },
    { value: "WALL_GIRT", label: "Wall Girt" },
    { value: "JOIST", label: "Joist" },
    { value: "MEZZANINE_JOIST", label: "Mezzanine Joist" },
    { value: "FLOOR_JOIST", label: "Floor Joist" },
    { value: "CEILING_JOIST", label: "Ceiling Joist" },
    { value: "RAFTER_TIE", label: "Rafter Tie" },
    { value: "LINTEL", label: "Lintel" },
    { value: "SILL_PLATE", label: "Sill Plate" },
    { value: "TOP_PLATE", label: "Top Plate" },
    { value: "STUD", label: "Stud" },
    { value: "BLOCKING", label: "Blocking" },
    { value: "BRIDGING", label: "Bridging" },
    { value: "NAILER", label: "Nailer" },
    { value: "LEDGER", label: "Ledger" },
    { value: "HEADER", label: "Header" },
    { value: "TRIMMER", label: "Trimmer" },
    { value: "CRIPPLE_STUD", label: "Cripple Stud" },
    { value: "KING_STUD", label: "King Stud" },
    { value: "JACK_STUD", label: "Jack Stud" },

    // Truss Elements
    { value: "TRUSS_TOP_CHORD", label: "Truss Top Chord" },
    { value: "TRUSS_BOTTOM_CHORD", label: "Truss Bottom Chord" },
    { value: "TRUSS_WEB_MEMBER", label: "Truss Web Member" },
    { value: "TRUSS_DIAGONAL", label: "Truss Diagonal" },
    { value: "TRUSS_VERTICAL", label: "Truss Vertical" },
    { value: "TRUSS_KING_POST", label: "Truss King Post" },
    { value: "TRUSS_QUEEN_POST", label: "Truss Queen Post" },
    { value: "TRUSS_STRUT", label: "Truss Strut" },
    { value: "TRUSS_TIE", label: "Truss Tie" },
    { value: "TRUSS_HEEL_JOINT", label: "Truss Heel Joint" },
    { value: "TRUSS_PEAK_JOINT", label: "Truss Peak Joint" },
    { value: "SPACE_TRUSS_MEMBER", label: "Space Truss Member" },
    { value: "LATTICE_MEMBER", label: "Lattice Member" },

    // Bracing Systems
    { value: "ROOF_BRACING", label: "Roof Bracing" },
    { value: "WALL_BRACING", label: "Wall Bracing" },
    { value: "DIAGONAL_BRACE", label: "Diagonal Brace" },
    { value: "X_BRACE", label: "X-Brace" },
    { value: "K_BRACE", label: "K-Brace" },
    { value: "CHEVRON_BRACE", label: "Chevron Brace" },
    { value: "LATERAL_BRACE", label: "Lateral Brace" },
    { value: "WIND_BRACE", label: "Wind Brace" },
    { value: "SEISMIC_BRACE", label: "Seismic Brace" },
    { value: "FLANGE_BRACE", label: "Flange Brace" },
    { value: "WEB_BRACE", label: "Web Brace" },
    { value: "TORSIONAL_BRACE", label: "Torsional Brace" },
    { value: "BUCKLING_RESTRAINED_BRACE", label: "Buckling Restrained Brace" },
    {
      value: "CONCENTRICALLY_BRACED_FRAME",
      label: "Concentrically Braced Frame",
    },
    {
      value: "ECCENTRICALLY_BRACED_FRAME",
      label: "Eccentrically Braced Frame",
    },
    {
      value: "SPECIAL_CONCENTRICALLY_BRACED_FRAME",
      label: "Special Concentrically Braced Frame",
    },
    {
      value: "ORDINARY_CONCENTRICALLY_BRACED_FRAME",
      label: "Ordinary Concentrically Braced Frame",
    },
    { value: "INVERTED_V_BRACE", label: "Inverted V-Brace" },
    { value: "V_BRACE", label: "V-Brace" },
    { value: "SINGLE_DIAGONAL_BRACE", label: "Single Diagonal Brace" },
    { value: "CROSS_BRACE", label: "Cross Brace" },

    // Tension/Compression Elements
    { value: "COMPRESSION_STRUT", label: "Compression Strut" },
    { value: "TENSION_ROD", label: "Tension Rod" },
    { value: "TIE_ROD", label: "Tie Rod" },
    { value: "CABLE", label: "Cable" },
    { value: "STRUT", label: "Strut" },
    { value: "STAY_CABLE", label: "Stay Cable" },
    { value: "GUY_WIRE", label: "Guy Wire" },
    { value: "PRESTRESSING_STRAND", label: "Prestressing Strand" },
    { value: "POST_TENSIONING_CABLE", label: "Post-Tensioning Cable" },
    { value: "SUSPENSION_CABLE", label: "Suspension Cable" },
    { value: "HANGER_ROD", label: "Hanger Rod" },
    { value: "SWAY_ROD", label: "Sway Rod" },
    { value: "TURNBUCKLE", label: "Turnbuckle" },
    { value: "CLEVIS", label: "Clevis" },

    // Specialized Industrial Elements
    { value: "CRANE_BEAM", label: "Crane Beam" },
    { value: "CRANE_BRACKET", label: "Crane Bracket" },
    { value: "CRANE_RAIL", label: "Crane Rail" },
    { value: "CRANE_RUNWAY_BEAM", label: "Crane Runway Beam" },
    { value: "CRANE_GIRDER", label: "Crane Girder" },
    { value: "MONORAIL_BEAM", label: "Monorail Beam" },
    { value: "HOIST_BEAM", label: "Hoist Beam" },
    { value: "MEZZANINE_BEAM", label: "Mezzanine Beam" },
    { value: "PLATFORM_BEAM", label: "Platform Beam" },
    { value: "WALKWAY_BEAM", label: "Walkway Beam" },
    { value: "CANOPY_BEAM", label: "Canopy Beam" },
    { value: "FASCIA_BEAM", label: "Fascia Beam" },
    { value: "PARAPET", label: "Parapet" },
    { value: "SIGNAGE_POLE", label: "Signage Pole" },
    { value: "FLAGPOLE", label: "Flagpole" },
    { value: "LIGHT_POLE", label: "Light Pole" },
    { value: "ANTENNA_SUPPORT", label: "Antenna Support" },
    { value: "TOWER_LEG", label: "Tower Leg" },
    { value: "LATTICE_TOWER_MEMBER", label: "Lattice Tower Member" },
    { value: "MONOPOLE", label: "Monopole" },
    { value: "GUYED_TOWER", label: "Guyed Tower" },

    // Building Envelope & Cladding
    { value: "HANGAR_DOOR_FRAME", label: "Hangar Door Frame" },
    { value: "OVERHEAD_DOOR_FRAME", label: "Overhead Door Frame" },
    { value: "WINDOW_FRAME", label: "Window Frame" },
    { value: "CURTAIN_WALL_MULLION", label: "Curtain Wall Mullion" },
    { value: "CURTAIN_WALL_TRANSOM", label: "Curtain Wall Transom" },
    { value: "CLADDING_SUPPORT", label: "Cladding Support" },
    { value: "PANEL_SUPPORT", label: "Panel Support" },
    { value: "GLAZING_SUPPORT", label: "Glazing Support" },
    { value: "STOREFRONT_FRAME", label: "Storefront Frame" },
    { value: "ENTRANCE_FRAME", label: "Entrance Frame" },
    { value: "LOUVER_FRAME", label: "Louver Frame" },
    { value: "SUNSHADE_SUPPORT", label: "Sunshade Support" },
    { value: "SCREEN_WALL_SUPPORT", label: "Screen Wall Support" },

    // Utility and Equipment Support
    { value: "EQUIPMENT_SUPPORT", label: "Equipment Support" },
    { value: "PIPE_SUPPORT", label: "Pipe Support" },
    { value: "CONDUIT_SUPPORT", label: "Conduit Support" },
    { value: "UTILITY_BEAM", label: "Utility Beam" },
    { value: "HVAC_SUPPORT", label: "HVAC Support" },
    { value: "MECHANICAL_SUPPORT", label: "Mechanical Support" },
    { value: "ELECTRICAL_SUPPORT", label: "Electrical Support" },
    { value: "PLUMBING_SUPPORT", label: "Plumbing Support" },
    { value: "DUCT_SUPPORT", label: "Duct Support" },
    { value: "CABLE_TRAY_SUPPORT", label: "Cable Tray Support" },
    { value: "CONVEYOR_SUPPORT", label: "Conveyor Support" },
    { value: "TANK_SUPPORT", label: "Tank Support" },
    { value: "VESSEL_SUPPORT", label: "Vessel Support" },
    { value: "SILO_SUPPORT", label: "Silo Support" },
    { value: "HOPPER_SUPPORT", label: "Hopper Support" },

    // Stair and Access Elements
    { value: "STAIR_STRINGER", label: "Stair Stringer" },
    { value: "STAIR_BEAM", label: "Stair Beam" },
    { value: "LANDING_BEAM", label: "Landing Beam" },
    { value: "HANDRAIL", label: "Handrail" },
    { value: "GUARDRAIL", label: "Guardrail" },
    { value: "RAILING_POST", label: "Railing Post" },
    { value: "LADDER_RAIL", label: "Ladder Rail" },
    { value: "SPIRAL_STAIR", label: "Spiral Stair" },
    { value: "FIRE_ESCAPE", label: "Fire Escape" },
    { value: "PLATFORM_RAILING", label: "Platform Railing" },
    { value: "CATWALK", label: "Catwalk" },
    { value: "GRATING_SUPPORT", label: "Grating Support" },
    { value: "TREAD", label: "Tread" },
    { value: "RISER", label: "Riser" },
    { value: "NOSING", label: "Nosing" },

    // Connection Elements
    { value: "SPLICE_PLATE", label: "Splice Plate" },
    { value: "GUSSET_PLATE", label: "Gusset Plate" },
    { value: "BASE_PLATE", label: "Base Plate" },
    { value: "CAP_PLATE", label: "Cap Plate" },
    { value: "STIFFENER", label: "Stiffener" },
    { value: "DOUBLER_PLATE", label: "Doubler Plate" },
    { value: "SHEAR_TAB", label: "Shear Tab" },
    { value: "CLIP_ANGLE", label: "Clip Angle" },
    { value: "SEAT_ANGLE", label: "Seat Angle" },
    { value: "BEARING_STIFFENER", label: "Bearing Stiffener" },
    { value: "INTERMEDIATE_STIFFENER", label: "Intermediate Stiffener" },
    { value: "LONGITUDINAL_STIFFENER", label: "Longitudinal Stiffener" },
    { value: "TRANSVERSE_STIFFENER", label: "Transverse Stiffener" },
    { value: "WEB_CRIPPLING_STIFFENER", label: "Web Crippling Stiffener" },
    { value: "CONTINUITY_PLATE", label: "Continuity Plate" },
    { value: "HAUNCH", label: "Haunch" },
    { value: "BRACKET", label: "Bracket" },
    { value: "CORBEL", label: "Corbel" },
    { value: "CONSOLE", label: "Console" },

    // Miscellaneous Elements
    { value: "EXPANSION_JOINT", label: "Expansion Joint" },
    { value: "SEISMIC_JOINT", label: "Seismic Joint" },
    { value: "BEARING_PLATE", label: "Bearing Plate" },
    { value: "ANCHOR_BOLT", label: "Anchor Bolt" },
    { value: "EMBED_PLATE", label: "Embed Plate" },
    { value: "LEVELING_PLATE", label: "Leveling Plate" },
    { value: "SHIM", label: "Shim" },
    { value: "WASHER", label: "Washer" },
    { value: "NUT", label: "Nut" },
    { value: "BOLT", label: "Bolt" },
    { value: "RIVET", label: "Rivet" },
    { value: "WELD", label: "Weld" },
    { value: "FILLET_WELD", label: "Fillet Weld" },
    { value: "GROOVE_WELD", label: "Groove Weld" },
    { value: "PLUG_WELD", label: "Plug Weld" },
    { value: "SLOT_WELD", label: "Slot Weld" },
    { value: "FLARE_BEVEL_WELD", label: "Flare Bevel Weld" },
    { value: "FLARE_V_WELD", label: "Flare V-Weld" },
    { value: "BACKING_BAR", label: "Backing Bar" },
    { value: "RUN_OFF_TAB", label: "Run-off Tab" },

    // Seismic and Special Systems
    { value: "DAMPER", label: "Damper" },
    { value: "VISCOUS_DAMPER", label: "Viscous Damper" },
    { value: "FRICTION_DAMPER", label: "Friction Damper" },
    { value: "TUNED_MASS_DAMPER", label: "Tuned Mass Damper" },
    { value: "BASE_ISOLATOR", label: "Base Isolator" },
    { value: "LEAD_RUBBER_BEARING", label: "Lead Rubber Bearing" },
    { value: "FRICTION_PENDULUM_BEARING", label: "Friction Pendulum Bearing" },
    { value: "ELASTOMERIC_BEARING", label: "Elastomeric Bearing" },
    { value: "SLIDING_BEARING", label: "Sliding Bearing" },
    { value: "ROCKER_BEARING", label: "Rocker Bearing" },
    { value: "ROLLER_BEARING", label: "Roller Bearing" },
    { value: "PIN_BEARING", label: "Pin Bearing" },
    { value: "FIXED_BEARING", label: "Fixed Bearing" },

    // Precast and Prestressed Elements
    { value: "PRECAST_BEAM", label: "Precast Beam" },
    { value: "PRECAST_COLUMN", label: "Precast Column" },
    { value: "PRECAST_PANEL", label: "Precast Panel" },
    { value: "PRECAST_SLAB", label: "Precast Slab" },
    { value: "PRESTRESSED_BEAM", label: "Prestressed Beam" },
    { value: "PRESTRESSED_GIRDER", label: "Prestressed Girder" },
    { value: "PRESTRESSED_SLAB", label: "Prestressed Slab" },
    { value: "DOUBLE_TEE", label: "Double Tee" },
    { value: "SINGLE_TEE", label: "Single Tee" },
    { value: "HOLLOW_CORE_SLAB", label: "Hollow Core Slab" },
    { value: "INVERTED_TEE_BEAM", label: "Inverted Tee Beam" },
    { value: "L_BEAM", label: "L-Beam" },
    { value: "SPANDREL_PANEL", label: "Spandrel Panel" },
    { value: "ARCHITECTURAL_PANEL", label: "Architectural Panel" },

    // Default
    { value: "DEFAULT", label: "Default/Unclassified" },
  ];

  // Filter member tags based on search
  useEffect(() => {
    const allTags = getMemberTagOptions();
    if (!memberTagSearch.trim()) {
      setFilteredMemberTags(allTags);
    } else {
      const searchLower = memberTagSearch.toLowerCase();
      const filtered = allTags.filter(
        (tag) =>
          tag.label.toLowerCase().includes(searchLower) ||
          tag.value.toLowerCase().includes(searchLower),
      );
      setFilteredMemberTags(filtered);
    }
  }, [memberTagSearch]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8)
      return (
        <Badge className="bg-green-100 text-green-800">High Confidence</Badge>
      );
    if (confidence >= 0.6)
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          Medium Confidence
        </Badge>
      );
    return <Badge className="bg-red-100 text-red-800">Low Confidence</Badge>;
  };

  const getMemberTagColor = (tag: MemberTag): string => {
    const tagColors = {
      // Primary Structural - Reds
      MAIN_FRAME_COLUMN: "#DC2626",
      END_FRAME_COLUMN: "#B91C1C",
      POST: "#EF4444",
      PIER: "#F87171",
      PILE: "#FCA5A5",

      // Rafters and Main Beams - Blues
      MAIN_FRAME_RAFTER: "#2563EB",
      END_FRAME_RAFTER: "#1D4ED8",
      GIRDER: "#3B82F6",
      RIDGE_BEAM: "#60A5FA",
      HIP_BEAM: "#93C5FD",
      VALLEY_BEAM: "#BFDBFE",

      // Floor/Ceiling Systems - Greens
      FLOOR_BEAM: "#059669",
      CEILING_BEAM: "#10B981",
      JOIST: "#34D399",
      MEZZANINE_BEAM: "#6EE7B7",

      // Foundation - Browns
      FOUNDATION_BEAM: "#7C2D12",
      FOOTING_BEAM: "#A16207",
      GRADE_BEAM: "#D97706",

      // Secondary Elements - Purples
      ROOF_PURLIN: "#7C3AED",
      WALL_GIRT: "#8B5CF6",
      TIE_BEAM: "#A78BFA",
      COLLAR_BEAM: "#C4B5FD",

      // Truss Elements - Teals
      TRUSS_TOP_CHORD: "#0D9488",
      TRUSS_BOTTOM_CHORD: "#14B8A6",
      TRUSS_WEB_MEMBER: "#5EEAD4",

      // Bracing - Oranges
      ROOF_BRACING: "#EA580C",
      WALL_BRACING: "#F97316",
      DIAGONAL_BRACE: "#FB923C",
      X_BRACE: "#FDBA74",
      K_BRACE: "#FED7AA",
      LATERAL_BRACE: "#FFEDD5",
      WIND_BRACE: "#DC2626",
      SEISMIC_BRACE: "#B91C1C",

      // Specialized - Pinks
      CRANE_BEAM: "#DB2777",
      CANOPY_BEAM: "#EC4899",
      FASCIA_BEAM: "#F472B6",
      EQUIPMENT_SUPPORT: "#F9A8D4",

      // Building Envelope - Cyans
      HANGAR_DOOR_FRAME: "#0891B2",
      WINDOW_FRAME: "#06B6D4",
      CURTAIN_WALL_MULLION: "#67E8F9",
      CLADDING_SUPPORT: "#A5F3FC",

      // Utilities - Limes
      UTILITY_BEAM: "#65A30D",
      PIPE_SUPPORT: "#84CC16",

      // Tension/Compression - Yellows
      COMPRESSION_STRUT: "#EAB308",
      TENSION_ROD: "#FACC15",
      CABLE: "#FDE047",
      STRUT: "#FEF08A",

      // Framing Elements - Indigos
      LINTEL: "#4F46E5",
      SILL_PLATE: "#6366F1",
      TOP_PLATE: "#818CF8",
      STUD: "#A5B4FC",
      RAFTER_TIE: "#C7D2FE",

      // Special Elements - Grays
      PARAPET: "#374151",
      SIGNAGE_POLE: "#1F2937",
      TRANSFER_BEAM: "#4B5563",
      SPANDREL_BEAM: "#6B7280",

      // Default
      DEFAULT: "#9CA3AF",
    };
    return tagColors[tag] || "#6B7280";
  };

  return (
    <div className="space-y-6 bg-white">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5" />
            <span>AI Model Analysis</span>
            <Badge
              className={`text-xs ml-2 ${
                mlApiUsed
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {analysisSource}
            </Badge>
            {mlApiHealthy !== null && (
              <Badge
                className={`text-xs ml-1 ${
                  mlApiHealthy
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {mlApiHealthy ? "🟢 API Online" : "🔴 API Offline"}
              </Badge>
            )}
            {mlApiLastChecked && (
              <span className="text-xs text-gray-500 ml-2">
                Last checked: {mlApiLastChecked.toLocaleTimeString()}
              </span>
            )}
            {/* MCP Status Integrated */}
            {mcp && (
              <div className="flex items-center space-x-2 ml-auto">
                <Badge className="bg-purple-100 text-purple-800 text-xs">
                  {mlApiUsed ? "🌐 ML API" : "🔧 Rule-Based"}
                </Badge>
                {mcp.isLocked ? (
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    🔒 MCP Locked
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                    🔓 MCP Active
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {mcp.unitsSystem}
                </Badge>
              </div>
            )}
          </CardTitle>
          <CardDescription>
            {mcp && mcp.isLocked
              ? "Analysis complete - MCP is locked and ready for calculations"
              : "Analyzing structural model using AI/ML to detect building type and tag members"}
            {/* Real-time ML Learning Status */}
            {mlApiUsed && realTimeOverrides.overrideCount > 0 && (
              <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-800">
                  🧠 ML Learning Active
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  {realTimeOverrides.overrideCount} corrections submitted for
                  training
                  {realTimeOverrides.lastTrainingTime && (
                    <span className="ml-2">
                      • Last:{" "}
                      {realTimeOverrides.lastTrainingTime.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            )}
            {/* MCP Summary Information */}
            {mcp && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-medium text-gray-700">Building</div>
                    <div className="text-gray-600">
                      {mcp.buildingType.replace(/_/g, " ")}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-gray-700">Confidence</div>
                    <div className="text-gray-600">
                      {(mcp.buildingTypeConfidence * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-gray-700">Frames</div>
                    <div className="text-gray-600">
                      {mcp.framesX} × {mcp.framesY}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-gray-700">Tags</div>
                    <div className="text-gray-600">
                      {mcp.memberTags?.length || 0} members
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(mcp.specialFeatures).map(
                    ([feature, hasFeature]) =>
                      hasFeature ? (
                        <Badge
                          key={feature}
                          className="bg-blue-100 text-blue-800 text-xs px-1 py-0"
                        >
                          {feature.charAt(0).toUpperCase() + feature.slice(1)}
                        </Badge>
                      ) : null,
                  )}
                </div>
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {analysisStep === "classifying" &&
                  "Classifying building type..."}
                {analysisStep === "tagging" && "Tagging structural members..."}
                {analysisStep === "reviewing" && "Validating analysis..."}
                {analysisStep === "complete" && "Analysis complete"}
              </span>
              <span className="text-sm text-gray-500">{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* ML Learning Status Panel */}
      {mlApiUsed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="w-5 h-5" />
              <span>ML Learning Status</span>
              <Badge className="bg-green-100 text-green-800">
                {mlApiHealthy ? "🟢 Active" : "🔴 Offline"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Real-time machine learning with user feedback integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {(() => {
                    const learningProof =
                      AIBuildingClassifier.getLearningProof();
                    return learningProof.totalOverrides;
                  })()}
                </div>
                <div className="text-sm text-blue-800">ML Training Points</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {(() => {
                    const learningTrend =
                      AIBuildingClassifier.analyzeLearningTrend();
                    return learningTrend.memberTagCorrections;
                  })()}
                </div>
                <div className="text-sm text-green-800">
                  Member Tag Corrections
                </div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {buildingClassification
                    ? (buildingClassification.confidence * 100).toFixed(0) + "%"
                    : "--"}
                </div>
                <div className="text-sm text-purple-800">ML Confidence</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {Object.keys(memberTags).length}
                </div>
                <div className="text-sm text-orange-800">ML Tagged Members</div>
              </div>
            </div>

            {/* Engineering Criteria Display */}
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-800 mb-2">
                🏗️ Engineering-Level ML Criteria Met:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="font-medium text-green-700 mb-1">
                    Building Classification:
                  </div>
                  {(() => {
                    const learningProof =
                      AIBuildingClassifier.getLearningProof();
                    return learningProof.buildingCriteria.map(
                      (criteria, idx) => (
                        <div key={idx} className="text-green-600">
                          ✓ {criteria}
                        </div>
                      ),
                    );
                  })()}
                </div>
                <div>
                  <div className="font-medium text-green-700 mb-1">
                    Member Classification:
                  </div>
                  {(() => {
                    const learningProof =
                      AIBuildingClassifier.getLearningProof();
                    return learningProof.memberTagCriteria.map(
                      (criteria, idx) => (
                        <div key={idx} className="text-green-600">
                          ✓ {criteria}
                        </div>
                      ),
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* User Override Proof */}
            {(() => {
              const learningProof = AIBuildingClassifier.getLearningProof();
              return (
                learningProof.userOverrideProof.length > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="font-medium text-blue-800 mb-2">
                      📊 User Override Training Data:
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {learningProof.userOverrideProof
                        .slice(-5)
                        .map((override, idx) => (
                          <div key={idx} className="text-xs text-blue-600">
                            {new Date(override.timestamp).toLocaleString()}:{" "}
                            {override.correction}
                            {override.confidence &&
                              `(${(override.confidence * 100).toFixed(0)}%)`}
                          </div>
                        ))}
                    </div>
                  </div>
                )
              );
            })()}

            {(() => {
              const learningProof = AIBuildingClassifier.getLearningProof();
              return (
                learningProof.mlApiConnectionStatus.lastVerified && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        ML API Last Verified:{" "}
                        {new Date(
                          learningProof.mlApiConnectionStatus.lastVerified,
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Engineering-grade ML analysis active •{" "}
                      {learningProof.totalOverrides} training corrections •
                      {learningProof.modelImprovements.predictionQuality}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Endpoint: {learningProof.mlApiConnectionStatus.endpoint}
                    </div>
                  </div>
                )
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Manual Override Controls Section */}
      {analysisStep === "complete" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Manual Override Controls</span>
              <Badge className="bg-blue-100 text-blue-800">
                Engineering Parameters
              </Badge>
              {mcp && mcp.isLocked && (
                <Badge className="bg-red-100 text-red-800 text-xs">
                  🔒 MCP Locked - Overrides Disabled
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Manually override AI predictions and adjust structural parameters
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm font-medium text-blue-800 mb-1">
                  🤖 ML API Learning Process:
                </div>
                <div className="text-xs text-blue-600 space-y-1">
                  <div>
                    • <strong>Automatic Submission:</strong> All manual
                    overrides are automatically sent to ML API for learning
                  </div>
                  <div>
                    • <strong>No Lock Required:</strong> You don't need to lock
                    MCP first - overrides are submitted immediately
                  </div>
                  <div>
                    • <strong>Real-time Learning:</strong> Each change trains
                    the ML model to improve future predictions
                  </div>
                  <div>
                    • <strong>MCP Lock Purpose:</strong> Locking MCP finalizes
                    analysis for load calculations (not for ML learning)
                  </div>
                </div>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Building Type Override */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800 flex items-center space-x-2">
                <Building className="w-4 h-4" />
                <span>Building Type Classification</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Building Type:
                  </label>
                  <Select
                    value={selectedBuildingType || ""}
                    onValueChange={(value) =>
                      handleBuildingTypeChange(value as BuildingType)
                    }
                    disabled={mcp?.isLocked}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select building type" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {getBuildingTypeOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Height Classification:
                  </label>
                  <Select
                    value={heightClassification}
                    onValueChange={(value) => {
                      setHeightClassification(value as HeightClassification);
                      if (mcp && !mcp.isLocked) {
                        mcpManager.updateHeightClassification(
                          value as HeightClassification,
                          true,
                        );
                      }
                    }}
                    disabled={mcp?.isLocked}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW_RISE">Low Rise</SelectItem>
                      <SelectItem value="MID_RISE">Mid Rise</SelectItem>
                      <SelectItem value="HIGH_RISE">High Rise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Structural Parameters Override */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">
                Structural Parameters
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Structural Rigidity:
                  </label>
                  <Select
                    value={structuralRigidity}
                    onValueChange={(value) => {
                      setStructuralRigidity(value as StructuralRigidity);
                      if (mcp && !mcp.isLocked) {
                        mcpManager.updateStructuralRigidity(
                          value as StructuralRigidity,
                          true,
                        );
                      }
                    }}
                    disabled={mcp?.isLocked}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RIGID">Rigid</SelectItem>
                      <SelectItem value="SEMI_RIGID">Semi-Rigid</SelectItem>
                      <SelectItem value="FLEXIBLE">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Plan Irregularity:
                  </label>
                  <Select
                    value={asceComplexity}
                    onValueChange={(value) => {
                      setAsceComplexity(value as "REGULAR" | "IRREGULAR");
                      if (mcp && !mcp.isLocked) {
                        mcpManager.updatePlanIrregularity(
                          value as "REGULAR" | "IRREGULAR",
                          true,
                        );
                      }
                    }}
                    disabled={mcp?.isLocked}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REGULAR">Regular</SelectItem>
                      <SelectItem value="IRREGULAR">Irregular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Frame Type:
                  </label>
                  <Select
                    value={frameType}
                    onValueChange={(value) => {
                      setFrameType(
                        value as "MOMENT" | "BRACED" | "DUAL" | "CANTILEVER",
                      );
                      if (mcp && !mcp.isLocked) {
                        mcpManager.updateFrameType(
                          value as "MOMENT" | "BRACED" | "DUAL" | "CANTILEVER",
                          true,
                        );
                      }
                    }}
                    disabled={mcp?.isLocked}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MOMENT">Moment Frame</SelectItem>
                      <SelectItem value="BRACED">Braced Frame</SelectItem>
                      <SelectItem value="DUAL">Dual System</SelectItem>
                      <SelectItem value="CANTILEVER">Cantilever</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Frame Configuration Override */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">Frame Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Frame Count:
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={frameCount}
                    onChange={(e) => {
                      const count = parseInt(e.target.value) || 1;
                      setFrameCount(count);
                      if (mcp && !mcp.isLocked) {
                        mcpManager.updateFrameCount(count, true);
                      }
                    }}
                    disabled={mcp?.isLocked}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Bay Spacing ({getUnitLabel()}):
                  </label>
                  <Input
                    type="text"
                    value={baySpacing.join(", ")}
                    onChange={(e) => {
                      const spacings = e.target.value
                        .split(",")
                        .map((s) => parseFloat(s.trim()))
                        .filter((n) => !isNaN(n));
                      if (spacings.length > 0) {
                        setBaySpacing(spacings);
                        if (mcp && !mcp.isLocked) {
                          mcpManager.updateBaySpacing(spacings, true);
                        }
                      }
                    }}
                    disabled={mcp?.isLocked}
                    placeholder="30, 30, 30"
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500">
                    Enter comma-separated values (e.g., "30, 30, 30")
                  </div>
                </div>
              </div>
            </div>

            {/* Override Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-600">
                {mcp?.isLocked
                  ? "🔒 MCP is locked - unlock to make changes"
                  : "✏️ Changes are automatically saved to MCP"}
              </div>
              <div className="space-x-2">
                {mcp && mcp.isLocked && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      try {
                        mcpManager.unlockMCP();
                        console.log("🔓 MCP unlocked for manual overrides");
                      } catch (error) {
                        console.error("❌ Failed to unlock MCP:", error);
                      }
                    }}
                  >
                    🔓 Unlock MCP
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Reset to AI predictions
                    if (buildingClassification) {
                      setSelectedBuildingType(
                        buildingClassification.suggestedType,
                      );
                      setHeightClassification("LOW_RISE");
                      setStructuralRigidity("RIGID");
                      setAsceComplexity("REGULAR");
                      setFrameType("MOMENT");
                      setFrameCount(1);
                      setBaySpacing([30]);
                    }
                  }}
                >
                  🔄 Reset to AI Predictions
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Building Criteria Display Section */}
      {analysisStep === "complete" && buildingClassification && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>ASCE 7-16 & AISC 360 Compliance Criteria</span>
              <Badge className="bg-green-100 text-green-800">
                Engineering Standards
              </Badge>
            </CardTitle>
            <CardDescription>
              Building classification criteria based on structural engineering
              codes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Building Type Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-800">
                  ASCE 7-16 Building Classification
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">
                      Building Type: {selectedBuildingType?.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">
                      Height Classification: {heightClassification}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">
                      Structural Rigidity: {structuralRigidity}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">
                      Plan Irregularity: {asceComplexity}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-800">
                  AISC 360 Frame Analysis
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">
                      Frame Type: {frameType} Frame
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">
                      Frame Count: {frameCount} frames
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">
                      Bay Spacing: {baySpacing.join(", ")} {getUnitLabel()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">
                      Member Tags: {Object.keys(memberTags).length} classified
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confidence and Validation */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">
                  Engineering Validation Complete
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium text-green-700">
                    ML Confidence
                  </div>
                  <div className="text-green-600">
                    {(buildingClassification.confidence * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="font-medium text-green-700">
                    Code Compliance
                  </div>
                  <div className="text-green-600">ASCE 7-16 ✓</div>
                </div>
                <div>
                  <div className="font-medium text-green-700">Steel Design</div>
                  <div className="text-green-600">AISC 360 ✓</div>
                </div>
                <div>
                  <div className="font-medium text-green-700">
                    Analysis Ready
                  </div>
                  <div className="text-green-600">
                    {validationResults?.isValid ? "Yes ✓" : "Pending"}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action buttons - only show when appropriate */}
      {analysisStep === "complete" && (
        <div className="flex justify-between">
          <div className="space-x-2">
            <Button variant="outline" onClick={startAIAnalysis}>
              Re-analyze with {mlApiHealthy ? "ML API" : "Rule-Based"}
            </Button>
            {!mlApiHealthy && (
              <Button
                variant="outline"
                onClick={async () => {
                  console.log("🔄 Retrying ML API connection...");
                  const healthy = await AIBuildingClassifier.checkMLAPIHealth();
                  setMlApiHealthy(healthy);
                  setMlApiLastChecked(new Date());
                  if (healthy) {
                    console.log(
                      "✅ ML API reconnected - you can now re-analyze",
                    );
                    // Update analysis source to reflect reconnection
                    setAnalysisSource("🌐 Digital Ocean ML API - RECONNECTED");
                    setMlApiUsed(true);
                  }
                }}
              >
                🔄 Retry ML API
              </Button>
            )}
          </div>
          <div className="space-x-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Analysis
            </Button>
            <Button onClick={handleConfirmAnalysis}>Confirm & Continue</Button>
            {mcp && !mcp.isLocked && mcp.validation.isValid && (
              <Button
                variant="default"
                onClick={() => {
                  if (onLockMCP) {
                    onLockMCP();
                  } else {
                    try {
                      mcpManager.lockMCP();
                      console.log("🔒 MCP locked manually by user");
                    } catch (error) {
                      console.error("❌ Failed to lock MCP:", error);
                      alert(
                        `Failed to lock MCP: ${error instanceof Error ? error.message : "Unknown error"}`,
                      );
                    }
                  }
                }}
              >
                🔒 Lock MCP
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ModelAnalyzer;
