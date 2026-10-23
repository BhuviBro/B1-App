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

export function normalizeSheetDate(dateStr) {
  if (!dateStr) return { date: new Date().toISOString().slice(0, 10), time: '09:00' };
  const str = String(dateStr).trim();

  // Pattern 1: YYYY-MM-DD HH:MM:SS
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}:\d{2}))?/);
  if (isoMatch) {
    return {
      date: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`,
      time: isoMatch[4] || '09:00',
    };
  }

  // Pattern 2: DD/MM/YYYY or DD/MM/YYYYY (typo like 20226)
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4,5})(?:\s+(\d{2}:\d{2}))?/);
  if (dmyMatch) {
    const d = String(dmyMatch[1]).padStart(2, '0');
    const m = String(dmyMatch[2]).padStart(2, '0');
    let y = dmyMatch[3];
    if (y.length > 4) y = '2026'; // fix typo like 20226 -> 2026
    return {
      date: `${y}-${m}-${d}`,
      time: dmyMatch[4] || '09:00',
    };
  }

  return { date: new Date().toISOString().slice(0, 10), time: '09:00' };
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
// Bidirectional Live Sync for B1 Expense Tracker
// ==========================================

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Sheet1") || ss.getActiveSheet();
    var data = sheet.getDataRange().getValues();

    // 1. Detect Header Row for Transactions
    var headerRowIdx = -1;
    var colDate = 0, colDesc = 1, colAmt = 2, colType = 3, colCat = 4, colPartner = 5;

    for (var r = 0; r < Math.min(10, data.length); r++) {
      for (var c = 0; c < 4; c++) {
        var str = String(data[r][c] || "").toLowerCase();
        if (str.indexOf("date") !== -1 || str.indexOf("expense") !== -1) {
          headerRowIdx = r;
          colDate = c;
          colDesc = c + 1;
          colAmt = c + 2;
          colType = c + 3;
          colCat = c + 4;
          colPartner = c + 5;
          break;
        }
      }
      if (headerRowIdx !== -1) break;
    }

    if (headerRowIdx === -1) {
      headerRowIdx = 3; // Default to Row 4 (0-indexed 3)
      colDate = 0; colDesc = 1; colAmt = 2; colType = 3; colCat = 4; colPartner = 5;
    }

    // 2. Extract Transactions
    var transactions = [];
    for (var r = headerRowIdx + 1; r < data.length; r++) {
      var dVal = data[r][colDate];
      var descVal = data[r][colDesc];
      var amtVal = data[r][colAmt];
      var typeVal = data[r][colType];
      var catVal = data[r][colCat];
      var partnerVal = data[r][colPartner];

      if (!dVal && !descVal && !amtVal) continue;
      if (!descVal && !amtVal) continue;

      transactions.push({
        row: r + 1,
        dateTime: String(dVal || ""),
        description: String(descVal || ""),
        amount: amtVal,
        type: String(typeVal || ""),
        category: String(catVal || ""),
        partner: String(partnerVal || "")
      });
    }

    // 3. Extract Partner Breakdown Table (Columns H-K)
    var partners = [];
    var partnerSummary = { totalProfit: 4490, totalWithdrawn: 1135, availableProfit: 3355 };

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
      var vals = sheet.getRange("A1:B100").getValues();
      var lastRow = 4;
      for (var i = 4; i < vals.length; i++) {
        if (vals[i][0] || vals[i][1]) {
          lastRow = i + 1;
        }
      }
      var targetRow = lastRow + 1;

      sheet.getRange(targetRow, 1).setValue(entry.dateTime);
      sheet.getRange(targetRow, 2).setValue(entry.description);
      sheet.getRange(targetRow, 3).setValue(Number(entry.amount));
      sheet.getRange(targetRow, 4).setValue(entry.type);
      sheet.getRange(targetRow, 5).setValue(entry.category);
      sheet.getRange(targetRow, 6).setValue(entry.partner || "");

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
