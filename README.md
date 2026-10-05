# Entangled Love

*An observational quantum indie game across distance and correlation*

**Entangled Love** is a static indie web game portraying two long-distance lovers separated by 9,560 km: **Leo** in London and **Mia** in Tokyo. Each partner has a window looking into their flat at night. Under the hood, both windows are halves of one computational-basis measurement of a 6-qubit graph state prepared by the **Moth Atlas graph-v1** quantum engine (or local quantum simulation mode).

The player peeks into either room by toggling light switches, tracks the lovers' nocturnal habits as evenings pass, marks deductions with tactile pencil ticks and crosses in an investigator's field logbook, and seals their observations when confident to reveal their quantum deduction score and how many days it took.

---

## Game Features & Art Direction

- **Two Distant Realities Separated by a Quantum Rift**:
  - **Left (London, UK)**: Weathered Victorian brickwork, vintage English street sign (`FLEET ST • EC4`), drifting London rain streaks, dark chimneys, glowing cast-iron streetlamp, and **Leo's flat** (knitted jumper, vintage books, acoustic guitar, telescope, watering plants, CRT gaming, cast iron stew).
  - **Right (Tokyo, Japan)**: Sleek modern architecture, Japanese street sign (`桜通り 2-4`), drifting cherry blossom petals, glowing izakaya lantern, skyline towers, and **Mia's flat** (pastel pink bedding, cat-ear headphones, fairy lights, pet calico cat, indoor bonsai garden, rose-gold telescope, manga, ramen).
  - **Center**: A vibrant quantum dimensional tear with procedural lightning sparks and distance emblem (`⟵ 9,560 KM APART ⟶`).
- **Tactile Light Switch Mechanic**: Rooms start dark with nocturnal streetlamp/lantern reflections and faint window silhouettes. Turning on a light switch illuminates the interior and triggers that room's ambient audio loop.
- **Diegetic Field Notebook**:
  - Styled as an authentic investigator's journal with lined parchment paper, spiral binder rings, and red margin rule.
  - Dynamically draws 8 intuitive qualitative statements (4 True, 4 False) from a diverse 20-statement candidate roster based on the current quantum state, addressing realistic hardware fidelity with phrases like *"almost always"* and *"almost never"*.
  - Tactile pencil checkboxes: mark observations with **`[✓]` True** and **`[✗]` False** (with authentic pencil scratch audio).
  - Seal button stamps deductions with green/red rubber seals (`[VERIFIED]` / `[REFUTED]`) and ink margin annotations.
- **No Day Limit (Player-Paced Deduction)**:
  - Advance evenings at your own pace (`Day 1, 2, 3...`).
  - Submit whenever you feel confident in your observations.
  - Final results celebrate your score and display the exact number of days you took to decode the quantum state!
- **Smooth Day Transitions**: Advancing an evening triggers a time-lapse celestial transit with shifting sky gradients and a chime.

---

## Controls & Keybindings

- **`Z`** (or Click Left Window): Toggle light in **Leo's Flat (London)**
- **`X`** (or Click Right Window): Toggle light in **Mia's Flat (Tokyo)**
- **`C`**: Toggle **both lights** simultaneously
- **`N`**: Advance to the **Next Evening** (triggers time-lapse celestial transition)
- **`⚙️ Settings`**: Open Quantum Engine configuration modal (Atlas API token, base URL, simulator toggle)
- **`🔊 Audio`**: Toggle sound effects and ambient room loops
- **`❓ About / Guide`**: Open the About & Rules modal with complete game rules and quantum entanglement explanation

---

## The Measurement Rule

> **Both windows are halves of one computational-basis measurement of a 6-qubit graph state.**
> **Turning on either light reveals that evening's state, and advancing the day takes the next measured shot from the batch without querying the API.**

Opening order does not matter: looking at Leo's window then Mia's window is the exact same evening as peeking at both simultaneously.

---

## The Quantum Model

6 qubits:
- **Leo (London)**: Qubits `0`, `1`, `2` ($2^3 = 8$ nocturnal activities)
- **Mia (Tokyo)**: Qubits `3`, `4`, `5` ($2^3 = 8$ nocturnal activities)

Activity bit encoding:
- `000` (0): `in bed`
- `001` (1): `thinking`
- `010` (2): `reading`
- `011` (3): `listening to music`
- `100` (4): `playing a game`
- `101` (5): `cooking`
- `110` (6): `watering plants`
- `111` (7): `stargazing`

### 24 Hidden Quantum State Archetypes & Dynamic Question Roster
- The game includes a catalogue of 24 distinct bipartite quantum state archetypes with unique entanglement mappings between the 8 nocturnal activities.
- Real quantum hardware fidelity (~94% correlation fidelity, 6% readout noise) is modeled directly into the shots.
- Questions in the Field Notebook are formulated directly between individual activities using realistic quantum terminology (*"almost always"*, *"almost never"*) and sampled dynamically for high replayability!

---

## Quick Start & Running Locally

Because this is a pure static web app without complex build tooling or bundlers, you can serve it with any local HTTP server:

### Option 1: Python 3 (Recommended)
```bash
python3 -m http.server 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

### Option 2: Node / npx
```bash
npx serve .
```

---

## Playing Modes & Atlas API Key Setup

### 1. Offline / Local Quantum Simulator Mode (Recommended: Zero Setup, Zero Cost)
- Runs an exact client-side model of the 6-qubit graph state with hidden seeds and realistic hardware noise.
- Generates 1,024 shots with the identical probability distribution.
- Consumes 0 API credits and works 100% offline without CORS or proxies.

### 2. Live Moth Atlas graph-v1 Engine Mode
- Click the **⚙️ Settings** icon in the top HUD and paste your Moth Atlas API token.
- **Security & Privacy**: The key is stored **strictly in your browser's `sessionStorage`**. It is never committed to Git, written to disk, sent to any third-party server, or saved in cookies.
- **Credit Cost**: Exactly **5 credits** per batch (1 job with 1,024 shots). The app **never** calls the API on window switch or evening advance.
- Cached shots are stored in `sessionStorage` so refreshing the tab does not spend more credits.

---

## Browser CORS & Local Proxy

When querying `https://api.mothquantum.com` directly from browser JavaScript, browsers enforce Cross-Origin Resource Sharing (CORS) rules.

If connecting to Moth Atlas from `localhost`:

### A. Python Proxy (Included: `proxy.py`)
```bash
python3 proxy.py
```
Runs at `http://localhost:8787`. In Settings, click **"Use Local Proxy (localhost:8787)"**.

### B. Node Proxy (Included: `proxy.js`)
```bash
node proxy.js
```

### C. Vercel Deployment
A zero-config Edge Proxy is included at [`api/[...path].js`](file:///Users/kaustav/Documents/Projects/Hackathons/MothHack/api/[...path].js) and [`vercel.json`](file:///Users/kaustav/Documents/Projects/Hackathons/MothHack/vercel.json). When deployed to Vercel, requests to `/api/v1/*` are automatically proxied on the same origin with zero CORS friction.

---

## Publishing to GitHub Pages

1. Commit and push your code to your GitHub repository:
   ```bash
   git add .
   git commit -m "Launch Entangled Love indie game"
   git push origin main
   ```
2. In your repository on GitHub, navigate to **Settings** > **Pages**.
3. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: `main` / folder: `/ (root)`
4. Click **Save**. Your site will be live at `https://<username>.github.io/<repo-name>/`.
5. On GitHub Pages, players can immediately play in **Local Quantum Simulator Mode** with zero setup, or input their own Moth Atlas key via the Settings modal.

---

## Sound Credits

All audio assets are documented in [`CREDITS.md`](file:///Users/kaustav/Documents/Projects/Hackathons/MothHack/CREDITS.md) and licensed under the **Creative Commons CC0 1.0 Universal Public Domain Dedication**:
- `assets/audio/switch_click.wav`: Tactile light switch toggle
- `assets/audio/pencil_check.wav`: Pencil graphite checkmark scribble on paper
- `assets/audio/curtain_swipe.wav`: Fabric/curtain movement
- `assets/audio/bed_tone.wav`: Ambient nocturnal drone (rest)
- `assets/audio/thinking_loop.wav`: Gentle harmonic shimmer (thinking)
- `assets/audio/game_clicks.wav`: Controller clicks & retro sound effects (gaming)
- `assets/audio/simmer_loop.wav`: Soft kitchen stove sizzle (cooking)

Full WebAudio synthesizer fallbacks are included so sound functions seamlessly even if audio files are blocked.

---

## License

MIT License. Crafted for the Moth Quantum Hackathon.
