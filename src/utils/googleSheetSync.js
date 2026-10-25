/**
 * Google Sheet Live Sync Service for B1 Expense Tracker
 * Handles 2-way communication with Google Apps Script Web App.
 */

// Normalize Google Sheet categories to B1 category IDs
export const CATEGORY_MAP = {
  'raw materials': 'raw_materials',
  'food&travel': 'food_travel',
  'food & travel': 'food_travel',
  'investment': 'investment',
  'sale': 'sale',
  'share distribution': 'share_distribution',
  'materials': 'materials',
  'marketing': 'marketing',
  'software': 'software',
  'salaries': 'salaries',
  'travel': 'travel',
  'other': 'other_d',
};

export function normalizeSheetDate(dateStr, timeStr) {
  let parsedDate = '';
  let parsedTime = '09:00';

  if (timeStr) {
    const t = String(timeStr).trim();
    if (t.match(/^\d{1,2}:\d{2}/)) {
      parsedTime = t.slice(0, 5);
    } else if (!isNaN(t) && t.length >= 3 && t.length <= 4 && !t.includes(':')) {
      const num = parseInt(t, 10);
      const h = String(Math.floor(num / 100)).padStart(2, '0');
      const m = String(num % 100).padStart(2, '0');
      if (parseInt(h, 10) < 24 && parseInt(m, 10) < 60) {
        parsedTime = `${h}:${m}`;
      }
    } else {
      const tObj = new Date(t);
      if (!isNaN(tObj.getTime())) {
        const hh = String(tObj.getHours()).padStart(2, '0');
        const mm = String(tObj.getMinutes()).padStart(2, '0');
        parsedTime = `${hh}:${mm}`;
      }
    }
  }

  if (dateStr) {
    const str = String(dateStr).trim();
    // Pattern 1: YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}:\d{2}))?/);
    if (isoMatch) {
      parsedDate = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
      if (!timeStr && isoMatch[4]) parsedTime = isoMatch[4];
    } else {
      // Pattern 2: DD/MM/YYYY or DD/MM/YYYYY
      const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4,5})(?:\s+(\d{2}:\d{2}))?/);
      if (dmyMatch) {
        const d = String(dmyMatch[1]).padStart(2, '0');
        const m = String(dmyMatch[2]).padStart(2, '0');
        let y = dmyMatch[3];
        if (y.length > 4) y = '2026';
        parsedDate = `${y}-${m}-${d}`;
        if (!timeStr && dmyMatch[4]) parsedTime = dmyMatch[4];
      } else {
        // Pattern 3: Full JS Date string e.g. "Sun Oct 25 2026 00:00:00 GMT+0530"
        const dObj = new Date(str);
        if (!isNaN(dObj.getTime())) {
          const y = dObj.getFullYear();
          const m = String(dObj.getMonth() + 1).padStart(2, '0');
          const d = String(dObj.getDate()).padStart(2, '0');
          parsedDate = `${y}-${m}-${d}`;
          if (!timeStr) {
            const hh = String(dObj.getHours()).padStart(2, '0');
            const mm = String(dObj.getMinutes()).padStart(2, '0');
            if (hh !== '00' || mm !== '00') parsedTime = `${hh}:${mm}`;
          }
        }
      }
    }
  }

  if (!parsedDate) {
    parsedDate = new Date().toISOString().slice(0, 10);
  }

  return { date: parsedDate, time: parsedTime };
}

export function parseSheetAmount(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  // Remove currency symbols, commas, quotes
  const cleaned = String(val).replace(/[₹$,\s"]/g, '');
  return parseFloat(cleaned) || 0;
}

export const DEFAULT_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1-QClRHM21pb220ffgQaO1CVbbtIy5OzIJwu1ouYb-60/gviz/tq?tqx=out:csv&sheet=Sheet1';

export async function fetchFromGoogleSheetCsv(csvUrl = DEFAULT_SHEET_CSV_URL) {
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`Failed to fetch sheet CSV: ${res.status}`);
  const raw = await res.text();

  const parseCSVLine = (text) => {
    let p = '', inQuotes = false, fields = [];
    for (let i = 0; i < text.length; i++) {
      let ch = text[i];
      if (ch === '"') {
        if (inQuotes && text[i+1] === '"') { p += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        fields.push(p); p = '';
      } else {
        p += ch;
      }
    }
    fields.push(p);
    return fields;
  };

  const rows = raw.split(/\r?\n/).filter(Boolean).map(parseCSVLine);
  const transactions = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const d = (row[1] || '').trim();
    let t = (row[2] || '').trim();
    const desc = (row[3] || '').trim();
    const rawAmt = (row[4] || '').trim();
    const type = (row[5] || '').trim();
    const cat = (row[6] || '').trim();
    const partner = (row[7] || '').trim();

    if (d && (desc || rawAmt)) {
      const amt = parseFloat(rawAmt.replace(/[^0-9.]/g, '')) || 0;
      if (t.length > 5) t = t.slice(0, 5);
      if (!t) t = '09:00';
      transactions.push({
        row: r + 1,
        date: d,
        time: t,
        dateTime: `${d} ${t}`.trim(),
        description: desc,
        amount: amt,
        type: type.toLowerCase() === 'credit' ? 'credit' : 'debit',
        category: cat,
        partner: partner || '',
      });
    }
  }

  // Parse partner breakdown table (Table 2)
  const partners = [];
  const pctMap = { bhuvan: 38.0, kushal: 15.5, amulya: 15.5, deepika: 15.5, anagha: 15.5 };
  const colorMap = { bhuvan: '#a78bfa', kushal: '#38bdf8', amulya: '#fbbf24', deepika: '#f472b6', anagha: '#34d399' };
  let partnerSummary = { totalProfit: 8007, totalWithdrawn: 1135, availableProfit: 6872 };

  for (let r = 15; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const val = (rows[r][c] || '').toLowerCase().trim();
      if (val === 'partner' && rows[r+1] && (rows[r+1][c] || '').toLowerCase().trim() === 'bhuvan') {
        for (let pr = r + 1; pr < Math.min(r + 8, rows.length); pr++) {
          const name = (rows[pr][c] || '').trim();
          if (!name) continue;
          const alloc = parseFloat((rows[pr][c+1] || '0').replace(/[^0-9.]/g, '')) || 0;
          const withdr = parseFloat((rows[pr][c+2] || '0').replace(/[^0-9.]/g, '')) || 0;
          const avail = parseFloat((rows[pr][c+3] || '0').replace(/[^0-9.]/g, '')) || 0;
          if (name.toLowerCase() === 'total') {
            partnerSummary = { totalProfit: alloc, totalWithdrawn: withdr, availableProfit: avail };
            break;
          }
          partners.push({
            id: name.toLowerCase(),
            name,
            sharePct: pctMap[name.toLowerCase()] || 0,
            allocated: alloc,
            withdrawn: withdr,
            available: avail,
            color: colorMap[name.toLowerCase()] || '#60a5fa',
          });
        }
        break;
      }
    }
    if (partners.length > 0) break;
  }

  return { status: 'success', transactions, partners, summary: partnerSummary };
}

/**
 * Fetch live data from Google Sheet Apps Script Web App or directly from Sheet CSV
 */
export async function fetchFromGoogleSheet(webhookUrl) {
  if (webhookUrl && webhookUrl.startsWith('http') && webhookUrl.includes('macros/s/')) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && Array.isArray(data.transactions) && data.transactions.length > 0) {
          return data;
        }
      }
    } catch (e) {
      console.warn('Webhook fetch failed, falling back to direct Google Sheet endpoint:', e);
    }
  }

  // Direct fetch from Google Sheet
  return await fetchFromGoogleSheetCsv();
}

export const CATEGORY_DISPLAY_MAP = {
  raw_materials: 'Raw Materials',
  food_travel: 'Food&Travel',
  investment: 'Investment',
  sale: 'Sale',
  share_distribution: 'Share Distribution',
  materials: 'Materials',
  marketing: 'Marketing',
  software: 'Software',
  salaries: 'Salaries',
  travel: 'Food&Travel',
  other_d: 'Other',
  other_c: 'Other',
};

/**
 * Push a new transaction to the Google Sheet via Apps Script Web App
 */
export async function pushToGoogleSheet(webhookUrl, entry) {
  if (!webhookUrl || !webhookUrl.startsWith('http')) return false;

  try {
    const formattedCat = CATEGORY_DISPLAY_MAP[entry.category] || entry.category || 'Other';
    const formattedTime = entry.time ? (entry.time.length === 5 ? `${entry.time}:00` : entry.time) : '09:00:00';
    const payload = {
      action: 'add',
      entry: {
        date: entry.date,
        time: formattedTime,
        dateTime: `${entry.date} ${formattedTime}`,
        description: entry.label || '',
        amount: entry.amount || 0,
        type: entry.type === 'credit' ? 'Credit' : 'Debit',
        category: formattedCat,
        partner: entry.partner || entry.person || '',
      },
    };

    console.log('[GoogleSheetSync] Pushing new transaction:', payload);

    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    console.log('[GoogleSheetSync] Push successfully sent to webhook:', webhookUrl);
    return true;
  } catch (err) {
    console.warn('Failed to push to Google Sheet:', err);
    return false;
  }
}

export const APPS_SCRIPT_TEMPLATE = `// ==========================================
// B1 EXPENSE TRACKER - GOOGLE APPS SCRIPT
// Updated for Separate Date (Col B) & Time (Col C)
// ==========================================

// --- TRIGGER: Auto-run on spreadsheet edit ---
function onEdit(e) {
  if (!e || !e.range) return;
  convertFourDigitToTime(e);
}

// --- FUNCTION 1: 4-digit to time conversion ---
function convertFourDigitToTime(e) {
  var range = e.range;
  var sheet = range.getSheet();
  
  // Sheet1, Column C (Column 3), starting from row 5
  if (sheet.getName() === "Sheet1" && range.getColumn() === 3 && range.getRow() >= 5) {
    var val = String(e.value || "").trim();
    
    // Check if input is 3 or 4 digits without a colon
    if (!isNaN(val) && val.length >= 3 && val.length <= 4 && !val.includes(":")) {
      var num = parseInt(val, 10);
      var hours = Math.floor(num / 100);
      var minutes = num % 100;
      
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        var date = new Date(1899, 11, 30, hours, minutes, 0);
        range.setValue(date);
        range.setNumberFormat("HH:mm:ss");
      }
    }
  }
}

function pad2(n) { return (n < 10 ? "0" : "") + n; }

function formatCellDate(val) {
  if (!val) return "";
  if (Object.prototype.toString.call(val) === "[object Date]" || val instanceof Date) {
    return val.getFullYear() + "-" + pad2(val.getMonth() + 1) + "-" + pad2(val.getDate());
  }
  return String(val).trim();
}

function formatCellTime(val) {
  if (!val) return "";
  if (Object.prototype.toString.call(val) === "[object Date]" || val instanceof Date) {
    return pad2(val.getHours()) + ":" + pad2(val.getMinutes()) + ":" + pad2(val.getSeconds());
  }
  var s = String(val).trim();
  if (!isNaN(s) && s.length >= 3 && s.length <= 4 && !s.includes(":")) {
    var num = parseInt(s, 10);
    var h = Math.floor(num / 100);
    var m = num % 100;
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return pad2(h) + ":" + pad2(m) + ":00";
    }
  }
  return s;
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Sheet1") || ss.getActiveSheet();
    var data = sheet.getDataRange().getValues();

    // 1. Detect Header Row & Separate Date/Time Columns
    var headerRowIdx = -1;
    var colDate = 1, colTime = 2, colDesc = 3, colAmt = 4, colType = 5, colCat = 6, colPartner = 7;

    for (var r = 0; r < Math.min(10, data.length); r++) {
      for (var c = 0; c < 5; c++) {
        var str = String(data[r][c] || "").toLowerCase().trim();
        if (str === "date") {
          headerRowIdx = r;
          colDate = c;
          if (String(data[r][c + 1] || "").toLowerCase().indexOf("time") !== -1) {
            colTime = c + 1;
            colDesc = c + 2;
            colAmt = c + 3;
            colType = c + 4;
            colCat = c + 5;
            colPartner = c + 6;
          } else {
            colTime = -1;
            colDesc = c + 1;
            colAmt = c + 2;
            colType = c + 3;
            colCat = c + 4;
            colPartner = c + 5;
          }
          break;
        }
      }
      if (headerRowIdx !== -1) break;
    }

    if (headerRowIdx === -1) headerRowIdx = 3;

    // 2. Extract Transactions
    var transactions = [];
    for (var r = headerRowIdx + 1; r < data.length; r++) {
      var rawD = data[r][colDate];
      var rawT = colTime !== -1 ? data[r][colTime] : "";
      var descVal = data[r][colDesc];
      var amtVal = data[r][colAmt];
      var typeVal = data[r][colType];
      var catVal = data[r][colCat];
      var partnerVal = data[r][colPartner];

      if (!rawD && !descVal && !amtVal) continue;
      if (!descVal && !amtVal) continue;

      var dStr = formatCellDate(rawD);
      var tStr = formatCellTime(rawT);
      var fullDateTime = dStr + (tStr ? " " + tStr : "");

      transactions.push({
        row: r + 1,
        dateTime: fullDateTime,
        date: dStr,
        time: tStr,
        description: String(descVal || ""),
        amount: amtVal,
        type: String(typeVal || ""),
        category: String(catVal || ""),
        partner: String(partnerVal || "")
      });
    }

    // 3. Extract Partner Breakdown Table
    var partners = [];
    var partnerSummary = { totalProfit: 5206, totalWithdrawn: 1135, availableProfit: 4071 };
    var pctMap = { "bhuvan": 38.0, "kushal": 15.5, "amulya": 15.5, "deepika": 15.5, "anagha": 15.5 };

    for (var r = 0; r < data.length; r++) {
      for (var c = 0; c < data[r].length; c++) {
        var cell = String(data[r][c] || "").trim().toLowerCase();
        if (cell === "allocated profit" || (cell === "partner" && String(data[r][c+1] || "").toLowerCase().indexOf("allocated") !== -1)) {
          var pCol = (cell === "partner") ? c : c - 1;
          for (var pr = r + 1; pr < Math.min(r + 12, data.length); pr++) {
            var pName = String(data[pr][pCol] || "").trim();
            if (!pName) continue;
            var alloc = data[pr][pCol + 1];
            var withdr = data[pr][pCol + 2];
            var avail = data[pr][pCol + 3];

            if (pName.toLowerCase() === "total") {
              partnerSummary.totalProfit = alloc;
              partnerSummary.totalWithdrawn = withdr;
              partnerSummary.availableProfit = avail;
              break;
            }

            partners.push({
              name: pName,
              sharePct: pctMap[pName.toLowerCase()] || 0,
              allocated: alloc,
              withdrawn: withdr,
              available: avail
            });
          }
          break;
        }
      }
      if (partners.length > 0) break;
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        status: "success",
        timestamp: new Date().toISOString(),
        transactions: transactions,
        partners: partners,
        summary: partnerSummary
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Sheet1") || ss.getActiveSheet();

    if (body.action === "add" && body.entry) {
      var entry = body.entry;

      // 1. Safely find the last row with data in Date (Col B) or Description (Col D)
      var totalRows = sheet.getLastRow();
      var targetRow = 5; // Default: first transaction row starts at row 5

      if (totalRows >= 5) {
        var vals = sheet.getRange(1, 1, totalRows, 4).getValues();
        var lastFilled = 4;
        for (var i = 4; i < vals.length; i++) {
          // Check Column B (index 1) or Column D (index 3)
          if (String(vals[i][1] || "").trim() !== "" || String(vals[i][3] || "").trim() !== "") {
            lastFilled = i + 1;
          }
        }
        targetRow = lastFilled + 1;
      }

      // 2. If targetRow is beyond the sheet's total row count, insert new row(s)
      if (targetRow > sheet.getMaxRows()) {
        sheet.insertRowAfter(sheet.getMaxRows());
      }

      var datePart = entry.date || (entry.dateTime ? entry.dateTime.split(" ")[0] : "");
      var timePart = entry.time || (entry.dateTime && entry.dateTime.indexOf(" ") !== -1 ? entry.dateTime.split(" ")[1] : "09:00:00");

      sheet.getRange(targetRow, 2).setValue(datePart);                // Col B: Date
      sheet.getRange(targetRow, 3).setValue(timePart);                // Col C: Time
      sheet.getRange(targetRow, 4).setValue(entry.description || ""); // Col D: Description
      sheet.getRange(targetRow, 5).setValue(Number(entry.amount) || 0); // Col E: Amount
      sheet.getRange(targetRow, 6).setValue(entry.type || "Debit");   // Col F: Credit/Debit
      sheet.getRange(targetRow, 7).setValue(entry.category || "Other"); // Col G: Category
      sheet.getRange(targetRow, 8).setValue(entry.partner || "");    // Col H: Partner

      return ContentService
        .createTextOutput(JSON.stringify({ status: "success", insertedRow: targetRow }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", message: "no action matched" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

