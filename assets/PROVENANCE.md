2026-09-14：ダンジョン用の壁面・装置アトラス2枚を組み込みImageGenで各1回生成しました。1254×1254の生成画像を寸法・構図を保持してWebPへ変換しています。英語プロンプトと日本語訳は assets/source/dungeons/imagegen-prompts.json、生成元PNGと採用WebPのハッシュは同ディレクトリの imagegen-manifest.json を参照してください。既存の素材を保持しています。

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

The same pinned AIMusic engine generated 28 original sound effects from the note recipes in `config/presentation.json`. Each editable project is shipped in `assets/source/se/`. The actual synth output is trimmed to the last note plus its instrument release and 15ms padding, faded over 5ms at each end, normalized to a peak of 0.55, and encoded using FFmpeg/libvorbis quality 4. No recorded samples were used. Decoded OGG duration, peak, RMS and SHA-256 are in `assets/source/effects-report.json`.

The same pinned AIPaint PaintCore drew eight abstract pixel effect sheets, each with eight 128×128 RGBA frames. The sheets are 1024×128. Every pixel comes from AIPaint ellipse/line commands; the small PNG encoder only serializes PaintCore.composite() output. Commands with revisions are retained in `assets/source/effects/`. `node tools/assets/generate-effects.mjs` deterministically recreates both the SE and sheets. No new character illustrations or image-generation calls are involved in this expansion.

All 28 OGG files were decoded with finite, non-silent, unclipped PCM. All 8 PNGs were decoded and checked for transparency and 64 distinct nonempty frames. The first lightning draft reused some frames with equal opacity; the geometry was adjusted across frames and the final eight frames are distinct. Selected sheets were visually inspected. Browser animation, real-device listening, precise audiovisual alignment and reduced-motion integration have not been exercised in a browser.

## 1.4.0: q001–q010 NPC portraits (2026-09-13)

36 original 112×128 transparent pixel portraits were drawn with the pinned AIPaint PaintCore above. Each portrait has three layers: silhouette, face, and workwear. Face shape, hair, age lines, work clothes and props distinguish the authored roles; groups use a representative composition. These are new art-direction choices, not assertions inferred from the old scenario text.

Run `node tools/assets/generate-characters.mjs`. All drawing uses AIPaint shape commands. The PNG encoder only serializes the returned composite. `assets/images/characters/` contains the shipped PNGs and review sheet. `assets/source/characters/` contains all native `.paint.json` projects, exact `.commands.json` batches and a SHA-256 manifest including the renderer source hash. Each native project can be opened directly in AIPaint.

The automated check reopens all 36 native projects with PaintCore.fromProject, replays every command batch, and compares both composites with the decoded shipped PNG pixels. The review sheet uses the same composites, copied as horizontal AIPaint line runs. Existing illustration and audio provenance above remains unchanged.


## 2026-09-14: Illustrated quest NPC portraits

The user requested image-generated replacements for the 36 AIPaint NPC portraits, with the existing files retained. Each new portrait was created in an individual built-in `image_gen` call. Complete English and Japanese prompts are retained in `assets/source/characters/imagegen-prompts.json`.

Runtime images are in `assets/images/characters/generated/<id>.webp`. The artwork carries forward each authored role, hairstyle, clothing palette and principal prop. Finer age, face, gender and representative group designs are new art direction, rather than facts established by the scenario prose. `nearpeople` depicts exactly three residents and `deeppeople` exactly two. Other group portraits are representative compositions and do not establish story headcounts.

The selected illustrations use muted teal backgrounds, warm light, readable faces and detailed work clothing. ImageMagick only resized the generated artwork proportionally to fit 896×1024 and encoded WebP at quality 90. It did not draw, retouch, recolor or remove backgrounds. `assets/source/characters/imagegen-manifest.json` records source PNG hashes, shipped WebP hashes, dimensions and sizes; `assets/manifest.json` also lists the shipped files.

`data/assets.json` retains all `npc_<id>` keys and points them to the new images. `tools/build-stories-v11.mjs` writes those same paths and documentation links on regeneration. The view displays 168px-wide portraits on desktop and 112px on small screens, using normal image interpolation. Story logic, NPC identity, cast visibility and saved progress are unchanged.

All previous character PNGs, the original contact sheet, AIPaint native projects, command streams and their original manifest remain in their original locations. `npm run build:characters` still reconstructs the old AIPaint set and keeps runtime references on the new illustrated set. For a deliberate rollback, change both the data mapping and builder mapping to `assets/images/characters/<id>.png`.

Validation: all 36 shipped WebP files decode successfully (896px wide, 1022–1024px tall; 2,664,504 bytes total). Alias coverage, file existence and SHA-256 checks pass. The original PNGs, editable sources, commands and existing asset manifest entries are byte-for-byte unchanged. Regeneration in an isolated checkout preserves the new references and both image links in the character catalog. `npm run check` passes data validation, static checks and all 357 tests, including the existing AIPaint reproduction tests. Each generated image was visually reviewed. The available browser blocked the local preview URL with `net::ERR_BLOCKED_BY_CLIENT`, so in-browser layout validation remains unverified.

## 1.10.0: Shared town backgrounds and character sprites (2026-09-16)

Seven 1536×1024 backgrounds were generated individually with the built-in OpenAI image_gen tool for the square, provision shop, inn, guild, medical school, specimen room and insurance office. Three 1173×1341 transparent character sprites were generated by editing the existing curator, porter and examiner portraits, preserving their established designs. Original portraits remain unchanged.

Shipped files are assets/images/locations/<id>.webp and assets/images/characters/sprites/<id>.webp. Pillow only encoded the generated pixels as WebP at quality 90 with alpha preserved; it did not resize, paint or remove backgrounds. Original generated PNG files were retained. English and Japanese prompts, source PNG hashes, reference portrait paths, output dimensions and WebP hashes are in [the world-location manifest](source/world-locations/manifest.json). All ten outputs are also registered in assets/manifest.json and data/assets.json.

Each generated asset was visually reviewed. The three source sprites have real alpha ranging from 0 to 255; all outputs decode and match their registered hashes. Browser access to the local preview was rejected with net::ERR_BLOCKED_BY_CLIENT, so composition in the running UI, mobile layouts and audio remain unverified.
