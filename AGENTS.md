# Working on Muse

Muse has intentional product semantics and a documented design system. Before changes:
- Read [PRODUCT_RULES](docs/PRODUCT_RULES.md) for product/architecture decisions.
- Read [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md) for UI changes.
- Read the relevant [FEATURE_SPEC](docs/FEATURE_SPEC.md) section before implementing a feature.
- Treat documented approved decisions as source of truth unless Stephanie explicitly changes them.
- Extend existing components, semantic tokens, interactions, and architecture; avoid one-off imitations.
- Preserve distinctions between data even when concepts share a UI. Never silently remove established behavior for implementation convenience.
- Update the appropriate docs when Stephanie approves a durable decision. Distinguish implemented, approved/planned, and future/exploratory behavior; brainstorming alone is not a rule.
- Do not commit or push unless explicitly instructed.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
