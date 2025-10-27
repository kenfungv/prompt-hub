# Prompt Hub - 專用 Prompt 模板系統

此分支 feature/prompt-template-system 新增：
- 爬蟲腳本 scripts/prompt_template_scraper.py，自動抓取主流行業（銷售/客服/營銷/技術/醫療）Prompt 模板，保存至 data/prompts/industry_prompts.json。
- 前端介面 apps/prompt_templates/index.html，提供分類選單、一鍵導入、複製、自訂標籤、JSON 導出/導入與本地備份。
- Issues 同步里程碑與進展追蹤。

使用方法
1) 取得模板數據
- 本地執行：python scripts/prompt_template_scraper.py 會輸出 data/prompts/industry_prompts.json
- 或直接於前端頁面中點擊「一鍵導入爬取模板」載入此 JSON

2) 前端操作
- 打開 apps/prompt_templates/index.html
- 左側多選分類：銷售/客服/營銷/技術/醫療/通用
- 搜尋：標題或內容關鍵字
- 模板卡片：
  - 複製：一鍵複製內容
  - 加標籤：快速添加自訂標籤
  - 刪除：移除該模板
- 導出(JSON)：將當前所有模板與標籤導出為 JSON
- 導入(JSON)：載入外部 JSON（格式見下）
- 備份：保存到瀏覽器 localStorage

3) JSON 結構
{
  "items": [
    { "id": "id_xxx", "title": "標題", "prompt": "內容", "industry": "sales|customer_service|marketing|technology|medical|general", "tags": ["tag1"] }
  ],
  "tags": ["tag1", "tag2"]
}

自動化與後續計畫
- 可加上 GitHub Actions 排程運行爬蟲並自動提交更新 JSON
- 增強模板去重、評分排序與可視化
- 與 A/B 測試模組對接，支持多模型結果比對
