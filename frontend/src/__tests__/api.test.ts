import * as api from "@/lib/api";

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  mockFetch.mockClear();
});

describe("API module", () => {
  const mockToken = "test-jwt-token";

  describe("getProjects", () => {
    it("should fetch projects with authorization header", async () => {
      const mockProjects = [
        { id: "1", name: "Project 1", description: null, job_count: 0 },
        { id: "2", name: "Project 2", description: "Test", job_count: 5 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      } as Response);

      const result = await api.getProjects(mockToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/projects"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        }),
      );
      expect(result).toEqual(mockProjects);
    });

    it("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: "Unauthorized" }),
      } as Response);

      await expect(api.getProjects(mockToken)).rejects.toThrow();
    });
  });

  describe("createProject", () => {
    it("should send POST request with project data", async () => {
      const mockProject = { id: "1", name: "New Project", description: null };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProject,
      } as Response);

      const result = await api.createProject(mockToken, {
        name: "New Project",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/projects"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "New Project" }),
        }),
      );
      expect(result).toEqual(mockProject);
    });
  });

  describe("deleteProject", () => {
    it("should send DELETE request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await api.deleteProject(mockToken, "project-123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/projects/project-123"),
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });
  });

  describe("getJob", () => {
    it("should fetch job by ID", async () => {
      const mockJob = {
        id: "job-123",
        job_type: "subreddit",
        status: "completed",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJob,
      } as Response);

      const result = await api.getJob(mockToken, "job-123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/jobs/job-123"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        }),
      );
      expect(result).toEqual(mockJob);
    });
  });

  describe("getProfile", () => {
    it("should fetch user profile", async () => {
      const mockProfile = {
        id: "user-123",
        email: "test@example.com",
        has_reddit_credentials: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      } as Response);

      const result = await api.getProfile(mockToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/profile"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        }),
      );
      expect(result).toEqual(mockProfile);
    });
  });

  describe("createShareLink", () => {
    it("should create share link for job", async () => {
      const mockShareLink = {
        id: "share-123",
        job_id: "job-456",
        share_token: "abc123",
        url: "http://localhost:3000/share/abc123",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockShareLink,
      } as Response);

      const result = await api.createShareLink(mockToken, "job-456");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/jobs/job-456/share"),
        expect.objectContaining({
          method: "POST",
        }),
      );
      expect(result).toEqual(mockShareLink);
    });
  });

  describe("getSharedResult", () => {
    it("should fetch shared result without auth", async () => {
      const mockResult = {
        job_type: "subreddit",
        config: { subreddit: "python" },
        result_data: { data: [] },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as Response);

      const result = await api.getSharedResult("share-token-123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/share/share-token-123"),
        expect.objectContaining({
          method: "GET",
        }),
      );
      // Should not have Authorization header
      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs?.headers).not.toHaveProperty("Authorization");
      expect(result).toEqual(mockResult);
    });
  });
});
