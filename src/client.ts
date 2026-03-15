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

export type BookLoreConfig =
  | { baseUrl: string; token: string; username?: never; password?: never }
  | { baseUrl: string; username: string; password: string; token?: never };

export function loadConfigFromEnv(): BookLoreConfig {
  const rawUrl = process.env["BOOKLORE_BASE_URL"] ?? "http://localhost:6060";
  let baseUrl: string;
  try {
    const parsed = new URL(rawUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error(`Protocol must be http or https, got: ${parsed.protocol}`);
    }
    baseUrl = `${parsed.protocol}//${parsed.host}`;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Protocol must")) throw err;
    throw new Error(`BOOKLORE_BASE_URL is not a valid URL: ${rawUrl}`, { cause: err });
  }

  const token = process.env["BOOKLORE_TOKEN"];
  if (token) {
    return { baseUrl, token };
  }

  const username = process.env["BOOKLORE_USERNAME"];
  const password = process.env["BOOKLORE_PASSWORD"];
  if (username && password) {
    return { baseUrl, username, password };
  }

  throw new Error(
    "BookLore authentication is not configured.\n" +
      "Option A — API token:    Set BOOKLORE_TOKEN\n" +
      "Option B — Credentials:  Set BOOKLORE_USERNAME and BOOKLORE_PASSWORD"
  );
}

// ---------------------------------------------------------------------------
// Auth response schemas
// ---------------------------------------------------------------------------

const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

const RefreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

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
  private readonly credentials: { username: string; password: string } | null;
  private accessToken: string;
  private refreshToken: string;
  private refreshing: Promise<void> | null = null;

  constructor(config: BookLoreConfig) {
    this.baseUrl = config.baseUrl;
    if (config.token) {
      this.credentials = null;
      this.accessToken = config.token;
      this.refreshToken = "";
    } else if ("username" in config && config.username !== undefined && config.password !== undefined) {
      this.credentials = { username: config.username, password: config.password };
      this.accessToken = "";
      this.refreshToken = "";
    } else {
      throw new Error("BookLore config is missing username or password");
    }
  }

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------

  /** Call once on startup when using username/password auth. No-op in token mode. */
  async ensureAuthenticated(): Promise<void> {
    if (this.credentials === null) return;
    await this.login(this.credentials.username, this.credentials.password);
  }

  private async login(username: string, password: string): Promise<void> {
    const url = buildUrl(this.baseUrl, "/api/v1/auth/login");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      const safeText = response.status >= 500 ? "Internal server error" : text.slice(0, 200);
      throw new BookLoreApiError(response.status, "/api/v1/auth/login", safeText);
    }
    const json: unknown = await response.json();
    const data = LoginResponseSchema.parse(json);
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    process.stderr.write("BookLore: logged in with username/password\n");
  }

  private async refreshAccessToken(): Promise<void> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = this._doRefresh().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private async _doRefresh(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available — cannot refresh access token");
    }
    const url = buildUrl(this.baseUrl, "/api/v1/auth/refresh-token");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ token: this.refreshToken }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      // Clear stale tokens and attempt re-login if credentials are available
      this.accessToken = "";
      this.refreshToken = "";
      if (this.credentials) {
        await this.login(this.credentials.username, this.credentials.password);
        return;
      }
      const text = await response.text().catch(() => response.statusText);
      const safeText = response.status >= 500 ? "Internal server error" : text.slice(0, 200);
      throw new BookLoreApiError(response.status, "/api/v1/auth/refresh-token", safeText);
    }
    const json: unknown = await response.json();
    const data = RefreshResponseSchema.parse(json);
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    process.stderr.write("BookLore: access token refreshed\n");
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  // -------------------------------------------------------------------------
  // Core fetch (with auto-refresh on 401)
  // -------------------------------------------------------------------------

  private async get<T>(
    path: string,
    schema: z.ZodType<T>,
    params?: Params
  ): Promise<T> {
    const url = buildUrl(this.baseUrl, path, params);
    const response = await fetch(url, { headers: this.authHeaders(), signal: AbortSignal.timeout(30_000) });
    if (response.status === 401 && this.credentials !== null) {
      await this.refreshAccessToken();
      const retried = await fetch(url, { headers: this.authHeaders(), signal: AbortSignal.timeout(30_000) });
      return this.parseResponse(retried, path, schema);
    }
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
      headers: this.authHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    if (response.status === 401 && this.credentials !== null) {
      await this.refreshAccessToken();
      const retried = await fetch(url, {
        method: "PUT",
        headers: this.authHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
      return this.parseResponse(retried, path, schema);
    }
    return this.parseResponse(response, path, schema);
  }

  private async parseResponse<T>(
    response: Response,
    path: string,
    schema: z.ZodType<T>
  ): Promise<T> {
    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      const safeText = response.status >= 500 ? "Internal server error" : text.slice(0, 200);
      throw new BookLoreApiError(response.status, path, safeText);
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
