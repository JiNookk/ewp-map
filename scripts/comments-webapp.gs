const SPREADSHEET_ID = "1eAT3-cYS2XXOD3aAHTsWQLescAl8OzhR0u-SCeJ6nOA";
const COMMENTS_SHEET_NAME = "comments";
const COMMENT_HEADERS = [
  "comment_id",
  "created_at",
  "site_id",
  "site_name",
  "author",
  "comment_type",
  "target_label",
  "message",
  "source_url",
  "page_url",
  "comment_status",
];

function doPost(event) {
  const payload = parsePayload_(event);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = getCommentsSheet_(spreadsheet);
    ensureHeader_(sheet);

    sheet.appendRow([
      Utilities.getUuid(),
      sanitize_(payload.createdAt) || new Date().toISOString(),
      sanitize_(payload.siteId),
      sanitize_(payload.siteName),
      sanitize_(payload.author),
      sanitize_(payload.commentType) || "question",
      sanitize_(payload.targetLabel),
      sanitize_(payload.message),
      sanitizeUrl_(payload.sourceUrl),
      sanitizeUrl_(payload.pageUrl),
      "open",
    ]);

    return json_({ ok: true });
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ ok: true, sheet: COMMENTS_SHEET_NAME });
}

function parsePayload_(event) {
  if (!event || !event.postData || !event.postData.contents) {
    throw new Error("empty payload");
  }
  const payload = JSON.parse(event.postData.contents);
  if (!payload.siteId || !payload.author || !payload.message) {
    throw new Error("siteId, author, message are required");
  }
  if (String(payload.message).length > 800) {
    throw new Error("message is too long");
  }
  return payload;
}

function getCommentsSheet_(spreadsheet) {
  return spreadsheet.getSheetByName(COMMENTS_SHEET_NAME) || spreadsheet.insertSheet(COMMENTS_SHEET_NAME);
}

function ensureHeader_(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, COMMENT_HEADERS.length);
  const existing = headerRange.getValues()[0];
  const needsHeader = COMMENT_HEADERS.some((header, index) => existing[index] !== header);
  if (needsHeader) {
    headerRange.setValues([COMMENT_HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function sanitize_(value) {
  return String(value || "").replace(/[\r\n\t]/g, " ").trim();
}

function sanitizeUrl_(value) {
  const sanitized = sanitize_(value);
  if (!sanitized) return "";
  return /^https?:\/\//i.test(sanitized) ? sanitized : "";
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
