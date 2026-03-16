import { describe, test, expect } from "vitest";
import { z } from "zod";
import { PaginationSchema, SortSchema, withPageSizeDefault } from "./schemas.js";

// ---------------------------------------------------------------------------
// withPageSizeDefault
// ---------------------------------------------------------------------------

describe("withPageSizeDefault", () => {
  const base = z.object({
    ...PaginationSchema.shape,
    ...SortSchema.shape,
    id: z.number(),
  });

  test("applies custom default when size is omitted", () => {
    const schema = withPageSizeDefault(base, 50);
    expect(schema.parse({ id: 1 }).size).toBe(50);
  });

  test("respects explicit size when provided", () => {
    const schema = withPageSizeDefault(base, 50);
    expect(schema.parse({ id: 1, size: 10 }).size).toBe(10);
  });

  test("rejects size below 1", () => {
    const schema = withPageSizeDefault(base, 50);
    expect(() => schema.parse({ id: 1, size: 0 })).toThrow();
  });

  test("rejects size above 100", () => {
    const schema = withPageSizeDefault(base, 50);
    expect(() => schema.parse({ id: 1, size: 101 })).toThrow();
  });

  test("preserves non-size fields from base schema", () => {
    const schema = withPageSizeDefault(base, 50);
    const result = schema.parse({ id: 99 });
    expect(result.id).toBe(99);
    expect(result.page).toBe(0);
  });

  test("does not mutate the base schema default", () => {
    withPageSizeDefault(base, 50);
    expect(PaginationSchema.parse({}).size).toBe(20);
  });

  test("throws at construction time when newDefault is below 1", () => {
    expect(() => withPageSizeDefault(base, 0)).toThrow(
      "withPageSizeDefault: newDefault must be 1–100, got 0"
    );
  });

  test("throws at construction time when newDefault is above 100", () => {
    expect(() => withPageSizeDefault(base, 101)).toThrow(
      "withPageSizeDefault: newDefault must be 1–100, got 101"
    );
  });

  test("accepts boundary values 1 and 100 without throwing", () => {
    expect(() => withPageSizeDefault(base, 1)).not.toThrow();
    expect(() => withPageSizeDefault(base, 100)).not.toThrow();
  });

  test("applies newDefault of 1 correctly", () => {
    const schema = withPageSizeDefault(base, 1);
    expect(schema.parse({ id: 1 }).size).toBe(1);
  });
});
