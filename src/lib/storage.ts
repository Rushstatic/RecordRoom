export const storage = {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage is not available, using fallback memory storage');
      return (window as any)[`_fallback_storage_${key}`] || null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage is not available, using fallback memory storage');
      (window as any)[`_fallback_storage_${key}`] = value;
    }
  },
  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      delete (window as any)[`_fallback_storage_${key}`];
    }
  }
};
