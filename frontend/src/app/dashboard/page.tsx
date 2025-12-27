'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import * as api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { Header } from '@/components/layout/Header'

export default function DashboardPage() {
  const { user, token, logout, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<api.Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newProjectName, setNewProjectName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [hasCredentials, setHasCredentials] = useState<boolean | null>(null)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (token) {
      loadData()
    }
  }, [token])

  const loadData = async () => {
    if (!token) return
    try {
      const [projectsData, profileData] = await Promise.all([
        api.getProjects(token),
        api.getProfile(token),
      ])
      setProjects(projectsData)
      setHasCredentials(profileData.has_reddit_credentials)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !newProjectName.trim()) return

    setIsCreating(true)
    try {
      const project = await api.createProject(token, { name: newProjectName.trim() })
      setProjects([project, ...projects])
      setNewProjectName('')
      setShowCreateForm(false)
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!token || !confirm('Are you sure you want to delete this project?')) return

    try {
      await api.deleteProject(token, projectId)
      setProjects(projects.filter(p => p.id !== projectId))
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  const handleEditDescription = (project: api.Project) => {
    setEditingProjectId(project.id)
    setEditDescription(project.description || '')
  }

  const handleSaveDescription = async (projectId: string) => {
    if (!token) return

    try {
      const updated = await api.updateProject(token, projectId, { description: editDescription })
      setProjects(projects.map(p => p.id === projectId ? updated : p))
      setEditingProjectId(null)
    } catch (error) {
      console.error('Failed to update project:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditingProjectId(null)
    setEditDescription('')
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Credentials Status Banner */}
      {hasCredentials === false && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-sm text-yellow-600 dark:text-yellow-400">
                Reddit API credentials not configured. You won't be able to run scrapes until you add them.
              </span>
            </div>
            <Link href="/settings">
              <Button variant="outline" size="sm" className="text-yellow-600 border-yellow-500/50 hover:bg-yellow-500/10">
                Configure Credentials
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground">Manage your scraping projects</p>
          </div>
          <Button variant="reddit" onClick={() => setShowCreateForm(true)}>
            New Project
          </Button>
        </div>

        {/* Create Project Form */}
        {showCreateForm && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <form onSubmit={handleCreateProject} className="flex items-center space-x-4">
                <Input
                  placeholder="Project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button type="submit" variant="reddit" disabled={isCreating || !newProjectName.trim()}>
                  {isCreating ? 'Creating...' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Projects List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading projects...</div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No projects yet. Create your first project to get started!</p>
              <Button variant="reddit" onClick={() => setShowCreateForm(true)}>
                Create Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      {editingProjectId === project.id ? (
                        <div className="mt-1 flex items-center space-x-2">
                          <Input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Add a description..."
                            className="text-sm h-8"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveDescription(project.id)
                              if (e.key === 'Escape') handleCancelEdit()
                            }}
                          />
                          <Button size="sm" variant="reddit" onClick={() => handleSaveDescription(project.id)}>
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <CardDescription
                          className="cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleEditDescription(project)}
                          title="Click to edit description"
                        >
                          {project.description || 'No description (click to add)'}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant="secondary" className="ml-2 flex-shrink-0">{project.job_count} jobs</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {project.job_count > 0 && project.job_counts && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {project.job_counts.completed > 0 && (
                        <Badge variant="success" className="text-xs">
                          {project.job_counts.completed} completed
                        </Badge>
                      )}
                      {project.job_counts.running > 0 && (
                        <Badge variant="warning" className="text-xs">
                          {project.job_counts.running} running
                        </Badge>
                      )}
                      {project.job_counts.failed > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {project.job_counts.failed} failed
                        </Badge>
                      )}
                      {project.job_counts.pending > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {project.job_counts.pending} pending
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Created {formatDate(project.created_at)}
                    </span>
                    <div className="flex space-x-2">
                      <Link href={`/projects/${project.id}`}>
                        <Button variant="outline" size="sm">Open</Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
