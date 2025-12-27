import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  // Check if valid date
  if (isNaN(d.getTime())) {
    return String(date)
  }
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTimestamp(timestamp: string): string {
  // Handle ISO 8601 timestamps (e.g., "2024-12-26T10:30:45+00:00")
  // and convert to user's local timezone
  const d = new Date(timestamp)
  if (isNaN(d.getTime())) {
    // If parsing fails, return the original string
    return timestamp
  }
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.slice(0, maxLength).trim() + '...'
}
