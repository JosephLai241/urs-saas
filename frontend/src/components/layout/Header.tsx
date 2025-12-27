'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface HeaderProps {
  showAuth?: boolean
}

export function Header({ showAuth = true }: HeaderProps) {
  const { user, logout } = useAuth()

  return (
    <header className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-reddit rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">U</span>
            </div>
            <span className="font-bold text-xl text-foreground">URS</span>
          </Link>
        </div>
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          {showAuth && user && (
            <>
              <Link href="/settings">
                <Button variant="ghost" size="sm">Settings</Button>
              </Link>
              <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
              <Button variant="outline" size="sm" onClick={logout}>
                Logout
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
