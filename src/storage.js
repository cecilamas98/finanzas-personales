// storage.js — guarda datos en Google Sheets vía Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzQf-yS2-rDlklFc4GQQw5ofD7i8Iui5gOWhFp8gSAdrZ1SAuIlTjcsu3yef4NnVbCs/exec';
const TIMEOUT_MS = 8000;

// fetch() no tiene timeout propio: si Apps Script no responde (cuota, lock
// colgado, cold start), la promesa nunca se resuelve y la app se queda
// cargando para siempre. AbortController fuerza un límite de espera.
function fetchWithTimeout(url) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
}

async function doSet(key, value) {
  try {
    const url = `${SCRIPT_URL}?action=set&key=${encodeURIComponent(key)}&value=${encodeURIComponent(value)}`;
    const res = await fetchWithTimeout(url);
    const data = await res.json();
    return data.value === 'saved';
  } catch (e) {
    console.error('storage.set error:', e);
    return false;
  }
}

// Apps Script sobrescribe la celda completa en cada "set", así que si dos
// guardados de la misma key quedan en vuelo a la vez, el que responde último
// gana y borra lo que haya escrito el otro (aunque se haya enviado antes).
// Esta cola obliga a que los "set" de una misma key se ejecuten uno a la
// vez, en el orden en que se llamaron, para que nunca se pisen entre sí.
const writeQueues = new Map();

function queueSet(key, value) {
  const prev = writeQueues.get(key) || Promise.resolve();
  const run = prev.then(() => doSet(key, value), () => doSet(key, value));
  writeQueues.set(key, run.catch(() => {}));
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
    return queueSet(key, value);
  }
};
