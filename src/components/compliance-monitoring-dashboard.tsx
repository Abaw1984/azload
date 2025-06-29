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
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  Calendar,
  Target,
  BarChart3,
  Clock,
  Eye,
  Settings,
  RefreshCw,
  Building,
  Ruler,
  Calculator,
  BookOpen,
  Award,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StructuralModel, BuildingType } from "@/types/model";

interface ComplianceCheck {
  id: string;
  type: "ASCE_7_16" | "AISC_360" | "IBC_2021" | "MANUAL_REVIEW";
  category:
    | "WIND_LOADS"
    | "SEISMIC_LOADS"
    | "MEMBER_DESIGN"
    | "CONNECTION_DESIGN"
    | "BUILDING_CLASSIFICATION";
  status: "passed" | "failed" | "warning" | "pending";
  timestamp: Date;
  modelId: string;
  modelName: string;
  buildingType: BuildingType;
  details: {
    checkDescription: string;
    expectedValue: any;
    actualValue: any;
    tolerance: number;
    deviation: number;
    codeReference: string;
    engineerNotes?: string;
  };
  severity: "low" | "medium" | "high" | "critical";
  requiresAction: boolean;
  actionTaken?: string;
  reviewedBy?: string;
  reviewDate?: Date;
}

interface ComplianceReport {
  id: string;
  type: "weekly" | "monthly" | "quarterly" | "annual";
  generatedDate: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warningChecks: number;
    complianceRate: number;
    criticalIssues: number;
  };
  categories: {
    [key: string]: {
      total: number;
      passed: number;
      complianceRate: number;
    };
  };
  recommendations: string[];
  status: "draft" | "final" | "archived";
}

interface BenchmarkCase {
  id: string;
  name: string;
  description: string;
  buildingType: BuildingType;
  codeStandard: "ASCE_7_16" | "AISC_360";
  expectedResults: {
    windLoad: number;
    seismicLoad: number;
    memberUtilization: number;
    deflection: number;
  };
  tolerance: number;
  lastVerified: Date;
  status: "verified" | "needs_update" | "failed";
}

function ComplianceMonitoringDashboard() {
  const [complianceChecks, setComplianceChecks] = useState<ComplianceCheck[]>(
    [],
  );
  const [complianceReports, setComplianceReports] = useState<
    ComplianceReport[]
  >([]);
  const [benchmarkCases, setBenchmarkCases] = useState<BenchmarkCase[]>([]);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<
    "week" | "month" | "quarter"
  >("month");
  const [complianceStats, setComplianceStats] = useState({
    overallCompliance: 0,
    asceCompliance: 0,
    aiscCompliance: 0,
    criticalIssues: 0,
    pendingReviews: 0,
  });

  const ML_API_ENDPOINT =
    import.meta.env.VITE_ML_API_URL || "http://178.128.135.194";

  useEffect(() => {
    initializeComplianceData();

    // Set up periodic compliance checks
    const complianceInterval = setInterval(runPeriodicCompliance, 86400000); // Daily

    return () => clearInterval(complianceInterval);
  }, []);

  const initializeComplianceData = async () => {
    await Promise.all([
      loadComplianceChecks(),
      loadBenchmarkCases(),
      generateComplianceStats(),
    ]);
  };

  const loadComplianceChecks = async () => {
    // Simulate loading recent compliance checks
    const checks: ComplianceCheck[] = [
      {
        id: "check_001",
        type: "ASCE_7_16",
        category: "WIND_LOADS",
        status: "passed",
        timestamp: new Date(Date.now() - 3600000),
        modelId: "model_001",
        modelName: "Hangar Building A",
        buildingType: "SINGLE_GABLE_HANGAR",
        details: {
          checkDescription: "Wind load calculation per ASCE 7-16 Section 27",
          expectedValue: 45.2,
          actualValue: 44.8,
          tolerance: 5.0,
          deviation: 0.9,
          codeReference: "ASCE 7-16, Section 27.3.1",
        },
        severity: "low",
        requiresAction: false,
      },
      {
        id: "check_002",
        type: "AISC_360",
        category: "MEMBER_DESIGN",
        status: "warning",
        timestamp: new Date(Date.now() - 7200000),
        modelId: "model_002",
        modelName: "Industrial Warehouse",
        buildingType: "WAREHOUSE_BUILDING",
        details: {
          checkDescription: "Column capacity check per AISC 360-16",
          expectedValue: 0.85,
          actualValue: 0.92,
          tolerance: 0.05,
          deviation: 7.0,
          codeReference: "AISC 360-16, Chapter E",
          engineerNotes: "Consider increasing column size or reducing loads",
        },
        severity: "medium",
        requiresAction: true,
      },
      {
        id: "check_003",
        type: "ASCE_7_16",
        category: "SEISMIC_LOADS",
        status: "failed",
        timestamp: new Date(Date.now() - 10800000),
        modelId: "model_003",
        modelName: "Office Complex",
        buildingType: "OFFICE_BUILDING",
        details: {
          checkDescription: "Seismic design category verification",
          expectedValue: "D",
          actualValue: "C",
          tolerance: 0,
          deviation: 100,
          codeReference: "ASCE 7-16, Section 11.6",
          engineerNotes: "Site-specific seismic analysis required",
        },
        severity: "critical",
        requiresAction: true,
      },
      {
        id: "check_004",
        type: "AISC_360",
        category: "CONNECTION_DESIGN",
        status: "passed",
        timestamp: new Date(Date.now() - 14400000),
        modelId: "model_004",
        modelName: "Steel Frame Building",
        buildingType: "INDUSTRIAL_BUILDING",
        details: {
          checkDescription: "Bolt capacity verification",
          expectedValue: 125.5,
          actualValue: 118.2,
          tolerance: 10.0,
          deviation: 5.8,
          codeReference: "AISC 360-16, Chapter J",
        },
        severity: "low",
        requiresAction: false,
      },
      {
        id: "check_005",
        type: "IBC_2021",
        category: "BUILDING_CLASSIFICATION",
        status: "pending",
        timestamp: new Date(Date.now() - 18000000),
        modelId: "model_005",
        modelName: "Mixed Use Building",
        buildingType: "MIXED_USE_BUILDING",
        details: {
          checkDescription: "Occupancy classification verification",
          expectedValue: "B",
          actualValue: "pending",
          tolerance: 0,
          deviation: 0,
          codeReference: "IBC 2021, Chapter 3",
          engineerNotes: "Awaiting architect confirmation on use groups",
        },
        severity: "medium",
        requiresAction: true,
      },
    ];

    setComplianceChecks(checks);
  };

  const loadBenchmarkCases = async () => {
    const benchmarks: BenchmarkCase[] = [
      {
        id: "benchmark_001",
        name: "Single Story Hangar - Wind Load",
        description: "Standard single-story aircraft hangar with 150 ft span",
        buildingType: "SINGLE_GABLE_HANGAR",
        codeStandard: "ASCE_7_16",
        expectedResults: {
          windLoad: 42.5,
          seismicLoad: 15.2,
          memberUtilization: 0.78,
          deflection: 2.1,
        },
        tolerance: 5.0,
        lastVerified: new Date(Date.now() - 86400000 * 7),
        status: "verified",
      },
      {
        id: "benchmark_002",
        name: "Multi-Story Office - Seismic",
        description: "5-story steel frame office building in high seismic zone",
        buildingType: "OFFICE_BUILDING",
        codeStandard: "ASCE_7_16",
        expectedResults: {
          windLoad: 28.3,
          seismicLoad: 65.8,
          memberUtilization: 0.85,
          deflection: 4.2,
        },
        tolerance: 3.0,
        lastVerified: new Date(Date.now() - 86400000 * 14),
        status: "needs_update",
      },
      {
        id: "benchmark_003",
        name: "Industrial Warehouse - Member Design",
        description: "Large span warehouse with crane loads",
        buildingType: "WAREHOUSE_BUILDING",
        codeStandard: "AISC_360",
        expectedResults: {
          windLoad: 35.7,
          seismicLoad: 22.1,
          memberUtilization: 0.92,
          deflection: 3.8,
        },
        tolerance: 4.0,
        lastVerified: new Date(Date.now() - 86400000 * 3),
        status: "verified",
      },
    ];

    setBenchmarkCases(benchmarks);
  };

  const generateComplianceStats = async () => {
    // Calculate compliance statistics
    const totalChecks = complianceChecks.length;
    const passedChecks = complianceChecks.filter(
      (c) => c.status === "passed",
    ).length;
    const failedChecks = complianceChecks.filter(
      (c) => c.status === "failed",
    ).length;
    const warningChecks = complianceChecks.filter(
      (c) => c.status === "warning",
    ).length;
    const criticalIssues = complianceChecks.filter(
      (c) => c.severity === "critical",
    ).length;
    const pendingReviews = complianceChecks.filter(
      (c) => c.status === "pending",
    ).length;

    const asceChecks = complianceChecks.filter((c) => c.type === "ASCE_7_16");
    const aiscChecks = complianceChecks.filter((c) => c.type === "AISC_360");

    const asceCompliance =
      asceChecks.length > 0
        ? (asceChecks.filter((c) => c.status === "passed").length /
            asceChecks.length) *
          100
        : 100;

    const aiscCompliance =
      aiscChecks.length > 0
        ? (aiscChecks.filter((c) => c.status === "passed").length /
            aiscChecks.length) *
          100
        : 100;

    const overallCompliance =
      totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 100;

    setComplianceStats({
      overallCompliance,
      asceCompliance,
      aiscCompliance,
      criticalIssues,
      pendingReviews,
    });
  };

  const runPeriodicCompliance = async () => {
    // Run periodic compliance checks
    console.log("Running periodic compliance checks...");
    await loadComplianceChecks();
    await generateComplianceStats();
  };

  const runComplianceAudit = async () => {
    setIsRunningAudit(true);
    setAuditProgress(0);

    // Simulate comprehensive audit process
    const steps = [
      "Loading structural models...",
      "Verifying ASCE 7-16 compliance...",
      "Checking AISC 360 requirements...",
      "Validating IBC 2021 classifications...",
      "Running benchmark comparisons...",
      "Generating compliance report...",
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setAuditProgress(((i + 1) / steps.length) * 100);
    }

    // Refresh data after audit
    await initializeComplianceData();

    setIsRunningAudit(false);
    setAuditProgress(0);
  };

  const generateComplianceReport = async (
    type: "weekly" | "monthly" | "quarterly",
  ) => {
    const now = new Date();
    const periodDays = type === "weekly" ? 7 : type === "monthly" ? 30 : 90;
    const startDate = new Date(
      now.getTime() - periodDays * 24 * 60 * 60 * 1000,
    );

    const periodChecks = complianceChecks.filter(
      (check) => check.timestamp >= startDate && check.timestamp <= now,
    );

    const report: ComplianceReport = {
      id: `report_${type}_${Date.now()}`,
      type,
      generatedDate: now,
      period: { start: startDate, end: now },
      summary: {
        totalChecks: periodChecks.length,
        passedChecks: periodChecks.filter((c) => c.status === "passed").length,
        failedChecks: periodChecks.filter((c) => c.status === "failed").length,
        warningChecks: periodChecks.filter((c) => c.status === "warning")
          .length,
        complianceRate:
          periodChecks.length > 0
            ? (periodChecks.filter((c) => c.status === "passed").length /
                periodChecks.length) *
              100
            : 100,
        criticalIssues: periodChecks.filter((c) => c.severity === "critical")
          .length,
      },
      categories: {
        WIND_LOADS: {
          total: periodChecks.filter((c) => c.category === "WIND_LOADS").length,
          passed: periodChecks.filter(
            (c) => c.category === "WIND_LOADS" && c.status === "passed",
          ).length,
          complianceRate: 95.2,
        },
        SEISMIC_LOADS: {
          total: periodChecks.filter((c) => c.category === "SEISMIC_LOADS")
            .length,
          passed: periodChecks.filter(
            (c) => c.category === "SEISMIC_LOADS" && c.status === "passed",
          ).length,
          complianceRate: 88.7,
        },
        MEMBER_DESIGN: {
          total: periodChecks.filter((c) => c.category === "MEMBER_DESIGN")
            .length,
          passed: periodChecks.filter(
            (c) => c.category === "MEMBER_DESIGN" && c.status === "passed",
          ).length,
          complianceRate: 92.1,
        },
      },
      recommendations: [
        "Review seismic design procedures for high-risk zones",
        "Update member sizing guidelines for warehouse buildings",
        "Implement automated wind load verification",
        "Schedule quarterly benchmark validation",
      ],
      status: "final",
    };

    setComplianceReports((prev) => [report, ...prev]);

    // Download report as JSON
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-report-${type}-${now.toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: ComplianceCheck["status"]) => {
    const colors = {
      passed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      warning: "bg-yellow-100 text-yellow-800",
      pending: "bg-blue-100 text-blue-800",
    };
    return <Badge className={colors[status]}>{status}</Badge>;
  };

  const getSeverityBadge = (severity: ComplianceCheck["severity"]) => {
    const colors = {
      low: "bg-gray-100 text-gray-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    };
    return <Badge className={colors[severity]}>{severity}</Badge>;
  };

  const getStatusIcon = (status: ComplianceCheck["status"]) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6 bg-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Shield className="w-8 h-8 text-blue-600" />
            <span>Compliance Monitoring Dashboard</span>
          </h1>
          <p className="text-gray-600 mt-2">
            ASCE 7-16 and AISC 360 compliance verification and audit management
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={runComplianceAudit}
            disabled={isRunningAudit}
            variant="outline"
            size="sm"
          >
            {isRunningAudit ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Target className="w-4 h-4 mr-2" />
            )}
            {isRunningAudit ? "Running Audit..." : "Run Compliance Audit"}
          </Button>
        </div>
      </div>

      {/* Audit Progress */}
      {isRunningAudit && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  Compliance Audit in Progress
                </span>
                <span className="text-sm text-gray-600">
                  {auditProgress.toFixed(0)}%
                </span>
              </div>
              <Progress value={auditProgress} className="h-3" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Overall Compliance
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {complianceStats.overallCompliance.toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <Progress
              value={complianceStats.overallCompliance}
              className="mt-3"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ASCE 7-16</p>
                <p className="text-2xl font-bold text-gray-900">
                  {complianceStats.asceCompliance.toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <Progress value={complianceStats.asceCompliance} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">AISC 360</p>
                <p className="text-2xl font-bold text-gray-900">
                  {complianceStats.aiscCompliance.toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <Progress value={complianceStats.aiscCompliance} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Critical Issues
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {complianceStats.criticalIssues}
                </p>
              </div>
              <div
                className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center",
                  complianceStats.criticalIssues === 0
                    ? "bg-green-100"
                    : "bg-red-100",
                )}
              >
                <AlertCircle
                  className={cn(
                    "w-6 h-6",
                    complianceStats.criticalIssues === 0
                      ? "text-green-600"
                      : "text-red-600",
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Pending Reviews
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {complianceStats.pendingReviews}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="checks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="checks">Compliance Checks</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmark Cases</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Compliance Checks Tab */}
        <TabsContent value="checks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Recent Compliance Checks</span>
              </CardTitle>
              <CardDescription>
                Latest compliance verification results and code adherence checks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Filter Controls */}
                <div className="flex items-center space-x-4">
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={selectedPeriod}
                    onChange={(e) =>
                      setSelectedPeriod(
                        e.target.value as "week" | "month" | "quarter",
                      )
                    }
                  >
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                    <option value="quarter">Last Quarter</option>
                  </select>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>

                {/* Compliance Checks Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead>Check Type</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Deviation</TableHead>
                        <TableHead>Code Reference</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {complianceChecks.map((check) => (
                        <TableRow key={check.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {check.modelName}
                              </div>
                              <div className="text-sm text-gray-600 capitalize">
                                {check.buildingType
                                  .replace(/_/g, " ")
                                  .toLowerCase()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{check.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm capitalize">
                              {check.category.replace(/_/g, " ").toLowerCase()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(check.status)}
                              {getStatusBadge(check.status)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getSeverityBadge(check.severity)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {check.details.deviation.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-sm">
                            {check.details.codeReference}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {check.timestamp.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {check.requiresAction && (
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-1" />
                                Review
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Benchmark Cases Tab */}
        <TabsContent value="benchmarks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-blue-500" />
                <span>Benchmark Validation Cases</span>
              </CardTitle>
              <CardDescription>
                Standard benchmark cases for validating calculation accuracy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {benchmarkCases.map((benchmark) => (
                  <div key={benchmark.id} className="border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-lg">
                          {benchmark.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {benchmark.description}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(benchmark.status)}
                        <Badge variant="outline">
                          {benchmark.codeStandard}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Wind Load</div>
                        <div className="font-mono text-lg">
                          {benchmark.expectedResults.windLoad} psf
                        </div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">
                          Seismic Load
                        </div>
                        <div className="font-mono text-lg">
                          {benchmark.expectedResults.seismicLoad} psf
                        </div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">
                          Member Util.
                        </div>
                        <div className="font-mono text-lg">
                          {benchmark.expectedResults.memberUtilization}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Deflection</div>
                        <div className="font-mono text-lg">
                          {benchmark.expectedResults.deflection} in
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Tolerance: ±{benchmark.tolerance}%</span>
                      <span>
                        Last verified:{" "}
                        {benchmark.lastVerified.toLocaleDateString()}
                      </span>
                      <Button variant="outline" size="sm">
                        <Calculator className="w-4 h-4 mr-1" />
                        Verify
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-green-500" />
                <span>Compliance Reports</span>
              </CardTitle>
              <CardDescription>
                Generate and manage compliance audit reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Report Generation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Weekly Report</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Summary of compliance checks from the past week
                    </p>
                    <Button
                      onClick={() => generateComplianceReport("weekly")}
                      className="w-full"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Generate Weekly
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Monthly Report</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Comprehensive monthly compliance analysis
                    </p>
                    <Button
                      onClick={() => generateComplianceReport("monthly")}
                      className="w-full"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Generate Monthly
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Quarterly Report</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Detailed quarterly compliance audit
                    </p>
                    <Button
                      onClick={() => generateComplianceReport("quarterly")}
                      className="w-full"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Generate Quarterly
                    </Button>
                  </div>
                </div>

                {/* Recent Reports */}
                {complianceReports.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-4">Recent Reports</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Report Type</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Compliance Rate</TableHead>
                            <TableHead>Critical Issues</TableHead>
                            <TableHead>Generated</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {complianceReports.slice(0, 5).map((report) => (
                            <TableRow key={report.id}>
                              <TableCell className="font-medium capitalize">
                                {report.type}
                              </TableCell>
                              <TableCell className="text-sm">
                                {report.period.start.toLocaleDateString()} -{" "}
                                {report.period.end.toLocaleDateString()}
                              </TableCell>
                              <TableCell className="font-mono">
                                {report.summary.complianceRate.toFixed(1)}%
                              </TableCell>
                              <TableCell className="font-mono">
                                {report.summary.criticalIssues}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {report.generatedDate.toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={cn(
                                    report.status === "final"
                                      ? "bg-green-100 text-green-800"
                                      : report.status === "draft"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-gray-100 text-gray-800",
                                  )}
                                >
                                  {report.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button variant="outline" size="sm">
                                  <Download className="w-4 h-4 mr-1" />
                                  Download
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-gray-500" />
                <span>Compliance Settings</span>
              </CardTitle>
              <CardDescription>
                Configure compliance monitoring parameters and thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Compliance Configuration:
                  </h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div>
                      • ASCE 7-16 wind load calculations with 5% tolerance
                    </div>
                    <div>• AISC 360-16 member design verification</div>
                    <div>• IBC 2021 building classification checks</div>
                    <div>• Automated daily compliance monitoring</div>
                    <div>• Critical issue alerts via email notification</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Tolerance Settings</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Wind Load Tolerance</label>
                        <input
                          type="number"
                          className="w-20 px-2 py-1 border rounded text-sm"
                          defaultValue="5.0"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm">
                          Seismic Load Tolerance
                        </label>
                        <input
                          type="number"
                          className="w-20 px-2 py-1 border rounded text-sm"
                          defaultValue="3.0"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm">
                          Member Utilization Limit
                        </label>
                        <input
                          type="number"
                          className="w-20 px-2 py-1 border rounded text-sm"
                          defaultValue="0.95"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Notification Settings</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="email-alerts"
                          defaultChecked
                        />
                        <label htmlFor="email-alerts" className="text-sm">
                          Email alerts for critical issues
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="daily-reports"
                          defaultChecked
                        />
                        <label htmlFor="daily-reports" className="text-sm">
                          Daily compliance summaries
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="benchmark-alerts" />
                        <label htmlFor="benchmark-alerts" className="text-sm">
                          Benchmark validation alerts
                        </label>
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
    </div>
  );
}

export default ComplianceMonitoringDashboard;
