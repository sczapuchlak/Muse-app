# Muse design system

## Character

Sophisticated, feminine, editorial, celestial, ethereal, vibrant, luminous, structured, polished: “grown-ass-woman cute.” Avoid pastel SaaS, muted-purple-everything, childish cartoons, generic confetti, unrelated sparkles, photography backgrounds, arbitrary cards, beige productivity UI, and one purple/pink palette applied to every theme.

**Structure first, whimsy second.** Disciplined grids share margins, gaps, radii, padding, alignment, and sizing rules. Desktop uses width deliberately; mobile recomposes. Future reorderable cards snap to the grid.

## Typography and stars

All functional UI uses the existing modern sans-serif: branding, navigation, headings, tasks, notes, budgets, charts, controls, labels, numbers. Italic display serif is reserved for approved whimsical editorial copy, particularly the Daily Edit greeting. `--font-ui` and `--font-whimsy` keep families globally swappable; do not add fonts casually.

Use the existing elongated, clean four-point `MuseStar` at all sizes, with theme colors and restrained opacity variation. No five-point/cartoon stars or Unicode sparkle families. The optional profile-driven constellation uses these nodes and fine lines, stays decorative, and respects reduced motion. No horoscope widget is implied.

## Material and atmosphere

Layer CSS radial glows over a base with recognizable pools of light and readable neutral space. Current Iridescent and Prism Noir dimensional atmosphere are reference quality. Shared haze/aurora light and sparse header flecks add richness; no dense star field behind data. Each theme supplies its own bloom distribution, haze, constellation ink and edge/accent hierarchy. No photography.

Crystal (implemented): tinted polished glass with layered low-opacity internal theme reflections, a restrained upper/side specular highlight, inset edge light, prismatic borders and depth shadow. Backdrop blur/saturation lets atmospheric light interact with the material while preserving fill behind text; a luminous border alone is insufficient. Frosted (implemented): higher opacity, stronger diffusion/blur, lower saturation/refraction and quieter internal light. The material switch must be immediately visible without sacrificing contrast. Both are available from the shared theme picker and use the same markup/tokens. Changing material never changes information architecture. Light glass must not become opaque white; dark glass must not become opaque black.

## Themes are identities, not background swaps

A theme must remain recognizable with the page background hidden. Atmospheric softness must not leak into functional accents: neutral readable text and controlled glass coexist with vivid selected borders, active navigation/icon accents, completion, progress, badges, focus and sparse magical points. Prefer vivid but controlled over tastefully muted. Dark accents should read like tiny colored lights; most text and surface area stays restrained. Shared markup/layout/behavior inherit a complete semantic visual language: active navigation, chips, dates, completion, progress, links, icons, focus, hover edges, borders, success, Spark, stars, popovers, and future charts.

| Theme | Identity and accent hierarchy | Distinct behavior |
| --- | --- | --- |
| Iridescent | Ethereal/pearlescent/airy/prismatic/girly. Aqua primary; lavender/orchid secondary; bubblegum/raspberry blush pop; sky support | Luminous pearlescent selected glass; aqua → violet → blush progress; preserve rich current atmosphere |
| Astral | Celestial/electric/cool/deep space. Cobalt primary; icy cyan secondary; ultraviolet pop; royal/azure support | Blue-cosmos active navigation/completion, cyan focus/Spark, ultraviolet selection; cobalt → electric blue → cyan progress. Pink minimal; never a navy Prism Noir |
| Nightbloom | Lush/jewel/romantic/moody/botanical-night. Emerald primary; peacock teal secondary; wine/berry pop; turquoise support | Emerald selection, peacock navigation/focus, vivid raspberry stars/badges/edge light and progress endpoint. Cool left/dimensional center/black-cherry-wine upper-right/emerald lower-right atmosphere; a smaller rose field bridges the center. Both warm and cool identities are visible, with fewer rainbow effects. No sage/muddy forest/Christmas palette |
| Solstice | Warm/sunlit/juicy/fresh/editorial. Raspberry primary; coral/tangerine secondary; turquoise pop; selective gold support | Raspberry selection, coral active states, turquoise contrast, warm detail; turquoise/aqua progress with raspberry/coral. No beige/washed-out cream |
| Prism Noir | Dark/prismatic/fashion-editorial/cinematic/luxurious. Fuchsia primary; violet secondary; electric blue pop; selective cyan support | Preserve the existing atmosphere, with a localized fuchsia hero splash. Owns strongest blue → violet → fuchsia gradients, edge refraction and dramatic prismatic contrast; do not spread all its tricks to every theme |
| Afterglow | Near-black neutral graphite/charcoal/smoked glass; vivid LED-like pastel/neon light. Acid mint/aqua primary; electric lilac/periwinkle secondary; neon peach/coral and hot pink sparingly | Mint/lilac selected light, mint → lilac → pink hover, aqua/periwinkle/lilac/pink progress, coordinated pastel stars. No navy-space base or RGB rainbow |

## Tokens and implementation

`app/themes.css` is the color source; `lib/themes.ts` is the registry/preview source. Each theme supplies the same token contract. `app/globals.css` owns shared geometry/typography; components do not contain theme-specific hex colors. Legacy color-family tokens remain compatibility roles; new UI consumes semantic action (`--action-fill`), warm accent (`--accent-warm`), navigation light (`--navigation-accent`), selection (`--selected-background/border/text`), navigation (`--navigation-background/text`), completion (`--success-primary/secondary`), focus (`--focus-ring`), hover (`--hover-start/middle/end`), progress, star, surface, and ink roles. Workspace/tag colors reference `--accent-primary/secondary/pop` through stable semantic role IDs, so custom organization stays compatible with all themes. Chart palette tokens are reserved until charts are implemented. A future theme primarily adds a registry entry and complete token block.

Keep dark/light inputs, placeholders, secondary text, disabled controls, dropdowns, and focus readable. Theme changes cannot change layout, spacing, typography, or functionality.

Use plain prefixed component CSS: the current Turbopack CSS transform does not reliably export CSS-module class mappings. Revisit that pipeline separately before introducing modules.

## Reusable interaction language

`app/interactions.css` provides theme-aware gradient borders for actual interactive surfaces through `.muse-edge` and shared control selectors. Silky restrained transitions; optional tiny lift; no bouncing. Keyboard focus is equally visible. Static MuseCard surfaces must not falsely advertise clickability.

`MuseSpark` / `useMuseSpark` supply a brief, local 2–4 official-star success treatment for meaningful completion. Absolute positioning, no flow/layout movement, no confetti or big particles. Reduced motion substitutes a brief static glow. Selected states use semantic tint, luminous border, readable selected ink, and optional inner highlight. Progress uses the active theme's own gradient.

Use personality selectively; no slogan in every card. Native semantics, comfortable 44px touch targets, visible focus, labelled controls, keyboard alternatives, and reduced-motion rules are required.

## Header and shell

Preserve the approved desktop rail (200px/68px collapsed), line icons, grouped navigation, active MuseStar, and floating glass mobile Today/Planner/Rituals/More. A quiet 44px toggle at the top outer edge replaces the bottom text-heavy Collapse row. Two restrained independent MuseStars occupy only the expanded logo region; they disappear when collapsed. No connector/constellation line may cross the logo or link it to the toggle. Theme the shell through tokens, not a redesign.

Daily Edit desktop hero uses three loose horizontal visual zones: dominant whimsical greeting left, visible but restrained personalized constellation bridging the central negative space, and functional temporal controls right. The three signature Muse stars sit immediately LEFT of the Theme Picker in one horizontal flourish, never underneath it. The theme control has comfortable hero padding; date navigation and week strip remain grouped below. Use existing width rather than increasing hero height. The central constellation has thin theme-aware lines, varied official nodes and quiet shimmer, without overlapping text or controls. Hide decoration before functional controls crowd; small screens reflow deliberately. Theme remains globally accessible on other routes. “The Daily Edit” is a content-section title 16–24px before the grid.

## Planner composition

Planner inherits this same system. Desktop has a **280px planning rail** (approved range 260–320px) beside one flexible rolling three-day canvas. The layout has exactly two structural children, rail and canvas; do not reintroduce separately placed/spanning utility rows. Both have explicit available-width constraints and min-width:0. The rail's surface, spacing, workspace switcher, unscheduled label, creation control and source cards distinguish it from dated tracks. The day grid evenly divides the remaining width, displaying three columns at roomy desktop sizes, two below 1050px of content width, and one at/below 820px. Reduce the visible count before cards become unreadable; next/previous still shift the three-day data window one day. Workspace selects context; one compact Filters popover contains group/tag/status controls. Search is bounded in the rail, followed by a compact Filters/Today/previous/next utility row. These govern the canvas without a permanent filter form. The workspace switcher opens contextual choices/counts and New workspace/organization management, not a huge board-wide select. Arrows shift one day, not by rigid weeks. Day headers retain task totals and human-readable planned duration (for example 2h 45m). Mobile has a focused day, date/week navigation and explicit Move; Planning Space opens in a sheet. Search/workspace/source creation remain available there; compact day navigation/Filters remain outside. It does not squeeze three columns. Task surfaces are quiet glass; workspace dots and compact theme-aware tags carry organization. Title opens details; explicit completion and Move controls retain their own semantics. Native desktop drag targets use Drop Glow; the dragged surface lifts subtly without changing layout, and a meaningful successful placement gets a tiny Muse Spark. Move supplies keyboard/touch access. Due-before-plan is contextual date information, not a failure judgment.

The reusable `MuseDrawer` uses a native dialog: modal focus containment, Escape, inert background, separate header/scrolling content, theme-aware glass, and return focus. Popovers remain bounded floating surfaces. Within native sheets they portal into the active dialog, with local coordinates, so the native inert/focus boundary does not disable them. `useMuseDialog` supplies the common lifecycle for sheets and the larger `MuseModal`; initial focus, native Escape/focus containment, scroll lock and return focus are shared.

## Dark material hierarchy

Maintain three visible levels: atmospheric page → rail/column/group container → task/interactive surface. `--planning-container-background`, `--planning-rail-background`, `--planning-task-background`, `--planning-task-border`, and `--planning-control-background` are supplied by all six themes. Dark cards come forward with lighter translucent, theme-tinted surfaces and clear edges; secondary text must remain readable. Never flatten the atmosphere into opaque gray boxes. Existing Prism Noir atmosphere/global glass is preserved; its new planning surfaces improve separation locally.

## Ritual rhythm and feedback

Rituals uses the shared functional page header (eyebrow “A RHYTHM OF YOUR OWN”, title Rituals + MuseStar, support “Small things, returned to.”), a week context and user-named grouped rows. Desktop rows align seven status cells to weekday/date headers. Mobile stacks groups and shows one selected-day control per row beneath the compact week navigator, retaining weekly goals/context and 44px touch targets.

States are visually and semantically distinct: Complete, Partial, explicitly Missed (×), past Unknown (○), Upcoming, and neutral Not Scheduled (—); today may remain open. Weekly sessions display as logged toward a weekly goal, not completed daily goals. Partial numeric/duration cells use the group-gradient ring with actual value/short unit. Complete uses a vivid readable filled control; quantities retain their actual value plus an attached check badge, while binary completion uses a check. Completed quantities never retain a full progress ring. Weekly-target entries remain session values; their weekly aggregate clearly marks goal completion. No selected/today double-ring completion treatment. Missed and unknown remain visually distinct. Avoid decorating every gap or making group containers appear clickable.

Reusable `OrbitalGlint` marks ordinary Ritual completion: one MuseStar and a thin sweeping arc, about 580ms, local and pointer-transparent. `ConstellationCelebration` marks meaningful streak thresholds: four official nodes, fine sequential connections, under one second, contained and cleanly removed. Existing Muse Spark remains the task/priority completion language. Reduced motion replaces orbital/constellation movement with a brief static theme glow; no confetti, layout changes or cartoon particles. Hover/focus/press continue to use shared Muse edges and semantic colors.

The profile-driven decorative constellation shell uses the corrected three-zone header composition described above. Its Virgo example is larger and visibly bridges the greeting and right controls, while remaining secondary to both. Three coordinated signature stars belong beside the Theme Picker, not below it. Theme-specific quiet inks, official nodes, thin lines and one-at-a-time glints keep the constellation atmospheric. Tablet/mobile hide it before controls crowd. Additional zodiac identities/onboarding personalization and horoscope content remain future/exploratory; no API/provider is selected.

## Materials, atmosphere and interaction tokens

`app/materials.css` switches optical roles via root data-material. Its root-qualified surface selectors deliberately outrank component background shorthands, which previously erased the painted glass layers. Shared internal radial/linear reflections use theme accents; there are no per-card theme hex values. Crystal uses 22px blur/1.4 saturation; Frosted 34px/1.05 with higher fill and much lower internal light. Add no second blur to every nested meal/task surface and no animated gradients/filters on static cards; this preserves material hierarchy and limits rendering cost. Every theme supplies Crystal/Frosted glass, floating, input and planning-surface colors; Frosted has greater opacity/diffusion. All shared cards, rails, groups, Nourish day/meal surfaces, popovers and drawers use material blur and surface roles. Material cannot change width, spacing, typography, or information architecture.

`app/atmosphere.css` supplies Celestial Drift behind the app. `PageCelestial` selects distinct Planner/Rituals/Nourish compositions built from shared SVG canvas/path/point/official-star primitives. Planner has a sweeping map with three fragments; Rituals has intersecting orbital systems and phase markers; Nourish has branching organic curves, leaf geometry and a quiet crescent. Layer distant points, thin theme-colored lines and occasional brighter nodes across a meaningful part of the negative space. The compositions vary naturally rather than sharing one small icon or identical height. Decoration reduces/hides before typography or controls crowd. The personalized Daily Edit constellation remains a separate editorial ornament.

`lib/motion.ts` is the common timing source, exposed as root CSS variables. The reusable vocabulary is Muse Spark, Orbital Glint, Constellation Celebration, Prism Edge, Celestial Drift, Star Shimmer and Drop Glow. Keep feedback brief/silky; no bounce/confetti. Reduced motion removes drift/shimmer/travel/lift and retains static color/glow and visible state changes.

Ritual group identity is integrated in a narrow luminous banner/header wash, never a saturated data panel. Theme-relative primary/secondary/pop gradient presets are part of the group model and editable in Manage groups. Full custom colors/gradients remain future Appearance/editor direction.

## Card-header action roles

`CardHeading` composes a functional title/icon, optional informational `ModuleBadge`, optional Manage link/button, and meaningful existing actions. Source badges are compact, use semantic theme accents, and are not duplicate links. Manage/record Edit/Settings retain their distinct meanings. Today's Plan omits the redundant header item count; accurate overflow counts remain within its bounded Schedule and Tasks sections. Meals links to date-specific Nourish; Water manages goal/quick amounts separately from editing today's quantity. Do not add actions purely for symmetry.

## Nourish composition

Nourish shares the Muse header, date/week navigation, drawers, theme/material tokens and interaction vocabulary. Desktop presents deliberate Monday–Sunday rows with aligned breakfast/lunch/dinner/snacks slots. Meal lists within a slot are bounded scroll regions; empty slots provide a quiet Add affordance. Mobile shows only the selected day's stacked slots with the same assignment semantics and comfortable controls. Plan is the default of Plan / Saved Meals / Grocery List. Saved Meals is a proper searchable/type-filtered library view with creation/edit sheets; multi-type chips default to the active slot when saving from a day. Grocery List is a grouped shopping surface with large Muse completion controls, restrained Spark, optional quantity/note, and completed items retained until cleared. Native desktop drag uses shared Drop Glow and a tiny success Spark; explicit Move/Copy sheets provide keyboard/touch alternatives. Optional nutrition lives in a secondary collapsible editor; daily totals are compact and disclose incomplete data. Daily Edit uses the same shared summary component, limited to two known fields. No nutrition charts, recipe dashboard, food photography or unrelated decoration.

## Color correction and optical verification

Accents and readable ink are different roles. Bright `--action-fill`, `--navigation-accent`, selection/focus/success/progress/star tokens must not be derived from pale metadata text or diluted by surface opacity. Source badges retain readable ink with a vivid theme edge; navigation uses an accent edge/icon alongside readable labels. Themes supply localized hero glow and bloom-size/position tokens, allowing cyan Astral, warm Nightbloom and fuchsia Prism Noir to light the header without moving any component. Afterglow concentrates LED-bright color in localized fields against predominantly neutral near-black; never turn it into navy, dusty pastels or colored clouds across the entire page.

Automated numeric checks cover filled action/completion labels, material text over representative atmospheric blooms/reflected light, all theme token contracts and dark planning separation. They are not browser contrast/visual approval, especially with actual backdrop compositing. Preserve system reduced-motion handling; the Crystal refinement adds static painted light rather than animated filter work.

## Module hero composition and mantra

Same universe, different celestial signature. The left holds mantra/title/subtitle; the central flexible illustration track uses real negative space; the right holds date/context where applicable. Illustration never sets functional hit areas or crosses text/controls. No rectangular artwork card, literal food art, zodiac clip art, photography or cartoon planets. Do not shrink a spacious hero merely to avoid illustrating it. Mantras express the module's philosophy while titles remain obvious. Nourish's approved mantra is NOURISH WHAT CARRIES YOU; Planner and Rituals copy is retained. Future module metaphors/copy require intentional work and are not auto-generated from feature names.

Daily Edit's brighter star flourish is explicitly a no-wrap horizontal row beside Theme Picker; its distinct profile constellation is visible in the center at desktop sizes. Quiet theme inks mix with star accents to avoid compounded-opacity disappearance, including Afterglow. The constellation reduces only when functional space requires it (below 900px content width); no taller decorative stack.

## Ritual status and week-strip geometry

Completion is a filled check/value-check treatment, partial is the ring, missing is an open indicator, explicit missed an ×, unscheduled a dash. Status never relies on color alone. The week strip adds only a thin theme-gradient bottom line and optional perfect-daily-goal MuseStar, with completion percentage in accessible labels/title. Future/no-obligation days omit the line; partial does not award a perfect day. Shared state/reduced-motion behavior remains; no replay animation on initial history load. Category banners use the same local padding/radius as their container, with clipped overflow and a contained accent pseudo-element; no protruding negative-margin gradient/glow.

## Large searchable picker pattern

`MuseModal` uses a roughly 660px-wide, 75dvh desktop picker and a near-full-width 90dvh mobile sheet; short screens use the available height. Native modal focus containment/Escape and shared lifecycle return focus to the trigger. Results use a roving tab stop with arrow/Home/End navigation, so Tab can reach Done directly. Search/quadrant filters and Done are non-scrolling flex regions; only results have min-height:0/overflow-y:auto. Desktop results use two columns, narrow screens one. Quadrant controls may scroll horizontally, never as a second vertical area. The floating material retains its dedicated depth shadow and Crystal/Frosted optics. No new motion is required.
