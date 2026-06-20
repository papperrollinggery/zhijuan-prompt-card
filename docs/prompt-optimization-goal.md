# Prompt Optimization Goal

This document defines the repeatable goal-mode loop for changing `src/shared/reversePrompt.ts`.

## Objective

Improve image-to-prompt reconstruction quality while keeping the output generator-neutral and keeping any `PromptAnalysis` schema changes explicit in docs, checks, and compatibility fallbacks.

The workflow must cover:

- Plan: identify the visual reconstruction gap and the expected behavior.
- Implementation: update the reverse prompt contract with the smallest useful edit.
- Review: check schema compatibility, drift-control rules, and generator neutrality.
- Validation: run local static checks, typecheck, and build.
- Simulated use: test representative prompt outputs as if a user copied them into a generator.
- Cleanup: leave no unneeded worker threads or temporary generated artifacts as source files.

## Success Criteria

A prompt optimization is ready only when all of these are true:

- `REVERSE_PROMPT_SYSTEM` still asks for valid JSON only.
- The top-level JSON shape still matches `PromptAnalysis`.
- `json_prompt.generation_prompt` is treated as the strongest generator handoff prompt, with `en.prompt` kept as the natural-language English fallback.
- `json_prompt.generation_prompt`, `json_prompt.generation_negative_prompt`, and `json_prompt.spatial_dynamics` make the JSON data self-contained without requiring users to paste the full schema object into image generators.
- The prompt contract starts from faithful observation, then activates only the constraints that help reconstruct the current image.
- `json_prompt.schema_version` is `reconstruction_v2` for new model output, while legacy JSON fields stay populated for compatibility.
- `json_prompt.global_fingerprint`, `json_prompt.observation_units`, `json_prompt.text_elements`, and `json_prompt.reconstruction_priorities` carry a dynamic reconstruction evidence layer without forcing image-type-specific templates.
- JSON structure fields may provide evidence, but high-priority visual facts must also be compiled into continuous natural language inside `json_prompt.generation_prompt`; they must not live only inside arrays.
- JSON negative guidance must not pass merely because it has many comma items. High-priority `avoid_drift`, `risk_if_missing`, visible text loss, motion loss, material drift, boundary drift, and depth/occlusion collapse must be compiled into `json_prompt.generation_negative_prompt`.
- Dynamic observation units use generic visual functions such as subject anchors, structural anchors, layout flow, boundary relationships, spatial zones, text locks, optical finish, material surface, camera geometry, color system, detail budget, drift blockers, and quality floor.
- Dense, panoramic, multi-region, text-labeled, diagram-like, collage-like, map-like, or layout-critical images compile their source-defining reconstruction skeleton into the first third of `en.prompt`: aspect/crop, main path shape, reading flow, zone boundaries, boundary clarity, adjacency, overlap, z-order, and density changes.
- Boundary clarity is preserved as observed. Crisp arcs, horizon cuts, guide lines, panel seams, contour edges, and silhouettes remain clear when source-defining; painterly, fogged, feathered, or occluded transitions stay soft when that is the source look.
- Local object enumeration must not crowd out global structure. High-density images use a detail budget so small objects remain secondary to the visible geometry and relationships that define the source.
- `en.prompt` length scales with reconstruction need and has no fixed word cap, so dense multi-region, text-heavy, multi-subject, or layout-critical images can preserve load-bearing structure instead of being squeezed into a generic short archetype.
- Recognizable people, fictional characters, source works, stories, scenes, landmarks, and visual-culture references are preserved as prompt anchors when the visible evidence supports them.
- Uncertain recognition uses phrasing such as `appears to be`, `resembles`, or `inspired by` instead of omitting the clue or inventing certainty.
- Real-person photos preserve visible face shape, facial proportions, skin tone and undertone, natural skin texture, hair texture, body proportions, pose, expression, and casual camera authenticity when relevant.
- Ethnic or ancestry presentation is not invented as verified identity, but may be described cautiously when strong visual evidence makes it useful for reconstruction, paired with concrete visible traits.
- Text-heavy posters, UI, screenshots, logos, ads, tickets, and documents preserve original language, script, layout, hierarchy, dates, numbers, and positions when legible. They must not translate or reorder visible text.
- Screenshot and UI inputs are described as screenshots or UI captures, preserving crop, layout, visible text language, overlay z-order, panels, and edge cuts while reconstructing a clean readable version by default. Thumbnail blur, accidental compression, and downsampled low resolution are not preserved unless they are clearly intentional visual style.
- The prompt contract prioritizes aspect ratio, crop, subject scale, subject count, relative placement, camera geometry, viewpoint, motion/focus, background anchors, lighting, material finish, texture, and medium.
- The prompt contract uses `style_index 0-100` as a plain-language stylization cue, not as a generator-specific parameter.
- `json_prompt.fidelity_priorities` uses plain-language `priority N of 100` reconstruction cues, not generator-specific weights or model parameters, and high-priority items are reflected in `en.prompt`.
- `json_prompt.reconstruction_priorities` may use numeric 0-100 priority values as plain JSON rankings. They are not generator weights, bracket syntax, Midjourney weights, or Stable Diffusion emphasis syntax.
- Professional camera, cinema, focal length, aperture, filter, film, and post-processing terms are optional reconstruction cues, not mandatory checklist items and not factual metadata unless visible.
- Material and texture locks must name surface behavior such as matte, satin, glossy, translucent, fabric weave, leather grain, painterly soft edge, or crisp vector edge when relevant.
- Color palettes use approximate standard HEX values plus color names and visual roles, not bare generic color names.
- `negative_prompt` is image-specific, normally 8-24 items, and blocks likely drift instead of stacking every generic defect. When source-defining geometry is curved, diagonal, irregular, organic, or continuous, it must block straightened boundaries, rectangular panel drift, uniform grids, equalized zones, and lost boundary lines.
- Real-person quality guidance preserves natural skin texture, visible skin tone, face/body proportions, hair texture, pose, and everyday camera authenticity while avoiding replacement, commercial retouching, and changed ethnic/ancestry presentation.
- Clean graphic, anime, product, or UI sources may still carry a concise clean-quality clause.
- Grain, mirror marks, bathroom glass spots, room clutter, wall cracks, paper fibers, brush texture, worn surfaces, film noise, pixel art, VHS/CRT artifacts, blur, distortion, or rough walls are preserved when they are source style or real environment detail. Thumbnail blur, accidental compression, and downsampled low resolution are still removed by default when accidental.
- `en.prompt` and `prompt_core` remain generator-neutral. They must not include Midjourney, Stable Diffusion, LoRA, or model parameter syntax.
- Simulated user cases preserve load-bearing visual anchors and include image-specific negative blockers.

## Commands

Run the prompt-specific goal gate:

```bash
npm run check:prompt-goal
```

Run the normal implementation gates:

```bash
npm run check:json-repair
npm run typecheck
npm run build
```

For a real model audit of nonlinear or organic structural drift on a local image:

```bash
ZHIJUAN_STRUCTURAL_IMAGE=/path/to/source.png npm run test:real-structure
```

To re-run the same structural checks against a prior real-model audit using the current parser and repair logic:

```bash
ZHIJUAN_STRUCTURAL_AUDIT_FILE=tmp/real-image-tests/audit.json npm run test:real-structure
```

For a real model audit that the JSON tab is copy-ready for generation:

```bash
ZHIJUAN_JSON_IMAGE=/path/to/source.png npm run test:real-json
```

To re-run the JSON readiness checks against a prior real-model audit using the current parser and repair logic:

```bash
ZHIJUAN_JSON_AUDIT_FILE=tmp/real-image-tests/audit.json npm run test:real-json
```

For release readiness, keep using the existing release flow after packaging:

```bash
npm run release:package
npm run release:check
```

## Human-Use Simulation

`scripts/check-prompt-goal.mjs` includes representative cases:

- `orbital_anime_energy`: a high-style anime energy scene where the prompt must preserve vertical crop, oblique aerial geometry, Earth background, subject placement, hair motion, clothing, style_index, matte material finish, and energy convergence.
- The anime case also checks that a recognizable character/work anchor such as `Tatsumaki / One Punch Man` can be preserved when supported by the image.
- `monochrome_studio_portrait`: a controlled studio portrait where the prompt must preserve monochrome crop, low seated pose, chair material, twin lamps, wall texture, boot perspective, and plausible lens/focus cue.
- `chinese_concert_poster`: a text-heavy poster where the prompt must preserve original Chinese text, logo, title placement, date/time, typography hierarchy, and prevent English translation.
- `sports_dashboard_screenshot_overlay`: a browser screenshot where the prompt must preserve crop, Chinese labels, Sofascore layout, and Zhijuan Prompt Card overlay, while reconstructing a clean readable version instead of preserving thumbnail blur or redesigning a different website.
- `high_density_panoramic_skeleton_regression`: a high-density panoramic reconstruction case where the prompt must preserve source-defining curved/irregular geometry, boundary clarity, adjacent region relationships, density changes, and layout drift blockers before small object enumeration.
- `ramen_floating_poster_json_generation_prompt`: a JSON generator-readiness case where a poster prompt must preserve lifted noodles, right-side chopsticks, suspended splashes, floating toppings, text hierarchy, bottom icon strip, and stamp placement inside JSON-local natural-language fields.
- `simple_centered_object_no_overconstraint`: a simple centered product-style object where the prompt must stay compact and avoid forcing dense layout, z-order, boundary, or reconstruction-skeleton language when it is not needed.
- `bathroom_mirror_selfie_real_people`: a real-person mirror selfie where the prompt must preserve two-person count, face/skin/hair/body traits, cautious ethnic/ancestry presentation, casual bathroom context, clothing, poses, clutter, and mirror marks.
- `casual_phone_photo_no_forced_cinema`: a phone snapshot where the prompt must avoid forced cinema-camera, ALEXA, IMAX, black mist, and luxury-editorial language in the positive prompt.

The simulation does not call external models. It validates the prompt output shape a human would copy into a generator:

- readable one-line `en.prompt`
- complexity-adaptive `en.prompt` length, with dense layout-critical cases allowed to expand as needed
- compressed `prompt_core`
- comma-separated `negative_prompt`
- visual anchors preserved
- recognizable identity/work/scene anchors preserved when supported
- style_index, medium, camera/lens cue, and material/texture locks preserved when relevant
- fidelity priorities preserved as plain-language 0-100 reconstruction priorities and compiled into the English prompt when they affect reconstruction
- dynamic reconstruction evidence preserved through `global_fingerprint`, `observation_units`, `text_elements`, and `reconstruction_priorities`
- JSON-local `generation_prompt`, `generation_negative_prompt`, and `spatial_dynamics` preserve the same load-bearing facts when a user copies the generator prompt from stored JSON data
- JSON-local negative prompt compiles high-priority drift blockers from the evidence layer instead of trusting item count alone
- source-defining reconstruction skeleton and boundary clarity compiled into early `en.prompt` only when they are load-bearing
- simple images remain compact and are not forced into dense multi-region analysis
- approximate HEX color palette, color names, and visual roles included in `json_prompt.colors`
- original visible text, language, typography hierarchy, dates, numbers, logo placement, screenshot crop, and overlay z-order preserved when relevant
- adaptive quality guidance present for the image type without erasing human appearance, intentional texture, or real environment details
- real-person drift blockers cover changed skin tone, different facial structure, altered body proportions, face replacement, and commercial retouching
- negative prompts stay image-specific and normally between 8 and 24 blockers
- drift blockers present
- optional real-image structural audit available for nonlinear, curved, organic, or continuous layouts where straightening/rectangular-panel drift is a known risk
- optional real-image JSON readiness audit available for checking that copied JSON preserves generation prompt, negative prompt, and spatial dynamics anchors
- no generator-specific syntax

## Review Checklist

Before accepting a prompt change:

- Compare the new rules against at least two visually different reference cases.
- Check whether the rules reduce generic beauty/poster drift.
- Check whether the rules preserve strong composition, camera geometry, material behavior, and motion.
- Check whether recognizable subjects, works, stories, places, or scenes are captured instead of flattened into generic descriptors.
- Check whether style_index and professional camera/cinema language are used only when useful and never forced onto casual phone photos.
- Check whether fidelity priorities resolve source conflicts such as soft optical atmosphere versus crisp commercial detail without adding generator-specific parameter syntax.
- Check whether real-person outputs preserve visible face shape, skin tone/undertone, natural skin texture, facial proportions, hair texture, body proportions, pose, clothing, and casual authenticity.
- Check whether cautious ethnic/ancestry presentation is included only when visually useful and paired with concrete traits, instead of being omitted or asserted as verified identity.
- Check whether material and texture rules prevent glossy/oily/over-sharpened drift in stylized and photographic images.
- Check whether text-heavy designs keep original text language, visible strings, title placement, dates, times, hierarchy, and logo placement.
- Check whether screenshots remain screenshots, preserving UI overlays, text language, layout, relative geometry, and crop while cleaning thumbnail blur/compression unless low fidelity is visibly intentional.
- Check whether high-density or layout-critical images preserve the visible reconstruction skeleton and boundary clarity before object enumeration.
- Check whether curved, diagonal, irregular, organic, or continuous source geometry gets matching negative blockers against straightened boundaries, rectangular panel drift, uniform grids, equalized zones, and lost boundary lines.
- Check whether simple images avoid unnecessary structural lock language, dense layout terms, or over-long prompts.
- Check whether the negative prompt names likely wrong outcomes for the image type without becoming a universal blocker dump.
- Check whether quality blockers preserve source texture and real environment details while blocking unintended excessive sharpening, color spots, noise, cracks, collapse, distortion, greasy texture, oily surface, and grainy artifacts.
- Check whether the change keeps local-first behavior and does not add network calls, telemetry, secrets, or provider lock-in.

## Goal Completion

The goal is complete when the code change, goal gate, normal build gates, and simulated human-use checks all pass, and the final status names the files changed plus the commands run.
