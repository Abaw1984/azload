import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-context";
import { supabase } from "@/lib/supabase";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Users,
  Building,
  Brain,
  Activity,
  FileText,
  Settings,
  AlertTriangle,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  BarChart3,
  Clock,
  Database,
  Server,
  Lock,
  Key,
  UserPlus,
  Search,
  Loader2,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  company: string;
  license_number?: string;
  subscription_tier: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  project_count?: number;
  last_login?: string;
}

interface ProjectSummary {
  project_id: string;
  user_id: string;
  project_name: string;
  status: string;
  building_type?: string;
  upload_time: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  node_count?: number;
  member_count?: number;
  has_materials?: boolean;
  override_count?: number;
}

interface MLRequest {
  request_id: string;
  user_id: string;
  project_id: string;
  request_type: string;
  request_time: string;
  status: string;
  processing_time_ms?: number;
  api_endpoint?: string;
  model_version?: string;
  error_message?: string;
  retry_count: number;
}

interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  processingProjects: number;
  completedProjects: number;
  failedProjects: number;
  totalMLRequests: number;
  successfulMLRequests: number;
  failedMLRequests: number;
  avgProcessingTime: number;
  storageUsed: number;
  storageTotal: number;
}

function AdminPanel() {
  const { user: currentUser, logout } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [mlRequests, setMLRequests] = useState<MLRequest[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    totalProjects: 0,
    processingProjects: 0,
    completedProjects: 0,
    failedProjects: 0,
    totalMLRequests: 0,
    successfulMLRequests: 0,
    failedMLRequests: 0,
    avgProcessingTime: 0,
    storageUsed: 0, // TODO: Calculate from file storage
    storageTotal: 0, // TODO: Get from configuration
  });
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.is_admin) {
      loadAdminData();
      // Set up real-time updates
      const interval = setInterval(loadSystemMetrics, 30000);
      return () => clearInterval(interval);
    } else if (currentUser && !currentUser.is_admin) {
      // User is not admin, stop loading
      setIsLoading(false);
    }
  }, [currentUser]);

  const loadAdminData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load data with individual error handling
      await Promise.allSettled([
        loadUsers(),
        loadProjects(),
        loadMLRequests(),
        loadSystemMetrics(),
      ]);

      console.log("Admin data loading completed");
    } catch (error) {
      console.error("Error loading admin data:", error);
      setError(
        "Failed to load some admin data. Using fallback data where available.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Error loading users (using mock data):", error);
        // Use mock data for development
        const mockUsers = [
          {
            id: "dev-bypass-user-123",
            email: "developer@azload.dev",
            full_name: "Development User",
            company: "AzLoad Development",
            license_number: "DEV-123456",
            subscription_tier: "premium",
            is_admin: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            project_count: 5,
          },
          {
            id: "test-user-456",
            email: "testuser@azload.com",
            full_name: "Test User",
            company: "Test Company",
            license_number: "TEST-789",
            subscription_tier: "free",
            is_admin: false,
            created_at: new Date(
              Date.now() - 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            updated_at: new Date(
              Date.now() - 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            project_count: 2,
          },
        ];
        setUsers(mockUsers);
        return;
      }

      const usersWithCounts =
        profiles?.map((profile) => ({
          ...profile,
          project_count: 0, // Simplified for now
        })) || [];

      setUsers(usersWithCounts);
    } catch (error) {
      console.error("Error loading users:", error);
      // Don't throw error, use empty array
      setUsers([]);
    }
  };

  const loadProjects = async () => {
    try {
      const { data: projects, error } = await supabase
        .from("project_summary")
        .select("*")
        .order("upload_time", { ascending: false })
        .limit(100);

      if (error) {
        console.warn("Error loading projects (using mock data):", error);
        // Use mock data for development
        const mockProjects = [
          {
            project_id: "proj-1",
            user_id: "dev-bypass-user-123",
            project_name: "Sample Warehouse",
            status: "completed",
            building_type: "WAREHOUSE_BUILDING",
            upload_time: new Date().toISOString(),
            file_name: "warehouse.std",
            file_size: 1024000,
            file_type: "STAAD",
            node_count: 150,
            member_count: 200,
            has_materials: true,
            override_count: 5,
          },
          {
            project_id: "proj-2",
            user_id: "test-user-456",
            project_name: "Office Building",
            status: "processing",
            building_type: "OFFICE_BUILDING",
            upload_time: new Date(
              Date.now() - 2 * 60 * 60 * 1000,
            ).toISOString(),
            file_name: "office.std",
            file_size: 2048000,
            file_type: "STAAD",
            node_count: 300,
            member_count: 450,
            has_materials: false,
            override_count: 0,
          },
        ];
        setProjects(mockProjects);
        return;
      }
      setProjects(projects || []);
    } catch (error) {
      console.error("Error loading projects:", error);
      // Don't throw error, use empty array
      setProjects([]);
    }
  };

  const loadMLRequests = async () => {
    try {
      const { data: requests, error } = await supabase
        .from("ml_requests")
        .select("*")
        .order("request_time", { ascending: false })
        .limit(100);

      if (error) {
        console.warn("Error loading ML requests (using mock data):", error);
        // Use mock data for development
        const mockRequests = [
          {
            request_id: "req-1",
            user_id: "dev-bypass-user-123",
            project_id: "proj-1",
            request_type: "building",
            request_time: new Date().toISOString(),
            status: "completed",
            processing_time_ms: 1250,
            api_endpoint: "/api/classify-building",
            model_version: "v1.2.0",
            error_message: null,
            retry_count: 0,
          },
          {
            request_id: "req-2",
            user_id: "test-user-456",
            project_id: "proj-2",
            request_type: "member",
            request_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            status: "failed",
            processing_time_ms: null,
            api_endpoint: "/api/tag-members",
            model_version: "v1.2.0",
            error_message: "Connection timeout",
            retry_count: 2,
          },
        ];
        setMLRequests(mockRequests);
        return;
      }
      setMLRequests(requests || []);
    } catch (error) {
      console.error("Error loading ML requests:", error);
      // Don't throw error, use empty array
      setMLRequests([]);
    }
  };

  const loadSystemMetrics = async () => {
    try {
      // Try to get real metrics first
      const { data: userStats, error: userError } = await supabase
        .from("user_profiles")
        .select("id, created_at")
        .gte(
          "created_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        );

      // If we can't get real data, use mock metrics
      if (userError) {
        console.warn(
          "Error loading system metrics (using mock data):",
          userError,
        );
        setSystemMetrics({
          totalUsers: 2,
          activeUsers: 1,
          totalProjects: 2,
          processingProjects: 1,
          completedProjects: 1,
          failedProjects: 0,
          totalMLRequests: 2,
          successfulMLRequests: 1,
          failedMLRequests: 1,
          avgProcessingTime: 1250,
          storageUsed: 15,
          storageTotal: 100,
        });
        return;
      }

      // Get project metrics
      const { data: projectStats, error: projectError } = await supabase
        .from("projects")
        .select("status");

      // Get ML request metrics
      const { data: mlStats, error: mlError } = await supabase
        .from("ml_requests")
        .select("status, processing_time_ms")
        .gte(
          "request_time",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        );

      // Calculate metrics with fallbacks
      const totalUsers = await supabase
        .from("user_profiles")
        .select("id", { count: "exact", head: true });
      const totalProjects = projectStats?.length || 0;
      const processingProjects =
        projectStats?.filter((p) => p.status === "processing").length || 0;
      const completedProjects =
        projectStats?.filter((p) => p.status === "completed").length || 0;
      const failedProjects =
        projectStats?.filter((p) => p.status === "failed").length || 0;

      const totalMLRequests = mlStats?.length || 0;
      const successfulMLRequests =
        mlStats?.filter((r) => r.status === "completed").length || 0;
      const failedMLRequests =
        mlStats?.filter((r) => r.status === "failed").length || 0;

      const avgProcessingTime =
        mlStats?.length > 0
          ? mlStats.reduce((sum, r) => sum + (r.processing_time_ms || 0), 0) /
            mlStats.length
          : 0;

      setSystemMetrics({
        totalUsers: totalUsers.count || 0,
        activeUsers: userStats?.length || 0,
        totalProjects,
        processingProjects,
        completedProjects,
        failedProjects,
        totalMLRequests,
        successfulMLRequests,
        failedMLRequests,
        avgProcessingTime: Math.round(avgProcessingTime),
        storageUsed: 0,
        storageTotal: 100,
      });
    } catch (error) {
      console.error("Error loading system metrics:", error);
      // Don't throw error, use default metrics
      setSystemMetrics({
        totalUsers: 0,
        activeUsers: 0,
        totalProjects: 0,
        processingProjects: 0,
        completedProjects: 0,
        failedProjects: 0,
        totalMLRequests: 0,
        successfulMLRequests: 0,
        failedMLRequests: 0,
        avgProcessingTime: 0,
        storageUsed: 0,
        storageTotal: 100,
      });
    }
  };

  const handleUserEdit = (user: UserProfile) => {
    setSelectedUser(user);
    setIsUserDialogOpen(true);
  };

  const handleUserDelete = async (userId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      // Refresh users list
      await loadUsers();
      console.log("User deleted successfully");
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user. Please try again.");
    }
  };

  const handleUserSave = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          full_name: selectedUser.full_name,
          company: selectedUser.company,
          license_number: selectedUser.license_number,
          subscription_tier: selectedUser.subscription_tier,
          is_admin: selectedUser.is_admin,
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      // Refresh users list
      await loadUsers();
      setIsUserDialogOpen(false);
      setSelectedUser(null);
      console.log("User updated successfully");
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user. Please try again.");
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      suspended: "bg-red-100 text-red-800",
      completed: "bg-green-100 text-green-800",
      processing: "bg-blue-100 text-blue-800",
      failed: "bg-red-100 text-red-800",
      compliant: "bg-green-100 text-green-800",
      warning: "bg-yellow-100 text-yellow-800",
      "non-compliant": "bg-red-100 text-red-800",
      success: "bg-green-100 text-green-800",
      failure: "bg-red-100 text-red-800",
    };
    return (
      <Badge
        className={
          colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
        }
      >
        {status}
      </Badge>
    );
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.company?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredProjects = projects.filter(
    (project) =>
      project.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.building_type?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredMLRequests = mlRequests.filter(
    (request) =>
      request.request_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.status?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Check if user is admin
  if (!currentUser?.is_admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Access Denied
            </h3>
            <p className="text-gray-600 mb-4">
              You don't have administrator privileges to access this panel.
            </p>
            <Button onClick={logout} variant="outline">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Loading Admin Panel
          </h3>
          <p className="text-gray-600">Please wait while we load the data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Error Loading Data
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadAdminData} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main admin panel
  return (
    <div className="space-y-6 bg-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Shield className="w-8 h-8 text-blue-600" />
            <span>AZLOAD Admin Panel</span>
          </h1>
          <p className="text-gray-600 mt-2">
            System administration, user management, and monitoring dashboard
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {currentUser && (
            <div className="text-sm text-gray-600">
              Welcome, {currentUser.full_name || currentUser.email} | Last
              updated: {new Date().toLocaleTimeString()}
            </div>
          )}

          {/* Dashboard Access Button */}
          <Button
            onClick={() => window.open("/dashboard", "_blank")}
            variant="outline"
            size="sm"
            className="text-blue-600 hover:text-blue-900 border-blue-300"
          >
            <Building className="w-4 h-4 mr-2" />
            Main Dashboard
          </Button>

          <Button onClick={logout} variant="outline" size="sm">
            <Key className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* System Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {systemMetrics.totalUsers}
                </p>
                <p className="text-xs text-green-600">
                  {systemMetrics.activeUsers} active
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Projects
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {systemMetrics.totalProjects}
                </p>
                <p className="text-xs text-blue-600">
                  {systemMetrics.processingProjects} processing
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  ML API Calls
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {systemMetrics.totalMLRequests.toLocaleString()}
                </p>
                <p className="text-xs text-purple-600">
                  {systemMetrics.successfulMLRequests} successful
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  System Uptime
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {systemMetrics.avgProcessingTime}ms
                </p>
                <p className="text-xs text-green-600">Avg ML Response</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage Usage */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium text-gray-900">Storage Usage</h3>
              <p className="text-sm text-gray-600">
                {systemMetrics.storageUsed} GB of {systemMetrics.storageTotal}{" "}
                GB used
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <Progress
            value={
              (systemMetrics.storageUsed / systemMetrics.storageTotal) * 100
            }
            className="h-3"
          />
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full grid-cols-5 max-w-2xl">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="audit">ML Requests</TabsTrigger>
            <TabsTrigger value="ml">ML Training</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Manage user accounts, roles, and permissions
                  </CardDescription>
                </div>
                <Button size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Projects</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {user.full_name || "N/A"}
                            </div>
                            <div className="text-sm text-gray-600">
                              {user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.company || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {user.is_admin ? "Admin" : "User"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          {user.project_count || 0}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <Badge variant="outline">
                              {user.subscription_tier}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUserEdit(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUserDelete(user.id)}
                              disabled={user.id === currentUser?.id}
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>Project Management</CardTitle>
              <CardDescription>
                Monitor and manage all user projects and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project Name</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Building Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Materials</TableHead>
                      <TableHead>File Size</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow key={project.project_id}>
                        <TableCell className="font-medium">
                          {project.project_name}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{project.user_id.substring(0, 8)}...</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {project.building_type?.replace("_", " ") ||
                              "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(project.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {project.has_materials ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            )}
                            <span className="text-sm">
                              {project.has_materials
                                ? "Complete"
                                : "Geometry Only"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {project.file_size
                            ? `${(project.file_size / 1024 / 1024).toFixed(1)} MB`
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(project.upload_time).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ML Requests Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>ML API Requests</CardTitle>
              <CardDescription>
                Machine learning API request logs and performance monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processing Time</TableHead>
                      <TableHead>Model Version</TableHead>
                      <TableHead>Retries</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMLRequests.map((request) => (
                      <TableRow key={request.request_id}>
                        <TableCell className="font-medium capitalize">
                          {request.request_type.replace("_", " ")}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {request.processing_time_ms
                            ? `${request.processing_time_ms}ms`
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {request.model_version || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {request.retry_count}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(request.request_time).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ML Training Tab */}
        <TabsContent value="ml">
          <Card>
            <CardHeader>
              <CardTitle>ML Training & API Monitoring</CardTitle>
              <CardDescription>
                Monitor machine learning model training and API usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">ML Performance Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium">
                        Total Requests
                      </span>
                      <Badge className="bg-blue-600">
                        {systemMetrics.totalMLRequests}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium">
                        Successful Requests
                      </span>
                      <Badge className="bg-green-600">
                        {systemMetrics.successfulMLRequests}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="text-sm font-medium">
                        Failed Requests
                      </span>
                      <Badge className="bg-red-600">
                        {systemMetrics.failedMLRequests}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">API Performance</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Average Response Time</span>
                      <span className="font-mono">
                        {systemMetrics.avgProcessingTime}ms
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Success Rate</span>
                      <span className="font-mono text-green-600">
                        {systemMetrics.totalMLRequests > 0
                          ? (
                              (systemMetrics.successfulMLRequests /
                                systemMetrics.totalMLRequests) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">API Endpoint</span>
                      <Badge variant="outline">
                        {import.meta.env.VITE_ML_API_URL || "Not configured"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Status</span>
                      <Badge
                        variant={
                          import.meta.env.VITE_ML_API_ENABLED === "true"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {import.meta.env.VITE_ML_API_ENABLED === "true"
                          ? "Enabled"
                          : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>
                Configure system parameters and application settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">General Settings</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="maintenance">Maintenance Mode</Label>
                        <input type="checkbox" id="maintenance" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="registration">
                          Allow New Registrations
                        </Label>
                        <input
                          type="checkbox"
                          id="registration"
                          defaultChecked
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="notifications">
                          Email Notifications
                        </Label>
                        <input
                          type="checkbox"
                          id="notifications"
                          defaultChecked
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium">ML API Settings</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="api-endpoint">ML API Endpoint</Label>
                        <Input
                          id="api-endpoint"
                          defaultValue={import.meta.env.VITE_ML_API_URL || ""}
                          className="mt-1"
                          readOnly
                        />
                      </div>
                      <div>
                        <Label htmlFor="timeout">Request Timeout (ms)</Label>
                        <Input
                          id="timeout"
                          type="number"
                          defaultValue="30000"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button variant="outline">Reset to Defaults</Button>
                  <Button>Save Settings</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Edit Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Modify user account details and permissions
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={selectedUser.full_name || ""}
                    onChange={(e) =>
                      setSelectedUser({
                        ...selectedUser,
                        full_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    value={selectedUser.email}
                    onChange={(e) =>
                      setSelectedUser({
                        ...selectedUser,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-admin">Admin Status</Label>
                  <Select
                    value={selectedUser.is_admin ? "admin" : "user"}
                    onValueChange={(value: string) =>
                      setSelectedUser({
                        ...selectedUser,
                        is_admin: value === "admin",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-subscription">Subscription Tier</Label>
                  <Select
                    value={selectedUser.subscription_tier}
                    onValueChange={(value: string) =>
                      setSelectedUser({
                        ...selectedUser,
                        subscription_tier: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-company">Company</Label>
                  <Input
                    id="edit-company"
                    value={selectedUser.company || ""}
                    onChange={(e) =>
                      setSelectedUser({
                        ...selectedUser,
                        company: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-license">License Number</Label>
                  <Input
                    id="edit-license"
                    value={selectedUser.license_number || ""}
                    onChange={(e) =>
                      setSelectedUser({
                        ...selectedUser,
                        license_number: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setIsUserDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleUserSave}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminPanel;
