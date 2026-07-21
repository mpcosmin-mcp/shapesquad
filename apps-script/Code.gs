/**
 * ShapeSquad — Google Apps Script backend (paste this into the Sheet's
 * Apps Script editor and deploy as a Web App).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The write logic that persists measurements lives HERE, in Google — not in
 * the Next.js repo. If measurements logged from the app don't show up in the
 * Sheet, this is almost always the culprit: the old doPost read form params
 * (e.parameter.*) while the app sends a JSON body (e.postData.contents), so
 * every write landed empty or was dropped.
 *
 * This version:
 *   - Reads the JSON body correctly.
 *   - UPSERTS by (Nume, Date): updates the matching row if it exists, else
 *     appends. That makes the app's editable table work (edit = update,
 *     add = append) and fixes the "logs don't reach the DB" bug.
 *   - Only touches columns present in the payload AND in the header row.
 *     Never deletes. Unknown columns are ignored.
 *
 * DEPLOY
 * ------
 *   1. Open the Google Sheet → Extensions → Apps Script.
 *   2. Replace the code with this file's contents. Save.
 *   3. Deploy → Manage deployments → edit the existing Web App deployment →
 *      Version: New version → Deploy. (Keep the SAME deployment so the
 *      /exec URL used by the app doesn't change.)
 *      Execute as: Me · Who has access: Anyone.
 *
 * The tab used is the first sheet by default; set SHEET_NAME to pin a tab.
 */

var SHEET_NAME = '';          // '' → first sheet. Set e.g. 'Date' to pin a tab.
var NAME_HEADER = 'Nume';     // header of the person column
var DATE_HEADER = 'Date';     // header of the date column

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (SHEET_NAME) {
    var s = ss.getSheetByName(SHEET_NAME);
    if (s) return s;
  }
  return ss.getSheets()[0];
}

/** Normalize a date value (Date object, ISO, or M/D/YYYY) to YYYY-MM-DD. */
function normDate_(v) {
  if (v == null || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var s = String(v).trim();
  var parts = s.split('/'); // M/D/YYYY
  if (parts.length === 3) {
    var m = parts[0], d = parts[1], y = parts[2];
    return y + '-' + ('0' + m).slice(-2) + '-' + ('0' + d).slice(-2);
  }
  return s.slice(0, 10); // already ISO-ish
}

// ── READ ──────────────────────────────────────────────────
// Returns { data: [ {Nume, Date, Kg, ...}, ... ] }. Supports ?callback= for JSONP.
function doGet(e) {
  var sheet = getSheet_();
  var values = sheet.getDataRange().getValues();
  var out = [];
  if (values.length > 1) {
    var headers = values[0];
    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      var obj = {};
      var blank = true;
      for (var c = 0; c < headers.length; c++) {
        var key = headers[c];
        if (key === '') continue;
        var cell = row[c];
        if (key === DATE_HEADER) cell = normDate_(cell);
        if (cell !== '' && cell != null) blank = false;
        obj[key] = cell;
      }
      if (!blank) out.push(obj);
    }
  }
  return respond_({ data: out }, e);
}

// ── WRITE (upsert by Nume + Date) ─────────────────────────
function doPost(e) {
  var payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return respond_({ ok: false, error: 'bad-json' }, e);
  }

  var name = payload[NAME_HEADER];
  var date = normDate_(payload[DATE_HEADER]);
  if (!name || !date) {
    return respond_({ ok: false, error: 'missing-name-or-date' }, e);
  }

  var sheet = getSheet_();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000); // serialize concurrent writes so rows can't clash
  try {
    var range = sheet.getDataRange();
    var values = range.getValues();
    var headers = values[0];
    var colIndex = {};
    for (var c = 0; c < headers.length; c++) colIndex[headers[c]] = c;

    var nameCol = colIndex[NAME_HEADER];
    var dateCol = colIndex[DATE_HEADER];
    if (nameCol == null || dateCol == null) {
      return respond_({ ok: false, error: 'missing-key-columns' }, e);
    }

    // Find existing row with same Nume + normalized Date.
    var foundRow = -1;
    for (var r = 1; r < values.length; r++) {
      if (String(values[r][nameCol]).trim() === String(name).trim() &&
          normDate_(values[r][dateCol]) === date) {
        foundRow = r;
        break;
      }
    }

    if (foundRow === -1) {
      // Append a new row aligned to the header order.
      var newRow = [];
      for (var i = 0; i < headers.length; i++) {
        var h = headers[i];
        if (h === DATE_HEADER) newRow.push(date);
        else if (payload.hasOwnProperty(h)) newRow.push(payload[h]);
        else newRow.push('');
      }
      sheet.appendRow(newRow);
      return respond_({ ok: true, action: 'append' }, e);
    }

    // Update only the columns present in the payload (leave others intact).
    var sheetRow = foundRow + 1; // 1-based, header is row 1
    for (var key in payload) {
      if (!payload.hasOwnProperty(key)) continue;
      if (key === NAME_HEADER || key === DATE_HEADER) continue;
      if (colIndex[key] == null) continue; // unknown column → ignore
      sheet.getRange(sheetRow, colIndex[key] + 1).setValue(payload[key]);
    }
    return respond_({ ok: true, action: 'update' }, e);
  } finally {
    lock.releaseLock();
  }
}

/** JSON or JSONP (when ?callback= is present) response. */
function respond_(obj, e) {
  var json = JSON.stringify(obj);
  var cb = e && e.parameter && e.parameter.callback;
  if (cb) {
    return ContentService
      .createTextOutput(cb + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
