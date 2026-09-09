# ADV art and score resources

The original 1.0 dungeon pixel images and scores were created for TomTomYoung/adv with the user's requested AIPaint and AIMusic repositories. They are newly authored geometry and musical note arrangements, with no copied third-party game artwork, recorded audio, fonts, or samples.

## Actual engine use

- **AIPaint**: `PaintCore` imported without modification from `TomTomYoung/AIPaint/src/core.js`. Every visual is drawn through its `layer.add`, `shape.rect`, `shape.ellipse`, and `shape.line` commands and composited using `PaintCore.composite()`. The generator's small PNG encoder only encodes those returned RGBA bytes; it does not draw. Native editable `.paint.json` files come directly from `PaintCore.exportProject()`. `.paint.commands.json` retains the exact batches used.
- **AIMusic**: original notes are added through `MusicCore.applyBatch()`. Editable `.music.json` comes from `getProject()`. WAV is produced by the repository's `renderPCM(project, {sampleRate: 22050, mode: 'loop'})` and `encodeWAV()`. MIDI uses its `encodeMIDI()`. OGG files are small browser playback derivatives of those WAV files, encoded by FFmpeg/libvorbis.

## Pinned source

| Repository | Commit | Used source | Git blob SHA |
|---|---|---|---|
| TomTomYoung/AIPaint | be94fc261c1ce926a5d63bf0720feb4b6bb2fd0d | src/core.js | fa403774d1da0500d4c5af4927c465f242f65e12 |
| TomTomYoung/AIMusic | 399fe1351368755f116512a459c95ecf555c5cba | src/core.mjs | 39937c3c3d299f1915e3997418d582815239c157 |
| TomTomYoung/AIMusic | 399fe1351368755f116512a459c95ecf555c5cba | src/audio.mjs | eb91880744510179fe649135e1d39b4d4cb55af2 |

Sources were fetched through the GitHub connector. Local snapshots' `git hash-object` values match the source blob SHAs above. No LICENSE file was present in either repository tree when retrieved; no broader third-party license is asserted here. The requested repositories and destination share the TomTomYoung owner. Source snapshots retain their existing comments.

## Reproduce

With Node.js 22 or newer, run `node tools/assets/generate.mjs` from the repository root. Generated originals are written to the ignored `tools/assets/generated/` directory. It imports the unmodified source snapshots under `vendor/`, writes the six PNGs and native AIPaint projects, and renders the two AIMusic scores/WAV/MIDI/report files. All random-looking artwork texture uses a fixed seed.

For optional browser compression, run:

```sh
ffmpeg -y -i tools/assets/generated/exploration.wav -c:a libvorbis -q:a 2 assets/audio/exploration.ogg
ffmpeg -y -i tools/assets/generated/battle.wav -c:a libvorbis -q:a 2 assets/audio/battle.ogg
```

The game uses actual PNGs in `assets/images/` and OGGs in `assets/audio/`. Editable AIMusic originals and AIPaint command batches are in `assets/source/`. `assets/source/paint-projects.zip` contains all six native `.paint.json` files; extract one and load it in AIPaint. `assets/manifest.json` records shipped artifact hashes. PNG monsters preserve transparency.

## Inventory and validation

- `dungeon-corridor.png`: 320 × 180, dark teal stone, amber torchlight, distant barred portal, 8,349 bytes.
- `slime.png`: 96 × 96, 683 bytes.
- `skeleton.png`, `wraith.png`, `construct.png`: 96 × 112, 1,239 / 1,371 / 1,307 bytes.
- `dragon.png`: 128 × 128, 2,316 bytes.
- `exploration`: “Under the Amber Vault”, 8 bars, 84 BPM, 22.857 seconds, four tracks, 80 notes.
- `battle`: “The Gatekeeper Wakes”, 8 bars, 144 BPM, 13.333 seconds, six tracks, 304 notes.

All six PNGs were visually inspected. Both synth renders passed AIMusic's score validation, yielded finite non-silent stereo PCM, required no limiter attenuation, and had loop boundary jumps around 0.0001. All artifact SHA-256 hashes are in `manifest.json`. Browser playback and subjective audio listening were not performed in this asset task. An initial final pluck note exceeded the score boundary by 0.1 beat; the duration was shortened and both final renders passed.

## 1.1.0 character expansion (2026-09-09)

Twenty new monster images and ten companion portraits were generated individually with the built-in image generator. The user explicitly requested newly drawn visuals. The Japanese specifications and full English/Japanese prompts are in `assets/source/entity-art-prompts.json`. These new illustrations are not AIPaint command drawings; the original six pixel images still use the AIPaint pipeline above.

Monster concepts reference the user's [Notion RPG entity model](https://app.notion.com/p/RPG-3d6c3c1966b380489592dbeafc72b9dd) and its monster collection. The two concepts, world adaptations and numeric plans were committed in `doc/MONSTER_CATALOG.md`, `doc/BALANCE_PLAN.md` and `doc/COMPANION_CATALOG.md` before image generation and code implementation. The exact generated pixels are not deterministic; prompts retain the regeneration brief.

Images use transparent backgrounds at 1254×1254. They were visually inspected and decoded to check real alpha. Delivery uses same-size WebP encoding (FFmpeg/libwebp, quality 85, compression level 6); no cropping, repainting, alpha removal or resizing was applied. The output has fine painterly texture rather than a literal 2–3-tone cel palette. Native-resolution generation fringes, if present, are recorded in the prompt manifest.

## 1.1.0 playback volume

The AIMusic arrangements are unchanged. New playback derivatives increase exploration by 16 dB and battle by 13 dB, with browser default volume raised from 25% to 50%; a previously saved volume remains unchanged. Original OGGs and editable music JSON are retained.

```sh
ffmpeg -y -i assets/audio/exploration.ogg -af volume=16dB -c:a libvorbis -q:a 3 assets/audio/exploration-v2.ogg
ffmpeg -y -i assets/audio/battle.ogg -af volume=13dB -c:a libvorbis -q:a 3 assets/audio/battle-v2.ogg
```

| File | Decoded mean | Decoded peak | Duration |
| --- | --- | --- | --- |
| exploration.ogg | -33.4 dBFS | -20.7 dBFS | 22.857 s |
| exploration-v2.ogg | -17.4 dBFS | -4.8 dBFS | 22.857 s |
| battle.ogg | -30.2 dBFS | -18.4 dBFS | 13.333 s |
| battle-v2.ogg | -17.1 dBFS | -4.7 dBFS | 13.333 s |

FFmpeg decoding and volumedetect confirm non-silent stereo audio with no clipped peaks. Mocked audio-adapter tests cover autoplay rejection/retry, stale promises during track changes, disabled/muted states, and one playback per effect revision. Actual browser/speaker listening and browser loop transitions have not been tested. The game starts with sound off and exposes the actual playback state on the sound button.

## 1.2.0 SE and effect animation (2026-09-09)

The same pinned AIMusic engine generated 28 original sound effects from the note recipes in `authoring/presentation.json`. Each editable project is shipped in `assets/source/se/`. The actual synth output is trimmed to the last note plus its instrument release and 15ms padding, faded over 5ms at each end, normalized to a peak of 0.55, and encoded using FFmpeg/libvorbis quality 4. No recorded samples were used. Decoded OGG duration, peak, RMS and SHA-256 are in `assets/source/effects-report.json`.

The same pinned AIPaint PaintCore drew eight abstract pixel effect sheets, each with eight 128×128 RGBA frames. The sheets are 1024×128. Every pixel comes from AIPaint ellipse/line commands; the small PNG encoder only serializes PaintCore.composite() output. Commands with revisions are retained in `assets/source/effects/`. `node tools/assets/generate-effects.mjs` deterministically recreates both the SE and sheets. No new character illustrations or image-generation calls are involved in this expansion.

All 28 OGG files were decoded with finite, non-silent, unclipped PCM. All 8 PNGs were decoded and checked for transparency and 64 distinct nonempty frames. The first lightning draft reused some frames with equal opacity; the geometry was adjusted across frames and the final eight frames are distinct. Selected sheets were visually inspected. Browser animation, real-device listening, precise audiovisual alignment and reduced-motion integration have not been exercised in a browser.
