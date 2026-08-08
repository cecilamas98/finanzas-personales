// storage.js — guarda datos en Supabase (Postgres)
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mqyjzdvazivknjovwgyp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xeWp6ZHZheml2a25qb3Z3Z3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxNDU2ODAsImV4cCI6MjEwMTcyMTY4MH0.sX9WlsLA_go-KBgTAVhPSw4VmMHr8aYtMY6MmtwkxUc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cada guardado de una misma key se escribe a una sola fila de Postgres
// (upsert), así que a diferencia de Google Sheets un fallo de red nunca deja
// la colección "a medias" ni puede confundirse con "no hay datos todavía".
// Aun así se encola por key para que dos guardados casi simultáneos de la
// misma colección no se pisen fuera de orden.
const writeQueues = new Map();

function enqueue(queueKey, task) {
  const prev = writeQueues.get(queueKey) || Promise.resolve();
  const run = prev.then(task, task);
  writeQueues.set(queueKey, run.catch(() => {}));
  return run;
}

async function doSet(key, value) {
  try {
    const { error } = await supabase.from('kv_store').upsert({ key, value, updated_at: new Date().toISOString() });
    return !error;
  } catch (e) {
    console.error('storage.set error:', e);
    return false;
  }
}

export const storage = {
  async get(key) {
    try {
      const { data, error } = await supabase.from('kv_store').select('value').eq('key', key).maybeSingle();
      if (error) throw error;
      if (!data || data.value === null || data.value === undefined || data.value === '') return null;
      return { value: data.value };
    } catch (e) {
      console.error('storage.get error:', e);
      return null;
    }
  },
  async set(key, value) {
    return enqueue(key, () => doSet(key, value));
  }
};
