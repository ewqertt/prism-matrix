import Phaser from 'phaser';
import { soundEngine } from '../utils/SoundEngine.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  init(data) {
    this.gameScene = data.gameScene;
    this.balance = this.registry.get('balance');
  }

  create() {
    this.createTopBar();
    this.createRightPanel();
    this.cardOverlay = this.add.container(0, 0).setVisible(false).setDepth(100);
    this.endOverlay = this.add.container(0, 0).setVisible(false).setDepth(200);

    this.gameScene.events.on('ui-update', (state) => this.refreshUI(state));
    this.gameScene.events.on('show-cards', (cards) => this.showCardSelection(cards));
    this.gameScene.events.on('game-over', (res) => this.showEndScreen(res));
  }

  createTopBar() {
    this.add.rectangle(640, 38, 1280, 76, 0x0d1322, 0.96);
    const line = this.add.graphics();
    line.lineStyle(1, 0x1e293b, 1);
    line.lineBetween(0, 76, 1280, 76);

    this.add.text(28, 22, 'PRISM MATRIX // 棱鏡矩陣', {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#38bdf8'
    });

    this.hpText = this.add.text(360, 24, '', { fontSize: '17px', fontStyle: 'bold', color: '#fb7185' });
    this.energyText = this.add.text(540, 24, '', { fontSize: '17px', fontStyle: 'bold', color: '#fbbf24' });
    this.waveText = this.add.text(720, 24, '', { fontSize: '17px', fontStyle: 'bold', color: '#e2e8f0' });
    this.scoreText = this.add.text(890, 24, '', { fontSize: '17px', color: '#94a3b8' });

    // Speed & Audio buttons
    this.speedBtn = this.makeButton(1120, 38, 92, 36, '1x 速度', 0x1e293b, () => {
      this.gameScene.toggleGameSpeed();
    });

    this.muteBtn = this.makeButton(1222, 38, 76, 36, '音效開', 0x1e293b, () => {
      const muted = soundEngine.toggleMute();
      this.muteBtn.label.setText(muted ? '靜音' : '音效開');
    });
  }

  createRightPanel() {
    const panelX = 1142;
    this.add.rectangle(panelX, 398, 252, 616, 0x0d1322, 0.94)
      .setStrokeStyle(1, 0x1e293b);

    this.add.text(1034, 108, '建造幾何砲塔', {
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#94a3b8'
    });

    this.buildCards = {};
    const types = ['pulse', 'frost', 'rail', 'arc'];
    types.forEach((type, idx) => {
      const cfg = this.balance.towers[type];
      const y = 172 + idx * 78;
      const bg = this.add.rectangle(panelX, y, 224, 66, 0x131c31)
        .setStrokeStyle(1.5, 0x26344e)
        .setInteractive({ useHandCursor: true });

      const title = this.add.text(1042, y - 22, `${cfg.name} (${cfg.cost} EN)`, {
        fontSize: '14px',
        fontStyle: 'bold',
        color: cfg.color
      });
      const desc = this.add.text(1042, y + 2, cfg.description, {
        fontSize: '11px',
        color: '#94a3b8',
        wordWrap: { width: 204 }
      });

      bg.on('pointerdown', () => this.gameScene.selectBuildType(type));
      this.buildCards[type] = { bg, title, desc, cfg };
    });

    // Selected Tower Inspector
    this.inspectorContainer = this.add.container(0, 0).setVisible(false);
    this.inspectorBox = this.add.rectangle(panelX, 540, 224, 150, 0x111827).setStrokeStyle(1, 0x38bdf8);
    this.inspectorTitle = this.add.text(1042, 476, '', { fontSize: '14px', fontStyle: 'bold', color: '#ffffff' });
    this.inspectorStats = this.add.text(1042, 498, '', { fontSize: '12px', color: '#cbd5e1' });

    this.upgradeBtn = this.makeButton(panelX, 554, 200, 32, '升級砲塔', 0x0284c7, () => {
      this.gameScene.upgradeSelectedTower();
    });
    this.modeBtn = this.makeButton(1090, 594, 96, 28, '目標: 最前', 0x1e293b, () => {
      this.gameScene.cycleTargetMode();
    });
    this.sellBtn = this.makeButton(1194, 594, 96, 28, '回收', 0x7f1d1d, () => {
      this.gameScene.sellSelectedTower();
    });

    this.inspectorContainer.add([
      this.inspectorBox,
      this.inspectorTitle,
      this.inspectorStats,
      this.upgradeBtn.bg, this.upgradeBtn.label,
      this.modeBtn.bg, this.modeBtn.label,
      this.sellBtn.bg, this.sellBtn.label
    ]);

    // Start Wave Button
    this.startWaveBtn = this.makeButton(panelX, 666, 224, 46, '啟動第 1 波攻勢', 0x059669, () => {
      this.gameScene.startNextWave();
    });
  }

  makeButton(x, y, w, h, text, fillColor, onClick) {
    const bg = this.add.rectangle(x, y, w, h, fillColor)
      .setStrokeStyle(1, 0xffffff, 0.18)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(x, y, text, {
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    bg.on('pointerdown', onClick);
    return { bg, label };
  }

  refreshUI(state) {
    this.hpText.setText(`核心護盾: ${state.coreHp} / ${state.maxCoreHp}`);
    this.energyText.setText(`能量: ${state.energy} EN`);
    this.waveText.setText(`波次: ${state.wave} / ${state.totalWaves}`);
    this.scoreText.setText(`分數: ${state.score}`);
    this.speedBtn.label.setText(`${state.gameSpeed}x 速度`);

    // Highlight selected build button
    for (const [type, item] of Object.entries(this.buildCards)) {
      const selected = !state.selectedTower && state.selectedBuildType === type;
      const canAfford = state.energy >= item.cfg.cost;
      item.bg.setStrokeStyle(selected ? 2 : 1, selected ? 0x38bdf8 : 0x26344e);
      item.bg.setFillStyle(selected ? 0x1a2844 : 0x131c31);
      item.title.setAlpha(canAfford ? 1 : 0.45);
    }

    // Wave button state
    if (state.waveActive) {
      this.startWaveBtn.bg.setFillStyle(0x1e293b);
      this.startWaveBtn.label.setText('敵軍入侵中...');
    } else {
      this.startWaveBtn.bg.setFillStyle(0x059669);
      this.startWaveBtn.label.setText(`啟動第 ${state.wave} 波攻勢`);
    }

    // Inspector state
    const t = state.selectedTower;
    if (t) {
      this.inspectorContainer.setVisible(true);
      const cfg = this.balance.towers[t.type];
      const dmg = Math.round(this.gameScene.getTowerDamage(t));
      const rng = Math.round(this.gameScene.getTowerRange(t));
      this.inspectorTitle.setText(`${cfg.name}  Lv.${t.level}`);
      this.inspectorStats.setText(`傷害: ${dmg}   射程: ${rng}`);

      if (t.level >= this.balance.player.maxTowerLevel) {
        this.upgradeBtn.label.setText('已達最高等級');
        this.upgradeBtn.bg.setFillStyle(0x334155);
      } else {
        const upCost = this.gameScene.getUpgradeCost(t);
        this.upgradeBtn.label.setText(`升級 Lv.${t.level + 1} (${upCost} EN)`);
        this.upgradeBtn.bg.setFillStyle(state.energy >= upCost ? 0x0284c7 : 0x334155);
      }

      const modeMap = { first: '最前', strong: '最強', close: '最近' };
      this.modeBtn.label.setText(`目標: ${modeMap[t.targetMode]}`);
      const refund = Math.round(t.totalInvested * this.balance.player.sellRefundRatio);
      this.sellBtn.label.setText(`回收 +${refund}`);
    } else {
      this.inspectorContainer.setVisible(false);
    }
  }

  showCardSelection(cards) {
    this.cardOverlay.removeAll(true);
    this.cardOverlay.setVisible(true);

    const dim = this.add.rectangle(640, 360, 1280, 720, 0x04070e, 0.84).setInteractive();
    const header = this.add.text(640, 138, '波次防禦成功 — 選擇一項科技強化模組', {
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5);

    this.cardOverlay.add([dim, header]);

    const rarityColors = {
      common: { hex: '#38bdf8', num: 0x38bdf8, label: '普通模組' },
      rare: { hex: '#a78bfa', num: 0xa78bfa, label: '稀有科技' },
      epic: { hex: '#fbbf24', num: 0xfbbf24, label: '史詩核心' }
    };

    cards.forEach((card, idx) => {
      const cx = 340 + idx * 300;
      const cy = 385;
      const rStyle = rarityColors[card.rarity] || rarityColors.common;

      const box = this.add.rectangle(cx, cy, 260, 330, 0x0f172a)
        .setStrokeStyle(2, rStyle.num)
        .setInteractive({ useHandCursor: true });

      const badge = this.add.text(cx, cy - 125, rStyle.label, {
        fontSize: '13px',
        fontStyle: 'bold',
        color: rStyle.hex
      }).setOrigin(0.5);

      const title = this.add.text(cx, cy - 70, card.title, {
        fontSize: '21px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 220 }
      }).setOrigin(0.5);

      const desc = this.add.text(cx, cy + 25, card.desc, {
        fontSize: '15px',
        color: '#cbd5e1',
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: 220 }
      }).setOrigin(0.5);

      const btnLabel = this.add.text(cx, cy + 125, '[ 點擊安裝模組 ]', {
        fontSize: '14px',
        fontStyle: 'bold',
        color: rStyle.hex
      }).setOrigin(0.5);

      box.on('pointerover', () => box.setFillStyle(0x1e293b));
      box.on('pointerout', () => box.setFillStyle(0x0f172a));
      box.on('pointerdown', () => {
        this.cardOverlay.setVisible(false);
        this.gameScene.applyCardChoice(card);
      });

      this.cardOverlay.add([box, badge, title, desc, btnLabel]);
    });
  }

  showEndScreen(res) {
    this.endOverlay.removeAll(true);
    this.endOverlay.setVisible(true);

    const dim = this.add.rectangle(640, 360, 1280, 720, 0x04070e, 0.88).setInteractive();
    const panel = this.add.rectangle(640, 360, 520, 320, 0x0f172a)
      .setStrokeStyle(2, res.victory ? 0x34d399 : 0xf43f5e);

    const title = this.add.text(640, 265, res.victory ? '矩陣防禦完成 — 勝利！' : '核心棱鏡崩解 — 任務失敗', {
      fontSize: '30px',
      fontStyle: 'bold',
      color: res.victory ? '#34d399' : '#fb7185'
    }).setOrigin(0.5);

    const summary = this.add.text(640, 345, `抵達波次：第 ${res.wave} 波   |   最終評價分數：${res.score}`, {
      fontSize: '18px',
      color: '#e2e8f0'
    }).setOrigin(0.5);

    const restartBtn = this.makeButton(640, 435, 220, 48, '重新啟動矩陣', 0x0284c7, () => {
      this.endOverlay.setVisible(false);
      this.gameScene.scene.restart();
    });

    this.endOverlay.add([dim, panel, title, summary, restartBtn.bg, restartBtn.label]);
  }
}
