# Auth & Accounts

## Requirements

> * User signup/login/logout (email/password or OAuth is fine)
> * Protect routes so only authenticated users can access the app
> * Basic account page (name/email, ability to log out)
>
> *Competency signals:* Route protection, session management, error/validation states.

---

## Implementation

### User Signup/Login/Logout

**Authentication Provider:** Supabase Auth (email/password)

#### Backend Endpoints

| Endpoint | File | Description |
|----------|------|-------------|
| `POST /api/auth/signup` | `backend/app/api/auth.py:62-102` | Creates user via Supabase, initializes user_profiles table |
| `POST /api/auth/login` | `backend/app/api/auth.py:34-58` | Authenticates via Supabase, returns JWT |
| `POST /api/auth/logout` | `backend/app/api/auth.py:105-108` | Client-side token discard (stateless JWT) |

#### Frontend Pages

| Page | File | Description |
|------|------|-------------|
| Login | `frontend/src/app/login/page.tsx` | Email/password form with validation |
| Signup | `frontend/src/app/signup/page.tsx` | Registration form with error handling |

#### JWT Verification

The backend supports both **HS256** (symmetric) and **ES256** (asymmetric) JWT algorithms to work with Supabase's token signing:

```python
# backend/app/auth.py:50-98
def verify_token(token: str) -> User:
    # Decode header to check algorithm
    unverified_header = jwt.get_unverified_header(token)
    token_alg = unverified_header.get("alg", "unknown")

    if token_alg == "ES256":
        # Fetch JWKS from Supabase for asymmetric verification
        jwks = get_supabase_jwks()
        # Find matching key and verify
    else:
        # Use JWT secret for symmetric verification
        payload = jwt.decode(token, settings.jwt_secret, ...)
```

---

### Route Protection

#### Backend: Dependency Injection

All protected endpoints use FastAPI's dependency injection with `get_current_user`:

```python
# backend/app/auth.py:115-119
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """Verify JWT token and return current user."""
    return verify_token(credentials.credentials)
```

**Usage in endpoints:**

```python
# backend/app/api/projects.py:30-32
@router.get("", response_model=List[ProjectResponse])
async def list_projects(user: User = Depends(get_current_user)):
    # Only authenticated users reach this code
```

#### Frontend: Auth Context + Redirects

The auth context (`frontend/src/lib/auth.tsx`) manages:
- Token storage in localStorage
- User state across the app
- Automatic redirects for unauthenticated users

```typescript
// frontend/src/app/dashboard/page.tsx:25-29
useEffect(() => {
  if (!authLoading && !user) {
    router.push('/login')
  }
}, [user, authLoading, router])
```

**Protected pages:**
- `/dashboard` - Project list
- `/settings` - Account settings
- `/projects/[id]` - Project details
- `/jobs/[id]` - Job results
- `/scrape/new` - Create new scrape

---

### Account Page (Settings)

**File:** `frontend/src/app/settings/page.tsx`

Features:
- Displays user email
- Reddit API credentials management (encrypted storage)
- Logout button

```typescript
// Settings page shows:
// - User email from auth context
// - Form to add/update Reddit credentials
// - Logout button that clears localStorage and redirects
```

**Credential encryption:** Reddit API credentials are encrypted at rest using Fernet symmetric encryption:

```python
# backend/app/api/profile.py:20-35
def encrypt_value(value: str) -> str:
    cipher = get_cipher()
    return cipher.encrypt(value.encode()).decode()

def decrypt_value(value: str) -> str:
    cipher = get_cipher()
    return cipher.decrypt(value.encode()).decode()
```

---

### Error/Validation States

#### Login Error Handling

```typescript
// frontend/src/app/login/page.tsx:44-47
{error && (
  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
    {error}
  </div>
)}
```

#### Backend Validation

- Pydantic models validate request bodies
- HTTPException with appropriate status codes
- Error logging for debugging

```python
# backend/app/api/auth.py:52-57
except Exception as e:
    logger.error(f"Login failed for {request.email}: {e}")

raise HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid email or password",
)
```

---

## Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   FastAPI    │────▶│   Supabase   │
│  Login Form  │     │  /api/auth   │     │     Auth     │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │                    │                    ▼
       │                    │              ┌──────────┐
       │                    │◀─────────────│   JWT    │
       │                    │              └──────────┘
       │◀───────────────────│
       │     JWT Token      │
       ▼
┌──────────────┐
│ localStorage │
│  (token)     │
└──────────────┘
```

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/app/auth.py` | JWT verification, user extraction |
| `backend/app/api/auth.py` | Login/signup/logout endpoints |
| `backend/app/api/profile.py` | User profile & credentials |
| `frontend/src/lib/auth.tsx` | Auth context, token management |
| `frontend/src/app/login/page.tsx` | Login UI |
| `frontend/src/app/signup/page.tsx` | Signup UI |
| `frontend/src/app/settings/page.tsx` | Account settings UI |
