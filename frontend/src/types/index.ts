export type JobType = 'subreddit' | 'redditor' | 'comments'
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface SubredditConfig {
  subreddit: string
  category: 'hot' | 'new' | 'controversial' | 'top' | 'rising' | 'search'
  limit: number
  time_filter?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all'
  search_query?: string
}

export interface RedditorConfig {
  username: string
  limit: number
}

export interface CommentsConfig {
  url: string
  limit: number
  structured: boolean
}

export type JobConfig = SubredditConfig | RedditorConfig | CommentsConfig

export interface Job {
  id: string
  project_id: string
  user_id: string
  job_type: JobType
  config: JobConfig
  status: JobStatus
  progress: number
  error_message?: string
  result_data?: Record<string, unknown>
  created_at: string
  completed_at?: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  description?: string
  created_at: string
  job_count: number
}

export interface Submission {
  author: string
  title: string
  score: number
  num_comments: number
  created_utc: string
  permalink: string
  selftext?: string
  url: string
  nsfw: boolean
}

export interface Comment {
  author: string
  body: string
  score: number
  created_utc: string
  depth?: number
  replies?: Comment[]
}
