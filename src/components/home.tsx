import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  FileText,
  BarChart3,
  Settings,
  User,
  Building,
  Zap,
  Wind,
  Snowflake,
  Users,
  Weight,
  Truck,
  Brain,
  Eye,
  Download,
  Calculator,
  Shield,
  Clock,
  Target,
  Layers,
  CheckCircle,
  ArrowRight,
  Play,
  History,
  Activity,
} from "lucide-react";
import ModelUpload from "./model-upload";
import ProjectHistory from "./project-history";
import UserProfile from "./user-profile";
import ModelAnalyzer from "./model-analyzer";
import LoadParameters from "./load-parameters";
import LoadResults from "./load-results";
import ThreeDVisualizer from "./3d-visualizer";
import {
  StructuralModel,
  LoadCalculationResult,
  Node,
  Member,
  MasterControlPoint,
} from "@/types/model";
import { MCPManager, useMCP } from "@/lib/mcp-manager";

function Home() {
  const [activeTab, setActiveTab] = useState("upload");
  // REMOVED: Local model state - MCP is ONLY source of truth
  // const [currentModel, setCurrentModel] = useState<StructuralModel | null>(null);
  const [loadResults, setLoadResults] = useState<LoadCalculationResult[]>([]);

  // MCP Integration
  const mcp = useMCP();

  const features = [
    {
      icon: Upload,
      title: "Model Upload & Parsing",
      description:
        "Support for STAAD.Pro and SAP2000 files with intelligent parsing",
      status: "Available",
      color: "bg-blue-100 text-blue-600",
    },
    {
      icon: Brain,
      title: "AI Building Classification",
      description:
        "Automatic detection of building types and member tags with 98% accuracy",
      status: "Available",
      color: "bg-purple-100 text-purple-600",
    },
    {
      icon: Eye,
      title: "3D Model Visualization",
      description:
        "Interactive 3D viewer with load visualization and member selection",
      status: "Available",
      color: "bg-green-100 text-green-600",
    },
    {
      icon: Calculator,
      title: "ASCE 7-16 Load Calculations",
      description:
        "Comprehensive Wind, Seismic, Snow, Live, Dead, and Crane load calculations",
      status: "Available",
      color: "bg-orange-100 text-orange-600",
    },
    {
      icon: FileText,
      title: "Professional Reports",
      description:
        "Engineer-grade PDF reports with detailed calculations and code references",
      status: "Available",
      color: "bg-indigo-100 text-indigo-600",
    },
    {
      icon: Download,
      title: "Model Export",
      description:
        "Export updated models back to original STAAD.Pro and SAP2000 formats",
      status: "Available",
      color: "bg-teal-100 text-teal-600",
    },
  ];

  const loadTypes = [
    {
      icon: Wind,
      name: "Wind Loads",
      color: "text-blue-500",
      chapter: "Ch. 27-30",
    },
    {
      icon: Zap,
      name: "Seismic Loads",
      color: "text-red-500",
      chapter: "Ch. 11-16",
    },
    {
      icon: Snowflake,
      name: "Snow Loads",
      color: "text-cyan-500",
      chapter: "Ch. 7",
    },
    {
      icon: Users,
      name: "Live Loads",
      color: "text-green-500",
      chapter: "Ch. 4",
    },
    {
      icon: Weight,
      name: "Dead Loads",
      color: "text-gray-500",
      chapter: "Ch. 3",
    },
    {
      icon: Truck,
      name: "Crane Loads",
      color: "text-orange-500",
      chapter: "Sec. 4.9",
    },
  ];

  const benefits = [
    {
      icon: Clock,
      title: "90% Time Reduction",
      description:
        "Automate repetitive load calculations and reduce manual effort",
    },
    {
      icon: Target,
      title: "Enhanced Accuracy",
      description:
        "AI-powered analysis eliminates human errors in load calculations",
    },
    {
      icon: Shield,
      title: "Code Compliance",
      description:
        "Strict adherence to ASCE 7-16 standards with full traceability",
    },
    {
      icon: Layers,
      title: "Centralized Platform",
      description: "Cloud-native SaaS with integrated project management",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="rounded-lg flex items-center justify-center w-20 h-[20]">
                <img
                  src="/az-logo.png"
                  alt="AZLOAD Logo"
                  className="w-10 h-10 object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AZLOAD</h1>
                <p className="text-xs text-gray-500">
                  AI-Powered Structural Load Analysis
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-10 lg:w-[1200px] mx-auto">
              <TabsTrigger
                value="upload"
                className="flex items-center space-x-1"
              >
                <Upload className="w-3 h-3" />
                <span className="text-xs">Upload</span>
              </TabsTrigger>
              <TabsTrigger
                value="visualize"
                className="flex items-center space-x-1"
                disabled={!mcp.current}
              >
                <Eye className="w-3 h-3" />
                <span className="text-xs">Visualize</span>
              </TabsTrigger>
              <TabsTrigger
                value="wind"
                className="flex items-center space-x-1"
                disabled={!mcp.current}
              >
                <Wind className="w-3 h-3" />
                <span className="text-xs">Wind</span>
              </TabsTrigger>
              <TabsTrigger
                value="seismic"
                className="flex items-center space-x-1"
                disabled={!mcp.current}
              >
                <Zap className="w-3 h-3" />
                <span className="text-xs">Seismic</span>
              </TabsTrigger>
              <TabsTrigger
                value="crane"
                className="flex items-center space-x-1"
                disabled={!mcp.current}
              >
                <Truck className="w-3 h-3" />
                <span className="text-xs">Crane</span>
              </TabsTrigger>
              <TabsTrigger
                value="snow"
                className="flex items-center space-x-1"
                disabled={!mcp.current}
              >
                <Snowflake className="w-3 h-3" />
                <span className="text-xs">Snow</span>
              </TabsTrigger>
              <TabsTrigger
                value="live"
                className="flex items-center space-x-1"
                disabled={!mcp.current}
              >
                <Users className="w-3 h-3" />
                <span className="text-xs">Live</span>
              </TabsTrigger>
              <TabsTrigger
                value="dead"
                className="flex items-center space-x-1"
                disabled={!mcp.current}
              >
                <Weight className="w-3 h-3" />
                <span className="text-xs">Dead</span>
              </TabsTrigger>
              <TabsTrigger
                value="dynamic"
                className="flex items-center space-x-1"
                disabled={!mcp.current}
              >
                <Activity className="w-3 h-3" />
                <span className="text-xs">Dynamic</span>
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="flex items-center space-x-1"
                disabled={!mcp.current}
              >
                <FileText className="w-3 h-3" />
                <span className="text-xs">Reports</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Upload Structural Model
              </h2>
              <p className="text-gray-600">
                Upload your STAAD.Pro or SAP2000 model files to begin analysis
              </p>
            </div>
            <ModelUpload
              onModelUploaded={async (model) => {
                console.log("🎯 Model uploaded successfully:", {
                  name: model.name,
                  nodes: model.nodes?.length || 0,
                  members: model.members?.length || 0,
                  type: model.type,
                  fullModel: model,
                });

                // Validate model structure
                if (
                  !model.nodes ||
                  !Array.isArray(model.nodes) ||
                  model.nodes.length === 0
                ) {
                  console.error(
                    "❌ Invalid model: missing, invalid, or empty nodes array",
                  );
                  throw new Error(
                    "Invalid model: The uploaded file contains no valid node data. Please check your file format and try again.",
                  );
                }

                if (
                  !model.members ||
                  !Array.isArray(model.members) ||
                  model.members.length === 0
                ) {
                  console.error(
                    "❌ Invalid model: missing, invalid, or empty members array",
                  );
                  throw new Error(
                    "Invalid model: The uploaded file contains no valid member connectivity data. Please check your file format and try again.",
                  );
                }

                // Store model in session storage for 3D visualizer
                sessionStorage.setItem("currentModel", JSON.stringify(model));
                console.log(
                  "💾 Model stored in session storage for 3D visualizer",
                );

                // Initialize MCP as the source of truth
                console.log("🎯 Initializing MCP as Single Source of Truth...");
                await mcp.initializeFromModel(model);
                console.log(
                  "✅ MCP initialized successfully - Single Source of Truth established",
                );

                // Log MCP initialization details
                if (mcp.current) {
                  console.log("🎯 MCP Details (source of truth):", {
                    buildingType: mcp.current.buildingType,
                    unitsSystem: mcp.current.unitsSystem,
                    memberTags: mcp.current.memberTags.length,
                    dimensions: mcp.current.dimensions,
                    isValid: mcp.current.validation.isValid,
                    confidence: mcp.current.buildingTypeConfidence,
                  });
                }

                // Switch to visualize tab after successful processing
                console.log("🎯 Switching to visualize tab...");
                setActiveTab("visualize");
                console.log("✅ Successfully switched to visualize tab");
              }}
            />
          </TabsContent>

          {/* Visualize Tab - MCP-ONLY Control Panel */}
          <TabsContent value="visualize" className="space-y-6">
            {mcp.current ? (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Model Visualization & Analysis
                  </h2>
                  <p className="text-gray-600">
                    Master Control Point (MCP) - Single source of truth for all
                    model data and calculations
                  </p>
                  {mcp.current && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          variant={
                            mcp.current.isLocked ? "default" : "secondary"
                          }
                          className="flex items-center space-x-1"
                        >
                          <span>{mcp.current.isLocked ? "🔒" : "🔓"}</span>
                          <span>
                            MCP {mcp.current.isLocked ? "Locked" : "Unlocked"}
                          </span>
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Single Source of Truth
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Building Type:</span>
                          <div className="font-medium">
                            {mcp.current.buildingType}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Units System:</span>
                          <div className="font-medium">
                            {mcp.current.unitsSystem}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">AI Confidence:</span>
                          <div className="font-medium">
                            {(mcp.current.buildingTypeConfidence * 100).toFixed(
                              1,
                            )}
                            %
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Tagged Members:</span>
                          <div className="font-medium">
                            {mcp.current.memberTags.length}
                          </div>
                        </div>
                      </div>
                      {mcp.current.validation.warnings.length > 0 && (
                        <div className="mt-2 text-xs text-yellow-700">
                          ⚠️ {mcp.current.validation.warnings.length} warning(s)
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Model Analysis Panel - Restored */}
                <ModelAnalyzer
                  model={null}
                  mcp={mcp.current}
                  onAnalysisComplete={async (updatedModel) => {
                    // CRITICAL: Do NOT update local model state
                    console.log(
                      "🎯 MCP-ONLY: Analysis complete, updating MCP directly",
                    );

                    // Update MCP with analysis results (MCP is ONLY source of truth)
                    if (updatedModel.buildingType && mcp.current) {
                      try {
                        mcp.updateBuildingType(
                          updatedModel.buildingType,
                          false,
                        );
                        console.log(
                          "✅ MCP updated with analysis results - ONLY source of truth",
                        );
                      } catch (error) {
                        console.error("❌ Failed to update MCP:", error);
                      }
                    }
                  }}
                  onManualOverride={(overrides) => {
                    console.log("🎯 Manual override requested:", overrides);
                    if (mcp.current && !mcp.current.isLocked) {
                      try {
                        if (overrides.buildingType) {
                          mcp.updateBuildingType(overrides.buildingType, true);
                        }
                        if (overrides.memberTags) {
                          overrides.memberTags.forEach((tag) => {
                            mcp.updateMemberTag(tag.memberId, tag.tag, true);
                          });
                        }
                        console.log("✅ Manual overrides applied to MCP");
                      } catch (error) {
                        console.error(
                          "❌ Failed to apply manual overrides:",
                          error,
                        );
                        alert(
                          `Failed to apply overrides: ${error instanceof Error ? error.message : "Unknown error"}`,
                        );
                      }
                    } else {
                      alert(
                        "Cannot apply overrides - MCP is locked or not initialized",
                      );
                    }
                  }}
                  onLockMCP={() => {
                    console.log("🔒 Manual MCP lock requested");
                    if (mcp.current && !mcp.current.isLocked) {
                      try {
                        mcp.lockMCP();
                        console.log("✅ MCP locked manually");
                        alert(
                          "MCP locked successfully. Model is now ready for load calculations.",
                        );
                      } catch (error) {
                        console.error("❌ Failed to lock MCP:", error);
                        alert(
                          `Failed to lock MCP: ${error instanceof Error ? error.message : "Unknown error"}`,
                        );
                      }
                    } else {
                      alert(
                        mcp.current?.isLocked
                          ? "MCP is already locked"
                          : "MCP not initialized",
                      );
                    }
                  }}
                />

                {/* 3D Visualizer */}
                <Card>
                  <CardHeader>
                    <CardTitle>3D Model Viewer</CardTitle>
                    <CardDescription>
                      Interactive visualization of your structural model
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-[600px] bg-white border rounded-lg relative overflow-hidden shadow-inner">
                      <ThreeDVisualizer />
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Load Calculation Quick Actions</CardTitle>
                    <CardDescription>
                      Navigate to specific load calculation modules
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Button
                        variant="outline"
                        className="h-20 flex flex-col space-y-2"
                        onClick={() => setActiveTab("wind")}
                      >
                        <Wind className="w-6 h-6 text-blue-500" />
                        <span>Wind Loads</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-20 flex flex-col space-y-2"
                        onClick={() => setActiveTab("seismic")}
                      >
                        <Zap className="w-6 h-6 text-red-500" />
                        <span>Seismic Loads</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-20 flex flex-col space-y-2"
                        onClick={() => setActiveTab("crane")}
                      >
                        <Truck className="w-6 h-6 text-orange-500" />
                        <span>Crane Loads</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-20 flex flex-col space-y-2"
                        onClick={() => setActiveTab("snow")}
                      >
                        <Snowflake className="w-6 h-6 text-cyan-500" />
                        <span>Snow Loads</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-20 flex flex-col space-y-2"
                        onClick={() => setActiveTab("live")}
                      >
                        <Users className="w-6 h-6 text-green-500" />
                        <span>Live Loads</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-20 flex flex-col space-y-2"
                        onClick={() => setActiveTab("dead")}
                      >
                        <Weight className="w-6 h-6 text-gray-500" />
                        <span>Dead Loads</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-20 flex flex-col space-y-2"
                        onClick={() => setActiveTab("dynamic")}
                      >
                        <Activity className="w-6 h-6 text-purple-500" />
                        <span>Dynamic</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-20 flex flex-col space-y-2"
                        onClick={() => setActiveTab("reports")}
                      >
                        <FileText className="w-6 h-6 text-indigo-500" />
                        <span>Reports</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12">
                <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No MCP Initialized
                </h3>
                <p className="text-gray-600 mb-4">
                  Please upload a structural model first to initialize the
                  Master Control Point (MCP).
                </p>
                <Button onClick={() => setActiveTab("upload")}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Model
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Wind Load Tab */}
          <TabsContent value="wind" className="space-y-6">
            {mcp.current ? (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Wind Load Calculations
                  </h2>
                  <p className="text-gray-600">
                    ASCE 7-16 compliant wind load analysis for{" "}
                    {mcp.current.modelName}
                  </p>
                </div>
                <LoadParameters
                  model={null}
                  mcp={mcp.current}
                  onCalculationComplete={(results) => {
                    setLoadResults(results);
                    setActiveTab("reports");
                  }}
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <Wind className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Wind Load Analysis
                </h3>
                <p className="text-gray-600 mb-4">
                  Upload a model to access wind load calculations
                </p>
                <Button onClick={() => setActiveTab("upload")}>
                  Upload Model First
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Seismic Load Tab */}
          <TabsContent value="seismic" className="space-y-6">
            {mcp.current ? (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Seismic Load Calculations
                  </h2>
                  <p className="text-gray-600">
                    ASCE 7-16 compliant seismic analysis for{" "}
                    {mcp.current.modelName}
                  </p>
                </div>
                <LoadParameters
                  model={null}
                  mcp={mcp.current}
                  onCalculationComplete={(results) => {
                    setLoadResults(results);
                    setActiveTab("reports");
                  }}
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <Zap className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Seismic Load Analysis
                </h3>
                <p className="text-gray-600 mb-4">
                  Upload a model to access seismic load calculations
                </p>
                <Button onClick={() => setActiveTab("upload")}>
                  Upload Model First
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Crane Load Tab */}
          <TabsContent value="crane" className="space-y-6">
            {mcp.current ? (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Crane Load Calculations
                  </h2>
                  <p className="text-gray-600">
                    Industrial crane load analysis for {mcp.current.modelName}
                  </p>
                </div>
                <LoadParameters
                  model={null}
                  mcp={mcp.current}
                  onCalculationComplete={(results) => {
                    setLoadResults(results);
                    setActiveTab("reports");
                  }}
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <Truck className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Crane Load Analysis
                </h3>
                <p className="text-gray-600 mb-4">
                  Upload a model to access crane load calculations
                </p>
                <Button onClick={() => setActiveTab("upload")}>
                  Upload Model First
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Snow Load Tab */}
          <TabsContent value="snow" className="space-y-6">
            {mcp.current ? (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Snow Load Calculations
                  </h2>
                  <p className="text-gray-600">
                    ASCE 7-16 compliant snow load analysis for{" "}
                    {mcp.current.modelName}
                  </p>
                </div>
                <LoadParameters
                  model={null}
                  mcp={mcp.current}
                  onCalculationComplete={(results) => {
                    setLoadResults(results);
                    setActiveTab("reports");
                  }}
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <Snowflake className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Snow Load Analysis
                </h3>
                <p className="text-gray-600 mb-4">
                  Upload a model to access snow load calculations
                </p>
                <Button onClick={() => setActiveTab("upload")}>
                  Upload Model First
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Live Load Tab */}
          <TabsContent value="live" className="space-y-6">
            {mcp.current ? (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Live Load Calculations
                  </h2>
                  <p className="text-gray-600">
                    Occupancy-based live load analysis for{" "}
                    {mcp.current.modelName}
                  </p>
                </div>
                <LoadParameters
                  model={null}
                  mcp={mcp.current}
                  onCalculationComplete={(results) => {
                    setLoadResults(results);
                    setActiveTab("reports");
                  }}
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Live Load Analysis
                </h3>
                <p className="text-gray-600 mb-4">
                  Upload a model to access live load calculations
                </p>
                <Button onClick={() => setActiveTab("upload")}>
                  Upload Model First
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Dead Load Tab */}
          <TabsContent value="dead" className="space-y-6">
            {mcp.current ? (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Dead Load Calculations
                  </h2>
                  <p className="text-gray-600">
                    Self-weight and permanent load analysis for{" "}
                    {mcp.current.modelName}
                  </p>
                </div>
                <LoadParameters
                  model={null}
                  mcp={mcp.current}
                  onCalculationComplete={(results) => {
                    setLoadResults(results);
                    setActiveTab("reports");
                  }}
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <Weight className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Dead Load Analysis
                </h3>
                <p className="text-gray-600 mb-4">
                  Upload a model to access dead load calculations
                </p>
                <Button onClick={() => setActiveTab("upload")}>
                  Upload Model First
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Dynamic Machinery Tab */}
          <TabsContent value="dynamic" className="space-y-6">
            {mcp.current ? (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Dynamic Machinery Loads
                  </h2>
                  <p className="text-gray-600">
                    Vibration and dynamic load analysis for{" "}
                    {mcp.current.modelName}
                  </p>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Dynamic Load Analysis</CardTitle>
                    <CardDescription>
                      Configure machinery and equipment dynamic loads
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">
                        Dynamic machinery load calculations coming soon
                      </p>
                      <Badge variant="outline">Under Development</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Dynamic Machinery Analysis
                </h3>
                <p className="text-gray-600 mb-4">
                  Upload a model to access dynamic load calculations
                </p>
                <Button onClick={() => setActiveTab("upload")}>
                  Upload Model First
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            {mcp.current ? (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Analysis Reports
                  </h2>
                  <p className="text-gray-600">
                    Comprehensive engineering reports for{" "}
                    {mcp.current.modelName}
                  </p>
                </div>
                {loadResults.length > 0 ? (
                  <LoadResults
                    model={null}
                    mcp={mcp.current}
                    results={loadResults}
                    onGenerateReport={() => {
                      // Handle report generation with MCP data ONLY
                      console.log(
                        "Generating comprehensive report with MCP data ONLY...",
                      );
                      if (mcp.current) {
                        console.log("MCP Export - STAAD:", mcp.exportToSTAAD());
                        console.log(
                          "MCP Export - SAP2000:",
                          mcp.exportToSAP2000(),
                        );
                      }
                    }}
                  />
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Master Control Point Status</CardTitle>
                      <CardDescription>
                        MCP must be locked before generating reports
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        {mcp.current ? (
                          <div className="space-y-4">
                            <div className="text-lg font-medium">
                              {mcp.current.isLocked
                                ? "MCP Locked ✅"
                                : "MCP Not Locked ❌"}
                            </div>
                            <div className="text-sm text-gray-600">
                              Building Type: {mcp.current.buildingType}
                              <br />
                              Confidence:{" "}
                              {(
                                mcp.current.buildingTypeConfidence * 100
                              ).toFixed(1)}
                              %<br />
                              Members Tagged: {mcp.current.memberTags.length}
                              <br />
                              Validation:{" "}
                              {mcp.current.validation.isValid
                                ? "✅ Valid"
                                : "❌ Invalid"}
                            </div>
                            {!mcp.current.isLocked && (
                              <Button
                                onClick={() => {
                                  try {
                                    mcp.lockMCP();
                                    console.log("🔒 MCP locked successfully");
                                  } catch (error) {
                                    console.error(
                                      "❌ Failed to lock MCP:",
                                      error,
                                    );
                                    alert(
                                      error instanceof Error
                                        ? error.message
                                        : "Failed to lock MCP",
                                    );
                                  }
                                }}
                                disabled={!mcp.current.validation.isValid}
                              >
                                Lock MCP for Calculations
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div>
                            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 mb-4">
                              No MCP initialized. Upload and analyze a model
                              first.
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Analysis Reports
                </h3>
                <p className="text-gray-600 mb-4">
                  Upload a model to access report generation
                </p>
                <Button onClick={() => setActiveTab("upload")}>
                  Upload Model First
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Legacy Overview Tab - Hidden but kept for reference */}
          <TabsContent
            value="overview"
            className="space-y-8"
            style={{ display: "none" }}
          >
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Revolutionize Structural Load Analysis
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Leverage AI and machine learning for automated load
                calculations, intelligent model analysis, and comprehensive ASCE
                7-16 compliant reporting.
              </p>
              <div className="flex justify-center space-x-4">
                <Button
                  size="lg"
                  className="px-8"
                  onClick={() => setActiveTab("upload")}
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Model
                </Button>
                <Button variant="outline" size="lg" className="px-8">
                  <Play className="w-5 h-5 mr-2" />
                  View Demo
                </Button>
              </div>
            </div>

            {/* Key Features */}
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Platform Capabilities
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <Card
                      key={index}
                      className="hover:shadow-lg transition-shadow"
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div
                            className={`w-12 h-12 rounded-lg flex items-center justify-center ${feature.color}`}
                          >
                            <Icon className="w-6 h-6" />
                          </div>
                          <Badge
                            variant={
                              feature.status === "Available"
                                ? "default"
                                : feature.status === "In Development"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {feature.status}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">
                          {feature.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription>{feature.description}</CardDescription>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Load Types */}
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Supported Load Types (ASCE 7-16)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {loadTypes.map((load, index) => {
                  const Icon = load.icon;
                  return (
                    <Card
                      key={index}
                      className="text-center hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-6">
                        <Icon
                          className={`w-8 h-8 mx-auto mb-2 ${load.color}`}
                        />
                        <p className="font-medium text-gray-900">{load.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {load.chapter}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Benefits */}
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Why Choose AZLOAD?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {benefits.map((benefit, index) => {
                  const Icon = benefit.icon;
                  return (
                    <Card
                      key={index}
                      className="text-center hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-6">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                          <Icon className="w-6 h-6 text-blue-600" />
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-2">
                          {benefit.title}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {benefit.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Statistics */}
            <div className="mb-12">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">
                    Platform Statistics
                  </CardTitle>
                  <CardDescription className="text-center">
                    Real-time metrics from our growing user base
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div>
                      <div className="text-3xl font-bold text-blue-600">
                        500+
                      </div>
                      <div className="text-sm text-gray-600">
                        Models Analyzed
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-green-600">
                        15,000+
                      </div>
                      <div className="text-sm text-gray-600">
                        Load Calculations
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-purple-600">
                        98%
                      </div>
                      <div className="text-sm text-gray-600">AI Accuracy</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-orange-600">
                        1,200+
                      </div>
                      <div className="text-sm text-gray-600">
                        Reports Generated
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Start */}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Get Started in 3 Simple Steps
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-xl font-bold text-blue-600">1</span>
                  </div>
                  <h4 className="font-semibold">Upload Your Model</h4>
                  <p className="text-gray-600">
                    Upload STAAD.Pro (.std) or SAP2000 (.s2k) files for analysis
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("upload")}
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Start Upload
                  </Button>
                </div>
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-xl font-bold text-green-600">2</span>
                  </div>
                  <h4 className="font-semibold">
                    AI Analysis & Load Calculation
                  </h4>
                  <p className="text-gray-600">
                    Let AI classify your building and calculate loads
                    automatically
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    <Brain className="w-4 h-4 mr-2" />
                    AI Analysis
                  </Button>
                </div>
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-xl font-bold text-purple-600">3</span>
                  </div>
                  <h4 className="font-semibold">
                    Generate Professional Report
                  </h4>
                  <p className="text-gray-600">
                    Download comprehensive PDF reports with detailed
                    calculations
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    <Download className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default Home;
