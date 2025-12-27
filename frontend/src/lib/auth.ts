'use client'

import { createContext, useContext } from 'react'

export interface User {
  id: string
  email: string
}

export interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Token storage
const TOKEN_KEY = 'urs_token'
const USER_KEY = 'urs_user'

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  const user = localStorage.getItem(USER_KEY)
  return user ? JSON.parse(user) : null
}

export function setStoredAuth(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
