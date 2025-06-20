import { useState, useEffect, useRef, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Text, Line } from "@react-three/drei";
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
} from "lucide-react";
import { StructuralModel, Member, Node, MemberTag } from "@/types/model";
import { useMCP } from "@/lib/mcp-manager";
import { useNavigate } from "react-router-dom";

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

// Three.js Node Component
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
      onClick={onClick}
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

// Three.js Member Component
function MemberComponent({
  member,
  startNode,
  endNode,
  isSelected,
  color,
  onClick,
}: {
  member: Member;
  startNode: Node;
  endNode: Node;
  isSelected: boolean;
  color: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const points = [
    new THREE.Vector3(startNode.x, startNode.y, startNode.z),
    new THREE.Vector3(endNode.x, endNode.y, endNode.z),
  ];

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = "default";
  };

  return (
    <group onClick={onClick}>
      <Line
        points={points}
        color={isSelected ? "#FCD34D" : hovered ? "#60A5FA" : color}
        lineWidth={isSelected ? 6 : hovered ? 4 : 2}
        transparent
        opacity={isSelected ? 1 : hovered ? 0.9 : 0.8}
      />
      {/* Invisible cylinder for easier clicking */}
      <mesh
        position={[
          (startNode.x + endNode.x) / 2,
          (startNode.y + endNode.y) / 2,
          (startNode.z + endNode.z) / 2,
        ]}
        rotation={[
          0,
          0,
          Math.atan2(endNode.y - startNode.y, endNode.x - startNode.x),
        ]}
        visible={false}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <cylinderGeometry
          args={[
            0.15,
            0.15,
            Math.sqrt(
              Math.pow(endNode.x - startNode.x, 2) +
                Math.pow(endNode.y - startNode.y, 2) +
                Math.pow(endNode.z - startNode.z, 2),
            ),
          ]}
        />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
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
        </Text>
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
  onCameraReady,
}: {
  model: StructuralModel;
  selectedNode: string | null;
  selectedMember: string | null;
  onNodeClick: (nodeId: string) => void;
  onMemberClick: (memberId: string) => void;
  memberTags: Map<string, MemberTag>;
  showNodes: boolean;
  showMembers: boolean;
  onCameraReady: (camera: THREE.Camera) => void;
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
      <Grid
        args={[100, 100]}
        position={[0, -0.1, 0]}
        cellColor="#E2E8F0"
        sectionColor="#CBD5E1"
      />

      {/* Nodes */}
      {showNodes &&
        model &&
        model.nodes &&
        model.nodes.map((node) => (
          <NodeComponent
            key={node.id}
            node={node}
            isSelected={selectedNode === node.id}
            onClick={() => onNodeClick(node.id)}
          />
        ))}

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
            />
          );
        })}
    </>
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
  onViewChange,
  setCameraRef,
}: {
  model: StructuralModel;
  selectedNode: string | null;
  selectedMember: string | null;
  onNodeClick: (nodeId: string) => void;
  onMemberClick: (memberId: string) => void;
  memberTags: Map<string, MemberTag>;
  showNodes: boolean;
  showMembers: boolean;
  onViewChange: (view: string) => void;
  setCameraRef: (camera: THREE.Camera) => void;
}) {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-gray-50 to-blue-50">
      <Canvas
        camera={{ position: [10, 10, 10], fov: 60 }}
        shadows
        gl={{ antialias: true, alpha: true }}
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
            onCameraReady={setCameraRef}
          />
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            dampingFactor={0.05}
            enableDamping={true}
            zoomSpeed={1.5}
            panSpeed={1.0}
            rotateSpeed={0.5}
            minDistance={1}
            maxDistance={2000}
            minPolarAngle={0}
            maxPolarAngle={Math.PI}
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

export default function ThreeDVisualizer() {
  const navigate = useNavigate();
  const mcpState = useMCP();
  const [model, setModel] = useState<StructuralModel | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [memberTags, setMemberTags] = useState<Map<string, MemberTag>>(
    new Map(),
  );
  const [showNodes, setShowNodes] = useState(true);
  const [showMembers, setShowMembers] = useState(true);
  const [cameraRef, setCameraRef] = useState<THREE.Camera | null>(null);

  // Load model data from session storage or MCP
  useEffect(() => {
    console.log("🔍 Loading model data...", { mcpState });

    // Try session storage first (most reliable for visualization)
    const sessionModel = sessionStorage.getItem("currentModel");
    if (sessionModel) {
      try {
        const parsedModel = JSON.parse(sessionModel);
        console.log("📦 Found session model:", parsedModel);
        if (
          parsedModel.nodes &&
          parsedModel.members &&
          parsedModel.nodes.length > 0 &&
          parsedModel.members.length > 0
        ) {
          setModel(parsedModel);

          // Load member tags from MCP if available
          if (mcpState.current) {
            const tagsMap = new Map<string, MemberTag>();
            mcpState.current.memberTags.forEach((mt) => {
              tagsMap.set(mt.memberId, mt.tag);
            });
            setMemberTags(tagsMap);
          }

          console.log(
            "✅ Model loaded from session storage with",
            parsedModel.nodes.length,
            "nodes and",
            parsedModel.members.length,
            "members",
          );
          return;
        }
      } catch (error) {
        console.error("Failed to parse session model:", error);
      }
    }

    // Fallback to MCP data if session storage fails
    if (mcpState.current && mcpState.isInitialized) {
      const mcp = mcpState.current;
      console.log("🎯 Using MCP data as fallback:", mcp);

      // Check if MCP has dimensions with nodes and members
      if (
        mcp.dimensions &&
        (mcp.dimensions as any).nodes &&
        (mcp.dimensions as any).members
      ) {
        const dimensions = mcp.dimensions as any;

        if (dimensions.nodes.length > 0 && dimensions.members.length > 0) {
          const visualizationModel: StructuralModel = {
            id: mcp.modelId,
            name: mcp.modelName,
            type: "STAAD",
            units: mcp.units,
            unitsSystem: mcp.unitsSystem,
            nodes: dimensions.nodes,
            members: dimensions.members,
            plates: [],
            sections: [],
            materials: [],
            loadCases: [],
            supports: [],
            releases: [],
            buildingType: mcp.buildingType,
            geometry: {
              eaveHeight: mcp.dimensions.eaveHeight,
              meanRoofHeight: mcp.dimensions.roofMeanHeight,
              totalHeight: mcp.dimensions.totalHeight,
              buildingLength: mcp.dimensions.buildingLength,
              buildingWidth: mcp.dimensions.buildingWidth,
              roofSlope: mcp.dimensions.roofSlope,
              frameCount: mcp.dimensions.frameCount,
              endFrameCount: mcp.dimensions.endFrameCount,
              baySpacings: mcp.baySpacingX || [48],
            },
          };

          // Load member tags
          const tagsMap = new Map<string, MemberTag>();
          mcp.memberTags.forEach((mt) => {
            tagsMap.set(mt.memberId, mt.tag);
          });
          setMemberTags(tagsMap);

          console.log("✅ Model loaded from MCP:", visualizationModel);
          setModel(visualizationModel);
        } else {
          console.warn("⚠️ MCP dimensions has empty nodes/members arrays");
        }
      } else {
        console.warn("⚠️ MCP dimensions missing nodes/members data");
      }
    }
  }, [mcpState]);

  const handleBackToHome = () => {
    navigate("/");
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
    if (!cameraRef || !model || !model.nodes) return;

    // Calculate model bounds for proper positioning
    const box = new THREE.Box3();
    model.nodes.forEach((node) => {
      box.expandByPoint(new THREE.Vector3(node.x, node.y, node.z));
    });

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2;

    // Set camera position based on view
    switch (view) {
      case "front":
        cameraRef.position.set(center.x, center.y, center.z - distance);
        break;
      case "back":
        cameraRef.position.set(center.x, center.y, center.z + distance);
        break;
      case "left":
        cameraRef.position.set(center.x - distance, center.y, center.z);
        break;
      case "right":
        cameraRef.position.set(center.x + distance, center.y, center.z);
        break;
      case "iso":
        cameraRef.position.set(
          center.x + distance * 0.7,
          center.y + distance * 0.7,
          center.z + distance * 0.7,
        );
        break;
    }

    cameraRef.lookAt(center);
  };

  const handleTagChange = (memberId: string, tag: MemberTag) => {
    if (!mcpState.current) {
      alert("MCP not initialized - cannot update member tags");
      return;
    }

    if (mcpState.current.isLocked) {
      alert("Cannot modify member tags - MCP is locked for calculations");
      return;
    }

    try {
      // Update MCP
      mcpState.updateMemberTag(memberId, tag, true);

      // Update local state
      const newTags = new Map(memberTags);
      newTags.set(memberId, tag);
      setMemberTags(newTags);

      // Update model display
      if (model) {
        const updatedModel = {
          ...model,
          members: model.members.map((member) =>
            member.id === memberId ? { ...member, tag } : member,
          ),
        };
        setModel(updatedModel);
      }
    } catch (error) {
      alert(
        `Failed to update member tag: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
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

  // Loading state
  if (mcpState.isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 animate-spin">
            <Building className="w-16 h-16 text-blue-500" />
          </div>
          <p className="text-lg font-medium text-gray-900 mb-2">
            Loading Model Data...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (mcpState.error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            Model Loading Error
          </p>
          <p className="text-gray-600 mb-4">{mcpState.error}</p>
          <Button onClick={handleBackToHome}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Upload
          </Button>
        </div>
      </div>
    );
  }

  // No model state - show helpful message
  if (!model) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <Building className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            No Model Data Available
          </p>
          <p className="text-gray-600 mb-4">
            The 3D visualizer needs model data to display. This could happen if:
          </p>
          <ul className="text-sm text-gray-500 mb-6 text-left space-y-1">
            <li>• Model upload is still in progress</li>
            <li>• Model parsing failed</li>
            <li>• Session data was cleared</li>
            <li>• MCP initialization is incomplete</li>
          </ul>
          <div className="space-y-2">
            <Button onClick={handleBackToHome}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-full mx-auto px-3">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={handleBackToHome}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  3D Visualizer
                </h1>
                <p className="text-sm text-gray-500">{model.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">{model.type || "Unknown"} Model</Badge>
              <Button variant="outline" size="sm" onClick={handleExportModel}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-56px)]">
        {/* 3D Viewer */}
        <div className="flex-1">
          <Card className="h-full rounded-none border-0">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">3D Model Viewer</CardTitle>
                  <CardDescription>
                    Interactive structural model visualization
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={showNodes ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowNodes(!showNodes)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Nodes
                  </Button>
                  <Button
                    variant={showMembers ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowMembers(!showMembers)}
                  >
                    <Building className="w-4 h-4 mr-1" />
                    Members
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-80px)]">
              <div className="w-full h-full bg-gray-100 overflow-hidden">
                <ThreeJSViewer
                  model={model}
                  selectedNode={selectedNode}
                  selectedMember={selectedMember}
                  onNodeClick={handleNodeClick}
                  onMemberClick={handleMemberClick}
                  memberTags={memberTags}
                  showNodes={showNodes}
                  showMembers={showMembers}
                  onViewChange={handleViewChange}
                  setCameraRef={setCameraRef}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="w-80 bg-white border-l">
          <Tabs defaultValue="info" className="h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="selection">Selection</TabsTrigger>
              <TabsTrigger value="controls">Controls</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="p-4 space-y-4">
              <div>
                <h3 className="font-medium mb-2">Model Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Name:</span>
                    <span className="font-medium">{model.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="font-medium">{model.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nodes:</span>
                    <span className="font-medium">{model.nodes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Members:</span>
                    <span className="font-medium">{model.members.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Units:</span>
                    <span className="font-medium">
                      {model.units.length}, {model.units.force}
                    </span>
                  </div>
                  {mcpState.current && (
                    <>
                      <div className="flex justify-between">
                        <span>Building Type:</span>
                        <span className="font-medium">
                          {mcpState.current.buildingType}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Confidence:</span>
                        <span className="font-medium">
                          {(
                            mcpState.current.buildingTypeConfidence * 100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="selection" className="p-4 space-y-4">
              {selectedNode && (
                <div className="space-y-2">
                  <h3 className="font-medium">Selected Node</h3>
                  <div className="bg-blue-50 p-3 rounded border">
                    <div className="font-medium mb-2">Node {selectedNode}</div>
                    {(() => {
                      const node = model.nodes.find(
                        (n) => n.id === selectedNode,
                      );
                      return node ? (
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span>X:</span>
                            <span className="font-mono">
                              {node.x.toFixed(3)} {model.units.length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Y:</span>
                            <span className="font-mono">
                              {node.y.toFixed(3)} {model.units.length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Z:</span>
                            <span className="font-mono">
                              {node.z.toFixed(3)} {model.units.length}
                            </span>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              )}

              {selectedMember && (
                <div className="space-y-2">
                  <h3 className="font-medium">Selected Member</h3>
                  <div className="bg-green-50 p-3 rounded border">
                    <div className="font-medium mb-2">
                      Member {selectedMember}
                    </div>
                    {(() => {
                      const member = model.members.find(
                        (m) => m.id === selectedMember,
                      );
                      return member ? (
                        <div className="space-y-2">
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span>Type:</span>
                              <span className="font-medium">{member.type}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Start Node:</span>
                              <span className="font-mono">
                                {member.startNodeId}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>End Node:</span>
                              <span className="font-mono">
                                {member.endNodeId}
                              </span>
                            </div>
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
                </div>
              )}

              {!selectedNode && !selectedMember && (
                <div className="text-center text-gray-500 py-8">
                  <MousePointer className="w-8 h-8 mx-auto mb-2" />
                  <p>Click on nodes or members to view details</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="controls" className="p-4 space-y-4">
              <div>
                <h3 className="font-medium mb-2">View Controls</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewChange("front")}
                  >
                    Front
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewChange("back")}
                  >
                    Back
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewChange("left")}
                  >
                    Left
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewChange("right")}
                  >
                    Right
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="col-span-2"
                    onClick={() => handleViewChange("iso")}
                  >
                    <View className="w-4 h-4 mr-2" />
                    Isometric
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Display Options</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Show Nodes</span>
                    <Button
                      variant={showNodes ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowNodes(!showNodes)}
                    >
                      {showNodes ? "On" : "Off"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Show Members</span>
                    <Button
                      variant={showMembers ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowMembers(!showMembers)}
                    >
                      {showMembers ? "On" : "Off"}
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Interaction</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>• Left drag: Rotate view</div>
                  <div>• Right drag: Pan camera</div>
                  <div>• Scroll: Zoom in/out</div>
                  <div>• Click: Select elements</div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
