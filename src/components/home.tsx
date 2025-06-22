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
import LoadParameters from "@/components/load-parameters";
import LoadResults from "@/components/load-results";
import ProjectHistory from "@/components/project-history";
import UserProfile from "@/components/user-profile";

// Import hooks and utilities
import { useMCP } from "@/lib/mcp-manager";
import { StructuralModel, LoadCalculationResult } from "@/types/model";

function Home() {
  const [activeTab, setActiveTab] = useState("upload");
  const [model, setModel] = useState<StructuralModel | null>(null);
  const [loadResults, setLoadResults] = useState<LoadCalculationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const mcp = useMCP();

  // Load model from session storage on component mount
  useEffect(() => {
    console.log("🏠 HOME: Component mounted, checking for existing model...");

    const loadStoredModel = () => {
      try {
        const storedModel = sessionStorage.getItem("parsedModel");
        if (storedModel) {
          const parsedModel = JSON.parse(storedModel);
          console.log("✅ HOME: Found stored model:", {
            name: parsedModel.name,
            nodes: parsedModel.nodes?.length || 0,
            members: parsedModel.members?.length || 0,
          });
          setModel(parsedModel);

          // If we have a model but no MCP, switch to visualize tab
          if (!mcp.current && parsedModel) {
            console.log(
              "🔄 HOME: Model found but no MCP, switching to visualize tab",
            );
            setActiveTab("visualize");
          }
        }
      } catch (error) {
        console.error("❌ HOME: Failed to load stored model:", error);
      }
    };

    loadStoredModel();

    // Listen for model updates
    const handleModelReady = () => {
      console.log("📡 HOME: Received modelReady event");
      setTimeout(loadStoredModel, 100);
    };

    const handleGeometryParsed = () => {
      console.log("📡 HOME: Received geometryParsed event");
      setTimeout(loadStoredModel, 100);
    };

    window.addEventListener("modelReady", handleModelReady);
    window.addEventListener("geometryParsed", handleGeometryParsed);

    return () => {
      window.removeEventListener("modelReady", handleModelReady);
      window.removeEventListener("geometryParsed", handleGeometryParsed);
    };
  }, [mcp.current]);

  // Handle analysis completion
  const handleAnalysisComplete = (analysisResult: any) => {
    console.log("🔬 HOME: Analysis completed:", analysisResult);
    // Analysis results are handled by MCP manager
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
    setActiveTab("results");
  };

  // Handle report generation
  const handleGenerateReport = () => {
    console.log("📄 HOME: Generating report...");
    // Implement report generation logic
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

            {/* Status Indicators */}
            <div className="flex items-center space-x-4">
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
                      {mcp.current.aiReasoning?.includes("ML API")
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
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
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
          </TabsList>

          {/* Tab Contents */}
          <TabsContent value="upload" className="space-y-6">
            <ModelUpload setActiveTab={setActiveTab} />
          </TabsContent>

          <TabsContent value="analyze" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Model Analyzer */}
              <div className="lg:col-span-1">
                <ModelAnalyzer
                  model={model}
                  mcp={mcp.current}
                  onAnalysisComplete={handleAnalysisComplete}
                  onManualOverride={handleManualOverride}
                  onLockMCP={handleLockMCP}
                />
              </div>

              {/* 3D Visualizer */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Eye className="w-5 h-5" />
                      <span>3D Model Viewer</span>
                    </CardTitle>
                    <CardDescription>
                      Interactive 3D visualization with AI-detected member tags
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-[600px]">
                      <ThreeDVisualizer />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="wind" className="space-y-6">
            <LoadParameters
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
            <LoadResults
              model={model}
              mcp={mcp.current}
              results={loadResults}
              onGenerateReport={handleGenerateReport}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <ProjectHistory />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <UserProfile />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default Home;
