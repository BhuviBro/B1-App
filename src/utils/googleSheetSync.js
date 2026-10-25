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

/**
 * Fetch live data from Google Sheet Apps Script Web App
 */
export async function fetchFromGoogleSheet(webhookUrl) {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    throw new Error('Please enter a valid Google Apps Script Web App URL.');
  }

  const res = await fetch(webhookUrl, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Google Sheet request failed with status: ${res.status}`);
  }

  const data = await res.json();
  if (data.status !== 'success' && !Array.isArray(data.transactions)) {
    throw new Error('Invalid response structure received from Google Sheet Web App.');
  }

  return data;
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
    const payload = {
      action: 'add',
      entry: {
        date: entry.date,
        time: entry.time || '09:00:00',
        dateTime: `${entry.date} ${entry.time || '09:00'}:00`,
        description: entry.label || '',
        amount: entry.amount || 0,
        type: entry.type === 'credit' ? 'Credit' : 'Debit',
        category: formattedCat,
        partner: entry.partner || '',
      },
    };

    // Google Apps Script accepts text/plain to avoid pre-flight CORS blocks
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

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
      var dVal = data[r][colDate];
      var tVal = colTime !== -1 ? data[r][colTime] : "";
      var descVal = data[r][colDesc];
      var amtVal = data[r][colAmt];
      var typeVal = data[r][colType];
      var catVal = data[r][colCat];
      var partnerVal = data[r][colPartner];

      if (!dVal && !descVal && !amtVal) continue;
      if (!descVal && !amtVal) continue;

      var fullDateTime = String(dVal || "");
      if (tVal) fullDateTime += " " + String(tVal);

      transactions.push({
        row: r + 1,
        dateTime: fullDateTime,
        date: String(dVal || ""),
        time: String(tVal || ""),
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
      var maxRows = Math.max(sheet.getLastRow(), 50);
      var vals = sheet.getRange(1, 1, maxRows, 4).getValues();
      var lastRow = 4;
      for (var i = 4; i < vals.length; i++) {
        if (vals[i][1] || vals[i][3]) {
          lastRow = i + 1;
        }
      }
      var targetRow = lastRow + 1;

      var datePart = entry.date || (entry.dateTime ? entry.dateTime.split(" ")[0] : "");
      var timePart = entry.time || (entry.dateTime && entry.dateTime.indexOf(" ") !== -1 ? entry.dateTime.split(" ")[1] : "09:00:00");

      sheet.getRange(targetRow, 2).setValue(datePart);          // Col B: Date
      sheet.getRange(targetRow, 3).setValue(timePart);          // Col C: Time
      sheet.getRange(targetRow, 4).setValue(entry.description);   // Col D: Description
      sheet.getRange(targetRow, 5).setValue(Number(entry.amount)); // Col E: Amount
      sheet.getRange(targetRow, 6).setValue(entry.type);          // Col F: Credit/Debit
      sheet.getRange(targetRow, 7).setValue(entry.category);      // Col G: Category
      sheet.getRange(targetRow, 8).setValue(entry.partner || ""); // Col H: Partner

      return ContentService
        .createTextOutput(JSON.stringify({ status: "success", insertedRow: targetRow }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
