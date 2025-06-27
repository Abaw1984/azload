import React, { useRef, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import * as THREE from "three";
import { StructuralModel, Node, Member } from "@/types/model";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Eye,
  EyeOff,
  Grid3X3,
  Tag,
  RotateCcw,
  Maximize,
  AlertTriangle,
  CheckCircle,
  Database,
  Upload,
  Settings,
  Hash,
  Activity,
} from "lucide-react";

interface ThreeDVisualizerProps {
  model?: StructuralModel | null;
  showGrid?: boolean;
  showLabels?: boolean;
  className?: string;
}

// Node component for rendering individual nodes with proper sizing
function NodeComponent({
  node,
  showLabels,
  modelScale,
}: {
  node: Node;
  showLabels: boolean;
  modelScale: number;
}) {
  // Calculate proportional node size based on model scale
  const nodeSize = Math.max(0.1, Math.min(2.0, modelScale * 0.02));
  const labelOffset = nodeSize * 3;
  const labelSize = Math.max(0.5, Math.min(2.0, modelScale * 0.01));

  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh>
        <sphereGeometry args={[nodeSize, 8, 8]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
      {showLabels && (
        <Text
          position={[0, labelOffset, 0]}
          fontSize={labelSize}
          color="#1f2937"
          anchorX="center"
          anchorY="middle"
        >
          {node.id}
        </Text>
      )}
    </group>
  );
}

// Member component with ML tagging and proper scaling
function MemberComponent({
  member,
  nodes,
  showLabels,
  modelScale,
  memberTags,
}: {
  member: Member;
  nodes: Node[];
  showLabels: boolean;
  modelScale: number;
  memberTags?: { [memberId: string]: string };
}) {
  const startNode = nodes.find((n) => n.id === member.startNodeId);
  const endNode = nodes.find((n) => n.id === member.endNodeId);

  if (!startNode || !endNode) {
    console.warn(
      `Member ${member.id}: Missing nodes ${member.startNodeId} or ${member.endNodeId}`,
    );
    return null;
  }

  const points = [
    new THREE.Vector3(startNode.x, startNode.y, startNode.z),
    new THREE.Vector3(endNode.x, endNode.y, endNode.z),
  ];

  const midpoint = new THREE.Vector3(
    (startNode.x + endNode.x) / 2,
    (startNode.y + endNode.y) / 2,
    (startNode.z + endNode.z) / 2,
  );

  // Get member tag and color
  const memberTag = memberTags?.[member.id] || member.type || "DEFAULT";
  const memberColor = getMemberColor(memberTag);
  const labelSize = Math.max(0.4, Math.min(1.5, modelScale * 0.008));
  const labelOffset = Math.max(0.5, modelScale * 0.01);

  return (
    <group>
      <Line points={points} color={memberColor} lineWidth={2} />
      {showLabels && (
        <Text
          position={[midpoint.x, midpoint.y + labelOffset, midpoint.z]}
          fontSize={labelSize}
          color={memberColor}
          anchorX="center"
          anchorY="middle"
        >
          {member.id} ({memberTag})
        </Text>
      )}
    </group>
  );
}

// Get color based on member tag
function getMemberColor(tag: string): string {
  const colorMap: { [key: string]: string } = {
    MAIN_FRAME_COLUMN: "#ef4444", // Red
    MAIN_FRAME_RAFTER: "#f97316", // Orange
    END_FRAME_COLUMN: "#eab308", // Yellow
    END_FRAME_RAFTER: "#84cc16", // Lime
    ROOF_PURLIN: "#22c55e", // Green
    WALL_GIRT: "#06b6d4", // Cyan
    ROOF_BRACING: "#3b82f6", // Blue
    WALL_BRACING: "#8b5cf6", // Violet
    CRANE_BEAM: "#ec4899", // Pink
    DEFAULT: "#6b7280", // Gray
  };
  return colorMap[tag] || colorMap.DEFAULT;
}

// Grid component for reference
function GridComponent({
  size = 100,
  divisions = 20,
}: {
  size?: number;
  divisions?: number;
}) {
  return (
    <gridHelper
      args={[size, divisions, "#94a3b8", "#cbd5e1"]}
      position={[0, 0, 0]}
    />
  );
}

// Enhanced camera controller with memory cleanup
function CameraController({
  model,
  onModelScale,
}: {
  model: StructuralModel;
  onModelScale: (scale: number) => void;
}) {
  const { camera, gl, scene } = useThree();

  useEffect(() => {
    if (!model || !model.nodes || model.nodes.length === 0) return;

    // CRITICAL: Clean up previous model resources to prevent WebGL context loss
    console.log("🧹 CLEANING UP PREVIOUS MODEL RESOURCES");

    // Dispose of all geometries and materials in the scene
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });

    // Force garbage collection
    if (gl.info) {
      console.log("📊 WebGL Memory Info:", {
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        programs: gl.info.programs?.length || 0,
      });
    }

    // Calculate bounding box from actual node positions
    const xs = model.nodes.map((n) => n.x);
    const ys = model.nodes.map((n) => n.y);
    const zs = model.nodes.map((n) => n.z);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const width = maxX - minX;
    const height = maxY - minY;
    const depth = maxZ - minZ;
    const maxDim = Math.max(width, height, depth);

    // Calculate model scale for proportional sizing
    const modelScale = maxDim;
    onModelScale(modelScale);

    // Position camera for optimal viewing
    const distance = Math.max(maxDim * 2.5, 50);
    const cameraX = centerX + distance * 0.7;
    const cameraY = centerY + distance * 0.7;
    const cameraZ = centerZ + distance * 0.7;

    camera.position.set(cameraX, cameraY, cameraZ);
    camera.lookAt(centerX, centerY, centerZ);
    camera.updateProjectionMatrix();

    console.log(`🎯 CAMERA POSITIONED WITH CLEANUP:`, {
      modelCenter: {
        x: centerX.toFixed(2),
        y: centerY.toFixed(2),
        z: centerZ.toFixed(2),
      },
      modelDimensions: {
        width: width.toFixed(2),
        height: height.toFixed(2),
        depth: depth.toFixed(2),
      },
      modelScale: modelScale.toFixed(2),
      cameraPosition: {
        x: cameraX.toFixed(2),
        y: cameraY.toFixed(2),
        z: cameraZ.toFixed(2),
      },
      distance: distance.toFixed(2),
      nodeCount: model.nodes.length,
      memberCount: model.members.length,
      memoryCleanup: "COMPLETED",
    });
  }, [model, camera, gl, scene, onModelScale]);

  return null;
}

// Enhanced 3D Scene with ML tagging and proper scaling
function Scene({
  model,
  showGrid,
  showLabels,
  memberTags,
}: {
  model: StructuralModel;
  showGrid: boolean;
  showLabels: boolean;
  memberTags?: { [memberId: string]: string };
}) {
  const [modelScale, setModelScale] = useState(100);
  const safeNodes = model.nodes || [];
  const safeMembers = model.members || [];

  console.log(`🎨 RENDERING 3D SCENE WITH ML TAGS:`, {
    nodes: safeNodes.length,
    members: safeMembers.length,
    showGrid,
    showLabels,
    modelType: model.type,
    unitsSystem: model.unitsSystem,
    memberTags: Object.keys(memberTags || {}).length,
    modelScale: modelScale.toFixed(2),
  });

  return (
    <>
      <CameraController model={model} onModelScale={setModelScale} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />

      {showGrid && <GridComponent />}

      {/* Render nodes with proper scaling */}
      {safeNodes.map((node) => (
        <NodeComponent
          key={node.id}
          node={node}
          showLabels={showLabels}
          modelScale={modelScale}
        />
      ))}

      {/* Render members with ML tags and proper scaling */}
      {safeMembers.map((member) => (
        <MemberComponent
          key={member.id}
          member={member}
          nodes={safeNodes}
          showLabels={showLabels}
          modelScale={modelScale}
          memberTags={memberTags}
        />
      ))}
    </>
  );
}

// Main ThreeDVisualizer component
function ThreeDVisualizer({
  model: propModel,
  showGrid = true,
  showLabels = false,
  className = "",
}: ThreeDVisualizerProps) {
  const [currentModel, setCurrentModel] = useState<StructuralModel | null>(
    propModel || null,
  );
  const [showGridState, setShowGridState] = useState(showGrid);
  const [showLabelsState, setShowLabelsState] = useState(showLabels);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [memberTags, setMemberTags] = useState<{ [memberId: string]: string }>(
    {},
  );
  const [uploadCounter, setUploadCounter] = useState(() => {
    return parseInt(sessionStorage.getItem("uploadCounter") || "0");
  });
  const [mlTrainingCount, setMLTrainingCount] = useState(() => {
    return parseInt(sessionStorage.getItem("mlTrainingCount") || "0");
  });
  const [materialValidationState, setMaterialValidationState] = useState<{
    materialsAssigned: boolean;
    geometryOnlyMode: boolean;
    showMaterialPrompt: boolean;
  }>({
    materialsAssigned: true,
    geometryOnlyMode: false,
    showMaterialPrompt: false,
  });

  // OPTIMIZED: Check for model data with enhanced memory management
  const checkSessionStorageForModel =
    useCallback((): StructuralModel | null => {
      try {
        console.log(
          "🔍 OPTIMIZED 3D: Checking for geometry data with memory management...",
        );

        // Check primary storage keys in order
        const storageKeys = ["parsedModel", "currentModel", "parsedGeometry"];

        for (const key of storageKeys) {
          const storedData = sessionStorage.getItem(key);
          if (storedData) {
            try {
              const parsed = JSON.parse(storedData);

              // ENHANCED VALIDATION: Check structure and validate data integrity
              if (
                parsed &&
                Array.isArray(parsed.nodes) &&
                Array.isArray(parsed.members) &&
                parsed.nodes.length > 0 &&
                parsed.members.length > 0
              ) {
                console.log(
                  `✅ OPTIMIZED 3D: Found valid geometry in ${key}:`,
                  {
                    nodes: parsed.nodes.length,
                    members: parsed.members.length,
                    name: parsed.name,
                    materials: parsed.materials?.length || 0,
                    memoryOptimized: true,
                  },
                );

                // Enhanced material validation with better detection
                const hasMaterials =
                  parsed.materials && parsed.materials.length > 1; // More than just default
                const hasRealMaterials =
                  parsed.materialValidation?.materialsAssigned === true;
                const hasAssignedSections = parsed.members.some(
                  (m: any) => m.sectionId && m.materialId,
                );

                const materialsAssigned =
                  hasMaterials || hasRealMaterials || hasAssignedSections;

                setMaterialValidationState({
                  materialsAssigned,
                  geometryOnlyMode: !materialsAssigned,
                  showMaterialPrompt: !materialsAssigned,
                });

                // Add memory optimization flag
                parsed._memoryOptimized = true;
                parsed._loadTimestamp = Date.now();

                return parsed;
              }
            } catch (parseError) {
              console.warn(`⚠️ Failed to parse ${key}:`, parseError);
            }
          }
        }

        console.log("🔍 OPTIMIZED 3D: No geometry data found");
        return null;
      } catch (error) {
        console.error("❌ OPTIMIZED 3D: Error checking storage:", error);
        return null;
      }
    }, []);

  // Helper method to calculate bounding box
  const calculateBoundingBox = (nodes: Node[]) => {
    if (nodes.length === 0) {
      return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
    }

    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const zs = nodes.map((n) => n.z);

    return {
      min: {
        x: Math.min(...xs),
        y: Math.min(...ys),
        z: Math.min(...zs),
      },
      max: {
        x: Math.max(...xs),
        y: Math.max(...ys),
        z: Math.max(...zs),
      },
    };
  };

  // Load model with proper cleanup and tracking
  useEffect(() => {
    const loadModel = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let modelToUse = propModel;

        // If no prop model provided, check sessionStorage
        if (!modelToUse) {
          console.log(
            "🔍 3D VISUALIZER: No prop model, checking sessionStorage...",
          );
          modelToUse = checkSessionStorageForModel();
        }

        if (modelToUse) {
          console.log("✅ 3D VISUALIZER: Model loaded successfully:", {
            name: modelToUse.name,
            type: modelToUse.type,
            nodes: modelToUse.nodes?.length || 0,
            members: modelToUse.members?.length || 0,
            unitsSystem: modelToUse.unitsSystem,
            source: propModel ? "props" : "sessionStorage",
          });

          // CRITICAL: Clear previous model to prevent memory leaks
          if (currentModel && currentModel.id !== modelToUse.id) {
            console.log(
              "🧹 CLEARING PREVIOUS MODEL TO PREVENT WEBGL CONTEXT LOSS",
            );
            setCurrentModel(null);
            // Force a brief delay to allow cleanup
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          setCurrentModel(modelToUse);

          // Update upload counter
          const currentCount = parseInt(
            sessionStorage.getItem("uploadCounter") || "0",
          );
          const newCount = currentCount + 1;
          sessionStorage.setItem("uploadCounter", newCount.toString());
          setUploadCounter(newCount);

          // Load member tags from MCP or ML API
          loadMemberTags(modelToUse);
        } else {
          console.log("⚠️ 3D VISUALIZER: No model data available");
          setCurrentModel(null);
        }
      } catch (error) {
        console.error("❌ 3D VISUALIZER: Error loading model:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load model",
        );
        setCurrentModel(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadModel();
  }, [propModel, checkSessionStorageForModel]);

  // Enhanced geometry event handling with proper cleanup and tracking
  useEffect(() => {
    const handleGeometryReady = async (event: CustomEvent) => {
      console.log(
        "📡 ENHANCED 3D: Geometry ready with cleanup and tracking",
        event.detail,
      );

      if (event.detail?.model) {
        // CRITICAL: Clear previous model first to prevent WebGL context loss
        if (currentModel) {
          console.log("🧹 CLEARING PREVIOUS MODEL BEFORE NEW LOAD");
          setCurrentModel(null);
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        // STEP 1: Display the model immediately
        const model = event.detail.model;
        setCurrentModel(model);
        setError(null);
        setIsLoading(false);

        // STEP 2: Update upload counter
        const currentCount = parseInt(
          sessionStorage.getItem("uploadCounter") || "0",
        );
        const newCount = currentCount + 1;
        sessionStorage.setItem("uploadCounter", newCount.toString());
        setUploadCounter(newCount);

        // STEP 3: Check materials and show prompt if needed
        const hasMaterials = model.materials && model.materials.length > 1;
        const hasRealMaterials =
          model.materialValidation?.materialsAssigned === true;
        const materialsAssigned = hasMaterials || hasRealMaterials;

        setMaterialValidationState({
          materialsAssigned,
          geometryOnlyMode: !materialsAssigned,
          showMaterialPrompt: !materialsAssigned,
        });

        // STEP 4: Load member tags
        loadMemberTags(model);

        // STEP 5: Track ML training if materials are assigned
        if (materialsAssigned) {
          const mlCount = parseInt(
            sessionStorage.getItem("mlTrainingCount") || "0",
          );
          const newMLCount = mlCount + 1;
          sessionStorage.setItem("mlTrainingCount", newMLCount.toString());
          setMLTrainingCount(newMLCount);
        }

        console.log("✅ ENHANCED 3D: Model displayed with full tracking", {
          nodes: model.nodes?.length || 0,
          members: model.members?.length || 0,
          hasMaterials: materialsAssigned,
          uploadCount: newCount,
          mlTrainingCount: materialsAssigned
            ? mlTrainingCount + 1
            : mlTrainingCount,
          memoryCleanup: "COMPLETED",
        });
      }
    };

    window.addEventListener(
      "geometryReady",
      handleGeometryReady as EventListener,
    );

    return () => {
      window.removeEventListener(
        "geometryReady",
        handleGeometryReady as EventListener,
      );
    };
  }, [currentModel, mlTrainingCount]);

  const resetView = () => {
    // This will trigger camera repositioning
    if (currentModel) {
      setCurrentModel({ ...currentModel });
    }
  };

  // Load member tags from MCP or generate them
  const loadMemberTags = async (model: StructuralModel) => {
    try {
      console.log("🏷️ LOADING MEMBER TAGS...");

      // Try to get tags from MCP first
      const mcpData = sessionStorage.getItem("mcpData");
      if (mcpData) {
        const mcp = JSON.parse(mcpData);
        if (mcp.memberTags && mcp.memberTags.length > 0) {
          const tagMap: { [memberId: string]: string } = {};
          mcp.memberTags.forEach((tag: any) => {
            tagMap[tag.memberId] = tag.tag;
          });
          setMemberTags(tagMap);
          console.log(
            "✅ MEMBER TAGS LOADED FROM MCP:",
            Object.keys(tagMap).length,
          );
          return;
        }
      }

      // Generate basic tags if no MCP data
      const basicTags: { [memberId: string]: string } = {};
      model.members?.forEach((member) => {
        // Simple classification based on member type or position
        if (member.type === "COLUMN") {
          basicTags[member.id] = "MAIN_FRAME_COLUMN";
        } else if (member.type === "BEAM") {
          basicTags[member.id] = "MAIN_FRAME_RAFTER";
        } else {
          basicTags[member.id] = "DEFAULT";
        }
      });

      setMemberTags(basicTags);
      console.log(
        "✅ BASIC MEMBER TAGS GENERATED:",
        Object.keys(basicTags).length,
      );
    } catch (error) {
      console.warn("⚠️ Failed to load member tags:", error);
      setMemberTags({});
    }
  };

  const refreshModel = async () => {
    console.log("🔄 3D VISUALIZER: Refreshing model with cleanup...");

    // Clear current model first
    setCurrentModel(null);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const refreshedModel = checkSessionStorageForModel();
    if (refreshedModel) {
      setCurrentModel(refreshedModel);
      setError(null);
      loadMemberTags(refreshedModel);
    } else {
      setError("No model data found in storage");
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Database className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Loading Model...
              </h3>
              <p className="text-gray-600">Preparing 3D visualization</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Visualization Error
              </h3>
              <p className="text-gray-600">{error}</p>
            </div>
            <Button onClick={refreshModel} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render no model state
  if (!currentModel) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <Eye className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                No Model Loaded
              </h3>
              <p className="text-gray-600">
                Upload a structural model to see the 3D visualization
              </p>
            </div>
            <Button onClick={refreshModel} variant="outline">
              <Database className="w-4 h-4 mr-2" />
              Check for Model
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render 3D visualization
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Eye className="w-5 h-5" />
            <span>3D Model Visualization</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">{currentModel.type}</Badge>
            <Badge variant="outline">{currentModel.unitsSystem}</Badge>
            <Badge variant="outline">
              {currentModel.nodes?.length || 0} nodes,{" "}
              {currentModel.members?.length || 0} members
            </Badge>
            <Badge variant="default" className="bg-blue-600">
              <Hash className="w-3 h-3 mr-1" />
              Uploads: {uploadCounter}
            </Badge>
            <Badge variant="default" className="bg-green-600">
              <Activity className="w-3 h-3 mr-1" />
              ML Training: {mlTrainingCount}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGridState(!showGridState)}
            >
              <Grid3X3 className="w-4 h-4 mr-2" />
              {showGridState ? "Hide Grid" : "Show Grid"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLabelsState(!showLabelsState)}
            >
              <Tag className="w-4 h-4 mr-2" />
              {showLabelsState ? "Hide Labels" : "Show Labels"}
            </Button>
            <Button variant="outline" size="sm" onClick={resetView}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset View
            </Button>
          </div>
          <div className="text-sm text-gray-600">
            {currentModel.name} •{" "}
            {currentModel.geometry?.coordinateSystem || currentModel.type}
          </div>
        </div>

        {/* Enhanced Material Assignment Alert */}
        {materialValidationState.showMaterialPrompt && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-red-900">
                      ⚠️ CRITICAL: Material Assignment Required
                    </div>
                    <div className="text-sm text-red-800 font-medium">
                      This model has NO MATERIALS assigned. Load calculations
                      and ML analysis are DISABLED.
                    </div>
                  </div>
                  <Badge
                    variant="destructive"
                    className="bg-red-600 text-white"
                  >
                    NO MATERIALS
                  </Badge>
                </div>
                <div className="text-sm text-red-800 space-y-2 bg-red-100 p-3 rounded">
                  <div className="font-medium">Required Actions:</div>
                  <div>1. Open your model in STAAD.Pro or SAP2000</div>
                  <div>
                    2. Assign material properties (Steel, Concrete, etc.) to ALL
                    members
                  </div>
                  <div>
                    3. Assign section properties (W-shapes, Channels, etc.) to
                    ALL members
                  </div>
                  <div>4. Save the file and re-upload here</div>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      // Navigate back to upload tab
                      window.dispatchEvent(new CustomEvent("navigateToUpload"));
                    }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Model with Materials
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-100"
                    onClick={() =>
                      setMaterialValidationState((prev) => ({
                        ...prev,
                        showMaterialPrompt: false,
                      }))
                    }
                  >
                    Dismiss Warning
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Model Info */}
        {currentModel.parsingAccuracy && (
          <Alert className="mb-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>
                  Parsing: {currentModel.parsingAccuracy.dimensionalAccuracy}%
                  accuracy •{currentModel.parsingAccuracy.nodesParsed} nodes •
                  {currentModel.parsingAccuracy.membersParsed} members
                </span>
                <Badge
                  variant={
                    currentModel.parsingAccuracy.connectivityValidated
                      ? "default"
                      : "destructive"
                  }
                >
                  {currentModel.parsingAccuracy.connectivityValidated
                    ? "Valid"
                    : "Invalid"}{" "}
                  Connectivity
                </Badge>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Enhanced 3D Canvas with Memory Management */}
        <div className="w-full h-[500px] border rounded-lg overflow-hidden bg-gray-50">
          <Canvas
            key={currentModel.id} // Force re-render on model change to prevent WebGL context loss
            camera={{ position: [50, 50, 50], fov: 60 }}
            style={{
              background: "linear-gradient(to bottom, #f8fafc, #e2e8f0)",
            }}
            gl={{
              antialias: true,
              alpha: true,
              preserveDrawingBuffer: false, // Prevent memory leaks
              powerPreference: "high-performance",
            }}
            onCreated={({ gl }) => {
              // Configure WebGL context for better memory management
              gl.debug.checkShaderErrors = false;
              console.log("🎮 WebGL Context Created:", {
                renderer: gl.info.render.renderer,
                version: gl.info.render.version,
                vendor: gl.info.render.vendor,
              });
            }}
          >
            <Scene
              model={currentModel}
              showGrid={showGridState}
              showLabels={showLabelsState}
              memberTags={memberTags}
            />
            <OrbitControls
              enablePan
              enableZoom
              enableRotate
              maxDistance={1000}
              minDistance={10}
            />
          </Canvas>
        </div>

        {/* Enhanced Model Statistics with Tracking */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium text-gray-900">
              {currentModel.nodes?.length || 0}
            </div>
            <div className="text-gray-600">Nodes</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-900">
              {currentModel.members?.length || 0}
            </div>
            <div className="text-gray-600">Members</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-900">
              {currentModel.materials?.length || 0}
            </div>
            <div className="text-gray-600">Materials</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-900">
              {currentModel.sections?.length || 0}
            </div>
            <div className="text-gray-600">Sections</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-blue-600">
              {Object.keys(memberTags).length}
            </div>
            <div className="text-gray-600">Tagged</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-green-600">{uploadCounter}</div>
            <div className="text-gray-600">Uploads</div>
          </div>
        </div>

        {/* Member Tags Summary */}
        {Object.keys(memberTags).length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-900 mb-2">
              Member Tags Active:
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(
                Object.values(memberTags).reduce(
                  (acc, tag) => {
                    acc[tag] = (acc[tag] || 0) + 1;
                    return acc;
                  },
                  {} as { [tag: string]: number },
                ),
              ).map(([tag, count]) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs"
                  style={{
                    borderColor: getMemberColor(tag),
                    color: getMemberColor(tag),
                  }}
                >
                  {tag}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ThreeDVisualizer;
