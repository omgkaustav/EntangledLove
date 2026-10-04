# Entangled Love

*An observational quantum piece on distance and correlation*

**Entangled Love** is a static web experience. Two long-distance partners each have a window looking into their room at night. Under the hood, both windows are halves of one computational-basis measurement of a 4-qubit graph state prepared by the **Moth Atlas graph-v1** engine.

The player peeks through closed velvet curtains, refreshes the evening to observe subsequent shots from the batch, notices who does what when the other is doing something, and submits field observation notes (True/False statements) scored directly against the empirical quantum histogram.

---

## The Measurement Rule

> **Both windows represent halves of one computational-basis measurement of a 4-qubit graph state.**
> **Opening either window reveals that evening's state, and refreshing advances to the next measured shot from the batch without querying the API.**

Opening order does not matter: looking at Window A then Window B is the exact same evening as looking at both at once.

---

## The Quantum Model

- **Qubits 0 & 1**: Person A (Left Window)
- **Qubits 2 & 3**: Person B (Right Window)
- **Activity Mapping**:
  - `00`: Resting in bed (bedside lamp, duvet)
  - `01`: Thinking of the other (window sill, chin on hand)
  - `10`: Playing a game (glowing handheld screen, focused silhouette)
  - `11`: Cooking (stove burner, rising steam curls)
- **Coupling in Chapter 1**: Qubits $(0, 2)$ are strongly coupled with target correlation $\sim 0.85$, while qubits $(1, 3)$ remain uncoupled:
  - If Person A is in bed or thinking (bit 0 = 0), Person B is usually in bed or thinking (bit 2 = 0) $\sim 85\%$ of the time.
  - If Person A is playing or cooking (bit 0 = 1), Person B is usually playing or cooking (bit 2 = 1) $\sim 85\%$ of the time.
  - "Both thinking" occurs commonly ($\sim 43\%$ of the time), but is not certain because qubit 1 and 3 are independent coin flips.
  - Ground truth is computed empirically from the batch of 1024 shots.

---

## Quick Start & Running Locally

Because this is a pure static web app without complex build tooling or bundlers, you can serve it with any local HTTP server:

### Option 1: Python 3 (Recommended)
```bash
python3 -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000) in your browser.

### Option 2: Node / npx
```bash
npx serve .
```
Then open the local URL provided by `serve` (e.g. `http://localhost:3000`).

---

## Playing Modes & Atlas API Key Setup

On the title screen, you can choose between two modes:

### 1. Offline / Local Quantum Simulator Mode (No API Key or Credits Needed)
- Click **"Play in Local Simulator Mode"**.
- Runs an exact offline model of the 4-qubit graph state with seed 7 and target correlation 0.85.
- Zero API credits consumed; works 100% offline without any network access or proxy setup.

### 2. Live Moth Atlas graph-v1 Engine Mode
- Paste your Moth Atlas API Key into the password field on the title screen.
- **Security & Privacy**: The key is stored **strictly in your browser's `sessionStorage`**. It is never committed to Git, written to disk, sent to any third-party server, or stored in query strings.
- **Credit Cost**: Exactly **5 credits** per chapter (1 job with 1024 shots). The app **never** calls the API when opening windows, closing curtains, or refreshing evenings.
- Cached shots are kept in `sessionStorage` so refreshing the browser tab does not spend another 5 credits.

---

## Browser CORS & Optional Proxy Setup

When querying `https://api.mothquantum.com` directly from a client-side browser script, some browsers enforce Cross-Origin Resource Sharing (CORS) restrictions.

If you encounter a CORS error when connecting to Moth Atlas from `localhost`, use one of the two minimal, zero-dependency proxies included in this repository:

### A. Python Proxy (Included: `proxy.py`)
```bash
python3 proxy.py
```
This runs a 40-line proxy at `http://localhost:8787`. On the Entangled Love title screen, click **Advanced: Custom Base URL / Proxy** and enter:
```
http://localhost:8787/api/v1
```

### B. Node Proxy (Included: `proxy.js`)
```bash
node proxy.js
```
Runs at `http://localhost:8787`. Enter `http://localhost:8787/api/v1` in the Advanced endpoint field.

### C. Cloudflare Worker (Optional Cloud Deployment)
If hosting your own reverse proxy on Cloudflare Workers:
```javascript
export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }
    const url = new URL(request.url);
    url.hostname = "api.mothquantum.com";
    const newReq = new Request(url, request);
    const resp = await fetch(newReq);
    const newHeaders = new Headers(resp.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    return new Response(resp.body, { status: resp.status, headers: newHeaders });
  }
};
```

---

## How to Publish to GitHub Pages

1. **Initialize Git repository**:
   ```bash
   git init
   git checkout -b main
   git add .
   git commit -m "Initial commit of Entangled Love"
   ```

2. **Push to your GitHub repository**:
   ```bash
   git remote add origin https://github.com/<your-username>/entangled-love.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**:
   - Go to your repository on GitHub.
   - Click **Settings** &rarr; **Pages**.
   - Under **Build and deployment** &rarr; **Source**, select **Deploy from a branch**.
   - Select branch `main` and folder `/ (root)`, then click **Save**.
   - The `.nojekyll` file included in this repository ensures that assets and folders are served cleanly without Jekyll processing.
   - Within 1–2 minutes, your site will be live at `https://<your-username>.github.io/entangled-love/`.

---

## Sound Credits & Audio Licensing

All sound effects vendor in `assets/audio/` are dedicated to the **Creative Commons CC0 1.0 Universal (Public Domain)**:
- `curtain_swipe.wav`: Soft fabric slide / whoosh (CC0)
- `bed_tone.wav`: Warm 55Hz/110Hz nocturnal room tone (CC0)
- `thinking_loop.wav`: Contemplative harmonic chime & page rustle (CC0)
- `game_clicks.wav`: Quiet 8-bit game blips & microswitch clicks (CC0)
- `simmer_loop.wav`: Kitchen stove pot simmer & bubbling loop (CC0)

A procedural WebAudio synthesizer is also embedded in `js/game.js` as an instant fallback. Full details and sound descriptions are documented in [`CREDITS.md`](CREDITS.md).

---

## Repository Structure

```
├── index.html          # Main HTML structure and UI
├── css/
│   └── style.css       # Atmospheric nocturnal stylesheet
├── js/
│   ├── atlas.js        # Moth Atlas API client, 422 schema retry, local simulator
│   ├── stats.js        # Joint/conditional probabilities, dynamic statement builder
│   ├── game.js         # Evening state controller, audio manager, notebook
│   └── draw.js         # Canvas 2D scene renderer (commented for sprite replacement)
├── assets/
│   └── audio/          # CC0 vendored sound assets
│       ├── curtain_swipe.wav
│       ├── bed_tone.wav
│       ├── thinking_loop.wav
│       ├── game_clicks.wav
│       └── simmer_loop.wav
├── generate_sounds.py  # Procedural audio generator script
├── proxy.py            # Local Python CORS proxy
├── proxy.js            # Local Node CORS proxy
├── .nojekyll           # GitHub Pages asset routing bypass
├── CREDITS.md          # Full sound, engine, and code attributions
└── README.md           # Project documentation and guide
```
