import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  Calculator,
  Eye,
  FileText,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
  Users,
  Award,
  Globe,
  Lock,
  Mail,
  User,
  LogIn,
  UserPlus,
  Settings,
} from "lucide-react";

interface LandingPageProps {
  onLogin: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  onSignup: (
    name: string,
    email: string,
    password: string,
    company: string,
  ) => Promise<{ success: boolean; error?: string }>;
  onDevelopmentBypass?: () => Promise<{ success: boolean; error?: string }>;
  onQuickTestLogin?: () => Promise<{ success: boolean; error?: string }>;
  onSimplifiedSignup?: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

function LandingPage({
  onLogin,
  onSignup,
  onDevelopmentBypass,
  onQuickTestLogin,
  onSimplifiedSignup,
}: LandingPageProps) {
  // Enhanced development mode detection - more permissive for testing
  const isDevelopmentMode = () => {
    return (
      import.meta.env.DEV ||
      window.location.hostname === "localhost" ||
      window.location.hostname.includes("127.0.0.1") ||
      window.location.hostname.includes("tempo-dev.app") ||
      window.location.search.includes("dev=true") ||
      window.location.search.includes("test=true")
    );
  };

  // Check if we're in production mode
  const isProductionMode = () => {
    return (
      !import.meta.env.DEV ||
      window.location.hostname.includes("tempo-dev.app") ||
      window.location.hostname.includes("vercel.app") ||
      window.location.hostname.includes("netlify.app") ||
      (!window.location.hostname.includes("localhost") &&
        !window.location.hostname.includes("127.0.0.1"))
    );
  };
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: "",
    company: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await onLogin(loginForm.email, loginForm.password);

      if (result.success) {
        setIsLoginOpen(false);
        setLoginForm({ email: "", password: "" });
        setSuccessMessage("Login successful! Redirecting...");
      } else {
        setError(result.error || "Login failed. Please try again.");
      }
    } catch (error) {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await onSignup(
        signupForm.name,
        signupForm.email,
        signupForm.password,
        signupForm.company,
      );

      if (result.success) {
        setIsSignupOpen(false);
        setSignupForm({ name: "", email: "", password: "", company: "" });
        setSuccessMessage("Account created successfully! You can now sign in.");
      } else {
        setError(result.error || "Account creation failed. Please try again.");
      }
    } catch (error) {
      setError("Account creation failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevelopmentBypass = async () => {
    if (!onDevelopmentBypass) return;

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await onDevelopmentBypass();

      if (result.success) {
        setSuccessMessage("Development bypass activated! Redirecting...");
      } else {
        setError(
          result.error || "Development bypass failed. Please try again.",
        );
      }
    } catch (error) {
      setError("Development bypass failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickTestLogin = async () => {
    if (!onQuickTestLogin) return;

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await onQuickTestLogin();

      if (result.success) {
        setSuccessMessage("Quick test login successful! Redirecting...");
      } else {
        setError(result.error || "Quick test login failed. Please try again.");
      }
    } catch (error) {
      setError("Quick test login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimplifiedSignup = async () => {
    if (!onSimplifiedSignup) return;

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const testEmail = "test@azload.com";
      const testPassword = "test123";
      const result = await onSimplifiedSignup(testEmail, testPassword);

      if (result.success) {
        setSuccessMessage("Simplified signup successful! Redirecting...");
      } else {
        setError(result.error || "Simplified signup failed. Please try again.");
      }
    } catch (error) {
      setError("Simplified signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  AZLOAD
                </h1>
                <p className="text-xs text-gray-600 font-medium">
                  Structural Engineering AI Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Quick Access Buttons - Development/Test Mode */}
              {isDevelopmentMode() && (
                <div className="flex items-center space-x-2">
                  {onQuickTestLogin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleQuickTestLogin}
                      disabled={isLoading}
                      className="border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      {isLoading ? "Loading..." : "Quick Test"}
                    </Button>
                  )}
                  {onDevelopmentBypass && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDevelopmentBypass}
                      disabled={isLoading}
                      className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      {isLoading ? "Bypassing..." : "Dev Bypass"}
                    </Button>
                  )}
                </div>
              )}

              <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Log In</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                      <LogIn className="w-5 h-5 text-blue-600" />
                      <span>Welcome Back</span>
                    </DialogTitle>
                    <DialogDescription>
                      Sign in to your AZLOAD account to continue your structural
                      analysis projects.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="engineer@company.com"
                        value={loginForm.email}
                        onChange={(e) =>
                          setLoginForm({ ...loginForm, email: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        value={loginForm.password}
                        onChange={(e) =>
                          setLoginForm({
                            ...loginForm,
                            password: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                        {error}
                      </div>
                    )}
                    {successMessage && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                        {successMessage}
                      </div>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      {isLoading ? "Signing In..." : "Sign In"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={isSignupOpen} onOpenChange={setIsSignupOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    <UserPlus className="w-4 h-4" />
                    <span>Sign Up Free</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                      <UserPlus className="w-5 h-5 text-blue-600" />
                      <span>Create Your Account</span>
                    </DialogTitle>
                    <DialogDescription>
                      Join thousands of structural engineers using AZLOAD for
                      automated load calculations.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Full Name</Label>
                        <Input
                          id="signup-name"
                          placeholder="John Smith, P.E."
                          value={signupForm.name}
                          onChange={(e) =>
                            setSignupForm({
                              ...signupForm,
                              name: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-company">Company</Label>
                        <Input
                          id="signup-company"
                          placeholder="Engineering Firm"
                          value={signupForm.company}
                          onChange={(e) =>
                            setSignupForm({
                              ...signupForm,
                              company: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="engineer@company.com"
                        value={signupForm.email}
                        onChange={(e) =>
                          setSignupForm({
                            ...signupForm,
                            email: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        value={signupForm.password}
                        onChange={(e) =>
                          setSignupForm({
                            ...signupForm,
                            password: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                        {error}
                      </div>
                    )}
                    {successMessage && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                        {successMessage}
                      </div>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      {isLoading ? "Creating Account..." : "Create Account"}
                    </Button>

                    {/* Quick Access Options - Development/Test Mode */}
                    {isDevelopmentMode() && (
                      <>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-blue-200" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-blue-500 font-medium">
                              Quick Access (Test Mode)
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {onSimplifiedSignup && (
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                              onClick={handleSimplifiedSignup}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <>
                                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600"></div>
                                  Creating Test Account...
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-4 h-4 mr-2" />
                                  Quick Signup (No Email Required)
                                </>
                              )}
                            </Button>
                          )}

                          {onQuickTestLogin && (
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700"
                              onClick={handleQuickTestLogin}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <>
                                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-green-300 border-t-green-600"></div>
                                  Creating Test User...
                                </>
                              ) : (
                                <>
                                  <Zap className="w-4 h-4 mr-2" />
                                  Instant Test Login
                                </>
                              )}
                            </Button>
                          )}

                          {onDevelopmentBypass && (
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={handleDevelopmentBypass}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <>
                                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-red-300 border-t-red-600"></div>
                                  Activating Admin Bypass...
                                </>
                              ) : (
                                <>
                                  <Settings className="w-4 h-4 mr-2" />
                                  Admin Development Bypass
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </>
                    )}

                    {isDevelopmentMode() && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                        <strong>Test Mode Active:</strong> Use the quick access
                        buttons above to bypass authentication complexity:
                        <ul className="mt-1 ml-4 list-disc text-xs">
                          <li>
                            <strong>Quick Signup:</strong> Creates a local test
                            account instantly
                          </li>
                          <li>
                            <strong>Instant Test Login:</strong> Creates a
                            temporary user session
                          </li>
                          <li>
                            <strong>Admin Bypass:</strong> Full admin access for
                            development
                          </li>
                        </ul>
                      </div>
                    )}
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <Badge className="mb-4 bg-blue-100 text-blue-800 border-blue-200">
              🚀 AI-Powered Structural Analysis
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Automate Your{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Load Calculations
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Upload your STAAD.Pro or SAP2000 models and let our AI
              automatically calculate wind, seismic, snow, and other loads
              according to ASCE 7-16 standards. Generate professional reports in
              minutes, not hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Dialog open={isSignupOpen} onOpenChange={setIsSignupOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 py-3"
                  >
                    <UserPlus className="w-5 h-5 mr-2" />
                    Start Free Trial
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </DialogTrigger>
              </Dialog>
              <Button size="lg" variant="outline" className="text-lg px-8 py-3">
                <Eye className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Structural Analysis
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From model parsing to professional reports, AZLOAD handles the
              entire workflow with AI precision.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Building className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>3D Model Visualization</CardTitle>
                <CardDescription>
                  Interactive 3D viewer with AI-powered member tagging and
                  color-coded structural elements.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Calculator className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Automated Load Calculations</CardTitle>
                <CardDescription>
                  ASCE 7-16 compliant wind, seismic, snow, live, dead, and crane
                  load calculations with full code references.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>Professional Reports</CardTitle>
                <CardDescription>
                  Generate detailed PDF reports with calculations, code
                  references, and 3D visualizations for client delivery.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle>AI Building Detection</CardTitle>
                <CardDescription>
                  Automatically classify building types and detect special
                  features like cranes, canopies, and mezzanines.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle>Code Compliance</CardTitle>
                <CardDescription>
                  Built-in compliance monitoring with ASCE 7-16 and AISC 360
                  standards verification and audit trails.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <Eye className="w-6 h-6 text-indigo-600" />
                </div>
                <CardTitle>Multi-Format Support</CardTitle>
                <CardDescription>
                  Import from STAAD.Pro, SAP2000, and other major structural
                  analysis software with intelligent parsing.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-2">10,000+</div>
              <div className="text-blue-100">Models Analyzed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">500+</div>
              <div className="text-blue-100">Engineering Firms</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">95%</div>
              <div className="text-blue-100">Time Savings</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">99.9%</div>
              <div className="text-blue-100">Accuracy Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Workflow?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of structural engineers who have already automated
            their load calculations with AZLOAD.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Dialog open={isSignupOpen} onOpenChange={setIsSignupOpen}>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 py-3"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Start Your Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </DialogTrigger>
            </Dialog>
            <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-3"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In to Continue
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Building className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold">AZLOAD</h3>
              </div>
              <p className="text-gray-400">
                AI-powered structural engineering assistant for automated load
                calculations and compliance verification.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Features</li>
                <li>Pricing</li>
                <li>Documentation</li>
                <li>API</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>About</li>
                <li>Blog</li>
                <li>Careers</li>
                <li>Contact</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Help Center</li>
                <li>Community</li>
                <li>Status</li>
                <li>Security</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>
              &copy; 2024 AZLOAD. All rights reserved. Built for structural
              engineers, by engineers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
