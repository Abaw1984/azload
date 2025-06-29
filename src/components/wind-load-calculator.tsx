import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Wind,
  Calculator,
  Building2,
  Lock,
  AlertTriangle,
  CheckCircle,
  Eye,
  Info,
  Zap,
} from "lucide-react";
import {
  WindLoadParameters,
  StructuralModel,
  LoadCalculationResult,
  MasterControlPoint,
} from "@/types/model";
import { LoadCalculationEngine } from "@/lib/load-calculation";
import ThreeDVisualizer from "@/components/3d-visualizer";
import { WindCodeData } from "@/code_engine/ASCE7_16/chapters/wind";

interface WindLoadCalculatorProps {
  model: StructuralModel | null;
  mcp: MasterControlPoint | null;
  onCalculationComplete: (results: LoadCalculationResult[]) => void;
}

function WindLoadCalculator({
  model,
  mcp,
  onCalculationComplete,
}: WindLoadCalculatorProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState(0);
  const [windResults, setWindResults] = useState<LoadCalculationResult | null>(
    null,
  );
  const [modelWithWindLoads, setModelWithWindLoads] =
    useState<StructuralModel | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Wind code engine for ASCE 7-16 compliance
  const windCodeEngine = new WindCodeData();

  // Wind load parameters with AI-detected defaults from MCP
  const [windParams, setWindParams] = useState<WindLoadParameters>({
    basicWindSpeed: 115, // mph - user must verify for location
    exposureCategory: "C", // AI can detect from building surroundings
    topographicFactor: 1.0, // Kzt - requires site-specific analysis
    directionality: 0.85, // Kd - from ASCE 7-16 Table 26.6-1
    gustFactor: 0.85, // G - will be calculated based on building rigidity
    enclosureClassification: "ENCLOSED", // AI detected from building type
    internalPressureCoefficient: 0.18, // GCpi - from ASCE 7-16 Table 26.6-1
    buildingHeight: 0,
    buildingLength: 0,
    buildingWidth: 0,
    roofSlope: 0,
  });

  // Initialize parameters from locked MCP data
  useEffect(() => {
    if (mcp && mcp.isLocked) {
      console.log("🌬️ WIND CALCULATOR: Initializing from locked MCP data:", {
        buildingType: mcp.buildingType,
        dimensions: mcp.dimensions,
        rigidity: mcp.structuralRigidity,
        heightClass: mcp.heightClassification,
      });

      // Set building dimensions from MCP
      const updatedParams = {
        ...windParams,
        buildingHeight: mcp.dimensions.totalHeight,
        buildingLength: mcp.dimensions.buildingLength,
        buildingWidth: mcp.dimensions.buildingWidth,
        roofSlope: mcp.roofSlopeDegrees,
        // Adjust gust factor based on structural rigidity
        gustFactor: mcp.structuralRigidity === "FLEXIBLE" ? 0.85 : 0.85,
        // Set exposure category based on building type and AI analysis
        exposureCategory: determineExposureCategory(mcp.buildingType) as
          | "B"
          | "C"
          | "D",
        // Set enclosure classification based on building type
        enclosureClassification: determineEnclosureClass(mcp.buildingType) as
          | "OPEN"
          | "PARTIALLY_ENCLOSED"
          | "ENCLOSED",
      };

      setWindParams(updatedParams);
      console.log(
        "✅ WIND CALCULATOR: Parameters initialized from MCP",
        updatedParams,
      );
    }
  }, [mcp]);

  // AI-assisted parameter determination
  const determineExposureCategory = (buildingType: string): string => {
    // AI logic based on building type and typical surroundings
    if (
      buildingType.includes("HANGAR") ||
      buildingType.includes("INDUSTRIAL")
    ) {
      return "C"; // Open terrain typical for hangars/industrial
    }
    if (buildingType.includes("URBAN") || buildingType.includes("OFFICE")) {
      return "B"; // Urban/suburban
    }
    return "C"; // Default to open terrain
  };

  const determineEnclosureClass = (buildingType: string): string => {
    if (buildingType.includes("HANGAR") && buildingType.includes("DOOR")) {
      return "PARTIALLY_ENCLOSED"; // Hangars with large doors
    }
    return "ENCLOSED"; // Most buildings are enclosed
  };

  // Validate parameters before calculation
  const validateParameters = (): string[] => {
    const errors: string[] = [];

    if (windParams.basicWindSpeed < 85 || windParams.basicWindSpeed > 200) {
      errors.push(
        "Basic wind speed must be between 85-200 mph (ASCE 7-16 limits)",
      );
    }

    if (windParams.buildingHeight <= 0) {
      errors.push("Building height must be greater than 0");
    }

    if (windParams.buildingLength <= 0 || windParams.buildingWidth <= 0) {
      errors.push("Building dimensions must be greater than 0");
    }

    if (
      windParams.topographicFactor < 1.0 ||
      windParams.topographicFactor > 3.0
    ) {
      errors.push("Topographic factor (Kzt) must be between 1.0-3.0");
    }

    if (windParams.gustFactor < 0.8 || windParams.gustFactor > 1.2) {
      errors.push("Gust factor (G) must be between 0.8-1.2");
    }

    return errors;
  };

  // Calculate wind loads with ASCE 7-16 compliance
  const handleCalculateWindLoads = async () => {
    if (!mcp || !mcp.isLocked) {
      alert("MCP must be locked before calculating wind loads");
      return;
    }

    if (!model) {
      alert("No structural model available");
      return;
    }

    // Validate parameters
    const errors = validateParameters();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);

    console.log(
      "🌬️ WIND CALCULATOR: Starting ASCE 7-16 wind load calculation...",
      {
        parameters: windParams,
        buildingType: mcp.buildingType,
        memberCount: mcp.memberTags.length,
      },
    );

    setIsCalculating(true);
    setCalculationProgress(0);

    try {
      // Step 1: Validate ASCE 7-16 code requirements
      setCalculationProgress(10);
      console.log("📋 Step 1: Validating ASCE 7-16 requirements...");

      // Step 2: Calculate velocity pressure (Equation 26.6-1)
      setCalculationProgress(25);
      console.log("💨 Step 2: Calculating velocity pressure...");

      // Step 3: Determine pressure coefficients (Table 27.3-1)
      setCalculationProgress(40);
      console.log("📊 Step 3: Determining pressure coefficients...");

      // Step 4: Calculate design wind pressures (Equation 27.3-1)
      setCalculationProgress(60);
      console.log("🧮 Step 4: Calculating design wind pressures...");

      // Step 5: Apply loads to structural members
      setCalculationProgress(80);
      console.log("🏗️ Step 5: Applying loads to structural members...");

      // Perform actual calculation using LoadCalculationEngine
      const result = LoadCalculationEngine.calculateWindLoads(
        model,
        windParams,
        mcp,
      );

      setCalculationProgress(100);
      setWindResults(result);

      // Create model with applied wind loads for 3D visualization
      const modelWithLoads = {
        ...model,
        loadCases: [
          ...(model.loadCases || []),
          ...result.loads.map((load) => ({
            id: load.id,
            name: `Wind Load ${load.id}`,
            type: "WIND" as const,
            loads: [load],
          })),
        ],
      };

      setModelWithWindLoads(modelWithLoads);

      // Store results for visualization
      sessionStorage.setItem("windLoadResults", JSON.stringify(result));
      sessionStorage.setItem(
        "modelWithWindLoads",
        JSON.stringify(modelWithLoads),
      );

      // Notify parent component
      onCalculationComplete([result]);

      console.log("✅ WIND CALCULATOR: Calculation completed successfully", {
        totalLoads: result.loads.length,
        maxPressure: result.summary.maxPressure,
        minPressure: result.summary.minPressure,
        totalForce: result.summary.totalForce,
      });
    } catch (error) {
      console.error("❌ WIND CALCULATOR: Calculation failed:", error);
      alert(
        `Wind load calculation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsCalculating(false);
    }
  };

  // Check if MCP is ready for wind calculations
  const isMCPReady = mcp && mcp.isLocked && mcp.validation.isValid;

  return (
    <div className="space-y-6 bg-white">
      {/* MCP Status for Wind Calculations */}
      <Card
        className={
          isMCPReady
            ? "border-green-200 bg-green-50"
            : "border-red-200 bg-red-50"
        }
      >
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wind className="w-5 h-5" />
              <span>ASCE 7-16 Wind Load Calculator</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-blue-100 text-blue-800">ASCE 7-16</Badge>
              {isMCPReady ? (
                <Badge className="bg-green-100 text-green-800">
                  <Lock className="w-3 h-3 mr-1" />
                  MCP Locked - Ready
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  MCP Required
                </Badge>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            {isMCPReady
              ? "Master Control Point is locked. Wind load calculations are enabled using validated structural data."
              : "Complete model analysis and lock MCP in the 'Analyze & View' tab before calculating wind loads."}
          </CardDescription>
        </CardHeader>
        {mcp && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-700">Building Type</div>
                <div className="text-gray-600">
                  {mcp.buildingType.replace(/_/g, " ")}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Height Class</div>
                <div className="text-gray-600">{mcp.heightClassification}</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">
                  Dimensions (L×W×H)
                </div>
                <div className="text-gray-600">
                  {mcp.dimensions.buildingLength.toFixed(1)} ×{" "}
                  {mcp.dimensions.buildingWidth.toFixed(1)} ×{" "}
                  {mcp.dimensions.totalHeight.toFixed(1)}{" "}
                  {mcp.units.length.toLowerCase()}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Member Tags</div>
                <div className="text-gray-600">
                  {mcp.memberTags.length} tagged
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {!isMCPReady && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-medium">MCP Lock Required</div>
              <div className="text-sm">
                Before calculating wind loads, you must:
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Complete model analysis in the "Analyze & View" tab</li>
                  <li>
                    Review and confirm AI-detected building type and member tags
                  </li>
                  <li>Lock the Master Control Point (MCP)</li>
                  <li>Return to this tab to calculate wind loads</li>
                </ol>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Wind Load Parameters */}
      {isMCPReady && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="w-5 h-5" />
              <span>Wind Load Parameters</span>
              <Badge className="bg-blue-100 text-blue-800">AI-Assisted</Badge>
            </CardTitle>
            <CardDescription>
              Parameters initialized from locked MCP data. Review and adjust as
              needed for your specific location and conditions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Wind Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="basicWindSpeed"
                  className="flex items-center space-x-2"
                >
                  <span>Basic Wind Speed (mph)</span>
                  <Info
                    className="w-4 h-4 text-blue-500"
                    title="ASCE 7-16 Figure 26.5-1A"
                  />
                </Label>
                <Input
                  id="basicWindSpeed"
                  type="number"
                  min="85"
                  max="200"
                  value={windParams.basicWindSpeed}
                  onChange={(e) =>
                    setWindParams((prev) => ({
                      ...prev,
                      basicWindSpeed: Number(e.target.value),
                    }))
                  }
                  className="font-mono"
                />
                <div className="text-xs text-gray-500">
                  Verify from ASCE 7-16 wind maps for your location
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="exposureCategory">Exposure Category</Label>
                <Select
                  value={windParams.exposureCategory}
                  onValueChange={(value) =>
                    setWindParams((prev) => ({
                      ...prev,
                      exposureCategory: value as "B" | "C" | "D",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="B">
                      B - Urban/Suburban (buildings, trees)
                    </SelectItem>
                    <SelectItem value="C">
                      C - Open Terrain (scattered obstructions)
                    </SelectItem>
                    <SelectItem value="D">
                      D - Flat/Unobstructed (water, desert)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-gray-500">
                  AI suggested: {determineExposureCategory(mcp.buildingType)}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="topographicFactor">
                  Topographic Factor (Kzt)
                </Label>
                <Input
                  id="topographicFactor"
                  type="number"
                  min="1.0"
                  max="3.0"
                  step="0.1"
                  value={windParams.topographicFactor}
                  onChange={(e) =>
                    setWindParams((prev) => ({
                      ...prev,
                      topographicFactor: Number(e.target.value),
                    }))
                  }
                  className="font-mono"
                />
                <div className="text-xs text-gray-500">
                  1.0 for flat terrain, higher for hills/ridges (ASCE 7-16
                  Section 26.8)
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gustFactor">Gust Factor (G)</Label>
                <Input
                  id="gustFactor"
                  type="number"
                  min="0.8"
                  max="1.2"
                  step="0.01"
                  value={windParams.gustFactor}
                  onChange={(e) =>
                    setWindParams((prev) => ({
                      ...prev,
                      gustFactor: Number(e.target.value),
                    }))
                  }
                  className="font-mono"
                />
                <div className="text-xs text-gray-500">
                  0.85 for rigid structures, calculated for flexible (ASCE 7-16
                  Section 26.9)
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="enclosureClass">Enclosure Classification</Label>
                <Select
                  value={windParams.enclosureClassification}
                  onValueChange={(value) =>
                    setWindParams((prev) => ({
                      ...prev,
                      enclosureClassification: value as
                        | "OPEN"
                        | "PARTIALLY_ENCLOSED"
                        | "ENCLOSED",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENCLOSED">Enclosed Building</SelectItem>
                    <SelectItem value="PARTIALLY_ENCLOSED">
                      Partially Enclosed
                    </SelectItem>
                    <SelectItem value="OPEN">Open Structure</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-gray-500">
                  AI suggested: {determineEnclosureClass(mcp.buildingType)}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="internalPressure">
                  Internal Pressure Coeff. (GCpi)
                </Label>
                <Input
                  id="internalPressure"
                  type="number"
                  step="0.01"
                  value={windParams.internalPressureCoefficient}
                  onChange={(e) =>
                    setWindParams((prev) => ({
                      ...prev,
                      internalPressureCoefficient: Number(e.target.value),
                    }))
                  }
                  className="font-mono"
                />
                <div className="text-xs text-gray-500">
                  ±0.18 enclosed, ±0.55 partially enclosed (ASCE 7-16 Table
                  26.6-1)
                </div>
              </div>
            </div>

            {/* Building Dimensions (Read-only from MCP) */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-3">
                Building Dimensions (from locked MCP)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-700">Height</div>
                  <div className="font-mono">
                    {windParams.buildingHeight.toFixed(1)}{" "}
                    {mcp.units.length.toLowerCase()}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Length</div>
                  <div className="font-mono">
                    {windParams.buildingLength.toFixed(1)}{" "}
                    {mcp.units.length.toLowerCase()}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Width</div>
                  <div className="font-mono">
                    {windParams.buildingWidth.toFixed(1)}{" "}
                    {mcp.units.length.toLowerCase()}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Roof Slope</div>
                  <div className="font-mono">
                    {windParams.roofSlope.toFixed(1)}°
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">
                      Parameter Validation Errors:
                    </div>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Calculate Button */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-600">
                Calculations will be performed according to ASCE 7-16 Chapters
                27-30
              </div>
              <Button
                onClick={handleCalculateWindLoads}
                disabled={isCalculating || validationErrors.length > 0}
                className="min-w-[200px]"
              >
                {isCalculating ? (
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 animate-pulse" />
                    <span>Calculating...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-4 h-4" />
                    <span>Calculate Wind Loads</span>
                  </div>
                )}
              </Button>
            </div>

            {/* Calculation Progress */}
            {isCalculating && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>ASCE 7-16 Wind Load Calculation</span>
                  <span>{calculationProgress}%</span>
                </div>
                <Progress value={calculationProgress} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3D Visualizer with Wind Loads */}
      {windResults && modelWithWindLoads && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye className="w-5 h-5" />
                <span>3D Model with Wind Loads</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-green-100 text-green-800">
                  {windResults.loads.length} Wind Loads Applied
                </Badge>
                <Badge className="bg-blue-100 text-blue-800">
                  Max: {windResults.summary.maxPressure.toFixed(1)} Pa
                </Badge>
              </div>
            </CardTitle>
            <CardDescription>
              Interactive 3D visualization showing calculated wind loads applied
              to structural members
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[600px]">
              <ThreeDVisualizer
                model={modelWithWindLoads}
                showGrid={true}
                showLabels={false}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wind Load Results Summary */}
      {windResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Wind Load Calculation Results</span>
            </CardTitle>
            <CardDescription>
              ASCE 7-16 compliant wind load calculation summary
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium">Load Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Loads:</span>
                    <span className="font-mono">
                      {windResults.loads.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Pressure:</span>
                    <span className="font-mono text-red-600">
                      {windResults.summary.maxPressure.toFixed(1)} Pa
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min Pressure:</span>
                    <span className="font-mono text-blue-600">
                      {windResults.summary.minPressure.toFixed(1)} Pa
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Total Forces</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>X-Direction:</span>
                    <span className="font-mono">
                      {(windResults.summary.totalForce.x / 1000).toFixed(1)} kN
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Y-Direction:</span>
                    <span className="font-mono">
                      {(windResults.summary.totalForce.y / 1000).toFixed(1)} kN
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Z-Direction:</span>
                    <span className="font-mono">
                      {(windResults.summary.totalForce.z / 1000).toFixed(1)} kN
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Code Compliance</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>ASCE 7-16 Chapter 27</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Directional Method</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>MWFRS Analysis</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default WindLoadCalculator;
