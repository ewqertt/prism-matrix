# SKILLS_REGISTRY.md

## 擴充技能與執行工具紀錄
1. **Phaser 3 + Vite（核心開發框架）**：已整合至 `package.json` 與 `vite.config.js`，負責場景管理（`BootScene`、`GameScene`、`UIScene`）、向量幾何繪製與粒子系統。
2. **game-feel / game-ui-ux / level-design（設計方法論）**：應用於螢幕震動回饋、1x/2x 倍速切換、三選一卡牌介面與 10 波難度曲線規劃。
3. **pixelfx / agent-sprite-forge（素材與特效替代方案說明）**：因本專案採用極簡現代幾何風格，為確保多邊形在任何縮放解析度下維持銳利向量邊緣，所有防禦塔、敵人與粒子貼圖均透過 Phaser `Graphics` 與 `generateTexture` 程式化生成，並記錄於 `config/asset-manifest.json`。
