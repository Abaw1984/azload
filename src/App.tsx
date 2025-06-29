import { useRoutes, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/auth-context";
import LandingPage from "./components/landing-page";
import Home from "./components/home";
import AdminPanel from "./components/admin-panel";
import OAuthCallback from "./components/oauth-callback";
import routes from "tempo-routes";

function AppContent() {
  const {
    isAuthenticated,
    isAdmin,
    isDevelopmentBypass,
    login,
    signup,
    developmentBypass,
    quickTestLogin,
    simplifiedSignup,
  } = useAuth();

  // Handle OAuth callback route first (before authentication check)
  if (
    window.location.pathname === "/auth/callback" ||
    window.location.hash.includes("access_token") ||
    window.location.search.includes("code=")
  ) {
    return (
      <Routes>
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/" element={<OAuthCallback />} />
        <Route path="*" element={<OAuthCallback />} />
      </Routes>
    );
  }

  // Route based on authentication state
  if (isAuthenticated) {
    // Both admin and regular users can access dashboard for production use
    return (
      <Routes>
        <Route path="/dashboard" element={<Home />} />
        {isAdmin && <Route path="/admin" element={<AdminPanel />} />}
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    );
  }

  // Not authenticated - show landing page
  return (
    <Routes>
      <Route
        path="/"
        element={
          <LandingPage
            onLogin={login}
            onSignup={signup}
            onDevelopmentBypass={developmentBypass}
            onQuickTestLogin={quickTestLogin}
            onSimplifiedSignup={simplifiedSignup}
          />
        }
      />
      <Route path="/auth/callback" element={<OAuthCallback />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
    </AuthProvider>
  );
}

export default App;
