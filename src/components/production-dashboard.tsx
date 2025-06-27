import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Database,
  Download,
  Eye,
  FileText,
  Settings,
  Trash2,
  Upload,
  Users,
  Activity,
  Brain,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Building,
  Zap,
} from "lucide-react";
import { db, auth, realtime } from "@/lib/supabase";
import type { Database } from "@/types/supabase";
import { cn } from "@/lib/utils";

type ProjectSummary = Database["public"]["Views"]["project_summary"]["Row"];
type Override = Database["public"]["Tables"]["overrides"]["Row"];
type MLRequest = Database["public"]["Tables"]["ml_requests"]["Row"];
type TrainingLog = Database["public"]["Tables"]["training_logs"]["Row"];
type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];

interface DashboardStats {
  totalUploads: number;
  totalOverrides: number;
  mlTrainingStatus: string;
  activeProjects: number;
  completedAnalyses: number;
  pendingReports: number;
}

interface ActivityItem {
  id: string;
  type: "upload" | "override" | "ml_request" | "report";
  description: string;
  timestamp: string;
  status: "success" | "pending" | "failed";
}

function ProductionDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalUploads: 0,
    totalOverrides: 0,
    mlTrainingStatus: "idle",
    activeProjects: 0,
    completedAnalyses: 0,
    pendingReports: 0,
  });
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [mlRequests, setMLRequests] = useState<MLRequest[]>([]);
  const [trainingLogs, setTrainingLogs] = useState<TrainingLog[]>([]);
  const [activityTimeline, setActivityTimeline] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize dashboard data
  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const user = await auth.getCurrentUser();
      if (!user) {
        setError("Please sign in to access the dashboard");
        return;
      }
      setCurrentUser(user);

      // Load user profile
      try {
        const profile = await db.userProfiles.getById(user.id);
        setUserProfile(profile);
      } catch (profileError) {
        console.warn("User profile not found, creating default");
        // Create default profile if it doesn't exist
        const defaultProfile = await db.userProfiles.create({
          id: user.id,
          email: user.email || "",
          full_name: user.user_metadata?.full_name || "User",
          subscription_tier: "free",
        });
        setUserProfile(defaultProfile);
      }

      // Load all dashboard data
      await Promise.all([
        loadProjects(user.id),
        loadOverrides(user.id),
        loadMLRequests(user.id),
        loadTrainingLogs(),
      ]);

      // Setup real-time subscriptions
      setupRealtimeSubscriptions(user.id);
    } catch (err) {
      console.error("Dashboard initialization error:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async (userId: string) => {
    try {
      const projectData = await db.projectSummary.getByUserId(userId);
      setProjects(projectData);

      // Update stats
      setDashboardStats((prev) => ({
        ...prev,
        totalUploads: projectData.length,
        activeProjects: projectData.filter(
          (p) => p.status === "processing" || p.status === "uploading",
        ).length,
        completedAnalyses: projectData.filter((p) => p.status === "completed")
          .length,
      }));
    } catch (err) {
      console.error("Error loading projects:", err);
    }
  };

  const loadOverrides = async (userId: string) => {
    try {
      const overrideData = await db.overrides.getByUserId(userId);
      setOverrides(overrideData);

      setDashboardStats((prev) => ({
        ...prev,
        totalOverrides: overrideData.length,
      }));
    } catch (err) {
      console.error("Error loading overrides:", err);
    }
  };

  const loadMLRequests = async (userId: string) => {
    try {
      const mlData = await db.mlRequests.getByStatus("completed");
      const userMLData = mlData.filter((req) => req.user_id === userId);
      setMLRequests(userMLData);
    } catch (err) {
      console.error("Error loading ML requests:", err);
    }
  };

  const loadTrainingLogs = async () => {
    try {
      const logs = await db.trainingLogs.getAll();
      setTrainingLogs(logs.slice(0, 5)); // Get latest 5 logs

      const latestLog = logs[0];
      if (latestLog) {
        setDashboardStats((prev) => ({
          ...prev,
          mlTrainingStatus: latestLog.deployment_status || "idle",
        }));
      }
    } catch (err) {
      console.error("Error loading training logs:", err);
    }
  };

  const setupRealtimeSubscriptions = (userId: string) => {
    // Subscribe to projects changes
    const projectsSub = realtime.subscribeToProjects(userId, (payload) => {
      console.log("Projects updated:", payload);
      loadProjects(userId);
    });

    // Subscribe to overrides changes
    const overridesSub = realtime.subscribeToOverrides(userId, (payload) => {
      console.log("Overrides updated:", payload);
      loadOverrides(userId);
    });

    // Subscribe to ML requests changes
    const mlSub = realtime.subscribeToMLRequests(userId, (payload) => {
      console.log("ML requests updated:", payload);
      loadMLRequests(userId);
    });

    // Cleanup subscriptions on unmount
    return () => {
      projectsSub.unsubscribe();
      overridesSub.unsubscribe();
      mlSub.unsubscribe();
    };
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await db.projects.delete(projectId);
      // Refresh projects list
      if (currentUser) {
        await loadProjects(currentUser.id);
      }
    } catch (err) {
      console.error("Error deleting project:", err);
      setError("Failed to delete project");
    }
  };

  const handleDownloadReport = (projectId: string) => {
    // Implement report download logic
    console.log("Downloading report for project:", projectId);
  };

  const handleView3D = (projectId: string) => {
    // Navigate to 3D viewer
    console.log("Opening 3D view for project:", projectId);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "processing":
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      case "uploading":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">Uploading</Badge>
        );
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case "archived":
        return <Badge className="bg-gray-100 text-gray-800">Archived</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getBuildingTypeBadge = (buildingType: string | null) => {
    if (!buildingType) return <Badge variant="outline">Unknown</Badge>;

    const colorMap: { [key: string]: string } = {
      SINGLE_GABLE_HANGAR: "bg-blue-100 text-blue-800",
      DOUBLE_GABLE_HANGAR: "bg-green-100 text-green-800",
      MULTI_GABLE_HANGAR: "bg-purple-100 text-purple-800",
      WAREHOUSE_BUILDING: "bg-orange-100 text-orange-800",
      INDUSTRIAL_BUILDING: "bg-red-100 text-red-800",
      COMMERCIAL_BUILDING: "bg-teal-100 text-teal-800",
    };

    const colorClass = colorMap[buildingType] || "bg-gray-100 text-gray-800";
    const displayName = buildingType
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());

    return <Badge className={colorClass}>{displayName}</Badge>;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Database className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Loading Dashboard...
            </h3>
            <p className="text-gray-600">Fetching your project data</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Production Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back, {userProfile?.full_name || currentUser?.email}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className="bg-blue-100 text-blue-800">
            {userProfile?.subscription_tier || "Free"} Plan
          </Badge>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Uploads
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardStats.totalUploads}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Manual Overrides
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardStats.totalOverrides}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Projects
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardStats.activeProjects}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ML Training</p>
                <p className="text-sm font-bold text-gray-900 capitalize">
                  {dashboardStats.mlTrainingStatus}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="projects" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="overrides">Overrides</TabsTrigger>
          <TabsTrigger value="ml-status">ML Status</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="w-5 h-5" />
                <span>Project List</span>
              </CardTitle>
              <CardDescription>
                Manage your uploaded structural models and analysis results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No projects yet
                  </h3>
                  <p className="text-gray-600">
                    Upload your first structural model to get started
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project Name</TableHead>
                        <TableHead>Building Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Upload Date</TableHead>
                        <TableHead>File Size</TableHead>
                        <TableHead>Nodes/Members</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((project) => (
                        <TableRow key={project.project_id}>
                          <TableCell className="font-medium">
                            {project.project_name}
                          </TableCell>
                          <TableCell>
                            {getBuildingTypeBadge(project.building_type)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(project.status)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {formatDate(project.upload_time)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {formatFileSize(project.file_size)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {project.node_count || 0} /{" "}
                            {project.member_count || 0}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleView3D(project.project_id!)
                                }
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleDownloadReport(project.project_id!)
                                }
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() =>
                                  handleDeleteProject(project.project_id!)
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overrides Tab */}
        <TabsContent value="overrides">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Override History</span>
              </CardTitle>
              <CardDescription>
                Manual member tag corrections and training data contributions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overrides.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No overrides yet
                  </h3>
                  <p className="text-gray-600">
                    Manual corrections will appear here
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member ID</TableHead>
                        <TableHead>Original Tag</TableHead>
                        <TableHead>New Tag</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Training Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overrides.map((override) => (
                        <TableRow key={override.override_id}>
                          <TableCell className="font-medium">
                            {override.member_id}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {override.original_tag}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">
                              {override.new_tag}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {override.confidence
                              ? `${(override.confidence * 100).toFixed(1)}%`
                              : "N/A"}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {formatDate(override.override_timestamp)}
                          </TableCell>
                          <TableCell>
                            {override.used_in_training ? (
                              <Badge className="bg-blue-100 text-blue-800">
                                Used
                              </Badge>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ML Status Tab */}
        <TabsContent value="ml-status">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="w-5 h-5" />
                  <span>ML Analysis Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Building Classification
                    </span>
                    <Badge className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Member Tagging</span>
                    <Badge className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Load Criteria Analysis
                    </span>
                    <Badge className="bg-blue-100 text-blue-800">
                      Processing
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Height Category</span>
                    <Badge className="bg-green-100 text-green-800">
                      Complete
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Training Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Model Accuracy</span>
                      <span>94.2%</span>
                    </div>
                    <Progress value={94.2} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Training Data</span>
                      <span>{overrides.length} samples</span>
                    </div>
                    <Progress
                      value={Math.min((overrides.length / 100) * 100, 100)}
                      className="h-2"
                    />
                  </div>
                  <div className="pt-2 text-sm text-gray-600">
                    Last training:{" "}
                    {trainingLogs[0]
                      ? formatDate(trainingLogs[0].retrain_time)
                      : "Never"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Reports Section</span>
              </CardTitle>
              <CardDescription>
                Download generated reports and view report status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Reports Coming Soon
                </h3>
                <p className="text-gray-600">
                  PDF report generation will be available in the next update
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>User Activity Timeline</span>
              </CardTitle>
              <CardDescription>
                Recent actions and system events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projects.slice(0, 5).map((project, index) => (
                  <div
                    key={project.project_id}
                    className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Upload className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Uploaded project: {project.project_name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatDate(project.upload_time)} •{" "}
                        {getBuildingTypeBadge(project.building_type)}
                      </p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(project.status)}
                    </div>
                  </div>
                ))}

                {overrides.slice(0, 3).map((override, index) => (
                  <div
                    key={override.override_id}
                    className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Settings className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Manual override: {override.member_id}
                      </p>
                      <p className="text-xs text-gray-600">
                        {override.original_tag} → {override.new_tag} •{" "}
                        {formatDate(override.override_timestamp)}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-100 text-green-800">
                        Corrected
                      </Badge>
                    </div>
                  </div>
                ))}

                {projects.length === 0 && overrides.length === 0 && (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No activity yet
                    </h3>
                    <p className="text-gray-600">
                      Your recent actions will appear here
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProductionDashboard;
