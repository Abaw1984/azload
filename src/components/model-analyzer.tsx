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
import {
  Brain,
  CheckCircle,
  AlertTriangle,
  Settings,
  Eye,
  Download,
  Zap,
} from "lucide-react";
import {
  StructuralModel,
  BuildingType,
  MemberTag,
  MasterControlPoint,
} from "@/types/model";
import { AIBuildingClassifier, GeometryAnalyzer } from "@/lib/ai-classifier";
import { AIAssistant, useAIAssistant } from "@/lib/ai-assistant";
import { useMCP } from "@/lib/mcp-manager";
import { cn } from "@/lib/utils";

interface ModelAnalyzerProps {
  model: StructuralModel | null;
  mcp: MasterControlPoint | null;
  onAnalysisComplete: (updatedModel: StructuralModel) => void;
  onManualOverride?: (overrides: {
    buildingType?: BuildingType;
    memberTags?: { memberId: string; tag: MemberTag }[];
  }) => void;
  onLockMCP?: () => void;
}

function ModelAnalyzer({
  model,
  mcp,
  onAnalysisComplete,
  onManualOverride,
  onLockMCP,
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

  // AI Assistant Integration
  const aiAssistant = useAIAssistant();
  const mcpManager = useMCP();
  const [showAIPredictions, setShowAIPredictions] = useState(false);
  const [userFeedback, setUserFeedback] = useState<{
    satisfaction: number;
    comments: string;
  }>({ satisfaction: 5, comments: "" });

  useEffect(() => {
    // If MCP exists, show existing data
    if (mcp) {
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

      setAnalysisStep("complete");
      setProgress(100);
    } else if (model) {
      // Start with AI Assistant analysis if model is provided
      startAIAnalysis();
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
      // Step 1: Check ML API health
      setProgress(15);
      const mlHealthy = await AIBuildingClassifier.checkMLAPIHealth();
      console.log(
        `🏥 ML API Health Check: ${mlHealthy ? "Healthy" : "Unavailable"}`,
      );

      if (mlHealthy) {
        const modelInfo = await AIBuildingClassifier.getMLModelInfo();
        console.log("ℹ️ ML Model Info:", modelInfo);
      }

      // Step 2: Generate AI predictions (ML + Rule-based hybrid)
      setProgress(30);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const prediction = await aiAssistant.generatePredictions(model);

      // Step 3: Display AI predictions for user review
      setProgress(60);
      setBuildingClassification({
        suggestedType: prediction.buildingTypePrediction.suggestedType,
        confidence: prediction.buildingTypePrediction.confidence,
        reasoning: prediction.buildingTypePrediction.reasoning,
      });
      setSelectedBuildingType(prediction.buildingTypePrediction.suggestedType);

      const memberTagsMap: { [memberId: string]: MemberTag } = {};
      prediction.memberTagPredictions.forEach((mtp) => {
        memberTagsMap[mtp.memberId] = mtp.suggestedTag;
      });
      setMemberTags(memberTagsMap);

      setValidationResults({
        isValid: prediction.ruleBasedValidation.passed,
        warnings: prediction.ruleBasedValidation.warnings,
        suggestions: prediction.ruleBasedValidation.violations,
      });

      setProgress(90);
      await new Promise((resolve) => setTimeout(resolve, 500));

      setAnalysisStep("reviewing");
      setProgress(100);
      setShowAIPredictions(true);

      console.log("🤖 AI Assistant predictions ready for user review", {
        buildingType: prediction.buildingTypePrediction.suggestedType,
        confidence: prediction.buildingTypePrediction.confidence,
        memberTags: prediction.memberTagPredictions.length,
        validationPassed: prediction.ruleBasedValidation.passed,
        mlApiUsed: mlHealthy,
      });
    } catch (error) {
      console.error("❌ AI Assistant analysis failed:", error);
      setAnalysisStep("complete");
      setProgress(100);
      // Fallback to legacy analysis
      await startLegacyAnalysis();
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

    const classification = await AIBuildingClassifier.classifyBuilding(model);
    setBuildingClassification(classification);
    setSelectedBuildingType(classification.suggestedType);

    const tagsResult = await AIBuildingClassifier.tagMembers(
      model,
      classification.suggestedType,
    );
    setMemberTags(tagsResult.memberTags);

    const validation = AIBuildingClassifier.validateTags(
      model,
      tagsResult.memberTags,
    );
    setValidationResults(validation);

    setAnalysisStep("complete");
  };

  const handleBuildingTypeChange = async (newType: BuildingType) => {
    setSelectedBuildingType(newType);
    const newTagsResult = await AIBuildingClassifier.tagMembers(model, newType);
    setMemberTags(newTagsResult.memberTags);
    const validation = AIBuildingClassifier.validateTags(
      model,
      newTagsResult.memberTags,
    );
    setValidationResults(validation);

    // Update MCP if it exists and is not locked
    if (mcp && !mcp.isLocked) {
      try {
        mcpManager.updateBuildingType(newType, true); // true = manual override
        console.log("🏗️ Building type updated in MCP:", newType);
      } catch (error) {
        console.error("❌ Failed to update building type in MCP:", error);
      }
    }

    console.log("🏗️ Building type changed:", {
      newType,
      memberTagsGenerated: Object.keys(newTagsResult.memberTags).length,
      validationPassed: validationResults?.isValid || false,
      mcpUpdated: mcp && !mcp.isLocked,
    });
  };

  const handleTagChange = (memberId: string, newTag: MemberTag) => {
    const updatedTags = { ...memberTags, [memberId]: newTag };
    setMemberTags(updatedTags);
    const validation = AIBuildingClassifier.validateTags(model, updatedTags);
    setValidationResults(validation);

    console.log("🏷️ Member tag changed:", {
      memberId,
      newTag,
      totalTaggedMembers: Object.keys(updatedTags).length,
    });
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

      // Apply predictions to MCP
      if (selectedBuildingType && buildingClassification) {
        mcpManager.applyAIPredictions(
          selectedBuildingType,
          buildingClassification.confidence,
          memberTags,
          aiAssistant.currentPrediction.id,
          buildingClassification.reasoning,
        );
      }

      setAnalysisStep("complete");

      console.log("✅ AI predictions confirmed and applied to MCP");

      // Create updated model for callback
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

  const getMemberTagOptions = (): { value: MemberTag; label: string }[] => [
    { value: "MAIN_FRAME_COLUMN", label: "Main Frame Column" },
    { value: "MAIN_FRAME_RAFTER", label: "Main Frame Rafter" },
    { value: "END_FRAME_COLUMN", label: "End Frame Column" },
    { value: "END_FRAME_RAFTER", label: "End Frame Rafter" },
    { value: "ROOF_PURLIN", label: "Roof Purlin" },
    { value: "WALL_GIRT", label: "Wall Girt" },
    { value: "ROOF_BRACING", label: "Roof Bracing" },
    { value: "WALL_BRACING", label: "Wall Bracing" },
    { value: "CRANE_BEAM", label: "Crane Beam" },
    { value: "MEZZANINE_BEAM", label: "Mezzanine Beam" },
    { value: "CANOPY_BEAM", label: "Canopy Beam" },
    { value: "FASCIA_BEAM", label: "Fascia Beam" },
    { value: "PARAPET", label: "Parapet" },
    { value: "SIGNAGE_POLE", label: "Signage Pole" },
  ];

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
      MAIN_FRAME_COLUMN: "#DC2626", // Red
      END_FRAME_COLUMN: "#B91C1C", // Dark Red
      MAIN_FRAME_RAFTER: "#2563EB", // Blue
      END_FRAME_RAFTER: "#1D4ED8", // Dark Blue
      ROOF_PURLIN: "#7C3AED", // Purple
      WALL_GIRT: "#059669", // Green
      ROOF_BRACING: "#EA580C", // Orange
      WALL_BRACING: "#D97706", // Amber
      CRANE_BEAM: "#DB2777", // Pink
      MEZZANINE_BEAM: "#0891B2", // Cyan
      CANOPY_BEAM: "#65A30D", // Lime
      FASCIA_BEAM: "#7C2D12", // Brown
      PARAPET: "#374151", // Gray
      SIGNAGE_POLE: "#1F2937", // Dark Gray
    };
    return tagColors[tag] || "#6B7280";
  };

  return (
    <div className="space-y-6 bg-white">
      {/* MCP Status Panel */}
      {mcp && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Master Control Point (MCP)</span>
              </div>
              <div className="flex items-center space-x-2">
                {mcp.isLocked ? (
                  <Badge className="bg-green-100 text-green-800">
                    🔒 Locked
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    🔓 Unlocked
                  </Badge>
                )}
                <Badge variant="outline">{mcp.unitsSystem}</Badge>
              </div>
            </CardTitle>
            <CardDescription>
              Centralized control point for all model data and calculations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">Building Type</div>
                <div className="text-xs text-gray-600">{mcp.buildingType}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Height Class</div>
                <div className="text-xs text-gray-600">
                  {mcp.heightClassification}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Rigidity</div>
                <div className="text-xs text-gray-600">
                  {mcp.structuralRigidity}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Roof Type</div>
                <div className="text-xs text-gray-600">{mcp.roofType}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Frames</div>
                <div className="text-xs text-gray-600">
                  {mcp.framesX} × {mcp.framesY}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Aspect Ratio</div>
                <div className="text-xs text-gray-600">
                  H/L: {mcp.aspectRatio.H_L.toFixed(2)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Diaphragm</div>
                <div className="text-xs text-gray-600">{mcp.diaphragmType}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Irregularity</div>
                <div className="text-xs text-gray-600">
                  {mcp.planIrregularity}
                </div>
              </div>
            </div>

            {/* Special Features */}
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm font-medium mb-2">Special Features</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(mcp.specialFeatures).map(
                  ([feature, hasFeature]) =>
                    hasFeature ? (
                      <Badge
                        key={feature}
                        className="bg-blue-100 text-blue-800 text-xs"
                      >
                        {feature.charAt(0).toUpperCase() + feature.slice(1)}
                      </Badge>
                    ) : null,
                )}
                {Object.values(mcp.specialFeatures).every((v) => !v) && (
                  <span className="text-xs text-gray-500">
                    No special features detected
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5" />
            <span>AI Model Analysis</span>
          </CardTitle>
          <CardDescription>
            {mcp && mcp.isLocked
              ? "Analysis complete - MCP is locked and ready for calculations"
              : "Analyzing structural model to detect building type and tag members"}
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

      {/* AI Prediction Review Panel */}
      {showAIPredictions && aiAssistant.currentPrediction && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="w-5 h-5" />
              <span>AI Assistant Predictions</span>
              <Badge className="bg-purple-100 text-purple-800">
                Confidence:{" "}
                {(buildingClassification?.confidence || 0 * 100).toFixed(1)}%
              </Badge>
            </CardTitle>
            <CardDescription>
              AI-powered predictions with rule-based validation. Please review
              and confirm or make corrections.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Rule-based Validation Status */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                {aiAssistant.currentPrediction.ruleBasedValidation.passed ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                )}
                <span className="font-medium">
                  {aiAssistant.currentPrediction.ruleBasedValidation.passed
                    ? "All Rule-Based Checks Passed"
                    : "Rule-Based Validation Issues"}
                </span>
              </div>

              {aiAssistant.currentPrediction.ruleBasedValidation.violations
                .length > 0 && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-red-700">
                    Violations:
                  </div>
                  {aiAssistant.currentPrediction.ruleBasedValidation.violations.map(
                    (violation, index) => (
                      <div key={index} className="text-sm text-red-600">
                        • {violation}
                      </div>
                    ),
                  )}
                </div>
              )}

              {aiAssistant.currentPrediction.ruleBasedValidation.warnings
                .length > 0 && (
                <div className="space-y-1 mt-2">
                  <div className="text-sm font-medium text-yellow-700">
                    Warnings:
                  </div>
                  {aiAssistant.currentPrediction.ruleBasedValidation.warnings.map(
                    (warning, index) => (
                      <div key={index} className="text-sm text-yellow-600">
                        • {warning}
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>

            {/* User Feedback */}
            <div className="p-4 border rounded-lg">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">
                    Rate AI Predictions (1-5):
                  </label>
                  <div className="flex space-x-2 mt-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Button
                        key={rating}
                        variant={
                          userFeedback.satisfaction === rating
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setUserFeedback((prev) => ({
                            ...prev,
                            satisfaction: rating,
                          }))
                        }
                      >
                        {rating}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Comments (optional):
                  </label>
                  <textarea
                    className="w-full mt-1 p-2 border rounded text-sm"
                    rows={2}
                    placeholder="Any feedback on the AI predictions..."
                    value={userFeedback.comments}
                    onChange={(e) =>
                      setUserFeedback((prev) => ({
                        ...prev,
                        comments: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {analysisStep === "complete" && buildingClassification && (
        <Tabs defaultValue="classification" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="classification">
              Building Classification
            </TabsTrigger>
            <TabsTrigger value="members">Member Tagging</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
          </TabsList>

          <TabsContent value="classification" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Building Type Classification</span>
                  {getConfidenceBadge(buildingClassification.confidence)}
                </CardTitle>
                <CardDescription>
                  AI-detected building type based on structural geometry and
                  member configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">
                        Building Type
                      </label>
                      {mcp && mcp.manualOverride && (
                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                          Manual Override
                        </Badge>
                      )}
                    </div>
                    <Select
                      value={selectedBuildingType || ""}
                      onValueChange={(value) =>
                        handleBuildingTypeChange(value as BuildingType)
                      }
                      disabled={mcp?.isLocked}
                    >
                      <SelectTrigger
                        className={cn(
                          mcp?.isLocked && "opacity-50 cursor-not-allowed",
                          mcp?.manualOverride &&
                            "border-orange-300 bg-orange-50",
                        )}
                      >
                        <SelectValue placeholder="Select building type" />
                      </SelectTrigger>
                      <SelectContent>
                        {getBuildingTypeOptions().map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {mcp?.isLocked && (
                      <p className="text-xs text-gray-500">
                        🔒 MCP is locked - building type cannot be changed
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Confidence Level
                    </label>
                    <div className="flex items-center space-x-2">
                      <div
                        className={cn(
                          "text-2xl font-bold",
                          getConfidenceColor(buildingClassification.confidence),
                        )}
                      >
                        {(buildingClassification.confidence * 100).toFixed(0)}%
                      </div>
                      {mcp?.manualOverride && (
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          User Confirmed
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">AI Reasoning</label>
                  <div className="space-y-1">
                    {buildingClassification.reasoning.map((reason, index) => (
                      <div
                        key={index}
                        className="text-sm text-gray-600 flex items-start space-x-2"
                      >
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {model.geometry && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {model.geometry.buildingLength.toFixed(1)}m
                      </div>
                      <div className="text-xs text-gray-500">Length</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {model.geometry.buildingWidth.toFixed(1)}m
                      </div>
                      <div className="text-xs text-gray-500">Width</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {model.geometry.totalHeight.toFixed(1)}m
                      </div>
                      <div className="text-xs text-gray-500">Height</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {model.geometry.roofSlope.toFixed(1)}°
                      </div>
                      <div className="text-xs text-gray-500">Roof Slope</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Member Tagging</CardTitle>
                <CardDescription>
                  Review and adjust AI-assigned tags for structural members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(
                      Object.values(memberTags).reduce(
                        (acc, tag) => {
                          acc[tag] = (acc[tag] || 0) + 1;
                          return acc;
                        },
                        {} as { [key: string]: number },
                      ),
                    ).map(([tag, count]) => (
                      <div
                        key={tag}
                        className="text-center p-3 border rounded-lg"
                      >
                        <div className="text-lg font-semibold">{count}</div>
                        <div className="text-xs text-gray-500">
                          {getMemberTagOptions().find(
                            (opt) => opt.value === tag,
                          )?.label || tag}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Member ID</th>
                          <th className="px-3 py-2 text-left">Type</th>
                          <th className="px-3 py-2 text-left">AI Tag</th>
                          <th className="px-3 py-2 text-left">Color</th>
                          <th className="px-3 py-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {model.members.slice(0, 20).map((member) => {
                          const memberTag = memberTags[member.id];
                          const tagColor = memberTag
                            ? getMemberTagColor(memberTag)
                            : "#6B7280";

                          return (
                            <tr key={member.id} className="border-t">
                              <td className="px-3 py-2 font-mono">
                                {member.id}
                              </td>
                              <td className="px-3 py-2">{member.type}</td>
                              <td className="px-3 py-2">
                                <select
                                  className="w-full text-xs border rounded px-2 py-1"
                                  value={memberTag || ""}
                                  onChange={(e) =>
                                    handleTagChange(
                                      member.id,
                                      e.target.value as MemberTag,
                                    )
                                  }
                                >
                                  {getMemberTagOptions().map((option) => (
                                    <option
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <div
                                  className="w-4 h-4 rounded border"
                                  style={{ backgroundColor: tagColor }}
                                  title={
                                    memberTag
                                      ? getMemberTagOptions().find(
                                          (opt) => opt.value === memberTag,
                                        )?.label
                                      : "No tag"
                                  }
                                ></div>
                              </td>
                              <td className="px-3 py-2">
                                <Button size="sm" variant="ghost">
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {model.members.length > 20 && (
                    <p className="text-sm text-gray-500 text-center">
                      Showing first 20 of {model.members.length} members
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Validation Results</span>
                </CardTitle>
                <CardDescription>
                  Analysis validation and recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {validationResults && (
                  <>
                    <div className="flex items-center space-x-2">
                      {validationResults.isValid ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="text-sm font-medium">
                        {validationResults.isValid
                          ? "Analysis Validated"
                          : "Review Required"}
                      </span>
                    </div>

                    {validationResults.warnings.length > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <div className="font-medium">Warnings:</div>
                            {validationResults.warnings.map(
                              (warning, index) => (
                                <div key={index} className="text-sm">
                                  • {warning}
                                </div>
                              ),
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {validationResults.suggestions.length > 0 && (
                      <Alert>
                        <Zap className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <div className="font-medium">Suggestions:</div>
                            {validationResults.suggestions.map(
                              (suggestion, index) => (
                                <div key={index} className="text-sm">
                                  • {suggestion}
                                </div>
                              ),
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Manual Override Panel */}
      {analysisStep === "complete" && buildingClassification && (
        <Card>
          <CardHeader>
            <CardTitle>Manual Override Options</CardTitle>
            <CardDescription>
              Override AI predictions with manual selections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Building Type Override Section */}
            <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center space-x-2 mb-3">
                <Settings className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">
                  Building Type Override
                </h3>
                {mcp?.isLocked && (
                  <Badge className="bg-red-100 text-red-800">🔒 Locked</Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Select Building Type
                    </label>
                    {mcp && mcp.manualOverride && (
                      <Badge className="bg-orange-100 text-orange-800 text-xs">
                        User Override Active
                      </Badge>
                    )}
                  </div>
                  <Select
                    value={selectedBuildingType || ""}
                    onValueChange={(value) => {
                      handleBuildingTypeChange(value as BuildingType);
                      console.log(
                        "🎯 Building type manually overridden to:",
                        value,
                      );
                    }}
                    disabled={mcp?.isLocked}
                  >
                    <SelectTrigger
                      className={cn(
                        "transition-all duration-200",
                        mcp?.isLocked && "opacity-50 cursor-not-allowed",
                        mcp?.manualOverride &&
                          "border-orange-300 bg-orange-50 shadow-sm",
                        !mcp?.manualOverride &&
                          "hover:border-blue-300 focus:border-blue-500",
                      )}
                    >
                      <SelectValue placeholder="Select building type" />
                    </SelectTrigger>
                    <SelectContent>
                      {getBuildingTypeOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center space-x-2">
                            <span>{option.label}</span>
                            {selectedBuildingType === option.value && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Status Messages */}
                  {mcp?.isLocked && (
                    <div className="flex items-center space-x-2 text-xs text-red-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span>
                        MCP is locked - building type cannot be changed
                      </span>
                    </div>
                  )}

                  {!mcp?.isLocked && mcp && (
                    <div className="flex items-center space-x-2 text-xs text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Changes will update MCP automatically</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    AI Confidence & Status
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div
                        className={cn(
                          "text-lg font-bold",
                          getConfidenceColor(buildingClassification.confidence),
                        )}
                      >
                        {(buildingClassification.confidence * 100).toFixed(0)}%
                      </div>
                      {getConfidenceBadge(buildingClassification.confidence)}
                    </div>

                    {mcp?.manualOverride && (
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          ✓ User Confirmed
                        </Badge>
                        <span className="text-xs text-gray-600">
                          Override applied to MCP
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Validation Feedback */}
              {validationResults && (
                <div className="mt-4 pt-3 border-t border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    {validationResults.isValid ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    )}
                    <span className="text-sm font-medium">
                      {validationResults.isValid
                        ? "Validation Passed"
                        : "Validation Issues"}
                    </span>
                  </div>

                  {validationResults.warnings.length > 0 && (
                    <div className="space-y-1">
                      {validationResults.warnings
                        .slice(0, 2)
                        .map((warning, index) => (
                          <div
                            key={index}
                            className="text-xs text-yellow-700 flex items-start space-x-1"
                          >
                            <span>⚠️</span>
                            <span>{warning}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm font-medium mb-2">
                Quick Member Tag Actions
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!mcp) return;
                    // Apply all columns as main frame columns
                    const updatedTags = { ...memberTags };
                    const rawMembers = (mcp.dimensions as any)?.members || [];
                    rawMembers.forEach((member: any) => {
                      if (member.type === "COLUMN") {
                        updatedTags[member.id] = "MAIN_FRAME_COLUMN";
                      }
                    });
                    setMemberTags(updatedTags);
                    // Notify parent of manual override
                    if (onManualOverride) {
                      const tagOverrides = Object.entries(updatedTags)
                        .filter(
                          ([memberId, tag]) => memberTags[memberId] !== tag,
                        )
                        .map(([memberId, tag]) => ({ memberId, tag }));
                      onManualOverride({ memberTags: tagOverrides });
                    }
                  }}
                >
                  Tag All Columns
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!mcp) return;
                    // Apply all beams as rafters
                    const updatedTags = { ...memberTags };
                    const rawMembers = (mcp.dimensions as any)?.members || [];
                    rawMembers.forEach((member: any) => {
                      if (member.type === "BEAM" || member.type === "RAFTER") {
                        updatedTags[member.id] = "MAIN_FRAME_RAFTER";
                      }
                    });
                    setMemberTags(updatedTags);
                    // Notify parent of manual override
                    if (onManualOverride) {
                      const tagOverrides = Object.entries(updatedTags)
                        .filter(
                          ([memberId, tag]) => memberTags[memberId] !== tag,
                        )
                        .map(([memberId, tag]) => ({ memberId, tag }));
                      onManualOverride({ memberTags: tagOverrides });
                    }
                  }}
                >
                  Tag All Rafters
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Clear all tags
                    setMemberTags({});
                    // Notify parent of manual override
                    if (onManualOverride) {
                      onManualOverride({ memberTags: [] });
                    }
                  }}
                >
                  Clear All Tags
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Re-run AI tagging
                    if (selectedBuildingType && mcp) {
                      const rawNodes = (mcp.dimensions as any)?.nodes || [];
                      const rawMembers = (mcp.dimensions as any)?.members || [];
                      const tempModel = {
                        nodes: rawNodes,
                        members: rawMembers,
                        geometry: mcp.dimensions,
                      } as any;
                      const newTagsResult = AIBuildingClassifier.tagMembers(
                        tempModel,
                        selectedBuildingType,
                      );
                      setMemberTags(newTagsResult.memberTags);
                      // Notify parent of manual override
                      if (onManualOverride) {
                        const tagOverrides = Object.entries(
                          newTagsResult.memberTags,
                        ).map(([memberId, tag]) => ({ memberId, tag }));
                        onManualOverride({ memberTags: tagOverrides });
                      }
                    }
                  }}
                >
                  Re-run AI Tags
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {analysisStep === "complete" && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={startAIAnalysis}>
            Re-analyze with AI
          </Button>
          <div className="space-x-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Analysis
            </Button>
            {showAIPredictions && aiAssistant.currentPrediction ? (
              <div className="space-x-2">
                <Button variant="outline" onClick={handleRejectPredictions}>
                  Reject AI Predictions
                </Button>
                <Button onClick={handleConfirmAIPredictions}>
                  Confirm AI Predictions
                </Button>
              </div>
            ) : (
              <div className="space-x-2">
                <Button onClick={handleConfirmAnalysis}>
                  Confirm & Continue
                </Button>
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ModelAnalyzer;
