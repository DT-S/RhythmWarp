# Rhythm Warp

**Independent, offline-first rhythm training by Drum Track Studio.**

Rhythm Warp is a student edition derived from our separately maintained private metronome. The original project is not modified.

## Status

**Work in progress. Not yet approved for public distribution.** The functional app code, tests, icons and audio assets are staged in this development branch. UI/asset provenance and real-device regressions must be completed before an official student release.

The UI uses the Drum Track Studio dark-green palette and neon outlined controls. The musical engine, transport, microphone analysis, practice log and local storage are preserved from the source.

## Run locally

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080` on the same computer. For mobile installation and microphone permissions, use an HTTPS origin or the platform's relevant secure-context setup.

## Development

```sh
npm test
```

See [Designsystem](docs/DESIGN_SYSTEM.md), [Migration plan](docs/MIGRATION.md), and [public asset audit](docs/V2_ASSET_AUDIT.md).

**Licensing warning:** Bundled UI MP3 files remain in original filenames for backwards compatibility. Their public redistribution rights have not been verified. Do not treat the existing MIT software license as permission to redistribute third-party audio. Review/replace these files before release.
