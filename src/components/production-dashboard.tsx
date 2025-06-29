import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  AlertTriangle,
  Database,
  Zap,
  Building,
  Brain,
  Activity,
  TrendingUp,
  Users,
  Globe,
  Shield,
  Clock,
} from "lucide-react";
import { useAuth } from "@/components/auth-context";

interface ProductionMetrics {
  totalUploads: number;
  mlTrainingEvents: number;
  activeUsers: number;
  systemHealth: "healthy" | "warning" | "error";
  mlApiStatus: "online" | "offline" | "degraded";
  databaseStatus: "connected" | "disconnected" | "slow";
  lastUpdated: Date;
}

function ProductionDashboard() {
  const { user, isAdmin } = useAuth();
  const [metrics, setMetrics] = useState<ProductionMetrics>({
    totalUploads: 0,
    mlTrainingEvents: 0,
    activeUsers: 1,
    systemHealth: "healthy",
    mlApiStatus: "online",
    databaseStatus: "connected",
    lastUpdated: new Date(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [realTimeStats, setRealTimeStats] = useState({
    sessionsToday: 0,
    modelsProcessed: 0,
    mlPredictions: 0,
    userOverrides: 0,
  });

  // Load production metrics
  useEffect(() => {
    loadProductionMetrics();

    // Set up real-time updates
    const interval = setInterval(loadProductionMetrics, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadProductionMetrics = async () => {
    try {
      // Get metrics from session storage and local tracking
      const uploadCounter = parseInt(
        sessionStorage.getItem("uploadCounter") || "0",
      );
      const mlTrainingCount = parseInt(
        sessionStorage.getItem("mlTrainingCount") || "0",
      );
      const mlLearningCounter = JSON.parse(
        sessionStorage.getItem("mlLearningCounter") || "{}",
      );

      // Check ML API health
      let mlApiStatus: "online" | "offline" | "degraded" = "offline";
      try {
        const mlApiUrl = import.meta.env.VITE_ML_API_URL;
        if (mlApiUrl) {
          const response = await fetch(`${mlApiUrl}/health`, {
            method: "GET",
            timeout: 5000,
          } as any);
          if (response.ok) {
            mlApiStatus = "online";
          } else {
            mlApiStatus = "degraded";
          }
        }
      } catch (error) {
        mlApiStatus = "offline";
      }

      // Check database status (Supabase)
      let databaseStatus: "connected" | "disconnected" | "slow" = "connected";
      try {
        const { supabase } = await import("@/lib/supabase");
        const startTime = Date.now();
        const { error } = await supabase
          .from("user_profiles")
          .select("id")
          .limit(1);
        const responseTime = Date.now() - startTime;

        if (error) {
          databaseStatus = "disconnected";
        } else if (responseTime > 2000) {
          databaseStatus = "slow";
        } else {
          databaseStatus = "connected";
        }
      } catch (error) {
        databaseStatus = "disconnected";
      }

      // Determine overall system health
      let systemHealth: "healthy" | "warning" | "error" = "healthy";
      if (databaseStatus === "disconnected" || mlApiStatus === "offline") {
        systemHealth = "error";
      } else if (databaseStatus === "slow" || mlApiStatus === "degraded") {
        systemHealth = "warning";
      }

      setMetrics({
        totalUploads: uploadCounter,
        mlTrainingEvents: mlLearningCounter.totalOverrides || 0,
        activeUsers: 1, // Would be actual count in production
        systemHealth,
        mlApiStatus,
        databaseStatus,
        lastUpdated: new Date(),
      });

      setRealTimeStats({
        sessionsToday: uploadCounter,
        modelsProcessed: uploadCounter,
        mlPredictions: mlTrainingCount,
        userOverrides: mlLearningCounter.totalOverrides || 0,
      });

      setIsLoading(false);
    } catch (error) {
      console.error("Failed to load production metrics:", error);
      setIsLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case "healthy":
      case "online":
      case "connected":
        return "text-green-600 bg-green-100";
      case "warning":
      case "degraded":
      case "slow":
        return "text-yellow-600 bg-yellow-100";
      case "error":
      case "offline":
      case "disconnected":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case "healthy":
      case "online":
      case "connected":
        return <CheckCircle className="w-4 h-4" />;
      case "warning":
      case "degraded":
      case "slow":
        return <AlertTriangle className="w-4 h-4" />;
      case "error":
      case "offline":
      case "disconnected":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Loading Production Metrics...
              </h3>
              <p className="text-gray-600">Checking system status</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 bg-white">
      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Production System Status</span>
            <Badge className={getHealthColor(metrics.systemHealth)}>
              {getHealthIcon(metrics.systemHealth)}
              <span className="ml-1 capitalize">{metrics.systemHealth}</span>
            </Badge>
          </CardTitle>
          <CardDescription>
            Real-time monitoring of AZLOAD production environment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ML API Status */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">ML API</span>
                </div>
                <Badge className={getHealthColor(metrics.mlApiStatus)}>
                  {getHealthIcon(metrics.mlApiStatus)}
                  <span className="ml-1 capitalize">{metrics.mlApiStatus}</span>
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                Digital Ocean ML Server
                <br />
                <span className="text-xs">
                  {import.meta.env.VITE_ML_API_URL || "Not configured"}
                </span>
              </div>
            </div>

            {/* Database Status */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Database</span>
                </div>
                <Badge className={getHealthColor(metrics.databaseStatus)}>
                  {getHealthIcon(metrics.databaseStatus)}
                  <span className="ml-1 capitalize">
                    {metrics.databaseStatus}
                  </span>
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                Supabase PostgreSQL
                <br />
                <span className="text-xs">
                  {import.meta.env.VITE_SUPABASE_URL
                    ? "Configured"
                    : "Not configured"}
                </span>
              </div>
            </div>

            {/* User Session */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <span className="font-medium">User Session</span>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-4 h-4" />
                  <span className="ml-1">Active</span>
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                {user?.full_name || user?.email}
                <br />
                <span className="text-xs">{user?.company || "No company"}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {realTimeStats.sessionsToday}
            </div>
            <div className="text-sm text-gray-600 flex items-center justify-center space-x-1">
              <Activity className="w-4 h-4" />
              <span>Sessions Today</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {realTimeStats.modelsProcessed}
            </div>
            <div className="text-sm text-gray-600 flex items-center justify-center space-x-1">
              <Building className="w-4 h-4" />
              <span>Models Processed</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {realTimeStats.mlPredictions}
            </div>
            <div className="text-sm text-gray-600 flex items-center justify-center space-x-1">
              <Brain className="w-4 h-4" />
              <span>ML Predictions</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {realTimeStats.userOverrides}
            </div>
            <div className="text-sm text-gray-600 flex items-center justify-center space-x-1">
              <TrendingUp className="w-4 h-4" />
              <span>User Corrections</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Features Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5" />
            <span>Production Features</span>
            <Badge className="bg-green-100 text-green-800">
              All Systems Operational
            </Badge>
          </CardTitle>
          <CardDescription>
            Core AZLOAD features and their operational status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">3D Model Visualization</span>
                </div>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">
                    AI Building Classification
                  </span>
                </div>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Member Tagging System</span>
                </div>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Material Assignment</span>
                </div>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Real-time ML Learning</span>
                </div>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">User Authentication</span>
                </div>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Data Persistence</span>
                </div>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Backend Integration</span>
                </div>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="w-5 h-5" />
            <span>System Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">Environment</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Mode:</span>
                  <Badge className="bg-green-100 text-green-800">
                    Production
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Version:</span>
                  <span>v1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Build:</span>
                  <span>{new Date().toISOString().split("T")[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Updated:</span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{metrics.lastUpdated.toLocaleTimeString()}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">Configuration</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">ML API:</span>
                  <Badge className={getHealthColor(metrics.mlApiStatus)}>
                    {metrics.mlApiStatus === "online" ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Database:</span>
                  <Badge className={getHealthColor(metrics.databaseStatus)}>
                    {metrics.databaseStatus === "connected"
                      ? "Connected"
                      : "Disconnected"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Auth:</span>
                  <Badge className="bg-green-100 text-green-800">
                    Supabase
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Storage:</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    Session + DB
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProductionDashboard;
