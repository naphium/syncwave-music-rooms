# SyncWave Music Rooms

Act as a Principal Full-Stack Engineer and System Architect specializing in real-time WebRTC/WebSocket audio streaming. Build a complete, production-ready full-stack web application for zero-latency synchronized music playback.

### 1. Core Concept & Key Requirements
- **100% Free Music Search & Playback:** Users MUST be able to search and stream ANY music track for FREE without requiring paid subscriptions (e.g., Spotify Premium). Use free audio APIs (such as YouTube Data API v3 / Invidious / Piped API for audio extraction, YouTube IFrame API, YouTube Music stream wrappers, or Audius API).
- **Room Management:** Any user can instantly create a room with a custom Room Name and optional Password. Others can join via Room ID or direct shareable invite link.
- **Microsecond Clock-Synchronized Playback (Zero-Delay Twist):**
  - All room members MUST hear the exact same audio position in perfect sync with virtually zero delay (< 30ms drift across all devices).
  - Implement a client-server Network Time Protocol (NTP) algorithm to handle variable network ping and jitter.
  - Playback commands (Play, Pause, Seek) do not play immediately; they issue a synchronized timestamp: `Play at Server Timestamp T`. Devices calculate local offset and trigger Web Audio API / YouTube Player API at exact universal time `T`.
- **Audio Sources:**
  1. **Free Global Search Engine:** Unified search bar fetching full songs, official tracks, and covers via YouTube/YouTube Music APIs or Invidious/Piped endpoints.
  2. **Custom File Upload / Direct Link:** Support local MP3, WAV, AAC uploads or direct URL audio links (e.g., SoundCloud, raw audio CDN links).
- **Interactive Collaborative Queue:**
  - Real-time shared queue where any member can search, add songs, upvote next tracks, or reorder.
  - Auto-play next track in queue seamlessly for all room members.

### 2. Branding & Owner Attribution
- **Owner Credit:** Prominently display **Md. Nafim Muttaki** as the Creator and Platform Owner in the navigation bar and footer.
- **Support & Socials Section:** Dedicate a sleek UI card/footer for developer support with social links for Md. Nafim Muttaki:
  - Developer Portfolio: `https://nafim.vercel.app`
  - GitHub  - https://github.com/mdnafimmuttaki
  - Instagram - https://www.instagram.com/nafim.exe/
  - Facebook - https://www.facebook.com/naphium
  - Donate - https://buymeacoffee.com/mdnafimmuttaki
### 3. Architecture & Tech Stack
- **Frontend Framework:** Next.js (App Router, TypeScript), Tailwind CSS, Framer Motion, Lucide Icons.
- **Real-Time Communication:** Socket.io / WebSockets (or Supabase / Firebase Realtime Broadcast).
- **Audio Synchronization Engine:**
  - Custom Web Audio API / YouTube IFrame Player wrapper.
  - NTP Ping-Pong offset calculator: `Client Time Offset = ((Receive Time - Send Time) - Server Processing Time) / 2`.
  - Automatic drift corrector: If a client falls behind by > 50ms, slightly adjust playback rate (`playbackRate = 1.02`) or hard-seek to resync silently without popping audio.

### 4. UI/UX Design Specifications
- **Aesthetic:** Modern, high-tech dark theme (cyberpunk/glassmorphism vibe with dynamic neon accents matching album art colors).
- **Player Interface:** Large album artwork, interactive progress/seek bar, live audio spectrum visualizer (using Web Audio AnalyserNode).
- **Room Dashboard:**
  - Live member list with sync status indicators (e.g., 🟢 Synced [12ms offset], 🟡 Resyncing...).
  - Integrated chat box and quick reaction emojis (🎉, 🔥, ❤️, 🔊).
  - Responsive drawer for Queue and Music Search.

### 5. Implementation Roadmap
1. Generate Next.js project structure & WebSocket server event schemas (`room:join`, `sync:time`, `player:action`, `queue:update`).
2. Provide the NTP time-synchronization hook (`useClockSync`) and synchronized audio driver component.
3. Build the free music search route/API bridge utilizing YouTube Data / Invidious API.
4. Implement the responsive UI layout with Md. Nafim Muttaki's owner branding and social links.
make a page for site owner too to access and customize. complete it in 7credits

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/570b7a41-fc05-4c30-8e63-22783a187229).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
