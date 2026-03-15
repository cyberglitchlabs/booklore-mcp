import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const BookFileTypeSchema = z.enum([
  "EPUB",
  "PDF",
  "CBZ",
  "CBR",
  "CB7",
  "MOBI",
  "AZW3",
  "MP3",
  "M4B",
  "M4A",
  "AUDIOBOOK",
]);
export type BookFileType = z.infer<typeof BookFileTypeSchema>;

export const ReadStatusSchema = z.enum([
  "WANT_TO_READ",
  "IN_PROGRESS",
  "READ",
  "DNF",
]);
export type ReadStatus = z.infer<typeof ReadStatusSchema>;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const PageResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    content: z.array(itemSchema),
    page: z.number().int(),
    size: z.number().int(),
    totalElements: z.number().int(),
    totalPages: z.number().int(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  });

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

// ---------------------------------------------------------------------------
// Book
// ---------------------------------------------------------------------------

export const BookFileSchema = z.object({
  id: z.number().int(),
  bookId: z.number().int(),
  fileName: z.string(),
  isBook: z.boolean(),
  folderBased: z.boolean(),
  bookType: z.string().nullable().optional(),
  archiveType: z.string().nullable().optional(),
  fileSizeKb: z.number().int().nullable().optional(),
  extension: z.string().nullable().optional(),
  addedOn: z.string().nullable().optional(),
  isPrimary: z.boolean(),
});
export type BookFile = z.infer<typeof BookFileSchema>;

export const ShelfSummarySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  icon: z.string().nullable().optional(),
  bookCount: z.number().int(),
  publicShelf: z.boolean(),
});
export type ShelfSummary = z.infer<typeof ShelfSummarySchema>;

const EpubProgressSchema = z.object({
  cfi: z.string().nullable().optional(),
  href: z.string().nullable().optional(),
  percentage: z.number().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

const PdfProgressSchema = z.object({
  page: z.number().int().nullable().optional(),
  percentage: z.number().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

const CbxProgressSchema = z.object({
  page: z.number().int().nullable().optional(),
  percentage: z.number().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

const AudiobookProgressSchema = z.object({
  positionMs: z.number().int().nullable().optional(),
  trackIndex: z.number().int().nullable().optional(),
  percentage: z.number().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

const KoreaderProgressSchema = z.object({
  percentage: z.number().nullable().optional(),
  device: z.string().nullable().optional(),
  deviceId: z.string().nullable().optional(),
  lastSyncTime: z.string().nullable().optional(),
});

export const BookSummarySchema = z.object({
  id: z.number().int(),
  title: z.string(),
  authors: z.array(z.string()).nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  readStatus: z.string().nullable().optional(),
  personalRating: z.number().int().nullable().optional(),
  seriesName: z.string().nullable().optional(),
  seriesNumber: z.number().nullable().optional(),
  libraryId: z.number().int().nullable().optional(),
  addedOn: z.string().nullable().optional(),
  lastReadTime: z.string().nullable().optional(),
  readProgress: z.number().nullable().optional(),
  primaryFileType: z.string().nullable().optional(),
  coverUpdatedOn: z.string().nullable().optional(),
  audiobookCoverUpdatedOn: z.string().nullable().optional(),
  isPhysical: z.boolean().nullable().optional(),
});
export type BookSummary = z.infer<typeof BookSummarySchema>;

export const BookDetailSchema = BookSummarySchema.extend({
  subtitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  categories: z.array(z.string()).nullable().optional(),
  publisher: z.string().nullable().optional(),
  publishedDate: z.string().nullable().optional(),
  pageCount: z.number().int().nullable().optional(),
  isbn13: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  goodreadsRating: z.number().nullable().optional(),
  goodreadsReviewCount: z.number().int().nullable().optional(),
  libraryName: z.string().nullable().optional(),
  shelves: z.array(ShelfSummarySchema).nullable().optional(),
  fileTypes: z.array(z.string()).nullable().optional(),
  files: z.array(BookFileSchema).nullable().optional(),
  coverUpdatedOn: z.string().nullable().optional(),
  audiobookCoverUpdatedOn: z.string().nullable().optional(),
  isPhysical: z.boolean().nullable().optional(),
  epubProgress: EpubProgressSchema.nullable().optional(),
  pdfProgress: PdfProgressSchema.nullable().optional(),
  cbxProgress: CbxProgressSchema.nullable().optional(),
  audiobookProgress: AudiobookProgressSchema.nullable().optional(),
  koreaderProgress: KoreaderProgressSchema.nullable().optional(),
});
export type BookDetail = z.infer<typeof BookDetailSchema>;

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

export const LibrarySummarySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  icon: z.string().nullable().optional(),
  bookCount: z.number().int(),
  allowedFormats: z.array(z.string()).nullable().optional(),
  paths: z
    .array(
      z.object({
        id: z.number().int(),
        path: z.string(),
      })
    )
    .nullable()
    .optional(),
});
export type LibrarySummary = z.infer<typeof LibrarySummarySchema>;

// ---------------------------------------------------------------------------
// Shelf
// ---------------------------------------------------------------------------

export const MagicShelfSummarySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  icon: z.string().nullable().optional(),
  iconType: z.string().nullable().optional(),
  publicShelf: z.boolean(),
});
export type MagicShelfSummary = z.infer<typeof MagicShelfSummarySchema>;

// ---------------------------------------------------------------------------
// Series
// ---------------------------------------------------------------------------

export const SeriesCoverBookSchema = z.object({
  bookId: z.number().int(),
  coverUpdatedOn: z.string().nullable().optional(),
  seriesNumber: z.number().nullable().optional(),
  primaryFileType: z.string().nullable().optional(),
});

export const SeriesSummarySchema = z.object({
  seriesName: z.string(),
  bookCount: z.number().int(),
  seriesTotal: z.number().int().nullable().optional(),
  authors: z.array(z.string()).nullable().optional(),
  booksRead: z.number().int(),
  latestAddedOn: z.string().nullable().optional(),
  coverBooks: z.array(SeriesCoverBookSchema).nullable().optional(),
});
export type SeriesSummary = z.infer<typeof SeriesSummarySchema>;

// ---------------------------------------------------------------------------
// Author
// ---------------------------------------------------------------------------

export const AuthorSummarySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  asin: z.string().nullable().optional(),
  bookCount: z.number().int(),
  hasPhoto: z.boolean(),
});
export type AuthorSummary = z.infer<typeof AuthorSummarySchema>;

export const AuthorDetailSchema = AuthorSummarySchema.extend({
  description: z.string().nullable().optional(),
});
export type AuthorDetail = z.infer<typeof AuthorDetailSchema>;

// ---------------------------------------------------------------------------
// Notebook
// ---------------------------------------------------------------------------

export const NotebookEntrySchema = z.object({
  id: z.number().int(),
  type: z.string(),
  bookId: z.number().int(),
  text: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  style: z.string().nullable().optional(),
  chapterTitle: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});
export type NotebookEntry = z.infer<typeof NotebookEntrySchema>;

export const NotebookBookSummarySchema = z.object({
  bookId: z.number().int(),
  bookTitle: z.string(),
  noteCount: z.number().int(),
  authors: z.array(z.string()).nullable().optional(),
  coverUpdatedOn: z.string().nullable().optional(),
});
export type NotebookBookSummary = z.infer<typeof NotebookBookSummarySchema>;

// ---------------------------------------------------------------------------
// Filter Options
// ---------------------------------------------------------------------------

export const FilterOptionsSchema = z.object({
  authors: z
    .array(
      z.object({
        name: z.string(),
        count: z.number().int(),
      })
    )
    .nullable()
    .optional(),
  languages: z
    .array(
      z.object({
        code: z.string(),
        label: z.string(),
        count: z.number().int(),
      })
    )
    .nullable()
    .optional(),
  readStatuses: z.array(z.string()).nullable().optional(),
  fileTypes: z.array(z.string()).nullable().optional(),
});
export type FilterOptions = z.infer<typeof FilterOptionsSchema>;

// ---------------------------------------------------------------------------
// Request payloads
// ---------------------------------------------------------------------------

export const UpdateRatingRequestSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

export const UpdateStatusRequestSchema = z.object({
  status: ReadStatusSchema,
});
