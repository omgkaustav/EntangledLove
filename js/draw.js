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

  setLights(onA, onB, immediate = false) {
    this.targetLightA = onA ? 1.0 : 0.0;
    this.targetLightB = onB ? 1.0 : 0.0;
    if (immediate) {
      this.lightA = this.targetLightA;
      this.lightB = this.targetLightB;
    }
  }

  toggleLight(windowKey) {
    if (this.isTransitioningDay) return false;
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
    if (this.isTransitioningDay) return false;
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
    this.lightA = 0.0;
    this.lightB = 0.0;
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
    if (lightVal > 0.02 && !this.isTransitioningDay) {
      ctx.save();
      ctx.globalAlpha = lightVal;
      if (!isMia) {
        // Leo's Activities (8 canonical nocturnal activities)
        switch (activityCode) {
          case 0: this.drawLeoBed(ctx, rx, ry, rw, rh); break;
          case 1: this.drawLeoThinking(ctx, rx, ry, rw, rh); break;
          case 2: this.drawLeoReading(ctx, rx, ry, rw, rh); break;
          case 3: this.drawLeoMusic(ctx, rx, ry, rw, rh); break;
          case 4: this.drawLeoGaming(ctx, rx, ry, rw, rh); break;
          case 5: this.drawLeoCooking(ctx, rx, ry, rw, rh); break;
          case 6: this.drawLeoPlants(ctx, rx, ry, rw, rh); break;
          case 7: this.drawLeoStargazing(ctx, rx, ry, rw, rh); break;
        }
      } else {
        // Mia's Activities (Distinct artwork, plushie, fairy lights, cat)
        switch (activityCode) {
          case 0: this.drawMiaBed(ctx, rx, ry, rw, rh); break;
          case 1: this.drawMiaThinking(ctx, rx, ry, rw, rh); break;
          case 2: this.drawMiaReading(ctx, rx, ry, rw, rh); break;
          case 3: this.drawMiaMusic(ctx, rx, ry, rw, rh); break;
          case 4: this.drawMiaGaming(ctx, rx, ry, rw, rh); break;
          case 5: this.drawMiaCooking(ctx, rx, ry, rw, rh); break;
          case 6: this.drawMiaPlants(ctx, rx, ry, rw, rh); break;
          case 7: this.drawMiaStargazing(ctx, rx, ry, rw, rh); break;
        }
      }
      ctx.restore();
    } else {
      // Light is OFF (or advancing day): draw mysterious nocturnal silhouette
      this.drawUnlitSilhouette(ctx, rx, ry, rw, rh, isMia);
    }

    ctx.restore(); // ends room clip

    // 3. PHYSICAL WINDOW CASING & CROSS MULLIONS (DRAWN ON TOP OF ROOM)
    this.drawWindowPanesAndFrame(ctx, win, lightVal, isMia);

    // 4. Glass sheen & reflections across the panes
    this.drawGlassReflections(ctx, rx, ry, rw, rh, lightVal, isMia);

    // 5. Light spill onto outside walls when light is ON
    if (lightVal > 0.05 && !this.isTransitioningDay) {
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

  /**
   * Modern Architectural Glass Window Casing with Vertical Divider
   * Features a clean outer casing and a vertical center divider (mullion) that splits the window
   * into two elegant vertical glass panes without cutting across the characters' faces.
   */
  drawWindowPanesAndFrame(ctx, win, lightVal, isMia) {
    ctx.save();
    const frameCol = isMia ? '#1a2030' : '#271d22';
    const frameHighlight = isMia ? '#2e3a54' : '#45333c';

    // 1. Sleek Modern Window Casing (Clean 10px frame)
    ctx.strokeStyle = frameCol;
    ctx.lineWidth = 10;
    ctx.strokeRect(win.x, win.y, win.width, win.height);

    // Inner bevel highlight around perimeter
    ctx.strokeStyle = frameHighlight;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(win.x + 5, win.y + 5, win.width - 10, win.height - 10);

    // 2. Vertical Center Divider (Mullion / Window Sash)
    // Splits the window into two elegant vertical panes (left and right)
    // Positioned in center space so it never intersects Leo's or Mia's faces
    const midX = win.x + win.width * 0.5;
    const barWidth = 8;
    const barX = midX - barWidth * 0.5;

    // Soft drop shadow behind divider onto room interior
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(barX - 2, win.y + 5, barWidth + 4, win.height - 10);

    // Main vertical divider beam
    ctx.fillStyle = frameCol;
    ctx.fillRect(barX, win.y + 5, barWidth, win.height - 10);

    // Left highlight bevel (subtle light catch)
    ctx.fillStyle = frameHighlight;
    ctx.fillRect(barX, win.y + 5, 1.5, win.height - 10);

    // Right shadow groove (adds authentic 3D depth)
    ctx.fillStyle = '#06080e';
    ctx.fillRect(barX + barWidth - 1.5, win.y + 5, 1.5, win.height - 10);

    // Top and bottom join brackets connecting divider to outer frame
    ctx.fillStyle = frameHighlight;
    ctx.fillRect(barX - 2, win.y + 3, barWidth + 4, 3);
    ctx.fillRect(barX - 2, win.y + win.height - 6, barWidth + 4, 3);

    // 3. Modern Window Sill at bottom with 3D bevels
    ctx.fillStyle = isMia ? '#2b364e' : '#42313b';
    ctx.fillRect(win.x - 10, win.y + win.height, win.width + 20, 16);
    // Sill top highlight
    ctx.fillStyle = isMia ? '#46567a' : '#5e4854';
    ctx.fillRect(win.x - 10, win.y + win.height, win.width + 20, 2.5);
    // Sill bottom shadow
    ctx.fillStyle = '#06080e';
    ctx.fillRect(win.x - 10, win.y + win.height + 13.5, win.width + 20, 2.5);

    // 4. Modern Minimalist Glass Corner Brackets (Brushed metal clips in the 4 corners)
    ctx.fillStyle = isMia ? '#3b4866' : '#52404b';
    const clipSize = 6;
    ctx.fillRect(win.x + 5, win.y + 5, clipSize, clipSize);
    ctx.fillRect(win.x + win.width - 5 - clipSize, win.y + 5, clipSize, clipSize);
    ctx.fillRect(win.x + 5, win.y + win.height - 5 - clipSize, clipSize, clipSize);
    ctx.fillRect(win.x + win.width - 5 - clipSize, win.y + win.height - 5 - clipSize, clipSize, clipSize);

    ctx.restore();
  }

  /**
   * Pixel-Art Diagonal Glass Sheen & Dashes
   * Subtle, barely transparent diagonal dashes that indicate a clean modern glass windowpane
   * without obstructing characters' faces or thought bubbles.
   */
  drawGlassReflections(ctx, x, y, w, h, lightVal, isMia) {
    ctx.save();

    // 1. Gentle full-pane glass atmosphere tint
    const alphaBase = (1.0 - lightVal) * 0.08 + 0.03;
    const glassGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    glassGrad.addColorStop(0, `rgba(230, 242, 255, ${alphaBase * 1.2})`);
    glassGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    glassGrad.addColorStop(1, `rgba(230, 242, 255, ${alphaBase})`);
    ctx.fillStyle = glassGrad;
    ctx.fillRect(x + 5, y + 5, w - 10, h - 10);

    // 2. Pixel-Art Diagonal Glare Dashes
    // In pixel art, clean glass has crisp parallel diagonal slashes in the corners.
    // Barely transparent light gray/cyan dashes:
    const dashAlpha = lightVal > 0.1 ? 0.13 : 0.06;
    ctx.lineCap = 'round';

    const drawDiagonalDash = (startX, startY, length, width, opacityScale = 1.0) => {
      ctx.strokeStyle = `rgba(225, 238, 255, ${dashAlpha * opacityScale})`;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX - length * 0.707, startY + length * 0.707);
      ctx.stroke();
    };

    if (!isMia) {
      // Window A (London, Leo):
      // Leo is at lower-right; thought bubble is at upper-left.
      // Place diagonal glass dashes in the clear Upper-Right and Lower-Left corners!

      // Upper-Right Glass Glint
      drawDiagonalDash(x + w - 28, y + 22, 68, 5.5, 1.0);
      drawDiagonalDash(x + w - 50, y + 22, 38, 3.2, 0.75);
      drawDiagonalDash(x + w - 68, y + 22, 18, 2.0, 0.55);

      // Lower-Left Glass Glint
      drawDiagonalDash(x + 125, y + h - 95, 65, 5.5, 1.0);
      drawDiagonalDash(x + 102, y + h - 95, 36, 3.2, 0.75);
      drawDiagonalDash(x + 84,  y + h - 95, 18, 2.0, 0.55);
    } else {
      // Window B (Tokyo, Mia):
      // Mia is at lower-left; thought bubble is at upper-right.
      // Place diagonal glass dashes in the clear Upper-Left and Lower-Right corners!

      // Upper-Left Glass Glint
      drawDiagonalDash(x + 125, y + 22, 68, 5.5, 1.0);
      drawDiagonalDash(x + 102, y + 22, 38, 3.2, 0.75);
      drawDiagonalDash(x + 84,  y + 22, 18, 2.0, 0.55);

      // Lower-Right Glass Glint
      drawDiagonalDash(x + w - 28, y + h - 95, 65, 5.5, 1.0);
      drawDiagonalDash(x + w - 50, y + h - 95, 36, 3.2, 0.75);
      drawDiagonalDash(x + w - 68, y + h - 95, 18, 2.0, 0.55);
    }

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
    const isLit = lightVal > 0.5 && !this.isTransitioningDay;

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

    // Leo sleeping (messy brown hair, high natural hairline, peaceful sleeping face)
    this.drawLeoHead(ctx, bedX + 46, bedY + 12, 11, { sleeping: true });

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

  /**
   * Draw Leo's Head with High Natural Hairline & Expressive Features
   * Ensures face is fully visible, open, and never obscured by hair.
   */
  drawLeoHead(ctx, hx, hy, r, options = {}) {
    ctx.save();

    // 1. Face Base
    ctx.fillStyle = '#ecd0b8';
    ctx.beginPath();
    ctx.arc(hx, hy, r, 0, Math.PI * 2);
    ctx.fill();

    // 2. High Natural Hairline & Messy Dark Curls
    // Hairline sits at hy - r * 0.45, leaving upper 45% of forehead completely clear.
    const hairY = hy - r * 0.45;
    const dy = hy - hairY;
    const dx = Math.sqrt(Math.max(0, r * r - dy * dy));

    ctx.fillStyle = '#3d271d'; // Leo's dark brunette hair
    ctx.beginPath();
    // Voluminous dome over skull crown
    ctx.arc(hx, hy - 1, r + 1.8, Math.PI + 0.47, 2 * Math.PI - 0.47, false);
    // Smooth natural arched hairline across upper forehead
    ctx.quadraticCurveTo(hx, hairY - 2.5, hx - dx, hairY);
    ctx.fill();

    // Fluffy curls on the crown (above skull, adds volume without touching face)
    const curls = [
      [hx - r * 0.72, hairY - 2, r * 0.28],
      [hx - r * 0.35, hy - r - 2, r * 0.36],
      [hx + r * 0.35, hy - r - 2, r * 0.34],
      [hx + r * 0.72, hairY - 2, r * 0.28],
      [hx - r * 0.08, hairY - 2.2, r * 0.22]
    ];
    for (const [cx, cy, cr] of curls) {
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sideburns framing the ears
    ctx.beginPath();
    ctx.moveTo(hx - r + 0.5, hairY);
    ctx.lineTo(hx - r - 1.5, hy + r * 0.15);
    ctx.lineTo(hx - r + 2.5, hairY);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx + r - 0.5, hairY);
    ctx.lineTo(hx + r + 1.5, hy + r * 0.15);
    ctx.lineTo(hx + r - 2.5, hairY);
    ctx.fill();

    // 3. Facial Features (Open, expressive, and visible)
    if (options.sleeping) {
      // Peaceful sleeping face on pillow
      ctx.fillStyle = 'rgba(251, 146, 60, 0.4)';
      ctx.beginPath();
      ctx.arc(hx + r * 0.2, hy + r * 0.25, r * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Sleeping closed eye (curved gently downward)
      ctx.strokeStyle = '#3d271d';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(hx + r * 0.15, hy, r * 0.2, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    } else {
      const isFacingRight = options.facing === 'right';
      const eyeCenterY = hy + r * 0.05;

      // Soft warm blush cheeks
      ctx.fillStyle = 'rgba(251, 146, 60, 0.5)';
      ctx.beginPath();
      ctx.arc(hx - r * 0.48, hy + r * 0.32, r * 0.22, 0, Math.PI * 2);
      ctx.arc(hx + r * 0.48, hy + r * 0.32, r * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Wire round glasses
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1.4;
      const gR = r * 0.24;
      const gX1 = hx - r * 0.36;
      const gX2 = hx + r * 0.36;

      ctx.beginPath();
      ctx.arc(gX1, eyeCenterY, gR, 0, Math.PI * 2);
      ctx.arc(gX2, eyeCenterY, gR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(gX1 + gR, eyeCenterY);
      ctx.lineTo(gX2 - gR, eyeCenterY);
      ctx.stroke();

      // Eyes behind glasses
      ctx.strokeStyle = '#3d271d';
      ctx.lineWidth = 1.5;
      if (options.expression === 'gaming') {
        // Focused dot pupils looking towards arcade screen
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.arc(gX1 + (isFacingRight ? 1.5 : 0), eyeCenterY, 1.8, 0, Math.PI * 2);
        ctx.arc(gX2 + (isFacingRight ? 1.5 : 0), eyeCenterY, 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Happy curved closed smiling eyes ^ ^
        ctx.beginPath();
        ctx.arc(gX1, eyeCenterY, gR * 0.6, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(gX2, eyeCenterY, gR * 0.6, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }

      // Gentle smile
      ctx.beginPath();
      ctx.arc(hx, hy + r * 0.38, r * 0.22, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draw Mia's Head with High Natural Hairline & Expressive Features
   * Features sleek dark hair, neat top bun, signature red chopstick hairpin, and open luminous face.
   */
  drawMiaHead(ctx, hx, hy, r, options = {}) {
    ctx.save();

    // 1. Face Base
    ctx.fillStyle = '#fce7dc';
    ctx.beginPath();
    ctx.arc(hx, hy, r, 0, Math.PI * 2);
    ctx.fill();

    // 2. High Sleek Top Bun & Red Chopstick Hairpin (drawn on crown)
    if (!options.sleeping) {
      const bunY = hy - r - r * 0.45;
      const bunR = r * 0.48;

      // Dark bun
      ctx.fillStyle = '#1e1c24';
      ctx.beginPath();
      ctx.arc(hx + 1, bunY, bunR, 0, Math.PI * 2);
      ctx.fill();

      // Red hairpin chopstick angled through bun
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(hx - r * 0.65, bunY - r * 0.25);
      ctx.lineTo(hx + r * 0.75, bunY + r * 0.25);
      ctx.stroke();
    } else {
      // Sleeping bun resting on pillow
      ctx.fillStyle = '#1e1c24';
      ctx.beginPath();
      ctx.arc(hx + r * 0.55, hy - r * 0.35, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      // Red hairpin
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx + r * 0.2, hy - r * 0.7);
      ctx.lineTo(hx + r * 0.9, hy - r * 0.1);
      ctx.stroke();
    }

    // 3. High Natural Hairline
    // Hairline sits at hy - r * 0.45, leaving upper 45% of forehead completely clear.
    const hairY = hy - r * 0.45;
    const dy = hy - hairY;
    const dx = Math.sqrt(Math.max(0, r * r - dy * dy));

    ctx.fillStyle = '#1e1c24'; // Mia's sleek raven hair
    ctx.beginPath();
    // Voluminous dome over skull crown
    ctx.arc(hx, hy - 1, r + 1.5, Math.PI + 0.47, 2 * Math.PI - 0.47, false);
    // Smooth natural arched hairline across upper forehead
    ctx.quadraticCurveTo(hx, hairY - 2.5, hx - dx, hairY);
    ctx.fill();

    // Delicate side locks framing the temples
    ctx.beginPath();
    ctx.moveTo(hx - r + 0.5, hairY);
    ctx.lineTo(hx - r - 1.5, hy + r * 0.2);
    ctx.lineTo(hx - r + 2.5, hairY);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx + r - 0.5, hairY);
    ctx.lineTo(hx + r + 1.5, hy + r * 0.2);
    ctx.lineTo(hx + r - 2.5, hairY);
    ctx.fill();

    // 4. Facial Features (Open, expressive, and luminous)
    if (options.sleeping) {
      // Peaceful sleeping face on pillow
      ctx.fillStyle = 'rgba(251, 113, 133, 0.5)';
      ctx.beginPath();
      ctx.arc(hx - r * 0.2, hy + r * 0.25, r * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Sleeping closed eye (curved gently downward)
      ctx.strokeStyle = '#1e1c24';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(hx - r * 0.15, hy, r * 0.2, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    } else {
      const eyeCenterY = hy + r * 0.05;

      // Rosy blush cheeks
      ctx.fillStyle = 'rgba(251, 113, 133, 0.6)';
      ctx.beginPath();
      ctx.arc(hx - r * 0.48, hy + r * 0.32, r * 0.22, 0, Math.PI * 2);
      ctx.arc(hx + r * 0.48, hy + r * 0.32, r * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.strokeStyle = '#1e1c24';
      ctx.lineWidth = 1.6;
      const eyeR = r * 0.22;
      const eX1 = hx - r * 0.35;
      const eX2 = hx + r * 0.35;

      if (options.expression === 'gaming') {
        // Focused cute anime eyes looking down-left at the Switch
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.arc(eX1 - 1, eyeCenterY, 1.8, 0, Math.PI * 2);
        ctx.arc(eX2 - 1, eyeCenterY, 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Happy curved closed smiling eyes ^ ^
        ctx.beginPath();
        ctx.arc(eX1, eyeCenterY, eyeR, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(eX2, eyeCenterY, eyeR, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }

      // Sweet smile
      ctx.beginPath();
      ctx.arc(hx, hy + r * 0.38, r * 0.22, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Floating Thought Bubble with Portrait of Beloved
   * Formatted as a clean, crisp, romantic dream card with non-overlapping connector dots.
   * Completely separated from characters' faces and bodies.
   */
  drawThoughtBubble(ctx, bubbleX, bubbleY, width, height, targetIsMia) {
    ctx.save();
    const floatY = Math.sin(this.animTime * 2.2) * 3;
    const cx = bubbleX + width / 2;
    const cy = bubbleY + height / 2 + floatY;

    // Trail dots (3 graduated circles ascending from lover's head towards the bubble)
    // targetIsMia is true when Leo (in Window A, lower-right) is dreaming of Mia (bubble in upper-left).
    // The dots trail down-right towards Leo's head.
    // targetIsMia is false when Mia (in Window B, lower-left) is dreaming of Leo (bubble in upper-right).
    // The dots trail down-left towards Mia's head.
    const dots = targetIsMia
      ? [
          { x: bubbleX + width - 12, y: bubbleY + height + 10 + floatY * 0.8, r: 8.5 },
          { x: bubbleX + width + 6,  y: bubbleY + height + 25 + floatY * 0.5, r: 6.0 },
          { x: bubbleX + width + 20, y: bubbleY + height + 39 + floatY * 0.2, r: 3.5 }
        ]
      : [
          { x: bubbleX + 12,        y: bubbleY + height + 10 + floatY * 0.8, r: 8.5 },
          { x: bubbleX - 6,         y: bubbleY + height + 25 + floatY * 0.5, r: 6.0 },
          { x: bubbleX - 20,        y: bubbleY + height + 39 + floatY * 0.2, r: 3.5 }
        ];

    // 1. Soft atmospheric drop shadow (applied ONCE to the unified shapes, zero internal lines)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    // Fill bubble body
    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY + floatY, width, height, 18);
    ctx.fill();

    // Fill trail dots
    for (const d of dots) {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore(); // Drop shadow turned off completely

    // 2. Crisp perimeter outline & inner romantic tint
    const themeColor = targetIsMia ? '#f43f5e' : '#f59e0b'; // Rose pink for Mia, Amber gold for Leo
    const themeWash = targetIsMia ? 'rgba(244, 63, 94, 0.06)' : 'rgba(245, 158, 11, 0.06)';

    // Subtle inner wash
    ctx.fillStyle = themeWash;
    ctx.beginPath();
    ctx.roundRect(bubbleX + 2, bubbleY + floatY + 2, width - 4, height - 4, 16);
    ctx.fill();

    // Crisp outline stroke on the bubble
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY + floatY, width, height, 18);
    ctx.stroke();

    // Crisp outline stroke on the trail dots
    for (const d of dots) {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
      ctx.fill();
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    // 3. Beloved Cameo Portrait inside the bubble
    // Left side: cameo medallion
    const px = cx - 34;
    const py = cy;

    // Medallion halo
    ctx.fillStyle = targetIsMia ? '#fff1f2' : '#fefce8';
    ctx.beginPath();
    ctx.arc(px, py, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = targetIsMia ? '#fecdd3' : '#fde68a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (targetIsMia) {
      // Leo thinking of Mia (cameo with high natural hairline, sleek bun, red hairpin)
      this.drawMiaHead(ctx, px, py + 1, 15, { expression: 'cameo' });

      // Floating animated pink hearts on the right
      const hPulse = 0.9 + 0.1 * Math.sin(this.animTime * 3);
      const h1Y = cy - 14 + Math.sin(this.animTime * 3) * 3;
      const h2Y = cy + 5 + Math.cos(this.animTime * 2.5) * 3;

      ctx.font = `bold ${Math.round(18 * hPulse)}px sans-serif`;
      ctx.fillStyle = '#f43f5e';
      ctx.textAlign = 'center';
      ctx.fillText('♥', cx + 22, h1Y);

      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#fb7185';
      ctx.fillText('♥', cx + 44, h2Y);

      // Name tag: MIA ♡
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#e11d48';
      ctx.textAlign = 'center';
      ctx.fillText('MIA ♡', cx + 28, cy + 24);
    } else {
      // Mia thinking of Leo (cameo with high natural hairline, messy curls, wire glasses)
      this.drawLeoHead(ctx, px, py + 1, 15, { expression: 'cameo' });

      // Floating animated golden hearts on the right
      const hPulse = 0.9 + 0.1 * Math.sin(this.animTime * 3);
      const h1Y = cy - 14 + Math.sin(this.animTime * 3) * 3;
      const h2Y = cy + 5 + Math.cos(this.animTime * 2.5) * 3;

      ctx.font = `bold ${Math.round(18 * hPulse)}px sans-serif`;
      ctx.fillStyle = '#eab308';
      ctx.textAlign = 'center';
      ctx.fillText('♥', cx + 22, h1Y);

      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('♥', cx + 44, h2Y);

      // Name tag: LEO ♡
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#d97706';
      ctx.textAlign = 'center';
      ctx.fillText('LEO ♡', cx + 28, cy + 24);
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

    // Leo head with high natural hairline, messy curls, wire glasses, and daydreaming smile
    this.drawLeoHead(ctx, charX, charY - 8, 14, { expression: 'thinking' });

    // Floating Thought Bubble: Leo thinking of Mia (in clear upper-left room space)
    this.drawThoughtBubble(ctx, x + 26, y + 36, 150, 88, true);

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

    // Leo's head & messy curls with high natural hairline, wire glasses, and focused gaze
    this.drawLeoHead(ctx, charX + 2, charY - 10, 13, { expression: 'gaming', facing: 'right' });

    // Over-ear Gaming Headphones!
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(charX + 2, charY - 12, 14.5, Math.PI * 0.8, Math.PI * 2.2);
    ctx.stroke();
    // Blue headphone earcup
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(charX + 13, charY - 10, 5, 0, Math.PI * 2);
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

    // Leo's head with high natural hairline, wire glasses, and cooking smile
    this.drawLeoHead(ctx, cookX, cookY, 14, { expression: 'cooking', facing: 'left' });

    ctx.restore();
  }

  drawLeoReading(ctx, x, y, w, h) {
    ctx.save();
    const lampX = x + w - 85;
    const lampY = y + 70;

    // Vintage brass gooseneck lamp warm cone
    const glow = ctx.createRadialGradient(lampX, lampY + 30, 10, lampX, lampY + 120, 210);
    glow.addColorStop(0, 'rgba(255, 235, 170, 0.85)');
    glow.addColorStop(0.35, 'rgba(255, 200, 120, 0.32)');
    glow.addColorStop(1, 'rgba(255, 200, 120, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lampX, lampY + 100, 200, 0, Math.PI * 2);
    ctx.fill();

    // Brass lamp cord & shade
    ctx.strokeStyle = '#28201a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lampX, y);
    ctx.lineTo(lampX, lampY);
    ctx.stroke();
    ctx.fillStyle = '#bfa163';
    ctx.beginPath();
    ctx.arc(lampX, lampY + 8, 14, Math.PI, 0);
    ctx.fill();

    // Bookshelf in background
    ctx.fillStyle = '#382a22';
    ctx.fillRect(x + 40, y + 55, 130, 10);
    const bookColors = ['#8f3a3a', '#2d4a3e', '#b38234', '#423d6b', '#6b3d4f'];
    bookColors.forEach((col, idx) => {
      ctx.fillStyle = col;
      ctx.fillRect(x + 45 + idx * 22, y + 22, 17, 33);
    });

    // Cozy tufted armchair
    const chairX = x + w - 195;
    const chairY = y + h - 175;
    ctx.fillStyle = '#422818';
    // Backrest
    ctx.beginPath();
    ctx.roundRect(chairX + 15, chairY - 20, 85, 95, 12);
    ctx.fill();
    // Armrest
    ctx.fillStyle = '#533320';
    ctx.beginPath();
    ctx.roundRect(chairX, chairY + 25, 30, 45, 8);
    ctx.roundRect(chairX + 85, chairY + 25, 30, 45, 8);
    ctx.fill();

    // Leo seated comfortably
    const charX = chairX + 58;
    const charY = chairY + 15;

    // Dark forest green knitted jumper
    ctx.fillStyle = '#263b32';
    ctx.beginPath();
    ctx.ellipse(charX, charY + 24, 20, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arms holding hardcover book in lap
    ctx.strokeStyle = '#263b32';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(charX - 16, charY + 16);
    ctx.lineTo(charX - 8, charY + 36);
    ctx.lineTo(charX + 4, charY + 34);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(charX + 16, charY + 16);
    ctx.lineTo(charX + 10, charY + 36);
    ctx.lineTo(charX - 2, charY + 34);
    ctx.stroke();

    // Open book with parchment pages & ribbon bookmark
    const bookX = charX - 16;
    const bookY = charY + 26;
    ctx.fillStyle = '#8f2d2d'; // Vintage crimson cover
    ctx.fillRect(bookX - 2, bookY + 6, 36, 16);
    ctx.fillStyle = '#f5eedb'; // Cream pages
    ctx.beginPath();
    ctx.moveTo(bookX, bookY + 6);
    ctx.quadraticCurveTo(bookX + 8, bookY + 4, bookX + 16, bookY + 7);
    ctx.lineTo(bookX + 16, bookY + 20);
    ctx.quadraticCurveTo(bookX + 8, bookY + 17, bookX, bookY + 19);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bookX + 16, bookY + 7);
    ctx.quadraticCurveTo(bookX + 24, bookY + 4, bookX + 32, bookY + 6);
    ctx.lineTo(bookX + 32, bookY + 19);
    ctx.quadraticCurveTo(bookX + 24, bookY + 17, bookX + 16, bookY + 20);
    ctx.closePath();
    ctx.fill();
    // Red ribbon bookmark hanging out
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bookX + 16, bookY + 20);
    ctx.lineTo(bookX + 18, bookY + 26);
    ctx.stroke();

    // Leo's head tilted slightly forward absorbed in book
    this.drawLeoHead(ctx, charX, charY - 8, 14, { expression: 'reading' });

    // Side table with warm cuppa
    ctx.fillStyle = '#3a2b22';
    ctx.fillRect(chairX - 35, chairY + 38, 28, 38);
    ctx.fillStyle = '#dedad2';
    ctx.fillRect(chairX - 27, chairY + 26, 12, 12);
    // Delicate steam
    const steamAlpha = 0.25 + 0.25 * Math.sin(this.animTime * 3);
    ctx.strokeStyle = `rgba(255, 255, 255, ${steamAlpha})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(chairX - 21, chairY + 25);
    ctx.quadraticCurveTo(chairX - 24, chairY + 15, chairX - 20, chairY + 7);
    ctx.stroke();

    ctx.restore();
  }

  drawLeoMusic(ctx, x, y, w, h) {
    ctx.save();
    const lampX = x + w - 100;
    const lampY = y + 70;

    // Warm atmospheric amber glow
    const glow = ctx.createRadialGradient(lampX, lampY + 40, 10, lampX, lampY + 120, 220);
    glow.addColorStop(0, 'rgba(255, 225, 150, 0.85)');
    glow.addColorStop(0.35, 'rgba(255, 190, 100, 0.3)');
    glow.addColorStop(1, 'rgba(255, 190, 100, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lampX, lampY + 100, 220, 0, Math.PI * 2);
    ctx.fill();

    // Vintage wooden stereo console & gramophone turntable
    const consoleX = x + w - 145;
    const consoleY = y + h - 145;
    // Wooden audio cabinet body
    ctx.fillStyle = '#3a2b22';
    ctx.fillRect(consoleX, consoleY, 105, 65);
    ctx.fillStyle = '#4e3a2e';
    ctx.fillRect(consoleX - 4, consoleY - 8, 113, 10);

    // Cabinet shelf with colorful vinyl album sleeves on lower shelf
    ctx.fillStyle = '#221914';
    ctx.fillRect(consoleX + 8, consoleY + 22, 89, 36);
    const sleeveCols = ['#8f2d2d', '#0284c7', '#d97706', '#15803d', '#9333ea', '#e11d48', '#0891b2'];
    for (let s = 0; s < sleeveCols.length; s++) {
      ctx.fillStyle = sleeveCols[s];
      ctx.fillRect(consoleX + 14 + s * 11, consoleY + 26, 8, 30);
    }

    // Spinning vinyl record on turntable platter
    const turnX = consoleX + 32;
    const turnY = consoleY - 3;
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.ellipse(turnX, turnY, 25, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Vinyl groove sheen
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(turnX, turnY, 18, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Center label (crimson)
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.ellipse(turnX, turnY, 8, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tonearm
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(consoleX + 60, consoleY - 1);
    ctx.lineTo(turnX + 8, turnY + 2);
    ctx.stroke();

    // Classic Brass Gramophone Horn flaring up from console
    const hornBaseX = consoleX + 72;
    const hornBaseY = consoleY - 2;
    const hornBellX = consoleX + 88;
    const hornBellY = consoleY - 42;
    // Curved brass stem
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(hornBaseX, hornBaseY);
    ctx.quadraticCurveTo(hornBaseX + 18, hornBaseY - 18, hornBellX - 6, hornBellY + 12);
    ctx.stroke();
    // Fluted golden brass bell / flare
    const hornGrad = ctx.createLinearGradient(hornBellX - 18, hornBellY + 14, hornBellX + 12, hornBellY - 14);
    hornGrad.addColorStop(0, '#78350f');
    hornGrad.addColorStop(0.3, '#d4af37');
    hornGrad.addColorStop(0.7, '#fef08a');
    hornGrad.addColorStop(1, '#92400e');
    ctx.fillStyle = hornGrad;
    ctx.beginPath();
    ctx.moveTo(hornBellX - 10, hornBellY + 10);
    ctx.quadraticCurveTo(hornBellX - 18, hornBellY, hornBellX - 8, hornBellY - 12);
    ctx.quadraticCurveTo(hornBellX + 10, hornBellY - 16, hornBellX + 16, hornBellY);
    ctx.quadraticCurveTo(hornBellX + 8, hornBellY + 16, hornBellX - 10, hornBellY + 10);
    ctx.fill();
    // Dark hollow bell opening
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.ellipse(hornBellX + 4, hornBellY - 1, 8, 13, 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Cozy leather armchair Leo relaxes in
    const chairX = x + w - 215;
    const chairY = y + h - 165;
    // Backrest
    ctx.fillStyle = '#452618';
    ctx.beginPath();
    ctx.roundRect(chairX - 14, chairY - 15, 68, 85, 10);
    ctx.fill();
    // Armrest
    ctx.fillStyle = '#593220';
    ctx.beginPath();
    ctx.roundRect(chairX - 18, chairY + 28, 16, 42, 6);
    ctx.roundRect(chairX + 42, chairY + 28, 16, 42, 6);
    ctx.fill();

    // Leo seated comfortably, leaning back listening to music
    const charX = chairX + 20;
    const charY = chairY + 18;

    // Burgundy knit jumper
    ctx.fillStyle = '#6b2d35';
    ctx.beginPath();
    ctx.ellipse(charX, charY + 24, 20, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arms resting on lap holding square vinyl record album jacket
    ctx.strokeStyle = '#6b2d35';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(charX - 14, charY + 16);
    ctx.lineTo(charX - 6, charY + 34);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(charX + 14, charY + 16);
    ctx.lineTo(charX + 6, charY + 34);
    ctx.stroke();

    // Square vinyl record sleeve on his lap
    const sleeveX = charX - 12;
    const sleeveY = charY + 25;
    ctx.fillStyle = '#0284c7'; // Blue note jazz jacket
    ctx.fillRect(sleeveX, sleeveY, 24, 24);
    // Album graphic on sleeve
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(sleeveX + 12, sleeveY + 12, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(sleeveX + 4, sleeveY + 3, 16, 3);

    // Leo's head tilted gently in rhythm, with happy curved eyes
    const nod = Math.sin(this.animTime * 3) * 1.5;
    this.drawLeoHead(ctx, charX, charY - 8 + nod, 14, { expression: 'singing' });

    // Studio over-ear headphones over Leo's curls
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(charX, charY - 13 + nod, 16, Math.PI + 0.3, 2 * Math.PI - 0.3);
    ctx.stroke();
    // Leather earcups
    ctx.fillStyle = '#27272a';
    ctx.beginPath();
    ctx.roundRect(charX - 17, charY - 12 + nod, 5, 12, 2);
    ctx.roundRect(charX + 12, charY - 12 + nod, 5, 12, 2);
    ctx.fill();

    // Drifting golden musical notes rising from the gramophone horn!
    const noteTime = this.animTime * 1.6;
    const notes = [
      { char: '♪', ox: 0, oy: -15, speed: 20 },
      { char: '♫', ox: -14, oy: -35, speed: 24 },
      { char: '♩', ox: 12, oy: -48, speed: 18 },
      { char: '♪', ox: -6, oy: -60, speed: 22 }
    ];
    ctx.font = 'bold 15px "Cinzel", Georgia, serif';
    notes.forEach((n, idx) => {
      const ny = (n.oy - noteTime * n.speed + idx * 35) % 85 - 20;
      const nx = hornBellX + n.ox + Math.sin(noteTime + idx) * 8;
      const alpha = Math.max(0, 0.85 * (1 - Math.abs(ny + 20) / 65));
      ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 8;
      ctx.fillText(n.char, nx, hornBellY + ny);
    });
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  drawLeoPlants(ctx, x, y, w, h) {
    ctx.save();
    const lampX = x + w - 120;
    const lampY = y + 70;

    // Soft warm conservatory light
    const glow = ctx.createRadialGradient(lampX, lampY + 30, 10, lampX, lampY + 120, 210);
    glow.addColorStop(0, 'rgba(255, 235, 170, 0.82)');
    glow.addColorStop(0.35, 'rgba(240, 210, 130, 0.28)');
    glow.addColorStop(1, 'rgba(240, 210, 130, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lampX, lampY + 100, 200, 0, Math.PI * 2);
    ctx.fill();

    // Hanging macrame planter from ceiling
    ctx.strokeStyle = '#d4c5b9';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 110, y);
    ctx.lineTo(x + 100, y + 60);
    ctx.moveTo(x + 110, y);
    ctx.lineTo(x + 120, y + 60);
    ctx.stroke();
    // Terracotta hanging pot
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(x + 110, y + 68, 14, 0, Math.PI);
    ctx.fill();
    // Trailing lush ivy leaves
    ctx.fillStyle = '#22543d';
    const trailing = [[102, 75], [118, 78], [96, 92], [112, 98], [122, 94], [105, 115]];
    trailing.forEach(([tx, ty]) => {
      ctx.beginPath();
      ctx.ellipse(x + tx, y + ty, 6, 10, 0.3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Multi-tiered wooden plant stand on left
    const standX = x + 65;
    const standY = y + h - 165;
    ctx.fillStyle = '#3a2b22';
    ctx.fillRect(standX, standY, 90, 80);
    ctx.fillRect(standX - 10, standY + 25, 110, 8);
    ctx.fillRect(standX + 10, standY - 20, 70, 8);

    // Terracotta pots on stand: Monstera and Fern
    // Monstera pot
    ctx.fillStyle = '#c2410c';
    ctx.fillRect(standX + 16, standY - 42, 22, 22);
    ctx.fillStyle = '#15803d'; // Monstera broad leaves
    ctx.beginPath();
    ctx.ellipse(standX + 18, standY - 58, 14, 20, -0.4, 0, Math.PI * 2);
    ctx.ellipse(standX + 36, standY - 60, 16, 22, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Fern pot
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(standX + 50, standY + 3, 24, 22);
    ctx.fillStyle = '#16a34a';
    for (let f = 0; f < 5; f++) {
      ctx.beginPath();
      ctx.ellipse(standX + 54 + f * 5, standY - 10 - (f % 2) * 6, 5, 14, (f - 2) * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Leo standing on the right, watering the ferns
    const charX = x + w - 160;
    const charY = y + h - 150;

    // Knitted mustard/tan jumper
    ctx.fillStyle = '#8f6e3c';
    ctx.beginPath();
    ctx.ellipse(charX, charY + 26, 18, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Vintage copper watering can in Leo's hands
    const canX = charX - 32;
    const canY = charY + 28;
    ctx.fillStyle = '#c2843a'; // Copper body
    ctx.beginPath();
    ctx.roundRect(canX, canY, 24, 18, 3);
    ctx.fill();
    // Handle
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(canX + 24, canY + 8, 9, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    // Long slender spout pointing left toward fern
    ctx.beginPath();
    ctx.moveTo(canX, canY + 12);
    ctx.lineTo(canX - 22, canY - 2);
    ctx.stroke();

    // Arms holding watering can
    ctx.strokeStyle = '#8f6e3c';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(charX - 8, charY + 14);
    ctx.lineTo(canX + 16, canY + 4);
    ctx.stroke();

    // Sparkling water droplets arching from spout
    const dropTime = this.animTime * 5;
    for (let d = 0; d < 4; d++) {
      const dt = ((dropTime + d * 0.7) % 2.5) / 2.5;
      const dx = (canX - 22) - dt * 28;
      const dy = (canY - 2) + dt * dt * 28;
      ctx.fillStyle = 'rgba(147, 197, 253, 0.85)';
      ctx.beginPath();
      ctx.arc(dx, dy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Leo's head looking down with caring smile
    this.drawLeoHead(ctx, charX, charY - 8, 14, { expression: 'cooking', facing: 'left' });

    ctx.restore();
  }

  drawLeoStargazing(ctx, x, y, w, h) {
    ctx.save();
    // Dim ambient observatory lighting
    const lampX = x + w - 70;
    const lampY = y + 70;
    const glow = ctx.createRadialGradient(lampX, lampY + 30, 5, lampX, lampY + 90, 160);
    glow.addColorStop(0, 'rgba(216, 180, 254, 0.45)');
    glow.addColorStop(0.5, 'rgba(147, 197, 253, 0.15)');
    glow.addColorStop(1, 'rgba(147, 197, 253, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lampX, lampY + 70, 150, 0, Math.PI * 2);
    ctx.fill();

    // Celestial map / star chart on wall
    const chartX = x + 45;
    const chartY = y + 50;
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(chartX, chartY, 75, 55);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1;
    ctx.strokeRect(chartX, chartY, 75, 55);
    // Constellation lines & stars on map
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(chartX + 15, chartY + 18);
    ctx.lineTo(chartX + 32, chartY + 28);
    ctx.lineTo(chartX + 58, chartY + 20);
    ctx.lineTo(chartX + 62, chartY + 42);
    ctx.stroke();
    [[15, 18], [32, 28], [58, 20], [62, 42], [24, 38]].forEach(([cx, cy]) => {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(chartX + cx, chartY + cy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Antique Brass Telescope on Wooden Tripod (aimed out window toward left sky)
    const scopeX = x + w - 195;
    const scopeY = y + h - 165;
    // Wooden Tripod Legs
    ctx.strokeStyle = '#4a3728';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(scopeX, scopeY);
    ctx.lineTo(scopeX - 35, scopeY + 80);
    ctx.moveTo(scopeX, scopeY);
    ctx.lineTo(scopeX, scopeY + 85);
    ctx.moveTo(scopeX, scopeY);
    ctx.lineTo(scopeX + 32, scopeY + 80);
    ctx.stroke();

    // Tripod mount head
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(scopeX, scopeY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Polished Brass Telescope Barrel pointing up-left (-35 degrees)
    ctx.save();
    ctx.translate(scopeX, scopeY);
    ctx.rotate(-0.55);
    // Main optical tube
    const tubeGrad = ctx.createLinearGradient(0, -7, 0, 7);
    tubeGrad.addColorStop(0, '#fef08a');
    tubeGrad.addColorStop(0.5, '#d4af37');
    tubeGrad.addColorStop(1, '#92400e');
    ctx.fillStyle = tubeGrad;
    ctx.fillRect(-15, -6, 85, 12);
    // Objective lens rim (wider)
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(70, -8, 8, 16);
    // Eyepiece at back
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-24, -4, 9, 8);
    // Lens shimmer
    ctx.fillStyle = 'rgba(147, 197, 253, 0.7)';
    ctx.beginPath();
    ctx.ellipse(78, 0, 2, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Leo standing right next to the eyepiece, looking in
    const charX = scopeX + 28;
    const charY = scopeY - 5;

    // Bohemian dark navy wool cardigan
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(charX, charY + 28, 18, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hand gently touching telescope focus knob
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(charX - 8, charY + 16);
    ctx.lineTo(scopeX + 4, scopeY - 4);
    ctx.stroke();

    // Leo's head tilted forward toward the eyepiece
    this.drawLeoHead(ctx, charX - 8, charY - 14, 14, { expression: 'gaming', facing: 'left' });

    // Notebook of star observations in other hand
    ctx.fillStyle = '#d97706';
    ctx.fillRect(charX + 8, charY + 24, 14, 20);

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

    // Mia sleeping (hair tied in cute soft bun with clip, high natural hairline, peaceful sleeping face)
    this.drawMiaHead(ctx, bedX + 156, bedY + 10, 10, { sleeping: true });

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

    // Mia head with high natural hairline, sleek bun, red hairpin, and daydreaming gaze
    this.drawMiaHead(ctx, charX - 6, charY - 8, 13, { expression: 'thinking' });

    // Floating Thought Bubble: Mia thinking of Leo (in clear upper-right room space)
    this.drawThoughtBubble(ctx, x + w - 176, y + 36, 150, 88, false);

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

    // Mia head & high natural hairline with focused gaming gaze
    this.drawMiaHead(ctx, charX - 4, charY - 10, 13, { expression: 'gaming' });

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

    // Mia's head with high natural hairline, sleek top bun, red hairpin, and cooking smile
    this.drawMiaHead(ctx, cookX, cookY, 14, { expression: 'cooking' });

    ctx.restore();
  }

  drawMiaReading(ctx, x, y, w, h) {
    ctx.save();
    const lampX = x + w - 75;
    const lampY = y + 75;

    // Glowing string fairy lights & warm pastel lavender-pink ambiance
    const glow = ctx.createRadialGradient(lampX, lampY + 30, 10, lampX, lampY + 100, 200);
    glow.addColorStop(0, 'rgba(255, 215, 240, 0.85)');
    glow.addColorStop(0.35, 'rgba(232, 121, 249, 0.25)');
    glow.addColorStop(1, 'rgba(232, 121, 249, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lampX, lampY + 90, 200, 0, Math.PI * 2);
    ctx.fill();

    // String fairy lights along wall
    const bulbCols = ['#fbcfe8', '#fef08a', '#c7d2fe', '#fed7aa'];
    for (let i = 0; i < 6; i++) {
      const bx = x + 60 + i * 45;
      const by = y + 42 + Math.sin(i * 0.8) * 6;
      ctx.fillStyle = bulbCols[i % bulbCols.length];
      ctx.beginPath();
      ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Comfy oversized lavender beanbag / floor cushion
    const cushionX = x + 125;
    const cushionY = y + h - 140;
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.ellipse(cushionX, cushionY + 15, 52, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d8b4fe';
    ctx.beginPath();
    ctx.ellipse(cushionX - 4, cushionY + 8, 44, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mia seated comfortably with knees curled
    const charX = cushionX;
    const charY = cushionY - 20;

    // Cute oversized pastel pink sweater
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.ellipse(charX, charY + 22, 20, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arms holding open manga volume
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(charX - 14, charY + 14);
    ctx.lineTo(charX - 5, charY + 30);
    ctx.lineTo(charX + 4, charY + 28);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(charX + 14, charY + 14);
    ctx.lineTo(charX + 8, charY + 30);
    ctx.lineTo(charX - 2, charY + 28);
    ctx.stroke();

    // Open manga booklet
    const bookX = charX - 14;
    const bookY = charY + 20;
    ctx.fillStyle = '#fb7185'; // Coral pink cover
    ctx.fillRect(bookX - 2, bookY + 6, 32, 15);
    ctx.fillStyle = '#ffffff'; // Manga pages
    ctx.fillRect(bookX, bookY + 6, 14, 13);
    ctx.fillRect(bookX + 15, bookY + 6, 14, 13);
    // Manga panel lines
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(bookX + 2, bookY + 8, 10, 4);
    ctx.strokeRect(bookX + 2, bookY + 13, 10, 4);
    ctx.strokeRect(bookX + 17, bookY + 8, 10, 9);

    // Mia's head with sleek top bun, red hairpin, and reading smile
    this.drawMiaHead(ctx, charX, charY - 8, 13, { expression: 'reading' });

    // Sleepy calico cat sleeping next to cushion
    const catX = cushionX + 58;
    const catY = cushionY + 22;
    const catBreath = Math.sin(this.animTime * 2) * 1.5;
    ctx.fillStyle = '#f59e0b'; // Calico orange
    ctx.beginPath();
    ctx.ellipse(catX, catY, 14, 10 + catBreath, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e1b4b'; // Calico dark patch
    ctx.beginPath();
    ctx.arc(catX - 4, catY - 3, 5, 0, Math.PI * 2);
    ctx.fill();
    // Cat ears
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(catX - 10, catY - 6);
    ctx.lineTo(catX - 6, catY - 14);
    ctx.lineTo(catX - 2, catY - 6);
    ctx.fill();

    // Small wooden tray with matcha tea
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cushionX - 70, cushionY + 20, 26, 6);
    ctx.fillStyle = '#10b981'; // Green matcha bowl
    ctx.beginPath();
    ctx.arc(cushionX - 57, cushionY + 16, 7, 0, Math.PI);
    ctx.fill();

    ctx.restore();
  }

  drawMiaMusic(ctx, x, y, w, h) {
    ctx.save();
    const lampX = x + 130;
    const lampY = y + 70;

    // Glowing vibrant city-pop neon atmosphere (magenta & cyan)
    const glow = ctx.createRadialGradient(lampX, lampY + 40, 10, lampX, lampY + 120, 210);
    glow.addColorStop(0, 'rgba(244, 114, 182, 0.8)');
    glow.addColorStop(0.4, 'rgba(168, 85, 247, 0.25)');
    glow.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lampX, lampY + 100, 210, 0, Math.PI * 2);
    ctx.fill();

    // Table on the left supporting boombox
    const deskX = x + 35;
    const deskY = y + h - 135;
    ctx.fillStyle = '#334155';
    ctx.fillRect(deskX, deskY, 95, 45);
    ctx.fillStyle = '#475569';
    ctx.fillRect(deskX - 3, deskY - 5, 101, 7);

    // Retro Boombox Stereo Body (Unmistakable dual-speaker cassette player!)
    const boxX = deskX + 5;
    const boxY = deskY - 48;
    const boxW = 86;
    const boxH = 44;

    // Metallic carry handle on top
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(boxX + 22, boxY);
    ctx.lineTo(boxX + 22, boxY - 9);
    ctx.lineTo(boxX + boxW - 22, boxY - 9);
    ctx.lineTo(boxX + boxW - 22, boxY);
    ctx.stroke();

    // Telescopic metal antenna angled up-right
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(boxX + boxW - 10, boxY);
    ctx.lineTo(boxX + boxW + 8, boxY - 24);
    ctx.stroke();

    // Main boombox cabinet (dark synthwave casing with hot pink bevel)
    ctx.fillStyle = '#181824';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Top control strip: tape deck buttons & tuning knobs
    ctx.fillStyle = '#272738';
    ctx.fillRect(boxX + 4, boxY + 3, boxW - 8, 8);
    // Buttons (Play, Rewind, Stop)
    ['#38bdf8', '#ec4899', '#facc15', '#a855f7'].forEach((c, idx) => {
      ctx.fillStyle = c;
      ctx.fillRect(boxX + 8 + idx * 8, boxY + 5, 5, 4);
    });
    // Volume knob
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(boxX + boxW - 10, boxY + 7, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Left Circular Speaker Grille
    const spkLeftX = boxX + 18;
    const spkY = boxY + 26;
    const spkR = 14;
    // Outer metallic speaker ring
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(spkLeftX, spkY, spkR, 0, Math.PI * 2);
    ctx.fill();
    // Inner dark speaker cone
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(spkLeftX, spkY, spkR - 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Center chrome dust cap
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(spkLeftX, spkY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Right Circular Speaker Grille
    const spkRightX = boxX + boxW - 18;
    // Outer metallic speaker ring
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(spkRightX, spkY, spkR, 0, Math.PI * 2);
    ctx.fill();
    // Inner dark speaker cone
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(spkRightX, spkY, spkR - 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Center chrome dust cap
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(spkRightX, spkY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Animated soundwave ripple rings from speakers
    const pulseRing = (this.animTime * 3) % 1;
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.5 * (1 - pulseRing)})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(spkLeftX, spkY, spkR + pulseRing * 8, 0, Math.PI * 2);
    ctx.arc(spkRightX, spkY, spkR + pulseRing * 8, 0, Math.PI * 2);
    ctx.stroke();

    // Center Section between the two speakers:
    const centerMidX = boxX + boxW / 2;
    // 1. Cassette tape window
    ctx.fillStyle = '#05070e';
    ctx.fillRect(centerMidX - 14, boxY + 14, 28, 12);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(centerMidX - 14, boxY + 14, 28, 12);
    // Tape spools spinning
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(centerMidX - 6, boxY + 20, 2.5, 0, Math.PI * 2);
    ctx.arc(centerMidX + 6, boxY + 20, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 2. Animated LED Equalizer Bar Graph on the Boombox Front Panel!
    const eqX = centerMidX - 13;
    const eqY = boxY + 28;
    const eqW = 26;
    const eqH = 13;
    ctx.fillStyle = '#000000';
    ctx.fillRect(eqX, eqY, eqW, eqH);

    const barHeights = [10, 6, 12, 8, 11];
    for (let b = 0; b < barHeights.length; b++) {
      const bh = Math.max(2, Math.min(eqH - 1, barHeights[b] + Math.sin(this.animTime * 7 + b * 1.5) * 4));
      ctx.fillStyle = b % 2 === 0 ? '#06b6d4' : '#ec4899';
      ctx.fillRect(eqX + 2 + b * 5, eqY + eqH - bh, 3, bh);
    }

    // Stool & Mia sitting, gently bobbing to the music
    const bob = Math.sin(this.animTime * 4) * 2;
    const charX = x + 160;
    const charY = y + h - 160 + bob;

    // Stool
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.ellipse(charX, y + h - 105, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9f1239';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(charX - 10, y + h - 105);
    ctx.lineTo(charX - 14, y + h - 75);
    ctx.moveTo(charX + 10, y + h - 105);
    ctx.lineTo(charX + 14, y + h - 75);
    ctx.stroke();

    // Mia's outfit: pastel lavender top & pink skirt
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.ellipse(charX, charY + 24, 18, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Holding pastel phone/player or hands swaying
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(charX - 18, charY + 22, 12, 18, 2);
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(charX - 12, charY + 15);
    ctx.lineTo(charX - 14, charY + 26);
    ctx.stroke();

    // Mia's head with joyful expression
    this.drawMiaHead(ctx, charX, charY - 8, 13, { expression: 'singing' });

    // Adorable Cat-Ear Headphones on Mia's head!
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(charX, charY - 12, 15, Math.PI + 0.3, 2 * Math.PI - 0.3);
    ctx.stroke();
    // Glowing neon cat ears on headphone band
    const earPulse = 0.8 + 0.2 * Math.sin(this.animTime * 6);
    ctx.fillStyle = `rgba(236, 72, 153, ${earPulse})`;
    // Left ear
    ctx.beginPath();
    ctx.moveTo(charX - 11, charY - 22);
    ctx.lineTo(charX - 7, charY - 32);
    ctx.lineTo(charX - 2, charY - 24);
    ctx.closePath();
    ctx.fill();
    // Right ear
    ctx.beginPath();
    ctx.moveTo(charX + 2, charY - 24);
    ctx.lineTo(charX + 7, charY - 32);
    ctx.lineTo(charX + 11, charY - 22);
    ctx.closePath();
    ctx.fill();

    // Glowing pastel musical notes and sparkles floating up from boombox
    const noteTime = this.animTime * 2;
    const notes = [
      { char: '♪', ox: -12, oy: -35, speed: 22, col: '#f472b6' },
      { char: '✦', ox: 14, oy: -50, speed: 26, col: '#38bdf8' },
      { char: '♫', ox: 0, oy: -42, speed: 20, col: '#fef08a' }
    ];
    ctx.font = 'bold 15px "Cinzel", Georgia, serif';
    notes.forEach((n, idx) => {
      const ny = (n.oy - noteTime * n.speed + idx * 35) % 85 - 20;
      const nx = boxX + boxW / 2 + n.ox + Math.sin(noteTime + idx) * 8;
      const alpha = Math.max(0, 0.85 * (1 - Math.abs(ny + 20) / 65));
      ctx.fillStyle = n.col;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = n.col;
      ctx.shadowBlur = 8;
      ctx.fillText(n.char, nx, boxY + ny);
    });
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  drawMiaPlants(ctx, x, y, w, h) {
    ctx.save();
    const lampX = x + 110;
    const lampY = y + 70;

    // Warm pastel botanical light
    const glow = ctx.createRadialGradient(lampX, lampY + 30, 10, lampX, lampY + 110, 200);
    glow.addColorStop(0, 'rgba(255, 230, 240, 0.85)');
    glow.addColorStop(0.35, 'rgba(244, 114, 182, 0.22)');
    glow.addColorStop(1, 'rgba(244, 114, 182, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lampX, lampY + 95, 200, 0, Math.PI * 2);
    ctx.fill();

    // 1. Hanging Macrame Planter from ceiling on left
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + 55, y);
    ctx.lineTo(x + 48, y + 55);
    ctx.moveTo(x + 55, y);
    ctx.lineTo(x + 62, y + 55);
    ctx.stroke();
    // Hanging white ceramic bowl pot
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(x + 55, y + 62, 12, 0, Math.PI);
    ctx.fill();
    // Cascading trailing ivy & string-of-pearls
    ctx.fillStyle = '#10b981';
    const trailingIvy = [[48, 68], [60, 72], [42, 82], [54, 88], [64, 84], [46, 102], [58, 108]];
    trailingIvy.forEach(([ix, iy]) => {
      ctx.beginPath();
      ctx.ellipse(x + ix, y + iy, 5, 8, 0.25, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Tokyo Multi-Tier Zen Bamboo Plant Stand on right
    const standX = x + w - 175;
    const standY = y + h - 165;
    // Wooden shelves structure
    ctx.fillStyle = '#3a2b22';
    ctx.fillRect(standX, standY, 105, 80);
    // Shelf tiers (warm bamboo wood)
    ctx.fillStyle = '#85593d';
    ctx.fillRect(standX - 6, standY - 14, 117, 8); // Top shelf
    ctx.fillRect(standX - 2, standY + 30, 110, 8); // Middle shelf

    // --- Top Shelf Plants ---
    // A. Miniature Cherry Blossom Bonsai in shallow glazed ceramic pot
    const potX = standX + 10;
    const potY = standY - 26;
    ctx.fillStyle = '#0284c7'; // Glazed blue ceramic pot
    ctx.fillRect(potX, potY, 34, 12);
    // Bonsai gnarled trunk
    ctx.strokeStyle = '#573d2a';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(potX + 17, potY);
    ctx.quadraticCurveTo(potX + 24, potY - 20, potX + 14, potY - 34);
    ctx.stroke();
    // Cherry blossom floral clouds
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(potX + 10, potY - 38, 12, 0, Math.PI * 2);
    ctx.arc(potX + 22, potY - 40, 10, 0, Math.PI * 2);
    ctx.arc(potX + 16, potY - 46, 11, 0, Math.PI * 2);
    ctx.fill();
    // Sakura petal highlights
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.arc(potX + 8, potY - 36, 5, 0, Math.PI * 2);
    ctx.arc(potX + 22, potY - 39, 4, 0, Math.PI * 2);
    ctx.fill();

    // B. Striped Snake Plant (Sansevieria) in modern white ceramic pot
    const snakeX = standX + 66;
    const snakeY = standY - 26;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(snakeX, snakeY, 22, 12);
    // Upright green sword leaves with yellow margins
    const snakeLeaves = [
      { ox: 4, h: 28, tilt: -0.15 },
      { ox: 11, h: 36, tilt: 0.05 },
      { ox: 17, h: 26, tilt: 0.2 }
    ];
    snakeLeaves.forEach(leaf => {
      ctx.fillStyle = '#047857';
      ctx.beginPath();
      ctx.ellipse(snakeX + leaf.ox, snakeY - leaf.h / 2, 3.5, leaf.h / 2, leaf.tilt, 0, Math.PI * 2);
      ctx.fill();
      // Yellow leaf border stripe
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // --- Middle Shelf Plants ---
    // C. Lush Arching Boston Fern in terracotta pot
    const fernX = standX + 8;
    const fernY = standY + 16;
    ctx.fillStyle = '#c2410c'; // Terracotta
    ctx.fillRect(fernX, fernY, 26, 14);
    ctx.fillStyle = '#22c55e'; // Vibrant green fronds
    for (let f = 0; f < 5; f++) {
      ctx.beginPath();
      ctx.ellipse(fernX + 4 + f * 4.5, fernY - 6 - (f % 2) * 5, 4, 12, (f - 2) * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // D. Cute Pastel Cat Succulent Pot
    const catPotX = standX + 48;
    const catPotY = standY + 18;
    ctx.fillStyle = '#fef08a'; // Pastel yellow cat pot
    ctx.beginPath();
    ctx.roundRect(catPotX, catPotY, 18, 12, 3);
    ctx.fill();
    // Cat ears on pot
    ctx.beginPath();
    ctx.moveTo(catPotX + 2, catPotY);
    ctx.lineTo(catPotX + 5, catPotY - 4);
    ctx.lineTo(catPotX + 8, catPotY);
    ctx.moveTo(catPotX + 10, catPotY);
    ctx.lineTo(catPotX + 13, catPotY - 4);
    ctx.lineTo(catPotX + 16, catPotY);
    ctx.fill();
    // Succulent rosette in cat pot
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(catPotX + 9, catPotY - 3, 6, 0, Math.PI * 2);
    ctx.fill();

    // E. Blooming Orchid / Lavender Pot
    const orchidX = standX + 76;
    const orchidY = standY + 18;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(orchidX, orchidY, 16, 12);
    // Purple orchid blossoms
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(orchidX + 8, orchidY);
    ctx.quadraticCurveTo(orchidX + 14, orchidY - 14, orchidX + 6, orchidY - 22);
    ctx.stroke();
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(orchidX + 12, orchidY - 12, 4, 0, Math.PI * 2);
    ctx.arc(orchidX + 6, orchidY - 22, 5, 0, Math.PI * 2);
    ctx.fill();

    // --- Floor Plant Beside Stand ---
    // F. Large Floor Pot with Broad Split-Leaf Monstera
    const monstX = standX - 22;
    const monstY = y + h - 118;
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(monstX, monstY, 24, 26);
    ctx.fillStyle = '#065f46'; // Emerald Monstera leaves
    ctx.beginPath();
    ctx.ellipse(monstX - 4, monstY - 16, 14, 20, -0.4, 0, Math.PI * 2);
    ctx.ellipse(monstX + 16, monstY - 22, 16, 22, 0.35, 0, Math.PI * 2);
    ctx.fill();

    // 3. Mia standing on the left watering her rich indoor garden
    const charX = x + 115;
    const charY = y + h - 150;

    // Pastel mint apron over pink knit sweater
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.ellipse(charX, charY + 26, 18, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a7f3d0'; // Mint apron
    ctx.fillRect(charX - 10, charY + 12, 20, 32);

    // Chic vintage watering can in Mia's hands
    const canX = charX + 18;
    const canY = charY + 20;
    // Watering can body (soft pastel turquoise)
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(canX, canY, 20, 16, 3);
    ctx.fill();
    // Handle
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(canX - 2, canY + 7, 7, Math.PI / 2, 1.5 * Math.PI);
    ctx.stroke();
    // Slender spout angled up and right towards the plants
    ctx.beginPath();
    ctx.moveTo(canX + 20, canY + 12);
    ctx.lineTo(canX + 34, canY - 2);
    ctx.stroke();

    // Arm holding watering can
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(charX + 8, charY + 14);
    ctx.lineTo(canX + 12, canY + 4);
    ctx.stroke();

    // Sparkling water droplets arching into the plants
    const dropTime = this.animTime * 5;
    for (let d = 0; d < 5; d++) {
      const dt = ((dropTime + d * 0.6) % 2.5) / 2.5;
      const dx = (canX + 34) + dt * 26;
      const dy = (canY - 2) + dt * dt * 28;
      ctx.fillStyle = 'rgba(147, 197, 253, 0.85)';
      ctx.beginPath();
      ctx.arc(dx, dy, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mia's head with sleek bun and happy caring expression
    this.drawMiaHead(ctx, charX, charY - 8, 14, { expression: 'cooking' });

    // Calico cat sitting next to Mia watching the droplets
    const catX = charX - 32;
    const catY = charY + 44;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.ellipse(catX, catY, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cat ears
    ctx.beginPath();
    ctx.moveTo(catX - 6, catY - 6);
    ctx.lineTo(catX - 3, catY - 12);
    ctx.lineTo(catX, catY - 6);
    ctx.fill();

    ctx.restore();
  }

  drawMiaStargazing(ctx, x, y, w, h) {
    ctx.save();
    // Dim ambient celestial light with star lantern
    const lanternX = x + 80;
    const lanternY = y + 65;

    // Glowing Origami Star Lantern hanging from ceiling
    const starGlow = ctx.createRadialGradient(lanternX, lanternY, 5, lanternX, lanternY, 140);
    starGlow.addColorStop(0, 'rgba(254, 240, 138, 0.7)');
    starGlow.addColorStop(0.4, 'rgba(244, 114, 182, 0.2)');
    starGlow.addColorStop(1, 'rgba(244, 114, 182, 0)');
    ctx.fillStyle = starGlow;
    ctx.beginPath();
    ctx.arc(lanternX, lanternY, 140, 0, Math.PI * 2);
    ctx.fill();

    // Cord
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(lanternX, y);
    ctx.lineTo(lanternX, lanternY - 12);
    ctx.stroke();

    // Glowing Star Shape
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a1 = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const a2 = a1 + (2 * Math.PI) / 10;
      const r1 = 12;
      const r2 = 5;
      if (i === 0) ctx.moveTo(lanternX + Math.cos(a1) * r1, lanternY + Math.sin(a1) * r1);
      else ctx.lineTo(lanternX + Math.cos(a1) * r1, lanternY + Math.sin(a1) * r1);
      ctx.lineTo(lanternX + Math.cos(a2) * r2, lanternY + Math.sin(a2) * r2);
    }
    ctx.closePath();
    ctx.fill();

    // Sleek Modern White & Rose-Gold Telescope on Tripod (aimed out window toward right sky)
    const scopeX = x + w - 180;
    const scopeY = y + h - 165;
    // Tripod legs (white metal)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(scopeX, scopeY);
    ctx.lineTo(scopeX - 30, scopeY + 80);
    ctx.moveTo(scopeX, scopeY);
    ctx.lineTo(scopeX, scopeY + 85);
    ctx.moveTo(scopeX, scopeY);
    ctx.lineTo(scopeX + 32, scopeY + 80);
    ctx.stroke();

    // Rose gold mount
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.arc(scopeX, scopeY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Telescope Barrel pointing up-right (+35 degrees)
    ctx.save();
    ctx.translate(scopeX, scopeY);
    ctx.rotate(0.55);
    // Sleek white tube
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-15, -6, 85, 12);
    // Rose-gold accents
    ctx.fillStyle = '#fb7185';
    ctx.fillRect(20, -7, 6, 14);
    ctx.fillRect(70, -8, 8, 16);
    // Eyepiece
    ctx.fillStyle = '#475569';
    ctx.fillRect(-24, -4, 9, 8);
    // Lens glow
    ctx.fillStyle = 'rgba(244, 114, 182, 0.7)';
    ctx.beginPath();
    ctx.ellipse(78, 0, 2, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Mia standing beside telescope, pointing up at the constellations
    const charX = scopeX - 35;
    const charY = scopeY - 5;

    // Pastel lilac coat & scarf
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.ellipse(charX, charY + 28, 18, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arm pointing up at the stars
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(charX + 8, charY + 16);
    ctx.lineTo(charX + 28, charY - 8);
    ctx.stroke();

    // Mia's head gazing upwards at the cosmos in wonder
    this.drawMiaHead(ctx, charX, charY - 10, 13, { expression: 'singing' });

    // Calico cat sitting right beside tripod also looking up at the sky!
    const catX = scopeX + 20;
    const catY = scopeY + 70;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.ellipse(catX, catY, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cat ears
    ctx.beginPath();
    ctx.moveTo(catX - 4, catY - 6);
    ctx.lineTo(catX - 1, catY - 12);
    ctx.lineTo(catX + 2, catY - 6);
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
