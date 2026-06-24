// storage.js — guarda datos en Google Sheets vía Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzQf-yS2-rDlklFc4GQQw5ofD7i8Iui5gOWhFp8gSAdrZ1SAuIlTjcsu3yef4NnVbCs/exec';

export const storage = {
  async get(key) {
    try {
      const url = `${SCRIPT_URL}?action=get&key=${encodeURIComponent(key)}`;
      const res = await fetch(url);
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
      const res = await fetch(url);
      const data = await res.json();
      return data.value === 'saved';
    } catch (e) {
      console.error('storage.set error:', e);
      return false;
    }
  }
};
