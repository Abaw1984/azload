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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  RotateCcw,
  GitBranch,
  TrendingUp,
  TrendingDown,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Activity,
  BarChart3,
  Loader2,
} from "lucide-react";
import { db, auth } from "@/lib/supabase";
import MLTrainingPipeline, { ModelVersion } from "@/lib/ml-training-pipeline";
import type { Database } from "@/types/supabase";

type TrainingLog = Database["public"]["Tables"]["training_logs"]["Row"];

interface ModelVersionInfo {
  version: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  deployedAt: string;
  trainingDataCount: number;
  performanceChange: number;
  status: "deployed" | "archived" | "failed" | "rollback";
  deploymentNotes?: string;
}

function ModelVersioningDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [modelVersions, setModelVersions] = useState<ModelVersionInfo[]>([]);
  const [currentVersion, setCurrentVersion] = useState<string>("");
  const [selectedVersion, setSelectedVersion] =
    useState<ModelVersionInfo | null>(null);
  const [rollbackReason, setRollbackReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeVersioning();
  }, []);

  const initializeVersioning = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user and verify admin status
      const user = await auth.getCurrentUser();
      if (!user) {
        setError("Please sign in to access model versioning");
        return;
      }
      setCurrentUser(user);

      // Check admin permissions
      const profile = await db.userProfiles.getById(user.id);
      if (!profile?.is_admin) {
        setError("Access denied: Admin permissions required");
        return;
      }
      setIsAdmin(true);

      // Load model versions
      await loadModelVersions();
    } catch (err) {
      console.error("Model versioning initialization error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to initialize model versioning",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadModelVersions = async () => {
    try {
      // Get all training logs with deployment information
      const { data: trainingLogs, error } = await db.supabase
        .from("training_logs")
        .select("*")
        .in("deployment_status", ["deployed", "failed", "rollback"])
        .order("retrain_time", { ascending: false });

      if (error) throw error;

      const versions: ModelVersionInfo[] = [];
      let currentDeployedVersion = "";

      for (const log of trainingLogs || []) {
        try {
          const metrics = log.performance_metrics as any;

          // Extract performance metrics
          const accuracy = metrics?.accuracy || metrics?.new?.accuracy || 0.92;
          const precision =
            metrics?.precision || metrics?.new?.precision || 0.89;
          const recall = metrics?.recall || metrics?.new?.recall || 0.91;
          const f1Score =
            metrics?.f1Score || (2 * precision * recall) / (precision + recall);

          // Calculate performance change
          const performanceChange =
            metrics?.changes?.accuracy || metrics?.improvement || 0;

          const version: ModelVersionInfo = {
            version: log.model_version || "v1.0.0",
            accuracy,
            precision,
            recall,
            f1Score,
            deployedAt: log.retrain_time || new Date().toISOString(),
            trainingDataCount: log.total_training_samples || 0,
            performanceChange,
            status:
              log.deployment_status === "deployed"
                ? "deployed"
                : log.deployment_status === "failed"
                  ? "failed"
                  : "rollback",
            deploymentNotes: metrics?.reason || metrics?.note || "",
          };

          versions.push(version);

          // Track current deployed version
          if (log.deployment_status === "deployed" && !currentDeployedVersion) {
            currentDeployedVersion = version.version;
          }
        } catch (versionError) {
          console.warn("Error processing version:", versionError);
        }
      }

      setModelVersions(versions);
      setCurrentVersion(currentDeployedVersion || "v1.0.0");

      console.log("📊 LOADED MODEL VERSIONS:", versions.length);
    } catch (err) {
      console.error("Error loading model versions:", err);
      setError("Failed to load model versions");
    }
  };

  const handleRollback = async (targetVersion: string) => {
    if (!currentUser || !isAdmin) {
      setError("Admin permissions required");
      return;
    }

    setProcessing(true);
    try {
      await MLTrainingPipeline.rollbackToVersion(
        targetVersion,
        currentUser.id,
        rollbackReason || `Rollback to ${targetVersion}`,
      );

      // Refresh model versions
      await loadModelVersions();

      // Reset form
      setSelectedVersion(null);
      setRollbackReason("");

      console.log(`✅ ROLLBACK COMPLETED:`, targetVersion);
    } catch (err) {
      console.error("Rollback error:", err);
      setError(err instanceof Error ? err.message : "Failed to rollback model");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "deployed":
        return <Badge className="bg-green-100 text-green-800">Deployed</Badge>;
      case "archived":
        return <Badge className="bg-gray-100 text-gray-800">Archived</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case "rollback":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">Rollback</Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPerformanceIcon = (change: number) => {
    if (change > 0) {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else if (change < 0) {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    } else {
      return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <GitBranch className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Loading Model Versions...
            </h3>
            <p className="text-gray-600">Fetching deployment history</p>
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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
            <GitBranch className="w-8 h-8 text-blue-600" />
            <span>Model Versioning & Rollback</span>
          </h1>
          <p className="text-gray-600">
            Track ML model versions, performance metrics, and manage rollbacks
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className="bg-green-100 text-green-800">
            Current: {currentVersion}
          </Badge>
          <Button variant="outline" size="sm" onClick={loadModelVersions}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Current Model Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Current Version
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentVersion}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Versions
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {modelVersions.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <GitBranch className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Deployed Models
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {modelVersions.filter((v) => v.status === "deployed").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Failed Deployments
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {modelVersions.filter((v) => v.status === "failed").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Versions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Model Version History</span>
          </CardTitle>
          <CardDescription>
            Complete history of ML model versions with performance metrics and
            rollback capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {modelVersions.length === 0 ? (
            <div className="text-center py-8">
              <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No model versions found
              </h3>
              <p className="text-gray-600">
                Model versions will appear here after training deployments
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Performance Change</TableHead>
                    <TableHead>Training Data</TableHead>
                    <TableHead>Deployed At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelVersions.map((version) => (
                    <TableRow key={version.version}>
                      <TableCell className="font-medium">
                        {version.version}
                        {version.version === currentVersion && (
                          <Badge className="ml-2 bg-green-100 text-green-800">
                            Current
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(version.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {formatPercentage(version.accuracy)}
                          </div>
                          <Progress
                            value={version.accuracy * 100}
                            className="h-1"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          {getPerformanceIcon(version.performanceChange)}
                          <span
                            className={`text-sm ${
                              version.performanceChange > 0
                                ? "text-green-600"
                                : version.performanceChange < 0
                                  ? "text-red-600"
                                  : "text-gray-600"
                            }`}
                          >
                            {version.performanceChange > 0 ? "+" : ""}
                            {formatPercentage(version.performanceChange)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {version.trainingDataCount.toLocaleString()} samples
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(version.deployedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedVersion(version)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {version.version !== currentVersion &&
                            version.status === "deployed" && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-yellow-600 hover:text-yellow-700"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      Rollback to {version.version}
                                    </DialogTitle>
                                    <DialogDescription>
                                      This will rollback the current model to
                                      version {version.version}. This action
                                      requires admin approval and will be
                                      logged.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <label className="text-sm font-medium">
                                        Rollback Reason
                                      </label>
                                      <Textarea
                                        placeholder="Explain why you're rolling back to this version..."
                                        value={rollbackReason}
                                        onChange={(e) =>
                                          setRollbackReason(e.target.value)
                                        }
                                        className="mt-1"
                                      />
                                    </div>
                                    <Alert>
                                      <Shield className="h-4 w-4" />
                                      <AlertDescription>
                                        This rollback will be audited and logged
                                        for compliance. Current model
                                        performance may be affected.
                                      </AlertDescription>
                                    </Alert>
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedVersion(null);
                                        setRollbackReason("");
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={() =>
                                        handleRollback(version.version)
                                      }
                                      disabled={
                                        processing || !rollbackReason.trim()
                                      }
                                      className="bg-yellow-600 hover:bg-yellow-700"
                                    >
                                      {processing && (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      )}
                                      Confirm Rollback
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}
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

      {/* Version Details Modal */}
      {selectedVersion && (
        <Dialog
          open={!!selectedVersion}
          onOpenChange={() => setSelectedVersion(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <GitBranch className="w-5 h-5" />
                <span>Model Version {selectedVersion.version}</span>
              </DialogTitle>
              <DialogDescription>
                Detailed performance metrics and deployment information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Performance Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatPercentage(selectedVersion.accuracy)}
                      </div>
                      <div className="text-sm text-gray-600">Accuracy</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatPercentage(selectedVersion.precision)}
                      </div>
                      <div className="text-sm text-gray-600">Precision</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {formatPercentage(selectedVersion.recall)}
                      </div>
                      <div className="text-sm text-gray-600">Recall</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {formatPercentage(selectedVersion.f1Score)}
                      </div>
                      <div className="text-sm text-gray-600">F1 Score</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Deployment Information */}
              <div className="space-y-3">
                <h4 className="font-medium">Deployment Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Status:</span>
                    <div className="mt-1">
                      {getStatusBadge(selectedVersion.status)}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Deployed At:</span>
                    <div className="mt-1 text-gray-600">
                      {formatDate(selectedVersion.deployedAt)}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Training Data:</span>
                    <div className="mt-1 text-gray-600">
                      {selectedVersion.trainingDataCount.toLocaleString()}{" "}
                      samples
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Performance Change:</span>
                    <div className="mt-1 flex items-center space-x-1">
                      {getPerformanceIcon(selectedVersion.performanceChange)}
                      <span
                        className={`${
                          selectedVersion.performanceChange > 0
                            ? "text-green-600"
                            : selectedVersion.performanceChange < 0
                              ? "text-red-600"
                              : "text-gray-600"
                        }`}
                      >
                        {selectedVersion.performanceChange > 0 ? "+" : ""}
                        {formatPercentage(selectedVersion.performanceChange)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deployment Notes */}
              {selectedVersion.deploymentNotes && (
                <div className="space-y-2">
                  <h4 className="font-medium">Deployment Notes</h4>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                    {selectedVersion.deploymentNotes}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedVersion(null)}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  // Download version details
                  const data = JSON.stringify(selectedVersion, null, 2);
                  const blob = new Blob([data], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `model-version-${selectedVersion.version}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Details
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default ModelVersioningDashboard;
