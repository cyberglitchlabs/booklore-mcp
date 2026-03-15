import { describe, test, expect } from "vitest";
import { formatPageInfo, formatBookSummary, formatBookDetail } from "./format.js";
import type { BookSummary, BookDetail, PageResponse } from "../types.js";

// ---------------------------------------------------------------------------
// formatPageInfo
// ---------------------------------------------------------------------------

describe("formatPageInfo", () => {
  function makePage<T>(
    content: T[],
    overrides: Partial<Omit<PageResponse<T>, "content">> = {}
  ): PageResponse<T> {
    return {
      content,
      page: 0,
      size: 20,
      totalElements: content.length,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
      ...overrides,
    };
  }

  test("shows correct range for first page with no more pages", () => {
    const result = makePage(["a", "b", "c"], { totalElements: 3 });
    expect(formatPageInfo(result, "book")).toBe("Showing 1–3 of 3 book(s)");
  });

  test("appends page indicator when hasNext is true", () => {
    const result = makePage(new Array(20).fill("x"), {
      totalElements: 45,
      totalPages: 3,
      hasNext: true,
      size: 20,
    });
    expect(formatPageInfo(result, "book")).toBe(
      "Showing 1–20 of 45 book(s) (page 1 of 3)"
    );
  });

  test("computes correct start/end for page 2", () => {
    const result = makePage(new Array(15).fill("x"), {
      page: 1,
      size: 20,
      totalElements: 35,
      totalPages: 2,
      hasNext: false,
    });
    expect(formatPageInfo(result, "series")).toBe(
      "Showing 21–35 of 35 series(s)"
    );
  });

  test("handles single-item result", () => {
    const result = makePage(["x"], { totalElements: 1 });
    expect(formatPageInfo(result, "author")).toBe("Showing 1–1 of 1 author(s)");
  });
});

// ---------------------------------------------------------------------------
// formatBookSummary
// ---------------------------------------------------------------------------

describe("formatBookSummary", () => {
  const minimalBook: BookSummary = {
    id: 42,
    title: "Dune",
  };

  test("formats a minimal book with no optional fields", () => {
    const result = formatBookSummary(minimalBook);
    expect(result).toBe("• [42] Dune — Unknown");
  });

  test("includes authors when present", () => {
    const book: BookSummary = { ...minimalBook, authors: ["Frank Herbert"] };
    expect(formatBookSummary(book)).toContain("Frank Herbert");
  });

  test("joins multiple authors with comma", () => {
    const book: BookSummary = {
      ...minimalBook,
      authors: ["Author One", "Author Two"],
    };
    expect(formatBookSummary(book)).toContain("Author One, Author Two");
  });

  test("falls back to Unknown when authors is null", () => {
    const book: BookSummary = { ...minimalBook, authors: null };
    expect(formatBookSummary(book)).toContain("Unknown");
  });

  test("includes read status when present", () => {
    const book: BookSummary = { ...minimalBook, readStatus: "IN_PROGRESS" };
    expect(formatBookSummary(book)).toContain("[IN_PROGRESS]");
  });

  test("includes personal rating when present", () => {
    const book: BookSummary = { ...minimalBook, personalRating: 4 };
    expect(formatBookSummary(book)).toContain("★4");
  });

  test("includes series name without number when seriesNumber is null", () => {
    const book: BookSummary = {
      ...minimalBook,
      seriesName: "The Dune Chronicles",
      seriesNumber: null,
    };
    expect(formatBookSummary(book)).toContain("(The Dune Chronicles)");
    expect(formatBookSummary(book)).not.toContain("#");
  });

  test("includes series name with number when seriesNumber is present", () => {
    const book: BookSummary = {
      ...minimalBook,
      seriesName: "The Dune Chronicles",
      seriesNumber: 1,
    };
    expect(formatBookSummary(book)).toContain("(The Dune Chronicles #1)");
  });

  test("includes progress percentage when readProgress > 0", () => {
    const book: BookSummary = { ...minimalBook, readProgress: 0.55 };
    expect(formatBookSummary(book)).toContain("55%");
  });

  test("omits progress when readProgress is 0", () => {
    const book: BookSummary = { ...minimalBook, readProgress: 0 };
    expect(formatBookSummary(book)).not.toContain("%");
  });

  test("omits progress when readProgress is null", () => {
    const book: BookSummary = { ...minimalBook, readProgress: null };
    expect(formatBookSummary(book)).not.toContain("%");
  });

  test("includes file format when primaryFileType is present", () => {
    const book: BookSummary = { ...minimalBook, primaryFileType: "EPUB" };
    expect(formatBookSummary(book)).toContain("[EPUB]");
  });

  test("starts with bullet and book id", () => {
    expect(formatBookSummary(minimalBook)).toMatch(/^• \[42\]/);
  });
});

// ---------------------------------------------------------------------------
// formatBookDetail
// ---------------------------------------------------------------------------

describe("formatBookDetail", () => {
  const minimalDetail: BookDetail = {
    id: 7,
    title: "Foundation",
    libraryId: 1,
  };

  test("formats a minimal book with no optional fields", () => {
    const result = formatBookDetail(minimalDetail);
    expect(result).toContain("**Foundation**");
    expect(result).toContain("Author(s): Unknown");
    expect(result).toContain("Library: ID 1");
    expect(result).toContain("Rating: none");
  });

  test("uses libraryName when present instead of libraryId fallback", () => {
    const book: BookDetail = {
      ...minimalDetail,
      libraryName: "My Sci-Fi Collection",
    };
    expect(formatBookDetail(book)).toContain("Library: My Sci-Fi Collection");
    expect(formatBookDetail(book)).not.toContain("ID 1");
  });

  test("includes subtitle when present", () => {
    const book: BookDetail = { ...minimalDetail, subtitle: "A Novel" };
    expect(formatBookDetail(book)).toContain("_A Novel_");
  });

  test("omits subtitle line when absent", () => {
    expect(formatBookDetail(minimalDetail)).not.toContain("_");
  });

  test("includes series with number", () => {
    const book: BookDetail = {
      ...minimalDetail,
      seriesName: "The Foundation Series",
      seriesNumber: 1,
    };
    expect(formatBookDetail(book)).toContain("Series: The Foundation Series #1");
  });

  test("includes series without number when seriesNumber is null", () => {
    const book: BookDetail = {
      ...minimalDetail,
      seriesName: "The Foundation Series",
      seriesNumber: null,
    };
    expect(formatBookDetail(book)).toContain("Series: The Foundation Series");
    expect(formatBookDetail(book)).not.toContain("#");
  });

  test("includes optional metadata fields when present", () => {
    const book: BookDetail = {
      ...minimalDetail,
      publisher: "Gnome Press",
      publishedDate: "1951-05-01",
      isbn13: "9780553293357",
      language: "en",
      pageCount: 244,
    };
    const result = formatBookDetail(book);
    expect(result).toContain("Publisher: Gnome Press");
    expect(result).toContain("Published: 1951-05-01");
    expect(result).toContain("ISBN-13: 9780553293357");
    expect(result).toContain("Language: en");
    expect(result).toContain("Pages: 244");
  });

  test("includes categories when present", () => {
    const book: BookDetail = {
      ...minimalDetail,
      categories: ["Science Fiction", "Classic"],
    };
    expect(formatBookDetail(book)).toContain(
      "Categories: Science Fiction, Classic"
    );
  });

  test("omits categories when empty array", () => {
    const book: BookDetail = { ...minimalDetail, categories: [] };
    expect(formatBookDetail(book)).not.toContain("Categories");
  });

  test("shows personal rating when set", () => {
    const book: BookDetail = { ...minimalDetail, personalRating: 5 };
    expect(formatBookDetail(book)).toContain("Rating: ★5/5");
  });

  test("shows goodreads rating when present", () => {
    const book: BookDetail = {
      ...minimalDetail,
      goodreadsRating: 4.18,
      goodreadsReviewCount: 100000,
    };
    expect(formatBookDetail(book)).toContain("Goodreads: 4.18 (100000 reviews)");
  });

  test("shows goodreads rating without review count when count is absent", () => {
    const book: BookDetail = {
      ...minimalDetail,
      goodreadsRating: 4.18,
    };
    const result = formatBookDetail(book);
    expect(result).toContain("Goodreads: 4.18");
    expect(result).not.toContain("reviews");
  });

  test("includes read status when present", () => {
    const book: BookDetail = { ...minimalDetail, readStatus: "READ" };
    expect(formatBookDetail(book)).toContain("Status: READ");
  });

  test("includes progress percentage when readProgress > 0", () => {
    const book: BookDetail = { ...minimalDetail, readProgress: 0.72 };
    expect(formatBookDetail(book)).toContain("Progress: 72%");
  });

  test("omits progress line when readProgress is 0", () => {
    const book: BookDetail = { ...minimalDetail, readProgress: 0 };
    expect(formatBookDetail(book)).not.toContain("Progress:");
  });

  test("includes shelves when present", () => {
    const book: BookDetail = {
      ...minimalDetail,
      shelves: [
        { id: 1, name: "Favorites", bookCount: 10, publicShelf: false },
        { id: 2, name: "To Re-read", bookCount: 5, publicShelf: false },
      ],
    };
    expect(formatBookDetail(book)).toContain("Shelves: Favorites, To Re-read");
  });

  test("includes file formats when present", () => {
    const book: BookDetail = { ...minimalDetail, fileTypes: ["EPUB", "PDF"] };
    expect(formatBookDetail(book)).toContain("Formats: EPUB, PDF");
  });

  test("includes added date truncated to YYYY-MM-DD", () => {
    const book: BookDetail = {
      ...minimalDetail,
      addedOn: "2023-11-15T10:30:00Z",
    };
    expect(formatBookDetail(book)).toContain("Added: 2023-11-15");
  });

  test("includes last read date truncated to YYYY-MM-DD", () => {
    const book: BookDetail = {
      ...minimalDetail,
      lastReadTime: "2024-01-20T08:00:00Z",
    };
    expect(formatBookDetail(book)).toContain("Last read: 2024-01-20");
  });

  test("includes EPUB progress detail", () => {
    const book: BookDetail = {
      ...minimalDetail,
      epubProgress: { percentage: 0.4 },
    };
    expect(formatBookDetail(book)).toContain("Progress detail: EPUB: 40%");
  });

  test("includes PDF progress detail with page number", () => {
    const book: BookDetail = {
      ...minimalDetail,
      pdfProgress: { page: 88, percentage: 0.36 },
    };
    expect(formatBookDetail(book)).toContain("PDF: page 88 (36%)");
  });

  test("shows ? for PDF page when page is null", () => {
    const book: BookDetail = {
      ...minimalDetail,
      pdfProgress: { page: null, percentage: 0.5 },
    };
    expect(formatBookDetail(book)).toContain("PDF: page ? (50%)");
  });

  test("includes audiobook progress detail", () => {
    const book: BookDetail = {
      ...minimalDetail,
      audiobookProgress: { percentage: 0.8 },
    };
    expect(formatBookDetail(book)).toContain("Audiobook: 80%");
  });

  test("combines multiple progress types in one line", () => {
    const book: BookDetail = {
      ...minimalDetail,
      epubProgress: { percentage: 0.3 },
      pdfProgress: { page: 10, percentage: 0.1 },
    };
    const result = formatBookDetail(book);
    expect(result).toContain("Progress detail: EPUB: 30% | PDF: page 10 (10%)");
  });

  test("omits progress detail when no progress objects present", () => {
    expect(formatBookDetail(minimalDetail)).not.toContain("Progress detail");
  });

  test("includes description when present", () => {
    const book: BookDetail = {
      ...minimalDetail,
      description: "A classic science fiction novel.",
    };
    const result = formatBookDetail(book);
    expect(result).toContain("Description:");
    expect(result).toContain("A classic science fiction novel.");
  });

  test("omits description section when absent", () => {
    expect(formatBookDetail(minimalDetail)).not.toContain("Description:");
  });
});
