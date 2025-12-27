'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import * as api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, truncateText } from '@/lib/utils'
import { Header } from '@/components/layout/Header'

const statusColors: Record<api.JobStatus, string> = {
  pending: 'secondary',
  running: 'warning',
  completed: 'success',
  failed: 'destructive',
  cancelled: 'outline',
}

const jobTypeLabels: Record<api.JobType, string> = {
  subreddit: 'Subreddit',
  redditor: 'Redditor',
  comments: 'Comments',
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

export default function ProjectPage() {
  const { user, token, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<api.Project | null>(null)
  const [jobs, setJobs] = useState<api.Job[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const loadData = useCallback(async () => {
    if (!token) return
    try {
      const [projectData, jobsData] = await Promise.all([
        api.getProjects(token).then(ps => ps.find(p => p.id === projectId)),
        api.getProjectJobs(token, projectId),
      ])
      setProject(projectData || null)
      setJobs(jobsData)
    } catch (error) {
      console.error('Failed to load project:', error)
    } finally {
      setIsLoading(false)
    }
  }, [token, projectId])

  useEffect(() => {
    if (token && projectId) {
      loadData()
    }
  }, [token, projectId, loadData])

  // Poll for updates when there are running or pending jobs
  useEffect(() => {
    const hasActiveJobs = jobs.some(job => job.status === 'running' || job.status === 'pending')
    if (!hasActiveJobs || !token) return

    const interval = setInterval(() => {
      loadData()
    }, 3000)

    return () => clearInterval(interval)
  }, [jobs, token, loadData])

  const handleDeleteJob = async (jobId: string) => {
    if (!token || !confirm('Are you sure you want to delete this job?')) return

    try {
      await api.deleteJob(token, jobId)
      setJobs(jobs.filter(j => j.id !== jobId))
    } catch (error) {
      console.error('Failed to delete job:', error)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!isLoading && !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-foreground">Project not found</h1>
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
            <span className="font-medium text-foreground">{project?.name || 'Loading...'}</span>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">Back to Projects</Button>
          </Link>
        </div>
      </div>

      {/* Main */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{project?.name}</h1>
            <p className="text-muted-foreground">{project?.description || 'Manage scrape jobs for this project'}</p>
          </div>
          <Link href={`/scrape/new?project=${projectId}`}>
            <Button variant="reddit">New Scrape</Button>
          </Link>
        </div>

        {/* Jobs List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No scrape jobs yet. Start your first scrape!</p>
              <Link href={`/scrape/new?project=${projectId}`}>
                <Button variant="reddit">New Scrape</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Badge variant={statusColors[job.status] as any}>
                        {job.status}
                      </Badge>
                      <div>
                        <Link
                          href={`/jobs/${job.id}`}
                          className="font-medium hover:text-reddit transition-colors"
                        >
                          {jobTypeLabels[job.job_type]}:{' '}
                          {job.job_type === 'subreddit' && `r/${(job.config as any).subreddit}`}
                          {job.job_type === 'redditor' && `u/${(job.config as any).username}`}
                          {job.job_type === 'comments' && getCommentsTitle(job)}
                        </Link>
                        <div className="text-sm text-muted-foreground">
                          Created {formatDate(job.created_at)}
                          {job.status === 'running' && ` • ${job.progress}% complete`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {job.status === 'running' && (
                        <div className="w-24 bg-secondary rounded-full h-2">
                          <div
                            className="bg-reddit rounded-full h-2 transition-all"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                      )}
                      <Link href={`/jobs/${job.id}`}>
                        <Button variant="outline" size="sm">
                          {job.status === 'completed' ? 'View Results' : 'View'}
                        </Button>
                      </Link>
                      {job.status !== 'running' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteJob(job.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                  {job.error_message && (
                    <div className="mt-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                      Error: {job.error_message}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
