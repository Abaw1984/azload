-- AzLoad Production Database Schema
-- Complete database structure for production-grade data management

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types for better data integrity
CREATE TYPE project_status AS ENUM ('uploading', 'processing', 'completed', 'failed', 'archived');
CREATE TYPE building_type AS ENUM (
  'SINGLE_GABLE_HANGAR', 'DOUBLE_GABLE_HANGAR', 'MULTI_GABLE_HANGAR', 'ARCH_HANGAR',
  'TRUSS_SINGLE_GABLE', 'TRUSS_DOUBLE_GABLE', 'TRUSS_MULTI_GABLE',
  'RIGID_FRAME_SINGLE_GABLE', 'RIGID_FRAME_DOUBLE_GABLE', 'RIGID_FRAME_MULTI_GABLE',
  'MONO_SLOPE_BUILDING', 'FLAT_ROOF_BUILDING', 'WAREHOUSE_BUILDING',
  'INDUSTRIAL_BUILDING', 'COMMERCIAL_BUILDING', 'OFFICE_BUILDING',
  'RESIDENTIAL_BUILDING', 'MIXED_USE_BUILDING', 'OTHER'
);
CREATE TYPE height_category AS ENUM ('LOW_RISE', 'MID_RISE', 'HIGH_RISE');
CREATE TYPE exposure_category AS ENUM ('A', 'B', 'C', 'D');
CREATE TYPE enclosure_classification AS ENUM ('ENCLOSED', 'PARTIALLY_ENCLOSED', 'OPEN');
CREATE TYPE roof_type AS ENUM ('FLAT', 'GABLE', 'HIP', 'SHED', 'GAMBREL', 'MANSARD', 'MONO_SLOPE', 'ARCH');
CREATE TYPE ml_request_type AS ENUM ('building', 'member', 'load', 'classification');
CREATE TYPE ml_request_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'timeout');

-- Create user profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  company TEXT,
  license_number TEXT,
  subscription_tier TEXT DEFAULT 'free',
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  project_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_name TEXT NOT NULL,
  upload_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status project_status DEFAULT 'uploading',
  
  -- Geometry Summary (JSONB for flexible structure)
  geometry_summary JSONB DEFAULT '{}',
  
  -- ML Classification Fields
  building_type building_type,
  building_type_confidence REAL DEFAULT 0.0,
  height_category height_category,
  exposure_category exposure_category,
  enclosure_classification enclosure_classification,
  roof_type roof_type,
  
  -- Additional metadata
  file_type TEXT, -- 'STAAD' or 'SAP2000'
  units_system TEXT, -- 'METRIC' or 'IMPERIAL'
  model_hash TEXT, -- For duplicate detection
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_confidence CHECK (building_type_confidence >= 0.0 AND building_type_confidence <= 1.0)
);

-- Create user_uploads table
CREATE TABLE IF NOT EXISTS public.user_uploads (
  upload_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(project_id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- File processing metadata
  processing_status TEXT DEFAULT 'uploaded',
  processing_errors JSONB DEFAULT '[]',
  parsing_accuracy REAL DEFAULT 0.0,
  
  -- Storage information
  storage_path TEXT,
  checksum TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_file_size CHECK (file_size > 0),
  CONSTRAINT valid_parsing_accuracy CHECK (parsing_accuracy >= 0.0 AND parsing_accuracy <= 100.0)
);

-- Create overrides table (for member tag overrides)
CREATE TABLE IF NOT EXISTS public.overrides (
  override_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(project_id) ON DELETE CASCADE NOT NULL,
  member_id TEXT NOT NULL,
  original_tag TEXT NOT NULL,
  new_tag TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,
  override_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Override metadata
  override_reason TEXT,
  engineer_license TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  
  -- ML training metadata
  used_in_training BOOLEAN DEFAULT FALSE,
  training_batch_id TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_confidence CHECK (confidence >= 0.0 AND confidence <= 1.0),
  CONSTRAINT different_tags CHECK (original_tag != new_tag)
);

-- Create ml_requests table
CREATE TABLE IF NOT EXISTS public.ml_requests (
  request_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(project_id) ON DELETE CASCADE NOT NULL,
  request_type ml_request_type NOT NULL,
  request_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status ml_request_status DEFAULT 'pending',
  
  -- Request/Response data
  request_data JSONB DEFAULT '{}',
  response_data JSONB DEFAULT '{}',
  
  -- Performance metrics
  processing_time_ms INTEGER,
  api_endpoint TEXT,
  model_version TEXT,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_processing_time CHECK (processing_time_ms >= 0),
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0)
);

-- Create training_logs table
CREATE TABLE IF NOT EXISTS public.training_logs (
  log_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  model_version TEXT NOT NULL,
  retrain_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Training data
  included_overrides INTEGER DEFAULT 0,
  total_training_samples INTEGER DEFAULT 0,
  
  -- Performance metrics (JSONB for flexibility)
  performance_metrics JSONB DEFAULT '{}',
  
  -- Processing information
  processed_by TEXT, -- System or user identifier
  training_duration_minutes INTEGER,
  
  -- Model deployment
  deployed_at TIMESTAMP WITH TIME ZONE,
  deployment_status TEXT DEFAULT 'pending',
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_overrides_count CHECK (included_overrides >= 0),
  CONSTRAINT valid_samples_count CHECK (total_training_samples >= 0),
  CONSTRAINT valid_training_duration CHECK (training_duration_minutes >= 0)
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_upload_time ON public.projects(upload_time DESC);
CREATE INDEX IF NOT EXISTS idx_projects_building_type ON public.projects(building_type);

CREATE INDEX IF NOT EXISTS idx_user_uploads_user_id ON public.user_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_uploads_project_id ON public.user_uploads(project_id);
CREATE INDEX IF NOT EXISTS idx_user_uploads_timestamp ON public.user_uploads(upload_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_overrides_user_id ON public.overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_overrides_project_id ON public.overrides(project_id);
CREATE INDEX IF NOT EXISTS idx_overrides_timestamp ON public.overrides(override_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_overrides_training ON public.overrides(used_in_training);

CREATE INDEX IF NOT EXISTS idx_ml_requests_user_id ON public.ml_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_requests_project_id ON public.ml_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_ml_requests_type ON public.ml_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_ml_requests_status ON public.ml_requests(status);
CREATE INDEX IF NOT EXISTS idx_ml_requests_time ON public.ml_requests(request_time DESC);

CREATE INDEX IF NOT EXISTS idx_training_logs_version ON public.training_logs(model_version);
CREATE INDEX IF NOT EXISTS idx_training_logs_time ON public.training_logs(retrain_time DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can access all profiles" ON public.user_profiles;
CREATE POLICY "Admins can access all profiles"
  ON public.user_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Create RLS Policies for projects
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can access all projects" ON public.projects;
CREATE POLICY "Admins can access all projects"
  ON public.projects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Create RLS Policies for user_uploads
DROP POLICY IF EXISTS "Users can view own uploads" ON public.user_uploads;
CREATE POLICY "Users can view own uploads"
  ON public.user_uploads FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own uploads" ON public.user_uploads;
CREATE POLICY "Users can insert own uploads"
  ON public.user_uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own uploads" ON public.user_uploads;
CREATE POLICY "Users can update own uploads"
  ON public.user_uploads FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can access all uploads" ON public.user_uploads;
CREATE POLICY "Admins can access all uploads"
  ON public.user_uploads FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Create RLS Policies for overrides
DROP POLICY IF EXISTS "Users can view own overrides" ON public.overrides;
CREATE POLICY "Users can view own overrides"
  ON public.overrides FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own overrides" ON public.overrides;
CREATE POLICY "Users can insert own overrides"
  ON public.overrides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own overrides" ON public.overrides;
CREATE POLICY "Users can update own overrides"
  ON public.overrides FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can access all overrides" ON public.overrides;
CREATE POLICY "Admins can access all overrides"
  ON public.overrides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Create RLS Policies for ml_requests
DROP POLICY IF EXISTS "Users can view own ml_requests" ON public.ml_requests;
CREATE POLICY "Users can view own ml_requests"
  ON public.ml_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ml_requests" ON public.ml_requests;
CREATE POLICY "Users can insert own ml_requests"
  ON public.ml_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ml_requests" ON public.ml_requests;
CREATE POLICY "Users can update own ml_requests"
  ON public.ml_requests FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can access all ml_requests" ON public.ml_requests;
CREATE POLICY "Admins can access all ml_requests"
  ON public.ml_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Create RLS Policies for training_logs (Admin only for security)
DROP POLICY IF EXISTS "Only admins can access training_logs" ON public.training_logs;
CREATE POLICY "Only admins can access training_logs"
  ON public.training_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_uploads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.overrides;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ml_requests;

-- Create views for common queries
CREATE OR REPLACE VIEW public.project_summary AS
SELECT 
  p.project_id,
  p.user_id,
  p.project_name,
  p.status,
  p.building_type,
  p.upload_time,
  u.file_name,
  u.file_size,
  u.file_type,
  (p.geometry_summary->>'nodes')::INTEGER as node_count,
  (p.geometry_summary->>'members')::INTEGER as member_count,
  (p.geometry_summary->>'materialAssigned')::BOOLEAN as has_materials,
  COUNT(o.override_id) as override_count
FROM public.projects p
LEFT JOIN public.user_uploads u ON p.project_id = u.project_id
LEFT JOIN public.overrides o ON p.project_id = o.project_id
GROUP BY p.project_id, u.upload_id;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Insert initial admin user (replace with actual admin email)
-- This should be done manually after deployment
-- INSERT INTO public.user_profiles (id, email, full_name, is_admin) 
-- VALUES ('admin-uuid-here', 'admin@azload.com', 'AzLoad Admin', TRUE);

COMMIT;