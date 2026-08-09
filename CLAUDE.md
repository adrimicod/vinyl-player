# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vinyl Player is a web-based music player with an animated turntable/vinyl record visualization. It's a pure frontend project using vanilla HTML5, CSS3, and JavaScript ES6+ with no build tools or frameworks.

The repo also hosts a second, independent app in `blackjack/` (pass-and-play blackjack for one phone). It shares the same constraints — vanilla, no build step, `file://` compatible — but no code with the vinyl player. See `blackjack/README.md`.

## Running the Application

Open `index.html` directly in a browser (works from `file://` protocol - no server required).
The blackjack app opens the same way from `blackjack/index.html`.

## Architecture

### JavaScript Classes (all in `js/app.js`)

The code is consolidated into a single file (not ES6 modules) for `file://` compatibility:

- **AudioPlayer**: Wraps HTML5 Audio API. Handles playback, seeking, volume. Uses callback pattern (`onPlay`, `onPause`, `onTimeUpdate`, etc.) for event communication.

- **TurntableUI**: Controls visual animations. Manages vinyl spinning (`spinning` CSS class), tonearm rotation (CSS transforms with angle interpolation), and power light states.

- **Playlist**: Manages track list. Handles file drop/selection via File API, creates blob URLs, extracts metadata. Uses `onTrackSelect` and `onPlaylistChange` callbacks.

- **VinylPlayerApp**: Main orchestrator. Wires up the three classes, connects DOM controls, handles keyboard shortcuts.

### CSS Structure

- `css/styles.css`: Layout, controls, color variables (CSS custom properties in `:root`)
- `css/turntable.css`: Turntable visual elements (base, platter, vinyl, tonearm positioning)
- `css/animations.css`: Keyframes for vinyl spin, tonearm movement, power light effects

### Key DOM IDs

- `vinyl`, `tonearm`, `powerLight` - Turntable elements
- `playBtn`, `stopBtn`, `prevBtn`, `nextBtn` - Playback controls
- `progressBar`, `volumeSlider` - Range inputs
- `dropZone`, `fileInput`, `playlistItems` - File loading and playlist

## Tonearm Animation

The tonearm pivots from the right (`transform-origin: right center`). Angles are configured in `TurntableUI`:
- `ARM_REST_ANGLE`: Position when not playing (away from record)
- `ARM_START_ANGLE`: Position at start of track (outer edge)
- `ARM_END_ANGLE`: Position at end of track (near center)

## Audio File Handling

Files are validated by MIME type (`audio/*`) or extension (`.mp3`, `.wav`, `.ogg`, `.flac`, `.aac`, `.m4a`, `.wma`, `.webm`). Blob URLs are created with `URL.createObjectURL()`.
