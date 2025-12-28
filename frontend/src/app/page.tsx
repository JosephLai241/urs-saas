"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-reddit rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">U</span>
            </div>
            <span className="font-bold text-xl text-foreground">URS</span>
          </div>
          <nav className="flex items-center space-x-2">
            <ThemeToggle />
            {user ? (
              <Link href="/dashboard">
                <Button variant="reddit">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/signup">
                  <Button variant="reddit">Get Started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold mb-6 text-foreground">
            Universal Reddit Scraper
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Scrape subreddits, user profiles, and comments with ease. Analyze
            data, generate insights, and export to JSON.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Link href={user ? "/dashboard" : "/signup"}>
              <Button variant="reddit" size="lg">
                {user ? "Go to Dashboard" : "Start Scraping"}
              </Button>
            </Link>
            <a
              href="https://github.com/JosephLai241/URS"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="lg">
                View on GitHub
              </Button>
            </a>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <FeatureCard
            title="Subreddit Scraping"
            description="Scrape hot, new, top, or controversial posts from any subreddit. Filter by time and search queries."
            icon="📊"
          />
          <FeatureCard
            title="User Profiles"
            description="Analyze Reddit user activity including their posts, comments, and karma distribution."
            icon="👤"
          />
          <FeatureCard
            title="Comment Analysis"
            description="Extract and analyze comment threads with full tree structure preserved."
            icon="💬"
          />
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-8">
          <FeatureCard
            title="Background Jobs"
            description="Run scrapes in the background and monitor progress in real-time."
            icon="⚡"
          />
          <FeatureCard
            title="Multiple Exports"
            description="Export your scraped data as JSON, Markdown, or PDF for easy sharing and analysis."
            icon="📤"
          />
          <FeatureCard
            title="Shareable Links"
            description="Generate read-only links to share your scrape results with others."
            icon="🔗"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>Built with URS - Universal Reddit Scraper</p>
          <p className="mt-2 text-sm">
            <a
              href="https://github.com/JosephLai241/URS"
              className="text-reddit hover:underline"
            >
              github.com/JosephLai241/URS
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="font-semibold text-lg mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
