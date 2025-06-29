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
  HardDrive,
  Cloud,
} from "lucide-react";
import { StructuralModel } from "@/types/model";
import { UniversalParser } from "@/lib/model-parser";
import { MCPManager } from "@/lib/mcp-manager";
import { useAuth } from "@/components/auth-context";
import { fileStorage, UploadProgress } from "@/lib/file-storage";

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
  const { user } = useAuth();
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    currentStep: "",
    error: null,
    warnings: [],
  });
  const [dragActive, setDragActive] = useState(false);
  const [persistentStorage, setPersistentStorage] = useState(true);
  const [storageProgress, setStorageProgress] = useState<UploadProgress | null>(
    null,
  );

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
      "🚀 ENHANCED UPLOAD WITH PERSISTENT STORAGE: Starting with memory cleanup and tracking",
      {
        fileName: file.name,
        fileSize: file.size,
        persistentStorage,
        userId: user?.id,
      },
    );

    if (!user) {
      setUploadState({
        isUploading: false,
        progress: 0,
        currentStep: "",
        error: "Please log in to upload files",
        warnings: [],
      });
      return;
    }

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
      progress: 5,
      currentStep: "Initializing upload with persistent storage...",
      error: null,
      warnings: [],
    });

    let storedFile = null;

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

      // STEP 0: Upload to persistent storage if enabled
      if (persistentStorage) {
        console.log("☁️ STEP 0: Uploading to persistent storage...");
        setUploadState((prev) => ({
          ...prev,
          progress: 15,
          currentStep: "Connecting to secure cloud storage...",
        }));

        try {
          // Add timeout wrapper for the entire storage upload
          const storageTimeout = 30000; // 30 seconds total timeout
          const storagePromise = fileStorage.uploadFile(
            file,
            user.id,
            undefined,
            (progress) => {
              setStorageProgress(progress);
              setUploadState((prev) => ({
                ...prev,
                progress: 15 + progress.percentage * 0.15, // 15-30% for storage upload
                currentStep: `Cloud storage: ${progress.message}`,
              }));
            },
          );

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              reject(
                new Error(
                  "Storage upload timeout - continuing with local processing",
                ),
              );
            }, storageTimeout);
          });

          storedFile = (await Promise.race([
            storagePromise,
            timeoutPromise,
          ])) as any;

          console.log(
            "✅ STEP 0 COMPLETE: File uploaded to persistent storage",
            storedFile.id,
          );
        } catch (storageError) {
          console.warn(
            "⚠️ Persistent storage failed, continuing with local processing:",
            storageError,
          );

          // Show user-friendly message about storage failure
          setUploadState((prev) => ({
            ...prev,
            progress: 30,
            currentStep: "Cloud storage unavailable - processing locally...",
          }));

          // Clear storage progress
          setStorageProgress(null);

          // Continue with local processing even if storage fails
        }
      }

      // STEP 1: Parse geometry with enhanced validation
      console.log("📐 STEP 1: Parse geometry with material validation...");
      setUploadState((prev) => ({
        ...prev,
        progress: 35,
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

      // Update file metadata if stored
      if (storedFile) {
        try {
          await fileStorage.updateFileMetadata(storedFile.id, {
            modelInfo: {
              nodes: parsedModel.nodes.length,
              members: parsedModel.members.length,
              materials: parsedModel.materials?.length || 0,
              sections: parsedModel.sections?.length || 0,
            },
            parsingStatus: "SUCCESS",
          });
          console.log("✅ File metadata updated in storage");
        } catch (metadataError) {
          console.warn("⚠️ Failed to update file metadata:", metadataError);
        }
      }

      // Fire geometry ready event
      window.dispatchEvent(
        new CustomEvent("geometryReady", {
          detail: {
            model: parsedModel,
            source: "enhanced-upload",
            uploadNumber: newCount,
            hasMaterials,
            materialValidation,
            storedFileId: storedFile?.id,
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

      // Update file metadata if stored but parsing failed
      if (storedFile) {
        try {
          await fileStorage.updateFileMetadata(storedFile.id, {
            parsingStatus: "FAILED",
            parsingError:
              error instanceof Error ? error.message : "Upload failed",
          });
        } catch (metadataError) {
          console.warn("⚠️ Failed to update error metadata:", metadataError);
        }
      }

      setUploadState({
        isUploading: false,
        progress: 0,
        currentStep: "",
        error: error instanceof Error ? error.message : "Upload failed",
        warnings: [],
      });
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
            calculation with secure cloud storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Storage Options */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Cloud className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="font-medium text-blue-900">
                    Secure Cloud Storage
                  </h4>
                  <p className="text-sm text-blue-700">
                    Files are automatically saved to secure cloud storage for
                    future access
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="persistent-storage"
                  checked={persistentStorage}
                  onChange={(e) => setPersistentStorage(e.target.checked)}
                  className="rounded"
                />
                <label
                  htmlFor="persistent-storage"
                  className="text-sm font-medium text-blue-900"
                >
                  Enable Storage
                </label>
              </div>
            </div>
          </div>

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
                  {storageProgress && (
                    <div className="text-xs text-blue-600">
                      Storage: {storageProgress.stage} -{" "}
                      {storageProgress.message}
                    </div>
                  )}
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

          {/* Enhanced Parsing Guidelines */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-900">
                    Enhanced Upload with Cloud Storage
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>
                      • <strong>Stage 0:</strong> Secure upload to cloud storage
                      with progress tracking
                    </li>
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
                    <li>• Maximum file size: 100 MB per file</li>
                    <li>• Files are encrypted and securely stored</li>
                    <li>• Access your files anytime from the File Manager</li>
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

          {/* Storage Benefits */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <HardDrive className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-medium text-green-900">
                    Cloud Storage Benefits
                  </h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>
                      • <strong>Persistent Access:</strong> Files remain
                      available across sessions
                    </li>
                    <li>
                      • <strong>Project History:</strong> Track all your
                      uploaded models
                    </li>
                    <li>
                      • <strong>Secure Backup:</strong> Never lose your
                      structural models
                    </li>
                    <li>
                      • <strong>Team Collaboration:</strong> Share files with
                      team members (coming soon)
                    </li>
                    <li>
                      • <strong>Version Control:</strong> Keep track of model
                      revisions
                    </li>
                    <li>
                      • <strong>Download Anytime:</strong> Retrieve original
                      files when needed
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
