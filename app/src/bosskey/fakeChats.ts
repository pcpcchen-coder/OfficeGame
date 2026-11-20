// 老闆鍵的偽裝畫面：完整、可信、而且內容真的有用的工作對話。

import type { Block } from '../engine/types';

export interface FakeChat {
  id: string;
  title: string;
  question: string;
  answer: Block[];
}

export const FAKE_CHATS: FakeChat[] = [
  {
    id: 'xlookup',
    title: '合併兩張工作表的資料',
    question: '怎麼用 XLOOKUP 把「訂單」工作表的客戶名稱帶到「出貨」工作表？兩邊都有客戶編號。',
    answer: [
      { kind: 'text', text: '可以用 XLOOKUP 依客戶編號查找。假設：' },
      {
        kind: 'list',
        ordered: false,
        items: [
          { text: '「出貨」工作表的客戶編號在 A 欄（從 A2 開始）' },
          { text: '「訂單」工作表的客戶編號在 A 欄、客戶名稱在 C 欄' },
        ],
      },
      { kind: 'text', text: '在「出貨」工作表的 B2 輸入：' },
      { kind: 'code', lang: 'excel', text: '=XLOOKUP(A2, 訂單!$A:$A, 訂單!$C:$C, "查無資料")' },
      { kind: 'text', text: '然後往下填滿即可。幾個重點：' },
      {
        kind: 'list',
        ordered: true,
        items: [
          { text: '第 4 個參數是找不到時要顯示的文字，可以避免出現 #N/A。' },
          { text: '用 $ 鎖定查找範圍，往下複製時範圍才不會跑掉。' },
          { text: '如果編號前後可能有空白，把第一個參數改成 TRIM(A2)。' },
          { text: 'XLOOKUP 需要 Excel 2021 以後的版本；舊版可以改用 INDEX + MATCH：' },
        ],
      },
      { kind: 'code', lang: 'excel', text: '=INDEX(訂單!$C:$C, MATCH(A2, 訂單!$A:$A, 0))' },
    ],
  },
  {
    id: 'pivot',
    title: '用樞紐分析表彙總月營收',
    question: '我有一張每日銷售明細（日期、品項、金額），要怎麼快速看出每個月、每個品項的營收？',
    answer: [
      { kind: 'text', text: '用樞紐分析表最快，大約一分鐘可以完成：' },
      {
        kind: 'list',
        ordered: true,
        items: [
          { text: '點選資料範圍內任一儲存格，選「插入」→「樞紐分析表」。' },
          { text: '把「日期」拖到「列」。Excel 通常會自動依年、季、月分組；如果沒有，在日期上按右鍵 →「群組」→ 勾選「月」與「年」。' },
          { text: '把「品項」拖到「欄」。' },
          { text: '把「金額」拖到「值」，確認彙總方式是「加總」。' },
        ],
      },
      { kind: 'heading', text: '小技巧' },
      {
        kind: 'list',
        ordered: false,
        items: [
          { text: '原始資料先按 Ctrl+T 轉成表格，之後新增資料只要在樞紐分析表上按「重新整理」就會更新。' },
          { text: '在「值」上按右鍵 →「值的顯示方式」→「列總計百分比」，可以看出各品項的占比。' },
          { text: '想看趨勢的話，選取樞紐分析表後插入「樞紐分析圖」，選折線圖。' },
        ],
      },
    ],
  },
  {
    id: 'sql-dup',
    title: '找出重複的客戶資料',
    question: 'SQL 要怎麼找出 email 重複的客戶？',
    answer: [
      { kind: 'text', text: '先用 GROUP BY 找出哪些 email 重複：' },
      {
        kind: 'code',
        lang: 'sql',
        text: 'SELECT email, COUNT(*) AS cnt\nFROM customers\nGROUP BY email\nHAVING COUNT(*) > 1\nORDER BY cnt DESC;',
      },
      { kind: 'text', text: '如果要列出重複的完整資料列，可以用視窗函數：' },
      {
        kind: 'code',
        lang: 'sql',
        text: 'SELECT *\nFROM (\n  SELECT c.*,\n         COUNT(*) OVER (PARTITION BY LOWER(TRIM(email))) AS dup_cnt\n  FROM customers c\n) t\nWHERE dup_cnt > 1\nORDER BY LOWER(TRIM(email)), id;',
      },
      {
        kind: 'list',
        ordered: false,
        items: [
          { text: 'LOWER(TRIM(...)) 會把大小寫不同、前後有空白的 email 也視為重複。' },
          { text: 'MySQL 8.0 以上、PostgreSQL、SQL Server 都支援視窗函數。' },
          { text: '刪除重複資料前，建議先把結果匯出備份。' },
        ],
      },
    ],
  },
  {
    id: 'reschedule',
    title: '會議改期信件',
    question: '幫我寫一封禮貌的信，請客戶把週四的會議改到下週。',
    answer: [
      { kind: 'text', text: '以下是一份可以直接修改使用的範本：' },
      {
        kind: 'code',
        lang: 'text',
        text: '主旨：關於週四會議時間調整的請求\n\n○○ 您好，\n\n感謝您撥冗安排本週四的會議。由於我方內部時程臨時有所調整，\n想詢問是否方便將會議改至下週進行？\n\n以下時段供您參考：\n・下週二（○/○）上午 10:00–12:00\n・下週三（○/○）下午 2:00–5:00\n\n若以上時段都不方便，也請告訴我們您合適的時間，我們會盡量配合。\n造成不便，敬請見諒。\n\n敬祝 商祺\n\n○○○ 敬上',
      },
      { kind: 'text', text: '如果對方是長期合作的窗口，語氣可以再輕鬆一點，例如把「敬請見諒」改成「不好意思，再麻煩您了」。' },
    ],
  },
  {
    id: 'git-amend',
    title: 'Git 補上漏掉的檔案',
    question: 'git commit 之後才發現少加了一個檔案，要怎麼處理？還沒 push。',
    answer: [
      { kind: 'text', text: '還沒 push 的話，最簡單的方法是補進同一個 commit：' },
      { kind: 'code', lang: 'bash', text: 'git add path/to/missing-file\ngit commit --amend --no-edit' },
      { kind: 'text', text: '如果想整個撤銷那次 commit、但保留修改內容：' },
      { kind: 'code', lang: 'bash', text: 'git reset --soft HEAD~1' },
      {
        kind: 'list',
        ordered: false,
        items: [
          { text: '--amend 和 reset 都會改寫歷史；已經 push 到共用分支的 commit 不要這樣做，改用 git revert。' },
          { text: '--soft 會把修改留在暫存區；想連暫存也取消，改用 --mixed（預設值）。' },
        ],
      },
    ],
  },
];
