# The Observant Muse: Almanac voice guide

For anyone writing or reviewing lines in `content/almanac/`. Muse notices what matters, says something worth reading, and knows when to be quiet. This extends the approved voice in [PRODUCT_RULES](PRODUCT_RULES.md) ("warm, clever, occasionally cheeky/poetic, never clinical, corporate, preachy or relentlessly positive"). The checkable parts are enforced by `lib/almanac/voice-rules.ts`; the rest is judgment.

## The one rule

**The observation is the compliment.** Muse doesn't grade, cheer or advise. It names something true and specific about the person's own records, and lets that land. If the line would fit anyone's app, it doesn't belong in Muse.

## Muse does

- **Name the specific thing.** The book, the ritual, the hour, the count. "9 pm is your reading hour, Sundays especially." beats "You love reading at night!"
- **Stay inside the evidence.** Write only what the signal proves. A share of 40% is "a lot of", never "most". A comparison is "side by side", never "because".
- **Use one image per line, at most**, and only one the data supports. Dragons appear only when 🐉 is on the books.
- **Treat missing as missing.** Unlogged days aren't misses. Plans aren't meals. A snapshot is a snapshot. Every Little Revelation keeps its caveat.
- **End early.** Short lines, then stop. No closing pep talk.
- **Count streaks the way the app does.** Ritual streaks are scheduled opportunities or weeks, never calendar days. A streak that ended is never mentioned.

## Muse doesn't

- Congratulate generically: "Great job!", "Congratulations", "Achievement unlocked", "Proud of you".
- Use slogans: "Keep crushing it", "You've got this", "Level up", "Hustle", "Best self".
- Instruct: "You should…", "Don't forget to…", "Remember to…", "Why not…".
- Claim causes: "Reading makes you happier", "Thanks to your walks…". Muse can see that two things travel together, not why.
- Psychologize: "You seem stressed", "You're avoiding something", "Deep down…".
- Speak with spiritual certainty: "The universe is telling you…", "Meant to be", "Manifesting".
- Sound like a machine: tapestry, testament to, delve, embark, journey, elevate, symphony of.
- Stack punctuation, or use more than one exclamation point across an entry's variants (most have none).
- Pad a family with near-duplicates to hit a count. Fewer, better lines win.

## Sub-voices

| Family | Voice | Example |
| --- | --- | --- |
| Reading | Literary and wry | "Late chapters again. Your bookmark keeps night-shift hours." |
| Rituals | Steady and admiring | "11 scheduled days in a row for Stretch. Less a streak than a groove now." |
| Little Revelations | Clear first, charming second | "Planned 19, done 14. Anything you moved simply moved." |
| Dreams & Tarot | Mischievous, openly not literal | "The Star, back again. The deck is not being subtle." |
| Mood, Money, Wellness, cross-module | Plain and careful. No jokes about feelings, bodies or money | "Hopeful, often. You named it in 7 of 12 check-ins. A count, not a conclusion." |
| Field Notes | Unhurried, like a friend reading back your week | "Months like this are easy to forget while they're happening. Now you won't." |

## Formats

- **Whisper**: one line in context (module header, empty state, beside a stat). 110 characters rendered. At least 3 variants. Never sensitive.
- **Little Revelation**: title (72) and body (300). At least 3 variants. Keeps its evidence and caveat.
- **Field Note**: title and sections (520 each, 1,600 total). At least 2 variants. A section whose fact is missing or zero drops out; it is never filled in.
- **Constellation**: a cross-module comparison, title and body (380). At least 2 variants. Always states both sample sizes.

## Privacy in the words

- Variables come only from the signal catalog (`lib/almanac/signal-catalog.ts`): computed counts, shares, hours, dates, money and display names the person chose (a book title, a ritual name). Free text the person wrote (reflections, notes, reviews, dream text) is never available to a line.
- Sensitive entries (mood, money, body, anything cross-module with mood) use a plain or steady tone and never appear as whispers.
- Money amounts appear only in revelations.

## Writing and approving

1. Write the entry in its family file in `content/almanac/`. Give each variant a genuinely different angle, not a synonym swap.
2. Run `npm run almanac` (or `npm test`). Fix every error. "Read alike" warnings are for judgment.
3. Run `npm run almanac -- --review /tmp/almanac.html` and read every line as it will appear, with realistic sample facts. Add a `sample` to an entry when the catalog's example doesn't fit its conditions.
4. Approve: set `status` to `approved` and fill `review.reviewedBy`. Stephanie has delegated line approval (2026-11-06); she reviews by exception.
5. Changing a published line bumps `version`. Retiring keeps the id.

Statuses: `draft` → `review` → `approved` → `published` → `retired`. Only `published` is ever shown; publishing happens when the surface that shows the family ships.
