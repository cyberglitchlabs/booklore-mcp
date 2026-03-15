<!-- Context: project-intelligence/notes | Priority: high | Version: 1.1 | Updated: 2026-03-15 -->

# Living Notes

> Active issues, technical debt, open questions, and insights. Keep this alive — update when status changes.

## Quick Reference

- **Purpose**: Capture current state, known gaps, and open questions
- **Update**: When gaps are addressed, new issues discovered, or priorities shift
- **Archive**: Move resolved items to bottom with resolution

---

## Technical Debt

| Item | Impact | Priority | Mitigation |
|------|--------|----------|------------|
| No test framework | Regressions possible on refactor; correctness relies on manual testing against live BookLore | High | Add Vitest; start with `format.ts` pure functions (easiest to test in isolation) |
| No linter / formatter | Style drift possible as contributors add tools | Medium | Add ESLint + Prettier; enforce via pre-commit hook |
| Zod schemas maintained manually | BookLore API changes silently break schemas | High | Accept as ongoing cost; document update procedure in `technical-domain.md` |
| No CI/CD pipeline | No automated build or type-check on PR/push | Low | Add GitHub Actions: `tsc --noEmit` + `npm run build` |
| `console.log` ban undocumented in code | Future contributors may add console.log and break MCP protocol | Medium | Add eslint rule: `no-console` (or a comment block in `index.ts`) |

### Technical Debt Details

**No Test Framework**
*Priority*: High
*Impact*: Any refactor of `client.ts`, `types.ts`, or `format.ts` has no safety net
*Root Cause*: v0.1.0 shipped fast as a personal tool; tests deferred
*Proposed Solution*: Add Vitest (ESM-native, no config overhead); start with `format.ts` pure function unit tests, then mock-based `client.ts` tests
*Effort*: Medium (2–4 hours for initial suite)
*Status*: Acknowledged

**No Linter / Formatter**
*Priority*: Medium
*Impact*: Style consistency maintained manually; harder to enforce `no-console` rule
*Root Cause*: Deferred for simplicity at v0.1.0
*Proposed Solution*: ESLint with TypeScript plugin + `no-console` rule; Prettier for formatting
*Effort*: Small (1–2 hours)
*Status*: Acknowledged

---

## Open Questions

| Question | Status | Next Action |
|----------|--------|-------------|
| Can BookLore API set reading progress (current page)? | Open | Check BookLore v2.x API source for PUT /progress endpoint |
| Should shelf add/remove book be exposed as MCP tools? | Open | Investigate BookLore API; assess risk of write operations |
| Is there a BookLore webhook or push mechanism? | Open | Would enable reactive tools (e.g., "notify when new book added") |
| Multi-user BookLore instances — scope in or out? | Open | Currently single-user assumption; would need auth scoping |

### Open Question Details

**Can BookLore API set reading progress (current page)?**
*Context*: `get_book` returns progress percentage but there's no `update_book_progress` tool. Users may want to update page/progress via AI.
*Options*: Investigate BookLore `/api/v1/app/books/{id}/progress` or similar endpoint
*Status*: Open

**Shelf write operations**
*Context*: Currently cannot add/remove books from shelves or create shelves via MCP. This is a common library management action.
*Options*: Add `add_book_to_shelf`, `remove_book_from_shelf`, `create_shelf`, `delete_shelf` tools
*Timeline*: After v0.1.0 stabilizes
*Status*: Open

---

## Known Issues

| Issue | Severity | Workaround | Status |
|-------|----------|------------|--------|
| BookLore API shape changes break Zod schemas silently | High | Pin BookLore version; re-test after BookLore updates | Known — inherent to unversioned API |
| `BOOKLORE_TOKEN` and credential vars both set → startup throws | Low | Use only one auth method | Known — intentional fail-fast |
| No graceful handling of BookLore server being unreachable | Medium | Connectivity check logs warning to stderr but server continues running | Known |

### Issue Details

**BookLore API shape changes**
*Severity*: High (when it happens)
*Impact*: Tools return errors instead of results after BookLore update
*Root Cause*: BookLore internal API has no versioning contract
*Workaround*: Pin BookLore version; only update BookLore when tested against current MCP server
*Fix Plan*: When breakage occurs, update Zod schemas in `types.ts` to match new shapes; release new MCP server version
*Status*: Known — manage as ongoing maintenance task

---

## Insights & Lessons Learned

### What Works Well

- **Zod-first API parsing** — Catching API shape issues at the boundary has already prevented silent failures; the investment was worth it
- **Domain-per-file tool structure** — Adding new tools is straightforward; each domain file is self-contained and short
- **`format.ts` isolation** — When output formatting needed adjustment, one file change updated all 18 read tools
- **Discriminated union auth** — Zero auth-related bugs since initial implementation; type system enforces the invariant
- **stderr-only logging** — No MCP protocol contamination incidents; contributors just need to know the rule

### What Could Be Better

- **No tests** — Any refactor is risky; pure functions in `format.ts` are screaming to be tested
- **Manual Zod schema maintenance** — There's no automated way to detect when BookLore API shape has changed; relies on manual testing or user bug reports
- **Tool discovery for new contributors** — 23 tools across 7 files; new contributors need to read `technical-domain.md` to understand the structure

### Lessons Learned

- **MCP stdout contamination is silent and catastrophic** — `console.log` breaks everything with no obvious error message. Document this prominently. See `decisions-log.md`.
- **Zod `.nullable().optional()` is the right default for unversioned APIs** — BookLore fields appear and disappear; permissive schemas with safe access patterns beat strict schemas that break on every API evolution
- **ESM + Node16 module resolution has friction** — The `.js` extension requirement in imports (even for `.ts` source files) trips up newcomers. Worth documenting in onboarding.

---

## Patterns & Conventions

### Code Patterns Worth Preserving

- **`registerXxxTools(server, client)` pattern** — Each domain file exports exactly one registration function. Keep this — it makes `tools/index.ts` a clean aggregator.
- **`z.infer<typeof XxxSchema>` type inference** — Never write a type twice; schema is the source of truth.
- **`process.stderr.write()` for all logging** — Not `console.log`, not `console.error`. `process.stderr.write()` only.
- **Pure functions in `format.ts`** — Formatters take typed objects, return strings, no side effects. Keep this separation.

### Gotchas for Maintainers

- **`.js` extensions in imports are required** — Even when importing `.ts` files, use `.js` extension (e.g., `import { Foo } from "./foo.js"`). This is a Node16 ESM requirement.
- **`console.log` will break the MCP server** — stdout belongs to the MCP protocol. Any console output to stdout corrupts the session.
- **Zod schemas need updating after BookLore upgrades** — Don't assume compatibility. Run integration tests against a fresh BookLore instance after any BookLore version bump.
- **Auth config is fail-fast** — If both token and credentials are set, the server throws at startup. This is intentional.
- **Tools registered before `server.connect()` but also valid after** — The MCP SDK supports lazy registration; don't worry about registration order.

---

## Active Projects / Upcoming Work

| Project | Goal | Timeline |
|---------|------|----------|
| Add test framework (Vitest) | Safety net for refactors | Next milestone |
| Expand write operations | Shelf management, notebook write ops | Post v0.1.0 stabilization |
| Investigate progress write API | Enable `update_book_progress` tool | Research needed first |
| Add linter + formatter | Enforce `no-console` rule, consistent style | Near-term |

---

## Archive (Resolved Items)

_Nothing archived yet — project is at v0.1.0._

---

## Onboarding Checklist

- [x] Review known technical debt (no tests, no linter) and understand impact
- [x] Know the open questions (progress write, shelf write, multi-user)
- [x] Understand the BookLore API volatility issue and the Zod mitigation
- [x] Be aware of the `.js` extension gotcha for ESM imports
- [x] Know that `console.log` is banned (stdout belongs to MCP)
- [x] Understand current patterns worth preserving (`registerXxx`, `z.infer`, `format.ts`)

## Related Files

- `decisions-log.md` - Past decisions that inform current state
- `business-domain.md` - Business context for current priorities
- `technical-domain.md` - Technical context for current state
- `business-tech-bridge.md` - Context for current trade-offs and gaps
