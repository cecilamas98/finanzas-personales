// storage.js — guarda datos en Google Sheets vía Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzQf-yS2-rDlklFc4GQQw5ofD7i8Iui5gOWhFp8gSAdrZ1SAuIlTjcsu3yef4NnVbCs/exec';
const TIMEOUT_MS = 8000;

// fetch() no tiene timeout propio: si Apps Script no responde (cuota, lock
// colgado, cold start), la promesa nunca se resuelve y la app se queda
// cargando para siempre. AbortController fuerza un límite de espera.
function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

async function doSet(key, value, month) {
  try {
    // El valor va en el body (POST), no en la URL: como query param (GET) el
    // JSON de movements/compromisos crece con cada gasto/apartado guardado y
    // termina superando el límite de longitud de URL, haciendo que el guardado
    // falle en silencio a partir de cierto tamaño (se ve local pero no persiste).
    const params = { action: 'set', key, value };
    if (month) params.month = month; // ver setMonth: reescribe solo ese mes
    const body = new URLSearchParams(params);
    const res = await fetchWithTimeout(SCRIPT_URL, { method: 'POST', body });
    const data = await res.json();
    return data.value === 'saved';
  } catch (e) {
    console.error('storage.set error:', e);
    return false;
  }
}

// Apps Script sobrescribe la celda/hoja completa en cada "set", así que si
// dos guardados de la misma key (o el mismo mes) quedan en vuelo a la vez,
// el que responde último gana y borra lo que haya escrito el otro (aunque
// se haya enviado antes). Esta cola obliga a que los "set" de una misma
// key/mes se ejecuten uno a la vez, en el orden en que se llamaron.
const writeQueues = new Map();

function enqueue(queueKey, task) {
  const prev = writeQueues.get(queueKey) || Promise.resolve();
  const run = prev.then(task, task);
  writeQueues.set(queueKey, run.catch(() => {}));
  return run;
}

export const storage = {
  async get(key) {
    try {
      const url = `${SCRIPT_URL}?action=get&key=${encodeURIComponent(key)}`;
      const res = await fetchWithTimeout(url);
      const data = await res.json();
      if (data.value === null || data.value === undefined || data.value === '') return null;
      return { value: data.value };
    } catch (e) {
      console.error('storage.get error:', e);
      return null;
    }
  },
  async set(key, value) {
    return enqueue(key, () => doSet(key, value));
  },
  // Reescribe solo los elementos de un mes de una colección particionada
  // (hoy: "movements"), en vez de reenviar el historial completo en cada
  // gasto — así la petición nunca crece sin límite con el tiempo de uso.
  async setMonth(key, month, items) {
    return enqueue(`${key}__${month}`, () => doSet(key, JSON.stringify(items), month));
  }
};
