function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

// Colecciones tipo serie de tiempo (crecen sin límite con el uso). Se
// particionan en una hoja por mes ("movements__2026-07") en vez de una sola
// celda para todo el historial, así ninguna celda se acerca al límite de
// 50,000 caracteres de Google Sheets. El resto de las claves (accounts,
// budgetCategories, etc.) son pequeñas y acotadas, así que se quedan como
// una sola celda.
const SHARDED_KEYS = ['movements'];

function handleRequest(e) {
  const params = e.parameter;
  const action = params.action;

  let result;
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const key = params.key;
    const isSharded = SHARDED_KEYS.indexOf(key) !== -1;

    if (action === 'get') {
      if (isSharded) {
        result = { value: JSON.stringify(getSharded(sheet, key)) };
      } else {
        result = { value: getPlainValue(sheet, key) };
      }
    } else if (action === 'set') {
      const value = params.value;
      if (isSharded) {
        if (params.month) {
          setShardedMonth(sheet, key, params.month, JSON.parse(value));
        } else {
          // Sin mes especificado: reescritura completa (usada solo por la
          // siembra inicial de datos migrados, que es un array pequeño).
          setSharded(sheet, key, JSON.parse(value));
        }
      } else {
        setPlainValue(sheet, key, value);
      }
      result = { value: 'saved' };
    } else {
      result = { value: null };
    }
  } catch (err) {
    result = { error: err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getPlainValue(sheet, key) {
  const hoja = sheet.getSheetByName(key);
  if (!hoja) return null;
  const cell = hoja.getRange(1, 1);
  // Si Sheets guardó el valor como fecha (por ejemplo por auto-detección
  // antes de forzar formato de texto), getValue() devuelve un Date real;
  // lo convertimos a texto plano en vez de dejar que JSON.stringify lo
  // serialice como datetime con offset de zona horaria.
  const raw = cell.getValue();
  const data = raw instanceof Date ? cell.getDisplayValue() : raw;
  return data || null;
}

function setPlainValue(sheet, key, value) {
  let hoja = sheet.getSheetByName(key);
  if (!hoja) hoja = sheet.insertSheet(key);
  // Forzar formato de texto para que Sheets no auto-convierta strings
  // con forma de fecha/número en un valor de celda distinto al guardado.
  hoja.getRange(1, 1).setNumberFormat('@').setValue(value);
}

// Junta todas las hojas "<key>__YYYY-MM" en un solo array.
function getSharded(sheet, key) {
  const prefix = key + '__';
  const sheets = sheet.getSheets();
  let all = [];
  let foundSharded = false;
  for (let i = 0; i < sheets.length; i++) {
    const hoja = sheets[i];
    if (hoja.getName().indexOf(prefix) === 0) {
      foundSharded = true;
      const cell = hoja.getRange(1, 1);
      const raw = cell.getValue();
      const text = raw instanceof Date ? cell.getDisplayValue() : raw;
      if (text) {
        try { all = all.concat(JSON.parse(text)); } catch (e) { /* hoja corrupta, se ignora */ }
      }
    }
  }
  if (!foundSharded) {
    // Migración automática de una sola vez: todavía no hay hojas por mes,
    // pero puede existir la hoja "<key>" de antes de particionar (una sola
    // celda con todo el historial). Si existe, se reparte su contenido en
    // hojas por mes ahora mismo, para no perder datos al pasar al nuevo
    // esquema. La hoja vieja se deja intacta como respaldo.
    const legacyRaw = getPlainValue(sheet, key);
    if (legacyRaw) {
      let legacyItems = [];
      try { legacyItems = JSON.parse(legacyRaw); } catch (e) { legacyItems = []; }
      if (legacyItems.length > 0) {
        setSharded(sheet, key, legacyItems);
        return legacyItems;
      }
    }
  }
  return all;
}

// Reescribe SOLO el mes indicado (no toca los demás meses). Si el mes queda
// sin elementos, borra esa hoja para no dejar basura.
function setShardedMonth(sheet, key, month, items) {
  const name = key + '__' + month;
  if (!items || items.length === 0) {
    const hoja = sheet.getSheetByName(name);
    if (hoja && sheet.getSheets().length > 1) sheet.deleteSheet(hoja);
    return;
  }
  let hoja = sheet.getSheetByName(name);
  if (!hoja) hoja = sheet.insertSheet(name);
  hoja.getRange(1, 1).setNumberFormat('@').setValue(JSON.stringify(items));
}

// Reescritura completa: agrupa todo el array recibido por mes (campo
// `date`, formato YYYY-MM-DD) y sincroniza cada hoja de mes, borrando las
// que ya no tienen datos. Solo se usa para la siembra inicial.
function setSharded(sheet, key, items) {
  const prefix = key + '__';
  const byMonth = {};
  (items || []).forEach(function (it) {
    const month = (it.date || '').slice(0, 7) || 'sin-fecha';
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(it);
  });
  const existing = sheet.getSheets().filter(function (h) { return h.getName().indexOf(prefix) === 0; });
  existing.forEach(function (h) {
    const month = h.getName().substring(prefix.length);
    if (!byMonth[month] && sheet.getSheets().length > 1) sheet.deleteSheet(h);
  });
  Object.keys(byMonth).forEach(function (month) {
    setShardedMonth(sheet, key, month, byMonth[month]);
  });
}
