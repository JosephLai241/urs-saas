'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import * as api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatNumber, formatTimestamp, truncateText } from '@/lib/utils'
import { Header } from '@/components/layout/Header'

const statusColors: Record<api.JobStatus, string> = {
  pending: 'secondary',
  running: 'warning',
  completed: 'success',
  failed: 'destructive',
  cancelled: 'outline',
}

function getCommentsTitle(job: api.Job): string {
  // Try to get title from result data (for completed jobs)
  const title = (job.result_data?.data as any)?.submission_metadata?.title
  if (title) {
    return truncateText(title, 50)
  }
  // Fallback: extract subreddit from URL if possible
  const url = (job.config as any)?.url || ''
  const match = url.match(/\/r\/([^/]+)/)
  if (match) {
    return `r/${match[1]} post`
  }
  return 'Comment Thread'
}

export default function JobPage() {
  const { user, token, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const [job, setJob] = useState<api.Job | null>(null)
  const [project, setProject] = useState<api.Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  const loadJob = useCallback(async () => {
    if (!token) return
    try {
      const data = await api.getJob(token, jobId)
      setJob(data)

      // Load project info for breadcrumbs
      if (data.project_id && !project) {
        const projects = await api.getProjects(token)
        const proj = projects.find(p => p.id === data.project_id)
        if (proj) setProject(proj)
      }

      return data
    } catch (error) {
      console.error('Failed to load job:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [token, jobId, project])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (token && jobId) {
      loadJob()
    }
  }, [token, jobId, loadJob])

  // Poll for updates while running
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

  const handleShare = async () => {
    if (!token || !jobId) return
    setIsSharing(true)
    try {
      const share = await api.createShareLink(token, jobId)
      setShareUrl(share.url)
    } catch (error) {
      console.error('Failed to create share link:', error)
    } finally {
      setIsSharing(false)
    }
  }

  const handleExport = () => {
    if (!token) return
    const url = api.getExportUrl(token, jobId)
    window.open(`${url}&token=${token}`, '_blank')
  }

  const handleRetry = async () => {
    if (!token || !job) return
    setIsRetrying(true)
    try {
      const newJob = await api.createJob(token, job.project_id, {
        job_type: job.job_type,
        config: job.config,
      })
      router.push(`/jobs/${newJob.id}`)
    } catch (error) {
      console.error('Failed to retry job:', error)
    } finally {
      setIsRetrying(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!isLoading && !job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-foreground">Job not found</h1>
          <Link href="/dashboard">
            <Button variant="reddit">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Breadcrumb */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">Projects</Link>
            <span className="text-muted-foreground">/</span>
            {job && project && (
              <>
                <Link href={`/projects/${job.project_id}`} className="text-muted-foreground hover:text-foreground">
                  {project.name}
                </Link>
                <span className="text-muted-foreground">/</span>
              </>
            )}
            <span className="font-medium text-foreground">
              {job ? (
                <>
                  {job.job_type === 'subreddit' && `r/${(job.config as any).subreddit}`}
                  {job.job_type === 'redditor' && `u/${(job.config as any).username}`}
                  {job.job_type === 'comments' && getCommentsTitle(job)}
                </>
              ) : 'Job Details'}
            </span>
          </div>
          {job && (
            <Link href={`/projects/${job.project_id}`}>
              <Button variant="outline" size="sm">Back to Project</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main */}
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading job...</div>
        ) : job && (
          <div className="space-y-6">
            {/* Job Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-3">
                      <span>
                        {job.job_type === 'subreddit' && `r/${(job.config as any).subreddit}`}
                        {job.job_type === 'redditor' && `u/${(job.config as any).username}`}
                        {job.job_type === 'comments' && getCommentsTitle(job)}
                      </span>
                      <Badge variant={statusColors[job.status] as any}>
                        {job.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {job.job_type.charAt(0).toUpperCase() + job.job_type.slice(1)} scrape
                      {job.job_type === 'subreddit' && ` • ${(job.config as any).category}`}
                      {' • '}Created {formatDate(job.created_at)}
                    </CardDescription>
                  </div>
                  {job.status === 'completed' && (
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={handleShare} disabled={isSharing}>
                        {isSharing ? 'Creating...' : 'Share'}
                      </Button>
                      <Button variant="reddit" size="sm" onClick={handleExport}>
                        Export JSON
                      </Button>
                    </div>
                  )}
                  {job.status === 'failed' && (
                    <Button variant="reddit" size="sm" onClick={handleRetry} disabled={isRetrying}>
                      {isRetrying ? 'Retrying...' : 'Retry'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {job.status === 'running' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-foreground">
                      <span>Progress</span>
                      <span>{job.progress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-3">
                      <div
                        className="bg-reddit rounded-full h-3 transition-all"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {job.error_message && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-md">
                    <strong>Error:</strong> {job.error_message}
                  </div>
                )}

                {shareUrl && (
                  <div className="bg-green-500/10 text-green-500 p-3 rounded-md">
                    <strong>Share URL:</strong>{' '}
                    <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="text-reddit hover:underline">
                      {shareUrl}
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2"
                      onClick={() => navigator.clipboard.writeText(shareUrl)}
                    >
                      Copy
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results */}
            {job.status === 'completed' && job.result_data && (
              <Card>
                <CardHeader>
                  <CardTitle>Results</CardTitle>
                  <CardDescription>
                    Scraped at {formatDate(job.result_data.scraped_at as string)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {job.job_type === 'subreddit' && (
                    <SubredditResults data={job.result_data} />
                  )}
                  {job.job_type === 'redditor' && (
                    <RedditorResults data={job.result_data} />
                  )}
                  {job.job_type === 'comments' && (
                    <CommentsResults data={job.result_data} />
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function SubredditResults({ data }: { data: Record<string, unknown> }) {
  const posts = (data.data as any[]) || []

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">{posts.length} posts</div>
      {posts.map((post, i) => (
        <div key={i} className="border border-border rounded-lg p-4 hover:bg-muted/50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <a
                href={`https://reddit.com${post.permalink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:text-reddit"
              >
                {post.title}
              </a>
              <div className="text-sm text-muted-foreground mt-1">
                {post.author} • {formatNumber(post.score)} points • {post.num_comments} comments
                {post.created_utc && ` • ${formatTimestamp(post.created_utc)}`}
              </div>
            </div>
            {post.nsfw && <Badge variant="destructive">NSFW</Badge>}
          </div>
          {post.selftext && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{post.selftext}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function RedditorResults({ data }: { data: Record<string, unknown> }) {
  const userData = data.data as any
  const info = userData?.information || {}
  const submissions = userData?.submissions || []
  const comments = userData?.comments || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-2xl font-bold text-foreground">{formatNumber(info.link_karma || 0)}</div>
          <div className="text-sm text-muted-foreground">Link Karma</div>
        </div>
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-2xl font-bold text-foreground">{formatNumber(info.comment_karma || 0)}</div>
          <div className="text-sm text-muted-foreground">Comment Karma</div>
        </div>
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-2xl font-bold text-foreground">{submissions.length + comments.length}</div>
          <div className="text-sm text-muted-foreground">Items Scraped</div>
        </div>
      </div>

      <div>
        <h3 className="font-medium text-foreground mb-2">Recent Submissions ({submissions.length})</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {submissions.slice(0, 10).map((post: any, i: number) => (
            <div key={i} className="text-sm p-2 bg-muted rounded">
              <a
                href={`https://reddit.com${post.permalink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-reddit"
              >
                {post.title}
              </a>
              <div className="text-muted-foreground">
                {formatNumber(post.score)} pts
                {post.created_utc && ` • ${formatTimestamp(post.created_utc)}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-medium text-foreground mb-2">Recent Comments ({comments.length})</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {comments.slice(0, 10).map((comment: any, i: number) => (
            <div key={i} className="text-sm p-2 bg-muted rounded">
              <p className="line-clamp-2 text-foreground">{comment.body}</p>
              <div className="text-muted-foreground">
                {formatNumber(comment.score)} pts
                {comment.created_utc && ` • ${formatTimestamp(comment.created_utc)}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CommentsResults({ data }: { data: Record<string, unknown> }) {
  const resultData = data.data as any
  const meta = resultData?.submission_metadata || {}
  const comments = resultData?.comments || []
  const totalComments = resultData?.total_comments || 0

  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted rounded-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <a
              href={`https://reddit.com${meta.permalink}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-reddit"
            >
              {meta.title}
            </a>
            <div className="text-sm text-muted-foreground mt-1">
              r/{meta.subreddit} • u/{meta.author} • {formatNumber(meta.score || 0)} points • {totalComments} comments
              {meta.created_utc && ` • ${formatTimestamp(meta.created_utc)}`}
            </div>
          </div>
          {meta.nsfw && <Badge variant="destructive">NSFW</Badge>}
        </div>
        {meta.selftext && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-3">{meta.selftext}</p>
        )}
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {comments.map((comment: any, i: number) => (
          <CommentItem key={i} comment={comment} />
        ))}
      </div>
    </div>
  )
}

function CommentItem({ comment, depth = 0 }: { comment: any; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2)

  return (
    <div className={`border-l-2 border-border pl-4 ${depth > 0 ? 'ml-4' : ''}`}>
      <div className="py-2">
        <div className="text-sm text-muted-foreground">
          {comment.author} • {formatNumber(comment.score)} pts
          {comment.created_utc && ` • ${formatTimestamp(comment.created_utc)}`}
        </div>
        <p className="text-sm mt-1 text-foreground">{comment.body}</p>

        {comment.replies?.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-reddit mt-1 hover:underline"
          >
            {expanded ? 'Hide' : 'Show'} {comment.replies.length} replies
          </button>
        )}
      </div>

      {expanded && comment.replies?.map((reply: any, i: number) => (
        <CommentItem key={i} comment={reply} depth={depth + 1} />
      ))}
    </div>
  )
}
