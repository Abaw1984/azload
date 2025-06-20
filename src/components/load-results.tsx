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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Wind,
  Zap,
  Snowflake,
  Users,
  Weight,
  Truck,
  AlertTriangle,
  CheckCircle,
  FileText,
  Download,
  BarChart3,
  Info,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  LoadCalculationResult,
  StructuralModel,
  LoadType,
  MasterControlPoint,
} from "@/types/model";
import { LoadCombinationGenerator } from "@/lib/load-calculation";

interface LoadResultsProps {
  model: StructuralModel;
  mcp: MasterControlPoint | null;
  results: LoadCalculationResult[];
  onGenerateReport: () => void;
}

function LoadResults({
  model,
  mcp,
  results,
  onGenerateReport,
}: LoadResultsProps) {
  const [selectedResult, setSelectedResult] =
    useState<LoadCalculationResult | null>(
      results.length > 0 ? results[0] : null,
    );
  const [showCombinations, setShowCombinations] = useState(false);

  const getLoadTypeIcon = (loadType: LoadType) => {
    switch (loadType) {
      case "WIND":
        return Wind;
      case "SEISMIC":
        return Zap;
      case "SNOW":
        return Snowflake;
      case "LIVE":
        return Users;
      case "DEAD":
        return Weight;
      case "CRANE":
        return Truck;
      default:
        return BarChart3;
    }
  };

  const getLoadTypeColor = (loadType: LoadType) => {
    switch (loadType) {
      case "WIND":
        return "bg-blue-100 text-blue-800";
      case "SEISMIC":
        return "bg-red-100 text-red-800";
      case "SNOW":
        return "bg-cyan-100 text-cyan-800";
      case "LIVE":
        return "bg-green-100 text-green-800";
      case "DEAD":
        return "bg-gray-100 text-gray-800";
      case "CRANE":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-purple-100 text-purple-800";
    }
  };

  const formatForce = (force: number) => {
    if (Math.abs(force) >= 1000000) {
      return `${(force / 1000000).toFixed(2)} MN`;
    } else if (Math.abs(force) >= 1000) {
      return `${(force / 1000).toFixed(2)} kN`;
    } else {
      return `${force.toFixed(2)} N`;
    }
  };

  const formatPressure = (pressure: number) => {
    if (Math.abs(pressure) >= 1000) {
      return `${(pressure / 1000).toFixed(2)} kPa`;
    } else {
      return `${pressure.toFixed(2)} Pa`;
    }
  };

  const loadCombinations =
    LoadCombinationGenerator.generateASCE716Combinations(results);

  const calculateCombinedForces = (combination: {
    factors: { [loadType: string]: number };
  }) => {
    let totalX = 0,
      totalY = 0,
      totalZ = 0;

    results.forEach((result) => {
      const factor = combination.factors[result.loadType] || 0;
      totalX += result.summary.totalForce.x * factor;
      totalY += result.summary.totalForce.y * factor;
      totalZ += result.summary.totalForce.z * factor;
    });

    return { x: totalX, y: totalY, z: totalZ };
  };

  return (
    <div className="space-y-6 bg-white">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Load Calculation Results</span>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowCombinations(!showCombinations)}
              >
                {showCombinations ? "Hide" : "Show"} Load Combinations
              </Button>
              <Button onClick={onGenerateReport}>
                <FileText className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            ASCE 7-16 compliant load calculations for {model.name}
            {mcp && (
              <div className="mt-2 text-sm space-y-1">
                <div>
                  Building Type: {mcp.buildingType} | Height Class:{" "}
                  {mcp.heightClassification} | Rigidity:{" "}
                  {mcp.structuralRigidity} | Units: {mcp.unitsSystem}
                </div>
                <div>
                  Confidence: {(mcp.buildingTypeConfidence * 100).toFixed(1)}% |
                  MCP Status: {mcp.isLocked ? "🔒 Locked" : "🔓 Unlocked"} |
                  Roof: {mcp.roofType} ({mcp.roofSlopeDegrees.toFixed(1)}°)
                </div>
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Results Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {results.length}
                </div>
                <div className="text-sm text-gray-600">
                  Load Types Calculated
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {results.reduce((sum, r) => sum + r.loads.length, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Load Cases</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {results.reduce((sum, r) => sum + r.warnings.length, 0)}
                </div>
                <div className="text-sm text-gray-600">Warnings</div>
              </CardContent>
            </Card>
          </div>

          {/* Load Type Selection */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {results.map((result) => {
              const Icon = getLoadTypeIcon(result.loadType);
              const isSelected = selectedResult?.loadType === result.loadType;

              return (
                <div
                  key={result.loadType}
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedResult(result)}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Icon className="w-6 h-6" />
                    <Badge className={getLoadTypeColor(result.loadType)}>
                      {result.loadType}
                    </Badge>
                    <div className="text-xs text-center">
                      {result.loads.length} loads
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      {selectedResult && (
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="loads">Load Details</TabsTrigger>
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {(() => {
                    const Icon = getLoadTypeIcon(selectedResult.loadType);
                    return <Icon className="w-5 h-5" />;
                  })()}
                  <span>{selectedResult.loadType} Load Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Force Summary */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Total Forces</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>X-Direction:</span>
                        <span className="font-mono">
                          {formatForce(selectedResult.summary.totalForce.x)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Y-Direction:</span>
                        <span className="font-mono">
                          {formatForce(selectedResult.summary.totalForce.y)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Z-Direction:</span>
                        <span className="font-mono">
                          {formatForce(selectedResult.summary.totalForce.z)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pressure Summary */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Pressure Range</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Maximum:</span>
                        <span className="font-mono text-red-600">
                          {formatPressure(selectedResult.summary.maxPressure)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Minimum:</span>
                        <span className="font-mono text-blue-600">
                          {formatPressure(selectedResult.summary.minPressure)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Code References */}
                <div className="mt-6 pt-4 border-t">
                  <h4 className="font-medium mb-2">Code References</h4>
                  <div className="space-y-1">
                    {selectedResult.codeReferences.map((ref, index) => (
                      <div
                        key={index}
                        className="text-sm text-gray-600 flex items-start space-x-2"
                      >
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{ref}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loads" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Individual Load Cases</CardTitle>
                <CardDescription>
                  Detailed breakdown of all calculated loads
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Load ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>Magnitude</TableHead>
                        <TableHead>Distribution</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedResult.loads.slice(0, 50).map((load) => (
                        <TableRow key={load.id}>
                          <TableCell className="font-mono text-xs">
                            {load.id}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{load.type}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {load.targetId}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-gray-100 text-gray-800">
                              {load.direction}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatForce(load.magnitude)}
                          </TableCell>
                          <TableCell>
                            {load.distribution && (
                              <Badge variant="outline">
                                {load.distribution}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {selectedResult.loads.length > 50 && (
                    <div className="text-center text-sm text-gray-500 mt-4">
                      Showing first 50 of {selectedResult.loads.length} loads
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parameters" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Calculation Parameters</CardTitle>
                <CardDescription>
                  Input parameters used for {selectedResult.loadType} load
                  calculations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(selectedResult.parameters, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Validation & Warnings</CardTitle>
                <CardDescription>
                  Review calculation warnings and recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedResult.warnings.length > 0 ? (
                    <div className="space-y-2">
                      {selectedResult.warnings.map((warning, index) => (
                        <Alert key={index}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{warning}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  ) : (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        No warnings - calculations completed successfully
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Load Combinations */}
      {showCombinations && (
        <Card>
          <CardHeader>
            <CardTitle>ASCE 7-16 Load Combinations</CardTitle>
            <CardDescription>
              Standard load combinations with calculated resultant forces
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loadCombinations.map((combination, index) => {
                const combinedForces = calculateCombinedForces(combination);
                const resultantForce = Math.sqrt(
                  combinedForces.x ** 2 +
                    combinedForces.y ** 2 +
                    combinedForces.z ** 2,
                );

                return (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h4 className="font-medium">{combination.name}</h4>
                          <p className="text-sm text-gray-600">
                            {combination.description}
                          </p>
                          <div className="flex space-x-4 text-sm">
                            {Object.entries(combination.factors).map(
                              ([loadType, factor]) => (
                                <span key={loadType} className="font-mono">
                                  {factor}
                                  {loadType.charAt(0)}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="text-lg font-bold">
                            {formatForce(resultantForce)}
                          </div>
                          <div className="text-xs text-gray-500">Resultant</div>
                          <div className="text-xs space-y-0.5">
                            <div>X: {formatForce(combinedForces.x)}</div>
                            <div>Y: {formatForce(combinedForces.y)}</div>
                            <div>Z: {formatForce(combinedForces.z)}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default LoadResults;
