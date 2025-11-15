ROSHAN BEATS — Advanced Offline Local Music Player App

Type: Single-file HTML + CSS + JavaScript
Platform: Mobile-first Web App (Offline, no backend, no API)
Goal: Create a modern, powerful, premium-quality offline music player using local audio files stored on the device.


---

1. Product Overview

1.1 Purpose

Build a premium offline music player that allows users to:

Import and play local audio files (MP3, WAV, AAC, OGG)

Experience a modern, stylish, neon-glow UI

Organize and manage music offline

Enjoy advanced playback features (seek, loop, shuffle, playlists)

Use a fully responsive UI with smooth animations


1.2 Target Users

Users who want a simple but beautiful offline music player

Designers/creators who need a modern UI demo

People with downloaded songs on their device

Users avoiding cloud requirements or tracking


1.3 Positioning

A premium-looking fully offline app with aesthetic inspired by:

Spotify dark mode

Apple Music glassmorphism

NFT neon gradients


This app works completely offline, in a single HTML file, with:

No backend

No external libraries (optional animations allowed)

No tracking



---

2. Key Features

2.1 Core Features

✔ Local File Import

Users can:

Select audio files from device storage (via <input type="file" multiple accept="audio/*">)

Load metadata: title, artist, duration, cover (if embedded)

Store list in localStorage


✔ High-Quality Music Playback

The player includes:

Play / pause

Next / previous

Seek bar

Volume control

Mute button

Loop one / Loop all

Shuffle

Background playback (browser-permitting)


✔ Modern Player UI

Central album-art with glow effect

Spectrum visualizer

Neon gradient buttons

Fluid animations

AMOLED dark theme

Fullscreen player mode


✔ Playlists

Users can:

Create playlists

Add/remove songs

Save playlists locally

Rename playlists


✔ Mini Player

A small bar at bottom:

Shows current track

Has play/pause + next button

Click to open full player


✔ Metadata Extraction

If available inside the audio file:

Title

Artist

Album

Duration

Embedded cover art


If not available, the app:

Generates a dynamic gradient cover



---

3. Advanced Features

✔ Audio Visualizations

Waveform bar visualizer

Circular pulsating visualizer

Neon spectrum visualizer


All offline via Web Audio API.

✔ Equalizer

Preset EQ modes:

Normal

Bass Boost

Pop

Rock

Jazz

Classical


(Offline EQ using BiquadFilterNode)

✔ Smart Animations

Blur backgrounds based on album art

Smooth transitions between screens

Tap feedback animations


✔ Theme Options

Provide two premium modes:

Neon Purple NFT Mode (matches your provided UI style)

Glassmorphic Ice Mode (blurry iOS feel)


✔ Offline Storage

Use localStorage to save:

Songs list (file URLs)

Custom metadata

User settings

EQ presets

Playlists



---

4. User Flow

4.1 First-time Experience

1. User opens the app → sees welcome screen


2. "Import Music" button → opens file selector


3. App scans selected audio files


4. User lands on Home screen with imported songs



4.2 Home Screen

Search bar

Filter bar: Songs | Albums | Artists | Playlists

Scrollable list with mini covers

Floating action button (FAB): “Import More Songs”


4.3 Now Playing Screen

Large glowing album art

Title, artist

Seek bar

Playback controls (play/pause, next, previous, loop, shuffle)

Visualization area

EQ button

Playlist queue pulled up from bottom


4.4 Playlists

1. Create playlist


2. Add songs


3. Rearrange songs


4. Delete playlist




---

5. UI Requirements

5.1 Style

Modern Premium Style Includes:

Dark AMOLED background (#050505 → #111111)

Gradient neon accents (purple-blue)

Rounded cards

Blurred glass elements

Soft glowing shadows

Smooth transitions (300–600ms easing)

Consistent iconography


5.2 Screens

1. Splash Screen

Logo center

Neon glow animation


2. Home Screen

Search bar

Category tabs

Song cards with:

Cover

Title

Artist

Duration



3. Mini Player

Sticky bottom

Shows current track

On tap → opens full player


4. Player Screen

Fullscreen

Animated album art

Visualizer

Gradient background synced to cover colors

EQ pop-up

Queue list


5. Playlist Screen

List of user playlists

"+" create playlist

List behaviors (rename, delete)


6. Settings

Theme: Neon / Glass / AMOLED

Clear data

Import more songs



---

6. Technical Requirements

6.1 Architecture

Everything inside a single .html file:

Inline <style> (CSS)

Inline <script> (JS)

No external icons/fonts

Optional embedded SVG icons

Pure client-side logic

Web Audio API for playback & visualizer

Synchronize UI to audio events


6.2 Storage

Use localStorage and indexedDB:

Song metadata (indexedDB recommended due to large size)

Playlist definitions

User preferences


6.3 File Handling

Use URL.createObjectURL() for local playback

Store only metadata, not audio files


6.4 Performance Constraints

UI should maintain 60 FPS

Preload visualizer nodes

Use GPU-accelerated CSS transforms

Lazy-load album art thumbnails



---

7. Non-Functional Requirements

Performance

Load time < 2 seconds

Smooth transitions

Memory optimized


Security

No external network calls

No data upload

All user files remain offline


Accessibility

Large touch targets

Light/Dark themes

ARIA labels

Keyboard controls (for desktop)



---

8. Out-of-Scope

Streaming music

Cloud sync

Server-side library

Real-time lyrics fetching

Online metadata search



---

9. Future Enhancements

Lyrics import (local .lrc files)

Background blur based on album cover

Gesture controls (swipe to skip track)

Song trimming/editing

PWA installable version
