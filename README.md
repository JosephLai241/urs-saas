# URS SAAS - Universal Reddit Scraper Platform

A web-based SAAS platform built around the [URS (Universal Reddit Scraper)](https://github.com/JosephLai241/URS) library. Allows users to scrape Reddit data through a user-friendly interface with background job processing, result viewing, and sharing capabilities.

## Features

- **Authentication**: Email/password login via Supabase
- **Project Management**: Organize scrapes into projects
- **Scraping Types**:
  - **Subreddit**: Hot, New, Top, Rising, Controversial posts
  - **Redditor**: User profile, submissions, and comments
  - **Comments**: Full comment thread extraction with tree structure
- **Background Jobs**: Scrapes run in the background with real-time progress updates
- **Results Viewer**: Interactive display of scraped data
- **Share Links**: Generate read-only shareable links for results
- **Export**: Download as JSON, Markdown, or PDF

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│  FastAPI API    │────▶│    Supabase     │
│   (Frontend)    │     │  (Backend)      │     │   (Database)    │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                        ┌────────▼────────┐
                        │  URS Scrapers   │
                        │  (PRAW + Rust)  │
                        └─────────────────┘
```

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: FastAPI, Python 3.11+
- **Database**: Supabase (PostgreSQL)
- **Scraping**: URS library with PRAW
- **Deployment**: Vercel (frontend) + Railway (backend)

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- A Supabase project (free tier works)
- Reddit API credentials

### 1. Database Setup (Supabase)

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run:

```sql
-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    reddit_client_id TEXT,
    reddit_client_secret TEXT,
    reddit_username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scrape Jobs
CREATE TABLE scrape_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL,
    config JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    progress INT DEFAULT 0,
    error_message TEXT,
    result_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Share Links
CREATE TABLE share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES scrape_jobs(id) ON DELETE CASCADE,
    share_token TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

-- Policies (for service role, no RLS restrictions)
CREATE POLICY "Service role has full access to user_profiles" ON user_profiles FOR ALL USING (true);
CREATE POLICY "Service role has full access to projects" ON projects FOR ALL USING (true);
CREATE POLICY "Service role has full access to scrape_jobs" ON scrape_jobs FOR ALL USING (true);
CREATE POLICY "Service role has full access to share_links" ON share_links FOR ALL USING (true);
```

3. Get your credentials from Settings > API:
   - URL
   - anon key
   - service_role key
   - JWT secret

### 2. Backend Setup

```bash
cd urs-saas/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your credentials:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_KEY
# - JWT_SECRET (from Supabase)
# - ENCRYPTION_KEY (generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

# Run the server
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000

### 3. Frontend Setup

```bash
cd urs-saas/frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local if needed (defaults to localhost:8000)

# Run development server
npm run dev
```

The app will be available at http://localhost:3000

## Deployment

### Backend (Railway)

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repo
3. Set the root directory to `urs-saas/backend`
4. Add environment variables from `.env.example`
5. Railway will auto-deploy on push

### Frontend (Vercel)

1. Import project on [Vercel](https://vercel.com)
2. Set the root directory to `urs-saas/frontend`
3. Add `NEXT_PUBLIC_API_URL` pointing to your Railway backend URL
4. Deploy

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/signup` - Register
- `POST /api/auth/logout` - Logout

### Profile
- `GET /api/profile` - Get profile
- `PATCH /api/profile` - Update Reddit credentials

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `DELETE /api/projects/{id}` - Delete project

### Jobs
- `POST /api/projects/{id}/jobs` - Create scrape job
- `GET /api/jobs/{id}` - Get job status/results
- `GET /api/jobs/{id}/stream` - SSE progress updates
- `GET /api/jobs/{id}/export` - Export results

### Sharing
- `POST /api/jobs/{id}/share` - Create share link
- `GET /api/share/{token}` - Get shared result (public)

## Trade-offs & Design Decisions

### Made for MVP

1. **Simple Threading over Redis/Celery**: Used Python asyncio for background jobs instead of a full job queue. Simpler to deploy but jobs are lost on server restart.

2. **SQLite-compatible Schema**: While using Supabase (PostgreSQL), the schema is kept simple enough to work with SQLite for local development.

3. **Polling for Progress**: Frontend polls job status every 2 seconds instead of using WebSockets. Simpler implementation, slightly more server load.

4. **Server-side PDF Generation**: PDFs are generated on the backend using WeasyPrint. Could be moved to client-side for reduced server load.

### Future Improvements

1. **Redis Job Queue**: Add proper job queue with Redis for persistence and scalability
2. **WebSocket Updates**: Replace polling with WebSocket for real-time updates
3. **User-provided Reddit Creds**: Currently uses platform creds; could allow users to bring their own
4. **Rate Limiting**: Add proper rate limiting per user
5. **Caching**: Cache Reddit API responses to reduce API calls
6. **Analytics Dashboard**: Add word frequency and wordcloud visualization
7. **Batch Operations**: Allow running multiple scrapes in parallel
8. **Email Notifications**: Notify users when long-running jobs complete

## License

MIT - See [URS Repository](https://github.com/JosephLai241/URS) for the underlying scraper license.
