/**
 * draw.js - Indie Game Visual Engine: "Entangled Love"
 * 
 * Artistic Direction:
 * - Two distinct distant realities separated by a glowing quantum dimensional rift:
 *     Left (London, UK): Victorian brick, vintage English street sign (Fleet St),
 *                        rain streaks, chimneys, glowing cast-iron streetlamp.
 *     Right (Tokyo, Japan): Modern slate facade, Japanese street sign (桜通り),
 *                           drifting cherry blossom petals, glowing izakaya lantern, high-rises.
 * - Dynamic central quantum tear with lightning fractal energy and shimmering particles.
 * - Characters with unique personalities:
 *     Leo (London): Bohemian, knitted jumper, dark green quilt, books, tea mug.
 *     Mia (Tokyo): Cute fairy lights, pastel pink duvet, plushie, cat, sakura.
 * - Tactile light switches that illuminate each world independently.
 */

export const VIRTUAL_WIDTH = 960;
export const VIRTUAL_HEIGHT = 540;

// Coordinates for the two windows
export const WINDOW_A = {
  x: 55,
  y: 75,
  width: 380,
  height: 385,
  city: 'LONDON',
  character: 'LEO',
  street: 'FLEET ST • EC4',
  keyLabel: 'Z'
};

export const WINDOW_B = {
  x: 525,
  y: 75,
  width: 380,
  height: 385,
  city: 'TOKYO',
  character: 'MIA',
  street: '桜通り 2-4',
  keyLabel: 'X'
};

export class SceneRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.animTime = 0;

    // Light switch levels: 0.0 (off / dark) to 1.0 (on / fully lit)
    this.lightA = 0.0;
    this.lightB = 0.0;
    this.targetLightA = 0.0;
    this.targetLightB = 0.0;

    // Current activities (0: bed, 1: thinking, 2: playing, 3: cooking)
    this.activityA = 0;
    this.activityB = 0;

    // Day transition animation (0.0 to 1.0)
    this.dayTransition = 0.0;
    this.isTransitioningDay = false;
    this.currentDay = 1;

    // Environmental particle systems
    this.stars = this.generateStars(65);
    this.rainDrops = this.generateRain(50);
    this.sakuraPetals = this.generateSakura(35);
    this.quantumSparks = this.generateQuantumSparks(28);
    this.steamA = this.generateSteam(18);
    this.steamB = this.generateSteam(18);

    // Interactive hover
    this.hoverWindow = null;

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
        x: (i * 149) % VIRTUAL_WIDTH,
        y: ((i * 59) % 220) + 10,
        size: (i % 3) * 0.5 + 0.8,
        pulseSpeed: 1.0 + (i % 4) * 0.35,
        phase: (i * 1.7) % (Math.PI * 2)
      });
    }
    return stars;
  }

  generateRain(count) {
    const drops = [];
    for (let i = 0; i < count; i++) {
      drops.push({
        x: Math.random() * (VIRTUAL_WIDTH * 0.48),
        y: Math.random() * VIRTUAL_HEIGHT,
        len: 10 + Math.random() * 14,
        speed: 300 + Math.random() * 150,
        alpha: 0.15 + Math.random() * 0.35
      });
    }
    return drops;
  }

  generateSakura(count) {
    const petals = [];
    for (let i = 0; i < count; i++) {
      petals.push({
        x: VIRTUAL_WIDTH * 0.52 + Math.random() * (VIRTUAL_WIDTH * 0.48),
        y: Math.random() * VIRTUAL_HEIGHT,
        r: 3 + Math.random() * 4,
        speedX: 20 + Math.random() * 35,
        speedY: 25 + Math.random() * 30,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: 1 + Math.random() * 2,
        alpha: 0.4 + Math.random() * 0.5
      });
    }
    return petals;
  }

  generateQuantumSparks(count) {
    const sparks = [];
    for (let i = 0; i < count; i++) {
      sparks.push({
        y: Math.random() * VIRTUAL_HEIGHT,
        offset: (Math.random() - 0.5) * 24,
        speed: 15 + Math.random() * 35,
        size: 1 + Math.random() * 2.5,
        hue: Math.random() > 0.5 ? 185 : 290 // Teal or Violet
      });
    }
    return sparks;
  }

  generateSteam(count) {
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 20,
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
      this.dayTransition += dt * 1.5;
      if (this.dayTransition >= 1.0) {
        this.dayTransition = 1.0;
        this.isTransitioningDay = false;
      }
    }

    // Rain simulation (London)
    for (const drop of this.rainDrops) {
      drop.y += drop.speed * dt;
      drop.x -= drop.speed * 0.22 * dt;
      if (drop.y > VIRTUAL_HEIGHT + 10 || drop.x < -10) {
        drop.y = -10;
        drop.x = Math.random() * (VIRTUAL_WIDTH * 0.48);
      }
    }

    // Sakura petals simulation (Tokyo)
    for (const p of this.sakuraPetals) {
      p.y += p.speedY * dt;
      p.x += Math.sin(this.animTime * 2 + p.rotation) * 12 * dt - p.speedX * dt * 0.2;
      p.rotation += p.rotSpeed * dt;
      if (p.y > VIRTUAL_HEIGHT + 10) {
        p.y = -10;
        p.x = VIRTUAL_WIDTH * 0.52 + Math.random() * (VIRTUAL_WIDTH * 0.48);
      }
    }

    // Quantum sparks drifting up the rift
    for (const s of this.quantumSparks) {
      s.y -= s.speed * dt;
      if (s.y < -10) {
        s.y = VIRTUAL_HEIGHT + 10;
        s.offset = (Math.random() - 0.5) * 26;
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

    // 1. Dual Skies (London Rainy Indigo vs Tokyo Deep Violet Night)
    this.drawDualSkies(ctx);

    // 2. Distant Skylines (Big Ben & Chimneys vs Tokyo High-rises & Red Beacon)
    this.drawDistantSkylines(ctx);

    // 3. Environmental Elements (Falling Sakura Petals in Tokyo)
    this.drawSakura(ctx);

    // 4. Exterior Architecture (Victorian Brick & Streetlamp vs Modern Tokyo Tiles & Lantern)
    this.drawExteriorArchitecture(ctx);

    // 5. Rain Streaks (London)
    this.drawRain(ctx);

    // 6. The Two Windows with Interior Rooms & Character Artwork
    this.drawWindowView(ctx, WINDOW_A, this.activityA, this.lightA, false);
    this.drawWindowView(ctx, WINDOW_B, this.activityB, this.lightB, true);

    // 7. The Central Quantum Dimensional Rift (Lightning Fracture)
    this.drawQuantumRift(ctx);

    // 8. Day Transition Overlay if active
    if (this.isTransitioningDay) {
      this.drawDayTransitionOverlay(ctx);
    }

    ctx.restore();
  }

  /**
   * 1. Dual Skies (Separated by geography and climate)
   */
  drawDualSkies(ctx) {
    ctx.save();

    // Left Half Sky: London (Misty nocturnal slate/indigo)
    const skyLondon = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
    skyLondon.addColorStop(0, '#060913');
    skyLondon.addColorStop(0.5, '#0e1424');
    skyLondon.addColorStop(1, '#181b2a');
    ctx.fillStyle = skyLondon;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH * 0.5, VIRTUAL_HEIGHT);

    // Right Half Sky: Tokyo (Deep violet night with city glow)
    const skyTokyo = ctx.createLinearGradient(VIRTUAL_WIDTH * 0.5, 0, VIRTUAL_WIDTH * 0.5, VIRTUAL_HEIGHT);
    skyTokyo.addColorStop(0, '#0a0918');
    skyTokyo.addColorStop(0.5, '#16142a');
    skyTokyo.addColorStop(1, '#251b34');
    ctx.fillStyle = skyTokyo;
    ctx.fillRect(VIRTUAL_WIDTH * 0.5, 0, VIRTUAL_WIDTH * 0.5, VIRTUAL_HEIGHT);

    // Stars across sky
    for (const star of this.stars) {
      const alpha = 0.3 + 0.5 * Math.sin(this.animTime * star.pulseSpeed + star.phase);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, alpha)})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Misty London Moon (Top Left)
    const moonAX = 140;
    const moonAY = 45;
    ctx.fillStyle = 'rgba(235, 240, 255, 0.12)';
    ctx.beginPath();
    ctx.arc(moonAX, moonAY, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dde5f5';
    ctx.beginPath();
    ctx.arc(moonAX, moonAY, 12, 0, Math.PI * 2);
    ctx.fill();

    // Bright Tokyo Crescent Moon (Top Right)
    const moonBX = 820;
    const moonBY = 45;
    ctx.fillStyle = 'rgba(255, 230, 180, 0.15)';
    ctx.beginPath();
    ctx.arc(moonBX, moonBY, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#faecc8';
    ctx.beginPath();
    ctx.arc(moonBX, moonBY, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#110f22';
    ctx.beginPath();
    ctx.arc(moonBX + 6, moonBY - 3, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 2. Distant Skylines
   */
  drawDistantSkylines(ctx) {
    ctx.save();

    // London Silhouette: Chimney stacks & Westminster clock spire
    ctx.fillStyle = '#0a0d18';
    ctx.fillRect(20, 120, 24, 180);
    ctx.fillRect(44, 145, 18, 155);
    // Clock tower silhouette
    ctx.beginPath();
    ctx.moveTo(85, 300);
    ctx.lineTo(85, 95);
    ctx.lineTo(95, 65);
    ctx.lineTo(105, 95);
    ctx.lineTo(105, 300);
    ctx.fill();
    // Clock amber face
    ctx.fillStyle = 'rgba(255, 230, 150, 0.4)';
    ctx.beginPath();
    ctx.arc(95, 105, 5, 0, Math.PI * 2);
    ctx.fill();

    // Tokyo Silhouette: Modern high-rises & Radio Tower
    ctx.fillStyle = '#0d0c1e';
    ctx.fillRect(840, 100, 36, 200);
    ctx.fillRect(880, 75, 42, 225);
    ctx.fillRect(925, 125, 35, 175);

    // Glowing modern office windows
    ctx.fillStyle = 'rgba(100, 220, 255, 0.4)';
    for (let y = 115; y < 220; y += 15) {
      ctx.fillRect(848, y, 5, 6);
      ctx.fillRect(860, y, 5, 6);
      ctx.fillRect(890, y - 10, 5, 6);
      ctx.fillRect(902, y - 10, 5, 6);
    }

    // Tokyo Radio Tower (blinking red beacon)
    const towerX = 815;
    ctx.strokeStyle = '#18152e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(towerX, 280);
    ctx.lineTo(towerX, 70);
    ctx.moveTo(towerX - 14, 280);
    ctx.lineTo(towerX, 110);
    ctx.lineTo(towerX + 14, 280);
    ctx.stroke();

    const beacon = 0.5 + 0.5 * Math.sin(this.animTime * 4.5);
    ctx.fillStyle = `rgba(255, 50, 60, ${beacon})`;
    ctx.beginPath();
    ctx.arc(towerX, 68, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 3. Drifting Sakura Petals in Tokyo
   */
  drawSakura(ctx) {
    ctx.save();
    for (const p of this.sakuraPetals) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = `rgba(255, 185, 215, ${p.alpha})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * 4. Exterior Architecture (Victorian Brick & Lamp vs Modern Tiles & Lantern)
   */
  drawExteriorArchitecture(ctx) {
    ctx.save();

    // Foundation ground
    ctx.fillStyle = '#080a12';
    ctx.fillRect(0, VIRTUAL_HEIGHT - 32, VIRTUAL_WIDTH, 32);

    // --- LONDON BUILDING (Left) ---
    // Victorian Brick Wall around Window A
    ctx.fillStyle = '#15131c';
    ctx.fillRect(0, 0, WINDOW_A.x - 12, VIRTUAL_HEIGHT);
    ctx.fillRect(WINDOW_A.x + WINDOW_A.width + 12, 0, 24, VIRTUAL_HEIGHT);

    // Brick mortar lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    for (let y = 35; y < VIRTUAL_HEIGHT - 32; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WINDOW_A.x - 12, y);
      ctx.stroke();
    }

    // Classic English Street Sign: FLEET ST • EC4
    const signAX = WINDOW_A.x - 10;
    const signAY = WINDOW_A.y + WINDOW_A.height - 40;
    ctx.fillStyle = '#211d29';
    ctx.fillRect(signAX - 32, signAY, 28, 70);
    ctx.strokeStyle = '#473d56';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(signAX - 32, signAY, 28, 70);

    ctx.save();
    ctx.translate(signAX - 18, signAY + 35);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#ded4be';
    ctx.font = 'bold 9px "Cinzel", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '1px';
    ctx.fillText('FLEET ST', 0, 3);
    ctx.restore();

    // Glowing Victorian Gas Streetlamp on left
    const lampX = 22;
    const lampY = 190;
    ctx.strokeStyle = '#2b2636';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lampX, VIRTUAL_HEIGHT - 32);
    ctx.lineTo(lampX, lampY);
    ctx.stroke();

    // Streetlamp head & warm amber bloom
    const lampGlow = ctx.createRadialGradient(lampX, lampY, 5, lampX, lampY, 65);
    lampGlow.addColorStop(0, 'rgba(255, 215, 120, 0.7)');
    lampGlow.addColorStop(0.4, 'rgba(255, 195, 90, 0.25)');
    lampGlow.addColorStop(1, 'rgba(255, 195, 90, 0)');
    ctx.fillStyle = lampGlow;
    ctx.beginPath();
    ctx.arc(lampX, lampY, 65, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd680';
    ctx.fillRect(lampX - 5, lampY - 8, 10, 16);
    ctx.fillStyle = '#1c1724';
    ctx.beginPath();
    ctx.moveTo(lampX - 8, lampY - 8);
    ctx.lineTo(lampX + 8, lampY - 8);
    ctx.lineTo(lampX, lampY - 18);
    ctx.closePath();
    ctx.fill();

    // --- TOKYO BUILDING (Right) ---
    // Modern Architectural Tile Wall around Window B
    ctx.fillStyle = '#101320';
    ctx.fillRect(WINDOW_B.x - 24, 0, 24, VIRTUAL_HEIGHT);
    ctx.fillRect(WINDOW_B.x + WINDOW_B.width + 12, 0, VIRTUAL_WIDTH - (WINDOW_B.x + WINDOW_B.width + 12), VIRTUAL_HEIGHT);

    // Architectural tile grid seams
    ctx.strokeStyle = 'rgba(70, 100, 160, 0.08)';
    ctx.lineWidth = 1.2;
    for (let y = 45; y < VIRTUAL_HEIGHT - 32; y += 45) {
      ctx.beginPath();
      ctx.moveTo(WINDOW_B.x + WINDOW_B.width + 12, y);
      ctx.lineTo(VIRTUAL_WIDTH, y);
      ctx.stroke();
    }

    // Japanese Street Sign: 桜通り 2-4 (Sakura-dori)
    const signBX = WINDOW_B.x + WINDOW_B.width + 15;
    const signBY = WINDOW_B.y + WINDOW_B.height - 45;
    ctx.fillStyle = '#1b2238';
    ctx.fillRect(signBX, signBY, 30, 80);
    ctx.strokeStyle = '#3d4d75';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(signBX, signBY, 30, 80);

    ctx.save();
    ctx.fillStyle = '#7de8ff';
    ctx.font = 'bold 10px "Hiragino Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('桜', signBX + 15, signBY + 22);
    ctx.fillText('通', signBX + 15, signBY + 42);
    ctx.fillText('り', signBX + 15, signBY + 62);
    ctx.restore();

    // Glowing Japanese Izakaya Lantern (Red/Vermilion glow)
    const lanternX = WINDOW_B.x + WINDOW_B.width + 28;
    const lanternY = 165;
    const lanternPulse = 0.85 + 0.15 * Math.sin(this.animTime * 3);

    const redGlow = ctx.createRadialGradient(lanternX, lanternY, 8, lanternX, lanternY, 70);
    redGlow.addColorStop(0, `rgba(255, 65, 55, ${0.65 * lanternPulse})`);
    redGlow.addColorStop(0.5, `rgba(255, 65, 55, ${0.2 * lanternPulse})`);
    redGlow.addColorStop(1, 'rgba(255, 65, 55, 0)');
    ctx.fillStyle = redGlow;
    ctx.beginPath();
    ctx.arc(lanternX, lanternY, 70, 0, Math.PI * 2);
    ctx.fill();

    // Paper lantern body
    ctx.fillStyle = '#d9382e';
    ctx.beginPath();
    ctx.ellipse(lanternX, lanternY, 14, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    // Black wooden rims
    ctx.fillStyle = '#14121b';
    ctx.fillRect(lanternX - 10, lanternY - 24, 20, 4);
    ctx.fillRect(lanternX - 10, lanternY + 20, 20, 4);
    // Kanji on lantern: 居酒屋
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px "Hiragino Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('酒', lanternX, lanternY + 3);

    // Sakura branch blooming over the window
    ctx.strokeStyle = '#382b28';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(VIRTUAL_WIDTH, 70);
    ctx.quadraticCurveTo(WINDOW_B.x + WINDOW_B.width + 10, 85, WINDOW_B.x + WINDOW_B.width - 25, 60);
    ctx.stroke();

    // Blossom buds on branch
    ctx.fillStyle = '#ffb3cc';
    const buds = [
      [WINDOW_B.x + WINDOW_B.width - 15, 62],
      [WINDOW_B.x + WINDOW_B.width - 5, 75],
      [WINDOW_B.x + WINDOW_B.width + 12, 80]
    ];
    for (const [bx, by] of buds) {
      ctx.beginPath();
      ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * 5. Rain Streaks (London)
   */
  drawRain(ctx) {
    ctx.save();
    ctx.lineWidth = 1.3;
    for (const drop of this.rainDrops) {
      ctx.strokeStyle = `rgba(180, 215, 255, ${drop.alpha})`;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - drop.len * 0.22, drop.y + drop.len);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * 6. The Central Quantum Dimensional Rift (Lightning Fracture)
   * Visually cracks the two worlds apart across 9,560 km
   */
  drawQuantumRift(ctx) {
    const centerX = VIRTUAL_WIDTH * 0.5;
    ctx.save();

    // 1. Quantum Ethereal Glow along center rift
    const riftGlow = ctx.createLinearGradient(centerX - 35, 0, centerX + 35, 0);
    riftGlow.addColorStop(0, 'rgba(80, 220, 255, 0)');
    riftGlow.addColorStop(0.35, 'rgba(80, 220, 255, 0.18)');
    riftGlow.addColorStop(0.5, 'rgba(215, 120, 255, 0.3)');
    riftGlow.addColorStop(0.65, 'rgba(215, 120, 255, 0.18)');
    riftGlow.addColorStop(1, 'rgba(215, 120, 255, 0)');
    ctx.fillStyle = riftGlow;
    ctx.fillRect(centerX - 35, 0, 70, VIRTUAL_HEIGHT);

    // 2. Jagged Lightning Fracture Line
    const segments = 16;
    const segH = VIRTUAL_HEIGHT / segments;
    ctx.strokeStyle = 'rgba(210, 245, 255, 0.85)';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = '#5eead4';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(centerX, 0);

    for (let i = 1; i <= segments; i++) {
      const y = i * segH;
      // Procedural jagged lightning offset animated with time
      const noise = Math.sin(i * 1.8 + this.animTime * 4.5) * 8 + Math.cos(i * 3.1) * 6;
      ctx.lineTo(centerX + noise, y);
    }
    ctx.stroke();

    // 3. Floating Quantum Sparks rising up the rift
    ctx.shadowBlur = 6;
    for (const s of this.quantumSparks) {
      const sparkX = centerX + s.offset + Math.sin(this.animTime * 3 + s.y * 0.05) * 4;
      ctx.shadowColor = s.hue === 185 ? '#22d3ee' : '#e879f9';
      ctx.fillStyle = s.hue === 185 ? '#a5f3fc' : '#f5d0fe';
      ctx.beginPath();
      ctx.arc(sparkX, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * 7. Window Rendering (Leo in London vs Mia in Tokyo)
   */
  drawWindowView(ctx, win, activityCode, lightVal, isMia) {
    const rx = win.x;
    const ry = win.y;
    const rw = win.width;
    const rh = win.height;

    ctx.save();

    // 1. Draw Architectural Header ABOVE window (Large bold character name & city)
    this.drawWindowHeader(ctx, win, lightVal, isMia);

    // 2. Interior Room Rendering (clipped strictly to window interior)
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, ry, rw, rh);
    ctx.clip();

    // Interior Room Background (Dark when light off; Warm glowing when light on)
    const roomGrad = ctx.createLinearGradient(rx, ry, rx, ry + rh);
    if (!isMia) {
      // Leo's London Room (Warm vintage olive & amber)
      const topCol = this.lerpColor('#0d101a', '#22191b', lightVal);
      const botCol = this.lerpColor('#141824', '#382622', lightVal);
      roomGrad.addColorStop(0, topCol);
      roomGrad.addColorStop(1, botCol);
    } else {
      // Mia's Tokyo Room (Blush lavender & warm cream)
      const topCol = this.lerpColor('#0d0c18', '#24172a', lightVal);
      const botCol = this.lerpColor('#151226', '#3e243a', lightVal);
      roomGrad.addColorStop(0, topCol);
      roomGrad.addColorStop(1, botCol);
    }
    ctx.fillStyle = roomGrad;
    ctx.fillRect(rx, ry, rw, rh);

    // Floorboards
    ctx.fillStyle = isMia ? '#2b1c2b' : '#281d19';
    ctx.fillRect(rx, ry + rh - 75, rw, 75);

    // Render Character Activity
    if (lightVal > 0.02) {
      ctx.save();
      ctx.globalAlpha = lightVal;
      if (!isMia) {
        // Leo's Activities
        switch (activityCode) {
          case 0: this.drawLeoBed(ctx, rx, ry, rw, rh); break;
          case 1: this.drawLeoThinking(ctx, rx, ry, rw, rh); break;
          case 2: this.drawLeoGaming(ctx, rx, ry, rw, rh); break;
          case 3: this.drawLeoCooking(ctx, rx, ry, rw, rh); break;
        }
      } else {
        // Mia's Activities (Distinct artwork, plushie, fairy lights, cat)
        switch (activityCode) {
          case 0: this.drawMiaBed(ctx, rx, ry, rw, rh); break;
          case 1: this.drawMiaThinking(ctx, rx, ry, rw, rh); break;
          case 2: this.drawMiaGaming(ctx, rx, ry, rw, rh); break;
          case 3: this.drawMiaCooking(ctx, rx, ry, rw, rh); break;
        }
      }
      ctx.restore();
    } else {
      // Light is OFF: draw mysterious nocturnal silhouette
      this.drawUnlitSilhouette(ctx, rx, ry, rw, rh, isMia);
    }

    ctx.restore(); // ends room clip

    // 3. PHYSICAL WINDOW CASING & CROSS MULLIONS (DRAWN ON TOP OF ROOM)
    this.drawWindowPanesAndFrame(ctx, win, lightVal, isMia);

    // 4. Glass sheen & reflections across the 4 panes
    this.drawGlassReflections(ctx, rx, ry, rw, rh, lightVal, isMia);

    // 5. Light spill onto outside walls when light is ON
    if (lightVal > 0.05) {
      this.drawLightSpill(ctx, win, lightVal, isMia);
    }

    // 6. Interactive Window Footer & Hotkey Pill
    this.drawWindowFooter(ctx, win, lightVal, isMia);

    ctx.restore();
  }

  drawWindowHeader(ctx, win, lightVal, isMia) {
    ctx.save();
    const charName = isMia ? 'MIA' : 'LEO';
    const cityTitle = isMia ? 'TOKYO • 桜通り' : 'LONDON • FLEET ST';
    const accentCol = isMia ? '#f472b6' : '#60a5fa';
    const glowCol = isMia ? 'rgba(244, 114, 182, 0.4)' : 'rgba(96, 165, 250, 0.4)';

    // Large bold character name (very prominent & clear)
    ctx.font = 'bold 22px "Cinzel", Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = accentCol;
    ctx.shadowColor = glowCol;
    ctx.shadowBlur = 10;
    ctx.fillText(charName, win.x + 4, win.y - 18);

    // City & Street subtitle
    ctx.font = 'bold 12px "Cinzel", Georgia, serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.shadowBlur = 0;
    const nameWidth = ctx.measureText(charName).width;
    ctx.fillText(`— ${cityTitle}`, win.x + nameWidth + 18, win.y - 19);

    ctx.restore();
  }

  drawWindowPanesAndFrame(ctx, win, lightVal, isMia) {
    ctx.save();
    const frameCol = isMia ? '#1a2030' : '#271d22';
    const frameHighlight = isMia ? '#2e3a54' : '#45333c';
    const frameShadow = isMia ? '#0f131d' : '#140e11';

    // 1. Thick Outer Window Casing Border
    ctx.strokeStyle = frameCol;
    ctx.lineWidth = 14;
    ctx.strokeRect(win.x, win.y, win.width, win.height);

    // Inner bevel rim
    ctx.strokeStyle = frameHighlight;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(win.x + 7, win.y + 7, win.width - 14, win.height - 14);

    // 2. Window Sill at bottom with 3D bevels
    ctx.fillStyle = isMia ? '#2b364e' : '#42313b';
    ctx.fillRect(win.x - 14, win.y + win.height, win.width + 28, 20);
    // Sill top highlight
    ctx.fillStyle = isMia ? '#46567a' : '#5e4854';
    ctx.fillRect(win.x - 14, win.y + win.height, win.width + 28, 3);
    // Sill bottom shadow
    ctx.fillStyle = '#06080e';
    ctx.fillRect(win.x - 14, win.y + win.height + 17, win.width + 28, 3);

    // 3. Central Vertical Mullion (divides left & right glass panes)
    const midX = win.x + win.width / 2;
    ctx.fillStyle = frameCol;
    ctx.fillRect(midX - 5, win.y, 10, win.height);
    // 3D vertical highlights
    ctx.fillStyle = frameHighlight;
    ctx.fillRect(midX - 5, win.y, 2, win.height);
    ctx.fillStyle = frameShadow;
    ctx.fillRect(midX + 3, win.y, 2, win.height);

    // 4. Horizontal Transom Crossbar (divides upper & lower glass panes)
    const midY = win.y + win.height * 0.44;
    ctx.fillStyle = frameCol;
    ctx.fillRect(win.x, midY - 5, win.width, 10);
    // 3D horizontal highlights
    ctx.fillStyle = frameHighlight;
    ctx.fillRect(win.x, midY - 5, win.width, 2);
    ctx.fillStyle = frameShadow;
    ctx.fillRect(win.x, midY + 3, win.width, 2);

    // 5. Central Brass Sash Latch/Lock in the intersection of the cross
    ctx.fillStyle = '#c5a044';
    ctx.fillRect(midX - 7, midY - 7, 14, 14);
    ctx.strokeStyle = '#ffe89e';
    ctx.lineWidth = 1;
    ctx.strokeRect(midX - 7, midY - 7, 14, 14);
    ctx.fillStyle = '#42320b';
    ctx.beginPath();
    ctx.arc(midX, midY, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawGlassReflections(ctx, x, y, w, h, lightVal, isMia) {
    ctx.save();
    const alpha = (1.0 - lightVal) * 0.16 + 0.04;
    const glassGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    glassGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 1.5})`);
    glassGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    glassGrad.addColorStop(1, `rgba(255, 255, 255, ${alpha})`);

    ctx.fillStyle = glassGrad;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  drawLightSpill(ctx, win, lightVal, isMia) {
    ctx.save();
    const spill = ctx.createRadialGradient(
      win.x + win.width / 2, win.y + win.height / 2, win.width * 0.3,
      win.x + win.width / 2, win.y + win.height / 2, win.width * 0.8
    );
    const col = isMia ? '255, 200, 220' : '255, 215, 140';
    spill.addColorStop(0, `rgba(${col}, ${0.2 * lightVal})`);
    spill.addColorStop(1, `rgba(${col}, 0)`);
    ctx.fillStyle = spill;
    ctx.fillRect(win.x - 40, win.y - 40, win.width + 80, win.height + 80);
    ctx.restore();
  }

  drawUnlitSilhouette(ctx, x, y, w, h, isMia) {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 8, 15, 0.78)';
    const cx = isMia ? x + 110 : x + w - 110;
    ctx.fillRect(x + 40, y + h - 140, w - 80, 65);
    ctx.beginPath();
    ctx.arc(cx, y + h - 130, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawWindowFooter(ctx, win, lightVal, isMia) {
    ctx.save();
    const isHovered = (this.hoverWindow === (isMia ? 'B' : 'A'));
    const isLit = lightVal > 0.5;

    if (isHovered) {
      ctx.strokeStyle = isMia ? '#f472b6' : '#60a5fa';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(win.x - 2, win.y - 2, win.width + 4, win.height + 4);
      ctx.setLineDash([]);
    }

    const badgeX = win.x + win.width / 2;
    const badgeY = win.y + win.height + 25;
    const stateText = isLit ? 'Light: ON' : 'Light: OFF';
    const badgeText = `[${win.keyLabel}] ${win.character}'s Room • ${stateText}`;

    ctx.font = 'bold 11px system-ui, sans-serif';
    const tw = ctx.measureText(badgeText).width;

    ctx.fillStyle = isLit ? 'rgba(38, 30, 18, 0.95)' : 'rgba(15, 18, 28, 0.95)';
    ctx.beginPath();
    ctx.roundRect(badgeX - tw / 2 - 12, badgeY - 11, tw + 24, 22, 11);
    ctx.fill();

    ctx.strokeStyle = isLit ? '#d4af37' : 'rgba(100, 130, 180, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = isLit ? '#ffe69c' : '#cbd5e1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, badgeX, badgeY);

    ctx.restore();
  }

  /* -------------------------------------------------------------
   * LEO'S ARTWORK (London Flat: Bohemian, Books, Cast Iron, Ivy)
   * ------------------------------------------------------------- */

  drawLeoBed(ctx, x, y, w, h) {
    ctx.save();
    const lampX = x + 70;
    const lampY = y + h - 170;

    // Gooseneck reading lamp warm bloom
    const glow = ctx.createRadialGradient(lampX, lampY, 10, lampX, lampY, 180);
    glow.addColorStop(0, 'rgba(255, 225, 150, 0.85)');
    glow.addColorStop(0.4, 'rgba(255, 200, 120, 0.32)');
    glow.addColorStop(1, 'rgba(255, 200, 120, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lampX, lampY, 180, 0, Math.PI * 2);
    ctx.fill();

    // Bookshelf with vintage books on wall
    ctx.fillStyle = '#382a22';
    ctx.fillRect(x + 50, y + 60, 130, 12);
    const bookColors = ['#8f3a3a', '#2d4a3e', '#b38234', '#423d6b', '#6b3d4f'];
    bookColors.forEach((col, idx) => {
      ctx.fillStyle = col;
      ctx.fillRect(x + 55 + idx * 22, y + 25, 18, 35);
    });

    // Nightstand & retro clock
    ctx.fillStyle = '#3a2b22';
    ctx.fillRect(lampX - 25, lampY + 35, 50, 50);
    ctx.fillStyle = '#bfa163';
    ctx.fillRect(lampX - 3, lampY, 6, 35);

    // Bed with dark green quilt
    const bedX = x + 95;
    const bedY = y + h - 160;
    ctx.fillStyle = '#3d2d25';
    ctx.fillRect(bedX, bedY - 35, 18, 110); // Wooden headboard

    // Pillow
    ctx.fillStyle = '#dedad2';
    ctx.beginPath();
    ctx.ellipse(bedX + 35, bedY + 14, 28, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Leo sleeping (messy brown hair)
    ctx.fillStyle = '#3d271d';
    ctx.beginPath();
    ctx.arc(bedX + 42, bedY + 10, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ecd0b8';
    ctx.beginPath();
    ctx.arc(bedX + 46, bedY + 12, 10, 0, Math.PI * 2);
    ctx.fill();

    // Open paperback book fallen on quilt
    ctx.fillStyle = '#f0e6d2';
    ctx.fillRect(bedX + 115, bedY + 22, 24, 14);

    // Breathing dark forest green quilt
    const breath = Math.sin(this.animTime * 1.8) * 2.5;
    ctx.fillStyle = '#263b32';
    ctx.beginPath();
    ctx.moveTo(bedX + 45, bedY + 20 + breath);
    ctx.quadraticCurveTo(bedX + 120, bedY + 10 + breath, bedX + 230, bedY + 22);
    ctx.lineTo(bedX + 230, bedY + 55);
    ctx.lineTo(bedX + 45, bedY + 55);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawThoughtBubble(ctx, bubbleX, bubbleY, width, height, targetIsMia) {
    ctx.save();
    const floatY = Math.sin(this.animTime * 2.2) * 3;
    const cx = bubbleX + width / 2;
    const cy = bubbleY + height / 2 + floatY;

    // Thought trail puffs rising to the cloud
    const puffs = targetIsMia
      ? [
          { x: bubbleX - 16, y: bubbleY + height + 18, r: 4 },
          { x: bubbleX - 9, y: bubbleY + height + 7, r: 7 },
          { x: bubbleX - 2, y: bubbleY + height - 4, r: 10 }
        ]
      : [
          { x: bubbleX + width + 16, y: bubbleY + height + 18, r: 4 },
          { x: bubbleX + width + 9, y: bubbleY + height + 7, r: 7 },
          { x: bubbleX + width + 2, y: bubbleY + height - 4, r: 10 }
        ];

    // Soft puff shadows and fills
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowColor = targetIsMia ? 'rgba(244, 114, 182, 0.5)' : 'rgba(212, 175, 55, 0.5)';
    ctx.shadowBlur = 10;

    for (const p of puffs) {
      ctx.beginPath();
      ctx.arc(p.x, p.y + floatY * 0.5, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fluffy cloud body
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY + floatY, width, height, height * 0.45);
    ctx.fill();

    // Cloud puffs around perimeter
    const cloudLumps = [
      { x: bubbleX + width * 0.22, y: bubbleY + floatY - 6, r: height * 0.35 },
      { x: bubbleX + width * 0.5, y: bubbleY + floatY - 9, r: height * 0.42 },
      { x: bubbleX + width * 0.78, y: bubbleY + floatY - 6, r: height * 0.35 },
      { x: bubbleX + width * 0.2, y: bubbleY + floatY + height + 3, r: height * 0.3 },
      { x: bubbleX + width * 0.5, y: bubbleY + floatY + height + 5, r: height * 0.35 },
      { x: bubbleX + width * 0.8, y: bubbleY + floatY + height + 3, r: height * 0.3 }
    ];
    for (const cl of cloudLumps) {
      ctx.beginPath();
      ctx.arc(cl.x, cl.y, cl.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;

    // Inside the thought bubble: cute portrait of the other lover!
    if (targetIsMia) {
      // Leo thinking of Mia!
      const px = cx - 18;
      const py = cy;

      // Mia cute face
      ctx.fillStyle = '#fce7dc';
      ctx.beginPath();
      ctx.arc(px, py, 18, 0, Math.PI * 2);
      ctx.fill();

      // Blushing cheeks
      ctx.fillStyle = 'rgba(251, 113, 133, 0.55)';
      ctx.beginPath();
      ctx.arc(px - 9, py + 4, 4.5, 0, Math.PI * 2);
      ctx.arc(px + 9, py + 4, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Mia dark hair with cute top bun
      ctx.fillStyle = '#1e1c24';
      ctx.beginPath();
      ctx.arc(px, py - 4, 19, Math.PI * 0.8, Math.PI * 2.2);
      ctx.fill();
      // Bun
      ctx.beginPath();
      ctx.arc(px + 2, py - 20, 9, 0, Math.PI * 2);
      ctx.fill();
      // Red hairpin chopstick
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(px - 10, py - 24);
      ctx.lineTo(px + 14, py - 16);
      ctx.stroke();

      // Happy curved closed eyes ^ _ ^
      ctx.strokeStyle = '#1e1c24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px - 6, py - 1, 3.5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px + 6, py - 1, 3.5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      // Cute smile
      ctx.beginPath();
      ctx.arc(px, py + 4, 4, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();

      // Floating pink hearts next to Mia
      const h1Y = cy - 14 + Math.sin(this.animTime * 3) * 3;
      const h2Y = cy + 10 + Math.cos(this.animTime * 2.5) * 3;
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#f43f5e';
      ctx.fillText('♥', cx + 18, h1Y);
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#fb7185';
      ctx.fillText('♥', cx + 32, h2Y);
    } else {
      // Mia thinking of Leo!
      const px = cx + 18;
      const py = cy;

      // Leo cute face
      ctx.fillStyle = '#ecd0b8';
      ctx.beginPath();
      ctx.arc(px, py, 18, 0, Math.PI * 2);
      ctx.fill();

      // Blushing cheeks
      ctx.fillStyle = 'rgba(251, 146, 60, 0.45)';
      ctx.beginPath();
      ctx.arc(px - 9, py + 4, 4.5, 0, Math.PI * 2);
      ctx.arc(px + 9, py + 4, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Leo messy dark curls
      ctx.fillStyle = '#3d271d';
      ctx.beginPath();
      ctx.arc(px, py - 5, 20, Math.PI * 0.8, Math.PI * 2.2);
      ctx.fill();
      const curls = [
        [px - 14, py - 12, 6],
        [px - 4, py - 20, 7],
        [px + 8, py - 18, 6.5],
        [px + 15, py - 10, 6]
      ];
      for (const [cuX, cuY, cuR] of curls) {
        ctx.beginPath();
        ctx.arc(cuX, cuY, cuR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Round wire glasses
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(px - 6, py - 1, 5, 0, Math.PI * 2);
      ctx.arc(px + 6, py - 1, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px - 1, py - 1);
      ctx.lineTo(px + 1, py - 1);
      ctx.stroke();

      // Happy curved closed eyes ^ _ ^ behind glasses
      ctx.strokeStyle = '#3d271d';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(px - 6, py - 1, 2.5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px + 6, py - 1, 2.5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      // Cute smile
      ctx.beginPath();
      ctx.arc(px, py + 5, 4, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();

      // Floating golden/warm hearts next to Leo
      const h1Y = cy - 14 + Math.sin(this.animTime * 3) * 3;
      const h2Y = cy + 10 + Math.cos(this.animTime * 2.5) * 3;
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#eab308';
      ctx.fillText('♥', cx - 28, h1Y);
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('♥', cx - 38, h2Y);
    }

    ctx.restore();
  }

  drawLeoThinking(ctx, x, y, w, h) {
    ctx.save();
    const lampX = x + w - 90;
    const lampY = y + 70;

    // Pendant lamp
    const glow = ctx.createRadialGradient(lampX, lampY, 10, lampX, lampY + 100, 200);
    glow.addColorStop(0, 'rgba(255, 230, 160, 0.78)');
    glow.addColorStop(0.35, 'rgba(255, 200, 120, 0.3)');
    glow.addColorStop(1, 'rgba(255, 200, 120, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lampX, lampY + 90, 190, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#28201a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lampX, y);
    ctx.lineTo(lampX, lampY);
    ctx.stroke();

    // Wooden desk & steaming hot mug
    const deskX = x + w - 210;
    const deskY = y + h - 170;
    ctx.fillStyle = '#4a3b32';
    ctx.fillRect(deskX, deskY, 175, 16);

    // Steaming ceramic mug
    ctx.fillStyle = '#dedad2';
    ctx.fillRect(deskX + 130, deskY - 14, 12, 14);
    const steamAlpha = 0.3 + 0.3 * Math.sin(this.animTime * 3);
    ctx.strokeStyle = `rgba(255, 255, 255, ${steamAlpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(deskX + 136, deskY - 15);
    ctx.quadraticCurveTo(deskX + 132, deskY - 26, deskX + 138, deskY - 34);
    ctx.stroke();

    // Leo leaning on hand, looking daydreamy
    const charX = deskX + 50;
    const charY = deskY - 30;

    // Chunky knitted wool jumper (mustard/tan)
    ctx.fillStyle = '#8f6e3c';
    ctx.beginPath();
    ctx.ellipse(charX, charY + 28, 22, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arm leaning on chin
    ctx.strokeStyle = '#8f6e3c';
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(charX + 5, charY + 24);
    ctx.lineTo(charX - 18, charY + 12);
    ctx.lineTo(charX - 12, charY - 8);
    ctx.stroke();

    // Leo head & messy curls
    ctx.fillStyle = '#ecd0b8';
    ctx.beginPath();
    ctx.arc(charX, charY - 8, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3d271d';
    ctx.beginPath();
    ctx.arc(charX + 2, charY - 12, 15, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();

    // Floating Thought Bubble: Leo thinking of Mia!
    this.drawThoughtBubble(ctx, deskX - 70, deskY - 145, 140, 90, true);

    ctx.restore();
  }

  drawLeoGaming(ctx, x, y, w, h) {
    ctx.save();
    const deskX = x + w - 230;
    const deskY = y + h - 165;
    const screenX = deskX + 105;
    const screenY = deskY - 45;

    // Glowing arcade screen flare radiating onto the room
    const pulse = 0.85 + 0.15 * Math.sin(this.animTime * 8);
    const screenGrad = ctx.createRadialGradient(screenX, screenY, 15, screenX, screenY, 160);
    screenGrad.addColorStop(0, `rgba(56, 189, 248, ${0.7 * pulse})`);
    screenGrad.addColorStop(0.4, `rgba(168, 85, 247, ${0.4 * pulse})`);
    screenGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = screenGrad;
    ctx.beginPath();
    ctx.arc(screenX, screenY, 160, 0, Math.PI * 2);
    ctx.fill();

    // Wooden desk
    ctx.fillStyle = '#3a2d24';
    ctx.fillRect(deskX - 10, deskY, 195, 14);

    // Gaming PC Monitor with stand
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(screenX - 35, screenY - 28, 70, 48); // Bezel
    ctx.fillRect(screenX - 6, screenY + 20, 12, 10);  // Stand
    ctx.fillRect(screenX - 16, screenY + 28, 32, 4);  // Base

    // Pixel retro arcade game inside monitor screen!
    ctx.fillStyle = '#090d16';
    ctx.fillRect(screenX - 31, screenY - 24, 62, 40); // Screen glass

    // 1. Arcade score & health hearts
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 7px sans-serif';
    ctx.fillText('♥♥♥', screenX - 28, screenY - 16);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 6px monospace';
    ctx.fillText('4200', screenX + 8, screenY - 16);

    // 2. Pixel starfield / platforms
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(screenX - 10, screenY - 8, 2, 2);
    ctx.fillRect(screenX + 15, screenY - 4, 2, 2);
    ctx.fillRect(screenX - 20, screenY + 5, 2, 2);

    // 3. Pixel Spaceship / Hero
    const shipAnimX = Math.sin(this.animTime * 4) * 8;
    ctx.fillStyle = '#22c55e'; // Green hero ship
    ctx.fillRect(screenX - 4 + shipAnimX, screenY + 6, 8, 5);
    ctx.fillStyle = '#a855f7'; // Alien target
    ctx.fillRect(screenX - 6 - shipAnimX, screenY - 6, 12, 6);

    // 4. Laser beam firing!
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(screenX + shipAnimX, screenY + 5);
    ctx.lineTo(screenX + shipAnimX, screenY - 2);
    ctx.stroke();

    // Leo sitting in gaming chair focused
    const charX = deskX + 35;
    const charY = deskY - 35;

    // Gaming chair back
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.roundRect(charX - 18, charY - 30, 26, 68, 6);
    ctx.fill();

    // Hoodie / jumper body
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.ellipse(charX, charY + 18, 18, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Leo's head & messy curls
    ctx.fillStyle = '#ecd0b8';
    ctx.beginPath();
    ctx.arc(charX + 2, charY - 10, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3d271d';
    ctx.beginPath();
    ctx.arc(charX + 2, charY - 13, 14, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();

    // Over-ear Gaming Headphones!
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(charX + 2, charY - 12, 14, Math.PI * 0.8, Math.PI * 2.2);
    ctx.stroke();
    // Blue headphone earcup
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(charX + 11, charY - 10, 5, 0, Math.PI * 2);
    ctx.fill();

    // Handheld Gamepad / Controller in Leo's hands!
    const padX = charX + 22;
    const padY = charY + 16;
    // Controller body (ergonomic black gamepad)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(padX - 8, padY - 6, 18, 12, 4);
    ctx.fill();
    // Glowing colorful buttons on controller!
    ctx.fillStyle = '#ef4444'; // Red button
    ctx.fillRect(padX + 4, padY - 3, 2, 2);
    ctx.fillStyle = '#38bdf8'; // Blue button
    ctx.fillRect(padX + 1, padY, 2, 2);
    ctx.fillStyle = '#22c55e'; // Green button
    ctx.fillRect(padX - 4, padY - 3, 2, 2);

    // Arms reaching to controller
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(charX - 4, charY + 14);
    ctx.lineTo(padX - 4, padY);
    ctx.stroke();

    ctx.restore();
  }

  drawLeoCooking(ctx, x, y, w, h) {
    ctx.save();
    const lampX = x + w - 150;
    const lampY = y + 70;

    const glow = ctx.createRadialGradient(lampX, lampY + 40, 15, lampX, lampY + 120, 210);
    glow.addColorStop(0, 'rgba(255, 230, 150, 0.8)');
    glow.addColorStop(0.4, 'rgba(255, 195, 90, 0.32)');
    glow.addColorStop(1, 'rgba(255, 195, 90, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lampX, lampY + 100, 210, 0, Math.PI * 2);
    ctx.fill();

    // Rustic wooden counter
    const counterX = x + w - 240;
    const counterY = y + h - 160;
    const stoveX = counterX + 140;

    ctx.fillStyle = '#382b22';
    ctx.fillRect(counterX, counterY, 200, 75);
    ctx.fillStyle = '#8f7a68';
    ctx.fillRect(counterX - 5, counterY - 10, 210, 12);

    // Cutting board with garlic & herbs
    ctx.fillStyle = '#a68058';
    ctx.fillRect(counterX + 15, counterY - 14, 30, 5);

    // Cast iron pot on stove
    ctx.fillStyle = 'rgba(255, 120, 40, 0.85)';
    ctx.beginPath();
    ctx.ellipse(stoveX, counterY - 13, 16, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#26282b';
    ctx.fillRect(stoveX - 18, counterY - 35, 36, 22);

    // Rising steam curls
    for (const p of this.steamA) {
      const curY = (p.y - this.animTime * 25 * p.speed) % 65;
      const curX = stoveX + p.x + Math.sin(this.animTime * 2.5 + p.phase) * 6;
      const alpha = Math.max(0, 0.45 * (1 + curY / 65));
      ctx.fillStyle = `rgba(240, 245, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(curX, counterY - 38 + curY, p.r * (1 - curY / 100), 0, Math.PI * 2);
      ctx.fill();
    }

    // Leo stirring with wooden spoon
    const cookX = counterX + 70;
    const cookY = counterY - 60;

    ctx.fillStyle = '#7c2d37'; // Burgundy shirt
    ctx.beginPath();
    ctx.ellipse(cookX, cookY + 30, 18, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wooden spoon
    ctx.strokeStyle = '#b3844d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cookX + 12, cookY + 22);
    ctx.lineTo(stoveX, counterY - 26);
    ctx.stroke();

    ctx.fillStyle = '#ecd0b8';
    ctx.beginPath();
    ctx.arc(cookX, cookY, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3d271d';
    ctx.beginPath();
    ctx.arc(cookX, cookY - 3, 15, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();

    ctx.restore();
  }

  /* -------------------------------------------------------------
   * MIA'S ARTWORK (Tokyo Room: Fairy Lights, Plushie, Cat, Pastel)
   * ------------------------------------------------------------- */

  drawMiaBed(ctx, x, y, w, h) {
    ctx.save();
    const lampX = x + w - 70;
    const lampY = y + h - 170;

    // Glowing string fairy lights around headboard
    const fairyGlow = ctx.createRadialGradient(lampX, lampY, 10, lampX, lampY, 190);
    fairyGlow.addColorStop(0, 'rgba(255, 215, 235, 0.85)');
    fairyGlow.addColorStop(0.4, 'rgba(244, 114, 182, 0.25)');
    fairyGlow.addColorStop(1, 'rgba(244, 114, 182, 0)');
    ctx.fillStyle = fairyGlow;
    ctx.beginPath();
    ctx.arc(lampX, lampY, 190, 0, Math.PI * 2);
    ctx.fill();

    // Fairy light bulbs strung above bed
    const bedX = x + 35;
    const bedY = y + h - 160;
    const bulbCols = ['#fbcfe8', '#fef08a', '#c7d2fe', '#fed7aa'];
    for (let i = 0; i < 7; i++) {
      const bx = bedX + 25 + i * 28;
      const by = bedY - 45 + Math.sin(i * 0.8) * 8;
      ctx.fillStyle = bulbCols[i % bulbCols.length];
      ctx.beginPath();
      ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Modern light wood bed & plush headboard
    ctx.fillStyle = '#e2d5c5';
    ctx.beginPath();
    ctx.roundRect(bedX + 195, bedY - 35, 18, 110, 6);
    ctx.fill();

    // Fluffy pink & white pillows
    ctx.fillStyle = '#fce7f3';
    ctx.beginPath();
    ctx.ellipse(bedX + 165, bedY + 14, 28, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mia sleeping (hair tied in cute soft bun with clip)
    ctx.fillStyle = '#1e1c24';
    ctx.beginPath();
    ctx.arc(bedX + 160, bedY + 8, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fce7dc';
    ctx.beginPath();
    ctx.arc(bedX + 156, bedY + 10, 9, 0, Math.PI * 2);
    ctx.fill();

    // Cute plushie (totoro / bear) tucked into the bed
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(bedX + 130, bedY + 20, 10, 0, Math.PI * 2);
    ctx.fill();
    // Plushie ears
    ctx.beginPath();
    ctx.arc(bedX + 125, bedY + 11, 3.5, 0, Math.PI * 2);
    ctx.arc(bedX + 135, bedY + 11, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Soft pastel pink & cream duvet with gentle breathing
    const breath = Math.sin(this.animTime * 1.8) * 2.5;
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(bedX, bedY + 22);
    ctx.quadraticCurveTo(bedX + 110, bedY + 10 + breath, bedX + 175, bedY + 20 + breath);
    ctx.lineTo(bedX + 175, bedY + 55);
    ctx.lineTo(bedX, bedY + 55);
    ctx.closePath();
    ctx.fill();

    // Sleeping ginger cat curled at the foot of the bed
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.ellipse(bedX + 35, bedY + 38, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bedX + 24, bedY + 34, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawMiaThinking(ctx, x, y, w, h) {
    ctx.save();
    const lampX = x + 90;
    const lampY = y + 70;

    const glow = ctx.createRadialGradient(lampX, lampY, 10, lampX, lampY + 100, 200);
    glow.addColorStop(0, 'rgba(255, 220, 240, 0.75)');
    glow.addColorStop(0.35, 'rgba(244, 114, 182, 0.28)');
    glow.addColorStop(1, 'rgba(244, 114, 182, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lampX, lampY + 90, 190, 0, Math.PI * 2);
    ctx.fill();

    // Modern light birch window sill seat
    const deskX = x + 40;
    const deskY = y + h - 170;
    ctx.fillStyle = '#fbcfe8'; // Cushioned window seat
    ctx.beginPath();
    ctx.roundRect(deskX, deskY - 10, 175, 24, 6);
    ctx.fill();

    // Potted indoor monstera plant
    ctx.fillStyle = '#fb923c'; // Terracotta pot
    ctx.fillRect(deskX + 15, deskY - 24, 16, 14);
    ctx.fillStyle = '#15803d'; // Green leaves
    ctx.beginPath();
    ctx.arc(deskX + 23, deskY - 30, 12, 0, Math.PI * 2);
    ctx.fill();

    // Mia sitting cross-legged on the window seat, looking out towards London
    const charX = deskX + 105;
    const charY = deskY - 30;

    // Cozy oversized lavender knit sweater
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.ellipse(charX, charY + 24, 20, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Holding glowing smartphone with chat screen
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(charX - 16, charY + 18, 10, 16);
    // Glowing chat screen reflection
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(charX - 15, charY + 19, 8, 14);

    // Hand to cheek looking out
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(charX - 6, charY + 22);
    ctx.lineTo(charX - 22, charY + 10);
    ctx.lineTo(charX - 16, charY - 8);
    ctx.stroke();

    // Mia head & cute bun
    ctx.fillStyle = '#fce7dc';
    ctx.beginPath();
    ctx.arc(charX - 6, charY - 8, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e1c24';
    ctx.beginPath();
    ctx.arc(charX - 6, charY - 11, 14, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();
    // Bun on top
    ctx.beginPath();
    ctx.arc(charX - 4, charY - 22, 7, 0, Math.PI * 2);
    ctx.fill();

    // Floating Thought Bubble: Mia thinking of Leo!
    this.drawThoughtBubble(ctx, deskX + 130, deskY - 145, 140, 90, false);

    ctx.restore();
  }

  drawMiaGaming(ctx, x, y, w, h) {
    ctx.save();
    const deskX = x + 50;
    const deskY = y + h - 165;
    const screenX = deskX + 75;
    const screenY = deskY - 35;

    // Vibrant pastel cyan & magenta screen flare
    const pulse = 0.85 + 0.15 * Math.sin(this.animTime * 6);
    const glow = ctx.createRadialGradient(screenX, screenY, 10, screenX, screenY, 145);
    glow.addColorStop(0, '#fbcfe8');
    glow.addColorStop(0.35, `rgba(236, 72, 153, ${0.45 * pulse})`);
    glow.addColorStop(1, 'rgba(236, 72, 153, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(screenX, screenY, 145, 0, Math.PI * 2);
    ctx.fill();

    // Ergonomic cozy armchair
    const charX = deskX + 115;
    const charY = deskY - 35;

    ctx.fillStyle = '#f3e8ff';
    ctx.beginPath();
    ctx.roundRect(charX - 15, charY - 30, 34, 65, 8);
    ctx.fill();

    // Mia sitting relaxed holding a pastel handheld console (Nintendo Switch style)
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.ellipse(charX - 5, charY + 18, 18, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Handheld console (pastel blue & pink joycons)
    const swX = charX - 35;
    const swY = charY + 12;
    ctx.fillStyle = '#38bdf8'; // Left blue joycon
    ctx.fillRect(swX, swY, 6, 14);
    ctx.fillStyle = '#0f172a'; // Screen center
    ctx.fillRect(swX + 6, swY, 16, 14);
    ctx.fillStyle = '#f472b6'; // Right pink joycon
    ctx.fillRect(swX + 22, swY, 6, 14);

    // Glowing game screen
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(swX + 8, swY + 2, 12, 10);

    // Mia head & headset with cute cat ears
    ctx.fillStyle = '#fce7dc';
    ctx.beginPath();
    ctx.arc(charX - 4, charY - 10, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e1c24';
    ctx.beginPath();
    ctx.arc(charX - 4, charY - 13, 14, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();

    // Cat ear gaming headset glowing pink
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.moveTo(charX - 12, charY - 24);
    ctx.lineTo(charX - 8, charY - 34);
    ctx.lineTo(charX - 4, charY - 24);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(charX + 4, charY - 24);
    ctx.lineTo(charX + 8, charY - 34);
    ctx.lineTo(charX + 12, charY - 24);
    ctx.fill();

    ctx.restore();
  }

  drawMiaCooking(ctx, x, y, w, h) {
    ctx.save();
    const lampX = x + 150;
    const lampY = y + 70;

    const glow = ctx.createRadialGradient(lampX, lampY + 40, 15, lampX, lampY + 120, 210);
    glow.addColorStop(0, 'rgba(255, 235, 190, 0.8)');
    glow.addColorStop(0.4, 'rgba(244, 114, 182, 0.28)');
    glow.addColorStop(1, 'rgba(244, 114, 182, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lampX, lampY + 100, 210, 0, Math.PI * 2);
    ctx.fill();

    // Modern kitchen counter
    const counterX = x + 40;
    const counterY = y + h - 160;
    const stoveX = counterX + 60;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(counterX, counterY, 200, 75);
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(counterX - 5, counterY - 10, 210, 12);

    // Cute pastel green tea kettle nearby
    ctx.fillStyle = '#86efac';
    ctx.beginPath();
    ctx.arc(counterX + 160, counterY - 18, 9, 0, Math.PI * 2);
    ctx.fill();

    // Ceramic ramen pot on burner
    ctx.fillStyle = 'rgba(255, 120, 40, 0.85)';
    ctx.beginPath();
    ctx.ellipse(stoveX, counterY - 13, 16, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fb7185'; // Cute pink pot
    ctx.fillRect(stoveX - 18, counterY - 35, 36, 22);

    // Rising steam curls
    for (const p of this.steamB) {
      const curY = (p.y - this.animTime * 25 * p.speed) % 65;
      const curX = stoveX + p.x + Math.sin(this.animTime * 2.5 + p.phase) * 6;
      const alpha = Math.max(0, 0.45 * (1 + curY / 65));
      ctx.fillStyle = `rgba(255, 225, 240, ${alpha})`;
      ctx.beginPath();
      ctx.arc(curX, counterY - 38 + curY, p.r * (1 - curY / 100), 0, Math.PI * 2);
      ctx.fill();
    }

    // Mia stirring ramen with chopsticks
    const cookX = counterX + 130;
    const cookY = counterY - 60;

    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.ellipse(cookX, cookY + 30, 18, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chopsticks reaching into pot
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cookX - 12, cookY + 22);
    ctx.lineTo(stoveX + 4, counterY - 26);
    ctx.stroke();

    ctx.fillStyle = '#fce7dc';
    ctx.beginPath();
    ctx.arc(cookX, cookY, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e1c24';
    ctx.beginPath();
    ctx.arc(cookX, cookY - 3, 15, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();
    // Bun
    ctx.beginPath();
    ctx.arc(cookX + 2, cookY - 18, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawDayTransitionOverlay(ctx) {
    ctx.save();
    const p = Math.sin(this.dayTransition * Math.PI);

    const grad = ctx.createRadialGradient(
      VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2, 20,
      VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2, VIRTUAL_WIDTH * 0.7
    );
    grad.addColorStop(0, `rgba(255, 235, 170, ${0.4 * p})`);
    grad.addColorStop(0.5, `rgba(190, 130, 240, ${0.3 * p})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // Floating Day Banner with golden flare
    ctx.font = 'bold 28px "Cinzel", Georgia, serif';
    ctx.fillStyle = `rgba(255, 245, 220, ${p})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#d4af37';
    ctx.shadowBlur = 15;
    ctx.fillText(`DAY ${this.currentDay}`, VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2);

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
