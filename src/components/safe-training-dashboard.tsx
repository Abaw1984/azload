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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Brain,
  Database,
  Activity,
  TrendingUp,
  Users,
  FileText,
  Zap,
  Lock,
  Loader2,
  Download,
  RefreshCw,
  Settings,
  BarChart3,
  Target,
  Layers,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DataValidationService } from "@/lib/data-validation-service";
import { MLTrainingPipeline } from "@/lib/ml-training-pipeline";
import { AuditLogger } from "@/lib/audit-logger";
import type { Database } from "@/types/supabase";
import type {
  ApprovalWorkflow,
  ValidationResult,
} from "@/lib/data-validation-service";

type Override = Database["public"]["Tables"]["overrides"]["Row"];

interface PendingValidation {
  id: string;
  overrideIds: string[];
  requestedBy: string;
  requestTime: Date;
  validationResult: ValidationResult;
  riskScore: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED";
  reviewedBy?: string;
  reviewComments?: string;
  approvalLevel: "AUTO" | "ENGINEER" | "ADMIN" | "COMMITTEE";
}

interface TrainingMetrics {
  totalRequests: number;
  autoApproved: number;
  manualReview: number;
  rejected: number;
  averageRiskScore: number;
  poisoningAttempts: number;
  successfulTrainings: number;
  modelVersions: number;
  lastTrainingTime: Date | null;
}

interface SafetyAlert {
  id: string;
  type:
    | "SUSPICIOUS_PATTERN"
    | "HIGH_RISK_REQUEST"
    | "COORDINATED_ACTIVITY"
    | "VALIDATION_FAILURE";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  timestamp: Date;
  affectedRequests: string[];
  resolved: boolean;
}

function SafeTrainingDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingValidations, setPendingValidations] = useState<
    PendingValidation[]
  >([]);
  const [selectedValidation, setSelectedValidation] =
    useState<PendingValidation | null>(null);
  const [reviewComments, setReviewComments] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trainingMetrics, setTrainingMetrics] = useState<TrainingMetrics>({
    totalRequests: 0,
    autoApproved: 0,
    manualReview: 0,
    rejected: 0,
    averageRiskScore: 0,
    poisoningAttempts: 0,
    successfulTrainings: 0,
    modelVersions: 0,
    lastTrainingTime: null,
  });
  const [safetyAlerts, setSafetyAlerts] = useState<SafetyAlert[]>([]);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    initializeDashboard();

    // Set up real-time updates
    const interval = setInterval(() => {
      if (!loading) {
        loadPendingValidations();
        loadTrainingMetrics();
        loadSafetyAlerts();
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user and verify admin status
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("Please sign in to access the safe training dashboard");
        return;
      }
      setCurrentUser(user);

      // Check admin permissions
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.is_admin) {
        setError("Access denied: Admin permissions required");
        return;
      }
      setIsAdmin(true);

      // Load all dashboard data
      await Promise.all([
        loadPendingValidations(),
        loadTrainingMetrics(),
        loadSafetyAlerts(),
      ]);

      console.log("🛡️ SAFE TRAINING DASHBOARD: Initialized successfully");
    } catch (err) {
      console.error("Safe training dashboard initialization error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to initialize dashboard",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadPendingValidations = async () => {
    try {
      // Fetch pending ML requests from database
      const { data: mlRequests, error } = await supabase
        .from("ml_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform to PendingValidation format
      const validations: PendingValidation[] = (mlRequests || []).map(
        (request) => {
          const requestData = request.request_data as any;
          return {
            id: request.request_id,
            overrideIds: requestData?.overrideIds || [],
            requestedBy: request.user_id,
            requestTime: new Date(request.created_at),
            validationResult: requestData?.validation || {
              passed: false,
              score: 0.5,
              violations: [],
              recommendations: [],
            },
            riskScore: requestData?.riskScore || 0.5,
            status: request.status === "pending" ? "PENDING" : "APPROVED",
            approvalLevel: requestData?.approvalLevel || "ENGINEER",
          };
        },
      );

      setPendingValidations(validations);
      console.log("📋 LOADED PENDING VALIDATIONS:", validations.length);
    } catch (err) {
      console.error("Error loading pending validations:", err);
    }
  };

  const loadTrainingMetrics = async () => {
    try {
      // Fetch training logs and calculate metrics
      const { data: trainingLogs, error } = await supabase
        .from("training_logs")
        .select("*")
        .order("retrain_time", { ascending: false });

      if (error) throw error;

      const logs = trainingLogs || [];
      const totalRequests = logs.length;
      const autoApproved = logs.filter(
        (log) => log.deployment_status === "deployed",
      ).length;
      const rejected = logs.filter(
        (log) => log.deployment_status === "failed",
      ).length;
      const manualReview = totalRequests - autoApproved - rejected;

      // Calculate average risk score from performance metrics
      const riskScores = logs
        .map((log) => (log.performance_metrics as any)?.riskScore)
        .filter((score) => typeof score === "number");
      const averageRiskScore =
        riskScores.length > 0
          ? riskScores.reduce((sum, score) => sum + score, 0) /
            riskScores.length
          : 0;

      // Count unique model versions
      const modelVersions = new Set(logs.map((log) => log.model_version)).size;

      // Get last training time
      const lastTrainingTime =
        logs.length > 0 ? new Date(logs[0].retrain_time) : null;

      setTrainingMetrics({
        totalRequests,
        autoApproved,
        manualReview,
        rejected,
        averageRiskScore,
        poisoningAttempts: rejected, // Assuming rejected requests are potential poisoning attempts
        successfulTrainings: autoApproved,
        modelVersions,
        lastTrainingTime,
      });

      console.log("📊 LOADED TRAINING METRICS:", {
        totalRequests,
        autoApproved,
        rejected,
        averageRiskScore: averageRiskScore.toFixed(3),
      });
    } catch (err) {
      console.error("Error loading training metrics:", err);
    }
  };

  const loadSafetyAlerts = async () => {
    try {
      // Generate mock safety alerts based on recent activity
      const mockAlerts: SafetyAlert[] = [
        {
          id: "alert_001",
          type: "HIGH_RISK_REQUEST",
          severity: "HIGH",
          message:
            "Training request with risk score 0.85 requires immediate review",
          timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
          affectedRequests: ["req_001"],
          resolved: false,
        },
        {
          id: "alert_002",
          type: "SUSPICIOUS_PATTERN",
          severity: "MEDIUM",
          message:
            "User made 25 corrections in 3 minutes - potential automation detected",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          affectedRequests: ["req_002", "req_003"],
          resolved: true,
        },
      ];

      setSafetyAlerts(mockAlerts);
    } catch (err) {
      console.error("Error loading safety alerts:", err);
    }
  };

  const handleApproveValidation = async (validationId: string) => {
    if (!currentUser || !isAdmin) {
      setError("Admin permissions required");
      return;
    }

    setProcessing(true);
    try {
      const validation = pendingValidations.find((v) => v.id === validationId);
      if (!validation) {
        throw new Error("Validation not found");
      }

      // Create training request through ML Training Pipeline
      await MLTrainingPipeline.requestTraining({
        userId: currentUser.id,
        overrideIds: validation.overrideIds,
        trainingType: "INCREMENTAL",
        requestedBy: currentUser.email || currentUser.id,
      });

      // Update validation status in database
      const { error: updateError } = await supabase
        .from("ml_requests")
        .update({
          status: "approved",
          processed_by: currentUser.id,
          processed_at: new Date().toISOString(),
          processing_notes: reviewComments || "Approved by admin",
        })
        .eq("request_id", validationId);

      if (updateError) {
        console.error("Error updating validation status:", updateError);
        throw updateError;
      }

      // Log approval action
      await AuditLogger.logEngineerReview({
        modelId: validationId,
        engineerLicense: currentUser.id,
        reviewComments: reviewComments || "Training request approved",
        approved: true,
      });

      // Update local state
      setPendingValidations((prev) =>
        prev.map((v) =>
          v.id === validationId
            ? {
                ...v,
                status: "APPROVED",
                reviewedBy: currentUser.id,
                reviewComments,
              }
            : v,
        ),
      );

      setSelectedValidation(null);
      setReviewComments("");

      // Refresh metrics
      await loadTrainingMetrics();

      console.log("✅ VALIDATION APPROVED:", validationId);
    } catch (err) {
      console.error("Approval error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to approve validation",
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectValidation = async (validationId: string) => {
    if (!currentUser || !isAdmin) {
      setError("Admin permissions required");
      return;
    }

    setProcessing(true);
    try {
      // Update validation status in database
      const { error: updateError } = await supabase
        .from("ml_requests")
        .update({
          status: "rejected",
          processed_by: currentUser.id,
          processed_at: new Date().toISOString(),
          processing_notes: reviewComments || "Rejected by admin",
        })
        .eq("request_id", validationId);

      if (updateError) {
        console.error("Error updating validation status:", updateError);
        throw updateError;
      }

      // Log rejection action
      await AuditLogger.logEngineerReview({
        modelId: validationId,
        engineerLicense: currentUser.id,
        reviewComments: reviewComments || "Training request rejected",
        approved: false,
      });

      // Update local state
      setPendingValidations((prev) =>
        prev.map((v) =>
          v.id === validationId
            ? {
                ...v,
                status: "REJECTED",
                reviewedBy: currentUser.id,
                reviewComments,
              }
            : v,
        ),
      );

      setSelectedValidation(null);
      setReviewComments("");

      // Refresh metrics
      await loadTrainingMetrics();

      console.log("❌ VALIDATION REJECTED:", validationId);
    } catch (err) {
      console.error("Rejection error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to reject validation",
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleEscalateValidation = async (validationId: string) => {
    if (!currentUser || !isAdmin) {
      setError("Admin permissions required");
      return;
    }

    setProcessing(true);
    try {
      // Update validation status to escalated
      const { error: updateError } = await supabase
        .from("ml_requests")
        .update({
          status: "escalated",
          processed_by: currentUser.id,
          processed_at: new Date().toISOString(),
          processing_notes: reviewComments || "Escalated for committee review",
        })
        .eq("request_id", validationId);

      if (updateError) {
        console.error("Error updating validation status:", updateError);
        throw updateError;
      }

      // Update local state
      setPendingValidations((prev) =>
        prev.map((v) =>
          v.id === validationId
            ? {
                ...v,
                status: "ESCALATED",
                reviewedBy: currentUser.id,
                reviewComments,
              }
            : v,
        ),
      );

      setSelectedValidation(null);
      setReviewComments("");

      console.log("⬆️ VALIDATION ESCALATED:", validationId);
    } catch (err) {
      console.error("Escalation error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to escalate validation",
      );
    } finally {
      setProcessing(false);
    }
  };

  const exportAuditReport = async () => {
    try {
      const auditData = await AuditLogger.exportLearningMetrics();

      const reportData = {
        exportDate: new Date().toISOString(),
        trainingMetrics,
        pendingValidations,
        safetyAlerts,
        auditTrail: auditData.auditTrail,
        complianceSummary: auditData.complianceSummary,
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `safe-training-audit-report-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      console.log("📄 AUDIT REPORT EXPORTED");
    } catch (err) {
      console.error("Export error:", err);
      setError("Failed to export audit report");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "ESCALATED":
        return (
          <Badge className="bg-purple-100 text-purple-800">Escalated</Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            Pending Review
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRiskBadge = (riskScore: number) => {
    if (riskScore >= 0.8) {
      return <Badge className="bg-red-100 text-red-800">Critical Risk</Badge>;
    } else if (riskScore >= 0.5) {
      return <Badge className="bg-orange-100 text-orange-800">High Risk</Badge>;
    } else if (riskScore >= 0.3) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>
      );
    } else {
      return <Badge className="bg-green-100 text-green-800">Low Risk</Badge>;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case "HIGH":
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case "MEDIUM":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case "LOW":
        return <AlertTriangle className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getApprovalLevelBadge = (level: string) => {
    switch (level) {
      case "AUTO":
        return <Badge className="bg-blue-100 text-blue-800">Auto</Badge>;
      case "ENGINEER":
        return <Badge className="bg-green-100 text-green-800">Engineer</Badge>;
      case "ADMIN":
        return <Badge className="bg-orange-100 text-orange-800">Admin</Badge>;
      case "COMMITTEE":
        return (
          <Badge className="bg-purple-100 text-purple-800">Committee</Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString();
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Loading Safe Training Dashboard...
            </h3>
            <p className="text-gray-600">
              Fetching validation data and security metrics
            </p>
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
            <Shield className="w-8 h-8 text-blue-600" />
            <span>Safe Training Dashboard</span>
          </h1>
          <p className="text-gray-600">
            Anti-poisoning protection and validation workflow management
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className="bg-blue-100 text-blue-800">
            <Lock className="w-3 h-3 mr-1" />
            Secure Mode
          </Badge>
          <Button variant="outline" size="sm" onClick={exportAuditReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm" onClick={initializeDashboard}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Safety Alerts */}
      {safetyAlerts.filter((alert) => !alert.resolved).length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                {safetyAlerts.filter((alert) => !alert.resolved).length} active
                security alert(s) require attention
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("alerts")}
                className="ml-4"
              >
                View Alerts
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Training Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Requests
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {trainingMetrics.totalRequests}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Auto Approved
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {trainingMetrics.autoApproved}
                </p>
                <div className="text-xs text-gray-500">
                  {trainingMetrics.totalRequests > 0
                    ? formatPercentage(
                        trainingMetrics.autoApproved /
                          trainingMetrics.totalRequests,
                      )
                    : "0%"}
                </div>
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
                  Manual Review
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {trainingMetrics.manualReview}
                </p>
                <div className="text-xs text-gray-500">
                  {trainingMetrics.totalRequests > 0
                    ? formatPercentage(
                        trainingMetrics.manualReview /
                          trainingMetrics.totalRequests,
                      )
                    : "0%"}
                </div>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg Risk Score
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPercentage(trainingMetrics.averageRiskScore)}
                </p>
                <div className="mt-1">
                  <Progress
                    value={trainingMetrics.averageRiskScore * 100}
                    className="h-1"
                  />
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Poisoning Attempts
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {trainingMetrics.poisoningAttempts}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Successful Trainings
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {trainingMetrics.successfulTrainings}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Model Versions
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {trainingMetrics.modelVersions}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Layers className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Last Training
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {trainingMetrics.lastTrainingTime
                    ? formatTimeAgo(trainingMetrics.lastTrainingTime)
                    : "Never"}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pending">
            Pending (
            {pendingValidations.filter((v) => v.status === "PENDING").length})
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Pending Validations Tab */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Pending Validations</span>
              </CardTitle>
              <CardDescription>
                Training requests awaiting manual review and approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingValidations.filter((v) => v.status === "PENDING")
                .length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No pending validations
                  </h3>
                  <p className="text-gray-600">
                    All training requests have been processed
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request ID</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Corrections</TableHead>
                        <TableHead>Risk Score</TableHead>
                        <TableHead>Approval Level</TableHead>
                        <TableHead>Violations</TableHead>
                        <TableHead>Request Time</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingValidations
                        .filter((v) => v.status === "PENDING")
                        .map((validation) => (
                          <TableRow key={validation.id}>
                            <TableCell className="font-medium">
                              {validation.id}
                            </TableCell>
                            <TableCell>{validation.requestedBy}</TableCell>
                            <TableCell>
                              {validation.overrideIds.length} corrections
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {getRiskBadge(validation.riskScore)}
                                <div className="text-xs text-gray-600">
                                  {formatPercentage(validation.riskScore)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getApprovalLevelBadge(validation.approvalLevel)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <span className="text-sm font-medium">
                                  {
                                    validation.validationResult.violations
                                      .length
                                  }
                                </span>
                                {validation.validationResult.violations.length >
                                  0 && (
                                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {formatDate(validation.requestTime)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setSelectedValidation(validation)
                                  }
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() =>
                                    handleApproveValidation(validation.id)
                                  }
                                  disabled={processing}
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() =>
                                    handleRejectValidation(validation.id)
                                  }
                                  disabled={processing}
                                >
                                  <ThumbsDown className="w-4 h-4" />
                                </Button>
                                {validation.riskScore >= 0.8 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-purple-600 hover:text-purple-700"
                                    onClick={() =>
                                      handleEscalateValidation(validation.id)
                                    }
                                    disabled={processing}
                                  >
                                    <TrendingUp className="w-4 h-4" />
                                  </Button>
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
        </TabsContent>

        {/* Security Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Security Alerts</span>
              </CardTitle>
              <CardDescription>
                Suspicious patterns and potential security threats
              </CardDescription>
            </CardHeader>
            <CardContent>
              {safetyAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No security alerts
                  </h3>
                  <p className="text-gray-600">
                    All systems operating normally
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {safetyAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border ${
                        alert.resolved
                          ? "bg-gray-50 border-gray-200"
                          : alert.severity === "CRITICAL"
                            ? "bg-red-50 border-red-200"
                            : alert.severity === "HIGH"
                              ? "bg-orange-50 border-orange-200"
                              : "bg-yellow-50 border-yellow-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          {getSeverityIcon(alert.severity)}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900">
                                {alert.type.replace("_", " ")}
                              </h4>
                              <Badge
                                className={`${
                                  alert.severity === "CRITICAL"
                                    ? "bg-red-100 text-red-800"
                                    : alert.severity === "HIGH"
                                      ? "bg-orange-100 text-orange-800"
                                      : alert.severity === "MEDIUM"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {alert.severity}
                              </Badge>
                              {alert.resolved && (
                                <Badge className="bg-green-100 text-green-800">
                                  Resolved
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-700 mt-1">
                              {alert.message}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                              <span>{formatTimeAgo(alert.timestamp)}</span>
                              <span>
                                {alert.affectedRequests.length} affected
                                requests
                              </span>
                            </div>
                          </div>
                        </div>
                        {!alert.resolved && (
                          <Button size="sm" variant="outline">
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other tabs with placeholder content */}
        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>Approved Validations</CardTitle>
              <CardDescription>
                Successfully approved training requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Approved validations will appear here
                </h3>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <CardTitle>Rejected Validations</CardTitle>
              <CardDescription>
                Training requests that were rejected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Rejected validations will appear here
                </h3>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Validation Analytics</CardTitle>
              <CardDescription>
                Insights and trends in validation patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Analytics dashboard coming soon
                </h3>
                <p className="text-gray-600">
                  Advanced analytics for training patterns, risk assessment, and
                  security metrics
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Validation Details Modal */}
      {selectedValidation && (
        <Dialog
          open={!!selectedValidation}
          onOpenChange={() => setSelectedValidation(null)}
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Validation Details: {selectedValidation.id}</span>
              </DialogTitle>
              <DialogDescription>
                Comprehensive validation results and risk assessment
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Risk Assessment */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatPercentage(
                          selectedValidation.validationResult.score,
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        Validation Score
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {formatPercentage(selectedValidation.riskScore)}
                      </div>
                      <div className="text-sm text-gray-600">Risk Score</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedValidation.overrideIds.length}
                      </div>
                      <div className="text-sm text-gray-600">Corrections</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Request Information */}
              <div className="space-y-3">
                <h4 className="font-medium">Request Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Requested By:</span>
                    <div className="mt-1 text-gray-600">
                      {selectedValidation.requestedBy}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Request Time:</span>
                    <div className="mt-1 text-gray-600">
                      {formatDate(selectedValidation.requestTime)}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Approval Level:</span>
                    <div className="mt-1">
                      {getApprovalLevelBadge(selectedValidation.approvalLevel)}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <div className="mt-1">
                      {getStatusBadge(selectedValidation.status)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Violations */}
              {selectedValidation.validationResult.violations.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Validation Violations</span>
                  </h4>
                  <div className="space-y-2">
                    {selectedValidation.validationResult.violations.map(
                      (violation, index) => (
                        <div
                          key={index}
                          className="p-3 bg-red-50 rounded-lg border border-red-200"
                        >
                          <div className="flex items-start space-x-2">
                            {getSeverityIcon(violation.severity)}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">
                                  {violation.ruleId
                                    .replace("_", " ")
                                    .toUpperCase()}
                                </span>
                                <Badge
                                  className={`${
                                    violation.severity === "CRITICAL"
                                      ? "bg-red-100 text-red-800"
                                      : violation.severity === "HIGH"
                                        ? "bg-orange-100 text-orange-800"
                                        : violation.severity === "MEDIUM"
                                          ? "bg-yellow-100 text-yellow-800"
                                          : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {violation.severity}
                                </Badge>
                              </div>
                              <p className="text-gray-700 mt-1">
                                {violation.message}
                              </p>
                              <div className="text-sm text-gray-600 mt-1">
                                Affected: {violation.affectedOverrides.length}{" "}
                                corrections
                              </div>
                              <div className="text-sm font-medium mt-1">
                                Suggested Action:{" "}
                                <span className="text-blue-600">
                                  {violation.suggestedAction}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {selectedValidation.validationResult.recommendations.length >
                0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Recommendations</h4>
                  <div className="space-y-2">
                    {selectedValidation.validationResult.recommendations.map(
                      (recommendation, index) => (
                        <div
                          key={index}
                          className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                        >
                          <div className="flex items-start space-x-2">
                            <Brain className="w-4 h-4 text-blue-600 mt-0.5" />
                            <p className="text-gray-700">{recommendation}</p>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Review Comments */}
              <div className="space-y-3">
                <h4 className="font-medium">Review Comments</h4>
                <Textarea
                  placeholder="Add your review comments here..."
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter className="space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedValidation(null);
                  setReviewComments("");
                }}
              >
                Cancel
              </Button>
              {selectedValidation.riskScore >= 0.8 && (
                <Button
                  onClick={() =>
                    handleEscalateValidation(selectedValidation.id)
                  }
                  disabled={processing}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {processing && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Escalate to Committee
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => handleRejectValidation(selectedValidation.id)}
                disabled={processing}
                className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
              >
                {processing && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Reject
              </Button>
              <Button
                onClick={() => handleApproveValidation(selectedValidation.id)}
                disabled={processing || !reviewComments.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {processing && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Approve Training
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default SafeTrainingDashboard;
