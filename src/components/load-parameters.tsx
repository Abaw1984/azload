import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Wind,
  Zap,
  Snowflake,
  Users,
  Weight,
  Truck,
  Info,
  Calculator,
  Building2,
  Gauge,
} from "lucide-react";
import {
  WindLoadParameters,
  SeismicLoadParameters,
  SnowLoadParameters,
  StructuralModel,
  LoadCalculationResult,
  MasterControlPoint,
} from "@/types/model";
import { LoadCalculationEngine } from "@/lib/load-calculation";

interface LoadParametersProps {
  model: StructuralModel;
  mcp: MasterControlPoint | null;
  onCalculationComplete: (results: LoadCalculationResult[]) => void;
}

function LoadParameters({
  model,
  mcp,
  onCalculationComplete,
}: LoadParametersProps) {
  const [selectedLoadTypes, setSelectedLoadTypes] = useState<string[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Wind load parameters - use MCP data if available
  const [windParams, setWindParams] = useState<WindLoadParameters>({
    basicWindSpeed: 115,
    exposureCategory: "C",
    topographicFactor: 1.0,
    directionality: 0.85,
    gustFactor: mcp?.structuralRigidity === "FLEXIBLE" ? 0.85 : 0.85, // Adjust based on rigidity
    enclosureClassification: "ENCLOSED",
    internalPressureCoefficient: 0.18,
    buildingHeight:
      mcp?.dimensions.totalHeight || model.geometry?.totalHeight || 10,
    buildingLength:
      mcp?.dimensions.buildingLength || model.geometry?.buildingLength || 30,
    buildingWidth:
      mcp?.dimensions.buildingWidth || model.geometry?.buildingWidth || 20,
    roofSlope:
      mcp?.roofSlopeDegrees ||
      mcp?.dimensions.roofSlope ||
      model.geometry?.roofSlope ||
      5,
  });

  // Seismic load parameters
  const [seismicParams, setSeismicParams] = useState<SeismicLoadParameters>({
    siteClass: "D",
    ss: 1.5,
    s1: 0.6,
    fa: 1.0,
    fv: 1.5,
    importanceFactor: 1.0,
    responseModificationFactor: 3.5,
    overstrengthFactor: 3.0,
    deflectionAmplificationFactor: 3.0,
    seismicWeight: 1000000, // N
  });

  // Snow load parameters
  const [snowParams, setSnowParams] = useState<SnowLoadParameters>({
    groundSnowLoad: 1.44, // kN/m²
    exposureFactor: 1.0,
    thermalFactor: 1.0,
    importanceFactor: 1.0,
    roofSlope: mcp?.dimensions.roofSlope || model.geometry?.roofSlope || 5,
    roofLength:
      mcp?.dimensions.buildingLength || model.geometry?.buildingLength || 30,
    isWarmRoof: false,
    hasParapet: false,
  });

  // Other load parameters
  const [liveLoadParams, setLiveLoadParams] = useState({
    occupancyCategory: "Industrial",
    liveLoadPsf: 125, // psf
  });

  const [deadLoadParams, setDeadLoadParams] = useState({
    materialDensities: { steel: 7850, concrete: 2400 },
    additionalDeadLoad: 0.5, // kN/m²
  });

  const [craneParams, setCraneParams] = useState({
    craneCapacity: 50000, // N
    craneWeight: 25000, // N
    wheelLoads: [4, 4], // Number of wheels per side
    impactFactor: 0.25,
  });

  const loadTypeOptions = [
    {
      id: "WIND",
      name: "Wind Loads",
      icon: Wind,
      color: "bg-blue-100 text-blue-800",
      description: "ASCE 7-16 Chapter 27-30",
    },
    {
      id: "SEISMIC",
      name: "Seismic Loads",
      icon: Zap,
      color: "bg-red-100 text-red-800",
      description: "ASCE 7-16 Chapter 11-16",
    },
    {
      id: "SNOW",
      name: "Snow Loads",
      icon: Snowflake,
      color: "bg-cyan-100 text-cyan-800",
      description: "ASCE 7-16 Chapter 7",
    },
    {
      id: "LIVE",
      name: "Live Loads",
      icon: Users,
      color: "bg-green-100 text-green-800",
      description: "ASCE 7-16 Chapter 4",
    },
    {
      id: "DEAD",
      name: "Dead Loads",
      icon: Weight,
      color: "bg-gray-100 text-gray-800",
      description: "ASCE 7-16 Chapter 3",
    },
    {
      id: "CRANE",
      name: "Crane Loads",
      icon: Truck,
      color: "bg-orange-100 text-orange-800",
      description: "ASCE 7-16 Section 4.9",
    },
  ];

  const handleLoadTypeToggle = (loadType: string) => {
    setSelectedLoadTypes((prev) =>
      prev.includes(loadType)
        ? prev.filter((t) => t !== loadType)
        : [...prev, loadType],
    );
  };

  const handleCalculateLoads = async () => {
    if (selectedLoadTypes.length === 0) {
      alert("Please select at least one load type to calculate.");
      return;
    }

    // Check MCP status
    if (!mcp) {
      alert(
        "Master Control Point not initialized. Please analyze the model first.",
      );
      return;
    }

    if (!mcp.isLocked) {
      alert(
        "Master Control Point must be locked before running calculations. Please confirm your analysis first.",
      );
      return;
    }

    if (!mcp.validation.isValid) {
      alert(
        "Master Control Point has validation errors. Please resolve them first.",
      );
      return;
    }

    console.log("🎯 Starting load calculations with MCP data:", {
      buildingType: mcp.buildingType,
      memberCount: mcp.memberTags.length,
      dimensions: mcp.dimensions,
    });

    setIsCalculating(true);
    const results: LoadCalculationResult[] = [];

    try {
      for (const loadType of selectedLoadTypes) {
        let result: LoadCalculationResult;

        switch (loadType) {
          case "WIND":
            result = LoadCalculationEngine.calculateWindLoads(
              model,
              windParams,
            );
            break;
          case "SEISMIC":
            result = LoadCalculationEngine.calculateSeismicLoads(
              model,
              seismicParams,
            );
            break;
          case "SNOW":
            result = LoadCalculationEngine.calculateSnowLoads(
              model,
              snowParams,
            );
            break;
          case "LIVE":
            result = LoadCalculationEngine.calculateLiveLoads(
              model,
              liveLoadParams,
            );
            break;
          case "DEAD":
            result = LoadCalculationEngine.calculateDeadLoads(
              model,
              deadLoadParams,
            );
            break;
          case "CRANE":
            result = LoadCalculationEngine.calculateCraneLoads(
              model,
              craneParams,
            );
            break;
          default:
            continue;
        }

        results.push(result);
      }

      onCalculationComplete(results);
    } catch (error) {
      console.error("Load calculation error:", error);
      alert("Error calculating loads. Please check your parameters.");
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="space-y-6 bg-white">
      {/* MCP Summary for Load Calculations */}
      {mcp && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>MCP Load Calculation Data</span>
              </div>
              <Badge
                className={
                  mcp.isLocked
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }
              >
                {mcp.isLocked ? "✅ Ready" : "❌ Not Ready"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Master Control Point data used for all load calculations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium">Building Type</div>
                <div className="text-gray-600">{mcp.buildingType}</div>
              </div>
              <div>
                <div className="font-medium">Height Classification</div>
                <div className="text-gray-600">{mcp.heightClassification}</div>
              </div>
              <div>
                <div className="font-medium">Structural Rigidity</div>
                <div className="text-gray-600">{mcp.structuralRigidity}</div>
              </div>
              <div>
                <div className="font-medium">Units System</div>
                <div className="text-gray-600">{mcp.unitsSystem}</div>
              </div>
              <div>
                <div className="font-medium">Dimensions (L×W×H)</div>
                <div className="text-gray-600">
                  {mcp.dimensions.buildingLength.toFixed(1)} ×{" "}
                  {mcp.dimensions.buildingWidth.toFixed(1)} ×{" "}
                  {mcp.dimensions.totalHeight.toFixed(1)}{" "}
                  {mcp.units.length.toLowerCase()}
                </div>
              </div>
              <div>
                <div className="font-medium">Roof Slope</div>
                <div className="text-gray-600">
                  {mcp.roofSlopeDegrees.toFixed(1)}°
                </div>
              </div>
              <div>
                <div className="font-medium">Frame Configuration</div>
                <div className="text-gray-600">
                  {mcp.framesX} × {mcp.framesY}
                </div>
              </div>
              <div>
                <div className="font-medium">Diaphragm Type</div>
                <div className="text-gray-600">{mcp.diaphragmType}</div>
              </div>
            </div>

            {!mcp.isLocked && (
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  MCP must be locked in the Visualize tab before running load
                  calculations. This ensures all calculations use consistent,
                  validated data.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="w-5 h-5" />
            <span>Load Calculation Parameters</span>
          </CardTitle>
          <CardDescription>
            Configure load parameters according to ASCE 7-16 standards (using
            MCP data as baseline)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Load Type Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Select Load Types to Calculate
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {loadTypeOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedLoadTypes.includes(option.id);

                  return (
                    <div
                      key={option.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 shadow-md"
                          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                      }`}
                      onClick={() => handleLoadTypeToggle(option.id)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{option.name}</span>
                          </div>
                          {isSelected && (
                            <Badge className={option.color}>Selected</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Parameter Input Tabs */}
            {selectedLoadTypes.length > 0 && (
              <Tabs defaultValue={selectedLoadTypes[0]} className="space-y-4">
                <TabsList className="grid w-full grid-cols-6">
                  {selectedLoadTypes.map((loadType) => {
                    const option = loadTypeOptions.find(
                      (o) => o.id === loadType,
                    );
                    const Icon = option?.icon || Calculator;

                    return (
                      <TabsTrigger
                        key={loadType}
                        value={loadType}
                        className="flex items-center space-x-1"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">
                          {option?.name.split(" ")[0]}
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {/* Wind Load Parameters */}
                {selectedLoadTypes.includes("WIND") && (
                  <TabsContent value="WIND" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Wind Load Parameters (ASCE 7-16)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="basicWindSpeed">
                            Basic Wind Speed (mph)
                          </Label>
                          <Input
                            id="basicWindSpeed"
                            type="number"
                            value={windParams.basicWindSpeed}
                            onChange={(e) =>
                              setWindParams((prev) => ({
                                ...prev,
                                basicWindSpeed: Number(e.target.value),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="exposureCategory">
                            Exposure Category
                          </Label>
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
                                B - Urban/Suburban
                              </SelectItem>
                              <SelectItem value="C">
                                C - Open Terrain
                              </SelectItem>
                              <SelectItem value="D">
                                D - Flat/Unobstructed
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="topographicFactor">
                            Topographic Factor (Kzt)
                          </Label>
                          <Input
                            id="topographicFactor"
                            type="number"
                            step="0.1"
                            value={windParams.topographicFactor}
                            onChange={(e) =>
                              setWindParams((prev) => ({
                                ...prev,
                                topographicFactor: Number(e.target.value),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gustFactor">Gust Factor (G)</Label>
                          <Input
                            id="gustFactor"
                            type="number"
                            step="0.01"
                            value={windParams.gustFactor}
                            onChange={(e) =>
                              setWindParams((prev) => ({
                                ...prev,
                                gustFactor: Number(e.target.value),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="enclosureClass">
                            Enclosure Classification
                          </Label>
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
                              <SelectItem value="ENCLOSED">Enclosed</SelectItem>
                              <SelectItem value="PARTIALLY_ENCLOSED">
                                Partially Enclosed
                              </SelectItem>
                              <SelectItem value="OPEN">Open</SelectItem>
                            </SelectContent>
                          </Select>
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
                                internalPressureCoefficient: Number(
                                  e.target.value,
                                ),
                              }))
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* Seismic Load Parameters */}
                {selectedLoadTypes.includes("SEISMIC") && (
                  <TabsContent value="SEISMIC" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Seismic Load Parameters (ASCE 7-16)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="siteClass">Site Class</Label>
                          <Select
                            value={seismicParams.siteClass}
                            onValueChange={(value) =>
                              setSeismicParams((prev) => ({
                                ...prev,
                                siteClass: value as
                                  | "A"
                                  | "B"
                                  | "C"
                                  | "D"
                                  | "E"
                                  | "F",
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A">A - Hard Rock</SelectItem>
                              <SelectItem value="B">B - Rock</SelectItem>
                              <SelectItem value="C">
                                C - Very Dense Soil
                              </SelectItem>
                              <SelectItem value="D">D - Stiff Soil</SelectItem>
                              <SelectItem value="E">E - Soft Clay</SelectItem>
                              <SelectItem value="F">
                                F - Special Study
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ss">Mapped Ss (g)</Label>
                          <Input
                            id="ss"
                            type="number"
                            step="0.1"
                            value={seismicParams.ss}
                            onChange={(e) =>
                              setSeismicParams((prev) => ({
                                ...prev,
                                ss: Number(e.target.value),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="s1">Mapped S1 (g)</Label>
                          <Input
                            id="s1"
                            type="number"
                            step="0.1"
                            value={seismicParams.s1}
                            onChange={(e) =>
                              setSeismicParams((prev) => ({
                                ...prev,
                                s1: Number(e.target.value),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="responseModification">
                            Response Modification Factor (R)
                          </Label>
                          <Input
                            id="responseModification"
                            type="number"
                            step="0.1"
                            value={seismicParams.responseModificationFactor}
                            onChange={(e) =>
                              setSeismicParams((prev) => ({
                                ...prev,
                                responseModificationFactor: Number(
                                  e.target.value,
                                ),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="seismicWeight">
                            Seismic Weight (N)
                          </Label>
                          <Input
                            id="seismicWeight"
                            type="number"
                            value={seismicParams.seismicWeight}
                            onChange={(e) =>
                              setSeismicParams((prev) => ({
                                ...prev,
                                seismicWeight: Number(e.target.value),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="importanceFactor">
                            Importance Factor (Ie)
                          </Label>
                          <Input
                            id="importanceFactor"
                            type="number"
                            step="0.1"
                            value={seismicParams.importanceFactor}
                            onChange={(e) =>
                              setSeismicParams((prev) => ({
                                ...prev,
                                importanceFactor: Number(e.target.value),
                              }))
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* Snow Load Parameters */}
                {selectedLoadTypes.includes("SNOW") && (
                  <TabsContent value="SNOW" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Snow Load Parameters (ASCE 7-16)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="groundSnowLoad">
                            Ground Snow Load (kN/m²)
                          </Label>
                          <Input
                            id="groundSnowLoad"
                            type="number"
                            step="0.1"
                            value={snowParams.groundSnowLoad}
                            onChange={(e) =>
                              setSnowParams((prev) => ({
                                ...prev,
                                groundSnowLoad: Number(e.target.value),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="exposureFactor">
                            Exposure Factor (Ce)
                          </Label>
                          <Input
                            id="exposureFactor"
                            type="number"
                            step="0.1"
                            value={snowParams.exposureFactor}
                            onChange={(e) =>
                              setSnowParams((prev) => ({
                                ...prev,
                                exposureFactor: Number(e.target.value),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="thermalFactor">
                            Thermal Factor (Ct)
                          </Label>
                          <Input
                            id="thermalFactor"
                            type="number"
                            step="0.1"
                            value={snowParams.thermalFactor}
                            onChange={(e) =>
                              setSnowParams((prev) => ({
                                ...prev,
                                thermalFactor: Number(e.target.value),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="snowImportance">
                            Importance Factor (Is)
                          </Label>
                          <Input
                            id="snowImportance"
                            type="number"
                            step="0.1"
                            value={snowParams.importanceFactor}
                            onChange={(e) =>
                              setSnowParams((prev) => ({
                                ...prev,
                                importanceFactor: Number(e.target.value),
                              }))
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* Live Load Parameters */}
                {selectedLoadTypes.includes("LIVE") && (
                  <TabsContent value="LIVE" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Live Load Parameters (ASCE 7-16)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="occupancyCategory">
                            Occupancy Category
                          </Label>
                          <Select
                            value={liveLoadParams.occupancyCategory}
                            onValueChange={(value) =>
                              setLiveLoadParams((prev) => ({
                                ...prev,
                                occupancyCategory: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Industrial">
                                Industrial
                              </SelectItem>
                              <SelectItem value="Office">Office</SelectItem>
                              <SelectItem value="Storage">Storage</SelectItem>
                              <SelectItem value="Assembly">Assembly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="liveLoadPsf">Live Load (psf)</Label>
                          <Input
                            id="liveLoadPsf"
                            type="number"
                            value={liveLoadParams.liveLoadPsf}
                            onChange={(e) =>
                              setLiveLoadParams((prev) => ({
                                ...prev,
                                liveLoadPsf: Number(e.target.value),
                              }))
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* Dead Load Parameters */}
                {selectedLoadTypes.includes("DEAD") && (
                  <TabsContent value="DEAD" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Dead Load Parameters
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="additionalDeadLoad">
                            Additional Dead Load (kN/m²)
                          </Label>
                          <Input
                            id="additionalDeadLoad"
                            type="number"
                            step="0.1"
                            value={deadLoadParams.additionalDeadLoad}
                            onChange={(e) =>
                              setDeadLoadParams((prev) => ({
                                ...prev,
                                additionalDeadLoad: Number(e.target.value),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>
                            Material densities are automatically applied from
                            model
                          </Label>
                          <div className="text-sm text-gray-600">
                            Steel: 7850 kg/m³, Concrete: 2400 kg/m³
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* Crane Load Parameters */}
                {selectedLoadTypes.includes("CRANE") && (
                  <TabsContent value="CRANE" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Crane Load Parameters
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="craneCapacity">
                            Crane Capacity (N)
                          </Label>
                          <Input
                            id="craneCapacity"
                            type="number"
                            value={craneParams.craneCapacity}
                            onChange={(e) =>
                              setCraneParams((prev) => ({
                                ...prev,
                                craneCapacity: Number(e.target.value),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="craneWeight">Crane Weight (N)</Label>
                          <Input
                            id="craneWeight"
                            type="number"
                            value={craneParams.craneWeight}
                            onChange={(e) =>
                              setCraneParams((prev) => ({
                                ...prev,
                                craneWeight: Number(e.target.value),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="impactFactor">Impact Factor</Label>
                          <Input
                            id="impactFactor"
                            type="number"
                            step="0.01"
                            value={craneParams.impactFactor}
                            onChange={(e) =>
                              setCraneParams((prev) => ({
                                ...prev,
                                impactFactor: Number(e.target.value),
                              }))
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            )}

            {/* Calculation Button */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Alert className="flex-1 mr-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Load calculations will be performed according to ASCE 7-16
                  standards. Review all parameters before proceeding.
                </AlertDescription>
              </Alert>
              <Button
                onClick={handleCalculateLoads}
                disabled={selectedLoadTypes.length === 0 || isCalculating}
                className="min-w-[150px]"
              >
                {isCalculating ? "Calculating..." : "Calculate Loads"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoadParameters;
