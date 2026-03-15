import { BookSummary, BookDetail, PageResponse } from "../types.js";

// ---------------------------------------------------------------------------
// Page info summary line
// ---------------------------------------------------------------------------

export function formatPageInfo<T>(result: PageResponse<T>, noun: string): string {
  const start = result.page * result.size + 1;
  const end = start + result.content.length - 1;
  const more = result.hasNext ? ` (page ${result.page + 1} of ${result.totalPages})` : "";
  return `Showing ${start}–${end} of ${result.totalElements} ${noun}(s)${more}`;
}

// ---------------------------------------------------------------------------
// Book summary (one-liner)
// ---------------------------------------------------------------------------

export function formatBookSummary(book: BookSummary): string {
  const authors = book.authors?.join(", ") ?? "Unknown";
  const status = book.readStatus ? ` [${book.readStatus}]` : "";
  const rating = book.personalRating ? ` ★${book.personalRating}` : "";
  const series =
    book.seriesName
      ? ` (${book.seriesName}${book.seriesNumber != null ? ` #${book.seriesNumber}` : ""})`
      : "";
  const progress =
    book.readProgress != null && book.readProgress > 0
      ? ` ${Math.round(book.readProgress * 100)}%`
      : "";
  const format = book.primaryFileType ? ` [${book.primaryFileType}]` : "";

  return `• [${book.id}] ${book.title}${series} — ${authors}${status}${rating}${progress}${format}`;
}

// ---------------------------------------------------------------------------
// Book detail (full multi-line)
// ---------------------------------------------------------------------------

export function formatBookDetail(book: BookDetail): string {
  const lines: string[] = [];

  lines.push(`**${book.title}**`);
  if (book.subtitle) lines.push(`_${book.subtitle}_`);

  const authors = book.authors?.join(", ") ?? "Unknown";
  lines.push(`Author(s): ${authors}`);

  if (book.seriesName) {
    const num = book.seriesNumber != null ? ` #${book.seriesNumber}` : "";
    lines.push(`Series: ${book.seriesName}${num}`);
  }

  lines.push(`Library: ${book.libraryName ?? `ID ${book.libraryId}`}`);

  if (book.publisher) lines.push(`Publisher: ${book.publisher}`);
  if (book.publishedDate) lines.push(`Published: ${book.publishedDate}`);
  if (book.isbn13) lines.push(`ISBN-13: ${book.isbn13}`);
  if (book.language) lines.push(`Language: ${book.language}`);
  if (book.pageCount) lines.push(`Pages: ${book.pageCount}`);

  if (book.categories?.length) {
    lines.push(`Categories: ${book.categories.join(", ")}`);
  }

  // Ratings
  const personalRating = book.personalRating ? `★${book.personalRating}/5` : "none";
  const goodreads =
    book.goodreadsRating != null
      ? ` | Goodreads: ${book.goodreadsRating.toFixed(2)}${book.goodreadsReviewCount ? ` (${book.goodreadsReviewCount} reviews)` : ""}`
      : "";
  lines.push(`Rating: ${personalRating}${goodreads}`);

  if (book.readStatus) lines.push(`Status: ${book.readStatus}`);

  if (book.readProgress != null && book.readProgress > 0) {
    lines.push(`Progress: ${Math.round(book.readProgress * 100)}%`);
  }

  if (book.shelves?.length) {
    lines.push(`Shelves: ${book.shelves.map((s) => s.name).join(", ")}`);
  }

  if (book.fileTypes?.length) {
    lines.push(`Formats: ${book.fileTypes.join(", ")}`);
  }

  if (book.addedOn) lines.push(`Added: ${book.addedOn.substring(0, 10)}`);
  if (book.lastReadTime) lines.push(`Last read: ${book.lastReadTime.substring(0, 10)}`);

  // Progress details
  const progressBlocks: string[] = [];
  if (book.epubProgress?.percentage != null) {
    progressBlocks.push(`EPUB: ${Math.round(book.epubProgress.percentage * 100)}%`);
  }
  if (book.pdfProgress?.percentage != null) {
    progressBlocks.push(`PDF: page ${book.pdfProgress.page ?? "?"} (${Math.round(book.pdfProgress.percentage * 100)}%)`);
  }
  if (book.audiobookProgress?.percentage != null) {
    progressBlocks.push(`Audiobook: ${Math.round(book.audiobookProgress.percentage * 100)}%`);
  }
  if (progressBlocks.length) {
    lines.push(`Progress detail: ${progressBlocks.join(" | ")}`);
  }

  // Description
  if (book.description) {
    lines.push("", "Description:", book.description);
  }

  return lines.join("\n");
}
