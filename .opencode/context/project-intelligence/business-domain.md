<!-- Context: project-intelligence/business | Priority: high | Version: 1.1 | Updated: 2026-03-15 -->

# Business Domain

> Business context, problems solved, and value created by booklore-mcp.

## Quick Reference

- **Purpose**: Understand why this project exists
- **Update When**: New tools added, BookLore API changes, major feature pivots
- **Audience**: Developers needing context, contributors, AI agents

## Project Identity

```
Project Name: booklore-mcp
Tagline: Natural language access to your self-hosted BookLore digital library via AI assistants
Problem Statement: BookLore users with large personal libraries can't easily query, track, or
                   interact with their collection through natural language — they must navigate
                   the BookLore web UI for every action.
Solution: An MCP server that exposes BookLore's API as structured tools, enabling AI clients
          (Claude, Cursor, etc.) to act as a natural language interface to the library.
```

## Target Users

| User Segment | Who They Are | What They Need | Pain Points |
|--------------|--------------|----------------|-------------|
| Primary | Self-hosted BookLore users who also use AI assistants | Natural language queries against their personal book library | Having to switch between AI chat and BookLore UI for book lookups |
| Secondary | Power readers | Track reading progress, manage shelves, retrieve highlights without leaving their AI workflow | Context switching kills flow when mid-conversation |
| Tertiary | Developers / contributors | Understand the codebase to extend or maintain it | No project context documents (solved by this file) |

## Value Proposition

**For Users**:
- Ask "what am I currently reading?" or "find unread sci-fi" in natural language — no UI required
- Update ratings and reading status mid-conversation without leaving Claude/Cursor
- Retrieve highlights and notes from books to reference them in AI workflows
- Browse series, authors, and shelves through conversation

**For the Open Source Ecosystem**:
- Reference implementation for MCP + self-hosted home server integration
- Demonstrates dual-auth (token + credential) pattern for MCP servers
- Shows domain-organized tool registration at scale (23 tools across 6 domains)

## Success Metrics

| Metric | Definition | Target | Current |
|--------|------------|--------|---------|
| Tool coverage | % of BookLore features accessible via MCP | 80%+ read ops | ~70% — write ops limited to rating + status |
| Auth reliability | Token refresh success on 401 | 100% | Working — auto-refresh on 401 implemented |
| Response clarity | AI-readable formatted output | Human-readable text | ✅ format.ts isolation ensures this |

## Business Model

```
Revenue Model: Open source / personal use tool — no revenue
Pricing Strategy: Free (MIT license)
Unit Economics: N/A
Market Position: Niche — serves BookLore self-hosters who use MCP-compatible AI clients
```

## Key Stakeholders

| Role | Responsibility |
|------|----------------|
| Author / Maintainer | Feature direction, API compatibility, releases |
| BookLore upstream | Provides the API this server wraps — changes can break tools |
| MCP SDK maintainers | Protocol changes may require updates to transport/tool registration |

## Roadmap Context

**Current Focus**: Stable read operations + basic write (rating, status) — v0.1.0 baseline
**Next Milestone**: Expand write operations (shelf management, book notes/highlights editing)
**Long-term Vision**: Full CRUD parity with BookLore's web UI via natural language

## Business Constraints

- **BookLore API is internal and unversioned** — targets v2.x; upstream API changes can silently break tools without a semver guarantee
- **stdio-only transport** — by MCP design; no web server, no HTTP endpoints exposed
- **Single-user personal tool** — not designed for multi-tenant or concurrent AI client access
- **No BookLore SDK** — must reverse-engineer API shape from responses; Zod schemas are the only contract

## Onboarding Checklist

- [x] Understand the problem statement (BookLore + AI gap)
- [x] Identify target users (self-hosted BookLore + AI assistant users)
- [x] Know the key value proposition (natural language library access)
- [x] Understand BookLore API constraint (unversioned, may change)
- [x] Know current scope (read-heavy, limited write ops)

## Related Files

- `technical-domain.md` - How this is solved technically
- `business-tech-bridge.md` - Mapping between user needs and technical tools
- `decisions-log.md` - Key decisions with context (auth, transport, formatting)
