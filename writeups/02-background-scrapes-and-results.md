# Background Scrapes & Results Viewing

## Requirements

> What would be useful for users to see here? How do they run and monitor scrapes? How do they export output?
> What adds value for them. How do jobs continue to run in the background?

---

## Implementation

### User Flow

```
Dashboard → Create Project → New Scrape → Configure → Submit → Monitor Progress → View Results
```

### Running Scrapes

#### 1. Project Organization

Users organize scrapes into projects for better management:

**File:** `frontend/src/app/dashboard/page.tsx`

- Create/delete projects
- View job counts per project (completed, running, failed, pending)
- Edit project descriptions inline

#### 2. Scrape Configuration

**File:** `frontend/src/app/scrape/new/page.tsx`

Three scrape types supported:

| Type | Configuration | What it scrapes |
|------|--------------|-----------------|
| **Subreddit** | Name, category (hot/new/top/rising/controversial), limit, time filter | Posts from a subreddit |
| **Redditor** | Username, limit | User profile, submissions, comments |
| **Comments** | Reddit URL, limit | Full comment thread with tree structure |

```typescript
// Subreddit config example
{
  subreddit: "python",
  category: "hot",
  limit: 25,
  time_filter: "week"  // for top/controversial
}
```

#### 3. Background Job Execution

**File:** `backend/app/services/job_runner.py`

Jobs run asynchronously using Python's `asyncio` with a thread pool for PRAW (synchronous library):

```python
# Thread pool for running synchronous scraper code
_executor = ThreadPoolExecutor(max_workers=4)

async def start_scrape_job(job_id: str, user_id: str):
    """Start a scrape job in the background."""
    loop = asyncio.get_event_loop()
    task = loop.create_task(_run_scrape_job(job_id, user_id))

    # Track task for potential cancellation
    from app.main import background_jobs
    background_jobs[job_id] = task
```

The actual scraping runs in a thread to avoid blocking:

```python
result = await loop.run_in_executor(
    _executor,
    partial(scraper.scrape_subreddit, ...),
)
```

---

### Monitoring Progress

#### Real-time Progress Updates

**Backend:** Jobs update their progress in the database:

```python
# backend/app/services/job_runner.py
def progress_callback(current: int, total: int, message: str):
    supabase.table("scrape_jobs").update({
        "progress": int((current / total) * 100),
    }).eq("id", job_id).execute()
```

**Frontend:** Polls for updates every 2 seconds while job is running:

```typescript
// frontend/src/app/jobs/[id]/page.tsx:85-96
useEffect(() => {
  if (!job || job.status !== 'running') return

  const interval = setInterval(async () => {
    const updated = await loadJob()
    if (updated && updated.status !== 'running') {
      clearInterval(interval)
    }
  }, 2000)

  return () => clearInterval(interval)
}, [job?.status, loadJob])
```

#### Progress Bar UI

```typescript
// Visual progress indicator
<div className="w-full bg-secondary rounded-full h-3">
  <div
    className="bg-reddit rounded-full h-3 transition-all"
    style={{ width: `${job.progress}%` }}
  />
</div>
```

#### Job States

| Status | Badge Color | Description |
|--------|-------------|-------------|
| `pending` | Gray | Job created, waiting to start |
| `running` | Yellow | Currently scraping |
| `completed` | Green | Finished successfully |
| `failed` | Red | Error occurred |
| `cancelled` | Outline | User cancelled |

---

### Viewing Results

#### Results Display

**File:** `frontend/src/app/jobs/[id]/page.tsx`

Three specialized result viewers based on job type:

**1. SubredditResults** (lines 304-336)
- List of posts with title, author, score, comments count
- Links to Reddit
- NSFW badge
- Selftext preview

**2. RedditorResults** (lines 338-399)
- Karma stats (link karma, comment karma)
- Recent submissions list
- Recent comments list
- Timestamps

**3. CommentsResults** (lines 401-468)
- Submission metadata (title, author, subreddit, score)
- Nested comment tree with collapsible replies
- Author, score, timestamp per comment

#### Comment Tree Rendering

```typescript
function CommentItem({ comment, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 2)

  return (
    <div className={`border-l-2 border-border pl-4 ${depth > 0 ? 'ml-4' : ''}`}>
      {/* Comment content */}
      {comment.replies?.length > 0 && (
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Hide' : 'Show'} {comment.replies.length} replies
        </button>
      )}
      {expanded && comment.replies?.map((reply) => (
        <CommentItem comment={reply} depth={depth + 1} />
      ))}
    </div>
  )
}
```

---

### What Adds Value for Users

1. **Project Organization** - Group related scrapes together
2. **Real-time Progress** - See scraping progress without refreshing
3. **Error Context** - User-friendly error messages for common issues:
   - Rate limiting
   - Private subreddits
   - Deleted users
   - Invalid credentials

```python
# backend/app/services/job_runner.py - Error message formatting
if isinstance(e, prawcore.exceptions.TooManyRequests):
    return "Reddit rate limit exceeded. Please wait a few minutes..."
if isinstance(e, prawcore.exceptions.Forbidden):
    return "Access denied. The subreddit may be private..."
```

4. **Retry Failed Jobs** - One-click retry for failed scrapes
5. **Job History** - All jobs saved with timestamps

---

### Export Options

Three export formats available:

| Format | Description | Use Case |
|--------|-------------|----------|
| **JSON** | Raw structured data | Data analysis, further processing |
| **Markdown** | Human-readable document | Documentation, sharing |
| **PDF** | Styled printable document | Reports, archiving |

**Backend:** `backend/app/services/export.py`
**Frontend:** Export buttons in job detail page

```typescript
<Button onClick={() => handleExport('json')}>JSON</Button>
<Button onClick={() => handleExport('markdown')}>Markdown</Button>
<Button onClick={() => handleExport('pdf')}>PDF</Button>
```

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/app/services/job_runner.py` | Background job execution |
| `backend/app/services/scraper.py` | PRAW wrapper for Reddit API |
| `backend/app/api/projects.py` | Project & job CRUD |
| `frontend/src/app/scrape/new/page.tsx` | Scrape configuration UI |
| `frontend/src/app/jobs/[id]/page.tsx` | Job progress & results |
| `frontend/src/app/projects/[id]/page.tsx` | Project job list |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ New      │  │ Project  │  │ Job      │  │ Results Viewer   │ │
│  │ Scrape   │─▶│ Page     │─▶│ Detail   │─▶│ (per job type)   │ │
│  │ Form     │  │          │  │          │  │                  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ POST /jobs   │───▶│ Job Runner   │───▶│ Scraper Service  │   │
│  │              │    │ (asyncio)    │    │ (PRAW)           │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
│         │                   │                     │              │
│         ▼                   ▼                     ▼              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                     Supabase                             │    │
│  │  scrape_jobs: id, status, progress, result_data, ...   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```
