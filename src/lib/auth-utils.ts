import { supabase } from "@/lib/supabase";

/**
 * Authentication Utilities for AZLOAD
 * Production-ready OAuth and session management
 */

/**
 * Get the appropriate redirect URL based on environment
 */
export function getOAuthRedirectURL(): string {
  const isProduction =
    window.location.hostname !== "localhost" &&
    !window.location.hostname.includes("127.0.0.1") &&
    !window.location.hostname.includes("tempo-dev.app");

  if (isProduction) {
    return `${window.location.origin}/dashboard`;
  } else {
    return `${window.location.origin}`;
  }
}

/**
 * Enhanced Google OAuth with proper error handling
 */
export async function initiateGoogleOAuth(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log("🔐 Initiating Google OAuth...");

    const redirectTo = getOAuthRedirectURL();
    console.log("🌐 Redirect URL:", redirectTo);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error("❌ Google OAuth error:", error);
      return {
        success: false,
        error: getOAuthErrorMessage(error),
      };
    }

    console.log("✅ Google OAuth initiated successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ Unexpected OAuth error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown OAuth error",
    };
  }
}

/**
 * Get user-friendly error messages for OAuth errors
 */
function getOAuthErrorMessage(error: any): string {
  const message = error.message?.toLowerCase() || "";

  if (message.includes("popup")) {
    return "Please allow popups for this site and try again.";
  }

  if (message.includes("network") || message.includes("fetch")) {
    return "Network error. Please check your connection and try again.";
  }

  if (message.includes("redirect")) {
    return "Authentication redirect failed. Please contact support.";
  }

  if (message.includes("access_denied")) {
    return "Google authentication was cancelled. Please try again.";
  }

  if (message.includes("invalid_request")) {
    return "Invalid authentication request. Please contact support.";
  }

  return "Google authentication failed. Please try again.";
}

/**
 * Check if current session is valid
 */
export async function validateSession(): Promise<{
  isValid: boolean;
  user?: any;
  error?: string;
}> {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      return {
        isValid: false,
        error: error.message,
      };
    }

    if (!session || !session.user) {
      return {
        isValid: false,
        error: "No valid session found",
      };
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at < now) {
      return {
        isValid: false,
        error: "Session expired",
      };
    }

    return {
      isValid: true,
      user: session.user,
    };
  } catch (error) {
    return {
      isValid: false,
      error:
        error instanceof Error ? error.message : "Session validation failed",
    };
  }
}

/**
 * Refresh the current session
 */
export async function refreshSession(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Session refresh failed",
    };
  }
}

/**
 * Sign out user and clear all session data
 */
export async function signOut(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Clear any local storage data
    localStorage.removeItem("supabase.auth.token");
    sessionStorage.clear();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Sign out failed",
    };
  }
}

/**
 * Debug authentication state
 */
export async function debugAuthState(): Promise<void> {
  console.log("🔍 === AUTH DEBUG INFO ===");
  console.log("🌐 Current URL:", window.location.href);
  console.log("🏠 Origin:", window.location.origin);
  console.log("🔍 Hash:", window.location.hash);
  console.log("🔍 Search:", window.location.search);

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    console.log("📋 Session:", session ? "Found" : "None");
    console.log("❌ Session Error:", error);

    if (session) {
      console.log("👤 User ID:", session.user?.id);
      console.log("📧 User Email:", session.user?.email);
      console.log("⏰ Expires At:", new Date(session.expires_at! * 1000));
      console.log(
        "🔑 Access Token:",
        session.access_token ? "Present" : "Missing",
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log("👤 Current User:", user ? user.email : "None");
  } catch (error) {
    console.error("❌ Debug error:", error);
  }

  console.log("🔍 === END AUTH DEBUG ===");
}
