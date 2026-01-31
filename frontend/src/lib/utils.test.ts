import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  cn,
  formatRelativeTime,
  formatDateTime,
  getStatusConfig,
  statusConfig,
  getResourceName,
  truncateId,
  buildQueryString,
} from "./utils";

describe("cn (className utility)", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    const includeBar = true;
    const includeBaz = false;
    expect(cn("foo", includeBar && "bar", includeBaz && "baz")).toBe("foo bar");
  });

  it("merges tailwind classes correctly", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("handles arrays", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("handles objects", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });

  it("handles empty inputs", () => {
    expect(cn()).toBe("");
  });

  it("handles undefined and null", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Never" for null', () => {
    expect(formatRelativeTime(null)).toBe("Never");
  });

  it('returns "Never" for undefined', () => {
    expect(formatRelativeTime(undefined)).toBe("Never");
  });

  it("formats recent date correctly", () => {
    const result = formatRelativeTime("2024-01-15T11:55:00Z");
    expect(result).toContain("minutes ago");
  });

  it("formats date from yesterday", () => {
    const result = formatRelativeTime("2024-01-14T12:00:00Z");
    expect(result).toContain("day ago");
  });

  it("formats date from a week ago", () => {
    const result = formatRelativeTime("2024-01-08T12:00:00Z");
    expect(result).toContain("7 days ago");
  });

  it('returns "Unknown" for invalid date string', () => {
    expect(formatRelativeTime("not-a-date")).toBe("Unknown");
  });
});

describe("formatDateTime", () => {
  it('returns "N/A" for null', () => {
    expect(formatDateTime(null)).toBe("N/A");
  });

  it('returns "N/A" for undefined', () => {
    expect(formatDateTime(undefined)).toBe("N/A");
  });

  it("formats date correctly", () => {
    const result = formatDateTime("2024-01-15T14:30:45Z");
    expect(result).toMatch(/Jan 15, 2024/);
  });

  it('returns "Invalid date" for invalid date string', () => {
    expect(formatDateTime("not-a-date")).toBe("Invalid date");
  });
});

describe("statusConfig", () => {
  it("has all required status types", () => {
    expect(statusConfig).toHaveProperty("active");
    expect(statusConfig).toHaveProperty("inactive");
    expect(statusConfig).toHaveProperty("transitioning");
    expect(statusConfig).toHaveProperty("error");
    expect(statusConfig).toHaveProperty("unknown");
  });

  it("each status has required properties", () => {
    Object.values(statusConfig).forEach((config) => {
      expect(config).toHaveProperty("label");
      expect(config).toHaveProperty("color");
      expect(config).toHaveProperty("bgColor");
      expect(config).toHaveProperty("dotColor");
    });
  });
});

describe("getStatusConfig", () => {
  it("returns config for active status", () => {
    const config = getStatusConfig("active");
    expect(config.label).toBe("Active");
    expect(config.dotColor).toBe("bg-green-500");
  });

  it("returns config for inactive status", () => {
    const config = getStatusConfig("inactive");
    expect(config.label).toBe("Inactive");
  });

  it("returns config for transitioning status", () => {
    const config = getStatusConfig("transitioning");
    expect(config.label).toBe("Transit");
  });

  it("returns config for error status", () => {
    const config = getStatusConfig("error");
    expect(config.label).toBe("Error");
  });

  it("returns config for unknown status", () => {
    const config = getStatusConfig("unknown");
    expect(config.label).toBe("Unknown");
  });

  it("returns unknown config for invalid status", () => {
    // @ts-expect-error Testing invalid status
    const config = getStatusConfig("invalid");
    expect(config.label).toBe("Unknown");
  });
});

describe("getResourceName", () => {
  it("returns name when provided", () => {
    expect(getResourceName("MyResource", "res-123")).toBe("MyResource");
  });

  it("returns id when name is null", () => {
    expect(getResourceName(null, "res-123")).toBe("res-123");
  });

  it("returns id when name is undefined", () => {
    expect(getResourceName(undefined, "res-123")).toBe("res-123");
  });

  it("returns id when name is empty string", () => {
    expect(getResourceName("", "res-123")).toBe("res-123");
  });
});

describe("truncateId", () => {
  it("returns original id if shorter than maxLength", () => {
    expect(truncateId("short-id", 20)).toBe("short-id");
  });

  it("returns original id if equal to maxLength", () => {
    expect(truncateId("exactly-20-chars-id!", 20)).toBe("exactly-20-chars-id!");
  });

  it("truncates long id with ellipsis", () => {
    const result = truncateId("this-is-a-very-long-resource-id", 20);
    expect(result).toBe("this-is-a-very-lo...");
    expect(result.length).toBe(20);
  });

  it("uses default maxLength of 20", () => {
    const result = truncateId("this-is-a-very-long-resource-identifier");
    expect(result.length).toBe(20);
    expect(result.endsWith("...")).toBe(true);
  });

  it("handles custom maxLength", () => {
    const result = truncateId("1234567890", 8);
    expect(result).toBe("12345...");
    expect(result.length).toBe(8);
  });
});

describe("buildQueryString", () => {
  it("builds query string from params", () => {
    const result = buildQueryString({ foo: "bar", baz: "qux" });
    expect(result).toBe("foo=bar&baz=qux");
  });

  it("handles boolean values", () => {
    const result = buildQueryString({ active: true, disabled: false });
    expect(result).toBe("active=true&disabled=false");
  });

  it("excludes undefined values", () => {
    const result = buildQueryString({ foo: "bar", baz: undefined });
    expect(result).toBe("foo=bar");
  });

  it("excludes empty string values", () => {
    const result = buildQueryString({ foo: "bar", baz: "" });
    expect(result).toBe("foo=bar");
  });

  it("returns empty string for no valid params", () => {
    const result = buildQueryString({ foo: undefined, bar: "" });
    expect(result).toBe("");
  });

  it("returns empty string for empty object", () => {
    const result = buildQueryString({});
    expect(result).toBe("");
  });

  it("encodes special characters", () => {
    const result = buildQueryString({ search: "hello world" });
    expect(result).toBe("search=hello+world");
  });
});
