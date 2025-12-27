'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import * as api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/layout/Header'

export default function SettingsPage() {
  const { user, token, logout, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState<{
    has_reddit_credentials: boolean
    reddit_username?: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Reddit credentials form
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [redditUsername, setRedditUsername] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (token) {
      loadProfile()
    }
  }, [token])

  const loadProfile = async () => {
    if (!token) return
    try {
      const data = await api.getProfile(token)
      setProfile(data)
      if (data.reddit_username) {
        setRedditUsername(data.reddit_username)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    setSaveError('')
    setSaveSuccess(false)
    setIsSaving(true)

    try {
      await api.updateProfile(token, {
        reddit_client_id: clientId || undefined,
        reddit_client_secret: clientSecret || undefined,
        reddit_username: redditUsername || undefined,
      })
      setSaveSuccess(true)
      setClientId('')
      setClientSecret('')
      await loadProfile()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
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

      {/* Breadcrumb */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">Dashboard</Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium text-foreground">Settings</span>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      {/* Main */}
      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium text-foreground">{user.email}</p>
            </div>
            <Button variant="outline" onClick={logout}>
              Log Out
            </Button>
          </CardContent>
        </Card>

        {/* Reddit Credentials */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Reddit API Credentials</CardTitle>
                <CardDescription>
                  Required to scrape Reddit data.{' '}
                  <a
                    href="https://www.reddit.com/prefs/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-reddit hover:underline"
                  >
                    Get credentials here
                  </a>
                </CardDescription>
              </div>
              {profile?.has_reddit_credentials ? (
                <Badge variant="success">Configured</Badge>
              ) : (
                <Badge variant="secondary">Not configured</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveCredentials} className="space-y-4">
              {saveError && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="bg-green-500/10 text-green-500 text-sm p-3 rounded-md">
                  Credentials saved successfully!
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  placeholder={profile?.has_reddit_credentials ? '••••••••••••••' : 'Enter your client ID'}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  placeholder={profile?.has_reddit_credentials ? '••••••••••••••' : 'Enter your client secret'}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="redditUsername">Reddit Username (optional)</Label>
                <Input
                  id="redditUsername"
                  placeholder="Your Reddit username"
                  value={redditUsername}
                  onChange={(e) => setRedditUsername(e.target.value)}
                />
              </div>

              <Button type="submit" variant="reddit" disabled={isSaving || (!clientId && !clientSecret && !redditUsername)}>
                {isSaving ? 'Saving...' : 'Save Credentials'}
              </Button>

              <div className="text-sm text-muted-foreground mt-4">
                <strong className="text-foreground">How to get Reddit API credentials:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Go to <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" className="text-reddit hover:underline">reddit.com/prefs/apps</a></li>
                  <li>Click &ldquo;create another app...&rdquo;</li>
                  <li>Select &ldquo;script&rdquo; as the app type</li>
                  <li>Fill in name and description (anything works)</li>
                  <li>Set redirect URI to http://localhost:8000</li>
                  <li>Copy the client ID (under &ldquo;personal use script&rdquo;)</li>
                  <li>Copy the client secret</li>
                </ol>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
