# 《棱鏡矩陣》(PRISM MATRIX) — 幾何策略塔防

一款採用 **Phaser 3 + Vite** 開發的極簡現代幾何策略塔防與 Roguelite 卡牌強化遊戲。

## 操作方式
- **建造砲塔**：於右側面板點選「脈衝三角塔 / 冰霜六邊塔 / 軌道菱形塔 / 磁暴星形塔」，再點擊地圖上的空地網格進行建造。
- **升級與管理**：點擊場上已建造的砲塔，可開啟檢視面板進行 **Lv.1～Lv.3 升級**、切換 **索敵模式（最前／最強／最近）** 或 **回收返還 75% 能量**。
- **啟動波次與倍速**：點擊右下角「啟動第 X 波攻勢」開始防禦，右上角可切換 `1x / 2x` 遊戲速度與音效開關。
- **科技卡牌強化**：每完成一波防禦，可從 3 張隨機科技強化模組中選擇 1 張永久強化防線。

## 本機安裝與啟動指令
```bash
npm install
npm run dev
```

## 建置與 GitHub Pages 部署方式
1. 將本專案所有檔案上傳至你的 GitHub Repository。
2. 前往 Repository 的 **Settings → Pages**，在 **Build and deployment → Source** 選擇 **GitHub Actions**（本專案已內建 `.github/workflows/deploy.yml` 自動建置腳本）。
3. 推送程式碼後等待約 1 分鐘，即可取得可公開遊玩的 GitHub Pages 網址繳交作業。
