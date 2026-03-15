import { z } from "zod";

// ---------------------------------------------------------------------------
// PaginationSchema
//
// Shared pagination fields used across all paginated tool endpoints.
// - page:  0-indexed page number (matches BookLore API convention)
// - size:  number of items per page (1–100, default 20)
//
// Tools that need a larger default page size (e.g. get_series_books,
// get_author_books) override the `size` default by overriding the field after
// spreading: z.object({ ...PaginationSchema.shape, size: z.number()...default(50) })
// ---------------------------------------------------------------------------

export const PaginationSchema = z.object({
  page: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe("Page number (0-indexed)"),
  size: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .describe("Page size (1–100)"),
});

// ---------------------------------------------------------------------------
// SortSchema
//
// Shared sort fields used across all sortable tool endpoints.
// - sort:  sort field name; kept as z.string() here because valid values vary
//          per endpoint — tool files narrow to z.enum([...]) per P3-H
// - dir:   sort direction, defaults to "asc"
// ---------------------------------------------------------------------------

export const SortSchema = z.object({
  sort: z
    .string()
    .optional()
    .describe("Sort field (valid values depend on the endpoint)"),
  dir: z
    .enum(["asc", "desc"])
    .optional()
    .describe("Sort direction: asc or desc"),
});

// ---------------------------------------------------------------------------
// Per-endpoint sort enums
// ---------------------------------------------------------------------------

/** Valid sort fields for the books endpoint */
export const BookSortSchema = z
  .enum(["title", "addedOn", "lastReadTime", "personalRating"])
  .optional()
  .describe("Sort field: title, addedOn, lastReadTime, or personalRating");

/** Valid sort fields for the series endpoint */
export const SeriesSortSchema = z
  .enum(["seriesName", "latestAddedOn"])
  .optional()
  .describe("Sort field: seriesName or latestAddedOn");

/** Valid sort fields for the authors endpoint */
export const AuthorSortSchema = z
  .enum(["name", "bookCount"])
  .optional()
  .describe("Sort field: name or bookCount");
