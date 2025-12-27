const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface FetchOptions extends RequestInit {
  token?: string
}

async function fetchAPI<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }))
    throw new Error(error.detail || 'An error occurred')
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

// Auth
export async function login(email: string, password: string) {
  return fetchAPI<{ access_token: string; user: { id: string; email: string } }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function signup(email: string, password: string) {
  return fetchAPI<{ access_token: string; user: { id: string; email: string } }>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

// Profile
export async function getProfile(token: string) {
  return fetchAPI<{
    id: string
    email: string
    has_reddit_credentials: boolean
    reddit_username?: string
  }>('/api/profile', { token })
}

export async function updateProfile(token: string, data: {
  reddit_client_id?: string
  reddit_client_secret?: string
  reddit_username?: string
}) {
  return fetchAPI('/api/profile', {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  })
}

// Projects
export interface JobCounts {
  total: number
  completed: number
  running: number
  failed: number
  pending: number
}

export interface Project {
  id: string
  user_id: string
  name: string
  description?: string
  created_at: string
  job_count: number
  job_counts: JobCounts
}

export async function getProjects(token: string): Promise<Project[]> {
  return fetchAPI('/api/projects', { token })
}

export async function createProject(token: string, data: { name: string; description?: string }) {
  return fetchAPI<Project>('/api/projects', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  })
}

export async function deleteProject(token: string, projectId: string) {
  return fetchAPI(`/api/projects/${projectId}`, {
    method: 'DELETE',
    token,
  })
}

// Jobs
export type JobType = 'subreddit' | 'redditor' | 'comments'
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface Job {
  id: string
  project_id: string
  user_id: string
  job_type: JobType
  config: Record<string, unknown>
  status: JobStatus
  progress: number
  error_message?: string
  result_data?: Record<string, unknown>
  created_at: string
  completed_at?: string
}

export async function getProjectJobs(token: string, projectId: string): Promise<Job[]> {
  return fetchAPI(`/api/projects/${projectId}/jobs`, { token })
}

export async function createJob(token: string, projectId: string, data: {
  job_type: JobType
  config: Record<string, unknown>
}) {
  return fetchAPI<Job>(`/api/projects/${projectId}/jobs`, {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  })
}

export async function getJob(token: string, jobId: string): Promise<Job> {
  return fetchAPI(`/api/jobs/${jobId}`, { token })
}

export async function deleteJob(token: string, jobId: string) {
  return fetchAPI(`/api/jobs/${jobId}`, {
    method: 'DELETE',
    token,
  })
}

// Share
export interface ShareLink {
  id: string
  job_id: string
  share_token: string
  is_active: boolean
  created_at: string
  url: string
}

export async function createShareLink(token: string, jobId: string) {
  return fetchAPI<ShareLink>(`/api/jobs/${jobId}/share`, {
    method: 'POST',
    token,
  })
}

export async function getSharedResult(token: string) {
  return fetchAPI<{
    job_type: JobType
    config: Record<string, unknown>
    result_data: Record<string, unknown>
    created_at: string
  }>(`/api/share/${token}`)
}

// Export
export function getExportUrl(token: string, jobId: string) {
  return `${API_URL}/api/jobs/${jobId}/export?format=json&token=${token}`
}
