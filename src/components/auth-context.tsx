import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

import type { User as SupabaseUser } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  company: string;
  license_number?: string;
  subscription_tier: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: UserProfile | null;
  supabaseUser: SupabaseUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  isDevelopmentBypass: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  signup: (
    name: string,
    email: string,
    password: string,
    company: string,
  ) => Promise<{ success: boolean; error?: string }>;
  developmentBypass: () => Promise<{ success: boolean; error?: string }>;
  quickTestLogin: () => Promise<{ success: boolean; error?: string }>;
  simplifiedSignup: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (
    updates: Partial<UserProfile>,
  ) => Promise<{ success: boolean; error?: string }>;
  createTestUsers: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Enhanced development mode detection - more permissive for testing
const isDevelopmentMode = () => {
  // Allow development bypass in more scenarios for easier testing
  return (
    import.meta.env.DEV ||
    window.location.hostname === "localhost" ||
    window.location.hostname.includes("127.0.0.1") ||
    window.location.hostname.includes("tempo-dev.app") ||
    window.location.search.includes("dev=true") ||
    window.location.search.includes("test=true")
  );
};

// Production mode check
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDevelopmentBypass, setIsDevelopmentBypass] = useState(false);

  // Simple profile loader
  const loadUserProfile = async (
    userId: string,
  ): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.log("Profile not found, will create:", error.message);
      return null;
    }

    return data as UserProfile;
  };

  // Simple profile creator
  const createUserProfile = async (
    user: SupabaseUser,
    additionalData?: any,
  ): Promise<UserProfile | null> => {
    const profileData = {
      id: user.id,
      email: user.email || "",
      full_name:
        additionalData?.full_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "User",
      company:
        additionalData?.company || user.user_metadata?.company || "Unknown",
      license_number:
        additionalData?.license_number ||
        user.user_metadata?.license_number ||
        null,
      subscription_tier: "free",
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("user_profiles")
      .upsert(profileData, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("Profile creation failed:", error);
      return null;
    }

    return data as UserProfile;
  };

  // Initialize auth
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log("🔐 Initializing authentication...");
        console.log("🛠️ Development mode:", isDevelopmentMode());

        // Check for various authentication bypass methods
        if (isDevelopmentMode()) {
          // Check for development bypass
          const bypassData = localStorage.getItem("azload_dev_bypass");
          if (bypassData) {
            try {
              const parsedBypass = JSON.parse(bypassData);
              if (parsedBypass.enabled && parsedBypass.user) {
                console.log("🚀 Development bypass active, loading mock user");
                setUser(parsedBypass.user);
                setIsAuthenticated(true);
                setIsAdmin(parsedBypass.user.is_admin);
                setIsDevelopmentBypass(true);
                setIsLoading(false);
                console.log("✅ Development bypass authentication complete!");
                return;
              }
            } catch (e) {
              console.warn("⚠️ Invalid bypass data, clearing...");
              localStorage.removeItem("azload_dev_bypass");
            }
          }

          // Check for test user
          const testData = localStorage.getItem("azload_test_user");
          if (testData) {
            try {
              const parsedTest = JSON.parse(testData);
              if (parsedTest.enabled && parsedTest.user) {
                console.log("⚡ Test user active, loading test user");
                setUser(parsedTest.user);
                setIsAuthenticated(true);
                setIsAdmin(parsedTest.user.is_admin);
                setIsDevelopmentBypass(false);
                setIsLoading(false);
                console.log("✅ Test user authentication complete!");
                return;
              }
            } catch (e) {
              console.warn("⚠️ Invalid test data, clearing...");
              localStorage.removeItem("azload_test_user");
            }
          }

          // Check for local user
          const localData = localStorage.getItem("azload_local_user");
          if (localData) {
            try {
              const parsedLocal = JSON.parse(localData);
              if (parsedLocal.enabled && parsedLocal.user) {
                console.log("🏠 Local user active, loading local user");
                setUser(parsedLocal.user);
                setIsAuthenticated(true);
                setIsAdmin(parsedLocal.user.is_admin);
                setIsDevelopmentBypass(false);
                setIsLoading(false);
                console.log("✅ Local user authentication complete!");
                return;
              }
            } catch (e) {
              console.warn("⚠️ Invalid local data, clearing...");
              localStorage.removeItem("azload_local_user");
            }
          }
        } else if (isProductionMode()) {
          // Clear any development bypass data in production
          localStorage.removeItem("azload_dev_bypass");
          localStorage.removeItem("azload_test_user");
          localStorage.removeItem("azload_local_user");
          console.log("🏭 Production mode: Development bypass disabled");
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        console.log("📋 Current session:", session ? "Found" : "None");
        console.log("📋 Session details:", {
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          isExpired: session?.expires_at
            ? new Date(session.expires_at * 1000) < new Date()
            : "N/A",
          expiresAt: session?.expires_at
            ? new Date(session.expires_at * 1000).toISOString()
            : "N/A",
        });

        if (mounted && session?.user) {
          console.log("👤 User found in session:", session.user.email);
          setSupabaseUser(session.user);

          let profile = await loadUserProfile(session.user.id);
          if (!profile) {
            console.log("📝 Creating new user profile...");
            profile = await createUserProfile(session.user);
          } else {
            console.log("✅ User profile loaded:", profile.email);
          }

          if (profile) {
            setUser(profile);
            setIsAuthenticated(true);
            setIsAdmin(profile.is_admin);
            console.log("🎉 Authentication successful!");
          }
        } else {
          console.log("❌ No valid session found");
        }
      } catch (error) {
        console.error("❌ Auth init error:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
          console.log("✅ Auth initialization complete");
        }
      }
    };

    initAuth();

    // Listen for auth changes with enhanced logging
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log(
        "🔄 Auth state change:",
        event,
        session ? "Session exists" : "No session",
      );

      if (event === "SIGNED_IN" && session?.user) {
        console.log("✅ User signed in:", session.user.email);
        setSupabaseUser(session.user);

        let profile = await loadUserProfile(session.user.id);
        if (!profile) {
          console.log("📝 Creating profile for OAuth user...");
          profile = await createUserProfile(session.user);
        }

        if (profile) {
          setUser(profile);
          setIsAuthenticated(true);
          setIsAdmin(profile.is_admin);
          console.log("🎉 OAuth authentication complete!");
        }
      } else if (event === "SIGNED_OUT") {
        console.log("👋 User signed out");
        setSupabaseUser(null);
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
      } else if (event === "TOKEN_REFRESHED") {
        console.log("🔄 Token refreshed");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        let message = "Login failed. Please check your credentials.";
        if (error.message.includes("Invalid login credentials")) {
          message = "Invalid email or password.";
        } else if (error.message.includes("Email not confirmed")) {
          message = "Please check your email and confirm your account.";
        }
        return { success: false, error: message };
      }

      if (data.user) {
        return { success: true };
      }

      return { success: false, error: "Login failed." };
    } catch (error) {
      return { success: false, error: "Login failed. Please try again." };
    }
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    company: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            company: company.trim(),
          },
        },
      });

      if (error) {
        let message = "Account creation failed.";
        if (error.message.includes("User already registered")) {
          message = "An account with this email already exists.";
        } else if (error.message.includes("Password should be at least")) {
          message = "Password must be at least 6 characters.";
        }
        return { success: false, error: message };
      }

      if (data.user) {
        // Create profile immediately
        await createUserProfile(data.user, {
          full_name: name.trim(),
          company: company.trim(),
        });
        return { success: true };
      }

      return { success: false, error: "Account creation failed." };
    } catch (error) {
      return { success: false, error: "Account creation failed." };
    }
  };

  const developmentBypass = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    console.log("🚀 Development bypass requested");
    console.log("🛠️ Development mode check:", isDevelopmentMode());
    console.log("🌐 Current hostname:", window.location.hostname);
    console.log("🔍 Search params:", window.location.search);

    if (!isDevelopmentMode()) {
      return {
        success: false,
        error: "Development bypass is only available in development/test mode.",
      };
    }

    try {
      console.log("✨ Creating development bypass user...");

      // Create a mock user profile with enhanced permissions
      const mockUser: UserProfile = {
        id: "dev-bypass-user-" + Date.now(),
        email: "developer@azload.dev",
        full_name: "Development Test User",
        company: "AzLoad Development",
        license_number: "DEV-123456",
        subscription_tier: "premium",
        is_admin: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Store bypass data in localStorage with enhanced metadata
      const bypassData = {
        enabled: true,
        user: mockUser,
        timestamp: new Date().toISOString(),
        hostname: window.location.hostname,
        userAgent: navigator.userAgent.substring(0, 100),
        version: "2.0",
      };

      localStorage.setItem("azload_dev_bypass", JSON.stringify(bypassData));
      console.log("💾 Bypass data stored in localStorage");

      // Set auth state immediately
      setUser(mockUser);
      setIsAuthenticated(true);
      setIsAdmin(true);
      setIsDevelopmentBypass(true);
      setIsLoading(false);

      console.log("✅ Development bypass activated successfully!");
      return { success: true };
    } catch (error) {
      console.error("❌ Development bypass failed:", error);
      return {
        success: false,
        error:
          "Failed to activate development bypass: " +
          (error instanceof Error ? error.message : "Unknown error"),
      };
    }
  };

  const quickTestLogin = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    console.log("⚡ Quick test login requested");

    try {
      // Create a temporary test user without requiring database
      const testUser: UserProfile = {
        id: "test-user-" + Date.now(),
        email: "test@azload.com",
        full_name: "Test User",
        company: "Test Company",
        license_number: "TEST-001",
        subscription_tier: "free",
        is_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Store test user data
      const testData = {
        enabled: true,
        user: testUser,
        timestamp: new Date().toISOString(),
        type: "quick_test",
      };

      localStorage.setItem("azload_test_user", JSON.stringify(testData));

      // Set auth state
      setUser(testUser);
      setIsAuthenticated(true);
      setIsAdmin(false);
      setIsDevelopmentBypass(false);
      setIsLoading(false);

      console.log("✅ Quick test login successful!");
      return { success: true };
    } catch (error) {
      console.error("❌ Quick test login failed:", error);
      return {
        success: false,
        error:
          "Failed to create test login: " +
          (error instanceof Error ? error.message : "Unknown error"),
      };
    }
  };

  const simplifiedSignup = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    console.log("📝 Simplified signup requested for:", email);

    // If in development mode, create a local user without Supabase
    if (isDevelopmentMode()) {
      try {
        const localUser: UserProfile = {
          id: "local-user-" + Date.now(),
          email: email.trim().toLowerCase(),
          full_name: email.split("@")[0] || "User",
          company: "Local Test Company",
          license_number: null,
          subscription_tier: "free",
          is_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const localData = {
          enabled: true,
          user: localUser,
          timestamp: new Date().toISOString(),
          type: "local_signup",
          credentials: { email, password }, // Store for local auth
        };

        localStorage.setItem("azload_local_user", JSON.stringify(localData));

        setUser(localUser);
        setIsAuthenticated(true);
        setIsAdmin(false);
        setIsDevelopmentBypass(false);
        setIsLoading(false);

        console.log("✅ Local signup successful!");
        return { success: true };
      } catch (error) {
        console.error("❌ Local signup failed:", error);
        return {
          success: false,
          error:
            "Local signup failed: " +
            (error instanceof Error ? error.message : "Unknown error"),
        };
      }
    }

    // Fallback to regular Supabase signup
    return await signup(
      email.split("@")[0] || "User",
      email,
      password,
      "Company",
    );
  };

  const logout = async (): Promise<void> => {
    console.log("👋 Logout requested");

    // Clear all local authentication data
    if (isDevelopmentBypass) {
      localStorage.removeItem("azload_dev_bypass");
      setIsDevelopmentBypass(false);
    }

    // Clear all test/local user data
    localStorage.removeItem("azload_test_user");
    localStorage.removeItem("azload_local_user");

    // Clear Supabase session (with error handling)
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn("⚠️ Supabase signout error (non-critical):", error);
    }

    // Reset all auth state
    setUser(null);
    setSupabaseUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setIsLoading(false);

    console.log("✅ Logout complete");
  };

  const updateProfile = async (
    updates: Partial<UserProfile>,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "No user logged in" };
    }

    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        return { success: false, error: "Profile update failed." };
      }

      if (data) {
        setUser(data as UserProfile);
        setIsAdmin(data.is_admin);
        return { success: true };
      }

      return { success: false, error: "Profile update failed." };
    } catch (error) {
      return { success: false, error: "Profile update failed." };
    }
  };

  const createTestUsers = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      console.log("🧪 Creating test users...");

      const results = [];

      // Helper function to create a single test user
      const createSingleTestUser = async (
        email: string,
        password: string,
        fullName: string,
        company: string,
        isAdmin: boolean = false,
      ) => {
        try {
          console.log(`👤 Creating user: ${email}`);

          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
                company: company,
              },
            },
          });

          if (error) {
            if (error.message.includes("User already registered")) {
              console.log(`✅ User ${email} already exists`);
              return { success: true, message: `User ${email} already exists` };
            } else {
              console.error(`❌ Failed to create ${email}:`, error);
              return { success: false, error: error.message };
            }
          }

          if (data.user) {
            console.log(`📝 Creating profile for ${email}...`);
            const profile = await createUserProfile(data.user, {
              full_name: fullName,
              company: company,
            });

            // Set admin privileges if needed
            if (profile && isAdmin) {
              console.log(`👑 Setting admin privileges for ${email}...`);
              await supabase
                .from("user_profiles")
                .update({ is_admin: true })
                .eq("id", profile.id);
            }

            return {
              success: true,
              message: `User ${email} created successfully${data.user.email_confirmed_at ? " (confirmed)" : " (needs email confirmation)"}`,
            };
          }

          return { success: false, error: `Failed to create user ${email}` };
        } catch (err) {
          console.error(`❌ Error creating ${email}:`, err);
          return {
            success: false,
            error:
              err instanceof Error
                ? err.message
                : `Unknown error creating ${email}`,
          };
        }
      };

      // Create regular test user
      const userResult = await createSingleTestUser(
        "testuser@azload.com",
        "TestPassword123!",
        "Test User",
        "Test Company",
        false,
      );
      results.push(userResult);

      // Create admin test user
      const adminResult = await createSingleTestUser(
        "admin@azload.com",
        "AdminPassword123!",
        "Admin User",
        "AzLoad Admin",
        true,
      );
      results.push(adminResult);

      // Check if any creation failed
      const failures = results.filter((r) => !r.success);
      if (failures.length > 0) {
        const errorMessages = failures.map((f) => f.error).join("; ");
        return {
          success: false,
          error: `Some users failed to create: ${errorMessages}`,
        };
      }

      console.log("✅ Test users setup completed!");

      // Check if email confirmation is required
      const needsConfirmation = results.some((r) =>
        r.message?.includes("needs email confirmation"),
      );

      let message =
        "Test users created successfully!\n\nCredentials:\n" +
        "Regular User: testuser@azload.com / TestPassword123!\n" +
        "Admin User: admin@azload.com / AdminPassword123!\n\n";

      if (needsConfirmation) {
        message +=
          "⚠️ IMPORTANT: These users need email confirmation before they can log in.\n" +
          "To disable email confirmation for testing:\n" +
          "1. Go to your Supabase Dashboard\n" +
          "2. Navigate to Authentication > Settings\n" +
          "3. Disable 'Enable email confirmations'\n" +
          "4. Try creating the test users again\n\n" +
          "Alternatively, check the email inboxes for confirmation links.";
      } else {
        message += "✅ Users are ready to log in immediately!";
      }

      return {
        success: true,
        error: message,
      };
    } catch (error) {
      console.error("❌ Error in createTestUsers:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        isAuthenticated,
        isAdmin,
        isLoading,
        isDevelopmentBypass,
        login,
        signup,
        developmentBypass,
        quickTestLogin,
        simplifiedSignup,
        logout,
        updateProfile,
        createTestUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
