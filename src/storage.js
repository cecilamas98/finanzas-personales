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
};
