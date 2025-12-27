'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import * as api from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatNumber, formatTimestamp, truncateText } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function SharedResultPage() {
  const params = useParams()
  const token = params.token as string

  const [result, setResult] = useState<{
    job_type: api.JobType
    config: Record<string, unknown>
    result_data: Record<string, unknown>
    created_at: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (token) {
      loadResult()
    }
  }, [token])

  const loadResult = async () => {
    try {
      const data = await api.getSharedResult(token)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shared result')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading shared result...</div>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">🔗</div>
            <h1 className="text-xl font-bold mb-2 text-foreground">Share Link Not Found</h1>
            <p className="text-muted-foreground mb-4">
              {error || 'This share link may have expired or been revoked.'}
            </p>
            <Link href="/" className="text-reddit hover:underline">
              Go to URS
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-reddit rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">U</span>
            </div>
            <span className="font-bold text-xl text-foreground">URS</span>
            <Badge variant="secondary">Shared Result</Badge>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <Link href="/" className="text-sm text-muted-foreground hover:text-reddit">
              Create your own scrapes
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>
              {result.job_type === 'subreddit' && `r/${(result.config as any).subreddit}`}
              {result.job_type === 'redditor' && `u/${(result.config as any).username}`}
              {result.job_type === 'comments' && truncateText(
                (result.result_data?.data as any)?.submission_metadata?.title || 'Comment Thread',
                50
              )}
            </CardTitle>
            <CardDescription>
              {result.job_type.charAt(0).toUpperCase() + result.job_type.slice(1)} scrape
              {result.job_type === 'subreddit' && ` • ${(result.config as any).category}`}
              {' • '}Scraped {formatDate(result.created_at)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result.job_type === 'subreddit' && (
              <SubredditResults data={result.result_data} />
            )}
            {result.job_type === 'redditor' && (
              <RedditorResults data={result.result_data} />
            )}
            {result.job_type === 'comments' && (
              <CommentsResults data={result.result_data} />
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Shared via{' '}
          <Link href="/" className="text-reddit hover:underline">
            URS - Universal Reddit Scraper
          </Link>
        </div>
      </main>
    </div>
  )
}

// Reuse the same result components from the job page
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
        <h3 className="font-medium text-foreground mb-2">Submissions ({submissions.length})</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {submissions.slice(0, 20).map((post: any, i: number) => (
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
        <h3 className="font-medium text-foreground">{meta.title}</h3>
        <div className="text-sm text-muted-foreground mt-1">
          {meta.author} • {formatNumber(meta.score || 0)} points • {totalComments} comments
          {meta.created_utc && ` • ${formatTimestamp(meta.created_utc)}`}
        </div>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
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
