import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, Loader2, Building } from "lucide-react";

/**
 * OAuth Callback Handler Component
 * Handles the OAuth redirect from Google and processes the authentication
 */
function OAuthCallback() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Processing authentication...");
  const navigate = useNavigate();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        console.log("🔄 Processing OAuth callback...");
        console.log("🌐 Current URL:", window.location.href);
        console.log("🔍 URL Hash:", window.location.hash);
        console.log("🔍 URL Search:", window.location.search);

        // Get the session from the URL hash/search params
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("❌ OAuth callback error:", error);
          setStatus("error");
          setMessage(`Authentication failed: ${error.message}`);
          return;
        }

        if (data.session && data.session.user) {
          console.log("✅ OAuth authentication successful!");
          console.log("👤 User:", data.session.user.email);

          setStatus("success");
          setMessage("Authentication successful! Redirecting to dashboard...");

          // Wait a moment to show success message, then redirect
          setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 2000);
        } else {
          console.log("⚠️ No session found in OAuth callback");
          setStatus("error");
          setMessage(
            "No authentication session found. Please try signing in again.",
          );
        }
      } catch (error) {
        console.error("❌ Unexpected OAuth callback error:", error);
        setStatus("error");
        setMessage("An unexpected error occurred during authentication.");
      }
    };

    // Small delay to ensure URL parameters are fully loaded
    const timer = setTimeout(handleOAuthCallback, 500);

    return () => clearTimeout(timer);
  }, [navigate]);

  const handleRetry = () => {
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            AZLOAD Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
              <p className="text-green-700 font-medium">{message}</p>
            </>
          )}

          {status === "error" && (
            <>
              <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
              <p className="text-red-700 font-medium">{message}</p>
              <Button onClick={handleRetry} className="mt-4">
                Return to Sign In
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default OAuthCallback;
