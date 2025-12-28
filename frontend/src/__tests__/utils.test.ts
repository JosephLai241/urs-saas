import {
  cn,
  formatDate,
  formatNumber,
  formatTimestamp,
  truncateText,
} from "@/lib/utils";

describe("cn (className utility)", () => {
  it("should merge class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("should merge tailwind classes correctly", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("should handle undefined and null", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });
});

describe("formatDate", () => {
  it("should format a valid date string", () => {
    const result = formatDate("2024-01-15T12:00:00Z");
    expect(result).toContain("2024");
    expect(result).toContain("Jan");
    expect(result).toContain("15");
  });

  it("should format a Date object", () => {
    const date = new Date("2024-06-20T15:30:00Z");
    const result = formatDate(date);
    expect(result).toContain("2024");
    expect(result).toContain("Jun");
    expect(result).toContain("20");
  });

  it("should return the original string for invalid dates", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

describe("formatTimestamp", () => {
  it("should format ISO 8601 timestamp", () => {
    const result = formatTimestamp("2024-12-26T10:30:45+00:00");
    expect(result).toContain("2024");
    expect(result).toContain("Dec");
    expect(result).toContain("26");
  });

  it("should return original string for invalid timestamp", () => {
    expect(formatTimestamp("invalid")).toBe("invalid");
  });
});

describe("formatNumber", () => {
  it("should format small numbers as-is", () => {
    expect(formatNumber(123)).toBe("123");
    expect(formatNumber(999)).toBe("999");
  });

  it("should format thousands with K suffix", () => {
    expect(formatNumber(1000)).toBe("1.0K");
    expect(formatNumber(1500)).toBe("1.5K");
    expect(formatNumber(25000)).toBe("25.0K");
  });

  it("should format millions with M suffix", () => {
    expect(formatNumber(1000000)).toBe("1.0M");
    expect(formatNumber(2500000)).toBe("2.5M");
  });
});

describe("truncateText", () => {
  it("should not truncate short text", () => {
    expect(truncateText("Hello", 10)).toBe("Hello");
  });

  it("should truncate long text with ellipsis", () => {
    expect(truncateText("This is a very long text", 10)).toBe("This is a...");
  });

  it("should use default max length of 50", () => {
    const longText = "a".repeat(60);
    const result = truncateText(longText);
    expect(result.length).toBe(53); // 50 chars + "..."
    expect(result.endsWith("...")).toBe(true);
  });

  it("should handle exact length match", () => {
    expect(truncateText("Hello", 5)).toBe("Hello");
  });
});
