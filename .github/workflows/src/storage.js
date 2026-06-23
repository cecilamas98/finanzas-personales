// storage.js — reemplaza window.storage de Claude con localStorage nativo
const PREFIX = 'finanzas:'

export const storage = {
  get(key) {
    try {
      const val = localStorage.getItem(PREFIX + key)
      return val ? { value: val } : null
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, value)
      return true
    } catch (e) {
      console.error('localStorage error:', e)
      return false
    }
  },
  delete(key) {
    try {
      localStorage.removeItem(PREFIX + key)
      return true
    } catch {
      return false
    }
  }
}
