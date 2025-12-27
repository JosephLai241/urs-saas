'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import * as api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  subreddit: 'Subreddit Scrape',
  redditor: 'Redditor Scrape',
  comments: 'Comments Scrape',
}

function getJobTarget(job: api.Job): string {
  const config = job.config as any
  switch (job.job_type) {
    case 'subreddit':
      return `r/${config.subreddit}`
    case 'redditor':
      return `u/${config.username}`
    case 'comments':
      // Try to get title from result data (for completed jobs)
      const title = (job.result_data?.data as any)?.submission_metadata?.title
      if (title) {
        return truncateText(title, 60)
      }
      // Fallback to URL
      return config.url ? truncateText(config.url, 60) : 'Comment Thread'
    default:
      return 'Unknown'
  }
}

function getJobDetails(job: api.Job): string {
  const config = job.config as any
  switch (job.job_type) {
    case 'subreddit':
      const category = config.category?.charAt(0).toUpperCase() + config.category?.slice(1) || 'Hot'
      return `Category: ${category} · Results: ${config.limit || 25}`
    case 'redditor':
      return `Results: ${config.limit || 25}`
    case 'comments':
      const limit = config.limit
      return `Comments: ${!limit || limit === 0 ? 'All' : limit}`
    default:
      return ''
  }
}

export default function ProjectPage() {
  const { user, token, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<api.Project | null>(null)
  const [jobs, setJobs] = useState<api.Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editDescription, setEditDescription] = useState('')

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

  const handleEditDescription = () => {
    setEditDescription(project?.description || '')
    setIsEditingDescription(true)
  }

  const handleSaveDescription = async () => {
    if (!token || !project) return

    try {
      const updated = await api.updateProject(token, project.id, { description: editDescription })
      setProject(updated)
      setIsEditingDescription(false)
    } catch (error) {
      console.error('Failed to update project:', error)
    }
  }

  const handleCancelEdit = () => {
    setIsEditingDescription(false)
    setEditDescription('')
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
            {isEditingDescription ? (
              <div className="mt-2 flex items-center space-x-2">
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Add a project description..."
                  className="w-80"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveDescription()
                    if (e.key === 'Escape') handleCancelEdit()
                  }}
                />
                <Button size="sm" variant="reddit" onClick={handleSaveDescription}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            ) : (
              <p
                className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={handleEditDescription}
                title="Click to edit description"
              >
                {project?.description || 'No description (click to add)'}
              </p>
            )}
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
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <Badge variant={statusColors[job.status] as any} className="mt-1">
                        {job.status}
                      </Badge>
                      <div className="space-y-1">
                        {/* Line 1: Scrape type (larger text) */}
                        <Link
                          href={`/jobs/${job.id}`}
                          className="text-lg font-semibold hover:text-reddit transition-colors block"
                        >
                          {jobTypeLabels[job.job_type]}
                        </Link>
                        {/* Line 2: Target */}
                        <div className="text-foreground">
                          {getJobTarget(job)}
                        </div>
                        {/* Line 3: Additional details */}
                        <div className="text-sm text-muted-foreground">
                          {getJobDetails(job)} · Created {formatDate(job.created_at)}
                          {job.status === 'running' && ` · ${job.progress}% complete`}
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
