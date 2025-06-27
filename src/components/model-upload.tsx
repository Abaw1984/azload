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
import { UniversalParser } from "@/lib/model-parser";
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

    console.log("📁 File dropped");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      console.log("📁 Dropped file details:", {
        name: e.dataTransfer.files[0].name,
        size: e.dataTransfer.files[0].size,
        type: e.dataTransfer.files[0].type,
      });
      handleUpload(e.dataTransfer.files[0]);
    } else {
      console.warn("⚠️ No file dropped or file is invalid");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("📁 File selected from input");
    if (e.target.files && e.target.files[0]) {
      console.log("📁 File details:", {
        name: e.target.files[0].name,
        size: e.target.files[0].size,
        type: e.target.files[0].type,
      });
      handleUpload(e.target.files[0]);
    } else {
      console.warn("⚠️ No file selected or file is invalid");
    }
  };

  async function handleUpload(file: File) {
    console.log(
      "🚀 ENHANCED UPLOAD: Starting with memory cleanup and tracking",
      {
        fileName: file.name,
        fileSize: file.size,
      },
    );

    // CRITICAL: Clear previous model data to prevent WebGL context loss
    console.log("🧹 CLEARING PREVIOUS MODEL DATA TO PREVENT MEMORY LEAKS");
    sessionStorage.removeItem("parsedModel");
    sessionStorage.removeItem("currentModel");
    sessionStorage.removeItem("parsedGeometry");

    // Force garbage collection delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Set loading state
    setUploadState({
      isUploading: true,
      progress: 10,
      currentStep: "Validating file and clearing memory...",
      error: null,
      warnings: [],
    });

    try {
      // Validate file type
      const fileExtension = file.name
        .toLowerCase()
        .substring(file.name.lastIndexOf("."));
      const supportedExtensions = supportedFormats.map((f) => f.extension);

      if (!supportedExtensions.includes(fileExtension)) {
        setUploadState({
          isUploading: false,
          progress: 0,
          currentStep: "",
          error: `Unsupported file format. Please upload ${supportedExtensions.join(", ")} files.`,
          warnings: [],
        });
        return;
      }

      // STEP 1: Parse geometry with enhanced validation
      console.log("📐 STEP 1: Parse geometry with material validation...");
      setUploadState((prev) => ({
        ...prev,
        progress: 30,
        currentStep: "Parsing geometry and validating materials...",
      }));

      const parsedModel = await UniversalParser.parseFile(file);

      if (!parsedModel?.nodes?.length || !parsedModel?.members?.length) {
        throw new Error("Invalid model - no geometry found");
      }

      console.log("✅ STEP 1 COMPLETE: Geometry parsed", {
        nodes: parsedModel.nodes.length,
        members: parsedModel.members.length,
        materials: parsedModel.materials?.length || 0,
        sections: parsedModel.sections?.length || 0,
      });

      // STEP 2: Enhanced material validation
      console.log("🔍 STEP 2: Enhanced material validation...");
      setUploadState((prev) => ({
        ...prev,
        progress: 50,
        currentStep: "Validating material assignments...",
      }));

      const materialValidation =
        UniversalParser.validateMaterialAssignments(parsedModel);
      parsedModel.materialValidation = materialValidation;

      const hasMaterials =
        materialValidation.materialsAssigned &&
        materialValidation.sectionsAssigned;
      const hasPartialMaterials =
        parsedModel.materials && parsedModel.materials.length > 1;

      console.log("📊 MATERIAL VALIDATION RESULTS:", {
        materialsAssigned: materialValidation.materialsAssigned,
        sectionsAssigned: materialValidation.sectionsAssigned,
        hasMaterials,
        hasPartialMaterials,
        membersWithoutMaterials:
          materialValidation.membersWithoutMaterials.length,
        membersWithoutSections:
          materialValidation.membersWithoutSections.length,
      });

      // STEP 3: Store and connect to 3D with tracking
      console.log("💾 STEP 3: Store with upload tracking...");
      setUploadState((prev) => ({
        ...prev,
        progress: 70,
        currentStep: "Storing model and updating counters...",
      }));

      // Update upload counter
      const currentCount = parseInt(
        sessionStorage.getItem("uploadCounter") || "0",
      );
      const newCount = currentCount + 1;
      sessionStorage.setItem("uploadCounter", newCount.toString());

      // Track upload details
      const uploadRecord = {
        id: crypto.randomUUID(),
        fileName: file.name,
        fileSize: file.size,
        timestamp: new Date().toISOString(),
        nodes: parsedModel.nodes.length,
        members: parsedModel.members.length,
        materials: parsedModel.materials?.length || 0,
        sections: parsedModel.sections?.length || 0,
        hasMaterials,
        uploadNumber: newCount,
      };

      const uploadHistory = JSON.parse(
        sessionStorage.getItem("uploadHistory") || "[]",
      );
      uploadHistory.push(uploadRecord);
      if (uploadHistory.length > 50)
        uploadHistory.splice(0, uploadHistory.length - 50); // Keep last 50
      sessionStorage.setItem("uploadHistory", JSON.stringify(uploadHistory));

      // Store the model
      sessionStorage.setItem("parsedModel", JSON.stringify(parsedModel));

      // Fire geometry ready event
      window.dispatchEvent(
        new CustomEvent("geometryReady", {
          detail: {
            model: parsedModel,
            source: "enhanced-upload",
            uploadNumber: newCount,
            hasMaterials,
            materialValidation,
          },
        }),
      );

      console.log("✅ STEP 3 COMPLETE: Model stored with tracking");

      // STEP 4: ML Analysis (only if materials are assigned)
      if (hasMaterials) {
        console.log("🤖 STEP 4: Materials found - initializing ML analysis...");
        setUploadState((prev) => ({
          ...prev,
          progress: 90,
          currentStep: "Initializing ML analysis and member tagging...",
        }));

        // Update ML training counter
        const mlCount = parseInt(
          sessionStorage.getItem("mlTrainingCount") || "0",
        );
        const newMLCount = mlCount + 1;
        sessionStorage.setItem("mlTrainingCount", newMLCount.toString());

        // Initialize ML in background
        setTimeout(async () => {
          try {
            await MCPManager.initializeFromModel(parsedModel);
            console.log(
              "✅ ML analysis complete - member tags should be active",
            );
          } catch (mlError) {
            console.warn(
              "⚠️ ML analysis failed but model is still usable:",
              mlError,
            );
          }
        }, 500);
      } else {
        console.log("⚠️ STEP 4: No materials - ML analysis skipped");
      }

      // Complete upload with enhanced feedback
      const warnings = [];
      if (!hasMaterials) {
        warnings.push("⚠️ CRITICAL: No materials assigned to members");
        warnings.push("• Load calculations are DISABLED");
        warnings.push("• ML member tagging is DISABLED");
        warnings.push("• Assign materials in your CAD software and re-upload");
      }
      if (materialValidation.membersWithoutMaterials.length > 0) {
        warnings.push(
          `${materialValidation.membersWithoutMaterials.length} members missing materials`,
        );
      }
      if (materialValidation.membersWithoutSections.length > 0) {
        warnings.push(
          `${materialValidation.membersWithoutSections.length} members missing sections`,
        );
      }

      setUploadState({
        isUploading: false,
        progress: 100,
        currentStep: "Upload complete!",
        error: null,
        warnings,
      });

      // Switch to analyze tab
      setTimeout(() => {
        setActiveTab("analyze");
        console.log("✅ Switched to analyze tab with enhanced tracking");
      }, 1000);
    } catch (error) {
      console.error("❌ Enhanced upload failed:", error);
      setUploadState({
        isUploading: false,
        progress: 0,
        currentStep: "",
        error: error instanceof Error ? error.message : "Upload failed",
        warnings: [],
      });
    }
  }

  // Store geometry-only model for visualization when materials are missing
  async function storeGeometryOnlyModel(model: StructuralModel): Promise<void> {
    try {
      console.log("💾 Storing geometry-only model for visualization...");

      const geometryData = {
        id: model.id,
        name: model.name,
        type: model.type,
        units: model.units,
        unitsSystem: model.unitsSystem,
        nodes: model.nodes,
        members: model.members,
        sections: model.sections || [],
        materials: model.materials || [],
        geometry: model.geometry,
        materialValidation: model.materialValidation,
        timestamp: Date.now(),
        status: "geometry_only",
        loadCalculationsEnabled: false,
      };

      const geometryJson = JSON.stringify(geometryData);

      // Store with special key to indicate geometry-only mode
      sessionStorage.setItem("parsedGeometry", geometryJson);
      sessionStorage.setItem("geometryOnlyMode", "true");

      // Fire geometry-only event
      const geometryEvent = new CustomEvent("geometryOnlyReady", {
        detail: {
          model: geometryData,
          materialsRequired: true,
          loadCalculationsDisabled: true,
        },
      });
      window.dispatchEvent(geometryEvent);

      console.log("✅ Geometry-only model stored successfully");
    } catch (error) {
      console.error("❌ Failed to store geometry-only model:", error);
    }
  }

  // Track model upload for ML training evaluation
  function trackModelUpload(model: StructuralModel): void {
    try {
      const uploadRecord = {
        id: crypto.randomUUID(),
        modelId: model.id,
        modelName: model.name,
        timestamp: new Date().toISOString(),
        nodes: model.nodes.length,
        members: model.members.length,
        materialsAssigned: model.materialValidation?.materialsAssigned || false,
        sectionsAssigned: model.materialValidation?.sectionsAssigned || false,
        fileType: model.type,
        unitsSystem: model.unitsSystem,
      };

      // Get existing upload records
      const existingUploads = JSON.parse(
        sessionStorage.getItem("modelUploads") || "[]",
      );

      existingUploads.push(uploadRecord);

      // Keep only last 100 uploads
      if (existingUploads.length > 100) {
        existingUploads.splice(0, existingUploads.length - 100);
      }

      sessionStorage.setItem("modelUploads", JSON.stringify(existingUploads));

      // Dispatch upload tracking event
      window.dispatchEvent(
        new CustomEvent("modelUploadTracked", {
          detail: {
            totalUploads: existingUploads.length,
            latestUpload: uploadRecord,
          },
        }),
      );

      console.log("📊 Model upload tracked for ML training evaluation", {
        totalUploads: existingUploads.length,
        modelId: model.id,
      });
    } catch (error) {
      console.warn("Failed to track model upload:", error);
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

          {/* Staged Parsing Guidelines */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-900">
                    Staged Parsing Workflow
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>
                      • <strong>Stage 1:</strong> Parse geometry for immediate
                      3D visualization
                    </li>
                    <li>
                      • <strong>Stage 2:</strong> Validate material assignments
                      in original file
                    </li>
                    <li>
                      • <strong>Stage 3:</strong> Enable ML API only if
                      materials are assigned
                    </li>
                    <li>• Maximum file size: 100 MB</li>
                    <li>
                      • Material properties must be assigned in STAAD.Pro or
                      SAP2000
                    </li>
                    <li>
                      • Load calculations require complete material definitions
                    </li>
                    <li>
                      • AI analysis works best with well-defined structural
                      systems
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
