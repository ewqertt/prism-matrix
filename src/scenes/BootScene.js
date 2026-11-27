import Phaser from 'phaser';
import balanceData from '../../config/game-balance.json';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    this.registry.set('balance', balanceData);
    this.createProceduralTextures();
    this.scene.start('GameScene');
  }

  createProceduralTextures() {
    // 1. Soft glow particle dot
    const dotGfx = this.make.graphics({ x: 0, y: 0, add: false });
    dotGfx.fillStyle(0xffffff, 1);
    dotGfx.fillCircle(8, 8, 6);
    dotGfx.fillStyle(0xffffff, 0.4);
    dotGfx.fillCircle(8, 8, 8);
    dotGfx.generateTexture('particle_dot', 16, 16);
    dotGfx.destroy();

    // 2. Expanding frost/shockwave ring
    const ringGfx = this.make.graphics({ x: 0, y: 0, add: false });
    ringGfx.lineStyle(3, 0xffffff, 0.9);
    ringGfx.strokeCircle(32, 32, 28);
    ringGfx.generateTexture('particle_ring', 64, 64);
    ringGfx.destroy();
  }
}
