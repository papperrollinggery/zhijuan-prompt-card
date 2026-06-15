# Prompt Optimization Goal

This document defines the repeatable goal-mode loop for changing `src/shared/reversePrompt.ts`.

## Objective

Improve image-to-prompt reconstruction quality without changing the public `PromptAnalysis` schema or adding model/provider-specific syntax.

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
- `recreation_prompt` is treated as the primary generation prompt.
- Recognizable people, fictional characters, source works, stories, scenes, landmarks, and visual-culture references are preserved as prompt anchors when the visible evidence supports them.
- Uncertain recognition uses phrasing such as `appears to be`, `resembles`, or `inspired by` instead of omitting the clue or inventing certainty.
- Text-heavy posters, UI, screenshots, logos, ads, tickets, and documents preserve original language, script, layout, hierarchy, dates, numbers, and positions when legible. They must not translate or reorder visible text.
- Screenshot and UI inputs are described as screenshots or UI captures, preserving crop, layout, visible text language, overlay z-order, panels, and edge cuts while reconstructing a clean readable version by default. Thumbnail blur, accidental compression, and downsampled low resolution are not preserved unless they are clearly intentional visual style.
- The prompt contract prioritizes aspect ratio, crop, subject scale, subject count, relative placement, camera geometry, viewpoint, motion/focus, background anchors, lighting, material finish, texture, and medium.
- The prompt contract uses `style_index 0-100` as a plain-language stylization cue, not as a generator-specific parameter.
- Professional camera, cinema, focal length, aperture, filter, film, and post-processing terms are allowed as reconstruction cues, but not as factual metadata unless visible.
- Material and texture locks must name surface behavior such as matte, satin, glossy, translucent, fabric weave, leather grain, painterly soft edge, or crisp vector edge when relevant.
- Color palettes use approximate standard HEX values plus color names and visual roles, not bare generic color names.
- `negative_prompt` is image-specific and blocks likely drift, not just generic defects.
- Clean or smooth source images carry adaptive quality guidance: clean transparent image, complete natural materials, smooth uniform texture, clear main subject, distinct background layers, and no excessive sharpening, color spots, unwanted noise, cracks, collapse, or distortion.
- The clean/smooth quality clause is skipped or rewritten when grain, cracks, paper fibers, brush texture, worn surfaces, film noise, pixel art, VHS/CRT artifacts, blur, distortion, or rough walls are intentional source style. Thumbnail blur, accidental compression, and downsampled low resolution are still removed by default.
- `recreation_prompt` and `prompt_core` remain generator-neutral. They must not include Midjourney, Stable Diffusion, LoRA, or model parameter syntax.
- Simulated user cases preserve load-bearing visual anchors and include image-specific negative blockers.

## Commands

Run the prompt-specific goal gate:

```bash
npm run check:prompt-goal
```

Run the normal implementation gates:

```bash
npm run typecheck
npm run build
```

For release readiness, keep using the existing release flow after packaging:

```bash
npm run release:package
npm run release:check
```

## Human-Use Simulation

`scripts/check-prompt-goal.mjs` includes two representative cases:

- `orbital_anime_energy`: a high-style anime energy scene where the prompt must preserve vertical crop, oblique aerial geometry, Earth background, subject placement, hair motion, clothing, style_index, matte material finish, and energy convergence.
- The anime case also checks that a recognizable character/work anchor such as `Tatsumaki / One Punch Man` can be preserved when supported by the image.
- `monochrome_studio_portrait`: a controlled studio portrait where the prompt must preserve monochrome crop, low seated pose, chair material, twin lamps, wall texture, boot perspective, and plausible lens/focus cue.
- `chinese_concert_poster`: a text-heavy poster where the prompt must preserve original Chinese text, logo, title placement, date/time, typography hierarchy, and prevent English translation.
- `sports_dashboard_screenshot_overlay`: a browser screenshot where the prompt must preserve crop, Chinese labels, Sofascore layout, and Zhijuan Prompt Card overlay, while reconstructing a clean readable version instead of preserving thumbnail blur or redesigning a different website.

The simulation does not call external models. It validates the prompt output shape a human would copy into a generator:

- readable one-line `recreation_prompt`
- compressed `prompt_core`
- comma-separated `negative_prompt`
- visual anchors preserved
- recognizable identity/work/scene anchors preserved when supported
- style_index, medium, camera/lens cue, and material/texture locks preserved when relevant
- approximate HEX color palette, color names, and visual roles included in `json_prompt.colors`
- original visible text, language, typography hierarchy, dates, numbers, logo placement, screenshot crop, and overlay z-order preserved when relevant
- adaptive quality guidance present for clean/smooth sources and skipped or rewritten for intentional texture/noise styles
- drift blockers present
- no generator-specific syntax

## Review Checklist

Before accepting a prompt change:

- Compare the new rules against at least two visually different reference cases.
- Check whether the rules reduce generic beauty/poster drift.
- Check whether the rules preserve strong composition, camera geometry, material behavior, and motion.
- Check whether recognizable subjects, works, stories, places, or scenes are captured instead of flattened into generic descriptors.
- Check whether style_index and professional camera/cinema language are used as reconstruction cues without claiming unproven metadata.
- Check whether material and texture rules prevent glossy/oily/over-sharpened drift in stylized and photographic images.
- Check whether text-heavy designs keep original text language, visible strings, title placement, dates, times, hierarchy, and logo placement.
- Check whether screenshots remain screenshots, preserving UI overlays, text language, layout, relative geometry, and crop while cleaning thumbnail blur/compression unless low fidelity is visibly intentional.
- Check whether the negative prompt names likely wrong outcomes for the image type.
- Check whether quality blockers cover excessive sharpening, color spots, noise, cracks, collapse, distortion, greasy texture, oily surface, and grainy artifacts.
- Check whether the change keeps local-first behavior and does not add network calls, telemetry, secrets, or provider lock-in.

## Goal Completion

The goal is complete when the code change, goal gate, normal build gates, and simulated human-use checks all pass, and the final status names the files changed plus the commands run.
