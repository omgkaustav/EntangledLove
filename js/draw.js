/**
 * draw.js - Canvas Rendering Engine for "Entangled Love"
 * 
 * Renders the shared night sky, two neighboring apartment windows (Person A and Person B),
 * smooth sliding velvet curtains, warm practical lighting, and 4 distinct character activities:
 *   0: in bed (lamp, blanket)
 *   1: thinking of the other (window, chin on hand)
 *   2: playing a game (desk glow, small screen)
 *   3: cooking (pot, steam)
 * 
 * ARTIST NOTE:
 * All activity scenes and characters are modularized. Any procedural drawing function
 * can be replaced with pre-rendered bitmap sprites or sprite-sheet animations by
 * drawing an Image/Canvas onto the provided context (ctx).
 */

export const VIRTUAL_WIDTH = 960;
export const VIRTUAL_HEIGHT = 540;

// Polyfill CanvasRenderingContext2D.roundRect if not natively supported
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

// Coordinates of the two apartment windows
export const WINDOW_A = {
  x: 90,
  y: 75,
  width: 360,
  height: 400,
  label: 'A'
};

export const WINDOW_B = {
  x: 510,
  y: 75,
  width: 360,
  height: 400,
  label: 'B'
};

// Color Palette (Muted, warm nocturnal aesthetic)
const PALETTE = {
  skyTop: '#0a0d18',
  skyMid: '#141829',
  skyBottom: '#221b2d',
  moon: '#f4ebd0',
  moonGlow: 'rgba(244, 235, 208, 0.15)',
  star: 'rgba(255, 255, 255, 0.8)',
  brickDark: '#1a1924',
  brickLight: '#242231',
  wallMortar: '#12111a',
  windowFrame: '#3d3448',
  windowFrameDark: '#272030',
  windowSill: '#4a4156',
  curtainClosed: '#5b1f2b', // Deep wine velvet
  curtainShadow: '#36111a',
  curtainFold: '#772c3b',
  curtainGold: '#d6a858',
  roomAmbient: '#1c1724',
  warmLight: 'rgba(255, 215, 140, 0.28)',
  warmLightCore: 'rgba(255, 235, 180, 0.7)',
  coolScreenGlow: 'rgba(90, 200, 220, 0.35)',
  coolScreenCore: '#bbf0f8'
};

export class SceneRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.animTime = 0;
    this.stars = this.generateStars(60);
    this.steamParticles = this.generateSteamParticles(25);
    
    // Animation states: 0.0 (closed) to 1.0 (open)
    this.curtainA = 0.0;
    this.curtainB = 0.0;
    this.targetCurtainA = 0.0;
    this.targetCurtainB = 0.0;

    // Current activity codes (0: bed, 1: thinking, 2: playing, 3: cooking)
    this.activityA = 0;
    this.activityB = 0;

    // Hover states for interactive feedback
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

    this.scale = (displayWidth / VIRTUAL_WIDTH) * dpr;
  }

  generateStars(count) {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: (i * 97) % VIRTUAL_WIDTH,
        y: ((i * 53) % 240) + 10,
        size: (i % 3) * 0.7 + 0.8,
        pulseSpeed: 1.2 + (i % 5) * 0.4,
        phase: (i * 1.7) % (Math.PI * 2)
      });
    }
    return stars;
  }

  generateSteamParticles(count) {
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 20,
        y: Math.random() * -60,
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

  setCurtains(openA, openB) {
    this.targetCurtainA = openA ? 1.0 : 0.0;
    this.targetCurtainB = openB ? 1.0 : 0.0;
  }

  toggleCurtain(windowKey) {
    if (windowKey === 'A') {
      this.targetCurtainA = this.targetCurtainA > 0.5 ? 0.0 : 1.0;
      return this.targetCurtainA > 0.5;
    } else if (windowKey === 'B') {
      this.targetCurtainB = this.targetCurtainB > 0.5 ? 0.0 : 1.0;
      return this.targetCurtainB > 0.5;
    }
    return false;
  }

  update(dt = 0.016) {
    this.animTime += dt;

    // Smooth curtain sliding interpolation (spring ease)
    const speed = 7.0 * dt;
    this.curtainA += (this.targetCurtainA - this.curtainA) * speed;
    this.curtainB += (this.targetCurtainB - this.curtainB) * speed;

    // Clamp small epsilon
    if (Math.abs(this.curtainA - this.targetCurtainA) < 0.002) this.curtainA = this.targetCurtainA;
    if (Math.abs(this.curtainB - this.targetCurtainB) < 0.002) this.curtainB = this.targetCurtainB;
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    // Clear buffer
    ctx.clearRect(0, 0, w, h);

    // Apply uniform scaling to fit virtual 960x540 viewport
    const scaleX = w / VIRTUAL_WIDTH;
    const scaleY = h / VIRTUAL_HEIGHT;
    ctx.scale(scaleX, scaleY);

    // 1. Draw Shared Night Sky Backdrop
    this.drawNightSky(ctx);

    // 2. Draw Distant City Silhouette & Horizon
    this.drawCitySkyline(ctx);

    // 3. Draw Building Architecture & Facades
    this.drawBuildingFacade(ctx);

    // 4. Draw Inside Room A & Activity
    this.drawRoom(ctx, WINDOW_A, this.activityA, false, this.curtainA);

    // 5. Draw Inside Room B & Activity
    this.drawRoom(ctx, WINDOW_B, this.activityB, true, this.curtainB);

    // 6. Draw Window Panes, Glass Reflections, & Outer Sills
    this.drawWindowFrames(ctx, WINDOW_A);
    this.drawWindowFrames(ctx, WINDOW_B);

    // 7. Draw Sliding Velvet Curtains (A and B)
    this.drawCurtain(ctx, WINDOW_A, this.curtainA);
    this.drawCurtain(ctx, WINDOW_B, this.curtainB);

    // 8. Draw Subtle Hover Guides
    this.drawHoverIndicators(ctx);

    ctx.restore();
  }

  /**
   * 1. Shared Night Sky
   */
  drawNightSky(ctx) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT * 0.7);
    skyGrad.addColorStop(0, PALETTE.skyTop);
    skyGrad.addColorStop(0.5, PALETTE.skyMid);
    skyGrad.addColorStop(1, PALETTE.skyBottom);

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // Stars
    for (const star of this.stars) {
      const alpha = 0.4 + 0.5 * Math.sin(this.animTime * star.pulseSpeed + star.phase);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, alpha)})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Warm Crescent Moon in center-top night sky
    const moonX = VIRTUAL_WIDTH * 0.485;
    const moonY = 55;
    const moonR = 24;

    // Moon Glow
    const glowGrad = ctx.createRadialGradient(moonX, moonY, moonR * 0.5, moonX, moonY, moonR * 3);
    glowGrad.addColorStop(0, PALETTE.moonGlow);
    glowGrad.addColorStop(1, 'rgba(244, 235, 208, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR * 3, 0, Math.PI * 2);
    ctx.fill();

    // Crescent Moon
    ctx.save();
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.moon;
    ctx.fill();
    // Shadow cutout for crescent
    ctx.beginPath();
    ctx.arc(moonX + 9, moonY - 4, moonR * 0.95, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.skyTop;
    ctx.fill();
    ctx.restore();
  }

  /**
   * 2. Distant City Skyline
   */
  drawCitySkyline(ctx) {
    ctx.save();
    ctx.fillStyle = '#0e111d';

    // Distant building silhouettes in center gap between apartments
    const buildings = [
      { x: 440, y: 160, w: 26, h: 220 },
      { x: 462, y: 190, w: 32, h: 190 },
      { x: 490, y: 140, w: 24, h: 240 },
      { x: 450, y: 120, w: 4, h: 40 } // Antenna
    ];

    for (const b of buildings) {
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }

    // Tiny distant glowing windows
    ctx.fillStyle = 'rgba(245, 215, 130, 0.4)';
    const tinyWindows = [
      [445, 175], [455, 185], [445, 210],
      [470, 205], [480, 220], [470, 240],
      [496, 160], [504, 180], [498, 210]
    ];
    for (const [wx, wy] of tinyWindows) {
      ctx.fillRect(wx, wy, 3, 4);
    }

    ctx.restore();
  }

  /**
   * 3. Building Architecture & Exterior Facades
   */
  drawBuildingFacade(ctx) {
    ctx.save();

    // Exterior brick walls framing the windows
    ctx.fillStyle = PALETTE.brickDark;
    // Left exterior block
    ctx.fillRect(0, 0, WINDOW_A.x - 20, VIRTUAL_HEIGHT);
    // Right exterior block
    ctx.fillRect(WINDOW_B.x + WINDOW_B.width + 20, 0, VIRTUAL_WIDTH - (WINDOW_B.x + WINDOW_B.width + 20), VIRTUAL_HEIGHT);
    // Central wall divider
    ctx.fillRect(WINDOW_A.x + WINDOW_A.width + 15, 280, (WINDOW_B.x - 15) - (WINDOW_A.x + WINDOW_A.width + 15), VIRTUAL_HEIGHT - 280);

    // Top cornice header
    ctx.fillStyle = PALETTE.windowFrameDark;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, 45);
    ctx.fillStyle = '#31283d';
    ctx.fillRect(0, 42, VIRTUAL_WIDTH, 6);

    // Ground line / bottom foundation
    ctx.fillStyle = '#110f18';
    ctx.fillRect(0, VIRTUAL_HEIGHT - 35, VIRTUAL_WIDTH, 35);

    // Decorative balcony railings or power line between apartments
    ctx.strokeStyle = 'rgba(50, 45, 65, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(WINDOW_A.x + WINDOW_A.width, 110);
    ctx.bezierCurveTo(475, 140, 485, 140, WINDOW_B.x, 110);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(WINDOW_A.x + WINDOW_A.width, 130);
    ctx.bezierCurveTo(475, 160, 485, 160, WINDOW_B.x, 130);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 4. Draw Inside Room & Character Activity
   */
  drawRoom(ctx, win, activityCode, isMirrored, curtainAmount) {
    ctx.save();

    // Clip rendering strictly to window bounds
    ctx.beginPath();
    ctx.rect(win.x, win.y, win.width, win.height);
    ctx.clip();

    // Deep cozy room background
    const roomGrad = ctx.createLinearGradient(win.x, win.y, win.x, win.y + win.height);
    roomGrad.addColorStop(0, '#120f1c');
    roomGrad.addColorStop(0.7, '#1d1726');
    roomGrad.addColorStop(1, '#2a2034');
    ctx.fillStyle = roomGrad;
    ctx.fillRect(win.x, win.y, win.width, win.height);

    // Warm wooden floorboards
    ctx.fillStyle = '#221a22';
    ctx.fillRect(win.x, win.y + win.height - 85, win.width, 85);
    ctx.strokeStyle = '#181318';
    ctx.lineWidth = 1;
    for (let fy = win.y + win.height - 85; fy < win.y + win.height; fy += 20) {
      ctx.beginPath();
      ctx.moveTo(win.x, fy);
      ctx.lineTo(win.x + win.width, fy);
      ctx.stroke();
    }

    // Cozy interior wallpaper pattern (subtle vertical pinstripes)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    for (let px = win.x + 15; px < win.x + win.width; px += 24) {
      ctx.beginPath();
      ctx.moveTo(px, win.y);
      ctx.lineTo(px, win.y + win.height - 85);
      ctx.stroke();
    }

    // Call specific activity renderer
    const rx = win.x;
    const ry = win.y;
    const rw = win.width;
    const rh = win.height;

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
  }

  /**
   * ACTIVITY 0: In Bed (00)
   * Silhouette & prop: warm lamp, cozy blanket, resting person
   * 
   * ARTIST NOTE:
   * Replace this function with an image draw or custom sprite sheet for activity 0 (in bed):
   * ctx.drawImage(sprites.bedA, x, y, width, height);
   */
  drawActivityBed(ctx, x, y, w, h, isMirrored) {
    ctx.save();
    
    // Bedside Lamp (Warm practical light)
    const lampX = isMirrored ? x + w - 70 : x + 70;
    const lampY = y + h - 170;

    // Warm radial lamp light casting into room
    const lampGlow = ctx.createRadialGradient(lampX, lampY, 15, lampX, lampY, 170);
    lampGlow.addColorStop(0, PALETTE.warmLightCore);
    lampGlow.addColorStop(0.3, PALETTE.warmLight);
    lampGlow.addColorStop(1, 'rgba(255, 215, 140, 0)');
    ctx.fillStyle = lampGlow;
    ctx.beginPath();
    ctx.arc(lampX, lampY, 170, 0, Math.PI * 2);
    ctx.fill();

    // Nightstand table
    ctx.fillStyle = '#3a2e38';
    ctx.fillRect(lampX - 25, lampY + 35, 50, 50);
    ctx.fillStyle = '#2d242c';
    ctx.fillRect(lampX - 22, lampY + 50, 44, 15); // Drawer

    // Lamp base and shade
    ctx.fillStyle = '#9e8156'; // Brass stem
    ctx.fillRect(lampX - 3, lampY, 6, 35);
    ctx.beginPath();
    ctx.arc(lampX, lampY + 35, 14, 0, Math.PI, true);
    ctx.fill();

    // Lamp shade
    ctx.fillStyle = '#ffeec2';
    ctx.beginPath();
    ctx.moveTo(lampX - 22, lampY);
    ctx.lineTo(lampX + 22, lampY);
    ctx.lineTo(lampX + 14, lampY - 26);
    ctx.lineTo(lampX - 14, lampY - 26);
    ctx.closePath();
    ctx.fill();

    // Small book on nightstand
    ctx.fillStyle = '#8f424b';
    ctx.fillRect(lampX - 18, lampY + 32, 22, 5);

    // Bed setup
    const bedX = isMirrored ? x + 35 : x + 95;
    const bedY = y + h - 160;
    const bedW = 230;
    const bedH = 75;

    // Wooden Headboard
    ctx.fillStyle = '#4f3c44';
    const hbX = isMirrored ? bedX + bedW - 18 : bedX;
    ctx.fillRect(hbX, bedY - 35, 18, bedH + 35);

    // Mattress & Bed frame
    ctx.fillStyle = '#33272e';
    ctx.fillRect(bedX, bedY + 30, bedW, 20);

    // Fluffy Pillows
    ctx.fillStyle = '#e8e0d5';
    const pilX = isMirrored ? bedX + bedW - 65 : bedX + 25;
    ctx.beginPath();
    ctx.ellipse(pilX, bedY + 12, 28, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Resting Character head & hair
    const headX = isMirrored ? pilX - 6 : pilX + 6;
    const headY = bedY + 8;
    // Hair
    ctx.fillStyle = isMirrored ? '#4a3328' : '#282b3c';
    ctx.beginPath();
    ctx.arc(headX, headY, 14, 0, Math.PI * 2);
    ctx.fill();
    // Sleeping face silhouette
    ctx.fillStyle = '#ecc7a6';
    ctx.beginPath();
    ctx.arc(isMirrored ? headX - 3 : headX + 3, headY + 2, 9, 0, Math.PI * 2);
    ctx.fill();

    // Blanket with gentle breathing cycle
    const breath = Math.sin(this.animTime * 1.8) * 2.5;
    ctx.fillStyle = isMirrored ? '#42586b' : '#6b4f59'; // Cozy quilt
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

    // Turned-over duvet sheet rim
    ctx.fillStyle = '#f0ebe2';
    const rimX = isMirrored ? bedX + bedW - 48 : bedX + 35;
    ctx.fillRect(rimX, bedY + 16 + breath, 22, 6);

    ctx.restore();
  }

  /**
   * ACTIVITY 1: Thinking of the Other (01)
   * Silhouette & prop: window frame, chin on hand, thoughtful silhouette
   * 
   * ARTIST NOTE:
   * Replace this function with an image draw or custom sprite sheet for activity 1 (thinking):
   * ctx.drawImage(sprites.thinkingA, x, y, width, height);
   */
  drawActivityThinking(ctx, x, y, w, h, isMirrored) {
    ctx.save();

    // Warm overhead ceiling pendant lamp
    const lampX = isMirrored ? x + 90 : x + w - 90;
    const lampY = y + 70;

    // Warm practical light cone
    const coneGrad = ctx.createRadialGradient(lampX, lampY, 10, lampX, lampY + 120, 190);
    coneGrad.addColorStop(0, PALETTE.warmLightCore);
    coneGrad.addColorStop(0.35, PALETTE.warmLight);
    coneGrad.addColorStop(1, 'rgba(255, 215, 140, 0)');
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.arc(lampX, lampY + 80, 180, 0, Math.PI * 2);
    ctx.fill();

    // Pendant cord & warm shade
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

    // Inner room window ledge / desk where person sits
    const deskX = isMirrored ? x + 40 : x + w - 210;
    const deskY = y + h - 170;
    const deskW = 170;

    // Cozy armchair / seat
    ctx.fillStyle = '#3f3547';
    const chairX = isMirrored ? deskX + 90 : deskX - 25;
    ctx.fillRect(chairX, deskY - 20, 55, 75);

    // Warm mug with subtle steam
    const mugX = isMirrored ? deskX + 35 : deskX + deskW - 35;
    const mugY = deskY - 14;
    ctx.fillStyle = '#ded1c3';
    ctx.fillRect(mugX - 6, mugY, 12, 14);
    // Mug steam
    const steamAlpha = 0.3 + 0.3 * Math.sin(this.animTime * 3);
    ctx.strokeStyle = `rgba(255, 255, 255, ${steamAlpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mugX, mugY);
    ctx.quadraticCurveTo(mugX - 4, mugY - 12, mugX + 2, mugY - 20);
    ctx.stroke();

    // Character sitting with chin on hand looking pensively
    const charX = isMirrored ? deskX + 70 : deskX + 50;
    const charY = deskY - 30;

    // Body / cozy sweater
    ctx.fillStyle = isMirrored ? '#75544c' : '#475e6d';
    ctx.beginPath();
    ctx.ellipse(charX, charY + 28, 22, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arm leaning on desk/sill
    ctx.strokeStyle = isMirrored ? '#75544c' : '#475e6d';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (!isMirrored) {
      // Leaning to the left towards the other window
      ctx.moveTo(charX + 5, charY + 24);
      ctx.lineTo(charX - 18, charY + 12);
      ctx.lineTo(charX - 12, charY - 8); // Hand to chin
    } else {
      // Leaning to the right towards the other window
      ctx.moveTo(charX - 5, charY + 24);
      ctx.lineTo(charX + 18, charY + 12);
      ctx.lineTo(charX + 12, charY - 8);
    }
    ctx.stroke();

    // Head
    ctx.fillStyle = '#edd1b8';
    ctx.beginPath();
    ctx.arc(charX, charY - 8, 14, 0, Math.PI * 2);
    ctx.fill();

    // Hair silhouette
    ctx.fillStyle = isMirrored ? '#35251e' : '#1f2430';
    ctx.beginPath();
    if (!isMirrored) {
      ctx.arc(charX + 2, charY - 12, 15, Math.PI * 0.8, Math.PI * 2.2);
    } else {
      ctx.arc(charX - 2, charY - 12, 15, Math.PI * 0.8, Math.PI * 2.2);
    }
    ctx.fill();

    // Desk surface
    ctx.fillStyle = '#4a3b38';
    ctx.fillRect(deskX, deskY, deskW, 16);
    ctx.fillStyle = '#352826';
    ctx.fillRect(deskX + 10, deskY + 16, deskW - 20, 60);

    ctx.restore();
  }

  /**
   * ACTIVITY 2: Playing a Game (10)
   * Silhouette & prop: desk glow, handheld/monitor screen
   * 
   * ARTIST NOTE:
   * Replace this function with an image draw or custom sprite sheet for activity 2 (gaming):
   * ctx.drawImage(sprites.gameA, x, y, width, height);
   */
  drawActivityGaming(ctx, x, y, w, h, isMirrored) {
    ctx.save();

    // Ambient room light: dim, with focused cyber/monitor glow
    const deskX = isMirrored ? x + 50 : x + w - 230;
    const deskY = y + h - 165;
    const deskW = 180;

    // Desk lamp (small warm yellow)
    const lampX = isMirrored ? deskX + deskW - 20 : deskX + 20;
    const lampY = deskY - 45;
    ctx.fillStyle = '#3d3429';
    ctx.fillRect(lampX - 3, lampY, 6, 45);
    ctx.fillStyle = '#e8ba51';
    ctx.beginPath();
    ctx.arc(lampX, lampY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Screen / Handheld glow casting onto player
    const screenX = isMirrored ? deskX + 75 : deskX + 105;
    const screenY = deskY - 35;

    // Glowing screen flare (animated pulsation)
    const screenPulse = 0.85 + 0.15 * Math.sin(this.animTime * 6);
    const screenGrad = ctx.createRadialGradient(screenX, screenY, 10, screenX, screenY, 140);
    screenGrad.addColorStop(0, PALETTE.coolScreenCore);
    screenGrad.addColorStop(0.35, `rgba(80, 210, 235, ${0.45 * screenPulse})`);
    screenGrad.addColorStop(1, 'rgba(80, 210, 235, 0)');
    ctx.fillStyle = screenGrad;
    ctx.beginPath();
    ctx.arc(screenX, screenY, 140, 0, Math.PI * 2);
    ctx.fill();

    // Desk
    ctx.fillStyle = '#2f2c38';
    ctx.fillRect(deskX, deskY, deskW, 14);
    ctx.fillStyle = '#1e1c25';
    ctx.fillRect(deskX + 15, deskY + 14, 12, 60);
    ctx.fillRect(deskX + deskW - 27, deskY + 14, 12, 60);

    // Gaming Monitor / Screen on stand
    ctx.fillStyle = '#1a1b24';
    ctx.fillRect(screenX - 25, screenY - 25, 50, 32);
    ctx.fillStyle = '#0f1118';
    ctx.fillRect(screenX - 2, screenY + 7, 4, 12);
    ctx.fillRect(screenX - 12, screenY + 19, 24, 4);

    // Bright game screen with retro pixels
    ctx.fillStyle = '#39bad6';
    ctx.fillRect(screenX - 22, screenY - 22, 44, 26);
    // Tiny in-game pixel character
    ctx.fillStyle = '#fce258';
    ctx.fillRect(screenX - 8, screenY - 14, 6, 8);
    ctx.fillStyle = '#f05b5b';
    ctx.fillRect(screenX + 4, screenY - 10, 7, 6);

    // Gamer silhouette sitting in high-back gaming chair
    const charX = isMirrored ? deskX + 125 : deskX + 45;
    const charY = deskY - 35;

    // Ergonomic Chair back
    ctx.fillStyle = '#1c1f2b';
    ctx.beginPath();
    ctx.roundRect(charX - 16, charY - 30, 32, 65, 8);
    ctx.fill();

    // Body leaning forward intensely
    ctx.fillStyle = isMirrored ? '#3b4e6b' : '#573d52';
    ctx.beginPath();
    ctx.ellipse(charX + (isMirrored ? -5 : 5), charY + 18, 18, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arms holding controller / keyboard
    ctx.strokeStyle = isMirrored ? '#3b4e6b' : '#573d52';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(charX, charY + 15);
    ctx.lineTo(isMirrored ? charX - 25 : charX + 25, charY + 20);
    ctx.stroke();

    // Hands / Controller with subtle LED
    ctx.fillStyle = '#383b48';
    ctx.fillRect(isMirrored ? charX - 35 : charX + 22, charY + 16, 14, 8);
    ctx.fillStyle = '#38d996';
    ctx.fillRect(isMirrored ? charX - 30 : charX + 26, charY + 18, 3, 3);

    // Head with gaming headset
    ctx.fillStyle = '#edd1b8';
    ctx.beginPath();
    ctx.arc(charX + (isMirrored ? -4 : 4), charY - 10, 13, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = isMirrored ? '#242b36' : '#3d252a';
    ctx.beginPath();
    ctx.arc(charX + (isMirrored ? -4 : 4), charY - 13, 14, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();

    // Headset band and ear cup glowing
    ctx.strokeStyle = '#20222a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(charX + (isMirrored ? -4 : 4), charY - 12, 16, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.fillStyle = '#e84570';
    ctx.fillRect(charX + (isMirrored ? -21 : 15), charY - 14, 6, 10);

    ctx.restore();
  }

  /**
   * ACTIVITY 3: Cooking (11)
   * Silhouette & prop: kitchen counter, pot, rising steam curls
   * 
   * ARTIST NOTE:
   * Replace this function with an image draw or custom sprite sheet for activity 3 (cooking):
   * ctx.drawImage(sprites.cookA, x, y, width, height);
   */
  drawActivityCooking(ctx, x, y, w, h, isMirrored) {
    ctx.save();

    // Overhead bright warm kitchen pendant
    const lampX = isMirrored ? x + 150 : x + w - 150;
    const lampY = y + 70;

    const cookGlow = ctx.createRadialGradient(lampX, lampY + 40, 15, lampX, lampY + 120, 210);
    cookGlow.addColorStop(0, 'rgba(255, 230, 160, 0.7)');
    cookGlow.addColorStop(0.4, 'rgba(255, 210, 130, 0.3)');
    cookGlow.addColorStop(1, 'rgba(255, 210, 130, 0)');
    ctx.fillStyle = cookGlow;
    ctx.beginPath();
    ctx.arc(lampX, lampY + 100, 200, 0, Math.PI * 2);
    ctx.fill();

    // Kitchen cord & metal pendant dome
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lampX, y);
    ctx.lineTo(lampX, lampY);
    ctx.stroke();

    ctx.fillStyle = '#9e8c7b';
    ctx.beginPath();
    ctx.arc(lampX, lampY, 18, Math.PI, 0);
    ctx.fill();

    // Kitchen Counter & Cabinets
    const counterX = isMirrored ? x + 40 : x + w - 240;
    const counterY = y + h - 160;
    const counterW = 200;

    // Lower cabinet
    ctx.fillStyle = '#2b303a';
    ctx.fillRect(counterX, counterY, counterW, 75);
    ctx.fillStyle = '#1f232b';
    ctx.fillRect(counterX + 15, counterY + 12, counterW / 2 - 20, 50);
    ctx.fillRect(counterX + counterW / 2 + 5, counterY + 12, counterW / 2 - 20, 50);

    // Granite countertop
    ctx.fillStyle = '#cfc5b8';
    ctx.fillRect(counterX - 5, counterY - 10, counterW + 10, 12);

    // Stove burner (glowing gas blue/orange flame)
    const stoveX = isMirrored ? counterX + 60 : counterX + counterW - 60;
    const stoveY = counterY - 10;
    ctx.fillStyle = '#222';
    ctx.fillRect(stoveX - 22, stoveY - 4, 44, 4);

    // Tiny flame glow under pot
    ctx.fillStyle = 'rgba(255, 120, 40, 0.85)';
    ctx.beginPath();
    ctx.ellipse(stoveX, stoveY - 3, 16, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stainless steel cooking pot with handles
    ctx.fillStyle = '#7a818c';
    ctx.fillRect(stoveX - 18, stoveY - 26, 36, 22);
    // Pot handles
    ctx.fillStyle = '#3a3f47';
    ctx.fillRect(stoveX - 22, stoveY - 22, 4, 6);
    ctx.fillRect(stoveX + 18, stoveY - 22, 4, 6);
    // Pot rim
    ctx.fillStyle = '#9aa1ad';
    ctx.fillRect(stoveX - 19, stoveY - 27, 38, 4);

    // Rising Animated Steam Curls
    for (const p of this.steamParticles) {
      const curY = (p.y - this.animTime * 25 * p.speed) % 65;
      const curX = stoveX + p.x + Math.sin(this.animTime * 2.5 + p.phase) * 6;
      const alpha = Math.max(0, 0.45 * (1 + curY / 65));
      ctx.fillStyle = `rgba(240, 245, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(curX, stoveY - 30 + curY, p.r * (1 - curY / 100), 0, Math.PI * 2);
      ctx.fill();
    }

    // Person standing at stove stirring with spoon/ladle
    const cookCharX = isMirrored ? counterX + 130 : counterX + counterW - 130;
    const cookCharY = counterY - 60;

    // Body / Apron
    ctx.fillStyle = isMirrored ? '#4a6058' : '#734e56';
    ctx.beginPath();
    ctx.ellipse(cookCharX, cookCharY + 30, 18, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cream apron
    ctx.fillStyle = '#dedad2';
    ctx.fillRect(cookCharX - 10, cookCharY + 12, 20, 36);

    // Arm reaching to pot with ladle
    ctx.strokeStyle = isMirrored ? '#4a6058' : '#734e56';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cookCharX, cookCharY + 18);
    ctx.lineTo(isMirrored ? stoveX + 12 : stoveX - 12, stoveY - 28);
    ctx.stroke();

    // Wooden ladle
    ctx.strokeStyle = '#c48f5a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(isMirrored ? stoveX + 14 : stoveX - 14, stoveY - 34);
    ctx.lineTo(stoveX, stoveY - 18);
    ctx.stroke();

    // Head
    ctx.fillStyle = '#edd1b8';
    ctx.beginPath();
    ctx.arc(cookCharX, cookCharY, 14, 0, Math.PI * 2);
    ctx.fill();

    // Hair tied up in cozy messy bun
    ctx.fillStyle = isMirrored ? '#282420' : '#452c28';
    ctx.beginPath();
    ctx.arc(cookCharX, cookCharY - 3, 15, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();
    // Bun
    ctx.beginPath();
    ctx.arc(cookCharX, cookCharY - 18, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 6. Window Frames & Glass Reflections
   */
  drawWindowFrames(ctx, win) {
    ctx.save();

    // Outer architectural window sill
    ctx.fillStyle = PALETTE.windowSill;
    ctx.fillRect(win.x - 14, win.y + win.height, win.width + 28, 18);
    ctx.fillStyle = '#2c2534';
    ctx.fillRect(win.x - 16, win.y + win.height + 14, win.width + 32, 6);

    // Heavy wooden window surround
    ctx.strokeStyle = PALETTE.windowFrame;
    ctx.lineWidth = 14;
    ctx.strokeRect(win.x, win.y, win.width, win.height);

    // Central crossbars (Georgian/Casement 4-pane window look)
    ctx.lineWidth = 8;
    ctx.beginPath();
    // Vertical center mullion
    ctx.moveTo(win.x + win.width / 2, win.y);
    ctx.lineTo(win.x + win.width / 2, win.y + win.height);
    // Horizontal transom bar
    ctx.moveTo(win.x, win.y + win.height * 0.42);
    ctx.lineTo(win.x + win.width, win.y + win.height * 0.42);
    ctx.stroke();

    // Glass sheen / subtle diagonal reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.beginPath();
    ctx.moveTo(win.x + 10, win.y + 10);
    ctx.lineTo(win.x + win.width * 0.4, win.y + 10);
    ctx.lineTo(win.x + 10, win.y + win.height * 0.45);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * 7. Sliding Velvet Curtains (A and B)
   * With curtain rod, rings, deep fabric folds, and embroidered label ('A' or 'B')
   */
  drawCurtain(ctx, win, openRatio) {
    ctx.save();

    // Curtain Rod at top
    ctx.fillStyle = '#6e5630'; // Burnished bronze rod
    ctx.fillRect(win.x - 12, win.y - 14, win.width + 24, 7);
    // Rod finials
    ctx.beginPath();
    ctx.arc(win.x - 14, win.y - 11, 7, 0, Math.PI * 2);
    ctx.arc(win.x + win.width + 14, win.y - 11, 7, 0, Math.PI * 2);
    ctx.fill();

    // If fully open (openRatio >= 0.99), only draw bunched curtain on the edge
    // Sliding direction: Curtain A slides to left; Curtain B slides to right
    const isWinA = (win.label === 'A');

    // Effective visible curtain width
    // Minimum bunched width = 45px, Maximum = win.width
    const curWidth = (1.0 - openRatio) * (win.width - 45) + 45;

    let cx, cy, cw, ch;
    cy = win.y - 6;
    ch = win.height + 4;

    if (isWinA) {
      // Slides left
      cx = win.x;
      cw = curWidth;
    } else {
      // Slides right
      cx = win.x + win.width - curWidth;
      cw = curWidth;
    }

    // Clip to window container so curtain doesn't spill into sky
    ctx.save();
    ctx.beginPath();
    ctx.rect(win.x - 6, win.y - 12, win.width + 12, win.height + 16);
    ctx.clip();

    // Main Curtain Velvet Fabric
    ctx.fillStyle = PALETTE.curtainClosed;
    ctx.fillRect(cx, cy, cw, ch);

    // Realistic vertical folds and velvet shadows
    const foldCount = Math.max(3, Math.round(cw / 28));
    const foldW = cw / foldCount;

    for (let i = 0; i < foldCount; i++) {
      const fx = cx + i * foldW;
      const foldGrad = ctx.createLinearGradient(fx, cy, fx + foldW, cy);
      foldGrad.addColorStop(0, PALETTE.curtainShadow);
      foldGrad.addColorStop(0.5, PALETTE.curtainFold);
      foldGrad.addColorStop(1, PALETTE.curtainShadow);

      ctx.fillStyle = foldGrad;
      ctx.fillRect(fx, cy, foldW, ch);

      // Brass ring at top of each fold
      ctx.fillStyle = PALETTE.curtainGold;
      ctx.beginPath();
      ctx.arc(fx + foldW / 2, cy - 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Embroidered letter ("A" or "B") on curtain
    // Only visible when curtain is substantially closed
    const letterAlpha = Math.max(0, 1.0 - openRatio * 1.8);
    if (letterAlpha > 0.05) {
      ctx.save();
      ctx.globalAlpha = letterAlpha;

      const labelCenterX = isWinA ? win.x + win.width * 0.5 : win.x + win.width * 0.5;
      const labelCenterY = win.y + win.height * 0.44;

      // Only draw if label falls within curtain region
      if (labelCenterX >= cx && labelCenterX <= cx + cw) {
        // Gold embroidered crest circle
        ctx.strokeStyle = PALETTE.curtainGold;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(labelCenterX, labelCenterY, 32, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(214, 168, 88, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(labelCenterX, labelCenterY, 37, 0, Math.PI * 2);
        ctx.stroke();

        // Elegant embroidered letter
        ctx.fillStyle = PALETTE.curtainGold;
        ctx.font = 'bold 36px "Cinzel", "Georgia", "Times New Roman", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(win.label, labelCenterX, labelCenterY + 2);

        // Subtitle caption on curtain
        ctx.font = 'italic 12px "Georgia", serif';
        ctx.fillStyle = '#e8caa0';
        ctx.fillText(isWinA ? 'Room A' : 'Room B', labelCenterX, labelCenterY + 54);
      }
      ctx.restore();
    }

    // Outer edge shadow
    const edgeShadowGrad = ctx.createLinearGradient(
      isWinA ? cx + cw - 12 : cx, cy,
      isWinA ? cx + cw : cx + 12, cy
    );
    edgeShadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
    edgeShadowGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = edgeShadowGrad;
    ctx.fillRect(isWinA ? cx + cw - 12 : cx, cy, 12, ch);

    ctx.restore();
    ctx.restore();
  }

  /**
   * 8. Hover indicators and peek guidance
   */
  drawHoverIndicators(ctx) {
    if (!this.hoverWindow) return;

    const win = this.hoverWindow === 'A' ? WINDOW_A : WINDOW_B;
    const isCurtainOpen = (this.hoverWindow === 'A' ? this.curtainA : this.curtainB) > 0.5;

    ctx.save();
    // Soft glowing border when hovering
    ctx.strokeStyle = 'rgba(214, 168, 88, 0.6)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(win.x - 2, win.y - 2, win.width + 4, win.height + 4);

    // Floating pill badge: "Click to peek" or "Click to close"
    const badgeText = isCurtainOpen ? 'Click to close curtain' : 'Click to peek inside';
    const badgeX = win.x + win.width / 2;
    const badgeY = win.y + win.height - 24;

    ctx.setLineDash([]);
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    const textW = ctx.measureText(badgeText).width;

    ctx.fillStyle = 'rgba(20, 16, 26, 0.88)';
    ctx.beginPath();
    ctx.roundRect(badgeX - textW / 2 - 12, badgeY - 12, textW + 24, 24, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(214, 168, 88, 0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#f0e6d2';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, badgeX, badgeY);

    ctx.restore();
  }

  /**
   * Check if a screen coordinate hits Window A or Window B
   */
  hitTest(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const virtX = ((screenX - rect.left) / rect.width) * VIRTUAL_WIDTH;
    const virtY = ((screenY - rect.top) / rect.height) * VIRTUAL_HEIGHT;

    if (
      virtX >= WINDOW_A.x &&
      virtX <= WINDOW_A.x + WINDOW_A.width &&
      virtY >= WINDOW_A.y &&
      virtY <= WINDOW_A.y + WINDOW_A.height
    ) {
      return 'A';
    }

    if (
      virtX >= WINDOW_B.x &&
      virtX <= WINDOW_B.x + WINDOW_B.width &&
      virtY >= WINDOW_B.y &&
      virtY <= WINDOW_B.y + WINDOW_B.height
    ) {
      return 'B';
    }

    return null;
  }
}
