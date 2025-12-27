-- URS SAAS Database Setup for Supabase
-- Run this in the Supabase SQL Editor

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    reddit_client_id TEXT,
    reddit_client_secret TEXT,
    reddit_username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scrape Jobs
CREATE TABLE IF NOT EXISTS scrape_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL CHECK (job_type IN ('subreddit', 'redditor', 'comments')),
    config JSONB NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    error_message TEXT,
    result_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Share Links
CREATE TABLE IF NOT EXISTS share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES scrape_jobs(id) ON DELETE CASCADE,
    share_token TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_project_id ON scrape_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_user_id ON scrape_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(share_token);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

-- Policies for service role (backend uses service key, so full access)
-- Note: In production, you might want more restrictive policies

CREATE POLICY "Service role full access on user_profiles"
    ON user_profiles FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on projects"
    ON projects FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on scrape_jobs"
    ON scrape_jobs FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on share_links"
    ON share_links FOR ALL
    USING (true)
    WITH CHECK (true);

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
