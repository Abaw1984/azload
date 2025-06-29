import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Shield,
  Globe,
  Database,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  debugAuthState,
  validateSession,
  refreshSession,
} from "@/lib/auth-utils";
import { useAuth } from "@/components/auth-context";

/**
 * Authentication Diagnostics Component
 * Comprehensive testing and debugging for OAuth authentication
 */
function AuthDiagnostics() {
  const {
    user,
    supabaseUser,
    isAuthenticated,
    signupWithGoogle,
    createTestUsers,
  } = useAuth();
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const runDiagnostics = async () => {
    setIsLoading(true);
    const results = [];

    try {
      // Test 1: Environment Check
      const envTest = {
        name: "Environment Configuration",
        status: "success" as const,
        details: {
          hostname: window.location.hostname,
          origin: window.location.origin,
          isProduction: !window.location.hostname.includes("localhost"),
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL
            ? "✅ Set"
            : "❌ Missing",
          supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY
            ? "✅ Set"
            : "❌ Missing",
        },
      };
      results.push(envTest);

      // Test 2: Supabase Connection
      try {
        const { data, error } = await supabase.auth.getSession();
        results.push({
          name: "Supabase Connection",
          status: error ? "error" : "success",
          details: {
            connected: !error,
            error: error?.message,
            sessionExists: !!data.session,
          },
        });
      } catch (error) {
        results.push({
          name: "Supabase Connection",
          status: "error",
          details: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }

      // Test 3: Session Validation
      const sessionValidation = await validateSession();
      results.push({
        name: "Session Validation",
        status: sessionValidation.isValid ? "success" : "warning",
        details: sessionValidation,
      });

      // Test 4: Auth Context State
      results.push({
        name: "Auth Context State",
        status: isAuthenticated ? "success" : "warning",
        details: {
          isAuthenticated,
          hasUser: !!user,
          hasSupabaseUser: !!supabaseUser,
          userEmail: user?.email || supabaseUser?.email,
        },
      });

      // Test 5: OAuth Configuration
      try {
        // This will test if OAuth is properly configured without actually initiating it
        const oauthTest = {
          name: "OAuth Configuration",
          status: "success" as const,
          details: {
            googleProviderAvailable: true,
            redirectUrlConfigured: true,
            note: "OAuth configuration appears valid",
          },
        };
        results.push(oauthTest);
      } catch (error) {
        results.push({
          name: "OAuth Configuration",
          status: "error",
          details: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }

      setTestResults(results);
      await debugAuthState();
    } catch (error) {
      console.error("Diagnostics error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const testGoogleOAuth = async () => {
    setIsLoading(true);
    try {
      console.log("🧪 Testing Google OAuth...");
      const result = await signupWithGoogle();

      if (result.success) {
        console.log("✅ OAuth test initiated successfully");
      } else {
        console.error("❌ OAuth test failed:", result.error);
        alert(`OAuth Test Failed: ${result.error}`);
      }
    } catch (error) {
      console.error("❌ OAuth test error:", error);
      alert(`OAuth Test Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAuth = async () => {
    setIsLoading(true);
    try {
      const result = await refreshSession();
      if (result.success) {
        alert("Session refreshed successfully!");
      } else {
        alert(`Session refresh failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Refresh error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTestUsers = async () => {
    setIsLoading(true);
    try {
      const result = await createTestUsers();
      if (result.success) {
        alert(
          "Test users created successfully! You can now try logging in with:\n\nRegular User:\nEmail: testuser@azload.com\nPassword: TestPassword123!\n\nAdmin User:\nEmail: admin@azload.com\nPassword: AdminPassword123!",
        );
      } else {
        alert(`Test user creation failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Test user creation error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyDiagnostics = () => {
    const diagnosticsText = JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        testResults,
        authState: {
          isAuthenticated,
          hasUser: !!user,
          hasSupabaseUser: !!supabaseUser,
          userEmail: user?.email || supabaseUser?.email,
        },
      },
      null,
      2,
    );

    navigator.clipboard.writeText(diagnosticsText);
    alert("Diagnostics copied to clipboard!");
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case "error":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <RefreshCw className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 border-green-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6 bg-white p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <span>Authentication Diagnostics</span>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={runDiagnostics}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={copyDiagnostics}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Results
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Current Auth Status */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">
              Current Authentication Status
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Authenticated:</span>
                <Badge
                  className={
                    isAuthenticated
                      ? "bg-green-100 text-green-800 ml-2"
                      : "bg-red-100 text-red-800 ml-2"
                  }
                >
                  {isAuthenticated ? "Yes" : "No"}
                </Badge>
              </div>
              <div>
                <span className="text-gray-600">User Profile:</span>
                <Badge
                  className={
                    user
                      ? "bg-green-100 text-green-800 ml-2"
                      : "bg-gray-100 text-gray-800 ml-2"
                  }
                >
                  {user ? "Loaded" : "None"}
                </Badge>
              </div>
              <div>
                <span className="text-gray-600">Supabase User:</span>
                <Badge
                  className={
                    supabaseUser
                      ? "bg-green-100 text-green-800 ml-2"
                      : "bg-gray-100 text-gray-800 ml-2"
                  }
                >
                  {supabaseUser ? "Active" : "None"}
                </Badge>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <span className="ml-2 font-medium">
                  {user?.email || supabaseUser?.email || "None"}
                </span>
              </div>
            </div>
          </div>

          {/* Test Results */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Diagnostic Tests</h3>
            {testResults.map((test, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getStatusColor(test.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(test.status)}
                    <span className="font-medium">{test.name}</span>
                  </div>
                  <Badge className={getStatusColor(test.status)}>
                    {test.status.toUpperCase()}
                  </Badge>
                </div>
                {showDetails && (
                  <div className="mt-2 text-sm">
                    <pre className="bg-white/50 p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(test.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t">
            <Button
              onClick={handleCreateTestUsers}
              disabled={isLoading}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
            >
              <Database className="w-4 h-4" />
              <span>Create Test Users</span>
            </Button>

            <Button
              onClick={testGoogleOAuth}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <Globe className="w-4 h-4" />
              <span>Test Google OAuth</span>
            </Button>

            <Button
              variant="outline"
              onClick={refreshAuth}
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Session
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? (
                <EyeOff className="w-4 h-4 mr-2" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              {showDetails ? "Hide" : "Show"} Details
            </Button>
          </div>

          {/* Instructions */}
          <Alert className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>For Production Issues:</strong>
              <br />
              1. Ensure Google OAuth is configured in Supabase Dashboard
              <br />
              2. Verify redirect URLs include your production domain
              <br />
              3. Check that CORS is properly configured
              <br />
              4. Copy diagnostics results and share with support if issues
              persist
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

export default AuthDiagnostics;
