/**
 * draw.js - Dual-City Atmospheric Window Renderer for "Entangled Love"
 * 
 * Portrays two distant lovers separated by vast geographical distance:
 * - Window A: London Flat (Victorian brick, rain streaks, chimneys, clock tower)
 * - Window B: Tokyo Apartment (Modern concrete, neon signs, flying birds, radio tower)
 * 
 * Instead of curtains, the interaction is turning the room lights ON / OFF:
 * - Light OFF: Dark window pane with nocturnal city reflections & faint silhouettes
 * - Light ON: Warm interior illumination reveals the character and their activity:
 *     0: In Bed (lamp, duvet, breathing)
 *     1: Thinking (window sill, mug, chin on hand)
 *     2: Playing a game (glowing screen, focused silhouette)
 *     3: Cooking (stove burner, rising steam curls)
 * 
 * Day transitions animate celestial motion across the shared sky.
 */

export const VIRTUAL_WIDTH = 960;
export const VIRTUAL_HEIGHT = 540;

// Polyfill CanvasRenderingContext2D.roundRect if missing
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r = 0) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    return this;
  };
}

// Window Coordinates for the two distant buildings
export const WINDOW_A = {
  x: 75,
  y: 70,
  width: 370,
  height: 405,
  city: 'LONDON',
  timeZone: '01:42 AM',
  keyLabel: 'Z'
};

export const WINDOW_B = {
  x: 515,
  y: 70,
  width: 370,
  height: 405,
  city: 'TOKYO',
  timeZone: '10:42 AM',
  keyLabel: 'X'
};

export class SceneRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.animTime = 0;

    // Light switch states: 0.0 (dark / off) to 1.0 (fully lit / on)
    this.lightA = 0.0;
    this.lightB = 0.0;
    this.targetLightA = 0.0;
    this.targetLightB = 0.0;

    // Current activities (0: bed, 1: thinking, 2: playing, 3: cooking)
    this.activityA = 0;
    this.activityB = 0;

    // Day transition animation (0 to 1)
    this.dayTransition = 0.0;
    this.isTransitioningDay = false;
    this.dayTransitionSpeed = 1.6;
    this.currentDay = 1;

    // Dynamic environment particles
    this.stars = this.generateStars(70);
    this.rainDrops = this.generateRain(55);
    this.birds = this.generateBirds(7);
    this.steamParticles = this.generateSteamParticles(24);

    // Hover feedback
    this.hoverWindow = null; // 'A', 'B', or null

    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const displayWidth = rect.width || VIRTUAL_WIDTH;
    const displayHeight = rect.height || VIRTUAL_HEIGHT;

    this.canvas.width = Math.round(displayWidth * dpr);
    this.canvas.height = Math.round(displayHeight * dpr);
  }

  generateStars(count) {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: (i * 137) % VIRTUAL_WIDTH,
        y: ((i * 47) % 240) + 12,
        size: (i % 3) * 0.6 + 0.8,
        pulseSpeed: 1.0 + (i % 4) * 0.4,
        phase: (i * 1.6) % (Math.PI * 2)
      });
    }
    return stars;
  }

  generateRain(count) {
    const drops = [];
    for (let i = 0; i < count; i++) {
      drops.push({
        x: WINDOW_A.x - 20 + Math.random() * (WINDOW_A.width + 40),
        y: WINDOW_A.y - 40 + Math.random() * (WINDOW_A.height + 60),
        len: 8 + Math.random() * 12,
        speed: 280 + Math.random() * 120,
        alpha: 0.15 + Math.random() * 0.3
      });
    }
    return drops;
  }

  generateBirds(count) {
    const birds = [];
    for (let i = 0; i < count; i++) {
      birds.push({
        x: WINDOW_B.x - 40 + (i * 45) + Math.random() * 30,
        y: 65 + (i * 18) % 90 + Math.random() * 15,
        speed: 35 + Math.random() * 20,
        scale: 0.7 + (i % 3) * 0.25,
        wingPhase: i * 0.9
      });
    }
    return birds;
  }

  generateSteamParticles(count) {
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 22,
        y: Math.random() * -65,
        r: 3 + Math.random() * 5,
        speed: 0.4 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2
      });
    }
    return particles;
  }

  setActivities(actA, actB) {
    this.activityA = actA;
    this.activityB = actB;
  }

  setLights(onA, onB) {
    this.targetLightA = onA ? 1.0 : 0.0;
    this.targetLightB = onB ? 1.0 : 0.0;
  }

  toggleLight(windowKey) {
    if (windowKey === 'A') {
      this.targetLightA = this.targetLightA > 0.5 ? 0.0 : 1.0;
      return this.targetLightA > 0.5;
    } else if (windowKey === 'B') {
      this.targetLightB = this.targetLightB > 0.5 ? 0.0 : 1.0;
      return this.targetLightB > 0.5;
    }
    return false;
  }

  toggleBothLights() {
    const bothOn = this.targetLightA > 0.5 && this.targetLightB > 0.5;
    const nextState = !bothOn;
    this.targetLightA = nextState ? 1.0 : 0.0;
    this.targetLightB = nextState ? 1.0 : 0.0;
    return nextState;
  }

  triggerDayTransition(newDay) {
    this.currentDay = newDay;
    this.dayTransition = 0.0;
    this.isTransitioningDay = true;
    // Lights turn off when advancing to the new day
    this.targetLightA = 0.0;
    this.targetLightB = 0.0;
  }

  update(dt = 0.016) {
    this.animTime += dt;

    // Smooth lighting transition interpolation
    const lightSpeed = 8.5 * dt;
    this.lightA += (this.targetLightA - this.lightA) * lightSpeed;
    this.lightB += (this.targetLightB - this.lightB) * lightSpeed;

    if (Math.abs(this.lightA - this.targetLightA) < 0.003) this.lightA = this.targetLightA;
    if (Math.abs(this.lightB - this.targetLightB) < 0.003) this.lightB = this.targetLightB;

    // Day transition animation progression
    if (this.isTransitioningDay) {
      this.dayTransition += dt * this.dayTransitionSpeed;
      if (this.dayTransition >= 1.0) {
        this.dayTransition = 1.0;
        this.isTransitioningDay = false;
      }
    }

    // Update Rain (City A)
    for (const drop of this.rainDrops) {
      drop.y += drop.speed * dt;
      drop.x -= drop.speed * 0.28 * dt; // Slight diagonal wind
      if (drop.y > WINDOW_A.y + WINDOW_A.height + 20 || drop.x < WINDOW_A.x - 30) {
        drop.y = WINDOW_A.y - 20;
        drop.x = WINDOW_A.x + Math.random() * (WINDOW_A.width + 40);
      }
    }

    // Update Birds (City B)
    for (const bird of this.birds) {
      bird.x += bird.speed * dt;
      if (bird.x > VIRTUAL_WIDTH + 40) {
        bird.x = WINDOW_B.x - 60;
        bird.y = 55 + Math.random() * 95;
      }
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Apply scale to fit virtual 960x540 viewport
    const scaleX = w / VIRTUAL_WIDTH;
    const scaleY = h / VIRTUAL_HEIGHT;
    ctx.scale(scaleX, scaleY);

    // 1. Shared Sky Backdrop with Day-Transition Sweep
    this.drawSky(ctx);

    // 2. Distant Skylines (London Chimneys vs Tokyo High-rises & Radio Tower)
    this.drawDistantSkylines(ctx);

    // 3. Flying Birds (City B)
    this.drawBirds(ctx);

    // 4. Building Architecture Facades (Victorian Brick vs Modern Concrete)
    this.drawBuildingFacades(ctx);

    // 5. Rain Streaks (City A)
    this.drawRain(ctx);

    // 6. Windows & Interior Rooms
    this.drawWindowView(ctx, WINDOW_A, this.activityA, this.lightA, false);
    this.drawWindowView(ctx, WINDOW_B, this.activityB, this.lightB, true);

    // 7. Distance Gulf Marker & Location Headers
    this.drawDistanceOverlay(ctx);

    // 8. Day Transition Overlay if active
    if (this.isTransitioningDay) {
      this.drawDayTransitionOverlay(ctx);
    }

    ctx.restore();
  }

  /**
   * 1. Night Sky with Celestial Motion
   */
  drawSky(ctx) {
    ctx.save();

    // Base Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT * 0.75);

    // If day transition active, briefly pulse sky with dawn / dusk tones
    if (this.isTransitioningDay) {
      const p = Math.sin(this.dayTransition * Math.PI);
      skyGrad.addColorStop(0, '#101426');
      skyGrad.addColorStop(0.4, `rgb(${Math.round(20 + 40 * p)}, ${Math.round(24 + 30 * p)}, ${Math.round(48 + 50 * p)})`);
      skyGrad.addColorStop(1, `rgb(${Math.round(40 + 75 * p)}, ${Math.round(35 + 45 * p)}, ${Math.round(60 + 65 * p)})`);
    } else {
      skyGrad.addColorStop(0, '#090b14');
      skyGrad.addColorStop(0.5, '#121626');
      skyGrad.addColorStop(1, '#201b2d');
    }

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // Twinkling Stars
    for (const star of this.stars) {
      const alpha = 0.35 + 0.45 * Math.sin(this.animTime * star.pulseSpeed + star.phase);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.08, alpha)})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Celestial Moon (sweeps across during day transitions)
    let moonX = 480;
    let moonY = 52;
    if (this.isTransitioningDay) {
      moonX = 480 + (this.dayTransition - 0.5) * 260;
      moonY = 52 + Math.sin(this.dayTransition * Math.PI) * 18;
    }

    // Moon Glow
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 65);
    moonGlow.addColorStop(0, 'rgba(244, 235, 208, 0.22)');
    moonGlow.addColorStop(1, 'rgba(244, 235, 208, 0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 65, 0, Math.PI * 2);
    ctx.fill();

    // Crescent Moon Body
    ctx.fillStyle = '#f6edd4';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 18, 0, Math.PI * 2);
    ctx.fill();
    // Shadow cutout
    ctx.fillStyle = '#0b0d18';
    ctx.beginPath();
    ctx.arc(moonX + 7, moonY - 3, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 2. Distant City Skylines (London vs Tokyo)
   */
  drawDistantSkylines(ctx) {
    ctx.save();

    // --- City A Background: London Chimneys & Clock Tower ---
    ctx.fillStyle = '#0b0e1a';
    // Classic chimneys and gabled rooftops
    ctx.fillRect(40, 140, 35, 120);
    ctx.fillRect(75, 160, 40, 100);
    // Vintage Clock Tower silhouette (Big Ben inspired)
    ctx.beginPath();
    ctx.moveTo(130, 260);
    ctx.lineTo(130, 105);
    ctx.lineTo(142, 70); // Spire
    ctx.lineTo(154, 105);
    ctx.lineTo(154, 260);
    ctx.fill();
    // Clock face glow
    ctx.fillStyle = 'rgba(255, 235, 180, 0.35)';
    ctx.beginPath();
    ctx.arc(142, 115, 6, 0, Math.PI * 2);
    ctx.fill();

    // --- City B Background: Tokyo High-rises & Radio Tower ---
    ctx.fillStyle = '#0d101d';
    // Sleek high-rises
    ctx.fillRect(800, 120, 48, 160);
    ctx.fillRect(855, 95, 40, 185);
    ctx.fillRect(900, 135, 50, 145);

    // Glowing skyscraper windows
    ctx.fillStyle = 'rgba(100, 200, 240, 0.45)';
    for (let r = 135; r < 230; r += 16) {
      ctx.fillRect(810, r, 6, 8);
      ctx.fillRect(825, r, 6, 8);
      ctx.fillRect(865, r - 20, 6, 8);
      ctx.fillRect(880, r - 20, 6, 8);
    }

    // Tokyo Tower / Radio Mast
    const mastX = 770;
    ctx.strokeStyle = '#1a1f33';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(mastX, 260);
    ctx.lineTo(mastX, 75);
    ctx.moveTo(mastX - 16, 260);
    ctx.lineTo(mastX, 120);
    ctx.lineTo(mastX + 16, 260);
    ctx.stroke();

    // Blinking red aviation beacon
    const beaconAlpha = 0.5 + 0.5 * Math.sin(this.animTime * 4);
    ctx.fillStyle = `rgba(255, 60, 60, ${beaconAlpha})`;
    ctx.beginPath();
    ctx.arc(mastX, 72, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 3. Flying Birds (City B)
   */
  drawBirds(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(210, 225, 250, 0.65)';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';

    for (const b of this.birds) {
      const wing = Math.sin(this.animTime * 6 + b.wingPhase) * 4 * b.scale;
      ctx.beginPath();
      // Left wing
      ctx.moveTo(b.x - 7 * b.scale, b.y - wing);
      ctx.quadraticCurveTo(b.x - 3 * b.scale, b.y, b.x, b.y);
      // Right wing
      ctx.quadraticCurveTo(b.x + 3 * b.scale, b.y, b.x + 7 * b.scale, b.y - wing);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * 4. Building Architecture Facades (Victorian Brick vs Modern Concrete)
   */
  drawBuildingFacades(ctx) {
    ctx.save();

    // Ground / foundation bar
    ctx.fillStyle = '#0a0c14';
    ctx.fillRect(0, VIRTUAL_HEIGHT - 35, VIRTUAL_WIDTH, 35);

    // --- City A Building (Left): Weathered Victorian Brick ---
    ctx.fillStyle = '#17141d';
    ctx.fillRect(0, 0, WINDOW_A.x - 15, VIRTUAL_HEIGHT);
    // Brick wall section between window and divider
    ctx.fillRect(WINDOW_A.x + WINDOW_A.width + 12, 0, 42, VIRTUAL_HEIGHT);

    // Subtle brick courses
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    for (let by = 40; by < VIRTUAL_HEIGHT - 35; by += 18) {
      ctx.beginPath();
      ctx.moveTo(0, by);
      ctx.lineTo(WINDOW_A.x - 15, by);
      ctx.stroke();
    }

    // --- City B Building (Right): Sleek Concrete / Architectural Tile ---
    ctx.fillStyle = '#121622';
    // Wall around right window
    ctx.fillRect(WINDOW_B.x - 45, 0, 45, VIRTUAL_HEIGHT);
    ctx.fillRect(WINDOW_B.x + WINDOW_B.width + 15, 0, VIRTUAL_WIDTH - (WINDOW_B.x + WINDOW_B.width + 15), VIRTUAL_HEIGHT);

    // Modern architectural panel seams
    ctx.strokeStyle = 'rgba(70, 110, 180, 0.07)';
    ctx.lineWidth = 1.5;
    for (let py = 50; py < VIRTUAL_HEIGHT - 35; py += 55) {
      ctx.beginPath();
      ctx.moveTo(WINDOW_B.x + WINDOW_B.width + 15, py);
      ctx.lineTo(VIRTUAL_WIDTH, py);
      ctx.stroke();
    }

    // Glowing Tokyo Neon Sign on building wall
    const neonX = WINDOW_B.x + WINDOW_B.width + 36;
    const neonY = 160;
    const neonPulse = 0.8 + 0.2 * Math.sin(this.animTime * 3.5);

    // Neon atmospheric glow
    const neonGlow = ctx.createRadialGradient(neonX, neonY + 50, 10, neonX, neonY + 50, 85);
    neonGlow.addColorStop(0, `rgba(255, 60, 140, ${0.35 * neonPulse})`);
    neonGlow.addColorStop(1, 'rgba(255, 60, 140, 0)');
    ctx.fillStyle = neonGlow;
    ctx.beginPath();
    ctx.arc(neonX, neonY + 50, 85, 0, Math.PI * 2);
    ctx.fill();

    // Vertical neon tube sign
    ctx.fillStyle = '#181122';
    ctx.fillRect(neonX - 14, neonY, 28, 110);
    ctx.strokeStyle = `rgba(255, 80, 170, ${neonPulse})`;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(neonX - 14, neonY, 28, 110);

    // Glowing Neon Kanji (愛 = Love / 夜 = Night)
    ctx.fillStyle = `rgba(255, 140, 200, ${neonPulse})`;
    ctx.font = 'bold 20px "Hiragino Sans", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('愛', neonX, neonY + 38);
    ctx.fillText('夜', neonX, neonY + 75);

    ctx.restore();
  }

  /**
   * 5. Rain Streaks on City A (London)
   */
  drawRain(ctx) {
    ctx.save();
    ctx.lineWidth = 1.2;
    for (const drop of this.rainDrops) {
      ctx.strokeStyle = `rgba(180, 210, 255, ${drop.alpha})`;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - drop.len * 0.28, drop.y + drop.len);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * 6. Windows & Interior Room View
   * Renders the unlit nighttime glass when light = 0, or reveals the activity when light = 1
   */
  drawWindowView(ctx, win, activityCode, lightVal, isMirrored) {
    const rx = win.x;
    const ry = win.y;
    const rw = win.width;
    const rh = win.height;

    ctx.save();

    // Outer architectural sill & lintel
    this.drawWindowFrame(ctx, win, lightVal);

    // Clip to interior window pane
    ctx.beginPath();
    ctx.rect(rx, ry, rw, rh);
    ctx.clip();

    // 1. Draw Interior Room Background
    const roomGrad = ctx.createLinearGradient(rx, ry, rx, ry + rh);
    // Interpolate between unlit nocturnal blue-black and warm illuminated room
    const bgTop = this.lerpColor('#0d101c', '#1b1424', lightVal);
    const bgBottom = this.lerpColor('#141829', '#322238', lightVal);
    roomGrad.addColorStop(0, bgTop);
    roomGrad.addColorStop(1, bgBottom);
    ctx.fillStyle = roomGrad;
    ctx.fillRect(rx, ry, rw, rh);

    // Floorboards
    const floorColor = this.lerpColor('#10121d', '#281c25', lightVal);
    ctx.fillStyle = floorColor;
    ctx.fillRect(rx, ry + rh - 85, rw, 85);

    // 2. Draw Activity Scene Inside Room
    // When lightVal > 0, activity is rendered with corresponding opacity & warm bloom
    if (lightVal > 0.02) {
      ctx.save();
      ctx.globalAlpha = lightVal;
      switch (activityCode) {
        case 0:
          this.drawActivityBed(ctx, rx, ry, rw, rh, isMirrored);
          break;
        case 1:
          this.drawActivityThinking(ctx, rx, ry, rw, rh, isMirrored);
          break;
        case 2:
          this.drawActivityGaming(ctx, rx, ry, rw, rh, isMirrored);
          break;
        case 3:
          this.drawActivityCooking(ctx, rx, ry, rw, rh, isMirrored);
          break;
      }
      ctx.restore();
    } else {
      // Light is completely OFF: draw very faint mysterious nocturnal silhouette
      this.drawUnlitSilhouette(ctx, rx, ry, rw, rh, activityCode, isMirrored);
    }

    // 3. Window Glass Reflection & Weather Streaks
    this.drawGlassReflections(ctx, rx, ry, rw, rh, lightVal, isMirrored);

    ctx.restore();

    // 4. Outer Practical Light Bloom (spills out of window onto wall when light is ON)
    if (lightVal > 0.05) {
      this.drawLightSpill(ctx, win, lightVal);
    }

    // 5. Interactive Hotkey & Status Tag on Window Sill
    this.drawWindowFooter(ctx, win, lightVal);
  }

  drawWindowFrame(ctx, win, lightVal) {
    ctx.save();

    // Heavy window frame surround
    const frameColor = win.city === 'LONDON' ? '#322b3b' : '#222838';
    ctx.strokeStyle = frameColor;
    ctx.lineWidth = 14;
    ctx.strokeRect(win.x, win.y, win.width, win.height);

    // Outer stone sill
    const sillColor = win.city === 'LONDON' ? '#443b4f' : '#2d354a';
    ctx.fillStyle = sillColor;
    ctx.fillRect(win.x - 12, win.y + win.height, win.width + 24, 18);

    // Window Mullions (Georgian 4-pane for London; modern slim crossbar for Tokyo)
    ctx.strokeStyle = frameColor;
    ctx.lineWidth = 7;
    ctx.beginPath();
    // Vertical center mullion
    ctx.moveTo(win.x + win.width / 2, win.y);
    ctx.lineTo(win.x + win.width / 2, win.y + win.height);
    // Horizontal transom bar
    ctx.moveTo(win.x, win.y + win.height * 0.44);
    ctx.lineTo(win.x + win.width, win.y + win.height * 0.44);
    ctx.stroke();

    ctx.restore();
  }

  drawGlassReflections(ctx, x, y, w, h, lightVal, isMirrored) {
    ctx.save();
    // When light is off, reflections are prominent; when light is on, room shines through
    const reflectionAlpha = (1.0 - lightVal) * 0.18 + 0.04;

    const glassGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    glassGrad.addColorStop(0, `rgba(255, 255, 255, ${reflectionAlpha * 1.5})`);
    glassGrad.addColorStop(0.35, `rgba(180, 220, 255, ${reflectionAlpha * 0.5})`);
    glassGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0)');
    glassGrad.addColorStop(1, `rgba(255, 255, 255, ${reflectionAlpha})`);

    ctx.fillStyle = glassGrad;
    ctx.fillRect(x, y, w, h);

    // Diagonal glass sheen bar
    ctx.fillStyle = `rgba(255, 255, 255, ${reflectionAlpha * 0.6})`;
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 10);
    ctx.lineTo(x + w * 0.35, y + 10);
    ctx.lineTo(x + 10, y + h * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawLightSpill(ctx, win, lightVal) {
    ctx.save();
    // Warm light cone casting out from the window
    const spillGrad = ctx.createRadialGradient(
      win.x + win.width / 2, win.y + win.height / 2,
      win.width * 0.3,
      win.x + win.width / 2, win.y + win.height / 2,
      win.width * 0.75
    );
    spillGrad.addColorStop(0, `rgba(255, 220, 150, ${0.18 * lightVal})`);
    spillGrad.addColorStop(0.6, `rgba(255, 200, 120, ${0.08 * lightVal})`);
    spillGrad.addColorStop(1, 'rgba(255, 200, 120, 0)');

    ctx.fillStyle = spillGrad;
    ctx.fillRect(win.x - 35, win.y - 35, win.width + 70, win.height + 70);
    ctx.restore();
  }

  drawUnlitSilhouette(ctx, x, y, w, h, activityCode, isMirrored) {
    ctx.save();
    // Subtle, dim dark silhouette outline visible through the dark glass
    ctx.fillStyle = 'rgba(5, 7, 14, 0.75)';

    const charX = isMirrored ? x + 110 : x + w - 110;
    const charY = y + h - 140;

    // Faint desk or bed outline
    ctx.fillRect(x + 50, y + h - 150, w - 100, 70);

    // Faint head silhouette
    ctx.beginPath();
    ctx.arc(charX, charY, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawWindowFooter(ctx, win, lightVal) {
    ctx.save();

    const isHovered = (this.hoverWindow === (win === WINDOW_A ? 'A' : 'B'));
    const isLit = lightVal > 0.5;

    // Hover border glow
    if (isHovered) {
      ctx.strokeStyle = 'rgba(214, 168, 88, 0.75)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(win.x - 2, win.y - 2, win.width + 4, win.height + 4);
      ctx.setLineDash([]);
    }

    // Pill badge on sill: shows Keybinding and Switch state
    const badgeX = win.x + win.width / 2;
    const badgeY = win.y + win.height + 26;
    const badgeText = isLit
      ? `[${win.keyLabel}] Light: ON (Click to turn off)`
      : `[${win.keyLabel}] Light: OFF (Click to turn on)`;

    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    const textW = ctx.measureText(badgeText).width;

    ctx.fillStyle = isLit ? 'rgba(40, 32, 20, 0.94)' : 'rgba(16, 20, 30, 0.94)';
    ctx.beginPath();
    ctx.roundRect(badgeX - textW / 2 - 14, badgeY - 12, textW + 28, 24, 12);
    ctx.fill();

    ctx.strokeStyle = isLit ? '#d4af37' : 'rgba(100, 130, 180, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = isLit ? '#ffe49e' : '#cbd5e1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, badgeX, badgeY);

    ctx.restore();
  }

  /**
   * 7. Distance Marker & City Headers
   */
  drawDistanceOverlay(ctx) {
    ctx.save();

    // City A Header (London)
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px "Cinzel", Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(`CITY A • ${WINDOW_A.city}`, WINDOW_A.x, WINDOW_A.y - 18);

    ctx.font = 'italic 11px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(WINDOW_A.timeZone, WINDOW_A.x + 160, WINDOW_A.y - 18);

    // City B Header (Tokyo)
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px "Cinzel", Georgia, serif';
    ctx.textAlign = 'right';
    ctx.fillText(`CITY B • ${WINDOW_B.city}`, WINDOW_B.x + WINDOW_B.width, WINDOW_B.y - 18);

    ctx.font = 'italic 11px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(WINDOW_B.timeZone, WINDOW_B.x + WINDOW_B.width - 150, WINDOW_B.y - 18);

    // Distance Gulf in Center
    const centerX = VIRTUAL_WIDTH / 2;
    ctx.fillStyle = 'rgba(214, 175, 88, 0.85)';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '1px';
    ctx.fillText('⟵ 9,560 KM APART ⟶', centerX, 30);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '9px system-ui, sans-serif';
    ctx.fillText('ENTANGLED PAIR (0, 2)', centerX, 44);

    ctx.restore();
  }

  /**
   * 8. Day Transition Sweep Overlay
   */
  drawDayTransitionOverlay(ctx) {
    ctx.save();
    const p = Math.sin(this.dayTransition * Math.PI);

    // Radial gold/twilight flash
    const grad = ctx.createRadialGradient(
      VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2, 20,
      VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2, VIRTUAL_WIDTH * 0.7
    );
    grad.addColorStop(0, `rgba(255, 230, 160, ${0.35 * p})`);
    grad.addColorStop(0.5, `rgba(180, 120, 220, ${0.25 * p})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // Floating Day Banner
    ctx.font = 'bold 24px "Cinzel", Georgia, serif';
    ctx.fillStyle = `rgba(255, 245, 220, ${p})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`DAY ${this.currentDay} OF 16`, VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2);

    ctx.restore();
  }

  /* -------------------------------------------------------------
   * Character Activity Renderers (Bed, Thinking, Gaming, Cooking)
   * ------------------------------------------------------------- */

  drawActivityBed(ctx, x, y, w, h, isMirrored) {
    ctx.save();
    const lampX = isMirrored ? x + w - 70 : x + 70;
    const lampY = y + h - 170;

    // Bedside Lamp Warm Bloom
    const lampGlow = ctx.createRadialGradient(lampX, lampY, 15, lampX, lampY, 180);
    lampGlow.addColorStop(0, 'rgba(255, 235, 180, 0.8)');
    lampGlow.addColorStop(0.35, 'rgba(255, 215, 140, 0.35)');
    lampGlow.addColorStop(1, 'rgba(255, 215, 140, 0)');
    ctx.fillStyle = lampGlow;
    ctx.beginPath();
    ctx.arc(lampX, lampY, 180, 0, Math.PI * 2);
    ctx.fill();

    // Nightstand
    ctx.fillStyle = '#3a2e38';
    ctx.fillRect(lampX - 25, lampY + 35, 50, 50);

    // Lamp
    ctx.fillStyle = '#b39359';
    ctx.fillRect(lampX - 3, lampY, 6, 35);
    ctx.fillStyle = '#ffeec2';
    ctx.beginPath();
    ctx.moveTo(lampX - 22, lampY);
    ctx.lineTo(lampX + 22, lampY);
    ctx.lineTo(lampX + 14, lampY - 26);
    ctx.lineTo(lampX - 14, lampY - 26);
    ctx.closePath();
    ctx.fill();

    // Bed & Duvet
    const bedX = isMirrored ? x + 35 : x + 95;
    const bedY = y + h - 160;
    const bedW = 230;

    ctx.fillStyle = '#4f3c44';
    ctx.fillRect(isMirrored ? bedX + bedW - 18 : bedX, bedY - 35, 18, 110);
    ctx.fillStyle = '#33272e';
    ctx.fillRect(bedX, bedY + 30, bedW, 20);

    // Pillow
    const pilX = isMirrored ? bedX + bedW - 65 : bedX + 25;
    ctx.fillStyle = '#e8e0d5';
    ctx.beginPath();
    ctx.ellipse(pilX, bedY + 12, 28, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sleeping Person
    const headX = isMirrored ? pilX - 6 : pilX + 6;
    ctx.fillStyle = isMirrored ? '#4a3328' : '#282b3c';
    ctx.beginPath();
    ctx.arc(headX, bedY + 8, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ecc7a6';
    ctx.beginPath();
    ctx.arc(isMirrored ? headX - 3 : headX + 3, bedY + 10, 9, 0, Math.PI * 2);
    ctx.fill();

    // Breathing Blanket
    const breath = Math.sin(this.animTime * 1.8) * 2.5;
    ctx.fillStyle = isMirrored ? '#42586b' : '#6b4f59';
    ctx.beginPath();
    if (!isMirrored) {
      ctx.moveTo(bedX + 35, bedY + 20 + breath);
      ctx.quadraticCurveTo(bedX + 110, bedY + 10 + breath, bedX + bedW, bedY + 22);
      ctx.lineTo(bedX + bedW, bedY + 50);
      ctx.lineTo(bedX + 35, bedY + 50);
    } else {
      ctx.moveTo(bedX, bedY + 22);
      ctx.quadraticCurveTo(bedX + 120, bedY + 10 + breath, bedX + bedW - 35, bedY + 20 + breath);
      ctx.lineTo(bedX + bedW - 35, bedY + 50);
      ctx.lineTo(bedX, bedY + 50);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawActivityThinking(ctx, x, y, w, h, isMirrored) {
    ctx.save();
    const lampX = isMirrored ? x + 90 : x + w - 90;
    const lampY = y + 70;

    const coneGrad = ctx.createRadialGradient(lampX, lampY, 10, lampX, lampY + 120, 200);
    coneGrad.addColorStop(0, 'rgba(255, 235, 180, 0.75)');
    coneGrad.addColorStop(0.35, 'rgba(255, 215, 140, 0.32)');
    coneGrad.addColorStop(1, 'rgba(255, 215, 140, 0)');
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.arc(lampX, lampY + 90, 190, 0, Math.PI * 2);
    ctx.fill();

    // Pendant cord & warm dome
    ctx.strokeStyle = '#2b232c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lampX, y);
    ctx.lineTo(lampX, lampY);
    ctx.stroke();

    ctx.fillStyle = '#bfa163';
    ctx.beginPath();
    ctx.arc(lampX, lampY, 16, Math.PI, 0);
    ctx.fill();

    // Desk & Mug
    const deskX = isMirrored ? x + 40 : x + w - 210;
    const deskY = y + h - 170;
    const mugX = isMirrored ? deskX + 35 : deskX + 135;
    ctx.fillStyle = '#ded1c3';
    ctx.fillRect(mugX - 6, deskY - 14, 12, 14);

    // Contemplative Silhouette sitting with chin on hand
    const charX = isMirrored ? deskX + 70 : deskX + 50;
    const charY = deskY - 30;

    ctx.fillStyle = isMirrored ? '#75544c' : '#475e6d';
    ctx.beginPath();
    ctx.ellipse(charX, charY + 28, 22, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arm leaning on hand
    ctx.strokeStyle = isMirrored ? '#75544c' : '#475e6d';
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (!isMirrored) {
      ctx.moveTo(charX + 5, charY + 24);
      ctx.lineTo(charX - 18, charY + 12);
      ctx.lineTo(charX - 12, charY - 8);
    } else {
      ctx.moveTo(charX - 5, charY + 24);
      ctx.lineTo(charX + 18, charY + 12);
      ctx.lineTo(charX + 12, charY - 8);
    }
    ctx.stroke();

    ctx.fillStyle = '#edd1b8';
    ctx.beginPath();
    ctx.arc(charX, charY - 8, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4a3b38';
    ctx.fillRect(deskX, deskY, 170, 16);
    ctx.restore();
  }

  drawActivityGaming(ctx, x, y, w, h, isMirrored) {
    ctx.save();
    const deskX = isMirrored ? x + 50 : x + w - 230;
    const deskY = y + h - 165;
    const screenX = isMirrored ? deskX + 75 : deskX + 105;
    const screenY = deskY - 35;

    // Glowing Screen Flare
    const screenPulse = 0.85 + 0.15 * Math.sin(this.animTime * 6);
    const screenGrad = ctx.createRadialGradient(screenX, screenY, 10, screenX, screenY, 145);
    screenGrad.addColorStop(0, '#c7f4fc');
    screenGrad.addColorStop(0.35, `rgba(80, 210, 235, ${0.48 * screenPulse})`);
    screenGrad.addColorStop(1, 'rgba(80, 210, 235, 0)');
    ctx.fillStyle = screenGrad;
    ctx.beginPath();
    ctx.arc(screenX, screenY, 145, 0, Math.PI * 2);
    ctx.fill();

    // Screen
    ctx.fillStyle = '#1a1b24';
    ctx.fillRect(screenX - 25, screenY - 25, 50, 32);
    ctx.fillStyle = '#39bad6';
    ctx.fillRect(screenX - 22, screenY - 22, 44, 26);

    // Gamer silhouette with headset
    const charX = isMirrored ? deskX + 125 : deskX + 45;
    const charY = deskY - 35;

    ctx.fillStyle = isMirrored ? '#3b4e6b' : '#573d52';
    ctx.beginPath();
    ctx.ellipse(charX + (isMirrored ? -5 : 5), charY + 18, 18, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#edd1b8';
    ctx.beginPath();
    ctx.arc(charX + (isMirrored ? -4 : 4), charY - 10, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e84570';
    ctx.fillRect(charX + (isMirrored ? -21 : 15), charY - 14, 6, 10);

    ctx.fillStyle = '#2f2c38';
    ctx.fillRect(deskX, deskY, 180, 14);
    ctx.restore();
  }

  drawActivityCooking(ctx, x, y, w, h, isMirrored) {
    ctx.save();
    const lampX = isMirrored ? x + 150 : x + w - 150;
    const lampY = y + 70;

    const cookGlow = ctx.createRadialGradient(lampX, lampY + 40, 15, lampX, lampY + 120, 210);
    cookGlow.addColorStop(0, 'rgba(255, 230, 160, 0.75)');
    cookGlow.addColorStop(0.4, 'rgba(255, 210, 130, 0.35)');
    cookGlow.addColorStop(1, 'rgba(255, 210, 130, 0)');
    ctx.fillStyle = cookGlow;
    ctx.beginPath();
    ctx.arc(lampX, lampY + 100, 210, 0, Math.PI * 2);
    ctx.fill();

    // Counter & Stove
    const counterX = isMirrored ? x + 40 : x + w - 240;
    const counterY = y + h - 160;
    const stoveX = isMirrored ? counterX + 60 : counterX + 140;

    ctx.fillStyle = '#2b303a';
    ctx.fillRect(counterX, counterY, 200, 75);
    ctx.fillStyle = '#cfc5b8';
    ctx.fillRect(counterX - 5, counterY - 10, 210, 12);

    // Flame & Pot
    ctx.fillStyle = 'rgba(255, 120, 40, 0.85)';
    ctx.beginPath();
    ctx.ellipse(stoveX, counterY - 13, 16, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#7a818c';
    ctx.fillRect(stoveX - 18, counterY - 35, 36, 22);

    // Rising Steam Particles
    for (const p of this.steamParticles) {
      const curY = (p.y - this.animTime * 25 * p.speed) % 65;
      const curX = stoveX + p.x + Math.sin(this.animTime * 2.5 + p.phase) * 6;
      const alpha = Math.max(0, 0.45 * (1 + curY / 65));
      ctx.fillStyle = `rgba(240, 245, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(curX, counterY - 38 + curY, p.r * (1 - curY / 100), 0, Math.PI * 2);
      ctx.fill();
    }

    // Person Cooking
    const cookX = isMirrored ? counterX + 130 : counterX + 70;
    const cookY = counterY - 60;

    ctx.fillStyle = isMirrored ? '#4a6058' : '#734e56';
    ctx.beginPath();
    ctx.ellipse(cookX, cookY + 30, 18, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#edd1b8';
    ctx.beginPath();
    ctx.arc(cookX, cookY, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  lerpColor(a, b, t) {
    const ah = parseInt(a.replace(/#/g, ''), 16);
    const ar = (ah >> 16) & 0xff;
    const ag = (ah >> 8) & 0xff;
    const ab = ah & 0xff;

    const bh = parseInt(b.replace(/#/g, ''), 16);
    const br = (bh >> 16) & 0xff;
    const bg = (bh >> 8) & 0xff;
    const bb = bh & 0xff;

    const rr = Math.round(ar + (br - ar) * t);
    const rg = Math.round(ag + (bg - ag) * t);
    const rb = Math.round(ab + (bb - ab) * t);

    return `rgb(${rr}, ${rg}, ${rb})`;
  }

  hitTest(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const virtX = ((screenX - rect.left) / rect.width) * VIRTUAL_WIDTH;
    const virtY = ((screenY - rect.top) / rect.height) * VIRTUAL_HEIGHT;

    if (
      virtX >= WINDOW_A.x &&
      virtX <= WINDOW_A.x + WINDOW_A.width &&
      virtY >= WINDOW_A.y &&
      virtY <= WINDOW_A.y + WINDOW_A.height + 40
    ) {
      return 'A';
    }

    if (
      virtX >= WINDOW_B.x &&
      virtX <= WINDOW_B.x + WINDOW_B.width &&
      virtY >= WINDOW_B.y &&
      virtY <= WINDOW_B.y + WINDOW_B.height + 40
    ) {
      return 'B';
    }

    return null;
  }
}
