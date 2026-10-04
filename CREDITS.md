# Credits & Attributions

## Entangled Love

An observational quantum piece created for the Moth Hackathon 2026.

### Audio Assets (`assets/audio/`)

All sound effects in this project are licensed under the **Creative Commons CC0 1.0 Universal (Public Domain Dedication)**. You can copy, modify, distribute, and perform the work, even for commercial purposes, without asking permission.

1. **Curtain Swipe** (`assets/audio/curtain_swipe.wav`)
   - **Title**: Fabric Whoosh / Curtain Swipe
   - **Author**: Antigravity Studio / Moth Hack
   - **Source**: Procedural acoustic physical model synthesis (`generate_sounds.py`)
   - **License**: CC0 1.0 Universal (Public Domain) - https://creativecommons.org/publicdomain/zero/1.0/
   - **Description**: Soft textured cloth swipe with resonant air decay (0.45s).

2. **Room Tone / In Bed Loop** (`assets/audio/bed_tone.wav`)
   - **Title**: Warm Nighttime Room Tone
   - **Author**: Antigravity Studio / Moth Hack
   - **Source**: Procedural acoustic physical model synthesis (`generate_sounds.py`)
   - **License**: CC0 1.0 Universal (Public Domain) - https://creativecommons.org/publicdomain/zero/1.0/
   - **Description**: Quiet 55Hz/110Hz warm ambient sub-harmonics with gentle nocturnal breathing modulation (3.00s seamless loop).

3. **Thinking Loop** (`assets/audio/thinking_loop.wav`)
   - **Title**: Contemplative Chime & Paper Page Rustle
   - **Author**: Antigravity Studio / Moth Hack
   - **Source**: Procedural acoustic physical model synthesis (`generate_sounds.py`)
   - **License**: CC0 1.0 Universal (Public Domain) - https://creativecommons.org/publicdomain/zero/1.0/
   - **Description**: Gentle harmonic chimes (A4, C5) and delicate notebook page-turn textures (3.00s seamless loop).

4. **Game Clicks Loop** (`assets/audio/game_clicks.wav`)
   - **Title**: Retro Handheld Gaming Blips & Tactile Clicks
   - **Author**: Antigravity Studio / Moth Hack
   - **Source**: Procedural acoustic physical model synthesis (`generate_sounds.py`)
   - **License**: CC0 1.0 Universal (Public Domain) - https://creativecommons.org/publicdomain/zero/1.0/
   - **Description**: Subtle 8-bit chip tunes and tactile microswitch button taps (2.50s seamless loop).

5. **Simmer Loop** (`assets/audio/simmer_loop.wav`)
   - **Title**: Cozy Kitchen Pot Simmer
   - **Author**: Antigravity Studio / Moth Hack
   - **Source**: Procedural acoustic physical model synthesis (`generate_sounds.py`)
   - **License**: CC0 1.0 Universal (Public Domain) - https://creativecommons.org/publicdomain/zero/1.0/
   - **Description**: Stochastic resonant bubble pops and warm boiling fluid churn (3.00s seamless loop).

### WebAudio Synthesis Engine

In addition to the vendored WAV files, the web app includes a built-in real-time WebAudio procedural synthesizer in `js/game.js`. If audio files are blocked by strict local file browser policies, the synthesizer generates identical acoustic loops on-the-fly directly in the browser's WebAudio context.

### Quantum Computing Engine

- **Engine**: Moth Atlas `graph-v1` Engine
- **Provider**: Moth Quantum (https://mothquantum.com / https://api.mothquantum.com)
- **Model**: 4-qubit graph state with computational basis measurement; targeted 2-qubit relationship correlation on pair $(0, 2)$.
