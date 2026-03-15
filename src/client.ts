import {
  BookDetail,
  BookDetailSchema,
  BookSummary,
  BookSummarySchema,
  LibrarySummary,
  LibrarySummarySchema,
  ShelfSummary,
  ShelfSummarySchema,
  MagicShelfSummary,
  MagicShelfSummarySchema,
  SeriesSummary,
  SeriesSummarySchema,
  AuthorSummary,
  AuthorSummarySchema,
  AuthorDetail,
  AuthorDetailSchema,
  NotebookEntry,
  NotebookEntrySchema,
  NotebookBookSummary,
  NotebookBookSummarySchema,
  FilterOptions,
  FilterOptionsSchema,
  PageResponse,
  PageResponseSchema,
  UpdateRatingRequestSchema,
  UpdateStatusRequestSchema,
  ReadStatus,
} from "./types.js";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface BookLoreConfig {
  baseUrl: string;
  token: string;
}

export function loadConfigFromEnv(): BookLoreConfig {
  const baseUrl = process.env["BOOKLORE_BASE_URL"] ?? "http://localhost:6060";
  const token = process.env["BOOKLORE_TOKEN"] ?? "";
  if (!token) {
    throw new Error(
      "BOOKLORE_TOKEN environment variable is required. " +
        "Get your token from the BookLore UI (Settings → API Token)."
    );
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), token };
}

// ---------------------------------------------------------------------------
// HTTP error
// ---------------------------------------------------------------------------

export class BookLoreApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    message: string
  ) {
    super(`BookLore API error ${status} on ${path}: ${message}`);
    this.name = "BookLoreApiError";
  }
}

// ---------------------------------------------------------------------------
// Query param helpers
// ---------------------------------------------------------------------------

type Params = Record<string, string | number | boolean | undefined | null>;

function buildUrl(base: string, path: string, params?: Params): string {
  const url = new URL(path, base);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

// ---------------------------------------------------------------------------
// BookLore client
// ---------------------------------------------------------------------------

export class BookLoreClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: BookLoreConfig) {
    this.baseUrl = config.baseUrl;
    this.headers = {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  // -------------------------------------------------------------------------
  // Core fetch
  // -------------------------------------------------------------------------

  private async get<T>(
    path: string,
    schema: z.ZodType<T>,
    params?: Params
  ): Promise<T> {
    const url = buildUrl(this.baseUrl, path, params);
    const response = await fetch(url, { headers: this.headers });
    return this.parseResponse(response, path, schema);
  }

  private async put<T>(
    path: string,
    schema: z.ZodType<T>,
    body: unknown
  ): Promise<T> {
    const url = buildUrl(this.baseUrl, path);
    const response = await fetch(url, {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    return this.parseResponse(response, path, schema);
  }

  private async parseResponse<T>(
    response: Response,
    path: string,
    schema: z.ZodType<T>
  ): Promise<T> {
    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new BookLoreApiError(response.status, path, text);
    }
    const json: unknown = await response.json();
    return schema.parse(json);
  }

  // -------------------------------------------------------------------------
  // Books
  // -------------------------------------------------------------------------

  async listBooks(params?: {
    page?: number;
    size?: number;
    sort?: string;
    dir?: string;
    libraryId?: number;
    shelfId?: number;
    status?: string;
    search?: string;
    fileType?: string;
    minRating?: number;
    maxRating?: number;
    authors?: string;
    language?: string;
  }): Promise<PageResponse<BookSummary>> {
    return this.get(
      "/api/v1/app/books",
      PageResponseSchema(BookSummarySchema),
      params as Params
    );
  }

  async getBook(bookId: number): Promise<BookDetail> {
    return this.get(`/api/v1/app/books/${bookId}`, BookDetailSchema);
  }

  async updateBookRating(bookId: number, rating: number): Promise<void> {
    const body = UpdateRatingRequestSchema.parse({ rating });
    await this.put(`/api/v1/app/books/${bookId}/rating`, z.unknown(), body);
  }

  async updateBookStatus(bookId: number, status: ReadStatus): Promise<void> {
    const body = UpdateStatusRequestSchema.parse({ status });
    await this.put(`/api/v1/app/books/${bookId}/status`, z.unknown(), body);
  }

  async getContinueReading(limit?: number): Promise<BookSummary[]> {
    return this.get(
      "/api/v1/app/books/continue-reading",
      z.array(BookSummarySchema),
      { limit }
    );
  }

  async getRecentlyAdded(limit?: number): Promise<BookSummary[]> {
    return this.get(
      "/api/v1/app/books/recently-added",
      z.array(BookSummarySchema),
      { limit }
    );
  }

  // -------------------------------------------------------------------------
  // Libraries
  // -------------------------------------------------------------------------

  async listLibraries(): Promise<LibrarySummary[]> {
    return this.get("/api/v1/app/libraries", z.array(LibrarySummarySchema));
  }

  // -------------------------------------------------------------------------
  // Shelves
  // -------------------------------------------------------------------------

  async listShelves(): Promise<ShelfSummary[]> {
    return this.get("/api/v1/app/shelves", z.array(ShelfSummarySchema));
  }

  async listMagicShelves(): Promise<MagicShelfSummary[]> {
    return this.get(
      "/api/v1/app/shelves/magic",
      z.array(MagicShelfSummarySchema)
    );
  }

  async getMagicShelfBooks(
    magicShelfId: number,
    params?: { page?: number; size?: number }
  ): Promise<PageResponse<BookSummary>> {
    return this.get(
      `/api/v1/app/shelves/magic/${magicShelfId}/books`,
      PageResponseSchema(BookSummarySchema),
      params as Params
    );
  }

  // -------------------------------------------------------------------------
  // Series
  // -------------------------------------------------------------------------

  async listSeries(params?: {
    page?: number;
    size?: number;
    sort?: string;
    dir?: string;
    libraryId?: number;
    search?: string;
    status?: string;
  }): Promise<PageResponse<SeriesSummary>> {
    return this.get(
      "/api/v1/app/series",
      PageResponseSchema(SeriesSummarySchema),
      params as Params
    );
  }

  async getSeriesBooks(
    seriesName: string,
    params?: {
      page?: number;
      size?: number;
      sort?: string;
      dir?: string;
      libraryId?: number;
    }
  ): Promise<PageResponse<BookSummary>> {
    return this.get(
      `/api/v1/app/series/${encodeURIComponent(seriesName)}/books`,
      PageResponseSchema(BookSummarySchema),
      params as Params
    );
  }

  // -------------------------------------------------------------------------
  // Authors
  // -------------------------------------------------------------------------

  async listAuthors(params?: {
    page?: number;
    size?: number;
    sort?: string;
    dir?: string;
    libraryId?: number;
    search?: string;
    hasPhoto?: boolean;
  }): Promise<PageResponse<AuthorSummary>> {
    return this.get(
      "/api/v1/app/authors",
      PageResponseSchema(AuthorSummarySchema),
      params as Params
    );
  }

  async getAuthor(authorId: number): Promise<AuthorDetail> {
    return this.get(`/api/v1/app/authors/${authorId}`, AuthorDetailSchema);
  }

  // -------------------------------------------------------------------------
  // Notebooks
  // -------------------------------------------------------------------------

  async listNotebookBooks(params?: {
    page?: number;
    size?: number;
    search?: string;
  }): Promise<PageResponse<NotebookBookSummary>> {
    return this.get(
      "/api/v1/app/notebook/books",
      PageResponseSchema(NotebookBookSummarySchema),
      params as Params
    );
  }

  async getBookNotebookEntries(
    bookId: number,
    params?: {
      page?: number;
      size?: number;
      search?: string;
      sort?: string;
    }
  ): Promise<PageResponse<NotebookEntry>> {
    return this.get(
      `/api/v1/app/notebook/books/${bookId}/entries`,
      PageResponseSchema(NotebookEntrySchema),
      params as Params
    );
  }

  // -------------------------------------------------------------------------
  // Filter options
  // -------------------------------------------------------------------------

  async getFilterOptions(params?: {
    libraryId?: number;
    shelfId?: number;
    magicShelfId?: number;
  }): Promise<FilterOptions> {
    return this.get(
      "/api/v1/app/filter-options",
      FilterOptionsSchema,
      params as Params
    );
  }
}
