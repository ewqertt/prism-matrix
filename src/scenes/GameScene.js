import Phaser from 'phaser';
import { soundEngine } from '../utils/SoundEngine.js';

const GRID_COLS = 14;
const GRID_ROWS = 8;
const TILE_SIZE = 68;
const BOARD_OFFSET_X = 64;
const BOARD_OFFSET_Y = 96;

// Waypoints in grid coordinates (col, row)
const PATH_WAYPOINTS = [
  { c: 0, r: 1 },
  { c: 4, r: 1 },
  { c: 4, r: 6 },
  { c: 8, r: 6 },
  { c: 8, r: 2 },
  { c: 11, r: 2 },
  { c: 11, r: 5 },
  { c: 13, r: 5 }
];

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init() {
    this.balance = this.registry.get('balance');
    this.energy = this.balance.player.startingEnergy;
    this.coreHp = this.balance.player.startingCoreHp;
    this.maxCoreHp = this.balance.player.maxCoreHp;
    this.score = 0;

    this.currentWaveIndex = 0;
    this.waveActive = false;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.gameSpeed = 1;
    this.isPausedForCard = false;
    this.isGameOver = false;

    this.selectedBuildType = 'pulse';
    this.selectedTower = null;

    this.modifiers = {
      globalDamageMult: 1,
      globalFireRateMult: 1,
      globalRangeMult: 1,
      energyGainMult: 1,
      pulseSplit: 0,
      frostVulnerability: 0,
      railOvercharge: 0,
      arcBonusChains: 0,
      critChance: 0,
      executeBonus: 0
    };

    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.beams = [];
    this.occupiedCells = new Set();
    this.pathCells = new Set();
    this.worldPath = [];
  }

  create() {
    this.computePath();
    this.drawBoard();
    this.setupParticles();
    this.setupInput();

    this.scene.launch('UIScene', { gameScene: this });
    this.emitUIUpdate();
  }

  gridToWorld(c, r) {
    return {
      x: BOARD_OFFSET_X + c * TILE_SIZE + TILE_SIZE / 2,
      y: BOARD_OFFSET_Y + r * TILE_SIZE + TILE_SIZE / 2
    };
  }

  worldToGrid(x, y) {
    const c = Math.floor((x - BOARD_OFFSET_X) / TILE_SIZE);
    const r = Math.floor((y - BOARD_OFFSET_Y) / TILE_SIZE);
    if (c < 0 || c >= GRID_COLS || r < 0 || r >= GRID_ROWS) return null;
    return { c, r };
  }

  computePath() {
    this.worldPath = PATH_WAYPOINTS.map(wp => this.gridToWorld(wp.c, wp.r));

    for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
      const a = PATH_WAYPOINTS[i];
      const b = PATH_WAYPOINTS[i + 1];
      const dc = Math.sign(b.c - a.c);
      const dr = Math.sign(b.r - a.r);
      let c = a.c;
      let r = a.r;
      this.pathCells.add(`${c},${r}`);
      while (c !== b.c || r !== b.r) {
        c += dc;
        r += dr;
        this.pathCells.add(`${c},${r}`);
      }
    }
  }

  drawBoard() {
    // Background
    this.add.rectangle(640, 360, 1280, 720, 0x0a0e17);

    const gridGfx = this.add.graphics();
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const pos = this.gridToWorld(c, r);
        const key = `${c},${r}`;
        const isPath = this.pathCells.has(key);

        if (isPath) {
          gridGfx.fillStyle(0x111a2e, 1);
          gridGfx.fillRoundedRect(pos.x - 32, pos.y - 32, 64, 64, 8);
          gridGfx.lineStyle(1, 0x1e293b, 0.8);
          gridGfx.strokeRoundedRect(pos.x - 32, pos.y - 32, 64, 64, 8);
        } else {
          gridGfx.fillStyle(0x0f1624, 0.85);
          gridGfx.fillRoundedRect(pos.x - 31, pos.y - 31, 62, 62, 8);
          gridGfx.lineStyle(1, 0x1e293b, 0.55);
          gridGfx.strokeRoundedRect(pos.x - 31, pos.y - 31, 62, 62, 8);
        }
      }
    }

    // Energy conduit glowing line along path
    const pathGfx = this.add.graphics();
    pathGfx.lineStyle(10, 0x38bdf8, 0.08);
    pathGfx.beginPath();
    pathGfx.moveTo(this.worldPath[0].x, this.worldPath[0].y);
    for (let i = 1; i < this.worldPath.length; i++) {
      pathGfx.lineTo(this.worldPath[i].x, this.worldPath[i].y);
    }
    pathGfx.strokePath();

    pathGfx.lineStyle(2, 0x38bdf8, 0.35);
    pathGfx.beginPath();
    pathGfx.moveTo(this.worldPath[0].x, this.worldPath[0].y);
    for (let i = 1; i < this.worldPath.length; i++) {
      pathGfx.lineTo(this.worldPath[i].x, this.worldPath[i].y);
    }
    pathGfx.strokePath();

    // Spawn portal & Core Prism markers
    const start = this.worldPath[0];
    const end = this.worldPath[this.worldPath.length - 1];

    const portalGfx = this.add.graphics();
    portalGfx.lineStyle(2.5, 0xf43f5e, 0.9);
    portalGfx.strokeCircle(start.x, start.y, 20);
    portalGfx.fillStyle(0xf43f5e, 0.2);
    portalGfx.fillCircle(start.x, start.y, 14);

    // Core Prism at end
    this.coreContainer = this.add.container(end.x, end.y);
    const coreOuter = this.add.graphics();
    coreOuter.lineStyle(3, 0x38bdf8, 1);
    coreOuter.strokePoints([
      { x: 0, y: -24 },
      { x: 22, y: 0 },
      { x: 0, y: 24 },
      { x: -22, y: 0 }
    ], true);
    coreOuter.fillStyle(0x38bdf8, 0.25);
    coreOuter.fillPoints([
      { x: 0, y: -24 },
      { x: 22, y: 0 },
      { x: 0, y: 24 },
      { x: -22, y: 0 }
    ], true);
    this.coreContainer.add(coreOuter);

    this.tweens.add({
      targets: this.coreContainer,
      angle: 360,
      duration: 12000,
      repeat: -1,
      ease: 'Linear'
    });

    // Hover indicator & Range preview
    this.rangeCircle = this.add.graphics();
    this.hoverTile = this.add.graphics();
    this.fxGraphics = this.add.graphics();
  }

  setupParticles() {
    this.hitEmitter = this.add.particles(0, 0, 'particle_dot', {
      speed: { min: 45, max: 165 },
      scale: { start: 0.55, end: 0 },
      alpha: { start: 0.95, end: 0 },
      lifespan: 340,
      blendMode: 'ADD',
      emitting: false
    });
  }

  setupInput() {
    this.input.on('pointermove', (pointer) => {
      if (this.isPausedForCard || this.isGameOver) {
        this.hoverTile.clear();
        return;
      }
      const cell = this.worldToGrid(pointer.x, pointer.y);
      this.hoverTile.clear();
      if (!cell) {
        if (!this.selectedTower) this.rangeCircle.clear();
        return;
      }

      const pos = this.gridToWorld(cell.c, cell.r);
      const key = `${cell.c},${cell.r}`;
      const existing = this.towers.find(t => t.c === cell.c && t.r === cell.r);

      if (existing) {
        this.hoverTile.lineStyle(2, 0xffffff, 0.8);
        this.hoverTile.strokeRoundedRect(pos.x - 31, pos.y - 31, 62, 62, 8);
        if (!this.selectedTower) {
          this.drawRangeCircle(existing.x, existing.y, this.getTowerRange(existing), 0xffffff);
        }
      } else if (!this.pathCells.has(key) && this.selectedBuildType) {
        const cfg = this.balance.towers[this.selectedBuildType];
        const canAfford = this.energy >= cfg.cost;
        const colorNum = Phaser.Display.Color.HexStringToColor(cfg.color).color;
        this.hoverTile.lineStyle(2, canAfford ? colorNum : 0xef4444, 0.85);
        this.hoverTile.strokeRoundedRect(pos.x - 31, pos.y - 31, 62, 62, 8);
        if (!this.selectedTower) {
          this.drawRangeCircle(pos.x, pos.y, cfg.range * this.modifiers.globalRangeMult, canAfford ? colorNum : 0xef4444);
        }
      } else if (!this.selectedTower) {
        this.rangeCircle.clear();
      }
    });

    this.input.on('pointerdown', (pointer) => {
      if (this.isPausedForCard || this.isGameOver) return;
      soundEngine.init();
      const cell = this.worldToGrid(pointer.x, pointer.y);
      if (!cell) {
        this.deselectTower();
        return;
      }

      const existing = this.towers.find(t => t.c === cell.c && t.r === cell.r);
      if (existing) {
        this.selectTower(existing);
        return;
      }

      this.deselectTower();
      const key = `${cell.c},${cell.r}`;
      if (!this.pathCells.has(key) && !this.occupiedCells.has(key) && this.selectedBuildType) {
        this.tryBuildTower(cell.c, cell.r, this.selectedBuildType);
      }
    });
  }

  drawRangeCircle(x, y, radius, colorHexNum) {
    this.rangeCircle.clear();
    this.rangeCircle.fillStyle(colorHexNum, 0.08);
    this.rangeCircle.fillCircle(x, y, radius);
    this.rangeCircle.lineStyle(1.5, colorHexNum, 0.45);
    this.rangeCircle.strokeCircle(x, y, radius);
  }

  selectBuildType(type) {
    this.selectedBuildType = type;
    this.deselectTower();
    this.emitUIUpdate();
  }

  selectTower(tower) {
    this.selectedTower = tower;
    const cfg = this.balance.towers[tower.type];
    const colorNum = Phaser.Display.Color.HexStringToColor(cfg.color).color;
    this.drawRangeCircle(tower.x, tower.y, this.getTowerRange(tower), colorNum);
    this.emitUIUpdate();
  }

  deselectTower() {
    this.selectedTower = null;
    this.rangeCircle.clear();
    this.emitUIUpdate();
  }

  tryBuildTower(c, r, type) {
    const cfg = this.balance.towers[type];
    if (this.energy < cfg.cost) {
      this.cameras.main.shake(90, 0.003);
      return;
    }

    this.energy -= cfg.cost;
    const pos = this.gridToWorld(c, r);
    const tower = {
      id: Phaser.Math.RND.uuid(),
      type,
      c,
      r,
      x: pos.x,
      y: pos.y,
      level: 1,
      totalInvested: cfg.cost,
      cooldownTimer: 0,
      targetMode: 'first', // first | strong | close
      container: this.add.container(pos.x, pos.y)
    };

    this.renderTowerGraphic(tower);
    this.towers.push(tower);
    this.occupiedCells.add(`${c},${r}`);

    tower.container.setScale(0.2);
    this.tweens.add({
      targets: tower.container,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut'
    });

    soundEngine.playBuild();
    this.emitUIUpdate();
  }

  renderTowerGraphic(tower) {
    tower.container.removeAll(true);
    const cfg = this.balance.towers[tower.type];
    const colorNum = Phaser.Display.Color.HexStringToColor(cfg.color).color;

    const gfx = this.add.graphics();
    // Base pedestal
    gfx.fillStyle(0x162033, 1);
    gfx.fillCircle(0, 0, 22);
    gfx.lineStyle(1.5, colorNum, 0.45);
    gfx.strokeCircle(0, 0, 22);

    // Level rings
    if (tower.level >= 2) {
      gfx.lineStyle(1.5, colorNum, 0.75);
      gfx.strokeCircle(0, 0, 26);
    }
    if (tower.level >= 3) {
      gfx.lineStyle(2, 0xffffff, 0.85);
      gfx.strokeCircle(0, 0, 29);
    }

    // Geometric turret shape
    gfx.fillStyle(colorNum, 0.28);
    gfx.lineStyle(2.5, colorNum, 1);

    if (tower.type === 'pulse') {
      const pts = [{ x: 17, y: 0 }, { x: -12, y: -13 }, { x: -12, y: 13 }];
      gfx.fillPoints(pts, true);
      gfx.strokePoints(pts, true);
    } else if (tower.type === 'frost') {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI / 3) * i;
        pts.push({ x: Math.cos(ang) * 16, y: Math.sin(ang) * 16 });
      }
      gfx.fillPoints(pts, true);
      gfx.strokePoints(pts, true);
    } else if (tower.type === 'rail') {
      const pts = [{ x: 20, y: 0 }, { x: 0, y: -11 }, { x: -16, y: 0 }, { x: 0, y: 11 }];
      gfx.fillPoints(pts, true);
      gfx.strokePoints(pts, true);
    } else if (tower.type === 'arc') {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const ang = (Math.PI / 5) * i;
        const rad = i % 2 === 0 ? 18 : 8;
        pts.push({ x: Math.cos(ang) * rad, y: Math.sin(ang) * rad });
      }
      gfx.fillPoints(pts, true);
      gfx.strokePoints(pts, true);
    }

    tower.container.add(gfx);
  }

  getUpgradeCost(tower) {
    const cfg = this.balance.towers[tower.type];
    return Math.round(cfg.cost * Math.pow(this.balance.player.upgradeCostMultiplier, tower.level));
  }

  upgradeSelectedTower() {
    const tower = this.selectedTower;
    if (!tower || tower.level >= this.balance.player.maxTowerLevel) return;
    const cost = this.getUpgradeCost(tower);
    if (this.energy < cost) return;

    this.energy -= cost;
    tower.level += 1;
    tower.totalInvested += cost;
    this.renderTowerGraphic(tower);
    this.selectTower(tower);

    this.tweens.add({
      targets: tower.container,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 110,
      yoyo: true
    });

    soundEngine.playUpgrade();
    this.emitUIUpdate();
  }

  cycleTargetMode() {
    if (!this.selectedTower) return;
    const modes = ['first', 'strong', 'close'];
    const idx = modes.indexOf(this.selectedTower.targetMode);
    this.selectedTower.targetMode = modes[(idx + 1) % modes.length];
    this.emitUIUpdate();
  }

  sellSelectedTower() {
    const tower = this.selectedTower;
    if (!tower) return;
    const refund = Math.round(tower.totalInvested * this.balance.player.sellRefundRatio);
    this.energy += refund;
    this.occupiedCells.delete(`${tower.c},${tower.r}`);
    tower.container.destroy();
    this.towers = this.towers.filter(t => t.id !== tower.id);
    this.deselectTower();
    soundEngine.playTone(360, 200, 0.12, 'sine', 0.08);
    this.emitUIUpdate();
  }

  toggleGameSpeed() {
    this.gameSpeed = this.gameSpeed === 1 ? 2 : 1;
    this.emitUIUpdate();
  }

  startNextWave() {
    if (this.waveActive || this.isPausedForCard || this.isGameOver) return;
    if (this.currentWaveIndex >= this.balance.waves.length) return;

    const waveDef = this.balance.waves[this.currentWaveIndex];
    this.spawnQueue = [];
    for (const g of waveDef.groups) {
      for (let i = 0; i < g.count; i++) {
        this.spawnQueue.push({
          type: g.type,
          hpScale: waveDef.hpScale,
          hpOverride: g.hpOverride || null
        });
      }
    }

    this.currentSpawnInterval = waveDef.spawnInterval;
    this.spawnTimer = 200;
    this.waveActive = true;
    this.emitUIUpdate();
  }

  spawnEnemy(spec, customPos = null, customWaypointIndex = 1, customScale = 1) {
    const cfg = this.balance.enemies[spec.type];
    const startPos = customPos || { x: this.worldPath[0].x, y: this.worldPath[0].y };
    const maxHp = Math.round((spec.hpOverride || cfg.baseHp * spec.hpScale) * customScale);
    const maxShield = cfg.baseShield ? Math.round(cfg.baseShield * spec.hpScale * customScale) : 0;

    const enemy = {
      id: Phaser.Math.RND.uuid(),
      type: spec.type,
      x: startPos.x,
      y: startPos.y,
      waypointIndex: customWaypointIndex,
      distanceTraveled: 0,
      hp: maxHp,
      maxHp,
      shield: maxShield,
      maxShield,
      speed: cfg.speed * (customScale < 1 ? 1.18 : 1),
      reward: Math.max(4, Math.round(cfg.reward * customScale)),
      coreDamage: cfg.coreDamage,
      radius: Math.round(cfg.radius * (customScale < 1 ? 0.72 : 1)),
      slowTimer: 0,
      slowFactor: 0,
      isMiniSplit: customScale < 1,
      gfx: this.add.graphics()
    };

    this.enemies.push(enemy);
  }

  getTowerDamage(tower) {
    const cfg = this.balance.towers[tower.type];
    let dmg = cfg.damage * Math.pow(this.balance.player.upgradeDamageMultiplier, tower.level - 1);
    dmg *= this.modifiers.globalDamageMult;
    if (tower.type === 'rail' && this.modifiers.railOvercharge > 0) {
      dmg *= (1 + this.modifiers.railOvercharge);
    }
    return dmg;
  }

  getTowerRange(tower) {
    const cfg = this.balance.towers[tower.type];
    return cfg.range * Math.pow(this.balance.player.upgradeRangeMultiplier, tower.level - 1) * this.modifiers.globalRangeMult;
  }

  getTowerCooldown(tower) {
    const cfg = this.balance.towers[tower.type];
    return cfg.cooldown / this.modifiers.globalFireRateMult;
  }

  update(time, delta) {
    if (this.isPausedForCard || this.isGameOver) return;
    const dt = delta * this.gameSpeed;

    // 1. Spawn enemies
    if (this.waveActive && this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const nextSpec = this.spawnQueue.shift();
        this.spawnEnemy(nextSpec);
        this.spawnTimer = this.currentSpawnInterval;
      }
    }

    // 2. Move enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.slowTimer > 0) {
        e.slowTimer -= dt;
        if (e.slowTimer <= 0) e.slowFactor = 0;
      }

      const targetWp = this.worldPath[e.waypointIndex];
      if (!targetWp) continue;

      const dx = targetWp.x - e.x;
      const dy = targetWp.y - e.y;
      const dist = Math.hypot(dx, dy);
      const effSpeed = e.speed * (1 - e.slowFactor);
      const step = (effSpeed * dt) / 1000;

      if (dist <= step) {
        e.x = targetWp.x;
        e.y = targetWp.y;
        e.distanceTraveled += dist;
        e.waypointIndex += 1;

        if (e.waypointIndex >= this.worldPath.length) {
          this.handleEnemyReachCore(e, i);
          continue;
        }
      } else {
        e.x += (dx / dist) * step;
        e.y += (dy / dist) * step;
        e.distanceTraveled += step;
      }

      this.drawEnemy(e);
    }

    // 3. Towers acquire target & fire
    for (const tower of this.towers) {
      tower.cooldownTimer -= dt;
      const target = this.findTarget(tower);
      if (target && tower.type !== 'frost') {
        const angle = Phaser.Math.Angle.Between(tower.x, tower.y, target.x, target.y);
        tower.container.rotation = angle;
      }

      if (target && tower.cooldownTimer <= 0) {
        this.fireTower(tower, target);
        tower.cooldownTimer = this.getTowerCooldown(tower);
      }
    }

    // 4. Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.target || p.target.hp <= 0) {
        p.gfx.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      const dx = p.target.x - p.x;
      const dy = p.target.y - p.y;
      const dist = Math.hypot(dx, dy);
      const step = (p.speed * dt) / 1000;

      if (dist <= step + p.target.radius * 0.5) {
        this.damageEnemy(p.target, p.damage, p.color);
        p.gfx.destroy();
        this.projectiles.splice(i, 1);
      } else {
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
        p.gfx.setPosition(p.x, p.y);
      }
    }

    // 5. Render transient beams/arcs
    this.fxGraphics.clear();
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.life -= dt;
      if (b.life <= 0) {
        this.beams.splice(i, 1);
        continue;
      }
      const alpha = b.life / b.maxLife;
      this.fxGraphics.lineStyle(b.width, b.color, alpha);
      this.fxGraphics.beginPath();
      this.fxGraphics.moveTo(b.points[0].x, b.points[0].y);
      for (let k = 1; k < b.points.length; k++) {
        this.fxGraphics.lineTo(b.points[k].x, b.points[k].y);
      }
      this.fxGraphics.strokePath();
    }

    // 6. Check wave completion
    if (this.waveActive && this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.onWaveCompleted();
    }
  }

  findTarget(tower) {
    const range = this.getTowerRange(tower);
    const inRange = this.enemies.filter(e => Phaser.Math.Distance.Between(tower.x, tower.y, e.x, e.y) <= range);
    if (inRange.length === 0) return null;

    if (tower.targetMode === 'strong') {
      inRange.sort((a, b) => (b.hp + b.shield) - (a.hp + a.shield));
    } else if (tower.targetMode === 'close') {
      inRange.sort((a, b) => Phaser.Math.Distance.Between(tower.x, tower.y, a.x, a.y) - Phaser.Math.Distance.Between(tower.x, tower.y, b.x, b.y));
    } else {
      inRange.sort((a, b) => b.distanceTraveled - a.distanceTraveled);
    }
    return inRange[0];
  }

  fireTower(tower, primaryTarget) {
    const cfg = this.balance.towers[tower.type];
    const colorNum = Phaser.Display.Color.HexStringToColor(cfg.color).color;
    const baseDmg = this.getTowerDamage(tower);
    soundEngine.playShoot(tower.type);

    if (tower.type === 'pulse') {
      this.spawnProjectile(tower.x, tower.y, primaryTarget, baseDmg, cfg.projectileSpeed, colorNum);
      if (this.modifiers.pulseSplit > 0) {
        const range = this.getTowerRange(tower);
        const secondary = this.enemies.find(e => e.id !== primaryTarget.id && Phaser.Math.Distance.Between(tower.x, tower.y, e.x, e.y) <= range);
        if (secondary) {
          this.spawnProjectile(tower.x, tower.y, secondary, baseDmg * 0.6, cfg.projectileSpeed, colorNum);
        }
      }
    } else if (tower.type === 'frost') {
      const range = this.getTowerRange(tower);
      const ring = this.add.image(tower.x, tower.y, 'particle_ring').setTint(colorNum).setScale(0.2).setAlpha(0.9);
      this.tweens.add({
        targets: ring,
        scale: (range * 2) / 64,
        alpha: 0,
        duration: 320,
        onComplete: () => ring.destroy()
      });

      const slowRatio = Math.min(0.75, cfg.slowRatio + (this.modifiers.frostVulnerability > 0 ? 0.15 : 0));
      for (const e of [...this.enemies]) {
        if (Phaser.Math.Distance.Between(tower.x, tower.y, e.x, e.y) <= range) {
          e.slowFactor = Math.max(e.slowFactor, slowRatio);
          e.slowTimer = cfg.slowDuration;
          this.damageEnemy(e, baseDmg, colorNum);
        }
      }
    } else if (tower.type === 'rail') {
      const range = this.getTowerRange(tower);
      const angle = Phaser.Math.Angle.Between(tower.x, tower.y, primaryTarget.x, primaryTarget.y);
      const endX = tower.x + Math.cos(angle) * range;
      const endY = tower.y + Math.sin(angle) * range;
      const width = cfg.beamWidth * (this.modifiers.railOvercharge > 0 ? 1.8 : 1);

      this.beams.push({
        points: [{ x: tower.x, y: tower.y }, { x: endX, y: endY }],
        color: colorNum,
        width: width * 0.5,
        life: 180,
        maxLife: 180
      });

      const line = new Phaser.Geom.Line(tower.x, tower.y, endX, endY);
      for (const e of [...this.enemies]) {
        const d = Phaser.Geom.Line.GetShortestDistance(line, new Phaser.Geom.Point(e.x, e.y));
        if (d <= e.radius + width * 0.5) {
          this.damageEnemy(e, baseDmg, colorNum);
        }
      }
    } else if (tower.type === 'arc') {
      const maxChains = cfg.chainCount + this.modifiers.arcBonusChains;
      const chainPoints = [{ x: tower.x, y: tower.y }];
      const hitIds = new Set();
      let curr = primaryTarget;
      let dmg = baseDmg;

      for (let step = 0; step < maxChains && curr; step++) {
        hitIds.add(curr.id);
        chainPoints.push({ x: curr.x, y: curr.y });
        this.damageEnemy(curr, dmg, colorNum);

        if (this.modifiers.arcBonusChains === 0) {
          dmg *= 0.82;
        }

        let nextTarget = null;
        let bestDist = cfg.chainRange;
        for (const candidate of this.enemies) {
          if (hitIds.has(candidate.id) || candidate.hp <= 0) continue;
          const d = Phaser.Math.Distance.Between(curr.x, curr.y, candidate.x, candidate.y);
          if (d <= bestDist) {
            bestDist = d;
            nextTarget = candidate;
          }
        }
        curr = nextTarget;
      }

      this.beams.push({
        points: chainPoints,
        color: colorNum,
        width: 3,
        life: 160,
        maxLife: 160
      });
    }
  }

  spawnProjectile(x, y, target, damage, speed, colorNum) {
    const gfx = this.add.graphics({ x, y });
    gfx.fillStyle(colorNum, 1);
    gfx.fillCircle(0, 0, 4.5);
    this.projectiles.push({ x, y, target, damage, speed, color: colorNum, gfx });
  }

  damageEnemy(enemy, rawDamage, colorNum) {
    if (!enemy || enemy.hp <= 0) return;

    let dmg = rawDamage;
    if (enemy.slowTimer > 0 && this.modifiers.frostVulnerability > 0) {
      dmg *= (1 + this.modifiers.frostVulnerability);
    }
    if (this.modifiers.executeBonus > 0 && enemy.hp / enemy.maxHp <= 0.3) {
      dmg *= (1 + this.modifiers.executeBonus);
    }

    let isCrit = false;
    if (this.modifiers.critChance > 0 && Math.random() < this.modifiers.critChance) {
      dmg *= 2.2;
      isCrit = true;
    }

    const finalDmg = Math.round(dmg);
    soundEngine.playEnemyHit(isCrit);

    if (enemy.shield > 0) {
      const absorbed = Math.min(enemy.shield, finalDmg);
      enemy.shield -= absorbed;
      const rem = finalDmg - absorbed;
      enemy.hp -= rem;
    } else {
      enemy.hp -= finalDmg;
    }

    this.hitEmitter.setParticleTint(colorNum);
    this.hitEmitter.emitParticleAt(enemy.x, enemy.y, isCrit ? 8 : 4);

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  killEnemy(enemy) {
    const idx = this.enemies.findIndex(e => e.id === enemy.id);
    if (idx === -1) return;

    const cfg = this.balance.enemies[enemy.type];
    const colorNum = Phaser.Display.Color.HexStringToColor(cfg.color).color;

    this.hitEmitter.setParticleTint(colorNum);
    this.hitEmitter.emitParticleAt(enemy.x, enemy.y, 16);
    soundEngine.playEnemyDie();

    const earned = Math.round(enemy.reward * this.modifiers.energyGainMult);
    this.energy += earned;
    this.score += earned * 10;

    // Splitter spawns 2 mini units
    if (enemy.type === 'splitter' && !enemy.isMiniSplit) {
      const waveDef = this.balance.waves[Math.min(this.currentWaveIndex, this.balance.waves.length - 1)];
      for (let s = 0; s < cfg.splitCount; s++) {
        const offset = (s === 0 ? -10 : 10);
        this.spawnEnemy(
          { type: 'splitter', hpScale: waveDef.hpScale },
          { x: enemy.x + offset, y: enemy.y + offset },
          enemy.waypointIndex,
          0.45
        );
      }
    }

    enemy.gfx.destroy();
    this.enemies.splice(idx, 1);
    this.emitUIUpdate();
  }

  handleEnemyReachCore(enemy, index) {
    this.coreHp = Math.max(0, this.coreHp - enemy.coreDamage);
    soundEngine.playCoreDamage();
    this.cameras.main.shake(180, 0.008);

    enemy.gfx.destroy();
    this.enemies.splice(index, 1);
    this.emitUIUpdate();

    if (this.coreHp <= 0) {
      this.isGameOver = true;
      this.waveActive = false;
      this.events.emit('game-over', { victory: false, score: this.score, wave: this.currentWaveIndex + 1 });
    }
  }

  onWaveCompleted() {
    this.waveActive = false;
    const completedWaveNum = this.currentWaveIndex + 1;
    const bonus = this.balance.player.waveClearBaseBonus + completedWaveNum * this.balance.player.waveClearBonusPerWave;
    this.energy += bonus;
    this.score += bonus * 15;
    this.currentWaveIndex += 1;

    if (this.currentWaveIndex >= this.balance.waves.length) {
      this.isGameOver = true;
      this.emitUIUpdate();
      this.events.emit('game-over', { victory: true, score: this.score, wave: completedWaveNum });
      return;
    }

    this.emitUIUpdate();
    this.offerUpgradeCards();
  }

  offerUpgradeCards() {
    this.isPausedForCard = true;
    const pool = Phaser.Utils.Array.Shuffle([...this.balance.cards]);
    const choices = pool.slice(0, 3);
    this.events.emit('show-cards', choices);
  }

  applyCardChoice(card) {
    soundEngine.playCardSelect();
    if (card.stat === 'instantRepair') {
      this.coreHp = Math.min(this.maxCoreHp, this.coreHp + card.value);
      this.energy += 50;
    } else {
      this.modifiers[card.stat] += card.value;
    }

    this.isPausedForCard = false;
    if (this.selectedTower) {
      this.selectTower(this.selectedTower);
    }
    this.emitUIUpdate();
  }

  drawEnemy(e) {
    const cfg = this.balance.enemies[e.type];
    const colorNum = Phaser.Display.Color.HexStringToColor(cfg.color).color;
    const g = e.gfx;
    g.clear();
    g.setPosition(e.x, e.y);

    // Body
    g.fillStyle(e.slowTimer > 0 ? 0x2dd4bf : colorNum, 0.32);
    g.lineStyle(2, e.slowTimer > 0 ? 0x2dd4bf : colorNum, 1);

    const r = e.radius;
    if (e.type === 'swift') {
      g.fillTriangle(r, 0, -r * 0.8, -r * 0.8, -r * 0.8, r * 0.8);
      g.strokeTriangle(r, 0, -r * 0.8, -r * 0.8, -r * 0.8, r * 0.8);
    } else if (e.type === 'heavy') {
      g.fillRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7);
      g.strokeRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7);
    } else {
      const sides = e.type === 'splitter' ? 5 : e.type === 'shielded' ? 8 : 6;
      const pts = [];
      for (let i = 0; i < sides; i++) {
        const ang = ((Math.PI * 2) / sides) * i;
        pts.push({ x: Math.cos(ang) * r, y: Math.sin(ang) * r });
      }
      g.fillPoints(pts, true);
      g.strokePoints(pts, true);
    }

    // Shield ring
    if (e.shield > 0) {
      g.lineStyle(2, 0x38bdf8, 0.85);
      g.strokeCircle(0, 0, r + 4);
    }

    // HP bar
    const barW = r * 2;
    const hpRatio = Math.max(0, e.hp / e.maxHp);
    g.fillStyle(0x0f172a, 0.85);
    g.fillRect(-barW / 2, -r - 10, barW, 4);
    g.fillStyle(0x34d399, 1);
    g.fillRect(-barW / 2, -r - 10, barW * hpRatio, 4);
  }

  emitUIUpdate() {
    this.events.emit('ui-update', {
      energy: this.energy,
      coreHp: this.coreHp,
      maxCoreHp: this.maxCoreHp,
      score: this.score,
      wave: Math.min(this.currentWaveIndex + 1, this.balance.waves.length),
      totalWaves: this.balance.waves.length,
      waveActive: this.waveActive,
      gameSpeed: this.gameSpeed,
      selectedBuildType: this.selectedBuildType,
      selectedTower: this.selectedTower
    });
  }
}
