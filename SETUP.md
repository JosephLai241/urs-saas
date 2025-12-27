# URS SAAS Platform - Setup Guide

This guide covers the complete setup and deployment of the URS SAAS platform.

## Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **npm** or **yarn**
- **Git**
- A **Supabase** account (free tier works)
- A **Reddit** account with API credentials

---

## 1. Clone the Repository

```bash
git clone https://github.com/JosephLai241/URS.git
cd URS/urs-saas
```

---

## 2. Supabase Setup

### 2.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization, enter a project name and database password
4. Select a region close to your users
5. Wait for the project to be provisioned

### 2.2 Get Your API Keys

1. Go to **Settings** > **API**
2. Note down:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (for frontend)
   - **service_role** key (for backend - keep this secret!)

### 2.3 Set Up the Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase-setup.sql` and run it
3. This creates:
   - `user_profiles` - Stores Reddit credentials
   - `projects` - User projects
   - `scrape_jobs` - Scrape job records and results
   - `share_links` - Shareable result links
   - Row Level Security policies
   - Auto-create profile trigger

### 2.4 Configure Authentication

1. Go to **Authentication** > **Providers**
2. Ensure **Email** provider is enabled
3. (Optional) Disable "Confirm email" for easier testing:
   - Go to **Authentication** > **Settings**
   - Toggle off "Enable email confirmations"

---

## 3. Reddit API Setup

1. Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
2. Click "Create App" or "Create Another App"
3. Fill in:
   - **Name**: Your app name (e.g., "URS SAAS")
   - **App type**: Select "script"
   - **Redirect URI**: `http://localhost:8000` (not used but required)
4. Click "Create app"
5. Note down:
   - **Client ID**: The string under your app name
   - **Client Secret**: The "secret" field

Users will enter their own Reddit credentials in the app settings.

---

## 4. Backend Setup

### 4.1 Navigate to Backend Directory

```bash
cd backend
```

### 4.2 Create Virtual Environment

```bash
python -m venv venv

# Activate (macOS/Linux)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate
```

### 4.3 Install Dependencies

```bash
pip install -r requirements.txt
```

### 4.4 Configure Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# JWT (use the same secret as Supabase or generate your own)
JWT_SECRET=your-supabase-jwt-secret
JWT_ALGORITHM=HS256

# CORS (frontend URL)
CORS_ORIGINS=http://localhost:3000

# Optional: Set to "development" or "production"
ENVIRONMENT=development
```

To find your Supabase JWT secret:
1. Go to **Settings** > **API**
2. Look for "JWT Settings" > "JWT Secret"

### 4.5 Run the Backend

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.

API documentation is at `http://localhost:8000/docs`.

---

## 5. Frontend Setup

### 5.1 Navigate to Frontend Directory

```bash
cd ../frontend
```

### 5.2 Install Dependencies

```bash
npm install
```

### 5.3 Configure Environment Variables

Create a `.env.local` file in the `frontend` directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 5.4 Run the Frontend

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## 6. First-Time Usage

1. Open `http://localhost:3000` in your browser
2. Click "Sign Up" and create an account
3. After signing in, you'll see a warning about Reddit credentials
4. Go to **Settings** and enter your Reddit API credentials:
   - Client ID
   - Client Secret
   - Reddit Username
5. Create a new **Project**
6. Click "New Scrape" to start scraping!

---

## 7. Deployment

### 7.1 Frontend (Vercel)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Set the **Root Directory** to `urs-saas/frontend`
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` (your deployed backend URL)
5. Deploy

### 7.2 Backend (Railway)

1. Go to [railway.app](https://railway.app) and create a new project
2. Connect your GitHub repository
3. Set the **Root Directory** to `urs-saas/backend`
4. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `JWT_SECRET`
   - `JWT_ALGORITHM=HS256`
   - `CORS_ORIGINS=https://your-frontend-domain.vercel.app`
5. Railway will auto-detect the Dockerfile and deploy

### 7.3 Backend (Render)

1. Go to [render.com](https://render.com) and create a new Web Service
2. Connect your GitHub repository
3. Configure:
   - **Root Directory**: `urs-saas/backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add the same environment variables as above
5. Deploy

### 7.4 Update CORS Origins

After deploying, update your backend's `CORS_ORIGINS` environment variable to include your production frontend URL:

```env
CORS_ORIGINS=https://your-app.vercel.app,http://localhost:3000
```

---

## 8. Docker Deployment (Optional)

### Using Docker Compose

From the `urs-saas` directory:

```bash
# Build and run
docker-compose up --build

# Run in background
docker-compose up -d
```

### Backend Dockerfile

The backend includes a `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for WeasyPrint (PDF export)
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 9. Project Structure

```
urs-saas/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Settings
│   │   ├── database.py          # Supabase client
│   │   ├── auth.py              # JWT authentication
│   │   ├── models.py            # Pydantic schemas
│   │   ├── api/
│   │   │   ├── profile.py       # User profile endpoints
│   │   │   ├── projects.py      # Projects & jobs endpoints
│   │   │   ├── jobs.py          # Job status & export
│   │   │   └── share.py         # Share links
│   │   └── services/
│   │       ├── scraper.py       # URS adapter
│   │       ├── job_runner.py    # Background job execution
│   │       └── export.py        # JSON/Markdown/PDF export
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router pages
│   │   ├── components/          # React components
│   │   └── lib/                 # Utilities & API client
│   ├── package.json
│   └── next.config.js
│
├── supabase-setup.sql           # Database schema
├── docker-compose.yml
└── SETUP.md                     # This file
```

---

## 10. Troubleshooting

### "Not authenticated" errors
- Ensure your JWT_SECRET matches Supabase's JWT secret
- Check that the token is being passed correctly in headers

### Reddit API rate limiting (429 errors)
- Wait a few minutes before retrying
- Consider using multiple Reddit app credentials

### PDF export not working
- Ensure WeasyPrint dependencies are installed (see Dockerfile)
- On macOS: `brew install pango libffi`

### Jobs stuck in "pending"
- Check backend logs for errors
- Verify Reddit credentials are correct in Settings

### Database connection issues
- Verify SUPABASE_URL and SUPABASE_KEY are correct
- Ensure you're using the service_role key (not anon key) for backend

---

## 11. Environment Variables Summary

### Backend (.env)
| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Supabase service_role key |
| `JWT_SECRET` | JWT signing secret (from Supabase) |
| `JWT_ALGORITHM` | `HS256` |
| `CORS_ORIGINS` | Comma-separated allowed origins |

### Frontend (.env.local)
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `NEXT_PUBLIC_API_URL` | Backend API URL |

---

## 12. Support

For issues or questions:
- Open an issue at [github.com/JosephLai241/URS/issues](https://github.com/JosephLai241/URS/issues)
