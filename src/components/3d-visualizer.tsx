import React, { useState, useEffect, useRef, Suspense, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  Text,
  Line,
  Html,
  Instances,
  Instance,
} from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move3D,
  Settings,
  Download,
  ArrowLeft,
  Layers,
  Grid3X3,
  Palette,
  Info,
  Play,
  Pause,
  MousePointer,
  Hand,
  Building,
  Maximize,
  RotateCw,
  Camera,
  View,
  AlertTriangle,
  Home,
  Square,
  Rotate3D,
  CheckCircle,
} from "lucide-react";
import { StructuralModel, Member, Node, MemberTag } from "@/types/model";
import { useMCP } from "@/lib/mcp-manager";

// Color scheme for member tags
const MEMBER_TAG_COLORS = {
  MAIN_FRAME_COLUMN: "#4F46E5", // Indigo
  END_FRAME_COLUMN: "#3730A3", // Dark Indigo
  MAIN_FRAME_RAFTER: "#F59E0B", // Amber/Orange
  END_FRAME_RAFTER: "#D97706", // Dark Amber
  ROOF_PURLIN: "#EC4899", // Pink
  WALL_GIRT: "#10B981", // Light Green
  ROOF_BRACING: "#8B5CF6", // Purple
  WALL_BRACING: "#7C3AED", // Dark Purple
  CRANE_BEAM: "#EF4444", // Red
  MEZZANINE_BEAM: "#3B82F6", // Blue
  CANOPY_BEAM: "#06B6D4", // Cyan
  FASCIA_BEAM: "#84CC16", // Lime
  PARAPET: "#6B7280", // Gray
  SIGNAGE_POLE: "#374151", // Dark Gray
  DEFAULT: "#9CA3AF", // Light Gray
};

// Member type colors (fallback)
const MEMBER_TYPE_COLORS = {
  COLUMN: "#4F46E5", // Indigo
  BEAM: "#3B82F6", // Blue
  RAFTER: "#F59E0B", // Amber/Orange
  BRACE: "#8B5CF6", // Purple
  PURLIN: "#EC4899", // Pink
  GIRT: "#10B981", // Light Green
  STRUT: "#10B981", // Light Green
  DEFAULT: "#9CA3AF", // Gray
};

// Instanced Nodes Component for better performance
function InstancedNodes({
  nodes,
  selectedNode,
  onNodeClick,
}: {
  nodes: Node[];
  selectedNode: string | null;
  onNodeClick: (nodeId: string) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  // Update instance matrices and colors
  useEffect(() => {
    if (!meshRef.current) return;

    nodes.forEach((node, index) => {
      const isSelected = selectedNode === node.id;
      const isHovered = hoveredIndex === index;
      const scale = isSelected ? 0.4 : isHovered ? 0.2 : 0.15;

      tempObject.position.set(node.x, node.y, node.z);
      tempObject.scale.setScalar(scale);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(index, tempObject.matrix);

      // Set color
      if (isSelected) {
        tempColor.setHex(0xfcd34d);
      } else if (isHovered) {
        tempColor.setHex(0x60a5fa);
      } else {
        tempColor.setHex(0x3b82f6);
      }
      meshRef.current!.setColorAt(index, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [nodes, selectedNode, hoveredIndex, tempObject, tempColor]);

  const handlePointerMove = (event: any) => {
    event.stopPropagation();
    setHoveredIndex(event.instanceId ?? null);
    document.body.style.cursor =
      event.instanceId !== undefined ? "pointer" : "default";
  };

  const handleClick = (event: any) => {
    if (event.instanceId !== undefined) {
      event.stopPropagation();
      const node = nodes[event.instanceId];
      if (node) {
        onNodeClick(node.id);
      }
    }
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, nodes.length]}
      onPointerMove={handlePointerMove}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHoveredIndex(null);
        document.body.style.cursor = "default";
      }}
      onClick={handleClick}
    >
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
}

// Individual Node Component for selected/hovered states
function NodeComponent({
  node,
  isSelected,
  onClick,
}: {
  node: Node;
  isSelected: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (meshRef.current && isSelected) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[node.x, node.y, node.z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      <sphereGeometry
        args={[isSelected ? 0.4 : hovered ? 0.2 : 0.15, 16, 16]}
      />
      <meshStandardMaterial
        color={isSelected ? "#FCD34D" : hovered ? "#60A5FA" : "#3B82F6"}
        emissive={isSelected ? "#F59E0B" : hovered ? "#3B82F6" : "#1E40AF"}
        emissiveIntensity={isSelected ? 0.4 : hovered ? 0.2 : 0.1}
      />
      {(isSelected || hovered) && (
        <Text
          position={[0, 0.6, 0]}
          fontSize={0.25}
          color={isSelected ? "#000000" : "#1F2937"}
          anchorX="center"
          anchorY="middle"
        >
          {node.id}
        </Text>
      )}
    </mesh>
  );
}

// Enhanced Member Component with click-to-tag functionality
function MemberComponent({
  member,
  startNode,
  endNode,
  isSelected,
  color,
  onClick,
  memberTag,
  onTagChange,
}: {
  member: Member;
  startNode: Node;
  endNode: Node;
  isSelected: boolean;
  color: string;
  onClick: () => void;
  memberTag?: MemberTag;
  onTagChange?: (memberId: string, tag: MemberTag) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const points = [
    new THREE.Vector3(startNode.x, startNode.y, startNode.z),
    new THREE.Vector3(endNode.x, endNode.y, endNode.z),
  ];

  const handlePointerOver = (e: any) => {
    setHovered(true);
    document.body.style.cursor = "pointer";
  };

  const handlePointerOut = (e: any) => {
    setHovered(false);
    document.body.style.cursor = "default";
  };

  const tagOptions: { value: MemberTag; label: string }[] = [
    { value: "MAIN_FRAME_COLUMN", label: "Main Frame Column" },
    { value: "END_FRAME_COLUMN", label: "End Frame Column" },
    { value: "MAIN_FRAME_RAFTER", label: "Main Frame Rafter" },
    { value: "END_FRAME_RAFTER", label: "End Frame Rafter" },
    { value: "ROOF_PURLIN", label: "Roof Purlin" },
    { value: "WALL_GIRT", label: "Wall Girt" },
    { value: "ROOF_BRACING", label: "Roof Bracing" },
    { value: "WALL_BRACING", label: "Wall Bracing" },
    { value: "CRANE_BEAM", label: "Crane Beam" },
    { value: "MEZZANINE_BEAM", label: "Mezzanine Beam" },
    { value: "CANOPY_BEAM", label: "Canopy Beam" },
    { value: "FASCIA_BEAM", label: "Fascia Beam" },
    { value: "PARAPET", label: "Parapet" },
    { value: "SIGNAGE_POLE", label: "Signage Pole" },
  ];

  return (
    <group>
      <Line
        points={points}
        color={isSelected ? "#FCD34D" : hovered ? "#60A5FA" : color}
        lineWidth={isSelected ? 6 : hovered ? 4 : 2}
        transparent
        opacity={isSelected ? 1 : hovered ? 0.9 : 0.8}
        onClick={(e) => {
          if (e.detail === 2) {
            // Double click
            e.stopPropagation();
            if (onTagChange) {
              setShowTagSelector(true);
            }
          } else {
            // Single click
            e.stopPropagation();
            onClick();
          }
        }}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />

      {(isSelected || hovered) && (
        <Text
          position={[
            (startNode.x + endNode.x) / 2,
            (startNode.y + endNode.y) / 2 + 0.8,
            (startNode.z + endNode.z) / 2,
          ]}
          fontSize={0.25}
          color={isSelected ? "#000000" : "#1F2937"}
          anchorX="center"
          anchorY="middle"
        >
          {member.id}
          {memberTag &&
            `\n${tagOptions.find((opt) => opt.value === memberTag)?.label || memberTag}`}
        </Text>
      )}
      {/* Tag Selector Popup */}
      {showTagSelector && onTagChange && (
        <Html
          position={[
            (startNode.x + endNode.x) / 2,
            (startNode.y + endNode.y) / 2 + 1.5,
            (startNode.z + endNode.z) / 2,
          ]}
          center
        >
          <div className="bg-white border rounded-lg shadow-lg p-3 min-w-[200px] z-50">
            <div className="text-sm font-medium mb-2">Select Member Tag:</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {tagOptions.map((option) => (
                <button
                  key={option.value}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-blue-50 rounded flex items-center space-x-2"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onTagChange(member.id, option.value);
                    setShowTagSelector(false);
                  }}
                >
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: MEMBER_TAG_COLORS[option.value] }}
                  />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
            <button
              className="mt-2 w-full text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setShowTagSelector(false);
              }}
            >
              Cancel
            </button>
          </div>
        </Html>
      )}
    </group>
  );
}

// Three.js Scene Component
function StructuralModelScene({
  model,
  selectedNode,
  selectedMember,
  onNodeClick,
  onMemberClick,
  memberTags,
  showNodes,
  showMembers,
  showGrid,
  showAxis,
  onCameraReady,
  onTagChange,
}: {
  model: StructuralModel;
  selectedNode: string | null;
  selectedMember: string | null;
  onNodeClick: (nodeId: string) => void;
  onMemberClick: (memberId: string) => void;
  memberTags: Map<string, MemberTag>;
  showNodes: boolean;
  showMembers: boolean;
  showGrid: boolean;
  showAxis: boolean;
  onCameraReady: (camera: THREE.Camera) => void;
  onTagChange: (memberId: string, tag: MemberTag) => void;
}) {
  const { camera } = useThree();

  useEffect(() => {
    if (!model?.nodes?.length) {
      return;
    }

    try {
      const box = new THREE.Box3();
      model.nodes.forEach((node) => {
        box.expandByPoint(new THREE.Vector3(node.x, node.y, node.z));
      });

      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      // Position camera for good initial view
      const distance = maxDim * 2;
      camera.position.set(
        center.x + distance * 0.7,
        center.y + distance * 0.7,
        center.z + distance * 0.7,
      );
      camera.lookAt(center);

      onCameraReady(camera);
    } catch (error) {
      console.error("Camera setup failed:", error);
    }
  }, [model, camera, onCameraReady]);

  const getMemberColor = (member: Member) => {
    const tag = memberTags.get(member.id);
    if (tag && MEMBER_TAG_COLORS[tag]) {
      return MEMBER_TAG_COLORS[tag];
    }
    if (MEMBER_TYPE_COLORS[member.type]) {
      return MEMBER_TYPE_COLORS[member.type];
    }
    return MEMBER_TAG_COLORS.DEFAULT;
  };

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-10, -10, -5]} intensity={0.4} />

      {/* Grid */}
      {showGrid && (
        <Grid
          args={[100, 100]}
          position={[0, -0.1, 0]}
          cellColor="#E2E8F0"
          sectionColor="#CBD5E1"
        />
      )}

      {/* Axis Helper */}
      {showAxis && <AxisHelper />}

      {/* Nodes - Using instanced rendering for better performance */}
      {showNodes && model && model.nodes && model.nodes.length > 0 && (
        <InstancedNodes
          nodes={model.nodes}
          selectedNode={selectedNode}
          onNodeClick={onNodeClick}
        />
      )}

      {/* Selected Node - Individual rendering for interaction */}
      {showNodes && selectedNode && model && model.nodes && (
        <NodeComponent
          node={model.nodes.find((n) => n.id === selectedNode)!}
          isSelected={true}
          onClick={() => onNodeClick(selectedNode)}
        />
      )}

      {/* Members */}
      {showMembers &&
        model &&
        model.members &&
        model.nodes &&
        model.members.map((member) => {
          const startNode = model.nodes.find(
            (n) => n.id === member.startNodeId,
          );
          const endNode = model.nodes.find((n) => n.id === member.endNodeId);

          if (!startNode || !endNode) {
            return null;
          }

          return (
            <MemberComponent
              key={member.id}
              member={member}
              startNode={startNode}
              endNode={endNode}
              isSelected={selectedMember === member.id}
              color={getMemberColor(member)}
              onClick={() => onMemberClick(member.id)}
              memberTag={memberTags.get(member.id)}
              onTagChange={onTagChange}
            />
          );
        })}
    </>
  );
}

// Axis Helper Component
function AxisHelper() {
  return (
    <group position={[0, 0, 0]}>
      {/* X-axis - Red */}
      <Line
        points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(5, 0, 0)]}
        color="#ff0000"
        lineWidth={3}
      />
      <Html position={[5.5, 0, 0]}>
        <div className="bg-red-500 text-white px-1 py-0.5 rounded text-xs font-bold">
          X
        </div>
      </Html>

      {/* Y-axis - Green */}
      <Line
        points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 5, 0)]}
        color="#00ff00"
        lineWidth={3}
      />
      <Html position={[0, 5.5, 0]}>
        <div className="bg-green-500 text-white px-1 py-0.5 rounded text-xs font-bold">
          Y
        </div>
      </Html>

      {/* Z-axis - Blue */}
      <Line
        points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 5)]}
        color="#0000ff"
        lineWidth={3}
      />
      <Html position={[0, 0, 5.5]}>
        <div className="bg-blue-500 text-white px-1 py-0.5 rounded text-xs font-bold">
          Z
        </div>
      </Html>
    </group>
  );
}

// Three.js Viewer Component
function ThreeJSViewer({
  model,
  selectedNode,
  selectedMember,
  onNodeClick,
  onMemberClick,
  memberTags,
  showNodes,
  showMembers,
  showGrid,
  showAxis,
  onViewChange,
  setCameraRef,
  controlsRef,
  onTagChange,
}: {
  model: StructuralModel;
  selectedNode: string | null;
  selectedMember: string | null;
  onNodeClick: (nodeId: string) => void;
  onMemberClick: (memberId: string) => void;
  memberTags: Map<string, MemberTag>;
  showNodes: boolean;
  showMembers: boolean;
  showGrid: boolean;
  showAxis: boolean;
  onViewChange: (view: string) => void;
  setCameraRef: (camera: THREE.Camera) => void;
  controlsRef: React.MutableRefObject<any>;
  onTagChange: (memberId: string, tag: MemberTag) => void;
}) {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-gray-50 to-blue-50">
      <Canvas
        camera={{ position: [10, 10, 10], fov: 60 }}
        shadows
        gl={{ antialias: true, alpha: true }}
        onPointerMissed={() => {
          // Clear selections when clicking on empty space
          setSelectedNode(null);
          setSelectedMember(null);
        }}
      >
        <Suspense fallback={null}>
          <StructuralModelScene
            model={model}
            selectedNode={selectedNode}
            selectedMember={selectedMember}
            onNodeClick={onNodeClick}
            onMemberClick={onMemberClick}
            memberTags={memberTags}
            showNodes={showNodes}
            showMembers={showMembers}
            showGrid={showGrid}
            showAxis={showAxis}
            onCameraReady={setCameraRef}
            onTagChange={onTagChange}
          />
          <OrbitControls
            ref={controlsRef}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            dampingFactor={0.1}
            enableDamping={true}
            zoomSpeed={2.0}
            panSpeed={2.0}
            rotateSpeed={1.0}
            minDistance={1}
            maxDistance={1000}
            minPolarAngle={0}
            maxPolarAngle={Math.PI}
            mouseButtons={{
              LEFT: THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.PAN,
            }}
            touches={{
              ONE: THREE.TOUCH.ROTATE,
              TWO: THREE.TOUCH.DOLLY_PAN,
            }}
            makeDefault
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Member tag selector component
function MemberTagSelector({
  memberId,
  currentTag,
  onTagChange,
}: {
  memberId: string;
  currentTag?: MemberTag;
  onTagChange: (memberId: string, tag: MemberTag) => void;
}) {
  const tagOptions: { value: MemberTag; label: string }[] = [
    { value: "MAIN_FRAME_COLUMN", label: "Main Frame Column" },
    { value: "END_FRAME_COLUMN", label: "End Frame Column" },
    { value: "MAIN_FRAME_RAFTER", label: "Main Frame Rafter" },
    { value: "END_FRAME_RAFTER", label: "End Frame Rafter" },
    { value: "ROOF_PURLIN", label: "Roof Purlin" },
    { value: "WALL_GIRT", label: "Wall Girt" },
    { value: "ROOF_BRACING", label: "Roof Bracing" },
    { value: "WALL_BRACING", label: "Wall Bracing" },
    { value: "CRANE_BEAM", label: "Crane Beam" },
    { value: "MEZZANINE_BEAM", label: "Mezzanine Beam" },
    { value: "CANOPY_BEAM", label: "Canopy Beam" },
    { value: "FASCIA_BEAM", label: "Fascia Beam" },
    { value: "PARAPET", label: "Parapet" },
    { value: "SIGNAGE_POLE", label: "Signage Pole" },
  ];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Member Tag:</label>
      <Select
        value={currentTag || ""}
        onValueChange={(value) => onTagChange(memberId, value as MemberTag)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select tag" />
        </SelectTrigger>
        <SelectContent>
          {tagOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: MEMBER_TAG_COLORS[option.value] }}
                />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// React Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-red-50 border border-red-200 rounded-lg">
          <div className="text-center p-8">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">
              3D Visualizer Error
            </h3>
            <p className="text-red-700 mb-4">
              The 3D visualizer encountered an error and cannot display the
              model.
            </p>
            <p className="text-sm text-red-600">{this.state.error?.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ThreeDVisualizerCore() {
  const [model, setModel] = useState<StructuralModel | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [memberTags, setMemberTags] = useState<Map<string, MemberTag>>(
    new Map(),
  );
  const [showNodes, setShowNodes] = useState(true);
  const [showMembers, setShowMembers] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxis, setShowAxis] = useState(true);
  const [cameraRef, setCameraRef] = useState<THREE.Camera | null>(null);
  const controlsRef = useRef<any>(null);
  const mcp = useMCP();

  // Enhanced model loading with comprehensive debugging
  useEffect(() => {
    const loadModel = () => {
      console.log("🔄 BULLETPROOF 3D VISUALIZER: Loading model...", {
        timestamp: new Date().toISOString(),
        mcpCurrent: !!mcp.current,
        mcpInitialized: mcp.isInitialized,
        mcpError: mcp.error,
        sessionStorageKeys: Object.keys(sessionStorage),
      });

      // STEP 1: Try to get model from session storage
      console.log("📦 STEP 1: Checking session storage...");
      const sessionData = sessionStorage.getItem("parsedModel");

      if (sessionData) {
        try {
          console.log("🔍 Found model data in session storage, parsing...");
          const parsedModel = JSON.parse(sessionData);

          // Validate parsed model structure
          if (!parsedModel || !parsedModel.nodes || !parsedModel.members) {
            throw new Error("Invalid model structure in session storage");
          }

          if (parsedModel.nodes.length === 0) {
            throw new Error("Model has no nodes");
          }

          if (parsedModel.members.length === 0) {
            throw new Error("Model has no members");
          }

          console.log(
            "✅ STEP 1 COMPLETE: Model loaded from session storage:",
            {
              name: parsedModel.name,
              nodes: parsedModel.nodes.length,
              members: parsedModel.members.length,
              units: parsedModel.units,
              unitsSystem: parsedModel.unitsSystem,
              hasGeometry: !!parsedModel.geometry,
              aiDetection: parsedModel.aiDetection ? "Present" : "Missing",
            },
          );

          setModel(parsedModel);

          // STEP 2: Load member tags from MCP if available
          console.log("🏷️ STEP 2: Loading member tags from MCP...");
          if (mcp.current?.memberTags) {
            const tagMap = new Map<string, MemberTag>();
            mcp.current.memberTags.forEach((mt) => {
              tagMap.set(mt.memberId, mt.tag);
            });
            setMemberTags(tagMap);
            console.log("✅ STEP 2 COMPLETE: Member tags loaded from MCP:", {
              tagCount: tagMap.size,
              sampleTags: Array.from(tagMap.entries()).slice(0, 3),
            });
          } else {
            console.log("⚠️ No member tags available in MCP");
          }

          // STEP 3: Initialize MCP if model exists but no MCP
          if (!mcp.current && parsedModel) {
            console.log("🤖 STEP 3: Initializing MCP from loaded model...");
            try {
              mcp.initializeFromModel(parsedModel);
              console.log("✅ STEP 3 COMPLETE: MCP initialized from model");
            } catch (mcpError) {
              console.warn(
                "⚠️ MCP initialization failed (non-critical):",
                mcpError,
              );
            }
          }

          console.log("🎉 3D VISUALIZER: Model loading complete!");
          return;
        } catch (error) {
          console.error(
            "❌ STEP 1 FAILED: Failed to parse model from session storage:",
            {
              error: error instanceof Error ? error.message : String(error),
              sessionDataLength: sessionData.length,
              sessionDataPreview: sessionData.substring(0, 200),
            },
          );
        }
      } else {
        console.log("⚠️ STEP 1: No model found in session storage");
      }

      // STEP 4: Check alternative storage locations
      console.log("🔍 STEP 4: Checking alternative storage locations...");
      const altData =
        sessionStorage.getItem("currentModel") ||
        sessionStorage.getItem("parsedGeometry");
      if (altData) {
        try {
          const altModel = JSON.parse(altData);
          if (altModel.nodes && altModel.members) {
            console.log("✅ Found model in alternative storage");
            setModel(altModel);
            return;
          }
        } catch (error) {
          console.warn("⚠️ Alternative storage parsing failed:", error);
        }
      }

      console.log(
        "❌ 3D VISUALIZER: No valid model found in any storage location",
      );
    };

    // Initial load with delay to ensure MCP is ready
    console.log("🚀 3D VISUALIZER: Starting initial model load...");
    setTimeout(loadModel, 100);

    // Enhanced event listeners
    const handleGeometryParsed = (event: any) => {
      console.log("📡 3D VISUALIZER: Received geometryParsed event:", {
        hasDetail: !!event.detail,
        detailKeys: event.detail ? Object.keys(event.detail) : [],
        timestamp: event.detail?.timestamp,
      });

      // Small delay to ensure storage is updated
      setTimeout(loadModel, 200);
    };

    const handleModelReady = (event: any) => {
      console.log("📡 3D VISUALIZER: Received modelReady event:", event.detail);
      setTimeout(loadModel, 100);
    };

    // Listen for multiple event types
    window.addEventListener("geometryParsed", handleGeometryParsed);
    window.addEventListener("modelReady", handleModelReady);

    return () => {
      window.removeEventListener("geometryParsed", handleGeometryParsed);
      window.removeEventListener("modelReady", handleModelReady);
    };
  }, [mcp.current, mcp.isInitialized, mcp.initializeFromModel]);

  // Handler functions
  const handleZoomIn = () => {
    if (controlsRef.current && cameraRef) {
      const distance = cameraRef.position.distanceTo(
        controlsRef.current.target,
      );
      const newDistance = Math.max(distance * 0.8, 0.5);
      const direction = new THREE.Vector3()
        .subVectors(cameraRef.position, controlsRef.current.target)
        .normalize()
        .multiplyScalar(newDistance);
      cameraRef.position.copy(controlsRef.current.target).add(direction);
      controlsRef.current.update();
    }
  };

  const handleZoomOut = () => {
    if (controlsRef.current && cameraRef) {
      const distance = cameraRef.position.distanceTo(
        controlsRef.current.target,
      );
      const newDistance = Math.min(distance * 1.25, 1000);
      const direction = new THREE.Vector3()
        .subVectors(cameraRef.position, controlsRef.current.target)
        .normalize()
        .multiplyScalar(newDistance);
      cameraRef.position.copy(controlsRef.current.target).add(direction);
      controlsRef.current.update();
    }
  };

  const handleFitToView = () => {
    if (!cameraRef || !model || !model.nodes || !controlsRef.current) return;

    const box = new THREE.Box3();
    model.nodes.forEach((node) => {
      box.expandByPoint(new THREE.Vector3(node.x, node.y, node.z));
    });

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 1.5;

    cameraRef.position.set(
      center.x + distance * 0.7,
      center.y + distance * 0.7,
      center.z + distance * 0.7,
    );
    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  };

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(selectedNode === nodeId ? null : nodeId);
    setSelectedMember(null);
  };

  const handleMemberClick = (memberId: string) => {
    setSelectedMember(selectedMember === memberId ? null : memberId);
    setSelectedNode(null);
  };

  const handleViewChange = (view: string) => {
    if (!cameraRef || !model || !model.nodes || !controlsRef.current) return;

    // Calculate model bounds for proper positioning
    const box = new THREE.Box3();
    model.nodes.forEach((node) => {
      box.expandByPoint(new THREE.Vector3(node.x, node.y, node.z));
    });

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 1.8;

    // Set camera position based on view
    switch (view) {
      case "front":
        cameraRef.position.set(center.x, center.y, center.z - distance);
        break;
      case "top":
        cameraRef.position.set(center.x, center.y + distance, center.z);
        break;
      case "right":
        cameraRef.position.set(center.x + distance, center.y, center.z);
        break;
      case "back":
        cameraRef.position.set(center.x, center.y, center.z + distance);
        break;
      case "bottom":
        cameraRef.position.set(center.x, center.y - distance, center.z);
        break;
      case "left":
        cameraRef.position.set(center.x - distance, center.y, center.z);
        break;
      case "iso":
        cameraRef.position.set(
          center.x + distance * 0.7,
          center.y + distance * 0.7,
          center.z + distance * 0.7,
        );
        break;
    }

    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  };

  const handleTagChange = (memberId: string, tag: MemberTag) => {
    // Update local state immediately
    const newTags = new Map(memberTags);
    newTags.set(memberId, tag);
    setMemberTags(newTags);

    // Update MCP if available
    if (mcp.current && !mcp.current.isLocked) {
      try {
        mcp.updateMemberTag(memberId, tag, true);
        console.log(`✅ Updated member ${memberId} tag to ${tag} in MCP`);
      } catch (error) {
        console.warn(`⚠️ Failed to update MCP member tag:`, error);
      }
    }
  };

  const handleExportModel = () => {
    if (model) {
      const dataStr = JSON.stringify(model, null, 2);
      const dataUri =
        "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
      const exportFileDefaultName = `${model.name}_exported.json`;

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();
    }
  };

  if (!model) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-center p-8">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Model Loaded
          </h3>
          <p className="text-gray-600 mb-4">
            Upload a structural model to view it in 3D
          </p>
          <p className="text-sm text-gray-500">
            Supported formats: STAAD.Pro (.std), SAP2000 (.s2k, .sdb)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-white rounded-lg overflow-hidden border shadow-sm">
      {/* Compact CAD-style Control Panel */}
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-1">
        {/* Compact View Controls */}
        <Card className="p-1.5 bg-white/90 backdrop-blur-sm">
          <div className="flex flex-col space-y-1">
            <div className="text-xs font-medium text-gray-600">Views</div>
            <div className="grid grid-cols-3 gap-0.5">
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-1 text-xs"
                onClick={() => handleViewChange("front")}
                title="Front View"
              >
                F
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-1 text-xs"
                onClick={() => handleViewChange("top")}
                title="Top View"
              >
                T
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-1 text-xs"
                onClick={() => handleViewChange("right")}
                title="Right View"
              >
                R
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs"
              onClick={() => handleViewChange("iso")}
              title="Isometric View"
            >
              <View className="w-3 h-3 mr-1" />
              ISO
            </Button>
          </div>
        </Card>

        {/* Compact Zoom Controls */}
        <Card className="p-1.5 bg-white/90 backdrop-blur-sm">
          <div className="flex flex-col space-y-0.5">
            <div className="text-xs font-medium text-gray-600">Zoom</div>
            <div className="flex space-x-0.5">
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleZoomIn}
                title="Zoom In"
              >
                <ZoomIn className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleZoomOut}
                title="Zoom Out"
              >
                <ZoomOut className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleFitToView}
                title="Fit to View"
              >
                <Maximize className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Compact Display Controls */}
        <Card className="p-1.5 bg-white/90 backdrop-blur-sm">
          <div className="flex flex-col space-y-0.5">
            <div className="text-xs font-medium text-gray-600">Display</div>
            <div className="grid grid-cols-2 gap-0.5">
              <Button
                variant={showNodes ? "default" : "outline"}
                size="sm"
                className="h-6 text-xs px-1"
                onClick={() => setShowNodes(!showNodes)}
                title="Toggle Nodes"
              >
                <Eye className="w-3 h-3" />
              </Button>
              <Button
                variant={showMembers ? "default" : "outline"}
                size="sm"
                className="h-6 text-xs px-1"
                onClick={() => setShowMembers(!showMembers)}
                title="Toggle Members"
              >
                <Building className="w-3 h-3" />
              </Button>
              <Button
                variant={showGrid ? "default" : "outline"}
                size="sm"
                className="h-6 text-xs px-1"
                onClick={() => setShowGrid(!showGrid)}
                title="Toggle Grid"
              >
                <Grid3X3 className="w-3 h-3" />
              </Button>
              <Button
                variant={showAxis ? "default" : "outline"}
                size="sm"
                className="h-6 text-xs px-1"
                onClick={() => setShowAxis(!showAxis)}
                title="Toggle Axis"
              >
                <Rotate3D className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Compact Model Info Panel */}
      <div className="absolute top-4 right-4 z-10">
        <Card className="p-2 bg-white/90 backdrop-blur-sm">
          <div className="space-y-1">
            <div className="text-sm font-medium">{model?.name || "Model"}</div>
            <div className="text-xs text-gray-600 space-y-0.5">
              <div>
                Nodes: {model?.nodes?.length || 0} | Members:{" "}
                {model?.members?.length || 0}
              </div>
              <div>Units: {model?.unitsSystem || "Unknown"}</div>
              <div className="text-blue-600 font-medium">
                💡 Double-click member to tag
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Compact Selection Info Panel */}
      {(selectedNode || selectedMember) && (
        <div className="absolute bottom-4 left-4 z-10">
          <Card className="p-2 min-w-[200px] bg-white/95 backdrop-blur-sm">
            {selectedNode && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-blue-600">
                  Node {selectedNode}
                </div>
                {(() => {
                  const node = model?.nodes?.find((n) => n.id === selectedNode);
                  return node ? (
                    <div className="text-xs">
                      <div className="grid grid-cols-3 gap-1">
                        <div>X: {node.x.toFixed(1)}</div>
                        <div>Y: {node.y.toFixed(1)}</div>
                        <div>Z: {node.z.toFixed(1)}</div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
            {selectedMember && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-green-600">
                  Member {selectedMember}
                </div>
                {(() => {
                  const member = model?.members?.find(
                    (m) => m.id === selectedMember,
                  );
                  return member ? (
                    <div className="text-xs space-y-1">
                      <div>Type: {member.type}</div>
                      <div className="text-xs">
                        {member.startNodeId} → {member.endNodeId}
                      </div>
                      <MemberTagSelector
                        memberId={selectedMember}
                        currentTag={memberTags.get(selectedMember)}
                        onTagChange={handleTagChange}
                      />
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Compact Navigation Help */}
      <div className="absolute bottom-4 right-4 z-10">
        <Card className="p-2 bg-white/90 backdrop-blur-sm">
          <div className="text-xs text-gray-600 space-y-0.5">
            <div>🖱️ L:Rotate | R:Pan | Wheel:Zoom</div>
            <div>📱 Pinch/Drag | 2x-Click:Tag</div>
          </div>
        </Card>
      </div>

      {/* 3D Viewer */}
      <div className="w-full h-full">
        <ThreeJSViewer
          model={model}
          selectedNode={selectedNode}
          selectedMember={selectedMember}
          onNodeClick={handleNodeClick}
          onMemberClick={handleMemberClick}
          memberTags={memberTags}
          showNodes={showNodes}
          showMembers={showMembers}
          showGrid={showGrid}
          showAxis={showAxis}
          onViewChange={handleViewChange}
          setCameraRef={setCameraRef}
          controlsRef={controlsRef}
          onTagChange={handleTagChange}
        />
      </div>
    </div>
  );
}

export default function ThreeDVisualizer() {
  return (
    <ErrorBoundary>
      <ThreeDVisualizerCore />
    </ErrorBoundary>
  );
}
