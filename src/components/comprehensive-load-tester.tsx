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
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Database,
  Download,
  FileText,
  Gauge,
  Play,
  RefreshCw,
  Server,
  Target,
  Timer,
  TrendingUp,
  Users,
  Zap,
  XCircle,
  Brain,
  Globe,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StructuralModel } from "@/types/model";

interface LoadTestScenario {
  id: string;
  name: string;
  description: string;
  type: "backend" | "ml_api" | "integrated";
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  payload?: any;
  concurrentUsers: number;
  duration: number; // seconds
  rampUpTime: number; // seconds
  expectedResponseTime: number; // ms
  successCriteria: {
    maxResponseTime: number;
    minSuccessRate: number;
    maxErrorRate: number;
  };
}

interface LoadTestResult {
  scenarioId: string;
  timestamp: Date;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  errors: { [errorType: string]: number };
  memoryUsage?: {
    peak: number;
    average: number;
  };
  cpuUsage?: {
    peak: number;
    average: number;
  };
  status: "passed" | "failed" | "warning";
  bottlenecks: string[];
  recommendations: string[];
}

interface PerformanceMetrics {
  timestamp: Date;
  responseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  activeConnections: number;
}

function ComprehensiveLoadTester() {
  const [testScenarios, setTestScenarios] = useState<LoadTestScenario[]>([]);
  const [testResults, setTestResults] = useState<LoadTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [realTimeMetrics, setRealTimeMetrics] = useState<PerformanceMetrics[]>(
    [],
  );
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(
    new Set(),
  );
  const [testReport, setTestReport] = useState<any>(null);

  const ML_API_ENDPOINT =
    import.meta.env.VITE_ML_API_URL || "http://178.128.135.194";
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    initializeTestScenarios();
  }, []);

  const initializeTestScenarios = () => {
    const scenarios: LoadTestScenario[] = [
      // Backend Load Tests
      {
        id: "supabase-auth-load",
        name: "Supabase Authentication Load Test",
        description: "Test authentication endpoint under high concurrent load",
        type: "backend",
        endpoint: `${SUPABASE_URL}/auth/v1/token`,
        method: "POST",
        payload: {
          grant_type: "password",
          email: "test@example.com",
          password: "testpass",
        },
        concurrentUsers: 50,
        duration: 60,
        rampUpTime: 10,
        expectedResponseTime: 200,
        successCriteria: {
          maxResponseTime: 500,
          minSuccessRate: 95,
          maxErrorRate: 5,
        },
      },
      {
        id: "supabase-data-read",
        name: "Supabase Data Read Load Test",
        description: "Test database read operations under concurrent load",
        type: "backend",
        endpoint: `${SUPABASE_URL}/rest/v1/models`,
        method: "GET",
        concurrentUsers: 100,
        duration: 120,
        rampUpTime: 15,
        expectedResponseTime: 150,
        successCriteria: {
          maxResponseTime: 300,
          minSuccessRate: 98,
          maxErrorRate: 2,
        },
      },
      {
        id: "supabase-data-write",
        name: "Supabase Data Write Load Test",
        description: "Test database write operations under concurrent load",
        type: "backend",
        endpoint: `${SUPABASE_URL}/rest/v1/models`,
        method: "POST",
        payload: { name: "Test Model", type: "STAAD", data: {} },
        concurrentUsers: 25,
        duration: 90,
        rampUpTime: 10,
        expectedResponseTime: 300,
        successCriteria: {
          maxResponseTime: 600,
          minSuccessRate: 95,
          maxErrorRate: 5,
        },
      },
      // ML API Load Tests
      {
        id: "ml-health-check",
        name: "ML API Health Check Load Test",
        description: "Test ML API health endpoint responsiveness",
        type: "ml_api",
        endpoint: `${ML_API_ENDPOINT}/health`,
        method: "GET",
        concurrentUsers: 200,
        duration: 60,
        rampUpTime: 5,
        expectedResponseTime: 100,
        successCriteria: {
          maxResponseTime: 200,
          minSuccessRate: 99,
          maxErrorRate: 1,
        },
      },
      {
        id: "ml-building-classification",
        name: "Building Classification Load Test",
        description:
          "Test building type classification under concurrent requests",
        type: "ml_api",
        endpoint: `${ML_API_ENDPOINT}/classify-building`,
        method: "POST",
        payload: { model: createSampleModel() },
        concurrentUsers: 50,
        duration: 180,
        rampUpTime: 20,
        expectedResponseTime: 2000,
        successCriteria: {
          maxResponseTime: 5000,
          minSuccessRate: 90,
          maxErrorRate: 10,
        },
      },
      {
        id: "ml-member-classification",
        name: "Member Classification Load Test",
        description: "Test member tagging under concurrent analysis requests",
        type: "ml_api",
        endpoint: `${ML_API_ENDPOINT}/classify-members`,
        method: "POST",
        payload: { model: createSampleModel() },
        concurrentUsers: 50,
        duration: 180,
        rampUpTime: 20,
        expectedResponseTime: 3000,
        successCriteria: {
          maxResponseTime: 8000,
          minSuccessRate: 85,
          maxErrorRate: 15,
        },
      },
      {
        id: "ml-manual-override",
        name: "Manual Override Load Test",
        description: "Test manual tag override endpoint performance",
        type: "ml_api",
        endpoint: `${ML_API_ENDPOINT}/manual-override`,
        method: "POST",
        payload: {
          memberId: "test-member-1",
          originalTag: "BEAM",
          newTag: "COLUMN",
          confidence: 0.95,
        },
        concurrentUsers: 30,
        duration: 120,
        rampUpTime: 10,
        expectedResponseTime: 500,
        successCriteria: {
          maxResponseTime: 1000,
          minSuccessRate: 95,
          maxErrorRate: 5,
        },
      },
      // Integrated Workflow Tests
      {
        id: "integrated-model-upload",
        name: "Complete Model Upload Workflow",
        description:
          "Test full model upload, parsing, and classification workflow",
        type: "integrated",
        endpoint: "workflow",
        method: "POST",
        concurrentUsers: 10,
        duration: 300,
        rampUpTime: 30,
        expectedResponseTime: 10000,
        successCriteria: {
          maxResponseTime: 20000,
          minSuccessRate: 80,
          maxErrorRate: 20,
        },
      },
    ];

    setTestScenarios(scenarios);
    // Select all scenarios by default
    setSelectedScenarios(new Set(scenarios.map((s) => s.id)));
  };

  const createSampleModel = (): StructuralModel => {
    return {
      id: "load-test-model-" + Date.now(),
      name: "Load Test Model",
      type: "STAAD",
      units: {
        length: "M",
        force: "KN",
        mass: "KG",
        temperature: "C",
      },
      unitsSystem: "METRIC",
      nodes: [
        { id: "1", x: 0, y: 0, z: 0 },
        { id: "2", x: 30, y: 0, z: 0 },
        { id: "3", x: 30, y: 0, z: 6 },
        { id: "4", x: 0, y: 0, z: 6 },
      ],
      members: [
        {
          id: "1",
          startNodeId: "1",
          endNodeId: "2",
          sectionId: "W12X26",
          materialId: "STEEL",
          type: "BEAM",
        },
        {
          id: "2",
          startNodeId: "2",
          endNodeId: "3",
          sectionId: "W12X26",
          materialId: "STEEL",
          type: "COLUMN",
        },
      ],
      plates: [],
      sections: [
        {
          id: "W12X26",
          name: "W12X26",
          type: "I",
          properties: {
            area: 0.00484,
            ix: 0.000204,
            iy: 0.0000347,
            iz: 0.000204,
          },
        },
      ],
      materials: [
        {
          id: "STEEL",
          name: "Steel A992",
          type: "STEEL",
          properties: {
            density: 7850,
            elasticModulus: 200000000000,
            poissonRatio: 0.3,
            yieldStrength: 345000000,
            ultimateStrength: 450000000,
          },
        },
      ],
      loadCases: [],
      parsingAccuracy: {
        dimensionalAccuracy: 1.0,
        sectionAccuracy: 1.0,
        unitsVerified: true,
        originalFileHash: "load-test-hash",
        parsingTimestamp: new Date(),
        parserVersion: "1.0.0",
      },
    };
  };

  const runLoadTest = async (
    scenario: LoadTestScenario,
  ): Promise<LoadTestResult> => {
    console.log(`🚀 Starting load test: ${scenario.name}`);

    const startTime = Date.now();
    const results: {
      responseTime: number;
      success: boolean;
      error?: string;
    }[] = [];
    const errors: { [errorType: string]: number } = {};

    // Simulate ramp-up
    const rampUpInterval =
      (scenario.rampUpTime * 1000) / scenario.concurrentUsers;
    const testDuration = scenario.duration * 1000;

    const promises: Promise<void>[] = [];

    for (let i = 0; i < scenario.concurrentUsers; i++) {
      const delay = i * rampUpInterval;

      promises.push(
        new Promise(async (resolve) => {
          await new Promise((r) => setTimeout(r, delay));

          const userStartTime = Date.now();
          const userEndTime = userStartTime + testDuration - delay;

          while (Date.now() < userEndTime) {
            const requestStart = Date.now();

            try {
              let response: Response;

              if (scenario.type === "integrated") {
                // Simulate integrated workflow
                response = await simulateIntegratedWorkflow();
              } else {
                response = await fetch(scenario.endpoint, {
                  method: scenario.method,
                  headers: {
                    "Content-Type": "application/json",
                    ...(scenario.type === "backend" && SUPABASE_URL
                      ? {
                          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                        }
                      : {}),
                  },
                  body: scenario.payload
                    ? JSON.stringify(scenario.payload)
                    : undefined,
                });
              }

              const responseTime = Date.now() - requestStart;
              results.push({ responseTime, success: response.ok });

              if (!response.ok) {
                const errorType = `HTTP_${response.status}`;
                errors[errorType] = (errors[errorType] || 0) + 1;
              }
            } catch (error) {
              const responseTime = Date.now() - requestStart;
              const errorType =
                error instanceof Error ? error.name : "UNKNOWN_ERROR";
              errors[errorType] = (errors[errorType] || 0) + 1;
              results.push({ responseTime, success: false, error: errorType });
            }

            // Wait before next request (simulate realistic user behavior)
            await new Promise((r) => setTimeout(r, Math.random() * 1000 + 500));
          }

          resolve();
        }),
      );
    }

    await Promise.all(promises);

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Calculate metrics
    const successfulRequests = results.filter((r) => r.success).length;
    const failedRequests = results.length - successfulRequests;
    const responseTimes = results
      .map((r) => r.responseTime)
      .sort((a, b) => a - b);

    const averageResponseTime =
      responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    const errorRate = (failedRequests / results.length) * 100;
    const requestsPerSecond = results.length / (totalDuration / 1000);

    // Determine status and generate recommendations
    const { status, bottlenecks, recommendations } = analyzeResults(scenario, {
      averageResponseTime,
      errorRate,
      p95ResponseTime: responseTimes[p95Index] || 0,
      requestsPerSecond,
    });

    return {
      scenarioId: scenario.id,
      timestamp: new Date(),
      duration: totalDuration,
      totalRequests: results.length,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p95ResponseTime: responseTimes[p95Index] || 0,
      p99ResponseTime: responseTimes[p99Index] || 0,
      requestsPerSecond,
      errorRate,
      errors,
      status,
      bottlenecks,
      recommendations,
    };
  };

  const simulateIntegratedWorkflow = async (): Promise<Response> => {
    // Simulate complete workflow: upload -> parse -> classify -> tag
    const steps = [
      { endpoint: `${ML_API_ENDPOINT}/health`, delay: 100 },
      { endpoint: `${ML_API_ENDPOINT}/classify-building`, delay: 2000 },
      { endpoint: `${ML_API_ENDPOINT}/classify-members`, delay: 3000 },
      { endpoint: `${ML_API_ENDPOINT}/manual-override`, delay: 500 },
    ];

    for (const step of steps) {
      await new Promise((resolve) => setTimeout(resolve, step.delay));
      const response = await fetch(step.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      });

      if (!response.ok) {
        return response;
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };

  const analyzeResults = (scenario: LoadTestScenario, metrics: any) => {
    const bottlenecks: string[] = [];
    const recommendations: string[] = [];
    let status: "passed" | "failed" | "warning" = "passed";

    // Check response time
    if (
      metrics.averageResponseTime > scenario.successCriteria.maxResponseTime
    ) {
      bottlenecks.push("High average response time");
      recommendations.push(
        "Consider optimizing database queries or adding caching",
      );
      status = "failed";
    } else if (metrics.averageResponseTime > scenario.expectedResponseTime) {
      bottlenecks.push("Response time above expected threshold");
      status = "warning";
    }

    // Check error rate
    if (metrics.errorRate > scenario.successCriteria.maxErrorRate) {
      bottlenecks.push("High error rate");
      recommendations.push("Investigate error logs and improve error handling");
      status = "failed";
    }

    // Check P95 response time
    if (
      metrics.p95ResponseTime >
      scenario.successCriteria.maxResponseTime * 2
    ) {
      bottlenecks.push(
        "High P95 response time indicates performance inconsistency",
      );
      recommendations.push(
        "Implement connection pooling and optimize slow queries",
      );
      if (status !== "failed") status = "warning";
    }

    // Check requests per second
    if (metrics.requestsPerSecond < scenario.concurrentUsers * 0.5) {
      bottlenecks.push("Low throughput");
      recommendations.push(
        "Consider scaling infrastructure or optimizing application performance",
      );
      if (status !== "failed") status = "warning";
    }

    return { status, bottlenecks, recommendations };
  };

  const runSelectedTests = async () => {
    if (selectedScenarios.size === 0) return;

    setIsRunning(true);
    setProgress(0);
    setTestResults([]);
    setRealTimeMetrics([]);

    const scenariosToRun = testScenarios.filter((s) =>
      selectedScenarios.has(s.id),
    );
    const results: LoadTestResult[] = [];

    for (let i = 0; i < scenariosToRun.length; i++) {
      const scenario = scenariosToRun[i];
      setCurrentScenario(scenario.name);

      try {
        const result = await runLoadTest(scenario);
        results.push(result);
        setTestResults((prev) => [...prev, result]);
      } catch (error) {
        console.error(`Failed to run test ${scenario.name}:`, error);
      }

      setProgress(((i + 1) / scenariosToRun.length) * 100);
    }

    // Generate comprehensive report
    generateTestReport(results);

    setIsRunning(false);
    setCurrentScenario(null);
    setProgress(0);
  };

  const generateTestReport = (results: LoadTestResult[]) => {
    const report = {
      timestamp: new Date(),
      summary: {
        totalTests: results.length,
        passedTests: results.filter((r) => r.status === "passed").length,
        failedTests: results.filter((r) => r.status === "failed").length,
        warningTests: results.filter((r) => r.status === "warning").length,
        overallStatus: results.every((r) => r.status === "passed")
          ? "PASSED"
          : results.some((r) => r.status === "failed")
            ? "FAILED"
            : "WARNING",
      },
      performance: {
        averageResponseTime:
          results.reduce((sum, r) => sum + r.averageResponseTime, 0) /
          results.length,
        totalRequests: results.reduce((sum, r) => sum + r.totalRequests, 0),
        totalErrors: results.reduce((sum, r) => sum + r.failedRequests, 0),
        averageErrorRate:
          results.reduce((sum, r) => sum + r.errorRate, 0) / results.length,
      },
      bottlenecks: [...new Set(results.flatMap((r) => r.bottlenecks))],
      recommendations: [...new Set(results.flatMap((r) => r.recommendations))],
      results,
    };

    setTestReport(report);
  };

  const downloadReport = () => {
    if (!testReport) return;

    const blob = new Blob([JSON.stringify(testReport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `load-test-report-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      passed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      warning: "bg-yellow-100 text-yellow-800",
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6 bg-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Gauge className="w-8 h-8 text-blue-600" />
            <span>Comprehensive Load Testing Suite</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Backend and ML API performance validation under realistic traffic
            conditions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {testReport && (
            <Button onClick={downloadReport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          )}
          <Button
            onClick={runSelectedTests}
            disabled={isRunning || selectedScenarios.size === 0}
            size="sm"
          >
            {isRunning ? (
              <Timer className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {isRunning ? "Running Tests..." : "Run Load Tests"}
          </Button>
        </div>
      </div>

      {/* Test Progress */}
      {isRunning && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  Running: {currentScenario || "Initializing..."}
                </span>
                <span className="text-sm text-gray-600">
                  {progress.toFixed(0)}%
                </span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Report Summary */}
      {testReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-green-500" />
              <span>Load Test Report Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">
                  {testReport.summary.totalTests}
                </div>
                <div className="text-sm text-blue-600">Total Tests</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">
                  {testReport.summary.passedTests}
                </div>
                <div className="text-sm text-green-600">Passed</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-700">
                  {testReport.summary.warningTests}
                </div>
                <div className="text-sm text-yellow-600">Warnings</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-700">
                  {testReport.summary.failedTests}
                </div>
                <div className="text-sm text-red-600">Failed</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Performance Metrics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Average Response Time:</span>
                    <span className="font-mono">
                      {testReport.performance.averageResponseTime.toFixed(0)}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Requests:</span>
                    <span className="font-mono">
                      {testReport.performance.totalRequests.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Errors:</span>
                    <span className="font-mono">
                      {testReport.performance.totalErrors}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Error Rate:</span>
                    <span className="font-mono">
                      {testReport.performance.averageErrorRate.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Key Findings</h4>
                <div className="space-y-2">
                  {testReport.bottlenecks.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-red-700">
                        Bottlenecks:
                      </div>
                      <ul className="text-xs text-red-600 ml-4">
                        {testReport.bottlenecks
                          .slice(0, 3)
                          .map((bottleneck: string, index: number) => (
                            <li key={index}>• {bottleneck}</li>
                          ))}
                      </ul>
                    </div>
                  )}
                  {testReport.recommendations.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-blue-700">
                        Recommendations:
                      </div>
                      <ul className="text-xs text-blue-600 ml-4">
                        {testReport.recommendations
                          .slice(0, 3)
                          .map((rec: string, index: number) => (
                            <li key={index}>• {rec}</li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="scenarios" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="analysis">Analysis & Reports</TabsTrigger>
        </TabsList>

        {/* Test Scenarios Tab */}
        <TabsContent value="scenarios">
          <Card>
            <CardHeader>
              <CardTitle>Load Test Scenarios</CardTitle>
              <CardDescription>
                Select and configure load test scenarios for backend and ML API
                validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedScenarios(
                        new Set(testScenarios.map((s) => s.id)),
                      )
                    }
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedScenarios(new Set())}
                  >
                    Clear All
                  </Button>
                  <span className="text-sm text-gray-600">
                    {selectedScenarios.size} of {testScenarios.length} scenarios
                    selected
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Select</TableHead>
                        <TableHead>Scenario</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Expected RT</TableHead>
                        <TableHead>Success Criteria</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testScenarios.map((scenario) => (
                        <TableRow key={scenario.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedScenarios.has(scenario.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedScenarios);
                                if (e.target.checked) {
                                  newSelected.add(scenario.id);
                                } else {
                                  newSelected.delete(scenario.id);
                                }
                                setSelectedScenarios(newSelected);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{scenario.name}</div>
                              <div className="text-sm text-gray-600">
                                {scenario.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {scenario.type.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {scenario.concurrentUsers}
                          </TableCell>
                          <TableCell className="font-mono">
                            {scenario.duration}s
                          </TableCell>
                          <TableCell className="font-mono">
                            {scenario.expectedResponseTime}ms
                          </TableCell>
                          <TableCell className="text-xs">
                            <div>
                              RT: ≤{scenario.successCriteria.maxResponseTime}ms
                            </div>
                            <div>
                              Success: ≥
                              {scenario.successCriteria.minSuccessRate}%
                            </div>
                            <div>
                              Error: ≤{scenario.successCriteria.maxErrorRate}%
                            </div>
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

        {/* Test Results Tab */}
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Load Test Results</CardTitle>
              <CardDescription>
                Detailed results from completed load test executions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No test results yet
                  </h3>
                  <p className="text-gray-600">
                    Run some load test scenarios to see detailed results
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Scenario</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requests</TableHead>
                        <TableHead>Success Rate</TableHead>
                        <TableHead>Avg Response</TableHead>
                        <TableHead>P95 Response</TableHead>
                        <TableHead>RPS</TableHead>
                        <TableHead>Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testResults.map((result, index) => {
                        const scenario = testScenarios.find(
                          (s) => s.id === result.scenarioId,
                        );
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {scenario?.name || result.scenarioId}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(result.status)}
                                {getStatusBadge(result.status)}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">
                              {result.totalRequests.toLocaleString()}
                              <div className="text-xs text-gray-500">
                                {result.failedRequests} failed
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">
                              {(
                                (result.successfulRequests /
                                  result.totalRequests) *
                                100
                              ).toFixed(1)}
                              %
                            </TableCell>
                            <TableCell className="font-mono">
                              {result.averageResponseTime.toFixed(0)}ms
                            </TableCell>
                            <TableCell className="font-mono">
                              {result.p95ResponseTime.toFixed(0)}ms
                            </TableCell>
                            <TableCell className="font-mono">
                              {result.requestsPerSecond.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {result.timestamp.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Metrics Tab */}
        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics Dashboard</CardTitle>
              <CardDescription>
                Real-time performance monitoring and historical trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Timer className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">Response Time</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {testResults.length > 0
                      ? `${(testResults.reduce((sum, r) => sum + r.averageResponseTime, 0) / testResults.length).toFixed(0)}ms`
                      : "--"}
                  </div>
                  <div className="text-xs text-gray-500">
                    Average across all tests
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">Throughput</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {testResults.length > 0
                      ? `${(testResults.reduce((sum, r) => sum + r.requestsPerSecond, 0) / testResults.length).toFixed(1)}`
                      : "--"}
                  </div>
                  <div className="text-xs text-gray-500">
                    Requests per second
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">Success Rate</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {testResults.length > 0
                      ? `${(testResults.reduce((sum, r) => sum + (r.successfulRequests / r.totalRequests) * 100, 0) / testResults.length).toFixed(1)}%`
                      : "--"}
                  </div>
                  <div className="text-xs text-gray-500">
                    Average success rate
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium">Error Rate</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {testResults.length > 0
                      ? `${(testResults.reduce((sum, r) => sum + r.errorRate, 0) / testResults.length).toFixed(2)}%`
                      : "--"}
                  </div>
                  <div className="text-xs text-gray-500">
                    Average error rate
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis & Reports Tab */}
        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analysis & Recommendations</CardTitle>
              <CardDescription>
                Detailed analysis of load test results with optimization
                recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No analysis available
                  </h3>
                  <p className="text-gray-600">
                    Run load tests to generate performance analysis and
                    recommendations
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Performance Targets Validation */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-3">
                      🎯 Performance Targets Validation
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-blue-800">
                          Response Time Target: ≤500ms
                        </div>
                        <div className="text-blue-700">
                          Current Average:{" "}
                          {testResults.length > 0
                            ? `${(testResults.reduce((sum, r) => sum + r.averageResponseTime, 0) / testResults.length).toFixed(0)}ms`
                            : "--"}
                          {testResults.length > 0 &&
                          testResults.reduce(
                            (sum, r) => sum + r.averageResponseTime,
                            0,
                          ) /
                            testResults.length <=
                            500
                            ? " ✅"
                            : " ❌"}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-blue-800">
                          Concurrent Users Target: 50+
                        </div>
                        <div className="text-blue-700">
                          Max Tested:{" "}
                          {Math.max(
                            ...testScenarios.map((s) => s.concurrentUsers),
                          )}{" "}
                          users ✅
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottlenecks Analysis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">
                        🚨 Identified Bottlenecks
                      </h4>
                      <div className="space-y-2">
                        {[...new Set(testResults.flatMap((r) => r.bottlenecks))]
                          .length === 0 ? (
                          <div className="text-green-600 text-sm">
                            ✅ No major bottlenecks identified
                          </div>
                        ) : (
                          [
                            ...new Set(
                              testResults.flatMap((r) => r.bottlenecks),
                            ),
                          ].map((bottleneck, index) => (
                            <div
                              key={index}
                              className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700"
                            >
                              • {bottleneck}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">
                        💡 Optimization Recommendations
                      </h4>
                      <div className="space-y-2">
                        {[
                          ...new Set(
                            testResults.flatMap((r) => r.recommendations),
                          ),
                        ].length === 0 ? (
                          <div className="text-green-600 text-sm">
                            ✅ System performing within acceptable parameters
                          </div>
                        ) : (
                          [
                            ...new Set(
                              testResults.flatMap((r) => r.recommendations),
                            ),
                          ].map((rec, index) => (
                            <div
                              key={index}
                              className="p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700"
                            >
                              • {rec}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Test Summary by Type */}
                  <div>
                    <h4 className="font-medium mb-3">
                      📊 Results by Test Type
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {["backend", "ml_api", "integrated"].map((type) => {
                        const typeResults = testResults.filter((r) => {
                          const scenario = testScenarios.find(
                            (s) => s.id === r.scenarioId,
                          );
                          return scenario?.type === type;
                        });

                        if (typeResults.length === 0) return null;

                        const avgResponseTime =
                          typeResults.reduce(
                            (sum, r) => sum + r.averageResponseTime,
                            0,
                          ) / typeResults.length;
                        const avgSuccessRate =
                          typeResults.reduce(
                            (sum, r) =>
                              sum +
                              (r.successfulRequests / r.totalRequests) * 100,
                            0,
                          ) / typeResults.length;

                        return (
                          <div key={type} className="p-4 border rounded-lg">
                            <div className="font-medium capitalize mb-2">
                              {type.replace("_", " ")} Tests
                            </div>
                            <div className="text-sm space-y-1">
                              <div>Tests Run: {typeResults.length}</div>
                              <div>
                                Avg Response: {avgResponseTime.toFixed(0)}ms
                              </div>
                              <div>
                                Avg Success: {avgSuccessRate.toFixed(1)}%
                              </div>
                              <div>
                                Status:{" "}
                                {typeResults.every(
                                  (r) => r.status === "passed",
                                ) ? (
                                  <span className="text-green-600">
                                    ✅ All Passed
                                  </span>
                                ) : typeResults.some(
                                    (r) => r.status === "failed",
                                  ) ? (
                                  <span className="text-red-600">
                                    ❌ Some Failed
                                  </span>
                                ) : (
                                  <span className="text-yellow-600">
                                    ⚠️ Warnings
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ComprehensiveLoadTester;
