import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Building,
  Layers,
  Database,
  Zap,
} from "lucide-react";
import { StructuralModel } from "@/types/model";
import { ModelParserFactory } from "@/lib/model-parser";
import { MCPManager } from "@/lib/mcp-manager";

interface ModelUploadProps {
  setActiveTab: (tab: string) => void;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  currentStep: string;
  error: string | null;
  warnings: string[];
}

function ModelUpload({ setActiveTab }: ModelUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    currentStep: "",
    error: null,
    warnings: [],
  });
  const [dragActive, setDragActive] = useState(false);

  const supportedFormats = [
    {
      extension: ".std",
      name: "STAAD.Pro",
      description: "STAAD.Pro structural model files",
      icon: Building,
    },
    {
      extension: ".s2k",
      name: "SAP2000",
      description: "SAP2000 structural analysis files",
      icon: Layers,
    },
    {
      extension: ".sdb",
      name: "SAP2000 Database",
      description: "SAP2000 database files",
      icon: Database,
    },
  ];

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  async function handleUpload(file: File) {
    console.log("🚀 BULLETPROOF UPLOAD WORKFLOW START:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString(),
    });

    // Validate file type
    const fileExtension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."));
    const supportedExtensions = supportedFormats.map((f) => f.extension);

    if (!supportedExtensions.includes(fileExtension)) {
      console.error("❌ Unsupported file format:", fileExtension);
      setUploadState({
        isUploading: false,
        progress: 0,
        currentStep: "",
        error: `Unsupported file format. Please upload ${supportedExtensions.join(", ")} files.`,
        warnings: [],
      });
      return;
    }

    try {
      // STEP 1: Start upload with detailed logging
      console.log("📤 STEP 1: Starting upload process...");
      setUploadState({
        isUploading: true,
        progress: 10,
        currentStep: "Reading file...",
        error: null,
        warnings: [],
      });

      // STEP 2: Parse file with enhanced error handling
      console.log("🔍 STEP 2: Parsing structural model...");
      setUploadState((prev) => ({
        ...prev,
        progress: 30,
        currentStep: "Parsing structural model...",
      }));

      const parsedModel = await ModelParserFactory.parseFile(file);
      console.log("✅ STEP 2 COMPLETE: Model parsed successfully:", {
        name: parsedModel.name,
        nodes: parsedModel.nodes?.length || 0,
        members: parsedModel.members?.length || 0,
        units: parsedModel.units,
        unitsSystem: parsedModel.unitsSystem,
        hasGeometry: !!parsedModel.geometry,
        geometryDetails: parsedModel.geometry
          ? {
              buildingLength: parsedModel.geometry.buildingLength,
              buildingWidth: parsedModel.geometry.buildingWidth,
              totalHeight: parsedModel.geometry.totalHeight,
            }
          : null,
      });

      // CRITICAL: Validate parsed model before proceeding
      if (!parsedModel || !parsedModel.nodes || !parsedModel.members) {
        throw new Error("Invalid parsed model - missing nodes or members");
      }

      if (parsedModel.nodes.length === 0) {
        throw new Error("Parsed model has no nodes");
      }

      if (parsedModel.members.length === 0) {
        throw new Error("Parsed model has no members");
      }

      // STEP 3: Store in session with verification
      console.log("💾 STEP 3: Storing model data in sessionStorage...");
      setUploadState((prev) => ({
        ...prev,
        progress: 50,
        currentStep: "Storing model data...",
      }));

      try {
        const modelJson = JSON.stringify(parsedModel);
        sessionStorage.setItem("parsedModel", modelJson);

        // Verify storage immediately
        const storedModel = sessionStorage.getItem("parsedModel");
        if (!storedModel) {
          throw new Error("Failed to store model in sessionStorage");
        }

        // Verify we can parse it back
        const verifyModel = JSON.parse(storedModel);
        if (!verifyModel.nodes || !verifyModel.members) {
          throw new Error("Stored model verification failed");
        }

        console.log(
          "✅ STEP 3 COMPLETE: Model stored and verified in sessionStorage",
        );
      } catch (storageError) {
        console.error("❌ Storage failed:", storageError);
        throw new Error(
          `Failed to store model: ${storageError instanceof Error ? storageError.message : "Unknown storage error"}`,
        );
      }

      // STEP 4: Initialize MCP with bulletproof error handling
      console.log("🤖 STEP 4: Initializing MCP with AI analysis...");
      setUploadState((prev) => ({
        ...prev,
        progress: 70,
        currentStep: "Initializing AI analysis...",
      }));

      try {
        console.log("🔄 MCP Manager obtained, starting initialization...");

        await MCPManager.initializeFromModel(parsedModel);

        // Verify MCP was actually initialized
        const mcpState = MCPManager.getState();
        console.log("🔍 MCP State after initialization:", {
          isInitialized: mcpState.isInitialized,
          hasCurrent: !!mcpState.current,
          error: mcpState.error,
          currentId: mcpState.current?.id,
        });

        if (!mcpState.isInitialized || !mcpState.current) {
          throw new Error(
            `MCP initialization failed: ${mcpState.error || "Unknown MCP error"}`,
          );
        }

        console.log("✅ STEP 4 COMPLETE: MCP initialized successfully:", {
          mcpId: mcpState.current.id,
          buildingType: mcpState.current.buildingType,
          confidence:
            (mcpState.current.buildingTypeConfidence * 100).toFixed(1) + "%",
          memberTags: mcpState.current.memberTags.length,
        });
      } catch (mcpError) {
        console.error("❌ MCP initialization failed:", mcpError);
        throw new Error(
          `AI analysis failed: ${mcpError instanceof Error ? mcpError.message : "Unknown MCP error"}`,
        );
      }

      // STEP 5: Fire events with verification
      console.log("📡 STEP 5: Firing geometry events...");
      setUploadState((prev) => ({
        ...prev,
        progress: 90,
        currentStep: "Preparing visualization...",
      }));

      try {
        // Fire geometry event with detailed payload
        const geometryEvent = new CustomEvent("geometryParsed", {
          detail: {
            model: parsedModel,
            timestamp: Date.now(),
            source: "model-upload",
          },
        });
        window.dispatchEvent(geometryEvent);

        // Also fire a model ready event
        const readyEvent = new CustomEvent("modelReady", {
          detail: {
            modelId: parsedModel.id,
            timestamp: Date.now(),
          },
        });
        window.dispatchEvent(readyEvent);

        console.log("✅ STEP 5 COMPLETE: Events fired successfully");
      } catch (eventError) {
        console.warn("⚠️ Event firing failed (non-critical):", eventError);
        // Don't fail the entire process for event errors
      }

      // STEP 6: Complete and switch tab
      console.log("🎯 STEP 6: Completing upload workflow...");
      setUploadState({
        isUploading: false,
        progress: 100,
        currentStep: "Upload complete!",
        error: null,
        warnings: [],
      });

      // Small delay to show completion, then switch tab
      setTimeout(() => {
        console.log("✅ STEP 6 COMPLETE: Switching to analyze tab");
        console.log("🎉 UPLOAD WORKFLOW COMPLETE - ALL SYSTEMS GO!");
        setActiveTab("analyze");
      }, 1000); // Increased delay to ensure everything is ready
    } catch (error) {
      console.error("❌ BULLETPROOF UPLOAD WORKFLOW FAILED:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        fileName: file.name,
        timestamp: new Date().toISOString(),
      });

      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";

      setUploadState({
        isUploading: false,
        progress: 0,
        currentStep: "",
        error: `Upload failed: ${errorMessage}`,
        warnings: [],
      });

      // Enhanced cleanup on failure
      console.log("🧹 Cleaning up after failure...");
      try {
        sessionStorage.removeItem("parsedModel");
        sessionStorage.removeItem("currentModel");
        sessionStorage.removeItem("parsedGeometry");
        MCPManager.resetMCP();
        console.log("✅ Cleanup completed");
      } catch (cleanupError) {
        console.error("❌ Cleanup failed:", cleanupError);
      }
    }
  }

  return (
    <div className="space-y-6 bg-white">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Upload Structural Model</span>
          </CardTitle>
          <CardDescription>
            Upload STAAD.Pro or SAP2000 files for AI-powered analysis and load
            calculation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50"
                : uploadState.error
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300 hover:border-gray-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {uploadState.isUploading ? (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Zap className="w-8 h-8 text-blue-600 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    {uploadState.currentStep}
                  </p>
                  <Progress
                    value={uploadState.progress}
                    className="w-full max-w-md mx-auto"
                  />
                  <p className="text-sm text-gray-600">
                    {Math.round(uploadState.progress)}% complete
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8 text-gray-600" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    Drag and drop your structural model file here
                  </p>
                  <p className="text-gray-600">or</p>
                  <div>
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".std,.s2k,.sdb"
                      onChange={handleFileSelect}
                    />
                    <Button
                      onClick={() =>
                        document.getElementById("file-upload")?.click()
                      }
                      className="px-6"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Browse Files
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {uploadState.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{uploadState.error}</AlertDescription>
            </Alert>
          )}

          {/* Warnings Display */}
          {uploadState.warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">Parsing Warnings:</div>
                  {uploadState.warnings.map((warning, index) => (
                    <div key={index} className="text-sm">
                      • {warning}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Supported Formats */}
          <div className="space-y-4">
            <h4 className="font-medium">Supported File Formats</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {supportedFormats.map((format, index) => {
                const Icon = format.icon;
                return (
                  <Card key={index} className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{format.name}</span>
                          <Badge variant="outline">{format.extension}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {format.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Upload Guidelines */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-900">
                    Upload Guidelines
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Maximum file size: 100 MB</li>
                    <li>
                      • Ensure model contains complete node coordinates and
                      member connectivity
                    </li>
                    <li>
                      • Parser supports both STAAD.Pro V8i and CONNECT Edition
                      formats
                    </li>
                    <li>
                      • Material properties and section definitions will be
                      automatically extracted or defaulted
                    </li>
                    <li>
                      • Existing load cases will be preserved and enhanced with
                      ASCE 7-16 calculations
                    </li>
                    <li>
                      • AI analysis works best with well-defined structural
                      systems and clear member tagging
                    </li>
                    <li>
                      • Files with comments and various formatting styles are
                      fully supported
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}

export default ModelUpload;
