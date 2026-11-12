# Intentions: period-appropriate layouts (proposal for #119)

**Status: proposal only. Nothing here is implemented or approved.** Per #119 this is the research step; the next step is Stephanie choosing a direction.

## What exists today

Planner → Intentions (#117) has four periods: Week (Mon–Sun), Month, Quarter (calendar) and Year. Every period renders the same page: a cover row, then a two-column grid of sections (`theme` and `writing` span both columns; `list`, `priorities`, `forward`, `aspirations`, `rituals`, `bucket`, `boards` sit in the grid). The sections differ by prompts and a slightly different personality per period, but the *shape* is identical, so a year looks like a week with different words.

## What each period is actually for

| Period | Horizon | The question it answers | Natural density |
| --- | --- | --- | --- |
| Week | 7 days | What matters *this* week, and what will I do about it? | Small, concrete, checkable |
| Month | ~30 days | What am I steering toward, and what rhythms support it? | A few focus areas plus habits |
| Quarter | ~90 days | What do I want to have changed by the end of this season? | A theme, 3 outcomes, a review |
| Year | 12 months | Who do I want to be, and which bets am I making? | Few, large, reflective |

Rule of thumb: **the longer the period, the fewer items, the more writing, and the more it should reference (not copy) smaller periods and Envision.**

## Proposed layouts

### Week: "the working page" (compact, actionable)
- Seven-day strip across the top (Mon–Sun) showing today, with each day's priorities count taken from Planner (reference, not copy).
- Left (wide): *Top priorities* (max 5, checkable, same records as Planner priorities), then *This week I will…* list.
- Right (narrow): *Intention of the week* (one line, big editorial type), *Rituals to protect* (links to Rituals), *Mood note* (optional).
- Footer: end-of-week reflection prompt that appears from Friday.

### Month: "the dashboard" (focus + rhythm)
- Header: month theme (one phrase) with a progress ring of weekly intentions completed.
- Row of 3–4 *Focus areas* cards (each: title, why, 1–3 next steps). Different colour per card.
- Below: a four/five-week ladder; each week is a compact chip row linking to that week's page (reference to week records).
- Side: *Habits to keep* (from Rituals), *Aspirations moving* (from Envision, read-only references).

### Quarter: "the season plan" (outcomes + review)
- Large theme banner plus a *three outcomes* trio (numbered, with a measure of success each).
- Month-by-month swimlane (3 columns: month 1/2/3) showing each month's focus areas as references.
- *Steer / Finish / Let go* triptych (the existing quarter prompts) as three equal cards.
- Mid-quarter check-in card that surfaces at the halfway date, and a closing retrospective.

### Year: "the vision spread" (few, large, reflective)
- Word/theme of the year as the hero, with a chosen emoji and colour.
- Four quarter tiles (Q1–Q4) as a row; each shows its theme once written, empty ones invite writing.
- *Big bets* (max 3–5) with *why*, linked to Envision aspirations and Bucket List entries by reference.
- Long-form writing blocks: *Who I'm becoming*, *What I'm leaving behind*; a year-in-review slot that fills in from December.

## Shared principles (all periods)
1. Same components and tokens (frosted section, vivid per-section colour, solid tags); only the arrangement changes.
2. References, never copies: priorities, rituals, aspirations and bucket entries stay owned by their modules; Intentions stores ids plus name snapshots so later edits never rewrite saved history (Muse Cohesion Check).
3. Equal-height rows and a solid grid; carousels for overflow; no accordions.
4. Phone: single column in reading order (hero → outcomes → writing → references).

## Options for Stephanie
- **A. Four tailored layouts (recommended):** Week working page, Month dashboard, Quarter season plan, Year vision spread, as above. Most distinctive, most work (four arrangements, same data model, no migration expected).
- **B. Two families:** "Planning" (Week + Month) and "Reflecting" (Quarter + Year). Less work, still distinct.
- **C. One layout with period-aware emphasis:** keep today's grid but reorder sections and change density per period. Least work, least distinction.

## Open questions
- Should the Week page read priorities straight from Planner (so ticking one updates both)?
- Do we want a mid-period check-in nudge (halfway) or keep Intentions entirely passive?
- Should finished periods become a read-only "page" with a review summary?
