/**
 * Compresses an image file client-side before storing or uploading.
 * Resizes large camera photos to max 800px and 0.65 JPEG quality,
 * reducing raw photos down to ~30KB-50KB with crisp quality for digital catalogs.
 * 300 images @ 40KB = ~12MB-15MB total file size (well under 25MB limit).
 */
export function compressImage(file: File, maxDimension = 800, quality = 0.65): Promise<string> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      // Produce compact JPEG
      const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
      resolve(compressedBase64);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    };

    img.src = url;
  });
}

/**
 * Re-compresses an existing Base64 data URL string to 800px max dimension and 0.65 quality.
 */
export function compressBase64(base64DataUrl: string, maxDimension = 800, quality = 0.65): Promise<string> {
  return new Promise((resolve) => {
    if (!base64DataUrl || !base64DataUrl.startsWith("data:image/") || base64DataUrl.includes("image/svg+xml")) {
      resolve(base64DataUrl);
      return;
    }

    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width <= maxDimension && height <= maxDimension && base64DataUrl.length < 80000) {
        // Already small enough
        resolve(base64DataUrl);
        return;
      }

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(base64DataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL("image/jpeg", quality);
      resolve(compressed);
    };

    img.onerror = () => {
      resolve(base64DataUrl);
    };

    img.src = base64DataUrl;
  });
}

/**
 * Calculates estimated file size in MB of the catalog data
 */
export function calculateCatalogSizeMB(products: any[], settings: any): number {
  const jsonStr = JSON.stringify({ products, settings });
  const bytes = new Blob([jsonStr]).size;
  return parseFloat((bytes / (1024 * 1024)).toFixed(2));
}

/**
 * IndexedDB helper for persistent local storage of large catalogs (>5MB)
 * that bypasses browser localStorage strict limits.
 */
const DB_NAME = "CatalogAppDB";
const STORE_NAME = "catalogStore";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function idbSet(key: string, value: any): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    });
  } catch {
    return false;
  }
}
