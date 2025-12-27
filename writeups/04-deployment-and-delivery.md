# Deployment & Delivery

## Requirements

> * Deploy your app and provide a public URL
> * Manage secrets safely (no private keys in client code)
> * Include a clear README:
>   * How to run locally
>   * Architecture
>   * Tradeoffs you made and next steps

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            Internet                                  │
└─────────────────────────────────────────────────────────────────────┘
          │                                    │
          ▼                                    ▼
┌──────────────────┐                ┌──────────────────────┐
│     Vercel       │                │      Railway         │
│  (Frontend)      │───────────────▶│     (Backend)        │
│                  │   API calls    │                      │
│  Next.js 14      │                │  FastAPI + Uvicorn   │
│  Static + SSR    │                │  Docker container    │
└──────────────────┘                └──────────────────────┘
                                              │
                                              ▼
                                    ┌──────────────────────┐
                                    │      Supabase        │
                                    │                      │
                                    │  - PostgreSQL DB     │
                                    │  - Auth service      │
                                    │  - Row Level Security│
                                    └──────────────────────┘
```

---

## 1. Frontend Deployment (Vercel)

**Platform:** Vercel (optimized for Next.js)

### Configuration

- **Root Directory:** `frontend/`
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Node Version:** 18.x

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (Railway) |

**Note:** Only `NEXT_PUBLIC_*` variables are exposed to the browser. No secrets in client code.

---

## 2. Backend Deployment (Railway)

**Platform:** Railway (Docker-based deployment)

### Dockerfile

**File:** `backend/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install WeasyPrint system dependencies (for PDF export)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-xlib-2.0-0 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8000

# Railway provides PORT env var
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

### Environment Variables (Secrets)

| Variable | Description | Source |
|----------|-------------|--------|
| `SUPABASE_URL` | Supabase project URL | Supabase Dashboard |
| `SUPABASE_SERVICE_KEY` | Service role key (full access) | Supabase Dashboard |
| `SUPABASE_ANON_KEY` | Anonymous key | Supabase Dashboard |
| `JWT_SECRET` | JWT signing secret | Supabase Dashboard |
| `ENCRYPTION_KEY` | Fernet key for credential encryption | Generated |
| `FRONTEND_URL` | Vercel URL (for CORS & share links) | Vercel |

**Generating encryption key:**
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

---

## 3. Database (Supabase)

### Tables

```sql
-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    reddit_client_id TEXT,      -- Encrypted
    reddit_client_secret TEXT,  -- Encrypted
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
```

### Row Level Security

RLS is enabled but policies allow service role full access (backend uses service key):

```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access" ON user_profiles FOR ALL USING (true);
-- (similar for other tables)
```

---

## 4. Secret Management

### What's Secret

| Secret | Where Used | Storage |
|--------|------------|---------|
| Supabase keys | Backend only | Railway env vars |
| JWT secret | Backend only | Railway env vars |
| Encryption key | Backend only | Railway env vars |
| Reddit credentials | Per-user | Encrypted in Supabase |

### What's Public

| Value | Exposure |
|-------|----------|
| `NEXT_PUBLIC_API_URL` | Browser (intentional) |
| Supabase URL | Not secret (needs keys to access) |

### Client-Side Safety

```typescript
// frontend/src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Only the API URL is exposed - all secrets stay server-side
// Auth tokens are stored in localStorage (standard practice for SPAs)
```

---

## 5. README

**File:** `README.md`

Includes:
- ✅ Project overview
- ✅ Tech stack
- ✅ Architecture diagram
- ✅ Local setup instructions (backend + frontend)
- ✅ Database setup SQL
- ✅ Deployment instructions (Railway + Vercel)
- ✅ API endpoint documentation
- ✅ Tradeoffs & design decisions
- ✅ Future improvements

### Tradeoffs Documented

1. **Simple Threading over Redis/Celery** - Jobs lost on restart, but simpler deployment
2. **SQLite-compatible Schema** - Could work with SQLite for local dev
3. **Polling for Progress** - Simpler than WebSockets, slightly more server load
4. **Server-side PDF Generation** - Could be client-side to reduce server load

---

## 6. CORS Configuration

**File:** `backend/app/main.py`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,  # From env var
        "http://localhost:3000",
        "https://urs-saas.vercel.app",  # Production frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/Dockerfile` | Container definition |
| `backend/requirements.txt` | Python dependencies |
| `backend/.env.example` | Environment variable template |
| `frontend/.env.example` | Frontend env template |
| `README.md` | Documentation |

---

## Deployment Checklist

- [x] Frontend deployed to Vercel
- [x] Backend deployed to Railway
- [x] Database tables created in Supabase
- [x] Environment variables configured
- [x] CORS configured for production URLs
- [x] README with setup instructions
- [x] No secrets in client code
- [x] Encryption for sensitive user data
