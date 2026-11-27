# WORKFLOW.md

## 專案目標
於桌面瀏覽器環境完成一款結合策略塔防與 Roguelite 三選一卡牌強化的 2D 網頁遊戲《棱鏡矩陣》(PRISM MATRIX)，並可透過 Vite 建置部署至 GitHub Pages。

## 開發階段與交付物
- **STEP 00–04 企劃與規格**：確認塔防類型、極簡幾何主題、四塔機制與 10 波首領節奏，產出 `GDD.md` 與 `PROGRESS.json`。
- **STEP 05 核心原型**：建立 `BootScene`、`GameScene`、`UIScene`，實作網格建塔、路徑尋路、傷害判定與波次推進。
- **STEP 06–10 美術與特效**：產出 `ART_BIBLE.md` 與 `VFX_DESIGN.md`，實作高對比幾何向量外觀、寒霜擴散環、貫穿雷射與連鎖閃電特效。
- **STEP 11–13 數值平衡與交付**：抽離所有遊戲數值至 `config/game-balance.json`，撰寫 `GAME_BALANCE.md`、`PLAYTEST.md` 與 `README.md`。
