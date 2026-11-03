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

## Reusable interaction language

`app/interactions.css` provides theme-aware gradient borders for actual interactive surfaces through `.muse-edge` and shared control selectors. Silky restrained transitions; optional tiny lift; no bouncing. Keyboard focus is equally visible. Static MuseCard surfaces must not falsely advertise clickability.

`MuseSpark` / `useMuseSpark` supply a brief, local 2–4 official-star success treatment for meaningful completion. Absolute positioning, no flow/layout movement, no confetti or big particles. Reduced motion substitutes a brief static glow. Selected states use semantic tint, luminous border, readable selected ink, and optional inner highlight. Progress uses the active theme's own gradient.

Use personality selectively; no slogan in every card. Native semantics, comfortable 44px touch targets, visible focus, labelled controls, keyboard alternatives, and reduced-motion rules are required.

## Header and shell

Preserve the approved desktop rail (200px/68px collapsed), line icons, grouped navigation, active MuseStar, and floating glass mobile Today/Planner/Rituals/More. A quiet 44px toggle at the top outer edge replaces the bottom text-heavy Collapse row. Two restrained independent MuseStars occupy only the expanded logo region; they disappear when collapsed. No connector/constellation line may cross the logo or link it to the toggle. Theme the shell through tokens, not a redesign.

Daily Edit uses dominant whimsical greeting plus a functional temporal cluster inside an abstract cosmic field. The three theme-colored MuseStars sit immediately LEFT of the date pill with breathing room, week below; theme switching no longer consumes hero space. The fast global theme/material control is near Appearance/Settings in the sidebar, orb-only when collapsed, and outside heroes in mobile app chrome. Do not add height or make a centered illustration track. Hide decoration before controls crowd. “The Daily Edit” remains a section title before the grid.

## Planner composition

Planner inherits this same system. Desktop has a **280px planning rail** (approved range 260–320px) beside one flexible rolling three-day canvas. The layout has exactly two structural children, rail and canvas; do not reintroduce separately placed/spanning utility rows. Both have explicit available-width constraints and min-width:0. The rail's surface, top workspace switcher, internally scrolling source cards and bottom quick capture distinguish it from dated tracks. Remove persistent Unscheduled/count/helper/New workspace rows; the source list begins below the workspace selector and capture stays at the bottom. New workspace is a separated action inside the existing custom workspace popover, with semantic markers, selection and keyboard navigation. The day grid evenly divides the remaining width, displaying three columns at roomy desktop sizes, two below 1050px of content width, and one at/below 820px. Reduce the visible count before cards become unreadable; next/previous still shift the three-day data window one day. Workspace selects context; one compact Filters popover contains group/tag/status controls. Search and the compact Filters/Today/previous/next utility row sit in the secondary toolbar directly below the shared header, outside Task List. These govern the canvas without a permanent filter form. The workspace switcher opens contextual choices/counts and New workspace/organization management, not a huge board-wide select. Arrows shift one day, not by rigid weeks. Day headers retain task totals and human-readable planned duration (for example 2h 45m). Mobile has a focused day, date/week navigation and manual Move in Details; Task List opens in a sheet. Workspace/source creation stay in that sheet; search/day navigation/Filters remain outside. It does not squeeze three columns. Task surfaces are quiet glass; workspace dots and compact theme-aware tags carry organization. Title opens Details; completion, timer and classification controls retain distinct semantics. Cards have no persistent drag handle or Move link. Manual Move and reordering remain in Details. Native desktop drag targets use Drop Glow; the dragged surface lifts subtly without changing layout, and a meaningful successful placement gets a tiny Muse Spark. Move supplies keyboard/touch access. Due-before-plan is contextual date information, not a failure judgment.

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

`MuseModal` uses a roughly 660px-wide, 75dvh desktop picker and a near-full-width 90dvh mobile sheet; short screens use the available height. Native modal focus containment/Escape and shared lifecycle return focus to the trigger. Results use a roving tab stop with arrow/Home/End navigation, so Tab can reach Done directly. Search/quadrant filters and Done are non-scrolling flex regions; only results have min-height:0/overflow-y:auto. Desktop results use two columns, narrow screens one. Quadrant controls may scroll horizontally, never as a second vertical area. The floating material retains its dedicated depth shadow and Crystal/Frosted optics. No new motion is required.

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

Mood cards size naturally: check-in and distinct Day in Three stack at left, Pulse at right; mobile stacks the same DOM order. The Day in Three picker shows a selected count/slots and the full searchable/category vocabulary, remains open for up to three choices, supports explicit slot replacement/removal and has a separate Done/Cancel footer. Only Done commits the draft. Confirmed chips use simple edit/remove controls, with no cycling arrows. Native emoji appearance remains OS-dependent; original date-keyed state is reused.

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

Bookshelf keeps the shared Whimsy header/navigation and theme-aware glass. Reading Desk uses compact cover-led cards and a distinct, recoverable timer; My Shelf uses responsive book covers with legible fallback artwork; Reading Atlas uses actual-data metric tiles, a period series, calendar, and goals. Covers are optional and must not block manual book creation. Timer controls and page-entry methods remain keyboard accessible with visible focus. The optional Daily Edit reading projection uses an existing card position and is absent by default, so the approved Daily Edit arrangement is unchanged until the user enables it. Reduced-motion preference removes decorative motion without obscuring state.

### Daily Edit widget display controls — implemented locally

`DailyEditWidgetControl` is the reusable presentation for optional widget visibility. Place its compact Display trigger beside the owning experience/section header. The shared, viewport-aware glass popover contains one labeled **Show on Daily Edit** switch, confirmed state and saving/loading feedback. It supports keyboard focus, Escape/outside dismissal, mobile containment and reduced motion. The owning module retains its existing persisted preference, revision and retry command; no duplicate preference authority is created. Bookshelf, Fortunes and Dreamscapes use this pattern, replacing their bottom checkboxes. It does not introduce a separate dashboard customization system or alter Daily Edit layout.

Bookshelf's book form groups Details, Status, Progress and Cover within one scrolling editor with accessible sticky Save/Cancel actions. Optional HTTPS covers retain fallbacks and a preview; external search remains planned. Reading Desk and My Shelf are cover-led with restrained hover edges and status chips. Reading Atlas prioritizes metrics, goals, rhythm/calendar, per-book progress, genres and completions. Charts use semantic accents, actual saved data, labeled scales and text equivalents. No-session states omit invented pace/time measurements; added dates, start dates, calendar duration and actual reading days remain distinct. Calendar columns align to weekdays with independently identifiable today, selected date and activity.

Fortunes uses one compact navigation row and original lightweight SVG cookie, crystal ball, sealed letter and cabinet illustrations. Each illustration is a keyboard-accessible draw action connected to the same confirmed result. Short replayable split/unfold/glow/drawer effects run after a successful persisted draw; state remains readable with Muse Quiet or reduced motion. Paint IDs are per-instance. Cookie results use a readable parchment treatment; other results retain theme-aware glass. No new theme palette or global atmosphere is introduced.

Fortune Cookie secondary result actions use dark parchment ink with explicit hover, focus, and disabled treatments; Save to Collection is the theme-aware gradient primary action. Cabinet category accents are stable across drawers, filters, revealed results, and saved keepsakes: Scientific Oddities cyan, Natural Wonders green, Strange Animals pink, Peculiar History violet, Unusual Inventions orange, Art & Culture gold, Curious Words blue, and Delightfully Bizarre Facts magenta. Color decorates the small bar, subtle glow, and selected outline; labels retain readable foreground ink and surfaces remain cohesive.

The Cabinet initially shows twelve real curiosities, with Discover More Curiosities revealing further batches of twelve after filtering. The collection uses compact keepsake disclosures in three desktop, two tablet, and one mobile columns, sized by available content width. Each shows type, category, title, a short preview, and the saved date in its saved timezone. Native Enter/Space expansion reveals the full historical snapshot, private question/note, original source, and existing reopen/edit/remove actions. Note edits remain drafts until explicitly saved. Official Muse stars and restrained static glow supply interaction detail without continuous animation.

### Whimsy exploration and Tarot study — local refinement

All five experiences use `muse-whimsy-page` plus `WhimsyExperienceHeader` for one post-navigation baseline and standard section gap. Optional context sits beside the copy/actions, never in an extra page-flow row. Existing poetic copy remains optional rather than adding filler. Compact field labels keep optional indicators inline; searches retain accessible names when their visual labels are hidden.

Tarot's question field, spread selector and Reading Options share a responsive setup toolbar. The Grimoire combines a flexible search, distinct Study Mode action and tightly wrapped suit filters. Its responsive cover-led grid avoids narrow desktop thumbnails. Journal filters and Timeline/Calendar form one related toolbar. Study uses artwork beside one learning panel, with reveal/hide, upright/reversed segmented meanings, keywords, symbolism, journal prompt, random alternative and previous/next navigation. Keyboard focus moves to the revealed panel; mobile stacks art and learning. Visual observation prompts and artwork descriptions appear only after a successful image load; failures retain written study and an explicit retry. Reduced motion and Muse Quiet remove reveal movement.

Original local Tarot scans use `TarotCardArt` with `unoptimized` Next images: protected source files must be fetched by the authenticated browser, because the optimizer does not forward authentication headers. Do not weaken application routing or substitute placeholders for the real artwork. All 78 source/licensing records remain intact. Fortunes' SVG objects remain present both before and after reveal; Oracle's optional hold interaction has visible ring/progress feedback, keyboard cancellation and a normal click alternative.

### Cosmic Observatory — scoped local implementation

The sixth Whimsy destination uses the shared page/header/nav and Muse semantic surfaces, foregrounds, focus rings, modal, magic and reduced-motion behavior. Its five content sections share one compact subnavigation; My Cosmic Profile opens from the header as settings. The three/two/one keepsake grids, responsive chart wheel plus complete placement text list, touch/keyboard planet selection, and immediate full library/event/placement detail are local patterns; there is no extra detail-page hop. The library detail presents complete original draft interpretations with factual astronomy separated from traditional astrology. Date/source/uncertainty labels remain visible in all themes. Chart glyphs use text presentation and explicit semantic contrast; decorative shimmer is removable in Quiet and reduced motion. No palette or global theme rules are changed. Verification and editorial status: [COSMIC_OBSERVATORY_IMPLEMENTATION](COSMIC_OBSERVATORY_IMPLEMENTATION.md).

### Whimsy keepsakes — local polish

Use real saved content as the visual anchor of Tarot, Dreamscapes, Fortunes and Bookshelf cards. Gallery cards adapt from three columns to two to one and retain readable text, visible keyboard focus and existing theme tokens. Tarot spread diagrams represent the actual card count; saved-reading cards show actual drawn artwork. Dream picker results are bounded and searchable. A book status control acts on the canonical book record wherever shown. Observatory houses, aspects and entry details use the shared celestial surface language, while uncertainty and source labels remain ordinary readable text.

The Observatory Library Explore view uses seven recognizable collection accents while entry cards and detail surfaces continue to use theme tokens. Its featured and recent links open the complete entry directly; All Entries exposes search, filters, sorting and density without changing the underlying content. The Calendar month grid and timeline show the same calculated events, and event detail distinguishes the astronomical fact from traditional interpretation. The lunar phase marks are schematic, never a replacement for event calculations. The chart wheel and placement list share selection state, with a visible selected outline and keyboard-accessible controls. Celestial motion is brief and respects Quiet and reduced-motion settings.

## Sidebar single-scroll refinement

Desktop rail content scrolls as one unit at `100dvh`; navigation has no independent overflow. The brand/collapse control leads, grouped modules follow, and the theme control plus compact Settings/Sign Out rest at the bottom when height permits. On shorter viewports the whole rail scrolls. Keep active rows distinct from hover rows, preserve visible keyboard focus, and use the existing theme swatch/menu. The theme menu remains portaled to the viewport so the scrolling rail does not clip it. Mobile keeps the established bottom navigation and More popover. Collections is reserved for the Life group between Mindspace and Whimsy and is hidden until its destination works.

## Tarot and Dream reference entry pages — local draft

Reference cards open on dedicated Whimsy routes. Breadcrumbs show location; a separate contextual link returns to the originating reading, journal, decoder, or filtered library. The six chapter controls, optional continuous reading mode, editorial art, sources, personal reflection field, and adjacent-entry links use existing theme surface, selection, and focus tokens. On narrow screens the hero stacks and chapter controls wrap into touch-sized rows. These pages do not replace Tarot draw rituals or Dream Diary records. Tarot manuscript status remains visible as a draft until editorial approval.

The Tarot Grimoire's local refinement tightens hero and chapter spacing, uses a smaller framed RWS illustration, and places only subtle celestial ornaments near the title and section heads. Reading prose sits on a quiet semantic surface; the six chapter controls remain compact, wrap on mobile, and keep visible selected and keyboard states. Reflection contains a collapsible private writing panel, while related cards use the existing artwork as compact shelf links. Source references are in a subdued “From the Archives” disclosure. Internal manuscript status and review notes are available in source JSON and the editorial audit; they are omitted from normal reading UI.

The Grimoire chapter panels, Related Cards, and From the Archives span the same full content width and share both edges with the hero and chapter navigation. Prose inside those panels uses the available content width and wraps within the existing padding. Reflection presents source-authored upright and reversed questions as individual prompts, distinguishes the journal ritual, and gives any supplied last thought a quiet literary close. The private interpretation editor remains in Reflection.
