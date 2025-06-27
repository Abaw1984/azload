import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database helper functions
export const db = {
  // Projects
  projects: {
    async create(project: Database["public"]["Tables"]["projects"]["Insert"]) {
      const { data, error } = await supabase
        .from("projects")
        .insert(project)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId)
        .order("upload_time", { ascending: false });

      if (error) throw error;
      return data;
    },

    async getById(projectId: string) {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("project_id", projectId)
        .single();

      if (error) throw error;
      return data;
    },

    async update(
      projectId: string,
      updates: Database["public"]["Tables"]["projects"]["Update"],
    ) {
      const { data, error } = await supabase
        .from("projects")
        .update(updates)
        .eq("project_id", projectId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async delete(projectId: string) {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("project_id", projectId);

      if (error) throw error;
    },
  },

  // User Uploads
  uploads: {
    async create(
      upload: Database["public"]["Tables"]["user_uploads"]["Insert"],
    ) {
      const { data, error } = await supabase
        .from("user_uploads")
        .insert(upload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getByProjectId(projectId: string) {
      const { data, error } = await supabase
        .from("user_uploads")
        .select("*")
        .eq("project_id", projectId)
        .order("upload_timestamp", { ascending: false });

      if (error) throw error;
      return data;
    },

    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from("user_uploads")
        .select("*")
        .eq("user_id", userId)
        .order("upload_timestamp", { ascending: false });

      if (error) throw error;
      return data;
    },
  },

  // Overrides
  overrides: {
    async create(
      override: Database["public"]["Tables"]["overrides"]["Insert"],
    ) {
      const { data, error } = await supabase
        .from("overrides")
        .insert(override)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getByProjectId(projectId: string) {
      const { data, error } = await supabase
        .from("overrides")
        .select("*")
        .eq("project_id", projectId)
        .order("override_timestamp", { ascending: false });

      if (error) throw error;
      return data;
    },

    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from("overrides")
        .select("*")
        .eq("user_id", userId)
        .order("override_timestamp", { ascending: false });

      if (error) throw error;
      return data;
    },

    async markForTraining(overrideIds: string[], batchId: string) {
      const { data, error } = await supabase
        .from("overrides")
        .update({
          used_in_training: true,
          training_batch_id: batchId,
        })
        .in("override_id", overrideIds)
        .select();

      if (error) throw error;
      return data;
    },
  },

  // ML Requests
  mlRequests: {
    async create(
      request: Database["public"]["Tables"]["ml_requests"]["Insert"],
    ) {
      const { data, error } = await supabase
        .from("ml_requests")
        .insert(request)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async update(
      requestId: string,
      updates: Database["public"]["Tables"]["ml_requests"]["Update"],
    ) {
      const { data, error } = await supabase
        .from("ml_requests")
        .update(updates)
        .eq("request_id", requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getByProjectId(projectId: string) {
      const { data, error } = await supabase
        .from("ml_requests")
        .select("*")
        .eq("project_id", projectId)
        .order("request_time", { ascending: false });

      if (error) throw error;
      return data;
    },

    async getByStatus(
      status: Database["public"]["Enums"]["ml_request_status"],
    ) {
      const { data, error } = await supabase
        .from("ml_requests")
        .select("*")
        .eq("status", status)
        .order("request_time", { ascending: false });

      if (error) throw error;
      return data;
    },
  },

  // Training Logs (Admin only)
  trainingLogs: {
    async create(log: Database["public"]["Tables"]["training_logs"]["Insert"]) {
      const { data, error } = await supabase
        .from("training_logs")
        .insert(log)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getAll() {
      const { data, error } = await supabase
        .from("training_logs")
        .select("*")
        .order("retrain_time", { ascending: false });

      if (error) throw error;
      return data;
    },

    async getLatest() {
      const { data, error } = await supabase
        .from("training_logs")
        .select("*")
        .order("retrain_time", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    },
  },

  // User Profiles
  userProfiles: {
    async create(
      profile: Database["public"]["Tables"]["user_profiles"]["Insert"],
    ) {
      const { data, error } = await supabase
        .from("user_profiles")
        .insert(profile)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getById(userId: string) {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data;
    },

    async update(
      userId: string,
      updates: Database["public"]["Tables"]["user_profiles"]["Update"],
    ) {
      const { data, error } = await supabase
        .from("user_profiles")
        .update(updates)
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  },

  // Project Summary View
  projectSummary: {
    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from("project_summary")
        .select("*")
        .eq("user_id", userId)
        .order("upload_time", { ascending: false });

      if (error) throw error;
      return data;
    },

    async getById(projectId: string) {
      const { data, error } = await supabase
        .from("project_summary")
        .select("*")
        .eq("project_id", projectId)
        .single();

      if (error) throw error;
      return data;
    },
  },
};

// Auth helpers
export const auth = {
  async signUp(email: string, password: string, metadata?: any) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  async getCurrentSession() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },
};

// Realtime subscriptions
export const realtime = {
  subscribeToProjects(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel("projects")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
          filter: `user_id=eq.${userId}`,
        },
        callback,
      )
      .subscribe();
  },

  subscribeToUploads(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel("uploads")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_uploads",
          filter: `user_id=eq.${userId}`,
        },
        callback,
      )
      .subscribe();
  },

  subscribeToOverrides(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel("overrides")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "overrides",
          filter: `user_id=eq.${userId}`,
        },
        callback,
      )
      .subscribe();
  },

  subscribeToMLRequests(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel("ml_requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ml_requests",
          filter: `user_id=eq.${userId}`,
        },
        callback,
      )
      .subscribe();
  },
};

export default supabase;
