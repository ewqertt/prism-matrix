# VFX_DESIGN.md — 技能與戰鬥特效規格

1. **受擊與擊破粒子（`particle_dot`）**：使用 Phaser `ParticleEmitter` 搭配 `ADD` 混合模式，依攻擊砲塔顏色噴發 4～16 顆高速衰減光點。
2. **寒霜脈衝環（`particle_ring`）**：冰霜六邊塔攻擊時生成擴散光環 Tween（320ms 內擴張至實際射程半徑並淡出），精準提示減速判定範圍。
3. **貫穿軌道光束與連鎖電弧**：透過 `GameScene.fxGraphics` 繪製具備透明衰減生命週期（160～180ms）的高亮幾何折線與光束。
4. **核心受擊回饋**：敵人突破防線時觸發 `cameras.main.shake(180, 0.008)` 與低頻合成警報音效。
