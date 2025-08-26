/** =========================================================================
 *  Core utilities (headers, JSON lookups, normalization)
 *  ========================================================================= */

/** Normalize a header for fuzzy matching. */
function _normHeader_(s) {
  return String(s || '')
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[?:.,;—–-]/g, '');
}

function _ciMap_(sheet) {
  const hdr = sheet.getRange(1,1,1,Math.max(1, sheet.getLastColumn())).getValues()[0] || [];
  const m = {};
  hdr.forEach((v,i)=> m[String(v||'').trim().toLowerCase()] = i+1);
  return m;
}
function _resolveCol_(sheet, headerOrIndex) {
  if (typeof headerOrIndex === 'number') return headerOrIndex;
  const m = _ciMap_(sheet);
  return m[String(headerOrIndex||'').toLowerCase()] || null;
}

/** Canonical label normalizer for category names. */
function _canonLabel_(s) {
  return String(s||'')
    .normalize('NFKC')
    .trim()
    .replace(/[‐‑–—]/g, '-')      // dash variants → hyphen
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-&/()]/g, '')
    .toLowerCase();
}

/** Flexible lookups for JSON tabs (headered or headerless A=JSON/B=Key). */
function lookupSingleJSONByKeyFlexible(tabName, keyHeaderCandidates, keyVal, key2HeaderCandidates, key2Val) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(tabName);
  if (!sh) return '';

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return '';

  const want1 = String(keyVal || '').trim();
  const hasSecond = key2HeaderCandidates != null && typeof key2Val !== 'undefined' && key2Val !== null;
  const want2 = hasSecond ? String(key2Val).trim() : '';

  const header = sh.getRange(1,1,1,lastCol).getValues()[0].map(v => String(v||'').trim().toLowerCase());
  const hasHeader = header.some(h => ['json','property id','booking id','reservation id','key','id'].includes(h));

  // Helper: single-key scan (bottom→up)
  function scanSingleKey(cKey, cJSON) {
    if (!cKey || !cJSON) return '';
    if (lastRow < 2) return '';
    const keys = sh.getRange(2, cKey,  lastRow-1, 1).getValues();
    const json = sh.getRange(2, cJSON, lastRow-1, 1).getValues();
    for (let i = keys.length - 1; i >= 0; i--) {
      if (String(keys[i][0] || '').trim() === want1) return String(json[i][0] || '').trim();
    }
    return '';
  }

  // Helper: two-key scan (bottom→up)
  function scanTwoKeys(cKey1, cKey2, cJSON) {
    if (!cKey1 || !cKey2 || !cJSON) return '';
    if (lastRow < 2) return '';
    const k1 = sh.getRange(2, cKey1, lastRow-1, 1).getValues();
    const k2 = sh.getRange(2, cKey2, lastRow-1, 1).getValues();
    const js = sh.getRange(2, cJSON,  lastRow-1, 1).getValues();
    for (let i = k1.length - 1; i >= 0; i--) {
      if (String(k1[i][0] || '').trim() === want1 && String(k2[i][0] || '').trim() === want2) {
        return String(js[i][0] || '').trim();
      }
    }
    return '';
  }

  if (hasHeader) {
    const H = {}; header.forEach((h,i)=> H[h] = i+1);
    const cJSON = H['json'] || 1;

    // resolve key1 column (fallback to col B if not found)
    let cKey1 = null;
    for (const k of (keyHeaderCandidates || [])) {
      const idx = H[String(k||'').trim().toLowerCase()];
      if (idx) { cKey1 = idx; break; }
    }
    if (!cKey1) cKey1 = 2;

    if (hasSecond && want1 && want2) {
      // resolve key2 column
      let cKey2 = null;
      for (const k of (key2HeaderCandidates || [])) {
        const idx = H[String(k||'').trim().toLowerCase()];
        if (idx) { cKey2 = idx; break; }
      }
      // Try two-key match first
      const twoKeyHit = scanTwoKeys(cKey1, cKey2, cJSON);
      if (twoKeyHit) return twoKeyHit;
      // Fallback to single-key (key1 only)
      return scanSingleKey(cKey1, cJSON);
    }

    // Original single-key behaviour
    return scanSingleKey(cKey1, cJSON);
  }

  // Headerless fallbacks
  if (hasSecond && want1 && want2) {
    // Assume A=JSON, B=Key1, C=Key2
    if (lastCol < 3) return '';
    const k1 = sh.getRange(1, 2, lastRow, 1).getValues();
    const k2 = sh.getRange(1, 3, lastRow, 1).getValues();
    const js = sh.getRange(1, 1, lastRow, 1).getValues();
    for (let i = k1.length - 1; i >= 0; i--) {
      if (String(k1[i][0] || '').trim() === want1 && String(k2[i][0] || '').trim() === want2) {
        return String(js[i][0] || '').trim();
      }
    }
    // Fallback to single-key (A=JSON, B=Key1)
    const keys = sh.getRange(1, 2, lastRow, 1).getValues();
    const json = sh.getRange(1, 1, lastRow, 1).getValues();
    for (let i = keys.length - 1; i >= 0; i--) {
      if (String(keys[i][0] || '').trim() === want1) return String(json[i][0] || '').trim();
    }
    return '';
  } else {
    // Original headerless single-key (A=JSON, B=Key)
    const keys = sh.getRange(1, 2, lastRow, 1).getValues();
    const json = sh.getRange(1, 1, lastRow, 1).getValues();
    for (let i = keys.length - 1; i >= 0; i--) {
      if (String(keys[i][0] || '').trim() === want1) return String(json[i][0] || '').trim();
    }
    return '';
  }
}


function lookupJSONArrayByKeyFlexible(tabName, keyHeaderCandidates, keyVal) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(tabName);
  if (!sh || !keyVal) return '[]';

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return '[]';

  const header = sh.getRange(1,1,1,lastCol).getValues()[0].map(v => String(v||'').trim().toLowerCase());
  const hasHeader = header.some(h => ['json','property id','booking id','key','id'].includes(h));

  const out = [];
  if (hasHeader) {
    const headerMap = {};
    header.forEach((h,i)=> headerMap[h] = i+1);
    const jsonCol = headerMap['json'] || 1;
    let keyCol = null;
    for (const k of keyHeaderCandidates) {
      const idx = headerMap[String(k||'').trim().toLowerCase()];
      if (idx) { keyCol = idx; break; }
    }
    if (!keyCol) keyCol = 2;

    const keys = (lastRow>1) ? sh.getRange(2, keyCol, lastRow-1, 1).getValues() : [];
    const json = (lastRow>1) ? sh.getRange(2, jsonCol, lastRow-1, 1).getValues() : [];
    const want = String(keyVal).trim();
    for (let i = 0; i < keys.length; i++) {
      if (String(keys[i][0]||'').trim() === want) {
        const s = String(json[i][0]||'').trim();
        if (s) { try { out.push(JSON.parse(s)); } catch(_) { out.push(s); } }
      }
    }
    return JSON.stringify(out);
  }

  // headerless
  const keys = sh.getRange(1, 2, lastRow, 1).getValues();
  const json = sh.getRange(1, 1, lastRow, 1).getValues();
  const want = String(keyVal).trim();
  for (let i = 0; i < keys.length; i++) {
    if (String(keys[i][0]||'').trim() === want) {
      const s = String(json[i][0]||'').trim();
      if (s) { try { out.push(JSON.parse(s)); } catch(_) { out.push(s); } }
    }
  }
  return JSON.stringify(out);
}

/** Simple header helpers */
function getHeaderMap(sheet) {
  const row = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  const m = {};
  row.forEach((v,i)=> m[String(v).trim()] = i+1);
  return m;
}
function col(rowArr, header, map) { return rowArr[ map[header]-1 ]; }


/** ===========================
 *  AI DEBUG TOOLKIT (menu)
 *  =========================== */
function _ciHeaderMap(sheet){
  const cols = Math.max(1, sheet.getLastColumn());
  const hdr  = sheet.getRange(1,1,1,cols).getValues()[0] || [];
  const m = {};
  hdr.forEach((v,i)=> m[String(v||'').trim().toLowerCase()] = i+1);
  return m;
}
function _findCol(m, aliases){
  for (const a of aliases) {
    const idx = m[String(a).toLowerCase()];
    if (idx) return idx;
  }
  return null;
}

function _lookupSingleJSONByKey_(tabName, keyHeader, jsonHeader, keyVal) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(tabName);
  if (!sh || !keyVal) return '';
  const m = _ciHeaderMap(sh);
  const cKey  = _findCol(m, [keyHeader]);
  const cJSON = _findCol(m, [jsonHeader, 'json']);
  if (!cKey || !cJSON) return '';
  const last = sh.getLastRow();
  if (last < 2) return '';
  const keys = sh.getRange(2, cKey,  last-1, 1).getValues();
  const json = sh.getRange(2, cJSON, last-1, 1).getValues();
  const want = String(keyVal).trim();
  for (let i = keys.length - 1; i >= 0; i--) {
    if (String(keys[i][0]).trim() === want) return String(json[i][0] || '').trim();
  }
  return '';
}

function _lookupJSONArrayByKey_(tabName, keyHeader, jsonHeader, keyVal) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(tabName);
  if (!sh || !keyVal) return '[]';
  const m = _ciHeaderMap(sh);
  const cKey  = _findCol(m, [keyHeader]);
  const cJSON = _findCol(m, [jsonHeader, 'json']);
  if (!cKey || !cJSON) return '[]';
  const last = sh.getLastRow();
  if (last < 2) return '[]';
  const keys = sh.getRange(2, cKey,  last-1, 1).getValues();
  const json = sh.getRange(2, cJSON, last-1, 1).getValues();
  const want = String(keyVal).trim();
  const out  = [];
  for (let i = 0; i < keys.length; i++) {
    if (String(keys[i][0]).trim() === want) {
      const s = String(json[i][0] || '').trim();
      if (s) { try { out.push(JSON.parse(s)); } catch (_){ out.push(s); } }
    }
  }
  try { return JSON.stringify(out); } catch(_){ return '[]'; }
}

/** Per‑property FAQ/TASK lists from tabs 'faqs' and 'tasks', with global fallback. */
function getCategoryListsForProperty(pid) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const faqsSh  = ss.getSheetByName('faqs');
  const tasksSh = ss.getSheetByName('tasks');

  const pidStr = String(pid || '').trim();
  const uniq   = arr => Array.from(new Set(arr.filter(Boolean)));

  function collectSubs(sheet) {
    if (!sheet) return { perProp: [], global: [] };
    const m = _ciHeaderMap(sheet);
    const cProp = _findCol(m, ['property id']);
    const cSub  = _findCol(m, ['sub-category name','sub-category','sub category']);
    if (!cProp || !cSub) return { perProp: [], global: [] };

    const last = sheet.getLastRow();
    if (last < 2) return { perProp: [], global: [] };

    const vals = sheet.getRange(2, 1, last-1, sheet.getLastColumn()).getValues();
    const perProp = [];
    const global  = [];
    vals.forEach(r => {
      const thisPid = String(r[cProp-1] || '').trim();
      const sub     = String(r[cSub -1] || '').trim();
      if (!sub) return;
      global.push(sub);
      if (pidStr && thisPid === pidStr) perProp.push(sub);
    });
    return { perProp: uniq(perProp), global: uniq(global) };
  }

  const F = collectSubs(faqsSh);
  const T = collectSubs(tasksSh);

  const faqsList  = (F.perProp.length ? F.perProp : F.global).join(', ');
  const tasksList = (T.perProp.length ? T.perProp : T.global).join(', ');

  const allowedSet = new Set(
    []
      .concat(faqsList ? faqsList.split(/\s*,\s*/) : [])
      .concat(tasksList ? tasksList.split(/\s*,\s*/) : [])
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
  );

  return { FAQS_LIST: faqsList, TASK_LIST: tasksList, allowedSet, F, T };
}

/**
 * Build maps from category sheets.
 * Prefers new tabs: 'tasks' + 'faqs'; still merges legacy 'categoryInfo' if present.
 *
 * Returns:
 *   {
 *     typeMap:        sub(lower/canonical) → 'faq' | 'task'
 *     ownerMap:       sub(lower/canonical) → { staffId, staffName, staffPhone, req }
 *     ownerMapByProp: `${propId}||${sub(lower/canonical)}` → owner
 *   }
 */
function getCategoryInfoMaps() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const legacy = ss.getSheetByName('categoryInfo');  // optional
  const faqsSh = ss.getSheetByName('faqs');          // preferred
  const tasksSh= ss.getSheetByName('tasks');         // preferred

  const typeMap        = Object.create(null);
  const ownerMap       = Object.create(null);
  const ownerMapByProp = Object.create(null);

  const ci = (s) => _canonLabel_(s);

  const readHdr = (sh) => {
    const row = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0] || [];
    const m = {}; row.forEach((v,i)=> m[String(v||'').trim().toLowerCase()] = i+1);
    return m;
  };

  // NEW FAQs
  if (faqsSh) {
    const H = readHdr(faqsSh);
    const cSUB = H['sub-category name'] || H['sub-category'] || H['sub category'];
    if (cSUB) {
      const n = Math.max(0, faqsSh.getLastRow()-1);
      if (n) {
        const vals = faqsSh.getRange(2,1,n,faqsSh.getLastColumn()).getValues();
        vals.forEach(r => {
          const sub = ci(r[cSUB-1] || '');
          if (sub) typeMap[sub] = 'faq';
        });
      }
    }
  }

  // NEW TASKS (reads Staff/Guest/Host requirements + Staff Details JSON)
  if (tasksSh) {
    const H = readHdr(tasksSh);
    const cPID   = H['property id'];
    const cSUB   = H['sub-category name'] || H['sub-category'] || H['sub category'];
    const cREQ   = H['requirements to complete task'] || H['requirements']; // legacy catch-all
    const cSID   = H['staff id'];
    const cSNM   = H['staff name'];
    const cSPH   = H['staff phone'];
    const cSJSON = H['staff details json'];

    // NEW columns you added
    const cHOST  = H['host escalation'];     // column I on tasks
    const cSREQ  = H['staff requirements'];  // column J on tasks
    const cGREQ  = H['guest requirements'];  // column K on tasks

    if (cSUB) {
      const n = Math.max(0, tasksSh.getLastRow()-1);
      if (n) {
        const vals = tasksSh.getRange(2,1,n,tasksSh.getLastColumn()).getValues();
        vals.forEach(r => {
          const pid = String(r[cPID-1] || '').trim();
          const subKey = ci(r[cSUB-1] || '');
          if (!subKey) return;
          typeMap[subKey] = 'task';

          const owner = {
            staffId        : cSID   ? String(r[cSID-1]   || '').trim() : '',
            staffName      : cSNM   ? String(r[cSNM-1]   || '').trim() : '',
            staffPhone     : cSPH   ? String(r[cSPH-1]   || '').trim() : '',
            req            : cREQ   ? String(r[cREQ-1]   || '').trim() : '',
            detailsJSON    : cSJSON ? String(r[cSJSON-1] || '').trim() : '',
            // NEW fields captured from tasks
            hostEscalation : cHOST  ? String(r[cHOST-1]  || '').trim() : '',
            staffReq       : cSREQ  ? String(r[cSREQ-1]  || '').trim() : '',
            guestReq       : cGREQ  ? String(r[cGREQ-1]  || '').trim() : ''
          };
          if (!ownerMap[subKey]) ownerMap[subKey] = owner;
          if (pid) ownerMapByProp[`${pid}||${subKey}`] = owner;
        });
      }
    }
  }

  // LEGACY merge unchanged
  if (legacy) {
    const H = readHdr(legacy);
    const cPID  = H['property id'];
    const cTYPE = H['type'] || H['primary-category'];
    const cSUB  = H['sub-category'] || H['sub-category name'];
    const cREQ  = H['requirements to complete task'] || H['requirements'];
    const cSID  = H['staff id'];
    const cSNM  = H['staff name'];
    const cSPH  = H['staff phone'];

    if (cSUB && cTYPE) {
      const n = Math.max(0, legacy.getLastRow()-1);
      if (n) {
        const vals = legacy.getRange(2,1,n,legacy.getLastColumn()).getValues();
        vals.forEach(r => {
          const pid = String(r[cPID-1] || '').trim();
          const typ = String(r[cTYPE-1] || '').trim().toLowerCase();
          const subKey = ci(r[cSUB-1] || '');
          if (!subKey || !typ) return;

          if (!typeMap[subKey]) typeMap[subKey] = typ;
          if (typ === 'task') {
            const owner = {
              staffId        : cSID ? String(r[cSID-1] || '').trim() : '',
              staffName      : cSNM ? String(r[cSNM-1] || '').trim() : '',
              staffPhone     : cSPH ? String(r[cSPH-1] || '').trim() : '',
              req            : cREQ ? String(r[cREQ-1] || '').trim() : '',
              detailsJSON    : '',
              hostEscalation : '',
              staffReq       : '',
              guestReq       : ''
            };
            if (!ownerMap[subKey]) ownerMap[subKey] = owner;
            if (pid && !ownerMapByProp[`${pid}||${subKey}`]) {
              ownerMapByProp[`${pid}||${subKey}`] = owner;
            }
          }
        });
      }
    }
  }

  return { typeMap, ownerMap, ownerMapByProp };
}




/** =========================================================================
 *  d:aiLog writer – EXACT HEADERS you provided
 *  ========================================================================= */

function _getAiLogHeaderMap_(sheet) {
  const raw = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const byNorm = {};
  raw.forEach((h, i) => { const n = _normHeader_(h); if (!(n in byNorm)) byNorm[n] = i + 1; });

  const canonical = [
    'Execution Timestamp',
    'UUID',
    'Recipient Type',
    'Property Id',
    'To',
    'Message Chain UUIDs',
    'Message',
    'Language',
    'Ticket Enrichment JSON',
    'Tone',
    'Sentiment',
    'Urgency Indicators',
    'Sub-Category',
    'Complexity Indicators',
    'Escalation & Risk Indicators',
    'Available Knowledge to Respond?',
    'Ai Message Response',
    'Status',
    'Task Created',
    'Task UUID'
  ];

  const H = {};
  canonical.forEach(name => {
    const idx = byNorm[_normHeader_(name)];
    H[name] = idx || null;
  });
  return H;
}

/** Writes exactly one row to d:aiLog (no duplicates). */
function appendOutboundToAiLog(entry) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('d:aiLog');
  if (!sh) throw new Error('Sheet "d:aiLog" not found');

  const H = _getAiLogHeaderMap_(sh);
  const lastCol = sh.getLastColumn();
  const row = Array(lastCol).fill('');

  const now  = new Date();
  const uuid = entry.uuid || Utilities.getUuid();
  const set = (header, val) => { const c = H[header]; if (c) row[c - 1] = (val == null ? '' : val); };

  set('Execution Timestamp', now);
  set('UUID', uuid);
  set('Recipient Type', entry.recipientType || '');
  set('Property Id', entry.propertyId || '');
  set('To', entry.to || '');
  set('Message Chain UUIDs', entry.messageChainUUIDs || '');

  // IMPORTANT: input we responded to
  set('Message', entry.originalMessage != null ? entry.originalMessage : (entry.message || ''));

  set('Language', entry.language || '');
  set('Ticket Enrichment JSON', entry.ticketEnrichmentJSON || '');
  set('Tone', entry.tone || '');
  set('Sentiment', entry.sentiment || '');
  set('Urgency Indicators', entry.urgencyIndicators || '');
  set('Sub-Category', entry.subCategory || '');
  set('Complexity Indicators', entry.complexityIndicators || '');
  set('Escalation & Risk Indicators', entry.escalationAndRiskIndicators || '');
  set('Available Knowledge to Respond?', entry.availableKnowledge || '');

  set('Ai Message Response', entry.aiMessageResponse != null ? entry.aiMessageResponse : '');
  set('Status', entry.status || '');
  set('Task Created', entry.taskCreated || '');
  set('Task UUID', entry.taskUuid || '');

  sh.getRange(sh.getLastRow() + 1, 1, 1, lastCol).setValues([row]);
  return uuid;
}


/** =========================================================================
 *  ENRICHMENT (pull JSONs, classify, write split columns)
 *  ========================================================================= */
function enrichAndExpand(sheetName) {
  const targetSheetName = sheetName || 'aiResponse';
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const sh  = ss.getSheetByName(targetSheetName);
  if (!sh) throw new Error(`Sheet "${targetSheetName}" not found`);

  const api = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!api) throw new Error('OPENAI_API_KEY missing.');

  // inputs
  const hdr = sh.getRange(1,1,1,Math.max(1, sh.getLastColumn())).getValues()[0] || [];
  const map = {}; hdr.forEach((v,i)=> map[String(v||'').trim().toLowerCase()] = i+1);
  const find = (arr)=> { for (const a of arr){ const c=map[String(a).toLowerCase()]; if (c) return c; } return null; };

  const COL_MESSAGE     = find(['message','inbound message']);
  const COL_LANGUAGE    = 10; // Column J (explicit per your layout)
  const COL_PROP_ID     = find(['property id']);
  const COL_BOOKING_ID  = find(['booking id','reservation id']);

  // ★ Historical conversation column (to & from)
  const COL_HIST        = find([
    'historical messages (to & from)',
    'historical messages',
    'conversation history',
    'historical conversation',
    'history'
  ]);

  // outputs (classification fields)
  function ensureColByName(name) {
    const idx = hdr.findIndex(h => String(h||'').trim().toLowerCase() === name.toLowerCase());
    if (idx >= 0) return idx + 1;
    const newCol = sh.getLastColumn() + 1;
    sh.getRange(1, newCol).setValue(name);
    hdr.push(name);
    map[name.toLowerCase()] = newCol;
    return newCol;
  }

  const COL_JSON      = ensureColByName('Ticket Enrichment JSON');
  const COL_TONE      = ensureColByName('Tone');
  const COL_SENT      = ensureColByName('Sentiment');
  const COL_URG       = ensureColByName('Urgency Indicators');
  const COL_SUB       = ensureColByName('Sub-Category');
  const COL_COMP      = ensureColByName('Complexity Indicators');
  const COL_RISK      = ensureColByName('Escalation & Risk Indicators');
  const COL_KNOW      = ensureColByName('Available Knowledge to Respond?');

  // visibility context JSONs (authoritative cells used by prompts) — typically F:H
  const COL_BOOKING_JSON  = ensureColByName('Booking Details JSON');   // typically column F
  const COL_PROPINFO_JSON = ensureColByName('Property Details JSON');  // typically column G
  const COL_FAQS_JSON     = ensureColByName('Property FAQs JSON');     // typically column H

  Logger.log(`[enrichAndExpand] Columns: BOOKING_JSON=${COL_BOOKING_JSON}, PROPERTY_JSON=${COL_PROPINFO_JSON}, FAQS_JSON=${COL_FAQS_JSON}, HIST=${COL_HIST}`);

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return;

  // ✅ Ensure Language header in J and fill formulas before enrichment
  const langHeader = String(sh.getRange(1, COL_LANGUAGE).getValue() || '').trim();
  if (!langHeader) sh.getRange(1, COL_LANGUAGE).setValue('Language');
  // J references E via RC[-5]; apply from row 2 to lastRow
  sh.getRange(2, COL_LANGUAGE, lastRow - 1, 1)
    .setFormulaR1C1('=IF(RC[-5]="","",DETECTLANGUAGE(RC[-5]))');

  // clear enrichment outputs (keep context JSONs & Language)
  sh.getRange(2, COL_JSON, lastRow-1, 1).clearContent();
  sh.getRange(2, COL_TONE, lastRow-1, 1).clearContent();
  sh.getRange(2, COL_SENT, lastRow-1, 1).clearContent();
  sh.getRange(2, COL_URG,  lastRow-1, 1).clearContent();
  sh.getRange(2, COL_SUB,  lastRow-1, 1).clearContent();
  sh.getRange(2, COL_COMP, lastRow-1, 1).clearContent();
  sh.getRange(2, COL_RISK, lastRow-1, 1).clearContent();
  sh.getRange(2, COL_KNOW, lastRow-1, 1).clearContent();

  let enriched = 0;
  const _len = (s) => String(s||'').length;

  for (let r = 2; r <= lastRow; r++) {
    const msgVal = COL_MESSAGE     ? sh.getRange(r, COL_MESSAGE).getValue()     : '';
    const propId = COL_PROP_ID     ? sh.getRange(r, COL_PROP_ID).getValue()     : '';
    const bookId = COL_BOOKING_ID  ? sh.getRange(r, COL_BOOKING_ID).getValue()  : '';

    // ★ historical conversation (to & from)
    const hist   = COL_HIST        ? sh.getRange(r, COL_HIST).getValue()        : '';

    if (!msgVal) continue;

    // (Removed per-row LanguageApp detection to avoid overwriting the formula in J)

    // ===== 1) Lookups → write contexts to cells (F/G/H by header) =====
    // NEW: Booking JSON must match BOTH Property Id + Booking Id; falls back to Property Id only via helper itself.
    const bookingJSONLookup = lookupSingleJSONByKeyFlexible(
      'd:bookingInfo',
      ['property id','propertyid','property'], propId,
      ['booking id','reservation id','bookingid','id'], bookId
    );

    const propInfoJSONLookup = lookupSingleJSONByKeyFlexible(
      'd:propertyInfo',
      ['booking id','reservation id','bookingid'], bookId
    );

    const faqsJSONArrLookup  = lookupJSONArrayByKeyFlexible(
      'faqs',
      ['property id','propertyid','property'], propId
    );

    sh.getRange(r, COL_BOOKING_JSON ).setValue(bookingJSONLookup  || '');
    sh.getRange(r, COL_PROPINFO_JSON).setValue(propInfoJSONLookup || '');
    sh.getRange(r, COL_FAQS_JSON    ).setValue(faqsJSONArrLookup  || '[]');

    // Commit writes so the cells are authoritative
    SpreadsheetApp.flush();

    // ===== 2) Re-read the three JSONs from the cells (authoritative) =====
    const bookingJSONCell  = String(sh.getRange(r, COL_BOOKING_JSON ).getValue() || '');
    const propInfoJSONCell = String(sh.getRange(r, COL_PROPINFO_JSON).getValue() || '');
    const faqsJSONCell     = String(sh.getRange(r, COL_FAQS_JSON    ).getValue() || '[]');

    Logger.log(`[enrichAndExpand] Row ${r}: booking.len=${_len(bookingJSONCell)} prop.len=${_len(propInfoJSONCell)} faqs.len=${_len(faqsJSONCell)} msg.len=${_len(msgVal)}`);

    // Build lists and allowed set (used for Sub-Category normalization)
    const { FAQS_LIST, TASK_LIST, allowedSet } = getCategoryListsForProperty(propId);

    // ===== 3) Build enrichment prompt using ONLY the three JSONs from cells =====
    const prompt = fillTpl_(PROMPT_ENRICHMENT_CLASSIFY_JSON, {
      FAQS_LIST            : (FAQS_LIST || 'Other'),
      TASK_LIST            : (TASK_LIST || 'Other'),
      BOOKING_DETAILS_JSON : bookingJSONCell  || '(none)',
      PROPERTY_DETAILS_JSON: propInfoJSONCell || '(none)',
      PROP_FAQS_JSON       : faqsJSONCell     || '[]',
      HISTORICAL_MESSAGES  : String(hist || '').trim() || '(none)',
      INSERT_GUEST_MESSAGE_HERE: String(msgVal)
    });

    // ===== 4) Call OpenAI and parse JSON =====
    let json;
    try {
      const res = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
        method : 'post',
        contentType:'application/json',
        headers : { Authorization:`Bearer ${api}` },
        payload : JSON.stringify({
          model:'o4-mini-2025-04-16',
          messages:[{role:'user', content: prompt}],
        }),
        muteHttpExceptions:true
      });
      if (res.getResponseCode() !== 200) throw new Error(res.getContentText());

      const content = JSON.parse(res.getContentText()).choices[0].message.content.trim();
      try { json = JSON.parse(content); }
      catch(_) {
        const s = content.indexOf('{'); const e = content.lastIndexOf('}') + 1;
        if (s >= 0 && e > s) json = JSON.parse(content.slice(s, e));
      }
      if (!json || typeof json !== 'object') throw new Error('Model did not return JSON');
    } catch (err) {
      sh.getRange(r, COL_JSON).setValue(`{"error":"${String(err).slice(0,200)}"}`);
      Logger.log(`[enrichAndExpand] Row ${r}: ERROR calling OpenAI — ${String(err).slice(0,200)}`);
      continue;
    }

    // ===== 5) Normalize fields and write back =====
    const pick = (k) => (json[k] == null ? '' : String(json[k]).trim());

    // Sub-Category normalization to allowed set
    const normalizedSub = (() => {
      const original = pick('Sub-Category');
      const items = String(original || '')
        .split(/\s*,\s*/).map(s => s.trim()).filter(Boolean);
      if (!items.length) return 'Other';
      const keep = items.filter(s => s === 'Other' || allowedSet.has(s.toLowerCase()));
      if (!keep.length) return 'Other';
      const seen = new Set(); const out = [];
      keep.forEach(s => { const k=s.toLowerCase(); if(!seen.has(k)){ seen.add(k); out.push(s); }});
      return out.join(', ');
    })();

    // KnowledgeAvailable → Yes/No normalization
    let know = pick('KnowledgeAvailable');
    const kv = know.toLowerCase();
    if (kv === 'yes' || kv === 'y' || kv === 'true') know = 'Yes';
    else if (kv === 'no' || kv === 'n' || kv === 'false') know = 'No';
    else if (know !== 'Yes' && know !== 'No') know = 'No';

    // Write outputs
    sh.getRange(r, COL_JSON).setValue(JSON.stringify(json));
    sh.getRange(r, COL_TONE).setValue(pick('Tone'));
    sh.getRange(r, COL_SENT).setValue(pick('Sentiment'));
    sh.getRange(r, COL_URG ).setValue(pick('Urgency'));
    sh.getRange(r, COL_SUB ).setValue(normalizedSub);
    sh.getRange(r, COL_COMP).setValue(pick('Complexity'));
    sh.getRange(r, COL_RISK).setValue(pick('EscalationRisk'));
    sh.getRange(r, COL_KNOW).setValue(know);

    Logger.log(`[enrichAndExpand] Row ${r}: enriched OK (Tone=${pick('Tone')}, Sent=${pick('Sentiment')}, Urg=${pick('Urgency')}, Sub=${normalizedSub}, Know=${know})`);
    enriched++;
  }

  Logger.log(`${enriched} row(s) enriched on "${targetSheetName}" using Booking/Property/FAQs JSON from cells F:H.`);
}







/** =========================================================================
 *  Reply generation → ALWAYS write to d:aiLog (Recipient Type = Guest)
 *  ========================================================================= */
function createReplyAndLog() {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const src     = ss.getSheetByName('aiResponse');
  const apiKey  = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY missing.');
  if (!src) throw new Error('Sheet "aiResponse" not found');

  const logSh   = ss.getSheetByName('d:aiLog');
  if (!logSh) throw new Error('Sheet "d:aiLog" not found');

  const hMap = getHeaderMap(src);
  const lastRow = src.getLastRow();
  if (lastRow < 2) return;

  // Required inputs
  const rows = src.getRange(2, 1, lastRow - 1, src.getLastColumn()).getValues();
  const _len = (s) => String(s||'').length;

  // One-time debug to confirm columns (should be F:H typically)
  Logger.log(
    `[createReplyAndLog] aiResponse columns: ` +
    `Booking Details JSON=${hMap['Booking Details JSON']}, ` +
    `Property Details JSON=${hMap['Property Details JSON']}, ` +
    `Property FAQs JSON=${hMap['Property FAQs JSON']}, ` +
    `Historical Messages=${hMap['Historical Messages'] || hMap['Historical Messages (to & from)']}`
  );

  const { typeMap } = getCategoryInfoMaps();

  rows.forEach((row, idx) => {
    const rnum      = idx + 2;
    const phone     = col(row, 'Phone',  hMap);
    const chainUUID = col(row, 'UUIDs',  hMap);
    const guestRaw  = col(row, 'Message', hMap);
    const propId    = col(row, 'Property Id', hMap);
    const lang      = col(row, 'Language', hMap) || 'en';

    // enrichment fields
    const tktJSON   = col(row, 'Ticket Enrichment JSON', hMap) || '';
    const tone      = col(row, 'Tone', hMap) || '';
    const sent      = col(row, 'Sentiment', hMap) || '';
    const urgency   = col(row, 'Urgency Indicators', hMap) || '';
    const subCats   = col(row, 'Sub-Category', hMap) || '';
    const complexity= col(row, 'Complexity Indicators', hMap) || '';
    const risk      = col(row, 'Escalation & Risk Indicators', hMap) || '';
    const know      = col(row, 'Available Knowledge to Respond?', hMap) || 'No';

    // ✅ JSON contexts from aiResponse F:H
    const bookingJSON  = col(row, 'Booking Details JSON',  hMap) || '';
    const propertyJSON = col(row, 'Property Details JSON', hMap) || '';
    const faqsJSON     = col(row, 'Property FAQs JSON',    hMap) || '[]';

    // Historical conversation (for context)
    const histRaw = (col(row, 'Historical Messages (to & from)', hMap)
                     || col(row, 'Historical Messages', hMap)
                     || col(row, 'Conversation History', hMap)
                     || '');

    if (!guestRaw) return;

    // Build enriched input text (concatenation)
    let guestArr;
    try {
      const parsed = JSON.parse(guestRaw);
      guestArr = Array.isArray(parsed) ? parsed.map(String) : [String(guestRaw)];
    } catch (_) {
      guestArr = [String(guestRaw)];
    }
    const enrichedInput = guestArr.join('\n');

    // Determine if any chosen label is a TASK (canonicalized)
    const hasTask = String(subCats)
      .split(/\s*,\s*/).map(s => _canonLabel_(s))
      .some(s => typeMap[s] === 'task');

    const escalate = (know === 'No') && (String(risk||'None') !== 'None') && !/^(Frustrated|Angry)$/i.test(tone);
    const shouldHoldingReply = hasTask && (know === 'No');

    // ----- Build prompt and call model -----
    let reply = '';
    let status = 'Error';
    let branch = '';

    try {
      if (shouldHoldingReply) {
        branch = 'HOLDING';
        // ✅ Pass F:H JSONs into the template
        const prompt = fillTpl_(PROMPT_GUEST_HOLDING_REPLY, {
          LANG: lang,
          BOOKING_DETAILS_JSON : bookingJSON  || '(none)',
          PROPERTY_DETAILS_JSON: propertyJSON || '(none)',
          PROP_FAQS_JSON       : faqsJSON     || '[]',
          HIST                 : histRaw || '(none)',
          GUEST_MESSAGES       : enrichedInput
        });
        reply  = callGPTTurbo([{ role:'user', content: prompt }], apiKey).trim();
        status = reply ? 'Success' : 'Error';

      } else if (!escalate) {
        branch = 'NORMAL';
        // ✅ Pass F:H JSONs into the SYSTEM message
        const systemMsg = fillTpl_(PROMPT_GUEST_NORMAL_REPLY_SYSTEM, {
          LANG: lang,
          BOOKING_DETAILS_JSON : bookingJSON  || '(none)',
          PROPERTY_DETAILS_JSON: propertyJSON || '(none)',
          PROP_FAQS_JSON       : faqsJSON     || '[]',
          HIST                 : histRaw || '(none)',
          GUEST_MESSAGES       : enrichedInput
        });
        const chat = [{ role: 'system', content: systemMsg }, { role: 'user', content: enrichedInput }];
        reply  = callGPTTurbo(chat, apiKey).trim();
        status = reply ? 'Success' : 'Error';

      } else {
        branch = 'ESCALATE';
        status = 'Escalation';
      }
    } catch (e) {
      status = 'Error';
      Logger.log(`[createReplyAndLog] Row ${rnum}: error generating reply — ${String(e).slice(0,180)}`);
    }

    Logger.log(
      `[createReplyAndLog] Row ${rnum} ` +
      `(branch=${branch}, hasTask=${hasTask}, know=${know}, escalate=${escalate}) ` +
      `JSON lens: booking=${_len(bookingJSON)}, property=${_len(propertyJSON)}, faqs=${_len(faqsJSON)} ` +
      `→ status=${status}${reply ? (', reply.len=' + _len(reply)) : ''}`
    );

    // ALWAYS write a row to d:aiLog (Recipient Type = Guest)
    appendOutboundToAiLog({
      recipientType: 'Guest',
      propertyId: propId || '',
      to: phone || '',
      originalMessage: enrichedInput,          // Message column (input)
      language: lang,
      ticketEnrichmentJSON: tktJSON,
      tone: tone,
      sentiment: sent,
      urgencyIndicators: urgency,
      subCategory: subCats,
      complexityIndicators: complexity,
      escalationAndRiskIndicators: risk,
      availableKnowledge: know,
      aiMessageResponse: reply,                // may be blank
      status: status,
      messageChainUUIDs: chainUUID || ''
      // Task Created / Task UUID left blank here
    });
  });
}



/** =========================================================================
 *  Task creation from d:aiLog  → aiTasks  (+ patch back UUIDs)
 *  ========================================================================= */
/**
 * For each row in **d:aiLog** that:
 *   - Recipient Type = "Guest"
 *   - "Task Created" is blank AND "Task UUID" is blank
 *   - "Sub-Category" contains at least one label whose Type='task'
 * …create one or more rows in **aiTasks** (bundled by owner/staff),
 * and write back Task UUID(s) + mark Task Created.
 */
function createStaffTasks() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const logSh = ss.getSheetByName('d:aiLog');
  const taskSh= ss.getSheetByName('aiTasks');
  if (!logSh || !taskSh) throw new Error('Required sheet(s) missing: d:aiLog or aiTasks.');

  const H = _getAiLogHeaderMap_(logSh);

  const COL_RECIP   = H['Recipient Type'];
  const COL_PROPID  = H['Property Id'];
  const COL_TO      = H['To'];
  const COL_MSG     = H['Message'];
  const COL_SUB     = H['Sub-Category'];
  const COL_TASKED  = H['Task Created'];
  const COL_TASKUID = H['Task UUID'];

  if (!COL_RECIP || !COL_PROPID || !COL_TO || !COL_MSG || !COL_SUB || !COL_TASKED || !COL_TASKUID) {
    throw new Error('d:aiLog is missing one or more required columns (Recipient Type, Property Id, To, Message, Sub-Category, Task Created, Task UUID).');
  }

  const last = logSh.getLastRow();
  if (last < 2) return;

  const n = last - 1;
  const recipV = logSh.getRange(2, COL_RECIP,   n, 1).getValues();
  const pidV   = logSh.getRange(2, COL_PROPID,  n, 1).getValues();
  const toV    = logSh.getRange(2, COL_TO,      n, 1).getValues();
  const msgV   = logSh.getRange(2, COL_MSG,     n, 1).getValues();
  const subV   = logSh.getRange(2, COL_SUB,     n, 1).getValues();
  const flagV  = logSh.getRange(2, COL_TASKED,  n, 1).getValues();
  const uuidV  = logSh.getRange(2, COL_TASKUID, n, 1).getValues();

  const { typeMap, ownerMap, ownerMapByProp } = getCategoryInfoMaps();

  // aiTasks header map
  const tHdr = getHeaderMap(taskSh);
  const T_CREATED     = tHdr['Created Date'] || 1;
  const T_UUID        = tHdr['Task UUID']    || 2;
  const T_PHONE       = tHdr['Phone']        || 3;
  const T_PROPID      = tHdr['Property Id']  || 4;
  const T_GUEST       = tHdr['Guest Message']|| 5;
  const T_SUB         = tHdr['Sub-Category'] || 6;
  const T_STAFFID     = tHdr['Staff Id']     || 7;
  const T_STAFFJSON   = tHdr['Staff Details JSON'] || 8;
  const T_STAFFPH     = tHdr['Staff Phone']  || 9;

  // NEW target columns in aiTasks J:L
  const T_REQ_STAFF   = tHdr['Staff Requirements'] || 10; // J
  const T_REQ_GUEST   = tHdr['Guest Requirements'] || 11; // K
  const T_ESC_HOST    = tHdr['Host Escalation']    || 12; // L

  // Back-compat (optional legacy catch-all requirements column if present)
  const T_REQS_CATCHALL = tHdr['Requirements to Complete Task'] || tHdr['Requirements'];

  // ===== Build OPEN-task indexes
  const existingRows = Math.max(0, taskSh.getLastRow() - 1);
  const openIndex = new Map();   // key -> Set(canonSub)
  const openUuidMap = new Map(); // key -> Map(canonSub -> Set(uuid))

  if (existingRows > 0) {
    const phoneVals = taskSh.getRange(2, T_PHONE,   existingRows, 1).getValues();
    const propVals  = taskSh.getRange(2, T_PROPID,  existingRows, 1).getValues();
    const subVals   = taskSh.getRange(2, T_SUB,     existingRows, 1).getValues();
    const uuidVals  = taskSh.getRange(2, T_UUID,    existingRows, 1).getValues();
    const statCol   = tHdr['Status'];
    const statVals  = statCol ? taskSh.getRange(2, statCol, existingRows, 1).getValues()
                              : Array(existingRows).fill(['']);
    for (let i = 0; i < existingRows; i++) {
      const phone = String(phoneVals[i][0] || '').trim();
      const prop  = String(propVals [i][0] || '').trim();
      const subs  = String(subVals  [i][0] || '').trim();
      const uuid  = String(uuidVals [i][0] || '').trim();
      const st    = statVals[i][0];
      const isClosed = (typeof st === 'boolean') ? st === true
                      : String(st || '').trim().toUpperCase() === 'TRUE';
      if (!phone || !prop || !subs || !uuid) continue;
      if (isClosed) continue;

      const key = `${phone}||${prop}`;
      if (!openIndex.has(key)) openIndex.set(key, new Set());
      if (!openUuidMap.has(key)) openUuidMap.set(key, new Map());
      const set = openIndex.get(key);
      const map = openUuidMap.get(key);

      subs.split(/\s*,\s*/).map(s => s.trim()).filter(Boolean).forEach(s => {
        const k = _canonLabel_(s);
        set.add(k);
        if (!map.has(k)) map.set(k, new Set());
        map.get(k).add(uuid);
      });
    }
  }

  const isOpenAlready = (phone, prop, canonSub) => {
    const key = `${phone}||${prop}`; const set = openIndex.get(key); return !!(set && set.has(canonSub));
  };
  const getOpenUuidsFor = (phone, prop, canonSub) => {
    const key = `${phone}||${prop}`; const map = openUuidMap.get(key); if (!map) return []; const s = map.get(canonSub); return s ? Array.from(s) : [];
  };
  const markOpenNow = (phone, prop, canonSub, newUuid) => {
    const key = `${phone}||${prop}`;
    if (!openIndex.has(key)) openIndex.set(key, new Set());
    openIndex.get(key).add(canonSub);
    if (!openUuidMap.has(key)) openUuidMap.set(key, new Map());
    const m = openUuidMap.get(key);
    if (!m.has(canonSub)) m.set(canonSub, new Set());
    if (newUuid) m.get(canonSub).add(newUuid);
  };

  function buildBlankRowQueue_(uuidColIndex) {
    const existingLast = taskSh.getLastRow();
    const dataRows = Math.max(0, existingLast - 1);
    const queue = [];
    if (dataRows > 0) {
      const uuids = taskSh.getRange(2, uuidColIndex, dataRows, 1).getValues();
      for (let i = 0; i < uuids.length; i++) {
        const v = String(uuids[i][0] || '').trim();
        if (v === '') queue.push(i + 2);
      }
    }
    return { queue, appendStart: (taskSh.getLastRow() + 1), appended: 0 };
  }

  const { queue: blankRowsQueue, appendStart, appended: appendedInit } = buildBlankRowQueue_(T_UUID);
  let appended = appendedInit;

  const uuidsByLogRow = {};
  const rowsUsed = [];
  const isSet = (v) => {
    if (v === null || v === undefined) return false;
    if (typeof v === 'boolean') return v;
    const s = String(v).trim(); return s.length > 0;
  };

  for (let i = 0; i < n; i++) {
    const recip = String(recipV[i][0] || '').trim();
    if (recip.toLowerCase() !== 'guest') continue;

    if (isSet(flagV[i][0]) || isSet(uuidV[i][0])) continue;

    const propId = String(pidV[i][0] || '').trim();
    const phone  = String(toV [i][0] || '').trim();
    const msg    = String(msgV[i][0] || '').trim();
    const subRaw = String(subV[i][0] || '').trim();
    if (!msg || !subRaw) continue;

    const rawSubs = subRaw.split(/\s*,\s*/).map(s => s.trim()).filter(Boolean);
    const taskSubsCanon = rawSubs.map(s => _canonLabel_(s)).filter(k => !!k && typeMap[k] === 'task');
    if (!taskSubsCanon.length) continue;

    // Partition into already-open vs to-create
    const alreadyOpenCanon = taskSubsCanon.filter(k => isOpenAlready(phone, propId, k));
    const toCreateCanon    = taskSubsCanon.filter(k => !isOpenAlready(phone, propId, k));

    const existingOpenUUIDs = Array.from(new Set(
      alreadyOpenCanon.flatMap(k => getOpenUuidsFor(phone, propId, k))
    ));

    if (toCreateCanon.length === 0 && existingOpenUUIDs.length) {
      if (!uuidsByLogRow[i]) uuidsByLogRow[i] = [];
      uuidsByLogRow[i].push(...existingOpenUUIDs);
      continue;
    }
    if (!toCreateCanon.length) continue;

    // Bundle by owner for NEW rows
    const bundle = {}; // staffKey → { cats:Set, reqs:Set, staffReqs:Set, guestReqs:Set, hostEsc:Set, meta }
    toCreateCanon.forEach(k => {
      const propKey = `${propId}||${k}`;
      const owner = ownerMapByProp[propKey] || ownerMap[k] || {
        staffId:'', staffName:'', staffPhone:'', req:'', detailsJSON:'',
        hostEscalation:'', staffReq:'', guestReq:''
      };
      const staffKey = `${owner.staffId}|${owner.staffPhone}|${owner.staffName}`;
      if (!bundle[staffKey]) bundle[staffKey] = {
        cats: new Set(),
        reqs: new Set(),
        staffReqs: new Set(),
        guestReqs: new Set(),
        hostEsc: new Set(),
        meta: owner
      };
      const originalName = rawSubs.find(s => _canonLabel_(s) === k) || k;
      bundle[staffKey].cats.add(originalName);

      if (owner.req)            bundle[staffKey].reqs.add(owner.req);
      if (owner.staffReq)       bundle[staffKey].staffReqs.add(owner.staffReq);
      if (owner.guestReq)       bundle[staffKey].guestReqs.add(owner.guestReq);
      if (owner.hostEscalation) bundle[staffKey].hostEsc.add(owner.hostEscalation);
    });

    const owners = Object.values(bundle);
    if (!owners.length && existingOpenUUIDs.length) {
      if (!uuidsByLogRow[i]) uuidsByLogRow[i] = [];
      uuidsByLogRow[i].push(...existingOpenUUIDs);
      continue;
    }
    if (!owners.length) continue;

    owners.forEach(b => {
      const tid = Utilities.getUuid();
      if (!uuidsByLogRow[i]) uuidsByLogRow[i] = [];
      uuidsByLogRow[i].push(tid);

      const writeRow = blankRowsQueue.length ? blankRowsQueue.shift()
                                             : (appendStart + (appended++));

      if (T_CREATED)     taskSh.getRange(writeRow, T_CREATED).setValue(new Date());
      if (T_UUID)        taskSh.getRange(writeRow, T_UUID).setValue(tid);
      if (T_PHONE)       taskSh.getRange(writeRow, T_PHONE).setValue(phone);
      if (T_PROPID)      taskSh.getRange(writeRow, T_PROPID).setValue(propId);
      if (T_GUEST)       taskSh.getRange(writeRow, T_GUEST).setValue(msg);
      if (T_SUB)         taskSh.getRange(writeRow, T_SUB).setValue(Array.from(b.cats).join(', '));
      if (T_STAFFID)     taskSh.getRange(writeRow, T_STAFFID).setValue(b.meta.staffId);
      if (T_STAFFJSON)   taskSh.getRange(writeRow, T_STAFFJSON).setValue(b.meta.detailsJSON || '');
      if (T_STAFFPH)     taskSh.getRange(writeRow, T_STAFFPH).setValue(b.meta.staffPhone);

      // NEW writes: J:L
      if (T_REQ_STAFF)       taskSh.getRange(writeRow, T_REQ_STAFF).setValue(Array.from(b.staffReqs).join('; '));
      if (T_REQ_GUEST)       taskSh.getRange(writeRow, T_REQ_GUEST).setValue(Array.from(b.guestReqs).join('; '));
      if (T_ESC_HOST)        taskSh.getRange(writeRow, T_ESC_HOST ).setValue(Array.from(b.hostEsc).join('; '));

      // Optional legacy catch-all if you still keep it
      if (T_REQS_CATCHALL)   taskSh.getRange(writeRow, T_REQS_CATCHALL).setValue(Array.from(b.reqs).join('; '));

      // Mark open to dedupe within this run
      Array.from(b.cats).forEach(name => {
        const k = _canonLabel_((name || ''));
        if (k) markOpenNow(phone, propId, k, tid);
      });

      rowsUsed.push(writeRow);
    });

    if (existingOpenUUIDs.length) {
      uuidsByLogRow[i].push(...existingOpenUUIDs);
    }
  }

  // Patch back into d:aiLog
  const updatesUUID = uuidV.map(x => [x[0]]);
  const updatesFlag = flagV.map(x => [x[0]]);

  Object.keys(uuidsByLogRow).forEach(k => {
    const i = parseInt(k, 10);
    const unique = Array.from(new Set(uuidsByLogRow[i] || []));
    const joined = unique.join(', ');
    updatesUUID[i][0] = joined;
    if (uuidV[i][0] !== joined && joined && !String(updatesFlag[i][0] || '').trim()) {
      // leave Task Created as-is unless you want to mark it explicitly
    }
  });

  if (Object.keys(uuidsByLogRow).length) {
    logSh.getRange(2, COL_TASKUID, updatesUUID.length, 1).setValues(updatesUUID);
    logSh.getRange(2, COL_TASKED,  updatesFlag.length, 1).setValues(updatesFlag);
  }

  Logger.log(`createStaffTasks(): wrote ${rowsUsed.length} task row(s) to aiTasks at rows [${rowsUsed.join(', ')}].`);
}


/**
 * Task triage using a single prompt defined in prompts.gs.
 *
 * Requires PROMPT_TASK_TRIAGE in prompts.gs. It must return strict JSON:
 * {
 *   "host_escalation_needed": true|false,
 *   "host_reason": "<short reason>",
 *   "guest_info_needed": true|false,
 *   "guest_missing": "<what to ask guest>",
 *   "staff_info_needed": true|false,
 *   "staff_missing": "<what to ask staff>",
 *   "action_holder": "Host|Guest|Staff|None"
 * }
 *
 * Template placeholders filled:
 *  - HOST_ESCALATION_CRITERIA
 *  - TASK_SCOPE
 *  - STAFF_REQUIREMENTS
 *  - GUEST_REQUIREMENTS
 *  - GUEST_MESSAGE
 *  - STAFF_CONVERSATION
 */
function assessTaskInfoAndEscalation(apiKey, args) {
  const {
    hostEscCriteria = '',
    taskScope = '',
    guestMessage = '',
    staffConversation = '',
    staffRequirements = '',
    guestRequirements = ''
  } = args || {};

  const prompt = fillTpl_(PROMPT_TASK_TRIAGE, {
    HOST_ESCALATION_CRITERIA: String(hostEscCriteria || '(none)'),
    TASK_SCOPE:               String(taskScope || '(none)'),
    STAFF_REQUIREMENTS:       String(staffRequirements || '(none)'),
    GUEST_REQUIREMENTS:       String(guestRequirements || '(none)'),
    GUEST_MESSAGE:            String(guestMessage || '(none)'),
    STAFF_CONVERSATION:       String(staffConversation || '(none)')
  });

  try {
    const out = callOpenAIChat(prompt, apiKey); // expects parsed JSON
    const b = (v) => (typeof v === 'boolean') ? v : /^(true|yes|y|1)$/i.test(String(v||''));
    return {
      hostNeeded   : b(out?.host_escalation_needed),
      hostReason   : String(out?.host_reason || '').slice(0, 300),
      guestNeeded  : b(out?.guest_info_needed),
      guestMissing : String(out?.guest_missing || '').slice(0, 500),
      staffNeeded  : b(out?.staff_info_needed),
      staffMissing : String(out?.staff_missing || '').slice(0, 500),
      actionHolder : String(out?.action_holder || '').trim()
    };
  } catch (e) {
    Logger.log('assessTaskInfoAndEscalation error: ' + e);
    return { hostNeeded:false, hostReason:'', guestNeeded:false, guestMissing:'', staffNeeded:false, staffMissing:'', actionHolder:'' };
  }
}





/** =========================================================================
 *  Staff messaging (keeps reply in aiTasks, logs to d:aiLog as Staff)
 *  ========================================================================= */
/**
 * Build next staff message with pre-triage:
 * - Fill "Host Escalation Needed", "Guest Info Needed", "Staff Info Needed"
 * - Set "Action Holder" to Host|Guest|Staff|None
 * - If Host or Guest holds action, do not generate staff message
 * - Otherwise proceed to KICKOFF/FOLLOWUP staff message
 */
function buildNextTaskMessage() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('aiTasks');
  if (!sh) throw new Error('Sheet “aiTasks” not found');

  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY missing.');

  // ----- header helpers -----
  const hdr = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  const HLOW = {}; hdr.forEach((v,i)=> HLOW[String(v||'').trim().toLowerCase()] = i+1);
  const findCI = (aliases) => { for (const a of aliases){ const idx = HLOW[String(a).toLowerCase()]; if (idx) return idx; } return null; };
  const ensureCol = (name) => {
    const idx = hdr.findIndex(h => String(h||'').trim().toLowerCase() === name.toLowerCase());
    if (idx >= 0) return idx + 1;
    const c = sh.getLastColumn() + 1;
    sh.getRange(1, c).setValue(name);
    hdr.push(name);
    HLOW[String(name).toLowerCase()] = c;
    return c;
  };
  const isTrue = (v) => (typeof v === 'boolean') ? v : String(v || '').trim().toUpperCase() === 'TRUE';
  const truthy = (v) => (typeof v === 'boolean') ? v
                      : (typeof v === 'number') ? v === 1
                      : /^(true|yes|y|1)$/i.test(String(v||'').trim());
  const clip = (s, max=6000) => { s = String(s || ''); return (s.length <= max) ? s : ('…' + s.slice(-max)); };

  // ----- column map (aiTasks) -----
  const C = {
    uuid        : findCI(['Task UUID']) || 2,
    guestPhone  : findCI(['Phone']) || 3,                         // col C
    propId      : findCI(['Property Id','Property ID']) || 4,
    guestMsg    : findCI(['Guest Message']) || 5,
    sub         : findCI(['Sub-Category','Sub Category']) || 6,
    staffId     : findCI(['Staff Id']) || 7,
    staffJSON   : findCI(['Staff Details JSON']) || 8,
    staffPhone  : findCI(['Staff Phone','Staff Whatsapp','Staff WhatsApp']) || 9, // col I
    hostEsc     : findCI(['Host Escalation']) || 0,               // new input
    staffReq    : findCI(['Staff Requirements']) || 0,            // new input
    guestReq    : findCI(['Guest Requirements']) || 0,            // new input
    kickUUIDs   : findCI(['UUIDs']) || 11,
    conv        : findCI(['On-going Conversation','Ongoing Conversation']) || 12,
    out         : findCI(['Ai Message Response','AI Message Response','Message Out']) || 13,
    respFlag    : findCI(['Response Recieved?','Response Received?']) || 15,
    status      : findCI(['Status']) || 0,

    // triage outputs (ensure)
    actionHolder: ensureCol('Action Holder'),
    needGuest   : ensureCol('Guest Info Needed'),
    needStaff   : ensureCol('Staff Info Needed'),
    needHost    : ensureCol('Host Escalation Needed'),

    // bookkeeping
    guestNotCol : ensureCol('Guest Notified')
  };

  const n = sh.getLastRow() - 1;
  if (n < 1) return;

  // read ranges
  const uuidV   = sh.getRange(2, C.uuid,       n, 1).getValues();
  const propV   = sh.getRange(2, C.propId,     n, 1).getValues();
  const gMsgV   = sh.getRange(2, C.guestMsg,   n, 1).getValues();
  const gPhV    = sh.getRange(2, C.guestPhone, n, 1).getValues();
  const subV    = sh.getRange(2, C.sub,        n, 1).getValues();
  const sPhV    = sh.getRange(2, C.staffPhone, n, 1).getValues();
  const sJsonV  = sh.getRange(2, C.staffJSON,  n, 1).getValues();
  const hostEscV= C.hostEsc ? sh.getRange(2, C.hostEsc,  n, 1).getValues() : Array(n).fill(['']);
  const sReqV   = C.staffReq ? sh.getRange(2, C.staffReq, n, 1).getValues() : Array(n).fill(['']);
  const gReqV   = C.guestReq ? sh.getRange(2, C.guestReq, n, 1).getValues() : Array(n).fill(['']);
  const convV   = sh.getRange(2, C.conv,       n, 1).getValues();
  const outV    = sh.getRange(2, C.out,        n, 1).getValues();
  const flagV   = sh.getRange(2, C.respFlag,   n, 1).getValues();
  const uuidsV  = sh.getRange(2, C.kickUUIDs,  n, 1).getValues();
  const statV   = C.status ? sh.getRange(2, C.status, n, 1).getValues() : Array(n).fill(['']);
  const gNotV   = sh.getRange(2, C.guestNotCol, n, 1).getValues();

  // triage outputs (to write back)
  const actionV = sh.getRange(2, C.actionHolder, n, 1).getValues();
  const needGV  = sh.getRange(2, C.needGuest,    n, 1).getValues();
  const needSV  = sh.getRange(2, C.needStaff,    n, 1).getValues();
  const needHV  = sh.getRange(2, C.needHost,     n, 1).getValues();

  // fallbacks for prompts (keep tiny)
  const GUEST_REQ_PROMPT =
    (typeof PROMPT_GUEST_INFO_REQUEST !== 'undefined')
      ? PROMPT_GUEST_INFO_REQUEST
      : `You write a short, polite WhatsApp to a guest in {{LANG}}. 
Task: {{TASK_SCOPE}}
Ask for only the missing info, using this checklist:
{{GUEST_REQUIREMENTS}}
Conversation (may help you infer what is already given):
{{THREAD}}
Guest's latest message:
{{GUEST_MESSAGE}}
Keep it concise, friendly, and actionable.`;

  const STAFF_REQ_PROMPT =
    (typeof PROMPT_STAFF_INFO_REQUEST !== 'undefined')
      ? PROMPT_STAFF_INFO_REQUEST
      : `You write a concise WhatsApp to a colleague (staff) in {{STAFF_LANG}} about task: {{TASK_SCOPE}}.
Ask for confirmations/details that are still missing from this checklist:
{{STAFF_REQUIREMENTS}}
Latest staff inbound (if any):
{{LATEST_STAFF_INBOUND}}
Conversation so far:
{{STAFF_CONVERSATION}}
Be clear, courteous, with bullet points if helpful; request concrete times when relevant.`;

  let anyWrites = false;
  let anyGuestNot = false;

  for (let i = 0; i < n; i++) {
    const taskUuid   = String(uuidV[i][0] || '').trim();
    if (!taskUuid) continue;

    const statusTrue = isTrue(statV[i][0]);
    if (statusTrue) continue; // archived/complete handled elsewhere

    const propId     = String(propV[i][0] || '').trim();
    const guestMsg   = String(gMsgV[i][0] || '').trim();
    const guestPhone = String(gPhV [i][0] || '').trim();
    const staffPhone = String(sPhV [i][0] || '').trim();
    const staffJson  = String(sJsonV[i][0] || '').trim();
    const taskScope  = String(subV [i][0] || '').trim() || 'Task';
    const hostEscTxt = String(hostEscV[i][0] || '').trim();
    const staffReq   = String(sReqV [i][0] || '').trim();
    const guestReq   = String(gReqV [i][0] || '').trim();
    const convRaw    = String(convV [i][0] || '').trim() || '[]';
    const convForPrompt = clip(convRaw);
    const haveOut    = String(outV [i][0] || '').trim().length > 0;
    const flagTrue   = truthy(flagV[i][0]);
    const chainUUIDs = String(uuidsV[i][0] || '').trim();

    // --- TRIAGE (always run; writes columns) ---
    let tri = { hostNeeded:false, guestInfoNeeded:false, staffInfoNeeded:false, actionHolder:'' };
    try {
      const triPrompt = fillTpl_(PROMPT_TASK_TRIAGE, {
        TASK_SCOPE              : taskScope,
        HOST_ESCALATION_CRITERIA: hostEscTxt || '',
        GUEST_REQUIREMENTS      : guestReq   || '',
        STAFF_REQUIREMENTS      : staffReq   || '',
        STAFF_CONVERSATION      : convForPrompt,
        GUEST_MESSAGE           : guestMsg
      });
      tri = callOpenAIChat(triPrompt, apiKey);
    } catch (_e) { /* keep defaults */ }

    const action = String(tri.actionHolder || '').trim() ||
                   (tri.hostNeeded ? 'Host'
                    : tri.guestInfoNeeded ? 'Guest'
                    : tri.staffInfoNeeded ? 'Staff' : 'None');

    // write triage outputs to sheet arrays
    actionV[i][0] = action;
    needGV [i][0] = tri.guestInfoNeeded === true;
    needSV [i][0] = tri.staffInfoNeeded === true;
    needHV [i][0] = tri.hostNeeded      === true;
    anyWrites = true;

    // --- Decide and compose message ---
    // Host escalation: mark only (no outbound here)
    if (/^host$/i.test(action)) {
      continue;
    }

    // Guest info needed → write guest message
    if (/^guest$/i.test(action)) {
      let lang = 'en';
      try { lang = LanguageApp.detectLanguage(guestMsg) || 'en'; } catch(_){}

      const prompt = fillTpl_(GUEST_REQ_PROMPT, {
        LANG: lang,
        TASK_SCOPE: taskScope,
        GUEST_REQUIREMENTS: guestReq || '(no explicit guest requirements listed)',
        THREAD: convForPrompt,
        GUEST_MESSAGE: guestMsg
      });

      let txt = '';
      try { txt = callGPTTurbo([{role:'user',content:prompt}], apiKey).trim(); } catch(_){}
      if (txt) {
        outV[i][0] = txt; // keep the generated text visible on aiTasks
        appendOutboundToAiLog({
          recipientType: 'Guest',
          propertyId: propId || '',
          to: guestPhone,                                // <-- guest phone (col C)
          originalMessage: guestMsg,
          language: lang,
          ticketEnrichmentJSON: '',
          tone: '', sentiment: '', urgencyIndicators: '',
          subCategory: taskScope, complexityIndicators: '',
          escalationAndRiskIndicators: '',
          availableKnowledge: '',
          aiMessageResponse: txt,
          status: 'Success',
          taskCreated: '',
          taskUuid: taskUuid,
          messageChainUUIDs: chainUUIDs || ''
        });
      }
      continue;
    }

    // Staff info needed → write staff message
    if (/^staff$/i.test(action)) {
      // Pull latest Staff inbound to focus the ask
      const { latestStaffInbound } = extractLatestInboundAndOutstanding(convRaw, staffReq);
      // Try to derive staff language from Staff JSON
      let staffLang = 'en';
      try {
        const obj = JSON.parse(staffJson || '{}');
        const guess = (obj && (obj.preferred_language || obj.language || obj.lang)) || '';
        if (guess) staffLang = String(guess);
      } catch(_){}
      const normalizedLang = (function normalizeLangTag(x){
        let s = String(x || '').trim();
        if (!s) return 'en';
        const lower = s.toLowerCase().replace(/_/g,'-');
        if (/^[a-z]{2,3}$/i.test(lower)) return lower;
        if (/^[a-z]{2,3}-[a-z]{2}$/i.test(lower)) {
          const [a,b] = lower.split('-'); return a + '-' + b.toUpperCase();
        }
        return 'en';
      })(staffLang);

      const prompt = fillTpl_(STAFF_REQ_PROMPT, {
        STAFF_LANG: normalizedLang,
        TASK_SCOPE: taskScope,
        STAFF_REQUIREMENTS: staffReq || '(no explicit staff requirements listed)',
        LATEST_STAFF_INBOUND: latestStaffInbound || '(not found)',
        STAFF_CONVERSATION: convForPrompt
      });

      let txt = '';
      try { txt = callGPTTurbo([{role:'user',content:prompt}], apiKey).trim(); } catch(_){}
      if (txt) {
        outV[i][0] = txt;
        appendOutboundToAiLog({
          recipientType: 'Staff',
          propertyId: propId || '',
          to: staffPhone,                                // <-- staff phone (col I)
          originalMessage: latestStaffInbound || guestMsg,
          language: normalizedLang,
          ticketEnrichmentJSON: '',
          tone: '', sentiment: '', urgencyIndicators: '',
          subCategory: taskScope, complexityIndicators: '',
          escalationAndRiskIndicators: '',
          availableKnowledge: '',
          aiMessageResponse: txt,
          status: 'Success',
          taskCreated: '',
          taskUuid: taskUuid,
          messageChainUUIDs: chainUUIDs || ''
        });
      }
      continue;
    }

    // None → optional kickoff to staff if nothing sent yet
    if (/^none$/i.test(action)) {
      const hasK = (chainUUIDs || '').length > 0;
      if (!hasK && !haveOut && staffPhone) {
        const reqBundle = staffReq || '(no explicit staff requirements listed)';
        const preferredLang = 'en';
        const prompt = fillTpl_(typeof PROMPT_TASK_KICKOFF_STAFF !== 'undefined' ? PROMPT_TASK_KICKOFF_STAFF : STAFF_REQ_PROMPT, {
          TASK_SUBS: taskScope,
          TASK_SCOPE: taskScope,
          GUEST_MESSAGE: guestMsg || '(no guest message captured)',
          STAFF_CONVERSATION: convForPrompt,
          REQUIREMENTS: reqBundle,
          STAFF_REQUIREMENTS: reqBundle,
          STAFF_NAME: 'colleague',
          STAFF_LANG: preferredLang
        });
        let txt = '';
        try { txt = callGPTTurbo([{role:'user',content:prompt}], apiKey).trim(); } catch(_){}
        if (txt) {
          outV[i][0] = txt;
          appendOutboundToAiLog({
            recipientType: 'Staff',
            propertyId: propId || '',
            to: staffPhone,
            originalMessage: guestMsg,
            language: preferredLang,
            ticketEnrichmentJSON: '',
            tone: '', sentiment: '', urgencyIndicators: '',
            subCategory: taskScope, complexityIndicators: '',
            escalationAndRiskIndicators: '',
            availableKnowledge: '',
            aiMessageResponse: txt,
            status: 'Success',
            taskCreated: '',
            taskUuid: taskUuid,
            messageChainUUIDs: chainUUIDs || ''
          });
        }
      }
    }
  }

  // write back
  sh.getRange(2, C.out,         n, 1).setValues(outV);
  if (anyWrites) {
    sh.getRange(2, C.actionHolder, n, 1).setValues(actionV);
    sh.getRange(2, C.needGuest,    n, 1).setValues(needGV);
    sh.getRange(2, C.needStaff,    n, 1).setValues(needSV);
    sh.getRange(2, C.needHost,     n, 1).setValues(needHV);
  }
  if (anyGuestNot) {
    sh.getRange(2, C.guestNotCol, n, 1).setValues(gNotV);
  }
}



/** =========================================================================
 *  Misc helpers: extract inbound + OpenAI wrappers
 *  ========================================================================= */
function extractLatestInboundAndOutstanding(convRaw, requirements) {
  let latestStaffInbound = '';
  try {
    const arr = JSON.parse(convRaw);
    if (Array.isArray(arr)) {
      for (let j = arr.length - 1; j >= 0; j--) {
        const s = String(arr[j] || '');
        if (/Staff:/i.test(s)) { latestStaffInbound = s.replace(/^.*Staff:\s*/i, '').trim(); break; }
      }
    }
  } catch (_) {
    const m = String(convRaw).split(/\n|\r/).filter(Boolean);
    for (let j = m.length - 1; j >= 0; j--) {
      const s = String(m[j] || '');
      if (/Staff:/i.test(s)) { latestStaffInbound = s.replace(/^.*Staff:\s*/i, '').trim(); break; }
    }
  }
  const outstanding = String(requirements || '').trim();
  return { latestStaffInbound, outstanding };
}

function callOpenAIChat(prompt, apiKey) {
  const res = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    method : 'post',
    contentType:'application/json',
    headers : { Authorization:`Bearer ${apiKey}` },
    payload : JSON.stringify({ model:'o4-mini-2025-04-16', messages:[{role:'user', content:prompt}] }),
    muteHttpExceptions:true
  });
  if (res.getResponseCode() !== 200) throw new Error(res.getContentText());
  const body = JSON.parse(res.getContentText());
  const content = body.choices[0].message.content.trim();
  try { return JSON.parse(content); } catch (_){}
  const s = content.indexOf('{'); const e = content.lastIndexOf('}') + 1;
  if (s >= 0 && e > s) return JSON.parse(content.slice(s,e));
  throw new Error('Unable to parse JSON from model response.');
}

function callGPTTurbo(messages, apiKey) {
  const res = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    method:'post',
    contentType:'application/json',
    headers:{Authorization:`Bearer ${apiKey}`},
    payload:JSON.stringify({model:'o4-mini-2025-04-16',messages}),
    muteHttpExceptions:true
  });
  if (res.getResponseCode() !== 200) throw new Error(res.getContentText());
  const data = JSON.parse(res.getContentText());
  return data.choices?.[0]?.message?.content?.trim() || '';
}


/** =========================================================================
 *  Debug Menu
 *  ========================================================================= */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('AI Debug')
    .addItem('Validate source tabs', 'dbgValidateSheets')
    .addItem('Inspect aiResponse row…', 'dbgInspectRowPrompt')
    .addItem('List categories for Property Id…', 'dbgListCatsPrompt')
    .addToUi();
}

function dbgValidateSheets() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const ui  = SpreadsheetApp.getUi();
  const out = [];

  function check(name, required) {
    const sh = ss.getSheetByName(name);
    if (!sh) { out.push(`✗ ${name} – sheet not found`); return; }
    const m = _ciHeaderMap(sh);
    const missing = required.filter(h => !_findCol(m, [h]));
    const rows = Math.max(0, sh.getLastRow() - 1);
    out.push(`${missing.length ? '✗' : '✓'} ${name}: ${rows} data rows; missing headers: [${missing.join(', ')}]`);
  }

  check('faqs',  ['json','property id','sub-category name']);
  check('tasks', ['json','property id','sub-category name','requirements to complete task']);
  check('d:bookingInfo',  ['json','property id']);
  check('d:propertyInfo', ['json','booking id']);

  Logger.log(out.join('\n'));
  ui.alert('Validate source tabs', out.join('\n'), ui.ButtonSet.OK);
}

function dbgListCatsPrompt() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt('List categories for Property Id', 'Enter Property Id (exact):', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const pid = res.getResponseText().trim();
  dbgListCatsForProperty(pid);
}

function dbgListCatsForProperty(propertyId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('debug:categories') || ss.insertSheet('debug:categories');
  sh.clear();
  sh.getRange(1,1,1,6).setValues([['Property Id','Type','Sub-Category','Staff Id','Staff Name','Staff Phone']]);

  const { FAQS_LIST, TASK_LIST } = getCategoryListsForProperty(propertyId);
  const { typeMap, ownerMap }    = getCategoryInfoMaps();

  const rows = [];
  const faqSubs  = (FAQS_LIST ? FAQS_LIST.split(/\s*,\s*/) : []).map(s => s.trim()).filter(Boolean);
  const taskSubs = (TASK_LIST ? TASK_LIST.split(/\s*,\s*/) : []).map(s => s.trim()).filter(Boolean);

  faqSubs.forEach(s => rows.push([propertyId, 'faq', s, '', '', '']));
  taskSubs.forEach(s => {
    const o = ownerMap[_canonLabel_(s)] || {};
    rows.push([propertyId, 'task', s, o.staffId||'', o.staffName||'', o.staffPhone||'']);
  });

  if (rows.length) sh.getRange(2,1,rows.length,rows[0].length).setValues(rows);
  Logger.log(`Categories for ${propertyId}\nFAQs: ${FAQS_LIST}\nTasks: ${TASK_LIST}`);
}

function dbgInspectRowPrompt() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt('Inspect aiResponse row', 'Enter row number (2..n):', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const row = parseInt(res.getResponseText(), 10);
  if (!row || row < 2) { ui.alert('Invalid row number.'); return; }
  dbgInspectRow(row);
}

function dbgInspectRow(row) {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const src     = ss.getSheetByName('aiResponse');
  if (!src) throw new Error('aiResponse not found');

  const H = _ciHeaderMap(src);
  const cPID   = _findCol(H, ['property id']);
  const cBID   = _findCol(H, ['booking id','reservation id']);
  const cMSG   = _findCol(H, ['message','inbound message']);
  const cPText = _findCol(H, ['property details']); // optional free text

  const val = (c) => c ? String(src.getRange(row, c).getValue() || '').trim() : '';

  const propertyId = val(cPID);
  const bookingId  = val(cBID);
  const message    = src.getRange(row, cMSG).getValue();  // keep raw
  const propText   = val(cPText);

  // Context lookups
  const bookingJSON  = _lookupSingleJSONByKey_('d:bookingInfo',  'property id', 'json', propertyId);
  const propInfoJSON = _lookupSingleJSONByKey_('d:propertyInfo', 'booking id',  'json', bookingId);
  const faqsJSONArr  = _lookupJSONArrayByKey_('faqs',            'property id', 'json', propertyId);

  // Category lists + allowed set
  const { FAQS_LIST, TASK_LIST, allowedSet, F, T } = getCategoryListsForProperty(propertyId);

  // Build the exact prompt we will send
  const prompt = fillTpl_(PROMPT_ENRICHMENT_CLASSIFY_JSON, {
    FAQS_LIST            : (FAQS_LIST || 'Other'),
    TASK_LIST            : (TASK_LIST || 'Other'),
    BOOKING_DETAILS_JSON : bookingJSON || '(none)',
    PROP_DETAILS         : propText || '(none)',
    PROPERTY_DETAILS_JSON: propInfoJSON || '(none)',
    PROP_FAQS_JSON       : faqsJSONArr || '[]',
    INSERT_GUEST_MESSAGE_HERE: String(message)
  });

  // Write to a debug sheet
  const dbg = ss.getSheetByName('debug:enrichment') || ss.insertSheet('debug:enrichment');
  dbg.clear();
  dbg.getRange(1,1,1,2).setValues([['Field','Value']]);

  const rows = [
    ['Row', row],
    ['Property Id', propertyId],
    ['Booking Id', bookingId],
    ['Message (raw)', typeof message === 'string' ? message : JSON.stringify(message)],
    ['Property Details (text)', propText],
    ['Booking Details JSON (len)', (bookingJSON||'').length],
    ['Property Details JSON (len)', (propInfoJSON||'').length],
    ['Property FAQs JSON (len)', (faqsJSONArr||'[]').length],
    ['FAQs List', FAQS_LIST],
    ['Tasks List', TASK_LIST],
    ['Allowed Set Size', Array.from(allowedSet).length],
    ['Per‑Prop FAQs Count', (F.perProp||[]).length],
    ['Per‑Prop Tasks Count', (T.perProp||[]).length],
    ['Global FAQs Count', (F.global||[]).length],
    ['Global Tasks Count', (T.global||[]).length],
    ['Prompt (full)', prompt]
  ];
  dbg.getRange(2,1,rows.length,2).setValues(rows);

  Logger.log('=== aiResponse Row Inspect ===');
  rows.forEach(([k,v]) => Logger.log(`${k}: ${String(v).slice(0, 400)}`));
  SpreadsheetApp.getUi().alert('Debug row written to sheet: debug:enrichment');
}

function sendWhatsApp() {
  const sid  = PropertiesService.getScriptProperties().getProperty('TWILIO_ACCOUNT_SID');
  const auth = PropertiesService.getScriptProperties().getProperty('TWILIO_AUTH_TOKEN');
  if (!sid || !auth) { return; }

  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const execSh = ss.getSheetByName('execution');
  const schedSh= ss.getSheetByName('scheduled');
  const msgSh  = ss.getSheetByName('d:messageLog');
  if (!msgSh) { return; }

  // --- helpers
  const norm = s => String(s||'')
    .replace(/[\u2018\u2019\u201C\u201D]/g,"'")
    .normalize('NFKC').trim().replace(/\s+/g,' ')
    .toLowerCase().replace(/[?:.,;—–-]/g,'');
  const headerMap = (sh) => {
    const row = sh.getRange(1,1,1,Math.max(1, sh.getLastColumn())).getValues()[0] || [];
    const m = {}; row.forEach((h,i)=>{ const n = norm(h); if (n && !m[n]) m[n]=i+1; });
    return m;
  };
  const pick = (map, alts) => { for (const a of alts){ const idx = map[norm(a)]; if (idx) return idx; } return null; };
  const toWa = (from, to) => (/^whatsapp:/i.test(from) && !/^whatsapp:/i.test(to)) ? 'whatsapp:' + to.replace(/^whatsapp:/i,'').trim() : to;

  // --- d:messageLog targets (DO NOT add new columns)
  const Hl = headerMap(msgSh);
  const C_UUID   = pick(Hl, ['Message UUID']) || pick(Hl, ['UUID','SID','Message SID']) || 1; // write SM... into column A
  const C_DATE   = pick(Hl, ['Date','Timestamp']) || 2;
  const C_FROM   = pick(Hl, ['From']) || 3;
  const C_TO     = pick(Hl, ['To'])   || 4;
  const C_MSG    = pick(Hl, ['Message','Body']) || 5;
  const C_IMG    = pick(Hl, ['Image URL','Media URL']); // optional
  const C_TYPE   = pick(Hl, ['Type']);                  // expected G
  const C_REFMSG = pick(Hl, ['Reference Message UUIDs','Reference Message Response','Message Chain UUIDs']); // expected H
  const C_REFTSK = pick(Hl, ['Reference Message UUIDs (Tasks)','Task UUIDs','Task UUID']); // optional alt
  const C_BOOK   = pick(Hl, ['Booking Id','Booking ID','Reservation Id','Reservation ID']); // expected K
  const C_EUUID  = pick(Hl, ['Ai Enrichment UUID','AI Enrichment UUID','Enrichment UUID']) || 10;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

  function appendMessageLog({sidSM, from, to, body, typ, refMsg, refTask, euid, bookingId}) {
    const lastCol = msgSh.getLastColumn();
    const outRow  = Array(lastCol).fill('');
    const set = (col, val) => { if (col && col >= 1 && col <= lastCol) outRow[col-1] = val; };
    set(C_UUID,  sidSM);                 // SM... → column A "Message UUID"
    set(C_DATE,  new Date());
    set(C_FROM,  from);
    set(C_TO,    to);
    set(C_MSG,   body || '');
    if (C_IMG)   set(C_IMG,  '');
    if (C_TYPE)  set(C_TYPE, typ || 'Outbound');
    if (C_REFMSG)set(C_REFMSG, refMsg || '');
    if (C_REFTSK)set(C_REFTSK, refTask || '');
    if (C_BOOK)  set(C_BOOK, bookingId || '');
    set(C_EUUID, euid || '');
    msgSh.getRange(msgSh.getLastRow() + 1, 1, 1, lastCol).setValues([outRow]);
  }

  // --- PROCESS: execution (Body-based)
  if (execSh) {
    const Hx = headerMap(execSh);
    const COL_BODY = pick(Hx, ['Body','Message','Ai Message Response','AI Message Response']);
    const COL_TO   = pick(Hx, ['To','To Number','WhatsApp To']);
    const COL_FROM = pick(Hx, ['From','From Number','WhatsApp From']);
    const COL_REFMSG = pick(Hx, ['Reference Message UUIDs','Reference Message Response','Message Chain UUIDs','UUIDs']);
    const COL_REFTSK = pick(Hx, ['Reference Task UUIDs','Task UUIDs','Task UUID']);
    const COL_EUUID  = pick(Hx, ['Ai Enrichment UUID','AI Enrichment UUID','Enrichment UUID']) || 2;
    const COL_TYPE   = pick(Hx, ['Type']); // optional
    if (COL_BODY && COL_TO && COL_FROM) {
      const startRow = 2, lastRow = execSh.getLastRow();
      if (lastRow >= startRow) {
        const values = execSh.getRange(startRow, 1, lastRow - startRow + 1, execSh.getLastColumn()).getValues();
        values.forEach(row => {
          const body = String(row[COL_BODY - 1] || '').trim();
          let   to   = String(row[COL_TO   - 1] || '').trim();
          const from = String(row[COL_FROM - 1] || '').trim();
          const refM = COL_REFMSG ? String(row[COL_REFMSG - 1] || '').trim() : '';
          const refT = COL_REFTSK ? String(row[COL_REFTSK - 1] || '').trim() : '';
          const euid = String(row[COL_EUUID  - 1] || '').trim();
          const typ  = (COL_TYPE ? String(row[COL_TYPE - 1] || '').trim() : '') || 'Outbound';
          if (!to || !from || !body) return;
          to = toWa(from, to);

          let msgSid = '';
          try {
            const res = UrlFetchApp.fetch(url, {
              method : 'post',
              payload: { To: to, From: from, Body: body },
              headers: {
                Authorization: 'Basic ' + Utilities.base64Encode(sid + ':' + auth),
                'Content-Type':'application/x-www-form-urlencoded'
              },
              muteHttpExceptions: true
            });
            if (res.getResponseCode() !== 201) return;
            msgSid = JSON.parse(res.getContentText()).sid; // SM...
          } catch (_) { return; }

          appendMessageLog({ sidSM: msgSid, from, to, body, typ, refMsg: refM, refTask: refT, euid, bookingId: '' });
        });
      }
    }
  }

  // --- PROCESS: scheduled (ContentSid-based). Log ContentSid in "Reference Message UUIDs". Also write Booking Id to column K.
  if (schedSh) {
    const Hs = headerMap(schedSh);
    const COL_PROP = pick(Hs, ['Property Id','Property ID']);
    const COL_BOOK = pick(Hs, ['Booking Id','Booking ID','Reservation Id','Reservation ID']);
    const COL_CSID = pick(Hs, ['Message SID','ContentSid','Content SID']);
    const COL_TO   = pick(Hs, ['To','To Number','WhatsApp To']);
    const COL_FROM = pick(Hs, ['From','From Number','WhatsApp From']);
    const COL_VARNAME = pick(Hs, ['Variable: {{name}}','Variable {{name}}','Name']);

    if (COL_TO && COL_FROM && COL_CSID) {
      const startRow = 2, lastRow = schedSh.getLastRow();
      if (lastRow >= startRow) {
        const values = schedSh.getRange(startRow, 1, lastRow - startRow + 1, schedSh.getLastColumn()).getValues();
        values.forEach(row => {
          const contentSid = String(row[COL_CSID - 1] || '').trim();  // e.g., HX...
          let   to         = String(row[COL_TO   - 1] || '').trim();
          const from       = String(row[COL_FROM - 1] || '').trim();
          const bookingId  = COL_BOOK ? String(row[COL_BOOK - 1] || '').trim() : '';
          const varName    = COL_VARNAME ? String(row[COL_VARNAME - 1] || '').trim() : '';
          if (!to || !from || !contentSid) return;
          to = toWa(from, to);

          const vars = varName ? JSON.stringify({ name: varName }) : '{}';

          let msgSid = '';
          try {
            const res = UrlFetchApp.fetch(url, {
              method : 'post',
              payload: {
                To: to,
                From: from,
                ContentSid: contentSid,
                ContentVariables: vars
              },
              headers: {
                Authorization: 'Basic ' + Utilities.base64Encode(sid + ':' + auth),
                'Content-Type':'application/x-www-form-urlencoded'
              },
              muteHttpExceptions: true
            });
            if (res.getResponseCode() !== 201) return;
            msgSid = JSON.parse(res.getContentText()).sid; // SM...
          } catch (_) { return; }

          appendMessageLog({
            sidSM: msgSid,
            from,
            to,
            body: '',
            typ: 'Scheduled',
            refMsg: `ContentSid:${contentSid}`,
            refTask: '',
            euid: '',
            bookingId
          });
        });
      }
    }
  }
}




function archiveCompletedTasks() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const src   = ss.getSheetByName('aiTasks');
  const dest  = ss.getSheetByName('d:taskLog');
  if (!src || !dest) throw new Error('Sheet “aiTasks” or “d:taskLog” not found');

  const hdr      = getHeaderMap(src);
  const STAT_COL = hdr['Status'];
  if (!STAT_COL) throw new Error('Missing “Status” column in aiTasks');

  // Columns to keep intact (preserve formulas)
  const PRESERVE = [
    hdr['UUIDs'],                   // K
    hdr['On-going Conversation'],   // L
    hdr['Response Recieved?'] || hdr['Response Received?'] // O (support both spellings)
  ].filter(Boolean);

  const lastRow  = src.getLastRow();
  if (lastRow < 2) return;

  const rowCount = lastRow - 1;
  const allVals  = src.getRange(2, 1, rowCount, src.getLastColumn()).getValues();
  const statuses = src.getRange(2, STAT_COL, rowCount, 1).getValues();

  // 1) Collect rows where Status == TRUE
  const archiveVals = [];
  const sourceRows  = [];
  allVals.forEach((row, i) => {
    const v  = statuses[i][0];
    const ok = (typeof v === 'boolean') ? v : String(v || '').trim().toUpperCase() === 'TRUE';
    if (ok) { archiveVals.push(row); sourceRows.push(i + 2); }
  });
  if (!archiveVals.length) return;

  // 2) Append to d:taskLog (same structure)
  dest.getRange(dest.getLastRow() + 1, 1, archiveVals.length, archiveVals[0].length)
      .setValues(archiveVals);

  // 3) Clear source rows except PRESERVE columns
  const lastCol = src.getLastColumn();
  sourceRows.forEach(r => {
    for (let c = 1; c <= lastCol; c++) {
      if (PRESERVE.includes(c)) continue;
      src.getRange(r, c).clearContent();
    }
  });

   Logger.log(`[archiveCompletedTasks] Moved ${archiveVals.length} row(s) to d:taskLog`);
}

/**
 * Uses your PROMPT_TASK_BOOLEAN_EVAL_* prompts to decide if all requirements are (or will be) met.
 * Returns the literal "TRUE" or "FALSE".
 */
function checkReqWithOpenAI(requirements, staffConversation, apiKey) {
  const systemMsg = PROMPT_TASK_BOOLEAN_EVAL_SYSTEM; // from prompts.gs
  const userMsg   = fillTpl_(PROMPT_TASK_BOOLEAN_EVAL_USER, {
    REQUIREMENTS   : String(requirements || '').trim(),
    STAFF_MESSAGE  : String(staffConversation || '').trim()
  });

  const res = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    method : 'post',
    contentType:'application/json',
    headers : { Authorization:`Bearer ${apiKey}` },
    payload : JSON.stringify({
      model:'o4-mini-2025-04-16',
      messages:[
        { role:'system', content: systemMsg },
        { role:'user',   content: userMsg }
      ]
      // temperature: 0 // optional: lock it down more if you like
    }),
    muteHttpExceptions:true
  });

  const txt = res.getContentText();
  Logger.log(`checkReqWithOpenAI ▶ REQUIREMENTS: ${requirements}`);
  Logger.log(`checkReqWithOpenAI ▶ STAFF CONV: ${staffConversation}`);
  Logger.log(`checkReqWithOpenAI ▶ API RESPONSE: ${txt}`);

  if (res.getResponseCode() !== 200) throw txt;

  const content = JSON.parse(txt).choices[0].message.content.trim();
  const upper   = content.toUpperCase();

  // Be tolerant to minor formatting (e.g., "TRUE.", "Answer: TRUE")
  if (/\bTRUE\b/.test(upper))  return 'TRUE';
  if (/\bFALSE\b/.test(upper)) return 'FALSE';

  // If model misbehaves, force a clear error so the caller can skip this row safely
  throw new Error(`Unexpected evaluator output: ${content}`);
}



/**
 * Evaluate each aiTasks row and write TRUE/FALSE into the "Status" column.
 * - Finds columns by header; creates "Status" at the end if missing.
 * - Requirements: "Requirements to Complete Task" (or "Requirements")
 * - Conversation: "On-going Conversation" (or "Ongoing Conversation")
 * - Optional gate: only evaluate rows where "Response Recieved?" or "Response Received?" is TRUE
 */
function evaluateTaskStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('aiTasks');
  if (!sh) throw new Error('Sheet “aiTasks” not found');

  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY missing.');

  const h = getHeaderMap(sh);
  const find = (aliases) => { for (const a of aliases) if (h[a]) return h[a]; return null; };

  const REQ_COL  = find(['Requirements to Complete Task','Requirements']);
  const CONV_COL = find(['On-going Conversation','Ongoing Conversation']);
  const FLAG_COL = find(['Response Recieved?','Response Received?']); // optional gate
  let STAT_COL = h['Status'];
  if (!STAT_COL) {
    STAT_COL = sh.getLastColumn() + 1;
    sh.getRange(1, STAT_COL).setValue('Status');
  }

  if (!REQ_COL || !CONV_COL) {
    throw new Error('aiTasks is missing one of: "Requirements to Complete Task"/"Requirements", "On-going Conversation"/"Ongoing Conversation".');
  }

  const numRows = sh.getLastRow() - 1;
  if (numRows < 1) return;

  const reqVals   = sh.getRange(2, REQ_COL,  numRows, 1).getValues();
  const convVals  = sh.getRange(2, CONV_COL, numRows, 1).getValues();
  const gateVals  = FLAG_COL ? sh.getRange(2, FLAG_COL, numRows, 1).getValues() : Array(numRows).fill([true]);
  const statusOut = sh.getRange(2, STAT_COL, numRows, 1).getValues();

  let updated = 0;
  for (let i = 0; i < numRows; i++) {
    const gate = gateVals[i][0];
    const gateTrue = (typeof gate === 'boolean') ? gate : String(gate || '').trim().toUpperCase() === 'TRUE';
    if (!gateTrue) continue;

    const req  = String(reqVals[i][0]  || '').trim();
    const conv = String(convVals[i][0] || '').trim();
    if (!req || !conv) continue;

    try {
      const result = checkReqWithOpenAI(req, conv, apiKey); // 'TRUE' or 'FALSE'
      if (result === 'TRUE' || result === 'FALSE') {
        if (statusOut[i][0] !== result) {
          statusOut[i][0] = result;
          updated++;
        }
      }
    } catch (e) {
      Logger.log(`evaluateTaskStatus ▶ Row ${i + 2}: OpenAI error – ${e}`);
    }
  }

  if (updated) {
    sh.getRange(2, STAT_COL, numRows, 1).setValues(statusOut);
  }
}



/** =========================================================================
 *  Orchestrator
 *  ========================================================================= */
function refreshNowTrigger() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Info');
  if (sh) sh.getRange('C2').setValue(new Date());
}

function runPlugins() {
  LIBRambleaiTasks.Plugins_runAll();   // not .Plugins.runAll()
}



function runFullAutomation() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    try { refreshNowTrigger(); } catch (_){}
    try { enrichAndExpand();   } catch (_){}

    SpreadsheetApp.flush(); Utilities.sleep(1000);

    try { createReplyAndLog(); } catch (_){}
    try { createStaffTasks();  } catch (_){}

    // 🔌 Run all micro-plugins registered in the library (dispatcher reads Staff Phone)
    try { LIBRambleaiTasks.Plugins.runAll(); } catch (e) { Logger.log('Plugins.runAll: ' + e); }

    try { evaluateTaskStatus();   } catch (e) { Logger.log('evaluateTaskStatus: ' + e); }
    try { buildNextTaskMessage(); } catch (_){}

    SpreadsheetApp.flush(); Utilities.sleep(1500);

    try { sendWhatsApp();          } catch (e) { Logger.log('sendWhatsApp: ' + e); }
    try { archiveCompletedTasks(); } catch (e) { Logger.log('archiveCompletedTasks: ' + e); }

  } finally {
    lock.releaseLock();
  }
}


