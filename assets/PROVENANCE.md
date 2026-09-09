# ADV original pixel art and score resources

These original dungeon images and scores were created for TomTomYoung/adv with the user's requested AIPaint and AIMusic repositories. They are newly authored geometry and musical note arrangements, with no copied third-party game artwork, recorded audio, fonts, or samples.

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
