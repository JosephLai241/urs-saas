"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import * as api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/layout/Header";

type ScrapeType = "subreddit" | "redditor" | "comments";

export default function NewScrapePage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  const [project, setProject] = useState<api.Project | null>(null);
  const [scrapeType, setScrapeType] = useState<ScrapeType>("subreddit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Subreddit form
  const [subreddit, setSubreddit] = useState("");
  const [category, setCategory] = useState("hot");
  const [limit, setLimit] = useState("25");
  const [timeFilter, setTimeFilter] = useState("all");

  // Redditor form
  const [username, setUsername] = useState("");
  const [redditorLimit, setRedditorLimit] = useState("25");

  // Comments form
  const [url, setUrl] = useState("");
  const [commentsLimit, setCommentsLimit] = useState("0");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!projectId && !authLoading && user) {
      router.push("/dashboard");
    }
  }, [projectId, authLoading, user, router]);

  useEffect(() => {
    if (token && projectId) {
      api.getProjects(token).then((projects) => {
        const proj = projects.find((p) => p.id === projectId);
        if (proj) setProject(proj);
      });
    }
  }, [token, projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !projectId) return;

    setError("");
    setIsSubmitting(true);

    try {
      let config: Record<string, unknown>;

      if (scrapeType === "subreddit") {
        config = {
          subreddit: subreddit.replace(/^r\//, ""),
          category,
          limit: parseInt(limit),
          time_filter: ["top", "controversial"].includes(category)
            ? timeFilter
            : undefined,
        };
      } else if (scrapeType === "redditor") {
        config = {
          username: username.replace(/^u\//, ""),
          limit: parseInt(redditorLimit),
        };
      } else {
        config = {
          url,
          limit: parseInt(commentsLimit),
          structured: true,
        };
      }

      const job = await api.createJob(token, projectId, {
        job_type: scrapeType,
        config,
      });

      router.push(`/jobs/${job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Breadcrumb */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground"
            >
              Projects
            </Link>
            <span className="text-muted-foreground">/</span>
            {project && (
              <>
                <Link
                  href={`/projects/${projectId}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {project.name}
                </Link>
                <span className="text-muted-foreground">/</span>
              </>
            )}
            <span className="font-medium text-foreground">New Scrape</span>
          </div>
          <Link href={`/projects/${projectId}`}>
            <Button variant="outline" size="sm">
              Cancel
            </Button>
          </Link>
        </div>
      </div>

      {/* Main */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Configure Scrape</CardTitle>
            <CardDescription>
              Choose what you want to scrape from Reddit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}

              {/* Scrape Type Selector */}
              <div className="grid grid-cols-3 gap-4">
                {(["subreddit", "redditor", "comments"] as const).map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setScrapeType(type)}
                      className={`p-4 rounded-lg border-2 text-center transition-colors ${
                        scrapeType === type
                          ? "border-reddit bg-reddit/10 text-foreground"
                          : "border-border hover:border-muted-foreground text-foreground"
                      }`}
                    >
                      <div className="text-2xl mb-2">
                        {type === "subreddit" && "📊"}
                        {type === "redditor" && "👤"}
                        {type === "comments" && "💬"}
                      </div>
                      <div className="font-medium capitalize">{type}</div>
                    </button>
                  ),
                )}
              </div>

              {/* Subreddit Form */}
              {scrapeType === "subreddit" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subreddit">Subreddit</Label>
                    <Input
                      id="subreddit"
                      placeholder="e.g., python, AskReddit"
                      value={subreddit}
                      onChange={(e) => setSubreddit(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hot">Hot</SelectItem>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="top">Top</SelectItem>
                          <SelectItem value="rising">Rising</SelectItem>
                          <SelectItem value="controversial">
                            Controversial
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="limit">Limit</Label>
                      <Input
                        id="limit"
                        type="number"
                        min="1"
                        max="1000"
                        value={limit}
                        onChange={(e) => setLimit(e.target.value)}
                      />
                    </div>
                  </div>

                  {["top", "controversial"].includes(category) && (
                    <div className="space-y-2">
                      <Label>Time Filter</Label>
                      <Select value={timeFilter} onValueChange={setTimeFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hour">Past Hour</SelectItem>
                          <SelectItem value="day">Past 24 Hours</SelectItem>
                          <SelectItem value="week">Past Week</SelectItem>
                          <SelectItem value="month">Past Month</SelectItem>
                          <SelectItem value="year">Past Year</SelectItem>
                          <SelectItem value="all">All Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Redditor Form */}
              {scrapeType === "redditor" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="e.g., spez"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="redditorLimit">Items per category</Label>
                    <Input
                      id="redditorLimit"
                      type="number"
                      min="1"
                      max="1000"
                      value={redditorLimit}
                      onChange={(e) => setRedditorLimit(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Comments Form */}
              {scrapeType === "comments" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url">Reddit Post URL</Label>
                    <Input
                      id="url"
                      placeholder="https://reddit.com/r/..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commentsLimit">
                      Comment limit (0 = all)
                    </Label>
                    <Input
                      id="commentsLimit"
                      type="number"
                      min="0"
                      value={commentsLimit}
                      onChange={(e) => setCommentsLimit(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                variant="reddit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Starting scrape..." : "Start Scrape"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
