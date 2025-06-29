import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Eye,
  Calculator,
  BarChart3,
  FileText,
  User,
  History,
  Building,
  Zap,
  CheckCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Brain,
} from "lucide-react";

// Import components
import ModelUpload from "@/components/model-upload";
import ThreeDVisualizer from "@/components/3d-visualizer";
import ModelAnalyzer from "@/components/model-analyzer";
import DebugConsole from "@/components/debug-console";
import ErrorBoundary from "@/components/error-boundary";
import LoadParameters from "@/components/load-parameters";
import LoadResults from "@/components/load-results";
import WindLoadCalculator from "@/components/wind-load-calculator";

// Import components - some may be missing, using fallbacks
let ProjectHistory: any;
let UserProfile: any;

try {
  ProjectHistory = require("@/components/project-history").default;
} catch {
  ProjectHistory = () => (
    <div className="p-8 text-center">
      Project History component not available
    </div>
  );
}

try {
  UserProfile = require("@/components/user-profile").default;
} catch {
  UserProfile = () => (
    <div className="p-8 text-center">User Profile component not available</div>
  );
}

// Import hooks and utilities
import { useMCP } from "@/lib/mcp-manager";
import { useAuth } from "@/components/auth-context";
import { StructuralModel, LoadCalculationResult } from "@/types/model";
import { LoadAssignmentEngine } from "@/lib/load-calculation";

function Home() {
  const [activeTab, setActiveTab] = useState("upload");
  const [model, setModel] = useState<StructuralModel | null>(null);
  const [loadResults, setLoadResults] = useState<LoadCalculationResult[]>([]);
  const [modelWithLoads, setModelWithLoads] = useState<StructuralModel | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const {
    user,
    logout,
    isLoading: authLoading,
    isDevelopmentBypass,
  } = useAuth();

  // Add global variable for development bypass detection
  (window as any).isDevelopmentBypass = isDevelopmentBypass;
  const mcp = useMCP();

  // Handle analysis completion
  const handleAnalysisComplete = (analysisResult: any) => {
    console.log("🔬 HOME: Analysis completed:", analysisResult);
    // Analysis results are handled by MCP manager
  };

  // Handle ML status updates
  const handleMLStatusUpdate = (
    status: "pending" | "success" | "unavailable",
    message?: string,
  ) => {
    console.log("🤖 HOME: ML status update:", { status, message });
    // ML status is handled by individual components
  };

  // Handle manual override
  const handleManualOverride = (overrides: any) => {
    console.log("✋ HOME: Manual override applied:", overrides);
    if (overrides.buildingType) {
      mcp.updateBuildingType(overrides.buildingType, 1.0);
    }
  };

  // Handle MCP lock
  const handleLockMCP = () => {
    console.log("🔒 HOME: Locking MCP");
    mcp.lockMCP();
  };

  // Handle load calculation completion
  const handleCalculationComplete = (results: LoadCalculationResult[]) => {
    console.log("📊 HOME: Load calculations completed:", results);
    setLoadResults(results);

    // Assign loads to the 3D model for visualization
    if (model && results.length > 0) {
      try {
        const updatedModel = LoadAssignmentEngine.assignLoadsToModel(
          model,
          results,
        );
        setModelWithLoads(updatedModel);
        console.log("✅ HOME: Loads assigned to 3D model for visualization");

        // Store the updated model in session storage for 3D visualizer
        sessionStorage.setItem("modelWithLoads", JSON.stringify(updatedModel));

        // Dispatch event to notify 3D visualizer of load updates
        const event = new CustomEvent("loadsAssigned", {
          detail: { model: updatedModel, loadResults: results },
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error("❌ HOME: Failed to assign loads to model:", error);
      }
    }

    // Automatically switch to results tab
    setActiveTab("results");
  };

  // Handle report generation
  const handleGenerateReport = async () => {
    console.log("📄 HOME: Generating report...");

    if (!model || !mcp.current || loadResults.length === 0) {
      alert(
        "Cannot generate report: Missing model, MCP, or load calculation results.",
      );
      return;
    }

    try {
      setIsLoading(true);

      // Import report generator dynamically
      const { generatePDFReport } = await import(
        "@/components/report-generator"
      );

      const reportConfig = {
        reportTitle: `Load Analysis Report - ${model.name}`,
        projectName: model.name,
        engineerName: user?.full_name || "Engineer",
        engineerLicense: "",
        companyName: user?.company || "Engineering Firm",
        includeCodeReferences: true,
        includeCalculationSteps: true,
        include3DFigures: true,
        includeLoadTables: true,
        includeComplianceStatement: true,
        includeEngineerStamp: false,
      };

      const reportData = await generatePDFReport(
        model,
        loadResults,
        reportConfig,
      );

      // Create and download the report
      const reportBlob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(reportBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${model.name}_Load_Analysis_Report.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log("✅ HOME: Report generated and downloaded successfully");
    } catch (error) {
      console.error("❌ HOME: Report generation failed:", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Get tab status for visual indicators
  const getTabStatus = (tabName: string) => {
    switch (tabName) {
      case "upload":
        return model ? "completed" : "active";
      case "analyze":
        return model ? "active" : "disabled";
      case "wind":
      case "seismic":
      case "snow":
      case "live":
      case "dead":
      case "crane":
        return mcp.current?.isLocked ? "active" : "disabled";
      case "results":
        return loadResults.length > 0 ? "completed" : "disabled";
      case "history":
      case "profile":
        return "active";
      default:
        return "disabled";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "active":
        return <Zap className="w-4 h-4 text-blue-600" />;
      case "disabled":
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  // Handle member highlighting
  const handleMemberHighlight = (memberId: string | null) => {
    console.log("🎯 HOME: Member highlight requested:", memberId);
    // Store highlighted member ID for 3D visualizer
    sessionStorage.setItem("highlightedMember", memberId || "");

    // Dispatch event to notify 3D visualizer
    const event = new CustomEvent("memberHighlight", {
      detail: { memberId },
    });
    window.dispatchEvent(event);
  };

  // ENTERPRISE MODEL LOADING: Enhanced and reliable model loading with error boundaries
  useEffect(() => {
    console.log("🏠 HOME: Model loading effect triggered", {
      activeTab,
      currentModel: !!model,
      modelNodes: model?.nodes?.length || 0,
      modelMembers: model?.members?.length || 0,
      timestamp: new Date().toISOString(),
    });

    const loadModelWithRetry = async () => {
      console.log("🏠 HOME: Loading model with retry mechanism");

      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        try {
          // Check all possible storage keys
          const storageKeys = ["parsedModel", "currentModel", "parsedGeometry"];
          let modelData = null;
          let sourceKey = null;

          for (const key of storageKeys) {
            const data = sessionStorage.getItem(key);
            if (data) {
              try {
                const parsed = JSON.parse(data);
                if (parsed?.nodes?.length > 0 && parsed?.members?.length > 0) {
                  modelData = parsed;
                  sourceKey = key;
                  break;
                }
              } catch (parseError) {
                console.warn(`Failed to parse ${key}:`, parseError);
              }
            }
          }

          if (modelData) {
            console.log("✅ HOME: Model loaded successfully", {
              source: sourceKey,
              nodes: modelData.nodes?.length || 0,
              members: modelData.members?.length || 0,
              name: modelData.name,
              units: modelData.units,
              unitsSystem: modelData.unitsSystem,
              attempt: attempts + 1,
            });

            // ENTERPRISE VALIDATION: Validate model data before setting
            if (!modelData.nodes || !modelData.members) {
              console.error(
                "❌ HOME: Invalid model data - missing nodes or members",
              );
              throw new Error("Invalid model data structure");
            }

            if (modelData.nodes.length === 0) {
              console.error("❌ HOME: Model has no nodes");
              throw new Error("Model contains no structural nodes");
            }

            if (modelData.members.length === 0) {
              console.error("❌ HOME: Model has no members");
              throw new Error("Model contains no structural members");
            }

            // Validate node structure
            const invalidNodes = modelData.nodes.filter(
              (node: any) =>
                !node.id ||
                typeof node.x !== "number" ||
                typeof node.y !== "number" ||
                typeof node.z !== "number",
            );

            if (invalidNodes.length > 0) {
              console.error("❌ HOME: Invalid node data found", invalidNodes);
              throw new Error(`Found ${invalidNodes.length} invalid nodes`);
            }

            // Validate member structure
            const invalidMembers = modelData.members.filter(
              (member: any) =>
                !member.id || !member.startNodeId || !member.endNodeId,
            );

            if (invalidMembers.length > 0) {
              console.error(
                "❌ HOME: Invalid member data found",
                invalidMembers,
              );
              throw new Error(`Found ${invalidMembers.length} invalid members`);
            }

            console.log(
              "✅ HOME: Model validation passed - setting model state",
            );
            setModel(modelData);

            // Initialize MCP in background if not already done
            if (!mcp.current && !mcp.isInitialized) {
              console.log("🤖 HOME: Starting background MCP initialization");
              // Don't await - let it run in background
              mcp.initializeFromModel(modelData).catch((error) => {
                console.warn("Background MCP initialization failed:", error);
              });
            }

            return; // Success - exit retry loop
          } else {
            console.log(
              `⚠️ HOME: No valid model found (attempt ${attempts + 1})`,
              {
                storageKeys: Object.keys(sessionStorage),
                checkedKeys: storageKeys,
                sessionStorageSize: Object.keys(sessionStorage).length,
              },
            );
          }
        } catch (error) {
          console.error(
            `❌ HOME: Model loading failed (attempt ${attempts + 1}):`,
            {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            },
          );
        }

        attempts++;
        if (attempts < maxAttempts) {
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 200 * attempts));
        }
      }

      console.warn(
        "❌ HOME: Model loading failed after all attempts - no valid model data found",
      );
      // Don't set model to null here - let the 3D visualizer handle the empty state
    };

    // Load with retry mechanism
    loadModelWithRetry();

    // Set up event listeners for model updates
    const handleModelUpdate = (event: any) => {
      console.log("🏠 HOME: Model update event received:", {
        eventType: event.type,
        eventDetail: event.detail,
        timestamp: new Date().toISOString(),
      });
      // Use retry mechanism for event-triggered loads too
      setTimeout(loadModelWithRetry, 100);
    };

    const handleGeometryReady = (event: any) => {
      console.log("🏠 HOME: Geometry ready event received:", {
        eventType: event.type,
        eventDetail: event.detail,
        timestamp: new Date().toISOString(),
      });
      // Geometry is ready for immediate visualization
      setTimeout(loadModelWithRetry, 50);
    };

    window.addEventListener("modelReady", handleModelUpdate);
    window.addEventListener("geometryParsed", handleModelUpdate);
    window.addEventListener("geometryReady", handleGeometryReady);

    return () => {
      window.removeEventListener("modelReady", handleModelUpdate);
      window.removeEventListener("geometryParsed", handleModelUpdate);
      window.removeEventListener("geometryReady", handleGeometryReady);
    };
  }, [activeTab, mcp.current, mcp.isInitialized]);

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Building className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">AZLOAD</h1>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AZLOAD</h1>
                <p className="text-xs text-gray-600">
                  Structural Engineering AI Assistant
                </p>
              </div>
            </div>

            {/* User Info and Status Indicators */}
            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {user.full_name || user.email}
                      {isDevelopmentBypass && (
                        <Badge className="ml-2 bg-red-100 text-red-800 text-xs">
                          DEV BYPASS
                        </Badge>
                      )}
                      {!isDevelopmentBypass && (
                        <Badge className="ml-2 bg-green-100 text-green-800 text-xs">
                          PRODUCTION
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-600">
                      {user.company || "No company"}
                      {isDevelopmentBypass && " (Development Mode)"}
                      {!isDevelopmentBypass && " (Production Mode)"}
                    </div>
                  </div>

                  {/* Admin Panel Access Button */}
                  {user.is_admin && !isDevelopmentBypass && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open("/admin", "_blank")}
                      className="text-blue-600 hover:text-blue-900 border-blue-300"
                    >
                      <Shield className="w-4 h-4 mr-1" />
                      Admin Panel
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={logout}
                    className={
                      isDevelopmentBypass
                        ? "text-red-600 hover:text-red-900 border-red-300"
                        : "text-gray-600 hover:text-gray-900"
                    }
                  >
                    <User className="w-4 h-4 mr-1" />
                    {isDevelopmentBypass ? "Exit Dev Mode" : "Sign Out"}
                  </Button>
                </div>
              )}
              {model && (
                <div className="flex items-center space-x-2 text-sm">
                  <Building className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">{model.name}</span>
                  <Badge variant="outline">
                    {model.nodes?.length || 0} nodes,{" "}
                    {model.members?.length || 0} members
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {model.unitsSystem || "Unknown"} Units
                  </Badge>
                  {loadResults.length > 0 && (
                    <Badge variant="default" className="text-xs bg-green-600">
                      {loadResults.length} Load Types Calculated
                    </Badge>
                  )}
                </div>
              )}

              {mcp.current && (
                <div className="flex items-center space-x-2">
                  {mcp.current.isLocked ? (
                    <Lock className="w-4 h-4 text-green-600" />
                  ) : (
                    <Unlock className="w-4 h-4 text-orange-600" />
                  )}
                  <Badge
                    variant={mcp.current.isLocked ? "default" : "secondary"}
                  >
                    MCP {mcp.current.isLocked ? "Locked" : "Active"}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* MCP Status Card */}
        {mcp.current && (
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Brain className="w-8 h-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-blue-900">
                      AI Analysis: {mcp.current.buildingType.replace("_", " ")}
                    </h3>
                    <p className="text-sm text-blue-700">
                      Confidence:{" "}
                      {(mcp.current.buildingTypeConfidence * 100).toFixed(1)}% |
                      Height: {mcp.current.heightClassification} | Rigidity:{" "}
                      {mcp.current.structuralRigidity}
                    </p>
                    <p className="text-xs text-blue-600">
                      {mcp.current.aiReasoning?.some(
                        (r) =>
                          r.includes("ML API") || r.includes("Digital Ocean"),
                      )
                        ? "🌐 Digital Ocean ML API"
                        : "🔧 Static Rule-Based Analysis"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-blue-700">
                  <div>
                    <span className="text-gray-600">Nodes:</span>
                    <div className="font-medium">
                      {model?.nodes?.length || 0}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Members:</span>
                    <div className="font-medium">
                      {model?.members?.length || 0}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Tags:</span>
                    <div className="font-medium">
                      {mcp.current.memberTags.length}
                    </div>
                  </div>
                  {loadResults.length > 0 && (
                    <div>
                      <span className="text-gray-600">Load Types:</span>
                      <div className="font-medium text-green-600">
                        {loadResults.length}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(newTab) => {
            console.log("🏠 HOME: Tab change requested:", {
              from: activeTab,
              to: newTab,
              timestamp: new Date().toISOString(),
              hasModel: !!model,
              modelValid: !!(model?.nodes?.length && model?.members?.length),
              mcpExists: !!mcp.current,
              mcpLocked: mcp.current?.isLocked,
            });

            try {
              setActiveTab(newTab);
              console.log("🏠 HOME: Tab change completed successfully:", {
                newActiveTab: newTab,
                previousTab: activeTab,
                timestamp: new Date().toISOString(),
              });
            } catch (error) {
              console.error("❌ HOME: Tab change failed:", {
                error: error,
                errorMessage:
                  error instanceof Error ? error.message : String(error),
                from: activeTab,
                to: newTab,
                timestamp: new Date().toISOString(),
              });
            }
          }}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-9 bg-white p-1 rounded-lg shadow-sm">
            <TabsTrigger
              value="upload"
              className="flex items-center space-x-2 text-xs"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload</span>
              {getStatusIcon(getTabStatus("upload"))}
            </TabsTrigger>

            <TabsTrigger
              value="analyze"
              className="flex items-center space-x-2 text-xs"
            >
              <Eye className="w-4 h-4" />
              <Brain className="w-3 h-3" />
              <span className="hidden sm:inline">Analyze & View</span>
              {getStatusIcon(getTabStatus("analyze"))}
            </TabsTrigger>

            <TabsTrigger
              value="wind"
              className="flex items-center space-x-2 text-xs"
            >
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">Wind</span>
              {getStatusIcon(getTabStatus("wind"))}
            </TabsTrigger>

            <TabsTrigger
              value="seismic"
              className="flex items-center space-x-2 text-xs"
            >
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Seismic</span>
              {getStatusIcon(getTabStatus("seismic"))}
            </TabsTrigger>

            <TabsTrigger
              value="snow"
              className="flex items-center space-x-2 text-xs"
            >
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">Snow</span>
              {getStatusIcon(getTabStatus("snow"))}
            </TabsTrigger>

            <TabsTrigger
              value="results"
              className="flex items-center space-x-2 text-xs"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Results</span>
              {getStatusIcon(getTabStatus("results"))}
            </TabsTrigger>

            <TabsTrigger
              value="history"
              className="flex items-center space-x-2 text-xs"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
              {getStatusIcon(getTabStatus("history"))}
            </TabsTrigger>

            <TabsTrigger
              value="profile"
              className="flex items-center space-x-2 text-xs"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
              {getStatusIcon(getTabStatus("profile"))}
            </TabsTrigger>

            <TabsTrigger
              value="debug"
              className="flex items-center space-x-2 text-xs bg-red-50 border-red-200"
            >
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Debug</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents */}
          <TabsContent value="upload" className="space-y-6">
            <ModelUpload
              setActiveTab={(tab) => {
                console.log(
                  "🏠 HOME: ModelUpload requesting tab change to:",
                  tab,
                );
                console.log("🏠 HOME: Current state before tab change:", {
                  currentTab: activeTab,
                  hasModel: !!model,
                  mcpExists: !!mcp.current,
                  mcpLocked: mcp.current?.isLocked,
                  modelNodes: model?.nodes?.length || 0,
                  modelMembers: model?.members?.length || 0,
                  timestamp: new Date().toISOString(),
                });

                try {
                  console.log(
                    "🎯 HOME: Executing setActiveTab from ModelUpload:",
                    {
                      targetTab: tab,
                      currentTab: activeTab,
                      timestamp: new Date().toISOString(),
                    },
                  );

                  const result = setActiveTab(tab);

                  console.log("✅ HOME: Tab change completed by ModelUpload:", {
                    targetTab: tab,
                    result: result,
                    resultType: typeof result,
                    timestamp: new Date().toISOString(),
                  });
                } catch (error) {
                  console.error("❌ HOME: ModelUpload tab change failed:", {
                    error: error,
                    errorMessage:
                      error instanceof Error ? error.message : String(error),
                    errorStack:
                      error instanceof Error ? error.stack : "No stack",
                    targetTab: tab,
                    currentTab: activeTab,
                    timestamp: new Date().toISOString(),
                  });
                }
              }}
            />
          </TabsContent>

          <TabsContent value="analyze" className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <div className="text-sm font-medium text-blue-900 mb-2">
                🔍 DEBUG: Analyze Tab State
              </div>
              <div className="text-xs text-blue-800 space-y-1">
                <div>Current Tab: {activeTab}</div>
                <div>Has Model: {model ? "Yes" : "No"}</div>
                <div>Model Nodes: {model?.nodes?.length || 0}</div>
                <div>Model Members: {model?.members?.length || 0}</div>
                <div>MCP Exists: {mcp.current ? "Yes" : "No"}</div>
                <div>MCP Locked: {mcp.current?.isLocked ? "Yes" : "No"}</div>
                <div>Load Results: {loadResults.length}</div>
                <div>
                  Session Storage Keys: {Object.keys(sessionStorage).join(", ")}
                </div>
                <div>Timestamp: {new Date().toISOString()}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Model Analyzer with Error Boundary */}
              <div className="lg:col-span-1">
                <ErrorBoundary
                  fallbackTitle="Model Analyzer Error"
                  fallbackMessage="The model analyzer component encountered an error. This may be due to invalid model data or a processing issue."
                >
                  <ModelAnalyzer
                    model={model}
                    mcp={mcp.current}
                    onAnalysisComplete={handleAnalysisComplete}
                    onManualOverride={handleManualOverride}
                    onLockMCP={handleLockMCP}
                    onMemberHighlight={handleMemberHighlight}
                  />
                </ErrorBoundary>
              </div>

              {/* 3D Visualizer with Error Boundary */}
              <div className="lg:col-span-1">
                <ErrorBoundary
                  fallbackTitle="3D Visualizer Error"
                  fallbackMessage="The 3D visualizer component encountered an error. This may be due to WebGL issues or invalid model geometry."
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Eye className="w-5 h-5" />
                        <span>3D Model Viewer</span>
                        {loadResults.length > 0 && (
                          <Badge className="bg-green-100 text-green-800">
                            With Loads
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Interactive 3D visualization with AI-detected member
                        tags{loadResults.length > 0 && " and applied loads"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="h-[600px]">
                        <ThreeDVisualizer model={modelWithLoads || model} />
                      </div>
                    </CardContent>
                  </Card>
                </ErrorBoundary>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="wind" className="space-y-6">
            <WindLoadCalculator
              model={model}
              mcp={mcp.current}
              onCalculationComplete={handleCalculationComplete}
            />
          </TabsContent>

          <TabsContent value="seismic" className="space-y-6">
            <LoadParameters
              model={model}
              mcp={mcp.current}
              onCalculationComplete={handleCalculationComplete}
            />
          </TabsContent>

          <TabsContent value="snow" className="space-y-6">
            <LoadParameters
              model={model}
              mcp={mcp.current}
              onCalculationComplete={handleCalculationComplete}
            />
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {loadResults.length > 0 ? (
              <>
                <LoadResults
                  model={modelWithLoads || model}
                  mcp={mcp.current}
                  results={loadResults}
                  onGenerateReport={handleGenerateReport}
                />

                {/* Enhanced 3D Visualization with Loads */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Eye className="w-5 h-5" />
                        <span>3D Model with Applied Loads</span>
                      </div>
                      <div className="flex space-x-2">
                        <Badge className="bg-green-100 text-green-800">
                          {loadResults.reduce(
                            (sum, r) => sum + r.loads.length,
                            0,
                          )}{" "}
                          Total Loads
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateReport}
                          disabled={isLoading}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          {isLoading ? "Generating..." : "Generate Report"}
                        </Button>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      Interactive 3D model showing calculated loads with
                      color-coded visualization
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-[600px]">
                      <ThreeDVisualizer model={modelWithLoads || model} />
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Load Calculation Results
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Complete load calculations in the Wind, Seismic, or Snow
                    tabs to view results here.
                  </p>
                  <Button
                    onClick={() => setActiveTab("wind")}
                    disabled={!mcp.current?.isLocked}
                  >
                    Start Load Calculations
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <ProjectHistory />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <UserProfile />
          </TabsContent>

          <TabsContent value="debug" className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                🐛 Debug Console - Share This Data
              </h3>
              <p className="text-red-700 text-sm mb-2">
                This console captures all debug information. After uploading a
                file and experiencing the blank screen:
              </p>
              <ol className="text-red-700 text-sm space-y-1 ml-4 list-decimal">
                <li>Click "Copy All" or "Download" button below</li>
                <li>Share the console data in your next message</li>
                <li>This will help identify exactly where the process fails</li>
              </ol>
            </div>
            <DebugConsole />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default Home;
