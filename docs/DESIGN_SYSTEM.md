# Muse design system

## Character

Sophisticated, feminine, editorial, celestial, ethereal, vibrant, luminous, structured, polished: “grown-ass-woman cute.” Avoid pastel SaaS, muted-purple-everything, childish cartoons, generic confetti, unrelated sparkles, photography backgrounds, arbitrary cards, beige productivity UI, and one purple/pink palette applied to every theme.

**Structure first, whimsy second.** Disciplined grids share margins, gaps, radii, padding, alignment, and sizing rules. Desktop uses width deliberately; mobile recomposes. Future reorderable cards snap to the grid.

## Typography and stars

All functional UI uses the existing modern sans-serif: branding, navigation, headings, tasks, notes, budgets, charts, controls, labels, numbers. Italic display serif is reserved for approved whimsical editorial copy, particularly the Daily Edit greeting. `--font-ui` and `--font-whimsy` keep families globally swappable; do not add fonts casually.

Use the existing elongated, clean four-point `MuseStar` at all sizes, with theme colors and restrained opacity variation. No five-point/cartoon decorative stars or Unicode sparkle families. The small outlined favorite icon is a functional preference action, never a decorative star. The optional profile-driven constellation uses these nodes and fine lines, stays decorative, and respects reduced motion. Cosmic Forecast uses a small theme-aware moon/star motif without a zodiac wheel.

## Material and atmosphere

Layer CSS radial glows over a base with recognizable pools of light and readable neutral space. Current Glitter! and Curses! dimensional atmosphere are reference quality. Shared haze/aurora light and sparse header flecks add richness; no dense star field behind data. Each theme supplies its own bloom distribution, haze, constellation ink and edge/accent hierarchy. No photography.

Crystal (implemented): tinted polished glass with layered low-opacity internal theme reflections, a restrained upper/side specular highlight, inset edge light, prismatic borders and depth shadow. Backdrop blur/saturation lets atmospheric light interact with the material while preserving fill behind text; a luminous border alone is insufficient. Frosted (implemented): higher opacity, stronger diffusion/blur, lower saturation/refraction and quieter internal light. The material switch must be immediately visible without sacrificing contrast. Both are available from the shared theme picker and use the same markup/tokens. Changing material never changes information architecture. Light glass must not become opaque white; dark glass must not become opaque black.

## Themes are identities, not background swaps

A theme must remain recognizable with the page background hidden. Atmospheric softness must not leak into functional accents: neutral readable text and controlled glass coexist with vivid selected borders, active navigation/icon accents, completion, progress, badges, focus and sparse magical points. Prefer vivid but controlled over tastefully muted. Dark accents should read like tiny colored lights; most text and surface area stays restrained. Shared markup/layout/behavior inherit a complete semantic visual language: active navigation, chips, dates, completion, progress, links, icons, focus, hover edges, borders, success, Spark, stars, popovers, and future charts.

| Theme | Identity and accent hierarchy | Distinct behavior |
| --- | --- | --- |
| Glitter! | Ethereal/pearlescent/airy/prismatic/girly. Aqua primary; lavender/orchid secondary; bubblegum/raspberry blush pop; sky support | Luminous pearlescent selected glass; aqua → violet → blush progress; preserve rich current atmosphere |
| Midnight Ballerina! | Celestial/electric/cool/deep space. Cobalt primary; icy cyan secondary; ultraviolet pop; royal/azure support | Blue-cosmos active navigation/completion, cyan focus/Spark, ultraviolet selection; cobalt → electric blue → cyan progress. Pink minimal; never a navy Curses! |
| Pretty Toxic! | Lush/jewel/romantic/moody/botanical-night. Emerald primary; peacock teal secondary; wine/berry pop; turquoise support | Emerald selection/completion, peacock navigation/information, rose actions/links/filter selection, vivid raspberry stars/badges/edge light and progress endpoint. Cool left/dimensional center/black-cherry-wine upper-right/emerald lower-right atmosphere; a smaller rose field bridges the center. Both warm and cool identities are visible, with fewer rainbow effects. No sage/muddy forest/Christmas palette |
| Sunburnt & Sinful! | Warm/sunlit/juicy/fresh/editorial. Raspberry primary; coral/tangerine secondary; turquoise pop; selective gold support | Raspberry selection, coral active states, turquoise contrast, warm detail; turquoise/aqua progress with raspberry/coral. No beige/washed-out cream |
| Curses! | Dark/prismatic/fashion-editorial/cinematic/luxurious. Fuchsia primary; violet secondary; electric blue pop; selective cyan support | Preserve the existing atmosphere, with a localized fuchsia hero splash. Cyan/blue navigation and informational links, violet primary actions/filters and fuchsia completion distribute its identity. Retains its established blue → violet → fuchsia gradients, edge refraction and dramatic prismatic contrast; do not spread all its tricks to every theme |
| ISSYA BDAY! | Frosting-white candy-coated maximalism; vivid bubblegum/cherry/tangerine/lemon/lime/aqua/cobalt/grape | Pearl candy Crystal and frosting diffusion, deterministic multicolor interactions, cosmic sprinkles; white stays white |
| ISSYA BDAY XXX! | Near-black after-hours sibling, same candy palette and semantic logic | Black candy glass and purpose-designed soft dark materials; selective luminous sprinkles, large black regions; never navy/plum |
| Neon Hangover! | Near-black neutral graphite/charcoal/smoked glass; vivid LED-like pastel/neon light. Acid mint/aqua primary; electric lilac/periwinkle secondary; neon peach/coral and hot pink sparingly | Mint/lilac selected light, mint → lilac → pink hover, aqua/periwinkle/lilac/pink progress, coordinated pastel stars. No navy-space base or RGB rainbow |
| Disco Damage XXXTRA! | Near-black violet / liquid chrome / hot pink / ultraviolet / cyan / selective disco gold | Most reflective Crystal, silver primary MuseStar, hot-pink and cyan companions, holographic foil, abundant star glitter, chrome glints and irregular cobalt/cyan/fuchsia/violet/lime/gold refraction through the full page. No literal mirrorball; Frosted remains softer |

Approved display names are independent from stored IDs: `iridescent` = Glitter!, `astral` = Midnight Ballerina!, `nightbloom` = Pretty Toxic!, `solstice` = Sunburnt & Sinful!, `prism-noir` = Curses!, `afterglow` = Neon Hangover!, `issya-bday` / `issya-bday-xxx` keep their birthday names, and the new `disco-damage` = Disco Damage XXXTRA!. Palette references to old names describe those stable IDs, not a migration or replacement theme.

## Tokens and implementation

`app/themes.css` is the color source; `lib/themes.ts` is the registry/preview source. Each theme supplies the same token contract. `app/globals.css` owns shared geometry/typography; components do not contain theme-specific hex colors. Legacy color-family tokens remain compatibility roles; new UI consumes semantic action (`--action-fill`), warm accent (`--accent-warm`), navigation light (`--navigation-accent`), selection (`--selected-background/border/text`), navigation (`--navigation-background/text`), completion (`--success-primary/secondary`), focus (`--focus-ring`), hover (`--hover-start/middle/end`), progress, star, surface, and ink roles. Workspace/tag colors reference `--accent-primary/secondary/pop` through stable semantic role IDs, so custom organization stays compatible with all themes. Local charts consume semantic theme-relative accent roles, not component-specific palette hex values. A future theme primarily adds a registry entry and complete token block.

Keep dark/light inputs, placeholders, secondary text, disabled controls, dropdowns, and focus readable. Theme changes cannot change layout, spacing, typography, or functionality.

Use plain prefixed component CSS: the current Turbopack CSS transform does not reliably export CSS-module class mappings. Revisit that pipeline separately before introducing modules.

## Surface roles and theme atmospheres (#111) — implemented on feature branch, awaiting review

In a role theme the **background is the centrepiece**; content stays calm.

| Role | Token | Rule |
|---|---|---|
| Canvas | `--background` + `--atmosphere-bloom/pool/haze-layers` | Layered CSS gradients only: several light sources, dark and luminous zones, directional light. Each theme has its own composition. |
| Sidebar | `--surface-sidebar` (`--tone-sidebar`) | Its own layer, clearly distinct from the canvas. Navigation styling is unchanged. Phone navigation uses the same layer. |
| Card surface | `--glass-background` (+ `--planning-*` for Planner) | **One surface per theme.** No alternating or per-widget card colours. Nested panels, inputs and chips are lighter/darker variations of it. |
| Card outline | `--card-border-gradient` (`--tone-card-border`) | A thin masked gradient ring in the theme's palette sequence; the fill stays one colour. |
| Card ink | `--tone-card-ink/-muted/-accent` | Only for light cards on a dark canvas (Midnight Ballerina, Pretty Toxic, Booze Piñata): everything painted with the card surface re-points text, links, chart inks and nested tints. |
| Accents | `--accent-*`, `--icon-gradient-*`, `--chart-*`, `--selected-*`, `--focus-ring` | Carry the full palette in icons, underlines, progress, selected and focus states. Text labels stay neutral. |

- Cards are nearly opaque (about .84–.97) so a vivid atmosphere never turns them into a patchwork; the canvas shows around and between them.
- Only themes listed in `app/surfaces.css` opt in; all other themes render exactly as before.
- Theme Atelier edits each theme's atmosphere as layers (its catalog reads the theme block).
- Theme review (Appearance → Theme review) compares themes on real screens; lab palettes (`themeExperiments`) never appear in regular pickers.

## Reusable interaction language

`app/interactions.css` provides theme-aware gradient borders for actual interactive surfaces through `.muse-edge` and shared control selectors. Silky restrained transitions; optional tiny lift; no bouncing. Keyboard focus is equally visible. Static MuseCard surfaces must not falsely advertise clickability.

`MuseSpark` / `useMuseSpark` supply a brief, local 2–4 official-star success treatment for meaningful completion. Absolute positioning, no flow/layout movement, no confetti or big particles. Reduced motion substitutes a brief static glow. Selected states use semantic tint, luminous border, readable selected ink, and optional inner highlight. Progress uses the active theme's own gradient.

Use personality selectively; no slogan in every card. Native semantics, comfortable 44px touch targets, visible focus, labelled controls, keyboard alternatives, and reduced-motion rules are required.

## Header and shell

Preserve the approved desktop rail (200px/68px collapsed), line icons, grouped navigation, active MuseStar, compact 36px destination rows with thin dividers under the logo and between groups, a small MuseStar beside the Whimsy heading, prismatic destination icons (home, calendar, flame, heart-pulse, bar chart, wallet, brain, bookshelf, orbit, tarot cards, moon-star, wand, palette, gear), and floating glass mobile Today/Planner/Rituals/More. A quiet 44px toggle at the top outer edge replaces the bottom text-heavy Collapse row. Two restrained independent MuseStars occupy only the expanded logo region; they disappear when collapsed. No connector/constellation line may cross the logo or link it to the toggle. Theme the shell through tokens, not a redesign.

Daily Edit uses dominant whimsical greeting plus a functional temporal cluster inside an abstract cosmic field. The three theme-colored MuseStars sit immediately LEFT of the date pill with breathing room, week below; theme switching no longer consumes hero space. The fast global theme/material control is near Appearance/Settings in the sidebar, orb-only when collapsed, and outside heroes in mobile app chrome. Do not add height or make a centered illustration track. Hide decoration before controls crowd. “The Daily Edit” remains a section title before the grid.

## Planner composition

Planner inherits this same system. Desktop has a **280px planning rail** (approved range 260–320px) beside one flexible rolling three-day canvas. The layout has exactly two structural children, rail and canvas; do not reintroduce separately placed/spanning utility rows. Both have explicit available-width constraints and min-width:0. The rail's surface, top workspace switcher, internally scrolling source cards and bottom quick capture distinguish it from dated tracks. Remove persistent Unscheduled/count/helper/New workspace rows; the source list begins below the workspace selector and capture stays at the bottom. New workspace is a separated action inside the existing custom workspace popover, with semantic markers, selection and keyboard navigation. The day grid evenly divides the remaining width, displaying three columns at roomy desktop sizes, two below 1050px of content width, and one at/below 820px. Reduce the visible count before cards become unreadable; next/previous still shift the three-day data window one day. Workspace selects context; one compact Filters popover contains group/tag/status controls. Search and Filters sit in the Task List header (approved #79 §12) and govern both the list and the canvas; Today/previous/next and Board Settings stay in the secondary toolbar. The Task List is a pinned source sheet: an accent spine, an editorial title with a count, a header band, To plan / Overdue / Scheduled / All scopes, sticky group labels and dense divided rows (no per-row cards), while days remain glass cards holding task cards. The workspace switcher opens contextual choices/counts and New workspace/organization management, not a huge board-wide select. Arrows shift one day, not by rigid weeks. Day headers retain task totals and human-readable planned duration (for example 2h 45m). Mobile has a focused day, date/week navigation and manual Move in Details; Task List opens in a sheet. Workspace/source creation stay in that sheet; search/day navigation/Filters remain outside. It does not squeeze three columns. Task surfaces are quiet glass; workspace dots and compact theme-aware tags carry organization. Title opens Details; completion, timer and classification controls retain distinct semantics. Day cards have no persistent drag handle or Move link; Task List rows carry a quiet Schedule (calendar) action — Today/Migrate to today, Tomorrow, visible board days, Next Monday, any date, Back to the Task List — as the keyboard/touch path. Ordering remains in Details. While any task is dragged, every day shows a dashed destination with a "Drop to plan for …" label and the list shows "Drop here to unschedule". Overdue (›) and Priority (★) markers match Agenda. Native desktop drag targets use Drop Glow; the dragged surface lifts subtly without changing layout, and a meaningful successful placement gets a tiny Muse Spark. Move supplies keyboard/touch access. Due-before-plan is contextual date information, not a failure judgment.

The reusable `MuseDrawer` uses a native dialog: modal focus containment, Escape, inert background, separate header/scrolling content, theme-aware glass, and return focus. Popovers remain bounded floating surfaces. Within native sheets they portal into the active dialog, with local coordinates, so the native inert/focus boundary does not disable them. `useMuseDialog` supplies the common lifecycle for sheets and the larger `MuseModal`; initial focus, native Escape/focus containment, scroll lock and return focus are shared.

## Dark material hierarchy

Maintain three visible levels: atmospheric page → rail/column/group container → task/interactive surface. `--planning-container-background`, `--planning-rail-background`, `--planning-task-background`, `--planning-task-border`, and `--planning-control-background` are supplied by all nine themes. Dark cards come forward with lighter translucent, theme-tinted surfaces and clear edges; secondary text must remain readable. Never flatten the atmosphere into opaque gray boxes. Existing Curses! atmosphere/global glass is preserved; its new planning surfaces improve separation locally.

## Ritual rhythm and feedback

Rituals uses the shared two-line functional page header (title Rituals + official star signature, fixed mantra “ON REPEAT, BY DESIGN”), a week context and user-named grouped rows. Desktop rows align seven status cells to weekday/date headers. Mobile stacks groups and shows one selected-day control per row beneath the compact week navigator, retaining weekly goals/context and 44px touch targets.

States are visually and semantically distinct: Complete, Partial, explicitly Missed (×), past Unknown (○), Upcoming, and neutral Not Scheduled (—); today may remain open. Weekly sessions display as logged toward a weekly goal, not completed daily goals. Partial numeric/duration cells use the group-gradient ring with actual value/short unit. Complete uses a vivid dimensional theme-gradient orb, with a centered white check for binary rituals or a centered achieved numeric value plus small high-contrast neutral/white-check badge. The footprint/alignment does not change. A darkened center behind white ink and restrained specular/edge light preserve contrast while multicolor edges remain luminous. Completed quantities never retain a full progress ring. Weekly-target entries remain session values; their weekly aggregate clearly marks goal completion. No selected/today double-ring completion treatment. Missed and unknown remain visually distinct. Avoid decorating every gap or making group containers appear clickable.

Reusable `OrbitalGlint` marks ordinary Ritual completion: one MuseStar and a thin sweeping arc, about 580ms, local and pointer-transparent. `ConstellationCelebration` marks meaningful streak thresholds: four official nodes, fine sequential connections, under one second, contained and cleanly removed. Existing Muse Spark remains the task/priority completion language. Reduced motion replaces orbital/constellation movement with a brief static theme glow; no confetti, layout changes or cartoon particles. Hover/focus/press continue to use shared Muse edges and semantic colors.

Literal hero constellation/orbit/path/botanical drawings are retired from the active composition. A dormant profile constellation utility is not rendered by Daily Edit; broader zodiac personalization remains FUTURE/EXPLORATORY. The optional Cosmic Forecast card now has manual settings and an unavailable provider boundary; no API is connected.

## Materials, atmosphere and interaction tokens

`app/materials.css` switches optical roles via root data-material. Its root-qualified surface selectors deliberately outrank component background shorthands, which previously erased the painted glass layers. Shared internal radial/linear reflections use theme accents; there are no per-card theme hex values. Crystal uses 22px blur/1.4 saturation; Frosted 34px/1.05 with higher fill and much lower internal light. Add no second blur to every nested meal/task surface and no animated gradients/filters on static cards; this preserves material hierarchy and limits rendering cost. Every theme supplies Crystal/Frosted glass, floating, input and planning-surface colors; Frosted has greater opacity/diffusion. All shared cards, rails, groups, Nourish day/meal surfaces, popovers and drawers use material blur and surface roles. Material cannot change width, spacing, typography, or information architecture.

`app/atmosphere.css` supplies a single document-height atmospheric plane behind the app. The shell owns its absolute full-content layer; viewport-relative upper anchors preserve theme identity while non-repeating lower aurora fields span changing page heights. Hero gradients fade vertically/horizontally instead of ending as disconnected banners. `MuseAtmosphere` owns full-document glows and sparse deterministic stars/dust. `PageCelestial` is now dormant; active headers use the normal-flow signature without literal line-art overlays. Disco adds nonliteral holographic caustics and official-star glitter in the shared background plane; no measured literal-art overlay. Each module supplies different composition/scale/direction/density: personal sky, directional Planner sweep, rhythmic Ritual haze, organic Nourish glow, emotional Mood aurora, Money refraction and sparse Notes trails. No high-level line-art hero components remain underneath it. Foreground text/controls stay readable; no big rasters, canvas animation or continuously animated filters.

`lib/motion.ts` is the common timing source, exposed as root CSS variables. The reusable vocabulary is Muse Spark, Orbital Glint, Constellation Celebration, Prism Edge, Celestial Drift, Star Shimmer and Drop Glow. Keep feedback brief/silky; no bounce/confetti. Reduced motion removes drift/shimmer/travel/lift and retains static color/glow and visible state changes.

Ritual group identity is integrated in a narrow luminous banner/header wash, never a saturated data panel. Theme-relative primary/secondary/pop gradient presets are part of the group model and editable in Manage groups. Full custom colors/gradients remain future Appearance/editor direction.

## Card-header action roles

`CardHeading` composes a functional title/icon, optional informational `ModuleBadge`, optional Manage link/button, and meaningful existing actions. Source badges are compact, use semantic theme accents, and are not duplicate links. Manage/record Edit/Settings retain their distinct meanings. Today's Plan omits the redundant header item count; accurate overflow counts remain within its bounded Schedule and Tasks sections. Meals links to date-specific Nourish; Water manages goal/quick amounts separately from editing today's quantity. Do not add actions purely for symmetry.

## Nourish composition

Nourish shares the Muse header, date/week navigation, drawers, theme/material tokens and interaction vocabulary. Desktop presents deliberate Monday–Sunday rows with aligned breakfast/lunch/dinner/snacks slots. Meal lists within a slot are bounded scroll regions; empty slots provide a quiet Add affordance. Mobile shows only the selected day's stacked slots with the same assignment semantics and comfortable controls. Plan is the default of Plan / Saved Meals / Grocery List. Saved Meals is a proper searchable/type-filtered library view with creation/edit sheets; multi-type chips default to the active slot when saving from a day. Grocery List is a grouped shopping surface with compact checkbox glyphs inside comfortable touch targets, restrained Spark, optional quantity/note, and completed items retained until cleared. Native desktop drag uses shared Drop Glow and a tiny success Spark; explicit Move/Copy sheets provide keyboard/touch alternatives. Optional nutrition lives in a secondary collapsible editor; daily totals are compact and disclose incomplete data. Daily Edit uses the same shared summary component, limited to two known fields. No nutrition charts, recipe dashboard, food photography or unrelated decoration.

## Color correction and optical verification

Accents and readable ink are different roles. Bright `--action-fill`, `--navigation-accent`, selection/focus/success/progress/star tokens must not be derived from pale metadata text or diluted by surface opacity. Source badges retain readable ink with a vivid theme edge; navigation uses an accent edge/icon alongside readable labels. Themes supply localized hero glow and bloom-size/position tokens, allowing cyan Midnight Ballerina!, warm Pretty Toxic! and fuchsia Curses! to light the header without moving any component. Neon Hangover! concentrates LED-bright color in localized fields against predominantly neutral near-black; never turn it into navy, dusty pastels or colored clouds across the entire page.

Automated numeric checks cover filled action/completion labels, material text over representative atmospheric blooms/reflected light, all theme token contracts and dark planning separation. They are not browser contrast/visual approval, especially with actual backdrop compositing. Preserve system reduced-motion handling; the Crystal refinement adds static painted light rather than animated filter work.

## Module hero composition and mantra

Same universe, different abstract region. Functional text and date/context sit inside an environmental field, never copy | centered illustration | controls. Soft nebula/aurora/refraction/haze overlap and crop across the entire hero at varied depths; crisp theme MuseStars are sparse punctuation. Faint oversized arcs never resolve into an atom, map, vine or recognizable diagram. Module composition responds to theme. Existing Curses! base atmosphere is preserved; Pretty Toxic! includes berry and teal; birthday adds controlled cosmic sprinkles. Primary supporting copy is a personal mantra, not a feature description. No literal currency, food, paper or zodiac clip art.

Daily Edit’s star flourish uses the shared normal-flow signature zone beside the editorial copy; date/week occupy their own column. Theme/material switching is global sidebar/app chrome. Abstract art reduces before functional controls crowd; there is no taller decorative stack.

## Ritual status and week-strip geometry

Ritual/day intersections retain centered controls in fixed cell footprints. Partial quantity/duration uses its existing ring and value. Complete is a polished multicolor theme-gradient orb: checkbox has a central white check; numeric/duration retains its central value with a small neutral high-contrast white-check badge. No full progress ring survives completion. Unknown/open, explicit Missed, neutral non-interactive unscheduled dash and quiet Upcoming remain distinct. Week-date rings count full scheduled daily completions only; a perfect day earns the golden AchievementStar. Percent/counts remain accessible labels rather than permanent text. Selected date/today/completion remain separate. Group banners are clipped to their container.

## Large searchable picker pattern

`MuseModal` is content-sized by default (roughly 660px wide, at most min(760px, 85dvh), centered on mobile within safe areas). `size="tall"` keeps the fixed 75dvh desktop picker and the near-full-width 90dvh mobile sheet for editors and pickers with an inner scroller; short screens use the available height. Native modal focus containment/Escape and shared lifecycle return focus to the trigger. Results use a roving tab stop with arrow/Home/End navigation, so Tab can reach Done directly. Search/quadrant filters and Done are non-scrolling flex regions; only results have min-height:0/overflow-y:auto. Desktop results use two columns, narrow screens one. Quadrant controls may scroll horizontally, never as a second vertical area. The floating material retains its dedicated depth shadow and Crystal/Frosted optics. No new motion is required.

## Stable compact planning surfaces

Task List and day containers share stable desktop sizing; internal task regions own overflow and source controls stay outside the scroll area. Short lists remain top-aligned. Task cards use the same compact hierarchy in rail and canvas, with a balanced completion/title/timer row and clickable classification plus comfortably padded tags in the second row. Scheduling facts/estimates/subtasks/due dates stay in Details by default; due preview is an optional component configuration awaiting future user settings. Timer controls expand into an inline glass panel with tracked and estimated values kept distinct. Classification offers separate Workspace and Group controls; full Details uses the shared MuseChoiceMenu instead of native selects. Touch targets remain comfortable when metadata recomposes on mobile. Theme/material switching never changes this geometry.

## Functional multicolor roles

Semantic roles distribute color across actions (`--action-fill` / `--interactive-primary`), links (`--link-ink`), information (`--information-accent`), active nav icon (`--nav-icon`), selection, secondary filters (`--filter-selected-*`), completion (`--success-primary`), progress and prismatic hover/focus edges. Readable text inks stay distinct from luminous edge colors. Every theme supplies this complete contract. Curses! uses cyan/blue for navigation/information, violet for primary actions and filter selection, fuchsia for completion and progress endpoints. Pretty Toxic! uses rose actions/links/filter selections alongside teal/emerald information, navigation and completion. Its warm palette is functional, not merely atmospheric. Other themes retain their coordinated multicolor identities; no background redesign or rainbow-everywhere controls.

## Compact libraries and Money

Saved Meals uses a responsive three/two/one-column grid of natural-height cards, visible Edit and a shared overflow menu. Grocery categories form a three/two/one-column grid with per-category inline capture and collapsible sections, plus an aligned global name/optional quantity/category/Add row. Optional details open separately; checked rows recede below active rows without disappearing.

`MuseSectionNav` supplies shared compact module sections for Nourish and Money. Money uses the shared page header with “Money” plus MuseStar and the fixed page mantra “REASONS WHY I'M NOT A MILLIONAIRE” Abstract directional refraction, layered glow and sparse theme nodes form its signature; no coins/currency/financial clip art. Structured overview panels, a segmented allocation ribbon, paired plan/actual bars, category spending bars, compact transaction ledger and thin card utilization bars share Crystal/Frosted optics. Numbers/labels use readable foreground/muted inks; only small dots, bars, selection and edges carry vivid semantic category colors. Five theme-relative accent roles keep categories distinct across themes. Mobile stacks panels and rearranges ledger metadata without shrinking amounts or requiring a giant horizontal table.

Paycheck adjustments and saved transactions use a restrained Muse Spark; marking bills paid gives local feedback; fully allocated positive plans show a golden AchievementStar and guarded earned glint on the transition, never on initial history load. Existing reduced-motion feedback applies. No component-specific palette or new animation framework is introduced.

## Global theme chrome and golden reward primitive

`ThemeSwitcher` is shared in the desktop sidebar footer near Appearance/Settings, compact orb when collapsed; mobile reaches theme/material previews through More → Appearance. It retains immediate theme/material preferences and uniquely identified floating menus with keyboard/Escape/outside behavior. Appearance remains the future deeper preference destination; no route change is required for quick switching. Headers contain no theme picker.

`AchievementStar` references the canonical `MUSE_STAR_PATH` rather than defining another shape. Gold/champagne/amber/light-edge/halo tokens are global semantic rewards, never theme-recolored. `AchievementBadge` renders earned state with an accessible label and guards first-transition feedback; already-earned mount is calm. Gold appears for Water at/above target, fully completed scheduled daily Rituals and positive fully allocated paychecks, not every action or recurring payment. Reduced motion retains a static state/glow. Ordinary MuseStar stays theme-colored and decorative; never put gold into hero atmosphere.

## Birthday optical identity

ISSYA BDAY! / Frosting and ISSYA BDAY XXX! / After Hours are sibling registry entries. Their shared CANDY COATED REALNESS palette is aqua, bubblegum, lime, tangerine, grape, cobalt, cherry and lemon. Functional mapping is deterministic: aqua nav, bubblegum links, tangerine action, grape selection/focus, lime timer, cobalt information, cherry destructive/urgency, multicolor progress/orbs. Eight shared chart roles are ready for data visualizations; no random recoloring. Each supplies the full semantic and Crystal/Frosted contract. White surfaces are pearl/frosting white; dark surfaces use near-black candy glass with neutral elevated task surfaces, not aubergine. Existing six themes keep their identities/backgrounds.

`CosmicSprinkles` uses designed small capsule/dash/dot/diamond/curve pieces with fixed module variations and controlled depth. Only birthday themes display them. Sparse static atmosphere is distinct from the first meaningful-goal celebration: eight brief local candy pieces disappear while the gold AchievementStar remains. No falling/full-screen confetti, constant party animation or ordinary-checkbox burst. All new movement has a reduced-motion static fallback.

## Nourish macros and recurring density

Assigned meal tiles replace default note/source copy with one compact known-value Cal/P/C/F row, naturally wrapping without tiny type. Known zero is shown; unknown fields are omitted. Title, macros and secondary Move/Copy remain the hierarchy; data/details and daily nutrition totals remain intact. Drag activation uses non-interactive tile areas rather than a permanent handle.

Money Recurring uses compact chronological rows and a bounded dashboard preview. Name/real charge-frequency/next date lead, then separate Billed through and Paid with. A single compact Filters popover contains category/method/source/status, with All/Monthly/Yearly controls and search. Add/edit uses existing Muse drawers and choice menus; custom interval/source/method details reveal only when needed. Mobile stacks name+amount, next date, provider/method without basic horizontal scrolling. Expected cost totals/category equivalents never masquerade as actual spending. No new generic finance styling or system selects.

## Current atmosphere, safe zones and control geometry

The shared `.muse-atmosphere` belongs to the full scrollable shell, not a fixed-height hero or repeated page section. Themes provide document-layer upper anchors alongside existing bloom colors; lower fields remain soft, continuous and non-repeating. Every route inherits it. `PageCelestial` fades at its edges and measures the actual control cluster through layout/resize observation, ending decoration before date/week/toolbar hit areas with a safety gutter. Conservative CSS safe regions apply before hydration; narrow layouts omit art before it can collide. The reusable normal-flow star cluster compresses before controls crowd and hides only at the smallest temporal width. This uses geometry/masks, not only z-index.

Daily Edit retains a small, subordinate rotating supporting mantra beneath the existing serif greeting. `lib/mantras.ts` now owns only the Daily Edit and Insights five-line collections; their profile-local daily cadence, previous sequences, DST-safe refresh and hydration fallback remain unchanged. Fixed module mantras live in `lib/page-header.ts`; they never rotate. Selected-date navigation does not alter the editorial clock.

Shared tag padding, line-height, radius and gaps protect text from colored edges. Metadata tags stay compact; interactive chips retain comfortable targets. Search fields share internal padding and contained focus outlines; scroll/dialog/popover controls use inset focus where an outer ring would clip. Existing theme-specific functional accents are retained. Shared popover positioning intersects the visible viewport (including mobile keyboard offsets) with a modal boundary, chooses a useful side or available viewport space, and clamps width/height without an overflowing forced minimum. Choice menus and Planner Filters use one results scroll region with persistent controls/footer.

## Money authored columns and readable ledgers

Overview has two authored independent flex stacks inside a two-column grid, with content-sized cards and token-based 24px gutters. Left is Current paycheck/Recorded spending/Recurring; right is Coming up/Plan-actual. Full-width Recent Spending follows both stacks. Small widths become one DOM-consistent reading-order stack. No equal-height cards, random masonry or filler padding. Header navigation/period spacing uses the existing 12/16px control rhythm.

Paychecks uses three bounded period choices plus a searchable historical selector. The selected plan gives title/date/remaining more presence. Allocation rows put name and a compact semantic category chip together in the first cell, followed by planned amount, actual/variance and overflow action; numeric columns use tabular figures and readable text, with labels exposed when mobile rows recompose. Category editing uses the shared Muse choice control/markers, never a native select. Bills use aligned name/cadence/date/amount/text status/payment/edit; statuses use theme selection/information/urgency roles without removing text labels. Touch layouts stack fields instead of shrinking financial values into tiny type.


## Full-content living galaxy and signature

`MuseAtmosphere` is an absolute document-height plane within the isolated app shell, spanning the full content area rather than a fixed viewport or hero. Existing theme upper anchors remain; six overlapping relative middle/lower radial fields prevent a flat center/bottom. No repeated texture, raster, canvas dependency or continuously moving blur. Sparse deterministically positioned dust, small bokeh and occasional official stars cover the scrollable plane. Irregular birthday-only candy dashes are distributed through that plane; the retired header-centered circular sprinkle arrangement is not used. The tiny earned-goal birthday feedback remains a separate short-lived action effect.

`MuseStarCluster` composes the canonical elongated four-point path in three coordinated sizes, theme colors and asymmetric offsets. Daily Edit and module titles use it in a designated normal-flow copy/signature slot, separate from date controls. It is pointer-transparent and yields to functional controls. The signature may glint once on arrival when reduced motion is not requested; it never loops or pulses continuously. All nine themes share markup/material/layout; palette differences remain semantic tokens. Birthday glows are richer while Frosting keeps a white base and After Hours a near-black base. Curses!'s theme palette is unchanged.

## Mood composition and controls

Mood is a structured roughly 60/40 layout: an independently sized left stack of Feelings/Influences then a separate Day in Three card, beside Day Pulse; Reflection + a secondary four-family Mood Meter follow. Compact history rows and restrained factual summaries follow. Mobile stacks. No inner card inside Feelings. Ruby/red, blue, green and yellow/gold remain identifiable emotional families, with readable theme foreground text; selected feeling chips carry a subtle family wash/edge. Active controls, focus, glass, feedback and charts continue to inherit theme roles.

The large emotion modal has persistent search, All/Favorites/quadrant filters, one scrollable results region and a separate Done footer. Arrow navigation selects a results tab stop; only that feeling's favorite/available definition utility is also tabbable before Done. The small outline favorite icon is a functional preference action, distinct from decorative MuseStars; it is never used as atmosphere. F is a favorite shortcut while browsing results. Available definitions open a quiet inline note. Influences use selected compact chips plus a searchable, bounded floating picker with custom creation and a three-selection limit.

The existing luminous ten-step Pulse control is reused unchanged in meaning: Energy, Stress and Overall Day are separate optional values, with individual Clear and whole-card Reset. Higher Stress is not success. No aggregate score or invented coordinate plot. Reflection is optional and updates the shared session record; feedback says Updated in this session, not saved to a backend. Confirmed deletion removes the whole dated period record.

## Grocery and Money ledger correction

Empty groceries show six compact common category cards with Add item. A populated board shows relevant sections by default; Show all keeps the complete thirteen-section library accessible. Category header/name/count align, checked items remain identifiable, and quantity is subordinate. Item text does not masquerade as a form: edit/remove are right-edge pencil/trash icon buttons with labels/tooltips. The checkbox glyph is small, but row controls retain comfortable targets. Undo is an inline strip rather than an intrusive toast. Desktop capture aligns name (widest), optional quantity, category and Add; mobile uses explicit tracks. Note belongs in the sheet.

Allocation identity is an inline flex group (name button + colored rounded category chip + chevron) inside ONE grid cell, never a separate category column that drops beneath the name. `MuseChoiceMenu`'s chip variant reuses the same searchable glass popover and keyboard behavior. Focus outlines the actual name/chip, not its enclosing ledger column. Numeric Planned/Actual columns stay right-aligned with variance beneath Actual; overflow stays far-right. Relevant due dates and bill dates use calendar-safe short labels. Bills use a plain readable name action, cadence, date, amount, status chip, compact Mark paid/Undo paid button and overflow. No financial arithmetic changes.


## Unified header and spacing rhythm

`MuseHeaderFrame` is the common normal-flow two-column frame. Copy and controls top-align; the title row owns a separate decorative signature slot. Standard headers use two lines: existing title plus official three-star signature, then one compact uppercase supporting mantra. There is no eyebrow above the title or additional subtitle below the mantra. Daily Edit substitutes its stable personalized italic-serif greeting for a functional module title; it has no extra copy padding, absolute positioning or negative margins. Date/week align within the right column; arrows keep their full touch width and long labels ellipsize. At narrower content widths the context stacks below copy. No PageCelestial or constellation lines are rendered in these headers.

Semantic rhythm tokens cover header top/copy/content, module nav, toolbar, week, section and card gaps. Choose the right relationship instead of adding margins on both adjacent blocks. Module gaps are generally 16–24px; titles retain shared typography, with Daily Edit's restrained larger greeting as the editorial exception. Rituals and Nourish remove former excess header height/summary padding/stacked margins. Controls and canonical data/workflows retain their geometry and semantics. Money's global date control and financial reporting selector are explicitly different controls.

The sidebar is the only fast theme picker. Mobile reaches all theme/material previews through More → Appearance; no duplicate picker floats over a module. All nine registry entries share IDs/preferences/tokens/markup, including a proper chrome/holographic Disco swatch.

## Notes material and density

Notes is a working surface: compact tag tree, separator-led note list, largest writing pane. The outer workspace uses shared Crystal/Frosted optics and quiet pane separators; no nested large card dashboard. Tags/list have independent overflow, while the writing region owns prose scrolling. Its opaque theme base protects paragraphs from stars and beams. Titles and text use existing sans typography; no new font. Selected rows, tags, focus and toolbar states use semantic theme roles across light/dark/Disco.

Pane collapse and focus reallocate the existing grid without unmounting the active editor or changing the selected note/search/draft. Mobile progressively navigates Tags/List/Editor instead of shrinking three columns. Compact desktop formatting controls expand to comfortable touch targets; mobile toolbar scrolls within its own strip. Native Tiptap checklists are styled to Muse, and link/tag editors use shared floating controls. The serious writing canvas stays visually calmer than the surrounding cosmos.

Disco uses luminous foil, prismatic caustics, chrome glints and abundant official-star glitter. No literal sphere or image remains. A slow composited light sweep and restrained twinkle yield to Quiet and reduced motion; glass/writing surfaces remain readable. Other theme identities are unchanged.


## Daily Edit Forecast placement

The editorial two-column header top-aligns the stable personalized italic-serif greeting and date pill. A small rotating mantra follows the greeting; the seven-day strip follows the date. The Daily Edit section heading follows the entire header. Cosmic Forecast is the first **full-width actual card** in the main content grid, directly above Priorities with matching horizontal gutters. It is never nested in the right header track or positioned upward with CSS. Preserve its existing glass/gradient treatment, compact preview/details interaction and provider/date behavior; natural content height supports longer copy. Mobile follows header → heading → full-width Forecast → Priorities.

Inside Observatory Horoscopes, use the shared source reading as an editorial composition: a sign/date masthead, one prominent opening section, separate provider-labelled sections in a two-column desktop grid that becomes one column on mobile, followed by any source key dates, closing copy and attribution. Keep the Daily Edit closed state to a short excerpt; its disclosure opens the full shared composition. Use existing theme surface, border and foreground tokens for legibility in every appearance.

## Disco mirrorball environment

The approved Disco-only signature is a spherical, projected mirrorball asset, not a gradient circle. The optimized transparent SVG has 1,152 small projected silver/chrome facets, fine dark mirror gaps, coherent rounded depth, white specular highlights and overlaid pink/cyan/violet/lime reflected light. Individual tiles are neutral mirrors, not opaque rainbow-painted squares. It is a static local asset with no embedded raster or script. Partial upper cropping integrates it into the shared document-height atmosphere; there is no image card or rectangular hero boundary.

`DiscoAtmosphere` reserves measured header identity/context regions through exclusion masks and observes route/layout changes. Conservative initial masks apply before measurement. Decorative layers are pointer-transparent and cannot create document dimensions. Reflected fragments use deterministic irregular clusters with varied scale, rotation, opacity and color; middle/lower glows continue across long pages. Only the Disco token block changes: cobalt and lime join chrome/fuchsia/violet/cyan/gold chart/reflection roles, while brighter art sits behind slightly stronger readable translucent glass. Other eight theme palettes and shared layout remain untouched. Notes retains its quiet opaque writing plane. Optional mirrorball highlight motion is slow, confined to the small decorative asset, and disabled under reduced motion; full-document caustic fields are static.

## Insights chart and editorial system

Insights extends the shared header, official three-star signature, rotating mantra, section navigation, glass materials and nine-theme semantic chart roles. The editorial Overview combines a primary observation and compact relevant values, activity with separate series, traceable revelations and perspective; no generic KPI wall or aggregate life score. Full-width and paired panels follow content height with shared gutters, stacking at narrow content widths. Charts stay calmer than surrounding atmosphere.

`InsightChart` provides a caption, units, no-data state and scrollable Read the values table, preserving zero versus Not recorded. Recharts supplies accessible line/bar/stacked-bar/donut interaction, tooltips, axes and legends; numeric tooltips retain units and date tooltips include the year. Category drill-down keys use stable IDs, not display-name equality. Plot rendering is client-only behind Next dynamic loading, while captions and source-value tables remain available in server markup. The date inspector uses the existing accessible drawer. Charts are static by default, with no motion required to understand data.

The ritual consistency grid exposes text state counts and keyboard date inspection; full, partial, explicitly missed, unknown, unscheduled and future differ through border/fill/label treatments, not color alone. Month/year headings prevent ambiguous day numbers. Zero-data modules offer useful owner links rather than fabricated charts. All chart data surfaces use shared Crystal/Frosted and theme tokens, never per-theme duplicate components. Source/sample notices, denominators, coverage and comparison caveats are part of the design, not hidden implementation trivia.


## Prismatic icon hierarchy — no decorative icon tiles

Keep the existing recognizable icon paths, square viewBox, dimensions and 1.6 rounded stroke. `MuseIcon` is monochrome `currentColor` by default; `treatment="prismatic"` opts a prominent icon into the reusable `PrismaticSvg` paint server. Each SVG uses its own React `useId` linear-gradient definition for actual stroke/fill paint, never SVG background-clip. Shared primary/secondary/tertiary tone orderings distribute each theme's palette without changing geometry. No icon library, font or theme ID changes.

All nine theme blocks explicitly supply `--icon-gradient-start`, `--icon-gradient-middle`, `--icon-gradient-end`, `--icon-gradient-highlight` and `--icon-edge`. Chromatic stops are vivid, opaque and distinct from muted text or reward gold; the glyph uses three vivid opaque chromatic stops, without a pale reflective band or base blur washing out the stroke. Interactive surface highlights remain separate. Functional icon roles do not alter the other eight themes' backgrounds. Glitter uses lavender/aqua/pink; Midnight Ballerina blue/cyan/ultraviolet; Pretty Toxic emerald/mint/berry; Sunburnt & Sinful coral/raspberry/peach; Curses violet/fuchsia/cyan; Neon Hangover peach/mint/lilac; birthday variants coordinated candy; Disco chrome/violet/pink with cyan edge light.

Hierarchy:
- Main navigation: sharp prismatic icons at the existing desktop/mobile sizes, including active destinations. No enclosing jewel boxes. Existing readable labels and parent focus outlines remain.
- Featured card/group/section identity icons: vivid theme-aware SVG gradients directly beside text, with **no background tile, glass box, decorative border, rounded-square enclosure or shadowed wrapper**. `CardHeading` renders the gradient glyph directly; the legacy `GlassIcon` entry point is now a surface-free compatibility glyph. The gradients are the decoration; icons do not need their own furniture.
- Primary module identity: the existing three-star signature uses the same canonical elongated geometry, three coordinated sizes/offsets and three prismatic tone orderings. It stays in the designated normal-flow safe zone. A single subtle arrival glint replaces perpetual signature shimmer.
- Selected secondary filters may use a prismatic icon; ordinary action/utility icons (search, edit, trash, close, chevrons, stopwatch, formatting) stay readable single-color.
- Achievement: the separate cross-theme gold AchievementStar retains its existing geometry/meaning; never recolor it with icon tokens.

Standalone icons have identical surface-free geometry in Crystal and Frosted; only their theme-aware SVG paint provides decoration. SVGs are hidden from assistive technology, unfocusable and pointer-transparent; accessible names belong to their controls. Hover/focus/active luminance is restrained and transitions in 180ms without resizing. Reduced motion removes these transitions and the optional arrival animation while retaining selected color/state.

## Water finish-line achievement

Water's gold star belongs to the right endpoint of its progress track, vertically centered, not beside the total. A stable endpoint gutter/height reserves space in both states; only the track clips its fill. Header amount/goal/Edit/Manage and quick additions remain separate. The numeric value remains true above goal; only fill/aria-valuenow cap at the target, and the accessible description/status says the goal was reached.

A genuine below-goal → at/above-goal transition fills the bar (220ms), then starts a brief endpoint glint and gold star flash/scale/settle (650ms), approximately 870ms total. The settled star remains. Unrelated renders or additional above-goal quantities do not replay it. Editing below goal hides/rearms it; a later genuine crossing can celebrate again, including a threshold crossed by changing the goal. Loading an already-completed day renders the settled state immediately. Reduced motion shows the final state directly with static gold feedback.

`AchievementBadge` owns this reusable transition policy. Water opts into reentry; existing Ritual/Money milestones retain their once-per-mounted-scope policy and history/loading guards. No task/bill gains a gold reward. Existing birthday-only local earned feedback is preserved; no new confetti or full-screen animation.

## Holographic Disco correction

The previous oversized painted-tile globe is replaced. Disco's sphere is now a smaller, partially cropped background accent with neutral chrome mirrors and spatially coherent colored reflection. It stays hidden until header safe regions are measured; route/content/size changes refresh those exclusions. It cannot participate in grid/flex sizing or intercept controls. Functional controls are never shrunk to fit art.

Disco's extravagance comes mainly from the continuous full-page environment: indigo/black/violet base, pink/cyan/cobalt/violet blooms, irregular reflective fragments, static prismatic streaks/caustic patches and sparse sharp official stars/glitter. Notes keeps its quiet writing canvas. Static full-page fields avoid animated large blur/filter work; a slow clipped ball highlight is the only new continuous motion. Crystal/Frosted share readable interiors and their established material differences. Planner's search and Filters/Today/arrows use explicit aligned tracks, with an intentional small-screen stack. Its three-day board, controls, task data and dimensions remain.


## Universal header, controls and customization refinement

`MuseHeaderFrame` owns shared header column minimum/width tokens, top alignment and responsive stacking. The standard date track has no module-specific top padding. Daily Edit uses `DailyEditHeader` with an explicit `.muse-daily-header-right` single-column grid containing date and week in DOM order. Forecast occupies a full-width main-grid track after The Daily Edit heading and before Priorities. Shared header ends before the section title/Priorities; the same stars/mantra/materials remain. Planner's search/Filters/Today/arrows move to a secondary toolbar; it retains its three-day board and fixed source rail.

`MuseIconButton` and `MuseCloseButton` provide quiet actions and a restrained prismatic glass X. `ColorLabel` owns dot/icon/name spacing; raw custom colors appear in bounded dots, swatches, edges and charts, with foreground ink kept readable. Chips have compact/default/spacious size hooks, with coarse-pointer targets expanded. Picker option focus outlines are inset so scrolling containers cannot clip them.

Planner workspace/group/tag and Ritual group managers expand the selected row's form directly beneath it. Save/Cancel stay local, Escape cancels, and creation has its own explicit entry. Complex ritual definitions retain the intentional details drawer; progress logging remains separate. `MuseColorPicker` provides theme presets, a visual color input, validated hex field and preview. `MuseGradientBuilder` adds two/three colors, preview, preset mixes and direction without filling the banner with opaque bright paint. `MuseIconPicker` is an inline expandable search/category region inside its owning form/dialog; it never portals behind a drawer. The curated extended SVG chunk has its own loading boundary and a reserved icon box, preventing page suspension/layout shift.

Floating selectors derive their native-dialog host from the trigger anchor in a layout lifecycle, rather than whichever element happens to have focus during render. A shared active-panel stack gives Escape/outside/focus dismissal to the topmost nested picker. Existing native dialog focus containment, scroll lock and return remain. Destructive overflow choices require local confirmation. No z-index-only repair or new overlay framework.

Saved Meals uses an auto-filled compact grid (about four/five tiles at wide content widths), small type tags/known macros, pencil and overflow. Notes remain editable metadata rather than permanent tile filler. A compact sort trigger follows the type filters and composes with search. Add Meal offers current type first, then All/other types; selection retains the destination slot and nutrition snapshot. Mood quadrant chips gain deliberate dot/text/padding gaps without changing vocabulary/favorites.

Money Spending uses a name/category-chip identity area, secondary payment/tag context, right-aligned tabular amount and far-right overflow. Split edits preserve amounts and unknown remainder. Recurring shares compact name/status/category, cadence/amount, readable next date, distinct source/method and actions; cards retain their existing structure with quieter recurring rows. Custom category color also reaches chart marks; normal text never uses arbitrary raw color as its only readable ink.

## V1 motion and writing-space polish

Three shared motion levels: everyday 120–250ms (hover/press, check reveal, popover/disclosure arrival, selected-state transitions); little magic 300–600ms (three-star Spark, Ritual Orbital Glint, note pin/create/archive feedback, saved reflection); meaningful milestone 600–1000ms (official shooting MuseStar with thin prismatic trail or contained group glint). Use existing theme tokens, transforms/opacity and short-lived local UI state. No stored playback flags, layout shifts, confetti, animated typing or financial-value count-up. Progress uses existing interpolated fill/ring treatments. Closing a compact disclosure remains immediate where preserving focus/interaction is more useful than delaying unmount.

Appearance exposes Muse Magic: Quiet suppresses decorative bursts and atmospheric shimmer while retaining clear states; Magical uses the shared baseline; Extra adds restrained milestone luminance. Device reduced motion overrides all levels. Water's existing achievement choreography and approved Ritual gradient orbs are preserved. No initial-history or navigation celebration. Pulse values use neutral selected-value feedback; Clear has its own normal-flow legend action beside the value, outside the ten-segment target area.

Notes has no page-level action toolbar or sample disclaimer footer. The workspace begins directly after the shared header and measures its usable viewport remainder, reserving mobile navigation/safe space. Default tracks allocate about 15% tags / 22% list / 63% editor, respecting minimum widths. Hidden-tag/Focus states reflow the same editor DOM; list/tag/prose overflow stays internal. Compact icon actions remain transparent, with native tooltips and visible focus. At small widths a single pane is shown with explicit list/editor/tag restoration, and New note collapses to its plus icon. No extra square icon boxes, font changes, data-store changes or drag-resizer framework.

EmojiPicker renders native Unicode using lazily loaded Emojibase name/category metadata (including skin variants), not bundled vendor artwork. Search and category controls stay above a bounded result grid; results own scrolling, Escape/outside/X dismiss and arrows navigate results. Show more progressively reveals the broad vocabulary without thousands of initial DOM buttons. OS glyph support varies. Intention emoji sits beside the same editable intention; Day in Three uses ordered compact controls. A Dayprint is a daily projection with optional expression and separate session sections, not a second check-in editor.

Feeling Families summary labels disclose quadrant energy/pleasantness; individual result names and the existing Yale capture cards are unchanged. Means display independent n values. History omits missing dimensions. /login-preview shares the continuous atmosphere and readable glass, hides app chrome only for that route while preserving providers, and omits Disco's literal ball. Its email states are explicitly design previews. No new font, auth request, redirect or session reset is introduced. Whimsy reuses the standard shared title/mantra/star signature and three simple Coming Soon surfaces.

## Compact page headers — current approved standard

`MusePageHeader` and `MuseHeaderFrame` share the normal-flow title/signature/context grid. Standard identity is **title → one uppercase mantra**; remove both the old eyebrow and any additional supporting subtitle. Preserve the existing title size/weight and the official three-star safe zone. Mantras use existing sans-serif/secondary ink, a small shared size, subtle readable tracking, normal wrapping and approximately 6–10px title spacing. Do not create a hero card or shrink functional controls.

The centralized fixed registry (`lib/page-header.ts`) contains the exact approved identity copy:

| Module | Fixed page mantra |
| --- | --- |
| Planner | THE ART OF GETTING SH!T DONE |
| Rituals | ON REPEAT, BY DESIGN |
| Nourish | A GIRL'S GOTTA EAT |
| Mood | FEEL IT. NAME IT. TRACK IT. |
| Money | REASONS WHY I'M NOT A MILLIONAIRE |
| Notes | GET IT OUT OF YOUR HEAD |
| Whimsy | A LITTLE MAGIC NEVER HURT |

Money uses its mantra once in the primary module header, not on each subsection. Daily Edit remains the editorial exception: unchanged personalized serif greeting, existing rotating supporting line, date/week controls, with one full-width Forecast in content below. Insights preserves its meaningful daily rotating copy within the compact two-line standard. Settings and Appearance preserve their existing meaningful supporting strings; uppercase is presentation rather than replacement copy.

Title and existing right-side date control top-align. Date geometry/behavior, materials, themes and touch targets remain unchanged. Standard modules have no artificial minimum hero height: removing the old copy/minimum brings Planner's existing secondary toolbar and canvas upward through normal document flow. Content gaps remain token-driven, not negative margins/absolute positioning. Narrow layouts stack copy before context; long Money copy wraps without clipping. Notes simply gains usable height through its existing measured workspace, without editor/pane logic changes.

Future Whimsy art/reveal interactions and optional widgets remain **PLANNED / NOT YET IMPLEMENTED**, not additions to this header pass. Reuse official stars, theme-aware glass, responsive reading hierarchy and reduced-motion equivalents when those experiences are designed; the detailed scope and sensitive-content guardrails live in [WHIMSY_ROADMAP.md](WHIMSY_ROADMAP.md).

## Targeted layout / modal / expression corrections

Desktop Planner height derives from measured header/toolbar/gutters and any footer remainder, rather than fixed subtraction or an upper cap. Rail and date surfaces share the stable result. Source/day content owns overflow; quick capture stays at the bottom. Short viewports and mobile use sensible natural minimums/page scrolling. Classification reserves a full spacing token (approximately 16–20px) after search, consistent heading/options gaps, outer padding and visible close space, while keeping existing portal/collision behavior.

`MuseModal` explicitly lays out vertically. Feeling selection uses a horizontal title + clear monochrome X header, then search/quadrants, one scrolling list and persistent count/Done footer. No close-button sidebar. Other native-modal focus/Escape/return behavior remains. Functional icons stay sharp single-color; decorative/module SVGs retain unique three-stop theme gradients and fixed geometry. Glass reflections belong to surfaces, not translucent icon strokes. No theme palette or Yale category change.

Mood cards size naturally: check-in, Reflection and distinct Day in Three stack at left, Pulse at right; mobile stacks the same DOM order. Daily Edit Reflection reuses Mood's Morning/Evening segmented control and theme styling; its editor displays the selected period's saved text and keeps each unsaved draft separate. The Day in Three picker shows a selected count/slots and the full searchable/category vocabulary, remains open for up to three choices, supports explicit slot replacement/removal and has a separate Done/Cancel footer. Only Done commits the draft. Confirmed chips use simple edit/remove controls, with no cycling arrows. Native emoji appearance remains OS-dependent; original date-keyed state is reused.

Dayprint header has date/intention left, labeled Day in Three and compact ratings right, with a clean narrow-screen stack. Existing ratings are explicitly **Morning ratings / Evening ratings**, not silently relabeled daily values. Emotional session bodies retain feelings/context/reflections/edit/delete without repeating ratings. The single daily Pulse entity is approved but not migrated; legacy conflict handling still requires a decision; see the correction report for the actual model/provenance boundary. No fake scores or new history store.

## Compact shared spacing rhythm

Use the existing 4/8/12/16/20/24/32px scale, not a second spacing framework. Labels and controls belong together (8px); inline related controls/chip rows use 8px with explicit wrapping; related form groups use 12–16px; distinct sections generally use 20–24px. Card interiors remain the shared card-padding token. Do not add margin and parent gap for the same relationship. Optional/unit annotations sit inline beside their field name, never in a separate form row.

Drawer headers retain 16px vertical/20px horizontal padding, followed by 20px body padding and a safe-area-aware ending. Native dialog headers stay outside their scrolling body. Filter-to-results spacing is explicit: Saved Meals has at least16px plus result inset (about20px to first result); clear24px transition from meal actions to saved choices and comfortable ending padding. Avoid a second nested result scrollbar inside a drawer when the drawer body already scrolls. Footer actions remain reachable, with focus scroll margins and no overlapping fixed content. Compact density and touch targets are independent: clarify groups without inflating every row.

Standalone icon paint is shared across all modules/themes. Actual buttons, selectable icon choices, semantic status markers, category color dots and focus rings keep their functional surfaces. No change to icon geometry, gradients, palette or AchievementStar meaning is authorized by removing decorative tiles.

See [ARCHITECTURE_AUDIT](ARCHITECTURE_AUDIT.md) for observed state/UX gaps and [DATABASE_BLUEPRINT](DATABASE_BLUEPRINT.md) for proposed persistence. Neither document authorizes backend implementation.

## Money preview and picker containment

Money Overview follows the later approved Session 2 composition: Current paycheck and Coming up form the first desktop pair; Recorded spending and Plan / actual begin on the same second-row boundary. Recurring is full-width afterward, followed by Recent spending. Cards retain natural heights and standard token gutters; never stretch cards or add filler to disguise differing content heights. Narrow screens stack in DOM reading order. Recurring summary rows share label, right-aligned tabular amount, and metadata tracks, with metadata wrapping below on narrow screens.

Coming up is a bounded preview using the Bills ledger language: readable clickable name, separate readable due date and right-aligned tabular amount, subtle separators and a focus ring on the real name control. Keep + Bill and current obligation selection/calculation behavior; do not add management actions. Paycheck navigation keeps three compact centered groups (small Previous/Current/Next label, name, readable range), theme-aware selection and a separate Past Paychecks menu. Bound maximum widths rather than consuming every spare pixel; narrow tracks compress gracefully and longer names retain their full tooltip.

Icon/emoji pickers adapt to their parent, never expand the modal to fit themselves. All grid/flex ancestors need zero implicit minimum widths; search fills the remaining header width beside its close control. Icon categories wrap with shared gaps rather than becoming a horizontal strip. Functional icon choices retain their selectable tiles; this is different from prohibited decorative identity-icon boxes. Results use an adaptive bounded vertical scrolling grid with final-row padding and inset focus. Native emoji retains its full vocabulary and own visual identity; responsive column count also determines arrow-key navigation. Do not hide an incorrectly sized layout with overflow-x suppression.


## Live authentication preserves the standalone Muse identity

The functional `/login` and non-sending `/login-preview` share `MuseLoginFrame`, the existing atmosphere/material tokens and original login CSS. Preserve the editorial brand copy, official stars, split desktop composition and mobile stack. Sending, cooldown, validation, expired-link, unavailable and signed-out messages belong inside the existing form feedback area; no new auth dashboard or separate visual system. Private app navigation appears only after verification. Sign out reuses sidebar and mobile More navigation styles. See [AUTH_LOCAL](AUTH_LOCAL.md) for implementation and validation.


## Persistence feedback without a visual redesign

Daily capture keeps the existing cards, controls, typography and materials. A compact shared status line distinguishes initial loading, refreshing, saving, confirmed saved data and failures. Disable revision-dependent capture until it loads; failed/conflicting drafts remain available with retry or explicit discard/load-latest and a readable draft review. Do not present a transient optimistic state as a confirmed durable save. Historical views label one daily Pulse independently of Morning/Evening sessions. Creation/removal/order controls for standalone priorities use existing compact buttons; decorative styling and other module layouts remain unchanged.

### Linked priority capture

Use a compact existing link icon and searchable Muse glass popover beside the existing priority actions; do not turn daily commitments into task cards. Preserve their own text and date. Keep commitment text usable at narrow item widths by placing the action group below it when necessary. Historical linked checkboxes are labeled day-end readouts, unknown is distinct from incomplete, and current-task completion actions live in the link menu. Reuse the established saving/error/retry/conflict patterns; optimistic feedback is not proof of persistence.


### Settings composition and feedback

Keep Account & Preferences, Cosmic Forecast, Privacy & Your Data and About Muse in a compact responsive glass grid; scope shared card spans to that grid. Related Forecast controls stack with existing 12–16px gaps and a separate short preview disclosure. Save/sync feedback is a subtle footer below all sections; expand only for genuine error/conflict recovery. An unsubmitted choice is unsaved, queued work is saving, and only confirmed readback is up to date. Do not expose technical migration links or nonfunctional destructive buttons. About uses the approved core statement, with secondary version information; longer approved copy remains pending.

## Daily experience composition — Session 1

Use an authored approximately 62/38 Forecast/Priorities + Little Rituals grid on desktop; reset inherited twelve-column card spans inside nested layouts. Left content determines height, with only the grouped Ritual list scrolling between stationary heading/footer. Narrow screens stack naturally. Priorities are compact vertical rows; preserve title width and touch targets before keeping all actions inline on small screens.

Dayprint is one cohesive editorial glass surface: The Day → Morning → Evening → Day Summary, four/two/one columns by available width. Weekday pills and prominent date belong inside; week navigation belongs in the history header. Fine vertical separation, expressive feeling chips and exact neutral mini-meters replace repeated full-width rules. Complete long text remains available through a disclosure. Ritual group accent controls selected weekdays/completion/progress; its banner gradient remains independent. See [UI_SESSION_1](UI_SESSION_1.md). Theme palettes/material/Magic preferences are unchanged.

## Shared UX hierarchy — Session 2

Standalone main actions use Primary; supporting actions use secondary/outline; lower-emphasis management/navigation uses `.muse-button.button-ghost`. Keep real inline links and native disclosures distinct; do not globally suppress anchor underlines. Actual buttons retain focus/press/disabled semantics and touch targets. Shared editorial header top air is16px beyond the previous page padding, reduced to8px on small screens; move title/date together, not the sidebar.

`SaveIndicator` paints an owning store's acknowledgment state in module footers: scoped short label + dot; loaded/clean confirmed = saved, pending/saving = neutral progress, drafts = unsaved, failures/conflicts = visible error plus existing recovery. Never infer save success from network availability or hide draft/error controls. Settings owns timezone explanations; ordinary cards do not print raw IANA diagnostics.

Disco's latest approved direction supersedes earlier mirrorball guidance: **no literal disco-ball asset**. Use maximalist holographic foil, chrome light, saturated cyan/pink/ultraviolet/rainbow refraction and abundant official-star glitter. Crystal/Frosted, Quiet/Magical/Extra and reduced motion remain functional. The same tokens/material sheets support this identity; other theme palettes/layouts do not change. See [UI_SESSION_2](UI_SESSION_2.md).

## Daily Edit final layout refinement

The explicit reference clarification supersedes all earlier grouped-row and reflection-grid arrangements. Daily Edit has exactly two independent8:5 desktop column stacks. LEFT: Cosmic Forecast → Priorities → Movement → Water → Mood → Day in Three. RIGHT: Little Rituals → Today's Plan → Meals → Day Pulse. Every card uses its column's full width, natural content height and unchanged internal padding. All neighboring-card gaps and the inter-column gutter use `--grid-gap`; there are no shared card rows, opposite-column height synchronization, filler or per-card margins. Existing Rituals natural growth/30rem scroll cap and Plan preview behavior remain unchanged: growth pushes only later cards in the same column. The dedicated Mood page is unchanged. At the existing880px content breakpoint, stack Forecast → Priorities → Rituals → Plan → Movement → Water → Meals → Mood → Pulse → Day in Three. No nested Mood/Pulse grid is rendered by Daily Edit. See [DAILY_EDIT_STACKS](DAILY_EDIT_STACKS.md).


## Insights UI Session 3

Inspect a Date belongs at the right of the existing Previous Period context row, immediately below period filters; narrow layouts wrap it deliberately. It never belongs in a source-information banner. Source readiness, errors and retry remain explicit.

`MuseDatePicker`/`MuseCalendar` reuse `GlassPopover` and semantic control/theme tokens, with civil-date arithmetic and profile-local today supplied by the caller. The inspector has one readable date trigger, no duplicate date heading or visible OS date input. The Monday-first calendar includes month/year steps, Today, selected/today/outside-month states, roving day focus, arrows/Home/End/Page Up/Down (Shift for years), native Enter/Space selection, Escape and focus return. Popovers stay within the existing drawer/viewport and the drawer body remains scrollable.

Personal Overview and Your Life, Lately exclude financial totals and revelations. Financial observations belong in Insights → Money, retaining the exact canonical calculations and evidence. `RevelationList` supplies consistent title/evidence/ghost navigation hierarchy and the native **What this is based on** disclosure. Prominent standalone owner links use shared ghost/secondary buttons; contextual chart-value inspection remains a text action. No evidence or missing/planned/actual distinctions are removed, and sparse content never receives fabricated filler. All theme palettes, including Disco holographic materials, stay unchanged.

## Disco Damage XXXTRA — blacklight identity

This supersedes the earlier violet-glass/full-surface foil direction for `disco-damage` only. Aim for **90% black atmosphere, 10% explosive neon light**: near-black `#050507`, neutral black/charcoal Crystal and Frosted surfaces, white primary text and neutral secondary ink. Planner maintains distinct charcoal container/task levels. Purple and pink must not tint large passive card fills.

Electric cyan, hot pink, acid lime, ultraviolet and fluorescent orange participate in semantic accents, icon gradients, progress, selected controls and focus. Local overlapping radial blooms resemble reflected oil-slick light while leaving substantial black negative space. Passive glass gets fine neutral chrome highlights and restrained cyan/pink edge light; full multicolor foil and soft neon glow belong to selected/hover moments, not every card. The registry preview follows this identity. Other eight theme palettes, shared layout, data and functionality remain unchanged.

Official MuseStars stay crisp and theme-colored; achievement gold remains separate. Disco's ambient radial fields and caustics are static, with no looping full-page prism sweep or glitter animation. Existing shared reduced-motion and Quiet behavior remains. No animated blur, new canvas/WebGL or extra rendering dependency.


## ISSYA BDAY! light — glossy neon frosting

Scope is exactly `issya-bday`, never its independently tokenized `issya-bday-xxx` dark sibling or Disco. Keep the approved light background/bloom tokens. Light Crystal uses more opaque pearlescent white, stronger violet/cyan outline roles and dimensional soft shadows so cards separate from the atmosphere. Frosted retains greater opacity/diffusion; unlike generic low-opacity Crystal, this explicitly approved frosting material has a smaller opacity delta. Shared geometry, materials CSS and theme backgrounds remain unchanged.

Use saturated cyan/turquoise, hot pink, ultraviolet and lime in icons, progress, interactive borders, sparkles and glossy selected states. Body/control text stays dark. Filled actions use a deeper saturated pink with readable white labels; decorative neon is not a substitute for readable ink. No new animation or extra blur. Birthday siblings share conceptual candy identity, not identical color values.


## Final theme-picker descriptions

All nine themes expose one approved `subtitle` in `lib/themes.ts`, rendered directly beneath the unchanged name by the existing picker and Appearance chooser. Birthday variant metadata remains intact but its old short caption is replaced by the approved description. Preserve names/IDs/order/swatches and official birthday MuseStar decoration. Subtitles use the existing small secondary type, natural wrapping and content-height menu rows. Do not change theme paint or selection/persistence behavior for copy updates.

## Focused workspace alignment polish

Money financial labels use readable interface type (about 14px), secondary chart metadata about 13px, and tabular numeric values; compact paycheck selectors wrap long names instead of permanently truncating them. Preserve their existing selection and history-menu behavior.

Task Details pairs labels and controls on shared desktop tracks so the planned-date Move action cannot displace its input relative to Due date. Workspace/Group and Time slot/Estimate remain distinct pairs; narrow screens stack in reading order. Existing controls retain comfortable targets and drawer scrolling.

Muse Magic intensity choices use a wrapping flex group with the existing 8px token gap in both directions. Notes empty-editor actions occupy the editor’s top-right header independently of the horizontally centered message group; preserve its established vertical placement and the selected-note editor behavior.

## Mindspace board

Mindspace retains the shared module header/mantra and official Muse stars. Notes and Constellations are explicit segmented choices; Constellations is the new first-visit default. Constellations uses dense, natural-height left-packed masonry grid with compact gutters, theme/material glass surfaces and restrained tag-colored edges. Avoid saturated sticky-note fills, decorative icon furniture or freeform canvas controls. Use normal foreground/muted text for contrast in every palette. Card content leads; date, pin and overflow actions remain compact, and checkboxes are independent interactions. At narrow widths use one or two readable columns and horizontally scrollable hashtag navigation. No new continuous animations are introduced; existing reduced-motion/Muse Magic rules continue to apply. The Notes view's typography, pane proportions and empty-state alignment remain intact.

### Mindspace restoration and Disco decoration boundary

Constellations follows the view switcher with search, hashtag filters, compact board controls and natural-height results. Quick capture opens above the hashtag filters only when requested. Keep exactly one sync/save indicator in the existing bottom footer. The empty-library message stays in the results area; an active search/filter with no matches gets separate no-results copy. Do not position empty states with viewport-height spacers.

Disco keeps its existing dark holographic atmosphere, neon light blooms, chrome/refraction gradients, glitter and small Muse stars. Remove scattered polygon/reflection fragments: no confetti, ribbons or streamers. This supersedes earlier descriptions of discrete facet decorations; it does not authorize palette, material, layout or other theme redesign.

## Constellations critical correction (supersedes earlier layout guidance)

Notes and Constellations are separate experiences. The default board order is slim search/plus → scrollable hashtag boards with anchored Add/Edit Tag popovers and Lists/Reminders → one horizontal count/View/Sort/secondary-filter toolbar → dense natural-height cards → bottom sync footer. The compact quick-capture panel is hidden until the search-row plus opens it, then appears between search and hashtags; closing preserves its unfinished draft. Tag creation/editing uses small swatches in floating, viewport-aware popovers rather than page-flow forms. Cards keep a compact fixed width and pack from the left even when only one or two exist; measured row spans preserve natural heights, while list mode spans the available width. The content comes before hashtags, which sit at the bottom of each card. Timestamps include the saved-zone local time and use a restrained theme-aware accent. The edit dialog is compact and content-driven; Save confirms a local draft, while Cancel leaves the canonical card unchanged before saving. No large introductory empty panel. Text, checklist and image cards use the existing theme/material palette. Tag colors belong to canonical hashtags; each card uses its first attached tag in stable order for a subtle edge, while untagged cards use a neutral edge. Historical card accents stay stored but are no longer edited or displayed. Grouping creates visual references, never duplicated records. The Mindspace header omits the global date navigator for both views; card/reminder dates remain. Existing Notes panes and styling remain intact.

## Weekly Side Quests — local experience

The Weekly Draw uses six compact theme-aware mystery cards in a responsive 3/2/1-column layout, with official Muse stars and no confetti. Reveal and selection have distinct states. The three-second Seal My Fate hold has visible progress, cancellation on early release, an accessible confirmation alternative, and reduced-motion/Quiet feedback without movement. Committed quests use the existing glass cards and small completion highlights. Other Whimsy destinations retain their foundation presentation.

## Tarot experience (local implementation)

Whimsy → Tarot uses Muse page chrome, themed glass, existing star geometry, and three internal tabs for Reading Table, Grimoire and Reading Journal. Face-down card choice and individual reveal keep the ritual tactile. Quiet and system reduced-motion states remove decorative motion while preserving state changes. Tarot artwork remains consistent across themes; only surrounding surfaces and accents vary. Cards and readings reflow for narrow screens. Original 1909 artwork retains source/licensing metadata; do not substitute an unlicensed recoloring.

## Tarot table and Dreamscapes surfaces — local implementation

Tarot uses a compact spread selector and Reading Options popover above a broad glass reading table. Eight face-down choices arc into a fan; card art and interpretation have room to breathe. Reflections appear progressively after reveal. Skip Animation is available only during motion. System reduced-motion and Muse Quiet preserve immediate readable state changes. The official Muse star remains the decorative and completion motif.

Dreamscapes uses existing Whimsy navigation and Muse glass/material tokens across a compact intro, four internal tabs, a searchable diary, a structured decoder, an original symbol library, and a data-derived atlas. The dream editor begins with only date, optional title, and description; details expand on demand. Category and emotion chips wrap on narrow screens. Calendar cells and result cards keep keyboard focus visible. Dreamscapes does not override any global theme or introduce a separate dark palette. The opt-in Daily Edit Dreamscapes preview uses an existing card position and existing glass treatment. It is absent by default, preserving the approved card arrangement. Other future Whimsy widgets should follow the same rule.

## Whimsy experience hierarchy — local refinement

Whimsy experiences share a parent Muse heading and navigation, followed by a reusable experience heading with the official Muse star, one supporting sentence, and optional contextual label/actions. Each experience retains its own personality. Tarot's revealed interpretations align with cards as compact, responsive panels; the reflection closes the reading in a compact progressive section. Dreamscapes uses compact collectible diary cards, a two-part dream spotlight, and source-backed Atlas bars. Fortunes uses distinct reveal surfaces within the same Muse glass and theme tokens. Respect system reduced motion and Muse Quiet; Extra may add restrained light. This local pass does not change global themes.

### Bookshelf visual hierarchy — local implementation

Bookshelf is now displayed under Collections and keeps its theme-aware glass. Reading Desk uses compact cover-led cards and a distinct, recoverable timer; My Library uses responsive book covers with legible fallback artwork; Reading Atlas uses actual-data metric tiles, a period series, calendar, and goals. Covers are optional and must not block manual book creation. Timer controls and page-entry methods remain keyboard accessible with visible focus. The optional Daily Edit reading projection uses an existing card position and is absent by default, so the approved Daily Edit arrangement is unchanged until the user enables it. Reduced-motion preference removes decorative motion without obscuring state.

### Daily Edit widget display controls — implemented locally

`DailyEditWidgetControl` is the reusable presentation for optional widget visibility. Place its compact Display trigger beside the owning experience/section header. The shared, viewport-aware glass popover contains one labeled **Show on Daily Edit** switch, confirmed state and saving/loading feedback. It supports keyboard focus, Escape/outside dismissal, mobile containment and reduced motion. The owning module retains its existing persisted preference, revision and retry command; no duplicate preference authority is created. Bookshelf, Fortunes and Dreamscapes use this pattern, replacing their bottom checkboxes. It does not introduce a separate dashboard customization system or alter Daily Edit layout.

Bookshelf's book form groups Details, Status, Progress and Cover within one scrolling editor with accessible sticky Save/Cancel actions. Optional HTTPS covers retain fallbacks and a preview. Adding a book opens with a compact "Find your book" search panel inside the same editor: a keyboard-navigable result list with 40×60 cover thumbnails and serif titles, clickable series badges on confidently matched book results, clearly labeled series-name results in the same search, a horizontally scrolling edition strip using the selected-tab treatment (tint, selected border, accent underline), an import note with "Clear imported details", and an always-visible "Can't find your book? Add manually" link. Edition covers also appear as small choices beside the cover preview. A collapsible Edition details section holds ISBN, publisher, publication date and description. Reading Desk and My Library are cover-led with restrained hover edges and status chips. The desk precedes the complete library on one Books screen. Active Books, Movies, TV Shows and Games use a shared horizontal carousel showing up to three cards on desktop, two on tablet and one on mobile; arrows, touch scroll, position text and reduced-motion behavior remain consistent. Every active record stays available. Optional metadata reserves consistent card slots. Reading Atlas prioritizes metrics, goals, rhythm/calendar, per-book progress, genres and completions. A compact pill row (a tertiary filter) sets the headline period; two small bar charts show weekly time and monthly pages with text equivalents; session history uses existing choice menus and date fields. The forgotten-timer question is a standard MuseModal; an unsynced timer change shows as a dashed, clearly labelled note on the timer card. Charts use semantic accents, actual saved data, labeled scales and text equivalents. No-session states omit invented pace/time measurements; added dates, start dates, calendar duration and actual reading days remain distinct. Calendar columns align to weekdays with independently identifiable today, selected date and activity.

Fortunes uses one compact navigation row and original lightweight SVG cookie, crystal ball, sealed letter and cabinet illustrations. Each illustration is a keyboard-accessible draw action connected to the same confirmed result. Short replayable split/unfold/glow/drawer effects run after a successful persisted draw; state remains readable with Muse Quiet or reduced motion. Paint IDs are per-instance. Cookie results use a readable parchment treatment; other results retain theme-aware glass. No new theme palette or global atmosphere is introduced.

Fortune Cookie secondary result actions use dark parchment ink with explicit hover, focus, and disabled treatments; Save to Collection is the theme-aware gradient primary action. Cabinet category accents are stable across drawers, filters, revealed results, and saved keepsakes: Scientific Oddities cyan, Natural Wonders green, Strange Animals pink, Peculiar History violet, Unusual Inventions orange, Art & Culture gold, Curious Words blue, and Delightfully Bizarre Facts magenta. Color decorates the small bar, subtle glow, and selected outline; labels retain readable foreground ink and surfaces remain cohesive.

The Cabinet initially shows twelve real curiosities, with Discover More Curiosities revealing further batches of twelve after filtering. The collection uses compact keepsake disclosures in three desktop, two tablet, and one mobile columns, sized by available content width. Each shows type, category, title, a short preview, and the saved date in its saved timezone. Native Enter/Space expansion reveals the full historical snapshot, private question/note, original source, and existing reopen/edit/remove actions. Note edits remain drafts until explicitly saved. Official Muse stars and restrained static glow supply interaction detail without continuous animation.

### Whimsy exploration and Tarot study — local refinement

All five experiences use `muse-whimsy-page` plus `WhimsyExperienceHeader` for one post-navigation baseline and standard section gap. Optional context sits beside the copy/actions, never in an extra page-flow row. Existing poetic copy remains optional rather than adding filler. Compact field labels keep optional indicators inline; searches retain accessible names when their visual labels are hidden.

Tarot's question field, spread selector and Reading Options share a responsive setup toolbar. The Grimoire combines a flexible search, distinct Study Mode action and tightly wrapped suit filters. Its responsive cover-led grid avoids narrow desktop thumbnails. Journal filters and Timeline/Calendar form one related toolbar. Study uses artwork beside one learning panel, with reveal/hide, upright/reversed segmented meanings, keywords, symbolism, journal prompt, random alternative and previous/next navigation. Keyboard focus moves to the revealed panel; mobile stacks art and learning. Visual observation prompts and artwork descriptions appear only after a successful image load; failures retain written study and an explicit retry. Reduced motion and Muse Quiet remove reveal movement.

Original local Tarot scans use `TarotCardArt` with `unoptimized` Next images: protected source files must be fetched by the authenticated browser, because the optimizer does not forward authentication headers. Do not weaken application routing or substitute placeholders for the real artwork. All 78 source/licensing records remain intact. Fortunes' SVG objects remain present both before and after reveal; Oracle's optional hold interaction has visible ring/progress feedback, keyboard cancellation and a normal click alternative.

### Cosmic Observatory — scoped local implementation

The Library Explore view may present short Astro 101 lessons in a compact responsive grid. A schematic diagram explains each concept, and one direct action opens its existing complete library entry. The path is optional; it uses Observatory surface, accent, focus and text tokens and adds no separate learning visual language.

Charts & Calculations lives in a disclosure within Birth Chart. The directory uses existing Observatory tiles, while generated comparison/transit charts use two labeled rings with spaced glyphs, leader lines and complete adjacent position/aspect text. The composite gets a single midpoint wheel. Person One/Person Two colors are consistent with a text legend; relationship quality is never encoded as a score or color. Errors and uncertainty are readable text in the shared notice surface. At mobile widths, the directory, themes, aspect cards and position lists stack into one column.

The natal My Cosmic Snapshot uses the existing Observatory panel surface and semantic colors. Element/modality meters carry text values, while lunar phase and retrograde state are named in text. Derived angles are direct links to the existing library. A placement's calculated aspects appear inside its full detail so the interpretation remains tied to real geometry.

The sixth Whimsy destination uses the shared page/header/nav and Muse semantic surfaces, foregrounds, focus rings, modal, magic and reduced-motion behavior. Its five content sections share one compact subnavigation, with Horoscopes visible by default. A small celestial icon and clearly labeled My Cosmic Profile button sit in the Observatory header; the existing profile controls open in the shared modal, and closing it preserves the current section and focus. URL `view` values preserve direct links and browser history for content sections. The three/two/one keepsake grids, responsive chart wheel plus complete placement text list, touch/keyboard planet selection, and immediate full library/event/placement detail are local patterns; there is no extra detail-page hop. The library detail presents complete original draft interpretations with factual astronomy separated from traditional astrology. Date/source/uncertainty labels remain visible in all themes. Chart glyphs use text presentation and explicit semantic contrast; decorative shimmer is removable in Quiet and reduced motion. No palette or global theme rules are changed. Verification and editorial status: [COSMIC_OBSERVATORY_IMPLEMENTATION](COSMIC_OBSERVATORY_IMPLEMENTATION.md).

### Whimsy keepsakes — local polish

Use real saved content as the visual anchor of Tarot, Dreamscapes, Fortunes and Bookshelf cards. Gallery cards adapt from three columns to two to one and retain readable text, visible keyboard focus and existing theme tokens. Tarot spread diagrams represent the actual card count; saved-reading cards show actual drawn artwork. Dream picker results are bounded and searchable. A book status control acts on the canonical book record wherever shown. Observatory houses, aspects and entry details use the shared celestial surface language, while uncertainty and source labels remain ordinary readable text.

The Observatory Library Explore view uses seven recognizable collection accents while entry cards and detail surfaces continue to use theme tokens. Its featured and recent links open the complete entry directly; All Entries exposes search, filters, sorting and density without changing the underlying content. The Calendar month grid and timeline show the same calculated events, and event detail distinguishes the astronomical fact from traditional interpretation. The lunar phase marks are schematic, never a replacement for event calculations. The chart wheel and placement list share selection state, with a visible selected outline and keyboard-accessible controls. Celestial motion is brief and respects Quiet and reduced-motion settings.

## Sidebar single-scroll refinement

Desktop rail content scrolls as one unit at `100dvh`; navigation has no independent overflow. The brand/collapse control leads, grouped modules follow, and the theme control plus compact Settings/Sign Out rest at the bottom when height permits. On shorter viewports the whole rail scrolls. Keep active rows distinct from hover rows, preserve visible keyboard focus, and use the existing theme swatch/menu. The theme menu remains portaled to the viewport so the scrolling rail does not clip it. Mobile keeps the established bottom navigation and More popover. Collections is reserved for the Life group between Mindspace and Whimsy and is hidden until its destination works.

## Tarot and Dream reference entry pages — local draft

Reference cards open on dedicated Whimsy routes. Breadcrumbs show location; a separate contextual link returns to the originating reading, journal, decoder, or filtered library. The six chapter controls, optional continuous reading mode, editorial art, sources, personal reflection field, and adjacent-entry links use existing theme surface, selection, and focus tokens. On narrow screens the hero stacks and chapter controls wrap into touch-sized rows. These pages do not replace Tarot draw rituals or Dream Diary records. Tarot manuscript status remains visible as a draft until editorial approval.

The Tarot Grimoire's local refinement tightens hero and chapter spacing, uses a smaller framed RWS illustration, and places only subtle celestial ornaments near the title and section heads. Reading prose sits on a quiet semantic surface; the six chapter controls remain compact, wrap on mobile, and keep visible selected and keyboard states. Reflection contains a collapsible private writing panel, while related cards use the existing artwork as compact shelf links. Source references are in a subdued “From the Archives” disclosure. Internal manuscript status and review notes are available in source JSON and the editorial audit; they are omitted from normal reading UI.

The Grimoire chapter panels, Related Cards, and From the Archives span the same full content width and share both edges with the hero and chapter navigation. Prose inside those panels uses the available content width and wraps within the existing padding. Reflection presents source-authored upright and reversed questions as individual prompts, distinguishes the journal ritual, and gives any supplied last thought a quiet literary close. The private interpretation editor remains in Reflection.

## UI Polish Batch 2 — current treatment

Primary Money, Wellness, Mindspace, Whimsy, and Collections navigation shares compact rounded pills with token-based selected, hover, and focus states. Secondary experience tabs share the Fortune Cookie inset bottom accent and a quiet divider. Planner toolbar places search/filters left and Today/day arrows/Board Settings right; its card metadata shows the workspace icon and colored tags, with full details in tooltips and editing. Daily Edit Cosmic Forecast groups title/sign/date, excerpt, source, and actions without an extra ornament. Weekly quests show a compact theme-aware calendar-day countdown. The emoji picker uses platform emoji fonts and an accessible visual fallback for missing glyphs.

## UI Polish Batch 4 — local refinement

Daily Edit's Bookshelf keeps one prominent cover and reading summary, with a compact icon button opening the persisted current-book chooser. The Cosmic Forecast uses a stronger sign and glyph, more comfortable excerpt padding, and small bottom-right attribution without repeated date labels. Side Quest draw cards use theme surface tokens for legibility and label chosen cards in addition to their accent state. Tarot's Reading Table keeps one desktop control row and a denser, calmer ritual surface. Cosmic Calendar and Journal controls share compact, theme-aware toolbars; Wellness week controls keep the day strip aligned right. Day in Three displays a token-colored star fallback for emoji not supported by the current browser, including already saved selections. These treatments preserve Crystal/Frosted geometry and reduced-motion behavior.
## Collections and Planner polish

Collections Overview keeps Search flexible and choice menus and clearable calendar date filters compact. Reading Desk cards pair a bounded cover with grouped progress, metadata and actions; carousel cards use the same layout at each item count. Planner task metadata is a quiet cluster: a borderless workspace icon in its assigned color, then separately interactive tag labels. Workspace and tag settings popovers use a single-line “Settings for [task]” heading with truncation and a complete-name tooltip.

Collections uses one compact Overview toolbar: flexible search, prominent media pills, proportionate Status/Sort, Board/Library, and an expandable advanced-filter panel. The Add menu sits beside Search, and preferences sits beside Filters in the single overview toolbar. A compact, bounded In Progress carousel uses the original Games Currently Playing cover-left treatment and opens the canonical media experience; category-specific empty shelves keep centered Add actions. Book, Movie, TV Show, and Game editors share section legends, Muse choice/date controls, a fixed modal header, an independently scrolling form body, and a single bottom action row separated by a subtle divider (Cancel, then the emphasized primary Save) with one error message; the Book editor remains the visual reference. Media-specific pages place a compact back link immediately above their heading, while retaining the shared Collections header. Game-specific rare metadata belongs in Additional Details. Preset genre chips and Book star/emoji controls use theme tokens and preserve keyboard focus and reduced motion.

Book details place linked series names and positions directly below the title. Series detail uses existing book covers, a compact progress meter, reading order, and clear item statuses. TV details place compact season summaries above optional episode controls. Manual counts and whole-season actions use existing Muse controls; announced content stays visible without inflating available progress.

## Navigation hierarchy — implemented on feature branch

Muse distinguishes three navigation levels by what a control does. **Primary**: the sidebar and mobile bottom navigation, unchanged. **Secondary page tabs**: sections within one destination, such as Wellness/Money/Insights sections (`MuseSectionNav`), Fortune & Fun's Weekly Side Quests / Fortunes & Nonsense views, and Books / Reading Atlas, Cosmic, Tarot, Dreamscapes and Fortunes sections. They share the Books / Reading Atlas treatment in `app/globals.css`: rounded control-radius tabs over a thin divider; inactive tabs keep the control surface and glass border; the active tab adds an accent-primary tint, the selected border, the prismatic Muse edge (as the active sidebar link does) and an accent-secondary underline. They have a visible focus ring, use `<nav>` with `aria-current="page"`, and scroll horizontally on narrow screens. New secondary navigation uses `.muse-page-tabs`. **Tertiary filters and view selectors**, such as Collections media chips, Board/Library, status/sort and Morning/Evening, keep their own subordinate pills or segmented controls and never use the page-tab treatment. Date and week steppers, breadcrumbs and the Notes folder rail are not page tabs.

## Finish Book and read history — implemented on feature branch

Finish Book is a compact MuseModal led by a cover/title hero on a faint accent wash. Its one celebration is a Star Shimmer: three small official MuseStars fade and settle in the hero's corner over about 0.9 s, once, pointer-transparent; Quiet Muse Magic hides it and reduced motion shows the stars static. No confetti, bursts or layout movement. Save finished book is the primary action, Skip details secondary, Cancel ghost. Earlier reads and Your reads use quiet bordered rows (read number, dates with years, rating, review, one small statistics line); preserved older opinions use a dashed note. Dates for reads always include the year.

## Living Library detail and browsing — implemented locally on feature branch (#135)

Books has an editorial nightstand treatment in Reading Desk, a quieter unboxed cover Library, and a compact row option for dense browsing. Covers retain readable fallback artwork and gain restrained page-edge depth and lift. The book detail is a broad, cover-led reading environment on desktop; phones use a compressed art/title composition followed immediately by reading actions. Its local atmosphere uses a muted cover sample and blurred artwork behind token-backed surfaces, keeping text and controls on normal Muse foreground/surface tokens across themes. Detail content is organized by a small segmented selector; the timer, series progress, journal, sessions and read history remain reachable from the book. Motion is subtle and removed under reduced motion. The global theme is never changed by a book.

The book's sitting chooser is a softly tinted editorial inset below the cover hero, with a two-mode selector, compact time presets, an honest daily-goal line and one clear Begin action. Open sittings count up; timed sittings show remaining time, then an accent overtime counter. The target moment uses the shared small Star Shimmer, optional soft chime and optional haptic; it never interrupts the timer. Sound and haptics are separate controls, and reduced motion follows the shared celebration rules.


## Reading Atlas sections and Year in Review — implemented on feature branch

Atlas sections use a compact rounded segmented selector on the subtle surface (selected segment uses the selected tokens), wrapping to two per row on phones; it is a tertiary view selector, never the page-tab treatment. Insights are small bordered tiles (label, answer, one evidence line; italic honest empty state), two per row on phones. The personality card uses a faint accent wash with the display face for the title. Genre breakdown is a real table in its own horizontal-scroll container. Emojis appear as large native glyphs in bordered tiles with their book counts. Year in Review opens with an editorial hero (large display-face year, a one-sentence summary and a one-time Star Shimmer), then labelled sections. The milestone celebration is one inline banner with the shared Star Shimmer and a Dismiss action; Quiet Muse Magic hides the stars and reduced motion keeps them static. No confetti.

## Phone menus, book details and Atlas Overview — implemented on feature branch

Popover menus (`GlassPopover`) never squeeze their choices: when the space beside the trigger is under 320px they use the whole visible area. On screens narrower than 480px they span the usable width, and inside modals the glass is backed by the page colour so form text never shows through. Touch screens do not autofocus a menu's search field (it would open the keyboard over the choices). Book details keep series links and **+ Add to a series** beside the cover; adding happens inline (pick a series, number and role, or start a series when none exist). A book with no reading shows one quiet line instead of zero-filled tiles; the remove action sits last and quiet. Reading Atlas Overview: goals span the width, the two charts stack beside the calendar and stretch to its height, and Reading rhythm (a list) spans the width below. Dayprint's Day Summary is a padded inner panel.

## Dreamscapes — implemented on feature branch

Dreamscapes keeps the global theme, cosmic background and Whimsy header; its identity comes from serif italics for titles, theme-toned dream-type glyphs (Lucid ◐ secondary, Nightmare ☾ pop, Recurring ↻ warm, Vivid ✦ primary, Ordinary · neutral), a left accent rule on journal cards, symbol “artifact” pills with category glyphs, and soft secondary-accent glows. Pagination is numbered with gaps and a “1–12 of 62” summary; search fields carry an icon, clear button and live count; view switches are segmented controls. Motion is brief: a 260ms reveal for lists, entries and revealed dreams, a glow when a symbol tile is selected, constellation lines that light around a chosen star, and a moonlit “☾ ✦” shimmer on confirmations. Quiet Muse Magic and reduced motion remove the animation and keep the static state. No confetti, particles or continuous motion.


## Mobile polish standards — November 2026

- Week jumps use the shared `.muse-week-jump` joined control (‹ This week ›), centered on narrow containers.
- Detail dialogs use one open hero (no boxed hero inside the dialog), then tinted panels with a 3px side accent: secondary for facts and context notices, primary/secondary alternating for reading sections. Metadata stays as compact pills.
- Programmatically focused headings (`tabindex="-1"`) draw no focus outline; interactive controls keep their focus rings.
- Mobile toolbars wrap into at most two rows: search full width, then filters and segmented modes; secondary filters fold behind a Filters button that shows an active count.
- Workspace and choice popovers show the name above its supporting count, a selected state with border, background and check, and touch-height footer actions.

## Goals, Across Muse and connected states — November 2026

- **Goal cards and summary tiles:**
  - They use the tinted side-accent panel: a 3px primary or secondary left edge on `surface-subtle`.
  - Status chips always carry text (Met, Below target, No complete record, In progress, Paused, Not tracking).
  - The 12-period strip uses the following:

    | Status | Look |
    | --- | --- |
    | Met | solid primary |
    | Below target | soft pop |
    | In progress | dashed outline |
    | Paused or inactive | hatched |
    | No record | empty outline |

    Its labels are available to assistive technology.
- **Connected Ritual cells.** They keep the normal cell visuals, are read-only, and add a small ⟲ source mark. Their accessible label names the source and how many records it used.
- **Native selects in Muse forms.** They share the text-input control look (touch height, `surface-control`, glass border, control radius).

## Typography (#57) — approved November 2026

**Fonts** (loaded once in `app/layout.tsx` with `next/font`, self-hosted):
- **Display/editorial: Fraunces (variable)** with axes `opsz`, `SOFT` and `WONK`. Approved settings are `"SOFT" 100, "WONK" 0`, optical size auto. They're set once on `html` and inherited; other fonts ignore them.
- **Interface: Plus Jakarta Sans** (variable weight, true italics), filling `--font-interface` / `--font-ui`.

**Verification:**
- The self-hosted Fraunces at SOFT 100 / WONK 0, italic 400, matches Google Fonts' own rendering at the same settings to within 0.05% of glyph pixels.
- The SOFT, WONK and italic differences are real, not synthetic.

**One source of truth.** `app/typography.css` defines:
- the font tokens (`--font-editorial`, with `--font-serif`, `--font-display` and `--font-whimsy` as aliases);
- the axes;
- the role weights;
- the semantic classes.

Module stylesheets reference roles; they never declare their own families, styles or weights.

| Role | Class / tokens | Use |
| --- | --- | --- |
| Display | `.type-display` · italic · `--type-display-weight` (380) | Major editorial headings: module titles, heroes, empty-state headlines, `.whimsy` greetings |
| Quote | `.type-quote` · italic · `--type-quote-weight` (360) | Atmospheric lines, taglines, reflective prompts (lighter weights only at large sizes) |
| Reading | `.type-reading` · upright · `--type-reading-weight` (400) | Long Fraunces passages: dream stories, fortunes |
| Editorial | `.type-editorial` · upright · `--type-editorial-weight` (460) | Selected literary headings: month headers, library sections |
| Title | `.type-title` · upright · `--type-title-weight` (520) | Restrained titles: book titles, Tarot card names, journal and dream entry titles. Never large italics |
| Heading | `.type-heading` · Plus Jakarta Sans 620 | Functional headings and section labels |
| Body / Meta | `.type-body`, `.type-meta` | Body copy and 11–14 px metadata |
| Numeric | `.type-numeric` · tabular, lining figures | Dates, statistics, money |

**Rules:**
- Practical modules (Planner, Money, Wellness, Rituals, Insights) stay in Plus Jakarta Sans apart from shared editorial moments such as the Daily Edit greeting.
- To change the hierarchy, change the tokens in `app/typography.css`, not module CSS.

## Profiles & Showcases (#26)

- **Avatars**: 117 bundled illustrated characters (`public/avatars/<id>.webp`, catalogue in `lib/profile/avatars.ts`) in four groups: Magical, Celestial, Everyday life, Creatures. Only the `avatar_id` is stored; `MuseAvatar` renders the image in a circle. The picker marks the selection with a sparkly gold ring that turns slowly (still with reduced motion or Muse Magic Quiet).
- **Showcase frame**: `ShowcaseView` draws a 2.5px gradient ring with a masked pseudo-element (works on translucent glass and every theme) and a soft glow from the gradient's middle stop. Card interiors keep the profile theme's surfaces. Items without artwork get a designed cover (gradient spine, kind icon, title in Fraunces Soft italic).
- **Gradient presets** (`lib/profile/gradients.ts`): 22 vivid, art-directed mesh blends across a wide colour range in two moods, Dreamy & luminous (saturated light blends, sunsets, retro prism, landscape bands) and Bold & electric (colour clouds, nebulae, aurora, neon); only a few are dark. Every preset carries a sparse starfield. Build glows from oversized, off-centre fields (`field()`) with a soft multi-stop falloff, never conic wheels, hard wedges, washed-out pastels or visible radial origins. Ids are stable; `retired` presets render but are not offered.
- **Personality badges** (`lib/profile/badges.ts`): the standard Muse pill (surface background, icon, readable text) whose border takes the category accent (`--badge`); selected in the picker = full-strength border, soft glow and a check, never a solid fill. Long labels wrap inside the pill rather than clip.
- **Motion**: Showcases fade up on arrival and covers lift on hover, only with motion allowed and Muse Magic not Quiet.

## Theme Atelier: theme tokens vs. the design system

The design system (#57) defines what components look like structurally; Theme Atelier lets a person remix their colours, gradients and atmosphere. The boundary is enforced in code: only per-theme tokens are editable (`lib/atelier/tokens.ts`), and a test fails if a radius, spacing, font or size token appears there.

**Atmosphere layer tokens** (defaults are the exact official layers, so official themes render unchanged; verified computed-style identical across nine themes × two materials):

| Token | Plane |
| --- | --- |
| `--atmosphere-bloom-layers` | `.muse-atmosphere::before` (header glow + four blooms over `--background`) |
| `--atmosphere-pool-layers` | `.muse-atmosphere::after` (haze pools; Disco overrides with its localized pools) |
| `--atmosphere-haze-layers` | `.muse-galaxy-grain::before` |
| `--disco-spill-layers`, `--disco-caustic-layers`, `--disco-reflection-layers` | Disco-only light |
| `--atmosphere-custom-layers`, `--atmosphere-custom-blend` | `.muse-atmosphere-studio` (a person's own layers and glows) |
| `--atmosphere-vignette` | `.muse-atmosphere-vignette` (viewport vignette) |
| `--atmosphere-filter`, `--atmosphere-star-opacity`, `--atmosphere-star-glow`, `--icon-glow` | tone, star and icon multipliers (default `none`/`1`) |
| `data-atelier-stars` | star density (`none`/`sparse`/`rich`), independent of Muse Magic |

Icon gradient angle and middle stop are SVG attributes, published by the applied theme through `lib/atelier/icon-gradient.ts`; the default reproduces the original diagonal exactly.

`lib/atelier/catalog.generated.ts` is generated from these stylesheets (`node scripts/generate-atelier-catalog.mjs`); a test fails when it is stale.

## Stream of Consciousness (#27)

- **One card system, five presentations** (`data-tone` on `.muse-stream-post`): `status` (editorial serif status text), `literary` (warm left rule, serif commentary), `mystical` (secondary-accent glow and a sparse star layer), `celebratory` (gold edge and soft glow), `feeling` (soft pop-accent wash). Activity snapshots reuse the Showcase `ItemCard`.
- **Actions**: exactly one primary reaction pill and one Comment pill per post. Reaction gestures (`muse-stream-burst`) are one-shot, distinct per kind, played only after a confirmed reaction, and gated by `prefers-reduced-motion` and Muse Magic (Quiet = none, Extra reaches further). No sound.
- **Spoilers** use a striped placeholder with an explicit Reveal button; titles and safe metadata stay visible.
- **Share to Stream** opens a native modal `<dialog>` over the current module so the person keeps their place.


## Muse Magic motion & sound (#34)

- **Tokens** (`lib/motion.ts`, CSS `--motion-*`, `--ease-*`): press 120, hover 180, settle 260, success 560, orbital 580, celebration 950, milestone 2600, scene 3600 (ms); easings `out`, `spring`, `inOut`. Never hard-code a new duration.
- **Levels**: Everyday microinteractions (press compress, progress easing, modal lift, page arrival, header twinkle) → Satisfying completions (`useMuseSpark`, ritual orbital glint, water ripple) → Meaningful celebrations (`celebrate()` constellation/starburst) → Rare milestones (book ritual, large constellations at 100/365 days).
- **Orchestrator** (`lib/celebrate.ts`, layer `components/MuseCelebrations.tsx`): call `celebrate()` from a success path only, with a `key` so it happens once. One moment at a time, never blocking (`pointer-events:none` except Skip), Escape/Skip dismiss, always announced via a polite live region. Primitives: `constellation` (3/7/12 stars, fine gold lines), `starburst`, `book` (cover sheen, gold arc, rising dust).
- **Intensity**: Quiet = state feedback and announcements only; Magical = light particle counts; Extra = fuller dust and slightly longer moments. `prefers-reduced-motion` always wins.
- **Sound** (`lib/muse-sound.ts`, preference `lib/sound-preference.ts`): synthesized bell palette `confirm`, `complete`, `reveal`, `seal`, `celebrate`, `book`; Off by default; independent of motion; plays only from success paths; never overlaps (a more important sound takes over, lesser ones are skipped); silent no-op without Web Audio.
- **Copy** (`lib/celebration-copy.ts`): rotating, Muse-voiced lines; never "Great job", "Congratulations" or "Achievement unlocked".

## Account dock and creator ring

- **Account dock** (`.muse-rail-dock`): a slim glass pill with a gradient hairline holding 42px round icon buttons (`.muse-dock-button`; Themes uses `ThemeSwitcher variant="dock"` with a theme dot). Hover glows and lifts 1px; the current page gets the selected ring; the collapsed rail stacks it vertically.
- **Creator ring** (`MuseAvatar creator`, `.muse-creator-ring`): a conic gold band scaled to the avatar (≈4.5% of its size), a soft glow and a twinkling ✦; it turns slowly only with motion allowed and Muse Magic above Quiet, and always shows.


Today in Planner (Tasks board and Agenda) uses one shared `.muse-today-ring`: a thin continuous Muse edge-gradient ring around the whole card, plus the word "Today". Both Planner toolbars share one pattern: the date title (a day picker) leads on the left; ‹ Today ›, view and actions, and the outlined settings button sit on the right at one 38px height.

Bucket List (Rituals, #84) follows the handwritten bullet-journal reference: an italic editorial title, a key of filled year circles (`.muse-bucket-swatch`: stored hex `--year` plus a per-year pattern, always with the year in text), then the shared 38px toolbar (search and Add on the left; Filters, Sort and View on the right). Classic List is three CSS columns spanning exactly the toolbar width: the first checkbox aligns with the search bar and the last column ends under View. The reorder handle sits in the gutter so it never indents the list. Completion treatments use the year color: a marker-style highlight behind the words (default), a colored cross-off line, or a tilted year stamp. Selected or active states (the chosen key year, this year in the Timeline) use the shared `.muse-today-ring` rainbow. Each line reads number, then a heart (`.muse-bucket-heart`, outline until done, then filled with the year color with a small pop that respects reduced motion), then the title. Tall editors scroll their body and pin Save/Cancel below a divider; choices use the shared `MuseChoiceMenu`, never native selects. Forms reuse the Aspirations form classes; filters reuse `.muse-chip-row`. `.muse-planner-surface` is global (design-language.css) so every page gets the same Frosted/Crystal card.

## Planner customization (#87)

- **One paint picker.** `MusePaintPicker` (solid or gradient) wraps the existing `MuseColorPicker` and `MuseGradientBuilder` and is the only control for Mark colors and section backgrounds. Its order: theme accents, curated solids or gradients, the person's saved palette, then a custom gradient.
- **Paint never fades text.** Section backgrounds are drawn on a `::before` layer at 5–60% strength; text, icons and controls sit above at full contrast. Accent-colored text is mixed with `--foreground` (about 50%) so it stays readable in light, dark, Frosted and Crystal.
- **Header styles** reuse the type system: Classic small caps (default), Editorial serif (`--font-editorial`, display weight, italic), Tinted label (accent wash pill), and Underlined (accent underline).
- **Dividers** are the band's top rule (line, dotted, dashed, double, none) or a small centered ❦ flourish.
- **Stickers are ornaments, not icons.** They are typographic glyphs, rotated slightly in the lower corner, `aria-hidden`, and never use Muse icons, so they can't be confused with Muse Marks.
- **Gradient Marks** are filled chips with a white symbol and a soft shadow; solid Marks keep the tinted chip.
- **Checklist rows** use the shared `priority-completion` / `check-input` / `priority-check` checkbox (sized to 18px for bands) with inline-editable text. Simple List rows use a dash.
- No new motion was added; everything respects reduced motion.

## Insights 2.0 — Life at a Glance (#97)

- One page, one shared `.muse-segmented` period selector, the shared `PeriodTitle`, and `muse-card` glance cards with small uppercase prismatic headings.
- Hero numbers use the UI face with tabular figures and a primary→pop gradient fill; units and sample sizes sit beside them in muted text.
- Visuals are single-series and quiet: Overall Day as gradient capsules (week), a calendar tinted by rating (month; unrated days outlined), monthly capsules (year). Feelings use the existing mood-family colors (`data-quadrant`) with words, never color alone. Every mark has a hover title and an accessible label.
- Today uses `.muse-today-ring`. Empty states are short and honest. Hover lift only without reduced motion.


## UI Cleanup 1 (#98)

- One search field everywhere: `MuseSearch` (icon, input, clear) with the prismatic `.muse-edge` on hover and focus; never a bordered input inside a bordered field.
- Dropdowns use `MuseChoiceMenu`; no native `<select>` styling in new or touched screens.
- Settings-style toggles use `.muse-check-row`.
- Pages use the standard page width; two-column compositions (Settings, Stream) use independent columns so cards never stretch beside taller neighbors.
- Empty planning slots are quiet dashed "+" buttons; filled items are tinted chips.

## EntryCarousel (#105)
`components/design/EntryCarousel.tsx` is the shared pattern for dated entry lists that could grow long (Little Moments, Bright Days, Intentions). It fits as many cards as the width allows, keeps its height stable, mounts only the current page, and supports arrows, swipe, trackpad and keyboard. Use it instead of new one-off scrollers.

## Surfaces & shared controls (#104)
- **Page sheets:** any panel sitting directly on the page uses `--glass-background` (materials.css "Page sheets"); nested surfaces use `--surface-subtle`.
- **Choice menus:** single-choice `MuseChoiceMenu` uses the bare `GlassPopover` (no heading). Native selects are styled through `appearance: base-select`.
- **Mobile:** touch fields are ≥16px; never disable pinch zoom.
- **Color vocabulary:** card titles use a rounded-square tinted tile in the card's chart ink; dates are typographic cells; rings stay round. Category colors come from `--chart-1…6`.
- **Stat tiles:** `.muse-money-tiles` (label · value · note) with `data-tile-accent`.
- **Task density:** `data-task-density="compact|spacious"` on the Planner page.
- **Pagination:** `PaginationControls` (`components/collections/`) is the one pager for long Collections lists: a range/total/page summary, the page-size `MuseChoiceMenu`, ghost chevron steps and numbered page buttons with the Fortune-style selected marker (`aria-current="page"`). It appears above and below the list (only the top copy is a live region); on phones only the current page number and the steps remain. Use `usePagination` for page/size state, URL persistence and reset-on-filter instead of a second implementation.
- **Reading timer (#135):** `ReadingSessionCard` (`components/whimsy/`) is the one timer presentation, used by the Reading Desk and Book Detail. It reuses the Daily Edit water bar's language (`--wash-aqua` pool, `--water-progress-gradient` liquid with glow and sheen, a ripple at the fill edge, and the achievement star when the sitting's target is met); an open sitting flows instead of filling. It sizes from its own container so it fits the narrow Book Detail panel and the wide Desk. It only presents the shared timer; all actions use the existing write paths. Motion stops when paused and under reduced motion.
- **Book Detail (#135):** the reading panel's progress meter, the Series meter and the timer share the water-bar language (`--wash-aqua` pool, `--water-progress-gradient` liquid with glow and a slow sheen that stops under reduced motion). Stats are tinted 2×2 tiles, the cover has a soft accent glow, and the synopsis opens with an accent drop cap; a missing synopsis is a quiet dashed prompt, not a blank card.

## Envision and Planner Intentions (#117) — implemented on feature branch, awaiting review

- **Envision** uses the shared page header (mantra "MANIFESTING, BUT MAKE IT ORGANIZED", placeholder copy for Stephanie to approve), `MuseSectionNav` tabs, and a new `envision` nav icon: a horizon peak with a sparkle, in the prismatic treatment like every other icon. The Vision Boards empty state is one glass panel: a still collage made only of theme accents (no images, no motion) beside an editorial heading. It has no fake buttons.
- **Intentions** reuses Reflections' primitives (`.muse-reflections-pill/-icon/-input/-additem/-confirm/-library/-add-trigger`, the toolbar, `PeriodTitle`, `.muse-segmented`) and adds `components/planner/intentions/Intentions.css` for the page itself:
  - Writing looks like ink on a ruled page: borderless until hovered or focused, in the editorial face.
  - Priorities are numbered with gradient-ringed numerals.
  - References to other modules' records are rounded chips that link home. A dashed chip means the record is no longer there; a muted "now …" note means it was renamed.
- **Personality by period:** week is tighter; month centres a large editorial theme; quarter adds a steady accent rule down each section; year sets the word of the year large in the theme gradient. They share one surface and token set and work in every theme and in Frosted.

## Mobile patterns (#101)

Shared, in `app/design-language.css`; use them instead of page-specific phone patches.

- **Breakpoints:** phones are `@container muse-content (max-width:640px)`; compact tablet is 820px. Components whose content needs a different threshold may keep their own.
- **`.muse-search-row`** wraps a search and its Add. On phones the search takes the remaining width and the Add (`.muse-search-add` with a `.muse-search-add-label`) becomes a square + whose label stays the accessible name.
- **`.muse-control-row`:** phone controls share the row edge to edge at one height instead of wrapping unevenly.
- **Two-row toolbars:** when a phone toolbar needs two rows, both share the same outer edges and the 44px control height (Planner/Agenda `[data-rows]`, Rituals). They never wrap at random.
- **Scrolling chip rows:** `[data-scroll]` on `.muse-chip-row`/`.muse-segmented`, or `.muse-scroll-fade` on a wrapper that already scrolls. One line, an end fade, and end padding so the last chip clears the fade.
- **`.muse-phone-only` / `.muse-wide-only`:** twins for an action that desktop places elsewhere. Exactly one is ever displayed.
- **Safe areas:** the shell fades content before the floating nav. The top band backs the status bar wherever a top inset is reported.
- **Light-card themes** (Midnight Ballerina, Pretty Toxic): any new component painted with the card surface joins the ink list in `app/surfaces.css`. Check new screens with a rendered contrast scan at phone width; phone popovers back onto the card surface in these themes.
- **Profile** hero and showcases are cards (card surface + material), not subtle tints.

## Vision Boards (#118)

- The chrome is ordinary Muse: `.muse-planner-surface` editor panel, 38px toolbars of `.muse-button`, `MuseChoiceMenu`, `GlassPopover` panels, `SaveIndicator`, the editorial italic board title. Phone toolbars scroll in one row with `.muse-scroll-fade`.
- The board is the person's artwork, not chrome: it keeps its own pinned colors in every theme and material, sitting on a quiet checkerboard "table".
- Photos default to a white print border and soft shadow; transparent cutouts have no frame and can take a die-cut outline. Text uses Editorial (Fraunces), Clean (Plus Jakarta Sans) or Label (spaced caps), with optional label tape.
- Stickers are the shared decoration glyphs plus Muse Marks drawn from Muse's own icon set, defaulting to the theme accent at the moment they're added (then pinned).
- Selection handles use Muse purple; touch devices get larger handles.
- The cutout guide is iPhone/iPad only: a quiet `text-button` trigger, a `GlassPopover` (a bottom sheet on phones) with italic accent numerals, and a pill-shaped one-time tip with a prismatic star and a 32px dismiss button.

## Vision Boards studio (#187) — implemented on feature branch, Staging acceptance pending

- **Contextual inspector.** The canvas sits beside a 280–340px inspector panel on desktop, which stacks under the canvas below 900px of content width. The panel is `--surface-subtle`, and each section is a collapsible card on `--surface-control` with an uppercase kicker summary. It shows only the controls for what's selected.
- **One paint editor.** `PaintEditor` is a `MuseSegmented` choice of None, Color, Gradient or Pattern:
  - Color and Gradient reuse `MusePaintPicker` (curated presets, the saved palette, Save to my colors). Its own Solid/Gradient switch is hidden there with `showKind={false}`.
  - Gradients add always-visible stop swatches, +/− Color, Reverse and a 0–359° Direction slider with a dial.
  - Patterns show a thumbnail grid with ★ favorites, category chips, `MuseSearch`, sliders (Scale, Rotation, Shift across, Shift down) and an optional base color.
- **Sliders** use one pattern: label left, value right (tabular numbers), accent-coloured range.
- **Library and font browsers.** Tabbed chip rows with `MuseSearch` and category chips. Tiles are 84px cards (art plus a small caption) with a ★ that appears on hover (always shown on touch). Font rows preview each family in its own face.
- **Board size.** "Add" step plus Left, Right, Top, Bottom and All sides buttons; exact W×H with a 3×3 anchor; preset chips. A size chip sits in the canvas corner.
- **Shared fix.** `MusePaintPicker`'s styles moved from Agenda.css to MuseControls.css, so the picker is styled everywhere it's used. Its gradient swatches had no size outside Planner before.

## Visions: Books — implemented on feature branch, Staging acceptance pending

- **A Book looks like a book.** In the library it's the cover as a small object: a darker spine band on the left, stacked cream page edges on the right, a soft floor shadow, and a gentle turn on hover (none with reduced motion). In the reader, pages sit on a dark velvet stage with a gutter shadow between facing pages, and turn with a short fade-and-slide.
- **Covers are designed objects, not templates.** Each of the five presets has its own composition and hierarchy:
  - **Classic:** a linen ground, gilt double rules, a title plate and corner stars.
  - **Celestial:** a midnight gradient with constellations, gold orbit rings and a glossy crescent moon.
  - **Romantic:** a blush rosebud ground, a cream arch with a satin bow, a script title and a heart.
  - **Editorial:** huge left-aligned serif type, a rule, a colour block or full-bleed photo, and a volume caption.
  - **Whimsical:** a three-colour gradient with confetti, a holographic organic blob and glossy stars.
- **Pages menu.** A compact toolbar popover, never a sidebar: numbered rows with a thumbnail, an inline title field, and small ↑ ↓ ⧉ and delete tools. The active page is tinted. Shows "n / 8".
- **Right-click menu.** A compact `GlassPopover` at the pointer, with labelled actions and their shortcuts in muted `kbd` text, grouped by thin rules. Delete uses the urgency ink.
- **Writing in place.** A dashed purple outline around a translucent text box that matches the words' own font, size, spacing and rotation.

## Visions studio polish — implemented locally, Staging acceptance pending

- **No nested card.** The editor isn't a card holding a canvas. It's three separate surfaces:
  - a slim glass header (title with a sparkle, plus a "Book" chip for books);
  - a **floating tool dock** pinned to the top of the screen while a tall canvas scrolls;
  - the canvas as its own **desk**: a soft dotted surface, with the board lifted on a wide shadow and a contact shadow.
- **The panel** floats beside the desk as its own glass card. The pasteboard veil follows the theme: pearly in light themes, dusky in dark ones.
- **Library.** Every card frames its art at the same 4:3, so rows align: boards are fitted inside, and books stand on a little shelf.
- **New Vision cover tiles** follow the chosen page shape and carry a spine.
- **Reader.** A starlit reading room (stars twinkle only with motion allowed), folios (page number, the book's title at the bottom of left pages, the page title on right pages), and stacked page edges.
- **Library tiles** for frames, paper, labels, washi and stickers sit on a soft tinted backdrop, so white art is visible.

## Book and Series pages (#136) — implemented on feature branch, Staging acceptance pending

Book and Series are pages inside Collections. Both open with a pill Back control that names where it returns (search, a book, a series, Books) and a quiet Collections / Books trail. The book header floats on the book's own atmosphere: a page-edged cover, an accent-washed series chip above an editorial title, author, a dotted facts line, genre chips and a status pill. The reading companion is one Crystal/Frosted card (sticky on desktop, directly under the header on phones) that holds progress, the live sitting (breathing dot, editorial clock, Pause/Resume primary) or the sitting chooser, stats and two quiet actions; a floating mini-player appears only while a sitting runs and the companion is out of view. The reading column is one card with dividers, not a stack of boxes. Series artwork uses `SeriesCover`: real art when available, otherwise a designed cover on the catalog's colour; books not on the shelf recede (faded, dashed edge) rather than disappear. The Series hero is a glass shelf of spines in reading order, with the next book pulled forward. Search results use cover-left rows, a series chip, highlighted words and the bookmark + shelf split button; "Which edition?" lists real differences only. Motion is short arrival/settle and hover lift; reduced motion and Quiet Muse Magic remove it.

## The final glow-up (MVP 1) — implemented on feat/final-glow-up

- **One container rule.** Anything that sits on the atmosphere is the opaque card surface (`--glass-background`), never a see-through tint; nested rows use `--surface-subtle`. Gradient rings (`app/surfaces.css`) are drawn inside the padding box, so a card that clips its own overflow keeps its whole outline. Control bars (search, segmented pickers, date pill) are solid in every theme.
- **Section identity.** `components/design/MuseHeading.tsx` supplies `MuseMark` (a colored tile in the theme's chart inks), `MuseHeading` (mark + editorial title + description) and `MuseStatTile`/`MuseStatRow`; `MuseGlyph.tsx` holds the meaningful glyphs (moon phase, spread, quill, receipt…). Never one generic star for everything.
- **Tarot.** The Reading Table is a ritual (cloth, steps, deck, arc of face-down cards, seats). The **Interpretation Desk** puts cards, meanings and the journal side by side (phone: sticky card strip). Meanings come from existing card data and the Grimoire manuscript (`lib/whimsy/tarot-interpretation.ts`). Card backs have six finishes (Starry Sky, Hologram…), a device preference.
- **Horoscopes.** A day that is not today never shows a forecast: it shows the reader's own reflections or "Your cosmic forecast for this day wasn't saved." Reflections save to the Cosmic Journal with a server-rebuilt forecast reference (sign, period, first day); no provider text is stored (CosmyDay terms).
- **Money.** Coming up merges bills, card payments and each active recurring payment's next charge, once per obligation (`comingUp` in `lib/money.ts`).

## The final glow-up, part 2 — implemented on feat/glow-up-2, Staging acceptance pending

- **Never translucent.** Crystal `--glass-background` is at least `.9` in every theme (Glitter, Solstice, Afterglow and Issya XXX were raised); Frosted stays the more opaque step. Control bars (date navigation, segmented controls, search, week jumps, Atlas sections) are solid in every theme.
- **Titles editorial, content sans, app-wide.** Card and panel titles use `--font-editorial` (`app/typography.css` lists every title selector); body, labels and controls stay `--font-ui`. Daily Edit section titles use the italic display cut.
- **Jewel marks.** `MuseMark` is a deep jewel tile with a white glyph (via `oklch` relative colour), so a light or pink theme never gets a dark glyph on a hot tile. `CardHeading` maps each title to a meaningful glyph and tone (`cardMark`); a toned heading gives its card a soft aura in that colour and a fading hairline.
- **Gradient numerals.** Big numbers (stat tiles, Money totals, Planner day numbers) run from the page ink into their own colour, as in the Books dashboard. Light-card themes (Midnight Ballerina, Pretty Toxic) keep solid card ink.
- **Zodiac glyphs.** `components/astrology/ZodiacGlyph.tsx` draws Muse's own line glyphs on the 24px icon grid; each sign has its own colour and neighbouring signs never share one. System zodiac characters are not used for signs.
- **Contrast.** Light-card themes extend the card-ink list to every control and kicker that sits on a light card. Light themes deepen accent-coloured small text (`oklch` lightness capped) so kickers and labels pass on white.
- **Stable layouts.** Growing sections become carousels or fixed grids (Mood history is a seven-day ribbon with one detail panel; Reading Plans are numbered rows of five). Phone chip rows scroll with a fade and snap rather than clipping.
- **Delight with purpose.** Side Quests are sealed invitations (constellation sigil, wax seal, hold-to-seal ring); Fortunes are lit stages per experience; Planner days show a star per task that lights when done; empty states (Notes, Stream, Goals, Birth Chart) are small illustrations with a real next step. All motion is finite and gated by reduced motion and Muse Magic.

## Life Atlas (#190) — implemented on feat/life-atlas-2, Staging acceptance pending

- **Classes:** `muse-lifeatlas-*` (the Books Reading Atlas owns `muse-atlas-*`; plain global CSS must never share a prefix) and `muse-ritual-*`.
- **Area ink:** each Life Area takes `--mark-a`/`--mark-b` from `areaTone(position)` (three steps around the eight chart inks, so neighbours differ). Its mark is the one gradient icon tile; the same ink tints the masthead wash, row hover, milestone dots and bars.
- **Grid:** sections are full width and rows share two equal columns. Expanding a row opens a full-width panel beneath that row's line, using CSS `order` so the DOM stays row-then-panel. A ghost add slot fills an odd row. Growth pages (six rows) or goes into carousels (open pages, more than four achievements).
- **Light-card themes** (Astral, Nightbloom): Atlas sections, shelves, hero, welcome and ritual pages are in the card-ink list in `app/surfaces.css`.
- **Motion:** star breathing, the reveal and the keepsake ripple are all gated by `prefers-reduced-motion:no-preference` and `data-magic`, with finite iterations.

