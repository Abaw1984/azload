import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import ModelAnalyzer from "@/components/model-analyzer";
import { ModelParserFactory } from "@/lib/model-parser";

interface ModelUploadProps {
  onModelUploaded?: (model: StructuralModel) => void;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  currentStep: string;
  error: string | null;
  warnings: string[];
}

function ModelUpload({ onModelUploaded = () => {} }: ModelUploadProps) {
  const handleAnalysisComplete = (model: StructuralModel) => {
    console.log("Analysis completed:", model);
  };

  const navigate = useNavigate();
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
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    console.log("🎯 Starting file upload process:", file.name);

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

    setUploadState({
      isUploading: true,
      progress: 0,
      currentStep: "Uploading file to server",
      error: null,
      warnings: [],
    });

    try {
      // Simulate file upload and parsing process
      const steps = [
        { name: "Uploading file to server", duration: 500 },
        { name: "Validating file format", duration: 300 },
        { name: "Parsing structural model", duration: 1000 },
        { name: "Extracting geometry data", duration: 800 },
        { name: "Processing members and nodes", duration: 600 },
        { name: "Loading materials and sections", duration: 400 },
        { name: "Finalizing model structure", duration: 200 },
      ];

      let currentProgress = 0;
      const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);

      for (const step of steps) {
        setUploadState((prev) => ({
          ...prev,
          currentStep: step.name,
          progress: (currentProgress / totalDuration) * 100,
        }));

        await new Promise((resolve) => setTimeout(resolve, step.duration));
        currentProgress += step.duration;
      }

      // Parse with new professional parser
      setUploadState((prev) => ({
        ...prev,
        currentStep: "Parsing structural model...",
        progress: 85,
      }));

      console.log("🔧 Starting model parsing with ModelParserFactory...");
      const parsedModel = await ModelParserFactory.parseFile(file);
      console.log("✅ Model parsing completed successfully", parsedModel);

      // Enhanced validation with detailed logging
      if (!parsedModel) {
        console.error("❌ Parser returned null/undefined model");
        throw new Error("Parser failed to return a valid model");
      }

      if (!parsedModel.nodes) {
        console.error("❌ Model missing nodes array", parsedModel);
        throw new Error("Invalid model structure - missing nodes array");
      }

      if (!parsedModel.members) {
        console.error("❌ Model missing members array", parsedModel);
        throw new Error("Invalid model structure - missing members array");
      }

      if (!Array.isArray(parsedModel.nodes)) {
        console.error(
          "❌ Model nodes is not an array",
          typeof parsedModel.nodes,
        );
        throw new Error("Invalid model structure - nodes is not an array");
      }

      if (!Array.isArray(parsedModel.members)) {
        console.error(
          "❌ Model members is not an array",
          typeof parsedModel.members,
        );
        throw new Error("Invalid model structure - members is not an array");
      }

      if (parsedModel.nodes.length === 0) {
        console.error("❌ Model has empty nodes array");
        throw new Error("No nodes found in the model file - check file format");
      }

      if (parsedModel.members.length === 0) {
        console.error("❌ Model has empty members array");
        throw new Error(
          "No members found in the model file - check file format",
        );
      }

      console.log(`✅ Model Parsing Complete:`, {
        name: parsedModel.name,
        type: parsedModel.type,
        nodes: parsedModel.nodes.length,
        members: parsedModel.members.length,
        geometry: parsedModel.geometry,
        units: parsedModel.units,
        hasValidStructure: true,
      });

      // Set progress to 90% before callback
      setUploadState((prev) => ({
        ...prev,
        currentStep: "Initializing model analysis...",
        progress: 90,
      }));

      console.log(
        "🎯 Calling onModelUploaded callback with validated model...",
      );
      console.log("📤 Invoking onModelUploaded callback...");

      // Call parent callback and handle the response
      console.log("📤 Calling onModelUploaded with validated model...");
      try {
        await onModelUploaded(parsedModel);
        console.log("✅ onModelUploaded callback completed successfully");
      } catch (callbackError) {
        console.error("❌ onModelUploaded callback failed:", callbackError);
        throw new Error(
          `Model processing failed: ${callbackError instanceof Error ? callbackError.message : "Unknown error"}`,
        );
      }

      // Set final success state
      setUploadState({
        isUploading: false,
        progress: 100,
        currentStep: "Model uploaded successfully! Switching to visualizer...",
        error: null,
        warnings: [],
      });

      // Brief delay to show success message
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error("❌ File parsing/processing failed:", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack trace",
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      let errorMessage = "Failed to parse file";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setUploadState({
        isUploading: false,
        progress: 0,
        currentStep: "",
        error: errorMessage,
        warnings: [],
      });

      console.log("❌ Upload failed, staying on upload page for user to retry");
    }
  };

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
