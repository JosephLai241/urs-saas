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
- **Scraping**: URS/PRAW (Python Reddit API Wrapper)
- **Deployment**: Vercel (frontend) + Railway (backend)

______________________________________________________________________

## Getting Started

### Prerequisites

- Node.js 18+ and Python 3.11+ (for manual setup), or Docker (for containerized setup)
- A Supabase project (free tier works)
- Vercel and Railway accounts (for deployment)
- Reddit API credentials ([create app here](https://www.reddit.com/prefs/apps))

### 1. Database Setup (Supabase)

1. Create a new project at [supabase.com](https://supabase.com)
1. Go to SQL Editor and run:

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

3. Get your credentials from the following Settings sections:
   - Data API
     - **Project URL** (`SUPABASE_URL`)
   - API Keys > Legacy anon, service_role API keys
     - **anon public key** (`SUPABASE_ANON_KEY`)
     - **service_role secret** (`SUPABASE_SERVICE_KEY`)
   - JWT Keys > Legacy JWT Secret
     - **JWT Secret** (`JWT_SECRET`)

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Install dev dependencies (for formatting/linting/testing)
pip install black isort ruff pytest pytest-asyncio pytest-cov httpx
```

#### System Dependencies (for PDF export)

If you want PDF export to work locally, install WeasyPrint dependencies:

**macOS:**

```bash
brew install pango libffi gdk-pixbuf
```

**Ubuntu/Debian:**

```bash
sudo apt-get install libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf-xlib-2.0-0 libffi-dev shared-mime-info
```

**Windows:** See [WeasyPrint docs](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#installation)

#### Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# JWT Secret (from Supabase Dashboard > Settings > API > JWT Keys > Legacy JWT Secret)
# Note: Supabase uses ES256 algorithm with JWKS for token verification.
# The backend supports both ES256 (via JWKS) and HS256 (via this secret).
JWT_SECRET=your-jwt-secret

# Encryption key for Reddit credentials storage
# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY=your-fernet-key

# Frontend URL (for CORS and share link generation)
FRONTEND_URL=http://localhost:3000
```

#### Run the Server

```bash
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000

API docs available at http://localhost:8000/docs

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Run Development Server

```bash
npm run dev
```

The app will be available at http://localhost:3000

### 4. Local Development with Docker (Alternative)

Instead of running the backend and frontend separately, you can use Docker Compose to spin up both services:

1. Create a `.env` file in the project root with your credentials:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-fernet-key

# Frontend Supabase (public)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

2. Build and start both services:

```bash
docker-compose up --build
```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

To run in detached mode:

```bash
docker-compose up -d --build
```

To stop the services:

```bash
docker-compose down
```

______________________________________________________________________

## Development

### Code Formatting & Linting

**Backend (Python):**

```bash
cd backend

# Format code
black app/ tests/
isort app/ tests/

# Lint
ruff check app/

# All checks
black --check app/ && isort --check-only app/ && ruff check app/
```

**Frontend (TypeScript):**

```bash
cd frontend

# Format
npx prettier --write "src/**/*.{ts,tsx}"

# Lint
npx eslint src/ --ext .ts,.tsx

# Check formatting
npx prettier --check "src/**/*.{ts,tsx}"
```

### Running Tests

**Backend:**

```bash
cd backend
pytest tests/ -v --cov=app
```

**Frontend:**

```bash
cd frontend
npm test
```

______________________________________________________________________

## Deployment

### Backend (Railway)

1. Create a new project on [Railway](https://railway.app)
1. Connect your GitHub repo
1. Set the root directory to `backend`
1. Railway will detect the Dockerfile automatically
1. Add environment variables:

| Variable               | Description                                                    |
| ---------------------- | -------------------------------------------------------------- |
| `SUPABASE_URL`         | Your Supabase project URL                                      |
| `SUPABASE_SERVICE_KEY` | Supabase service role key                                      |
| `JWT_SECRET`           | JWT secret from Supabase                                       |
| `ENCRYPTION_KEY`       | Fernet key for credential encryption                           |
| `FRONTEND_URL`         | Your Vercel frontend URL (e.g., `https://your-app.vercel.app`) |

**Note:** Railway automatically sets the `PORT` environment variable. The Dockerfile uses `${PORT:-8000}`.

### Frontend (Vercel)

1. Import project on [Vercel](https://vercel.com)
1. Set the root directory to `frontend`
1. Add environment variables:

| Variable                        | Description                                                            |
| ------------------------------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`           | Your Railway backend URL (e.g., `https://your-backend.up.railway.app`) |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL                                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key                                               |

4. Deploy

______________________________________________________________________

## CI/CD

GitHub Actions workflows are included:

- **Backend CI** (`.github/workflows/backend-ci.yml`):

  - Linting: Black, isort, Ruff
  - Tests: pytest with coverage

- **Frontend CI** (`.github/workflows/frontend-ci.yml`):

  - Linting: Prettier, ESLint
  - Build verification
  - Tests: Jest

______________________________________________________________________

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/signup` - Register new account

### Profile

- `GET /api/profile` - Get user profile
- `PATCH /api/profile` - Update Reddit credentials

### Projects

- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create project
- `PATCH /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project

### Jobs

- `POST /api/projects/{id}/jobs` - Create scrape job
- `GET /api/projects/{id}/jobs` - List project jobs
- `GET /api/jobs/{id}` - Get job status/results
- `GET /api/jobs/{id}/stream` - SSE progress updates
- `GET /api/jobs/{id}/export?format={json|markdown|pdf}` - Export results
- `DELETE /api/jobs/{id}` - Delete job

### Sharing

- `POST /api/jobs/{id}/share` - Create share link
- `GET /api/share/{token}` - Get shared result (public, no auth required)

### Health

- `GET /api/health` - Health check

______________________________________________________________________

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:

1. Ensure `FRONTEND_URL` is set correctly in backend `.env`
1. Include the full URL with protocol (e.g., `https://your-app.vercel.app`)
1. Don't include trailing slashes
1. For local dev, use `http://localhost:3000`

### JWT/Authentication Errors

The backend supports two JWT algorithms:

- **ES256**: Used by Supabase, verified via JWKS endpoint
- **HS256**: Fallback using `JWT_SECRET`

If you see "Could not validate credentials":

1. Check that `SUPABASE_URL` is correct (needed for JWKS)
1. Verify `JWT_SECRET` matches Supabase settings
1. Check browser DevTools > Application > Local Storage for the token

### PDF Export Fails

PDF export requires WeasyPrint system dependencies:

- **Docker/Railway**: Already included in Dockerfile
- **Local development**: Install system packages (see Backend Setup)

If PDF fails, the API returns Markdown as fallback.

### Reddit API Errors

If scraping fails:

1. Verify Reddit credentials in Settings page
1. Check that your Reddit app is a "script" type app
1. Ensure the Reddit username matches the app owner

______________________________________________________________________

## Trade-offs & Design Decisions

### Made for MVP

1. **Simple Threading over Redis/Celery**: Used Python asyncio for background jobs instead of a full job queue. Simpler to deploy but jobs are lost on server restart.

1. **Polling for Progress**: Frontend polls job status every 3 seconds instead of using WebSockets. Simpler implementation, slightly more server load.

1. **Per-user Reddit Credentials**: Users provide their own Reddit API credentials, stored encrypted. This avoids platform rate limits but requires user setup.

### Security Considerations

- Reddit credentials encrypted with Fernet (symmetric encryption)
- JWT verification supports Supabase's ES256 algorithm
- Share links use cryptographically random tokens
- All API endpoints (except share links) require authentication
- CORS restricted to configured frontend URL

______________________________________________________________________

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/           # API route handlers
│   │   ├── services/      # Business logic (scraper, export, job runner)
│   │   ├── auth.py        # JWT verification
│   │   ├── config.py      # Settings management
│   │   ├── database.py    # Supabase client
│   │   ├── main.py        # FastAPI app
│   │   └── models.py      # Pydantic schemas
│   ├── tests/             # pytest tests
│   ├── Dockerfile
│   ├── requirements.txt
│   └── pyproject.toml     # Tool configuration
│
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js pages (App Router)
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities, API client, auth
│   │   └── __tests__/     # Jest tests
│   ├── jest.config.js
│   ├── package.json
│   └── .eslintrc.json
│
├── writeups/              # Requirements documentation
├── .github/workflows/     # CI/CD
└── README.md
```

______________________________________________________________________

## License

MIT - See [URS Repository](https://github.com/JosephLai241/URS) for the underlying scraper license.
