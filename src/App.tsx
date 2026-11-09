import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  Download,
  Smartphone,
  Monitor,
  Eye,
  Settings2,
  Coins,
  MessageSquare,
  PlusCircle,
  ArrowLeft,
  ArrowRight,
  Upload,
  CheckCircle2,
  Lock,
  X,
  ShoppingBag,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Mail,
  Instagram,
  Phone,
  Store,
  GripVertical,
  LayoutGrid,
  List,
  ArrowUpDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUp,
  ChevronsDown,
  Globe,
  Link as LinkIcon,
  ExternalLink,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Video,
  Film
} from "lucide-react";

import { Product, CatalogSettings, EditorialPage } from "./types";
import { christmasCover } from "./assets/christmasCover";
import {
  DEFAULT_PRODUCTS,
  DEFAULT_SETTINGS,
  getHeadphonesSvg,
  getWatchSvg,
  getBackpackSvg
} from "./utils/placeholders";
import { generateInteractiveCatalogHtml } from "./utils/exporter";
import { compressImage, compressBase64, calculateCatalogSizeMB, idbGet, idbSet } from "./utils/imageCompressor";
import { extractYouTubeId, getYouTubeThumbnailUrl, getYouTubeEmbedUrl } from "./utils/youtube";
import { ProductReorderModal } from "./components/ProductReorderModal";

// --- Safe Storage Helper to avoid iframe/sandbox SecurityErrors ---
const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("localStorage is blocked or unavailable:", e);
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("localStorage setItem failed:", e);
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("localStorage removeItem failed:", e);
    }
  }
};

// --- Helper to extract JSON from HTML string ---
function extractJSON(text: string, startMarker: string, openChar: string, closeChar: string): any {
  const markerIndex = text.indexOf(startMarker);
  if (markerIndex === -1) return null;
  
  const startIndex = text.indexOf(openChar, markerIndex + startMarker.length);
  if (startIndex === -1) return null;
  
  let bracketCount = 0;
  let inString = false;
  let escape = false;
  let stringChar = '';
  
  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];
    
    if (escape) {
      escape = false;
      continue;
    }
    
    if (char === '\\') {
      escape = true;
      continue;
    }
    
    if (inString) {
      if (char === stringChar) {
        inString = false;
      }
      continue;
    }
    
    if (char === '"' || char === "'") {
      inString = true;
      stringChar = char;
      continue;
    }
    
    if (char === openChar) {
      bracketCount++;
    } else if (char === closeChar) {
      bracketCount--;
      if (bracketCount === 0) {
        const jsonStr = text.substring(startIndex, i + 1);
        try {
          return JSON.parse(jsonStr);
        } catch (e) {
          console.error("Failed to parse extracted JSON", e);
          return null;
        }
      }
    }
  }
  return null;
}

function ChristmasDetail() {
  return <div aria-hidden="true" className="flex items-center justify-center gap-1.5 mx-auto mt-1.5 max-w-[150px] leading-none"><span className="h-px flex-1 bg-[#8ab28f]" /><span className="text-[#e8ad30] text-[11px]">✦</span><span className="text-[#df635d] text-[6px]">●</span><span className="text-[#e8ad30] text-[11px]">✦</span><span className="h-px flex-1 bg-[#8ab28f]" /></div>;
}

export default function App() {
  // --- Persistent State ---
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = safeStorage.getItem("catalog_products");
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : DEFAULT_PRODUCTS;
    } catch {
      return DEFAULT_PRODUCTS;
    }
  });

  const [settings, setSettings] = useState<CatalogSettings>(() => {
    const saved = safeStorage.getItem("catalog_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.coverVideoUrl || parsed.coverVideoUrl.includes(".mp4") || parsed.coverVideoUrl.startsWith("data:video") || parsed.coverVideoUrl.includes("5qap5aO4i9A")) {
          parsed.coverVideoUrl = "https://www.youtube.com/shorts/vpIJWiT74ew";
        }
        if (extractYouTubeId(parsed.coverVideoUrl)) {
          delete parsed.coverPosterUrl;
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  // --- Workspace State ---
  const [activeProductId, setActiveProductId] = useState<string>("");
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");
  const [dragOver, setDragOver] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"loading" | "saving" | "saved" | "error">("loading");
  const [storageReady, setStorageReady] = useState(false);
  const saveQueue = useRef(Promise.resolve());
  const [editorialPreview, setEditorialPreview] = useState<EditorialPage | null>(null);
  const [uploadingEditorial, setUploadingEditorial] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const normalizeSearch = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const matchesProduct = (p: Product) => normalizeSearch([p.title, p.description, p.colors, p.sizes].filter(Boolean).join(" ")).includes(normalizeSearch(productSearch));
  const matchingCount = products.filter(matchesProduct).length;
  const [sidebarViewMode, setSidebarViewMode] = useState<"list" | "grid">("list");
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  
  // --- Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Drag and Drop State ---
  const [draggedProductIdx, setDraggedProductIdx] = useState<number | null>(null);
  const [draggedImageIdx, setDraggedImageIdx] = useState<number | null>(null);

  // --- Preview Simulator State ---
  const [simPageIndex, setSimPageIndex] = useState<number>(() => {
    return DEFAULT_SETTINGS.enableCoverVideo !== false ? -1 : 0;
  });
  const [simActiveImages, setSimActiveImages] = useState<Record<string, number>>({});
  const [isSimGridViewOpen, setIsSimGridViewOpen] = useState(false);
  const [isSimCoverPlaying, setIsSimCoverPlaying] = useState(false);
  const [isSimCoverMuted, setIsSimCoverMuted] = useState(true);
  const simCoverVideoRef = useRef<HTMLVideoElement | null>(null);
  const desktopCoverVideoRef = useRef<HTMLVideoElement | null>(null);
  const simYoutubeIframeRef = useRef<HTMLIFrameElement | null>(null);
  const desktopYoutubeIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Restore IndexedDB before allowing edits or writing any initial state.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedProducts, storedSettings] = await Promise.all([
        idbGet<Product[]>("catalog_products_idb"),
        idbGet<CatalogSettings>("catalog_settings_idb"),
      ]);
      if (cancelled) return;
      if (Array.isArray(storedProducts)) setProducts(storedProducts);
      if (storedSettings && typeof storedSettings === "object") {
        setSettings(prev => ({ ...prev, ...storedSettings }));
      }
      const restoredSettings = storedSettings && typeof storedSettings === "object" ? storedSettings : settings;
      setSimPageIndex((restoredSettings.coverType ?? (restoredSettings.enableCoverVideo === false ? "none" : "video")) === "none" ? 0 : -1);
      setStorageReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // Initialize active product ID on load
  useEffect(() => {
    if (products.length > 0 && !activeProductId) {
      setActiveProductId(products[0].id);
    }
  }, [products, activeProductId]);

  // Serialize writes so an older save cannot finish after a newer one.
  useEffect(() => {
    if (!storageReady) return;
    let current = true;
    setSaveStatus("saving");
    saveQueue.current = saveQueue.current.then(async () => {
      const [productsSaved, settingsSaved] = await Promise.all([
        idbSet("catalog_products_idb", products),
        idbSet("catalog_settings_idb", settings),
      ]);
      // Keep the smaller legacy copy for browsers where it fits.
      safeStorage.setItem("catalog_products", JSON.stringify(products));
      safeStorage.setItem("catalog_settings", JSON.stringify(settings));
      if (current) setSaveStatus(productsSaved && settingsSaved ? "saved" : "error");
    });
    return () => { current = false; };
  }, [products, settings, storageReady]);

  // --- Simulator Orders State & Customer Contact Info ---
  const [simOrders, setSimOrders] = useState<Record<string, { curves: number; variants: Record<string, number>; variantsNotes?: string; units?: number }>>({});
  const [isFullscreenDesktop, setIsFullscreenDesktop] = useState(false);
  const [isPcMosaicOpen, setIsPcMosaicOpen] = useState(false);
  const lastCoverPlayToggleRef = useRef(0);
  const [customerName, setCustomerName] = useState(() => safeStorage.getItem("customer_name") || "");
  const [customerEmail, setCustomerEmail] = useState(() => safeStorage.getItem("customer_email") || "");
  const [customerPhone, setCustomerPhone] = useState(() => safeStorage.getItem("customer_phone") || "");
  const [customerNotes, setCustomerNotes] = useState(() => safeStorage.getItem("customer_notes") || "");

  useEffect(() => {
    safeStorage.setItem("customer_name", customerName);
  }, [customerName]);

  useEffect(() => {
    safeStorage.setItem("customer_email", customerEmail);
  }, [customerEmail]);

  useEffect(() => {
    safeStorage.setItem("customer_phone", customerPhone);
  }, [customerPhone]);

  useEffect(() => {
    safeStorage.setItem("customer_notes", customerNotes);
  }, [customerNotes]);

  // Stop video playback when navigating away from the cover slide
  useEffect(() => {
    if (simPageIndex !== -1) {
      setIsSimCoverPlaying(false);
      if (simCoverVideoRef.current && !simCoverVideoRef.current.paused) {
        simCoverVideoRef.current.pause();
      }
      if (desktopCoverVideoRef.current && !desktopCoverVideoRef.current.paused) {
        desktopCoverVideoRef.current.pause();
      }
    }
  }, [simPageIndex]);

  const updateSimCurveQty = (productId: string, delta: number) => {
    setSimOrders(prev => {
      const current = prev[productId] || { curves: 0, variants: {}, units: 0 };
      let nextCurves = (current.curves || 0) + delta;
      if (nextCurves < 0) nextCurves = 0;
      return {
        ...prev,
        [productId]: {
          ...current,
          curves: nextCurves
        }
      };
    });
  };

  const updateSimVariantQty = (productId: string, color: string, delta: number) => {
    setSimOrders(prev => {
      const current = prev[productId] || { curves: 0, variants: {}, units: 0 };
      const currentVariants = current.variants || {};
      let nextQty = (currentVariants[color] || 0) + delta;
      if (nextQty < 0) nextQty = 0;
      return {
        ...prev,
        [productId]: {
          ...current,
          variants: {
            ...currentVariants,
            [color]: nextQty
          }
        }
      };
    });
  };

  const updateSimUnitsQty = (productId: string, delta: number) => {
    setSimOrders(prev => {
      const current = prev[productId] || { curves: 0, variants: {}, units: 0 };
      let nextUnits = (current.units || 0) + delta;
      if (nextUnits < 0) nextUnits = 0;
      return {
        ...prev,
        [productId]: {
          ...current,
          units: nextUnits
        }
      };
    });
  };

  const updateSimVariantNotes = (productId: string, notes: string) => {
    setSimOrders(prev => {
      const current = prev[productId] || { curves: 0, variants: {}, units: 0 };
      return {
        ...prev,
        [productId]: {
          ...current,
          variantsNotes: notes
        }
      };
    });
  };

  const getSimProductSizesCount = (product: Product) => {
    if (product.sizesCount !== undefined && product.sizesCount > 0) {
      return product.sizesCount;
    }
    if (!product.sizes) return 4;
    const clean = product.sizes.trim();
    if (!clean) return 4;
    const parts = clean.split(/[,/\s\-]+/);
    const valid = parts.filter(p => p.trim().length > 0);
    return valid.length || 4;
  };

  const { simTotalUnits, simTotalPrice } = React.useMemo(() => {
    let units = 0;
    let price = 0;
    products.forEach(product => {
      const state = simOrders[product.id];
      if (!state) return;
      const sizeCount = getSimProductSizesCount(product);
      let curvesCount = 0;
      for (const color in state.variants) {
        curvesCount += state.variants[color] || 0;
      }
      const unitsCount = state.units || 0;
      const totalGarments = (curvesCount * sizeCount) + unitsCount;
      if (totalGarments > 0) {
        const wholesalePrice = Math.round(product.retailPrice / 2);
        units += totalGarments;
        price += totalGarments * wholesalePrice;
      }
    });
    return { simTotalUnits: units, simTotalPrice: price };
  }, [products, simOrders]);

  const generateWhatsAppOrderUrl = (
    prods: Product[],
    sett: CatalogSettings,
    orders: typeof simOrders,
    cust: { name: string; email: string; phone: string; notes: string }
  ) => {
    const cleanNumber = (sett.whatsappNumber || "").replace(/[^0-9]/g, "");
    let text = '🛒 *NUEVO PEDIDO DESDE EL CATÁLOGO*\n━━━━━━━━━━━━━━━━━━━━━━━━\n';
    text += `👤 *Cliente:* ${cust.name.trim() || 'No especificado'}\n`;
    if (cust.email.trim()) text += `📧 *Email:* ${cust.email.trim()}\n`;
    if (cust.phone.trim()) text += `📞 *Teléfono:* ${cust.phone.trim()}\n`;
    text += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    if (cust.notes.trim()) {
      text += `📝 *Observaciones:* ${cust.notes.trim()}\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }
    let totalPrendas = 0;
    let totalDinero = 0;
    prods.forEach(p => {
      const state = orders[p.id];
      if (!state) return;
      const sizeCount = getSimProductSizesCount(p);
      let curvesCount = 0;
      for (const color in state.variants) {
        curvesCount += state.variants[color] || 0;
      }
      const unitsCount = state.units || 0;
      const totalG = (curvesCount * sizeCount) + unitsCount;
      if (totalG > 0) {
        const wholesale = Math.round(p.retailPrice / 2);
        const sub = totalG * wholesale;
        totalPrendas += totalG;
        totalDinero += sub;
        text += `📦 *${p.title}*\n`;
        const variantLines: string[] = [];
        Object.entries(state.variants).forEach(([c, q]) => {
          const qty = Number(q) || 0;
          if (qty > 0) variantLines.push(`${qty} curvas (${c})`);
        });
        if (variantLines.length > 0) text += `  • Curvas: ${variantLines.join(', ')}\n`;
        if (state.units && state.units > 0) text += `  • Unidades: ${state.units} un.\n`;
        if (state.variantsNotes?.trim()) text += `  • Detalle: ${state.variantsNotes.trim()}\n`;
        text += `  _Subtotal: ${sett.currency || '$'}${sub.toLocaleString('es-AR')}_\n\n`;
      }
    });
    text += `🔥 *TOTAL PRENDAS:* ${totalPrendas} prendas\n`;
    text += `💰 *TOTAL ESTIMADO:* ${sett.currency || '$'}${totalDinero.toLocaleString('es-AR')}\n`;
    text += '━━━━━━━━━━━━━━━━━━━━━━━━\n';
    text += `Generado desde: ${sett.storeName}`;
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
  };

  // Reset simulator page index if products list scales down
  useEffect(() => {
    if (simPageIndex > products.length) {
      setSimPageIndex(products.length);
    }
  }, [products, simPageIndex]);

  // Handle active editing product
  const activeProduct = products.find((p) => p.id === activeProductId) || products[0];

  // Update a single property of the active product
  const updateActiveProduct = (key: keyof Product, value: any) => {
    if (!activeProductId) return;
    setProducts((prev) =>
      prev.map((p) => (p.id === activeProductId ? { ...p, [key]: value } : p))
    );
  };

  // Select product and automatically commit/save state locally without asking
  const handleSelectProduct = (id: string) => {
    if (!id) return;
    // Switch active product
    setActiveProductId(id);

    // Sync simulator slide page index
    const pIdx = products.findIndex((p) => p.id === id);
    if (pIdx !== -1) {
      setSimPageIndex(pIdx);
    }

  };

  // --- AI Description Optimizer State & Function ---
  const [isOptimizingDesc, setIsOptimizingDesc] = useState(false);
  const [descAiError, setDescAiError] = useState<string | null>(null);

  useEffect(() => {
    setDescAiError(null);
  }, [activeProductId]);

  const improveDescriptionWithAI = async () => {
    if (!activeProduct) return;
    const targetProductId = activeProduct.id;
    const originalText = activeProduct.description;

    setIsOptimizingDesc(true);
    setDescAiError(null);
    try {
      const response = await fetch("/api/improve-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: activeProduct.title,
          currentDescription: originalText,
          sizes: activeProduct.sizes,
          colors: activeProduct.colors,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo mejorar la descripción con IA.");
      }

      if (data.improvedText && typeof data.improvedText === "string" && data.improvedText.trim().length >= 5) {
        const cleanedText = data.improvedText.trim();
        setProducts((prev) => prev.map((p) =>
          p.id === targetProductId ? { ...p, description: cleanedText } : p
        ));
      } else {
        throw new Error("La descripción generada por la IA fue insuficiente. Se ha mantenido tu descripción original para proteger tus datos.");
      }
    } catch (err: any) {
      console.error("AI Description Error:", err);
      setDescAiError(err.message || "Ocurrió un error al optimizar la descripción.");
    } finally {
      setIsOptimizingDesc(false);
    }
  };

  // Add a new empty product
  const handleAddProduct = () => {
    const newId = `prod-${Date.now()}`;
    const newProduct: Product = {
      id: newId,
      title: "Nuevo Producto",
      description: "Escribe aquí la descripción de tu producto, sus características, talle o materiales.",
      retailPrice: 5000,
      isExistingInStore: false,
      externalStoreUrl: "",
      images: [
        // Generate a simple default grey graphic
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%"><rect width="100%" height="100%" fill="#f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="600" fill="#94a3b8">Subir Foto o Ilustración</text></svg>`
        )}`
      ]
    };
    const nextList = [...products, newProduct];
    setProducts(nextList);
    handleSelectProduct(newId);
  };

  // Delete a product
  const handleDeleteProduct = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (products.length <= 1) {
      alert("Debes tener al menos un producto en tu catálogo.");
      return;
    }
    const index = products.findIndex((p) => p.id === id);
    const newProducts = products.filter((p) => p.id !== id);
    setProducts(newProducts);
    
    // Adjust active product
    if (activeProductId === id) {
      const nextActiveIndex = index > 0 ? index - 1 : 0;
      handleSelectProduct(newProducts[nextActiveIndex].id);
    }
  };

  // Duplicate product
  const handleDuplicateProduct = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = `prod-${Date.now()}`;
    const duplicated: Product = {
      ...product,
      id: newId,
      title: `${product.title} (Copia)`
    };
    setProducts((prev) => [...prev, duplicated]);
    handleSelectProduct(newId);
  };

  // Restore Default Mockups
  const handleRestoreDefaults = () => {
    if (window.confirm("¿Estás seguro de que quieres restablecer los productos por defecto? Se perderán tus cambios actuales.")) {
      setProducts(DEFAULT_PRODUCTS);
      setSettings(DEFAULT_SETTINGS);
      setActiveProductId(DEFAULT_PRODUCTS[0].id);
      setSimPageIndex(DEFAULT_SETTINGS.enableCoverVideo !== false ? -1 : 0);
    }
  };

  // Clean whole catalog
  const handleClearCatalog = () => {
    if (window.confirm("¿Seguro que deseas vaciar el catálogo?")) {
      const emptyId = "prod-empty";
      setProducts([
        {
          id: emptyId,
          title: "Mi Primer Producto",
          description: "Ingresa la descripción.",
          retailPrice: 1000,
          images: [
            `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%"><rect width="100%" height="100%" fill="#f8fafc"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#94a3b8">Subí tus fotos</text></svg>`
            )}`
          ]
        }
      ]);
      setActiveProductId(emptyId);
      setSimPageIndex(0);
    }
  };

  const [isCompressingAll, setIsCompressingAll] = useState(false);

  // Batch re-compresses all existing product images to fit easily under 25MB
  const handleCompressAllImages = async () => {
    if (products.length === 0) return;
    setIsCompressingAll(true);
    try {
      const initialMB = calculateCatalogSizeMB(products, settings);
      let updatedProducts = [...products];
      
      for (let pIdx = 0; pIdx < updatedProducts.length; pIdx++) {
        const prod = updatedProducts[pIdx];
        const newImages: string[] = [];
        for (const imgUrl of prod.images) {
          if (imgUrl && imgUrl.startsWith("data:image/") && !imgUrl.includes("image/svg+xml")) {
            const compressed = await compressBase64(imgUrl, 800, 0.65);
            newImages.push(compressed);
          } else {
            newImages.push(imgUrl);
          }
        }
        updatedProducts[pIdx] = { ...prod, images: newImages };
      }

      setProducts(updatedProducts);
      const finalMB = calculateCatalogSizeMB(updatedProducts, settings);
      alert(`¡Optimización completada con éxito!\n\nTamaño del catálogo reducido de ${initialMB} MB a ${finalMB} MB.\n\nEl archivo final pesará sensiblemente menos del límite de 25 MB.`);
    } catch (err) {
      console.error("Error optimizando fotos:", err);
      alert("Ocurrió un error al intentar optimizar algunas imágenes.");
    } finally {
      setIsCompressingAll(false);
    }
  };

  const uploadEditorialPages = async (files: File[]) => {
    if (!files.length) return;
    setUploadingEditorial(true);
    try {
      const selected = Array.from(files).filter(file => file.type.startsWith("image/"));
      const images = await Promise.all(selected.map(file => compressImage(file, 1600, 0.8)));
      const added: EditorialPage[] = images.map(image => ({ id: crypto.randomUUID(), image, beforeProductId: "", fit: "cover" }));
      setSettings(prev => ({ ...prev, editorialPages: [...(prev.editorialPages || []), ...added] }));
    } catch {
      alert("No se pudieron cargar las fotos. Intentá nuevamente.");
    } finally { setUploadingEditorial(false); }
  };

  const changeEditorialPage = (id: string, change: Partial<EditorialPage>) => {
    setSettings(prev => ({ ...prev, editorialPages: (prev.editorialPages || []).map(page => page.id === id ? { ...page, ...change } : page) }));
  };
  const moveEditorialPage = (id: string, direction: number) => {
    setSettings(prev => {
      const pages = [...(prev.editorialPages || [])];
      const index = pages.findIndex(page => page.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= pages.length) return prev;
      [pages[index], pages[target]] = [pages[target], pages[index]];
      return { ...prev, editorialPages: pages };
    });
  };

  // Handle image upload from file explorer with automatic image compression (800px / 0.65 quality -> ~30-50KB/photo)
  const handleImagesUploaded = async (files: FileList) => {
    if (!activeProduct) return;
    
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      try {
        // Compress image to max 800px / 0.65 JPEG quality
        const compressedBase64 = await compressImage(file, 800, 0.65);
        
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id === activeProductId) {
              const hasPlaceholderOnly = p.images.length === 1 && p.images[0].includes("Subir Foto");
              return {
                ...p,
                images: hasPlaceholderOnly ? [compressedBase64] : [...p.images, compressedBase64]
              };
            }
            return p;
          })
        );
      } catch (err) {
        console.error("Error compressing image:", err);
      }
    }
  };

  // Image upload triggers
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleImagesUploaded(e.target.files);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => {
    setDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      handleImagesUploaded(e.dataTransfer.files);
    }
  };

  // Re-order active product images
  const setAsPrimaryImage = (index: number) => {
    if (!activeProduct) return;
    const reordered = [...activeProduct.images];
    const [selected] = reordered.splice(index, 1);
    reordered.unshift(selected);
    updateActiveProduct("images", reordered);
  };

  // Delete product image
  const deleteProductImage = (index: number) => {
    if (!activeProduct) return;
    if (activeProduct.images.length <= 1) {
      alert("El producto debe tener al menos una imagen.");
      return;
    }
    const filtered = activeProduct.images.filter((_, idx) => idx !== index);
    updateActiveProduct("images", filtered);
  };

  // --- Product Drag & Drop Reordering ---
  const reorderProductsList = (newProducts: Product[]) => {
    setProducts(newProducts);
    if (activeProductId) {
      const newIdx = newProducts.findIndex((p) => p.id === activeProductId);
      if (newIdx !== -1) {
        setSimPageIndex(newIdx);
      }
    }
  };

  const handleProductDragStart = (index: number) => {
    setDraggedProductIdx(index);
  };

  const handleProductDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleProductDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedProductIdx === null || draggedProductIdx === targetIndex) return;
    
    const reordered = [...products];
    const [movedProduct] = reordered.splice(draggedProductIdx, 1);
    reordered.splice(targetIndex, 0, movedProduct);
    
    reorderProductsList(reordered);
    setDraggedProductIdx(null);
  };

  const handleProductDragEnd = () => {
    setDraggedProductIdx(null);
  };

  const moveProductToPosition = (fromIndex: number, targetIndex: number) => {
    if (fromIndex === targetIndex) return;
    if (targetIndex < 0 || targetIndex >= products.length) return;
    const reordered = [...products];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    reorderProductsList(reordered);
  };

  const moveProductToStart = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (index === 0) return;
    moveProductToPosition(index, 0);
  };

  const moveProductToEnd = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (index === products.length - 1) return;
    moveProductToPosition(index, products.length - 1);
  };

  // --- Image Drag & Drop Reordering ---
  const handleImageDragStart = (index: number) => {
    setDraggedImageIdx(index);
  };

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleImageDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedImageIdx === null || draggedImageIdx === targetIndex) return;
    if (!activeProduct) return;
    
    const reordered = [...activeProduct.images];
    const [movedImage] = reordered.splice(draggedImageIdx, 1);
    reordered.splice(targetIndex, 0, movedImage);
    
    updateActiveProduct("images", reordered);
    setDraggedImageIdx(null);
  };

  const handleImageDragEnd = () => {
    setDraggedImageIdx(null);
  };

  // --- Product Reordering Controllers ---
  const moveProductUp = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === 0) return;
    const reordered = [...products];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(index - 1, 0, moved);
    setProducts(reordered);
    if (simPageIndex === index) {
      setSimPageIndex(index - 1);
    } else if (simPageIndex === index - 1) {
      setSimPageIndex(index);
    }
  };

  const moveProductDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === products.length - 1) return;
    const reordered = [...products];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(index + 1, 0, moved);
    setProducts(reordered);
    if (simPageIndex === index) {
      setSimPageIndex(index + 1);
    } else if (simPageIndex === index + 1) {
      setSimPageIndex(index);
    }
  };

  // --- Image Reordering Controllers ---
  const moveImageLeft = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === 0) return;
    if (!activeProduct) return;
    const reordered = [...activeProduct.images];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(index - 1, 0, moved);
    updateActiveProduct("images", reordered);
  };

  const moveImageRight = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeProduct) return;
    if (index === activeProduct.images.length - 1) return;
    const reordered = [...activeProduct.images];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(index + 1, 0, moved);
    updateActiveProduct("images", reordered);
  };

  // --- TRIGGER CATALOG FILE EXPORT ---
  const handleExportCatalog = async () => {
    const estimatedMB = calculateCatalogSizeMB(products, settings);
    if (estimatedMB > 24.5) {
      const confirmCompress = window.confirm(
        `El peso estimado del catálogo es de ${estimatedMB} MB (cercano o superior al límite de 25 MB).\n\n¿Deseas optimizar y comprimir automáticamente las imágenes ahora mismo para reducir su peso antes de exportar el archivo HTML?`
      );
      if (confirmCompress) {
        await handleCompressAllImages();
      }
    }

    const htmlContent = generateInteractiveCatalogHtml(products, settings);
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const finalSizeMB = parseFloat((blob.size / (1024 * 1024)).toFixed(2));
    if (finalSizeMB > 25.0) {
      alert(`⚠️ Advertencia de peso: El archivo HTML generado pesa ${finalSizeMB} MB, superando el límite de 25 MB.\n\nPara que tus clientes lo puedan recibir por WhatsApp sin inconvenientes, te sugerimos:\n1) Reemplazar el video de portada por un enlace URL directo (pesa 0 MB).\n2) Comprimir las fotos de los productos con el botón 'Optimizar fotos'.`);
    }

    const url = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement("a");
    const sanitizedStoreName = settings.storeName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");
    
    link.href = url;
    link.download = `catalogo-${sanitizedStoreName || "digital"}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- TRIGGER CATALOG FILE IMPORT ---
  const handleImportCatalog = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const htmlContent = event.target?.result as string;
      if (!htmlContent) {
        alert("No se pudo leer el contenido del archivo.");
        return;
      }

      const importedProducts = extractJSON(htmlContent, "var products =", "[", "]");
      if (!Array.isArray(importedProducts) || importedProducts.length === 0) {
        alert("No se encontraron productos válidos en el archivo HTML suministrado. Asegúrate de subir un archivo de catálogo generado por esta aplicación.");
        return;
      }

      // Map imported products to make sure they are fully populated and conform to the Product interface
      const sanitizedProducts: Product[] = importedProducts.map((p: any, idx: number) => ({
        id: p.id || `prod-${Date.now()}-${idx}`,
        title: p.title || `Producto ${idx + 1}`,
        description: p.description || "",
        retailPrice: typeof p.retailPrice === "number" ? p.retailPrice : 0,
        images: Array.isArray(p.images) ? p.images : [],
        sizes: p.sizes || "",
        colors: p.colors || "",
        isChristmasCapsule: p.isChristmasCapsule === true,
        isExistingInStore: p.isExistingInStore === true,
        externalStoreUrl: typeof p.externalStoreUrl === "string" ? p.externalStoreUrl : "",
        sizesCount: typeof p.sizesCount === "number" ? p.sizesCount : undefined
      }));

      const importedSettings = extractJSON(htmlContent, "var settings =", "{", "}");

      const confirmMsg = `¿Estás seguro de que deseas cargar este catálogo?\nSe importarán ${sanitizedProducts.length} productos y se sobrescribirá el catálogo actual en tu pantalla.`;
      
      if (window.confirm(confirmMsg)) {
        setProducts(sanitizedProducts);
        if (importedSettings && typeof importedSettings === "object") {
          setSettings({
            storeName: importedSettings.storeName || settings.storeName,
            whatsappNumber: importedSettings.whatsappNumber || settings.whatsappNumber,
            currency: importedSettings.currency || settings.currency,
            themeColor: importedSettings.themeColor || settings.themeColor,
            enableCart: typeof importedSettings.enableCart === "boolean" ? importedSettings.enableCart : settings.enableCart,
            contactEmail: importedSettings.contactEmail || settings.contactEmail,
            instagramUser: importedSettings.instagramUser || settings.instagramUser,
            editorialPages: Array.isArray(importedSettings.editorialPages) ? importedSettings.editorialPages.filter((page: any) => page && typeof page.id === "string" && typeof page.image === "string" && /^data:image\/(jpeg|png|webp);base64,/i.test(page.image)).map((page: any) => ({ id: page.id, image: page.image, beforeProductId: typeof page.beforeProductId === "string" ? page.beforeProductId : "", fit: page.fit === "contain" ? "contain" : "cover" })) : [],
            coverType: ["video", "christmas", "none"].includes(importedSettings.coverType) ? importedSettings.coverType : (importedSettings.enableCoverVideo === false ? "none" : "video"),
            enableCoverVideo: typeof importedSettings.enableCoverVideo === "boolean" ? importedSettings.enableCoverVideo : settings.enableCoverVideo,
            coverVideoUrl: importedSettings.coverVideoUrl || settings.coverVideoUrl,
            coverPosterUrl: importedSettings.coverPosterUrl || settings.coverPosterUrl,
            coverTitle: importedSettings.coverTitle || settings.coverTitle,
            coverSubtitle: importedSettings.coverSubtitle || settings.coverSubtitle,
            coverButtonText: importedSettings.coverButtonText || settings.coverButtonText
          });
        }
        
        // Auto-select the first imported product
        if (sanitizedProducts.length > 0) {
          setActiveProductId(sanitizedProducts[0].id);
        }
        
        // Reset simulator page index to cover
        const importedCoverType = importedSettings?.coverType ?? (importedSettings?.enableCoverVideo === false ? "none" : "video");
        setSimPageIndex(importedCoverType === "none" ? 0 : -1);
        
        alert("¡Catálogo importado con éxito!");
      }
      
      // Clear file input so same file can be imported again if needed
      e.target.value = "";
    };
    
    reader.onerror = () => {
      alert("Error al leer el archivo HTML.");
    };
    
    reader.readAsText(file);
  };

  // --- Simulated Catalog Interactions (Interactive Smartphone Preview) ---
  const currentSimProduct = products[simPageIndex] || null;
  const currentSimProductActiveImageIdx = currentSimProduct
    ? simActiveImages[currentSimProduct.id] || 0
    : 0;

  const coverType = settings.coverType ?? (settings.enableCoverVideo === false ? "none" : "video");
  const hasSimCover = coverType !== "none";
  const minSimIndex = hasSimCover ? -1 : 0;

  const handleSimNextPage = () => {
    if (simPageIndex < products.length) {
      setSimPageIndex((prev) => prev + 1);
    }
  };

  const handleSimPrevPage = () => {
    if (simPageIndex > minSimIndex) {
      setSimPageIndex((prev) => prev - 1);
    }
  };

  const setSimActiveImageForProduct = (prodId: string, imgIdx: number) => {
    setSimActiveImages((prev) => ({
      ...prev,
      [prodId]: imgIdx
    }));
  };

  // --- Swipe Gestures for Simulator Canvas ---
  const simTouchStartX = useRef<number | null>(null);
  const simTouchStartY = useRef<number | null>(null);

  const handleSimTouchStart = (e: React.TouchEvent) => {
    simTouchStartX.current = e.touches[0].clientX;
    simTouchStartY.current = e.touches[0].clientY;
  };

  const handleSimTouchEnd = (e: React.TouchEvent) => {
    if (simTouchStartX.current === null || simTouchStartY.current === null) return;
    const diffX = simTouchStartX.current - e.changedTouches[0].clientX;
    const diffY = simTouchStartY.current - e.changedTouches[0].clientY;

    // Check if horizontal swipe was larger than vertical swipe, and exceeded threshold (e.g., 40px)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        // Swiped Left -> Show next product
        handleSimNextPage();
      } else {
        // Swiped Right -> Show previous product
        handleSimPrevPage();
      }
    }

    simTouchStartX.current = null;
    simTouchStartY.current = null;
  };

  // --- Reusable Cover Page Renderer for Simulator and Desktop Modal ---
  const renderCoverPage = (isDesktopModal = false) => {
    if (coverType === "christmas") {
      return (
        <div className={isDesktopModal ? "w-full max-w-[460px] h-[82vh] rounded-3xl overflow-hidden shadow-2xl relative my-auto flex items-center justify-center text-center" : "flex-1 w-full h-full relative overflow-hidden flex items-center justify-center text-center"} style={{ background: `#fff url(${christmasCover}) center / contain no-repeat` }}>
          <div className="px-6 -translate-y-14 text-[#a92e38]">
            <p className="text-[9px] font-bold tracking-widest">✦ NOS PREPARAMOS PARA LAS FIESTAS ✦</p>
            <h2 className="font-serif font-bold text-3xl my-3 leading-tight">Cápsula<br />Navideña</h2>
            <p className="text-xs mb-4">Una colección para vivir momentos mágicos</p>
            <button type="button" onClick={() => setSimPageIndex(0)} className="rounded-full px-5 py-2.5 bg-[#a92e38] text-white font-bold text-xs">Ver colección →</button>
          </div>
        </div>
      );
    }
    const rawUrl = (settings.coverVideoUrl || "").trim();
    const youtubeId = extractYouTubeId(rawUrl);
    const posterUrl = youtubeId ? getYouTubeThumbnailUrl(youtubeId) : (settings.coverPosterUrl || (products[0]?.images[0] || ""));
    const currentVideoRef = isDesktopModal ? desktopCoverVideoRef : simCoverVideoRef;
    const currentYtIframeRef = isDesktopModal ? desktopYoutubeIframeRef : simYoutubeIframeRef;

    const handleToggleAudio = (e?: React.MouseEvent | React.TouchEvent) => {
      if (e) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
      }
      const nextMuted = !isSimCoverMuted;
      setIsSimCoverMuted(nextMuted);

      // Handle YouTube iframe via postMessage
      if (currentYtIframeRef.current && currentYtIframeRef.current.contentWindow) {
        try {
          if (nextMuted) {
            currentYtIframeRef.current.contentWindow.postMessage('{"event":"command","func":"mute","args":""}', '*');
          } else {
            currentYtIframeRef.current.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
            currentYtIframeRef.current.contentWindow.postMessage('{"event":"command","func":"setVolume","args":[100]}', '*');
          }
        } catch (err) {
          console.warn("YouTube postMessage error:", err);
        }
      }

      // Handle HTML5 video fallback
      if (currentVideoRef.current) {
        currentVideoRef.current.muted = nextMuted;
      }
    };

    const handleStartPlay = (e?: React.MouseEvent | React.TouchEvent) => {
      if (e) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
      }
      const now = Date.now();
      if (now - lastCoverPlayToggleRef.current < 450) {
        return;
      }
      lastCoverPlayToggleRef.current = now;

      if (!isSimCoverPlaying) {
        setIsSimCoverPlaying(true);
      } else {
        // Pause if already playing
        if (youtubeId) {
          if (currentYtIframeRef.current && currentYtIframeRef.current.contentWindow) {
            try {
              currentYtIframeRef.current.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            } catch (err) {}
          }
        } else if (rawUrl && currentVideoRef.current) {
          try {
            currentVideoRef.current.pause();
          } catch (err) {}
        }
        setIsSimCoverPlaying(false);
      }
    };

    const handleGoToCatalog = (e?: React.MouseEvent | React.TouchEvent) => {
      if (e) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
      }
      setIsSimCoverPlaying(false);
      setSimPageIndex(0);
    };

    const containerClasses = isDesktopModal
      ? "w-full max-w-[460px] h-[82vh] bg-black rounded-3xl overflow-hidden shadow-2xl relative my-auto border-4 border-slate-800 select-none flex flex-col"
      : "flex-1 w-full h-full relative overflow-hidden bg-black select-none flex flex-col";

    return (
      <div className={containerClasses}>
        {/* Background Media: ONLY load and play video when isSimCoverPlaying is TRUE */}
        {youtubeId ? (
          isSimCoverPlaying ? (
            <div className="absolute inset-0 w-full h-full bg-black z-10 flex flex-col">
              <iframe
                ref={currentYtIframeRef}
                src={getYouTubeEmbedUrl(youtubeId, true, isSimCoverMuted)}
                title="Portada YouTube Short"
                className="w-full h-full border-0 pointer-events-auto"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                onLoad={() => {
                  if (!isSimCoverMuted && currentYtIframeRef.current?.contentWindow) {
                    try {
                      currentYtIframeRef.current.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
                      currentYtIframeRef.current.contentWindow.postMessage('{"event":"command","func":"setVolume","args":[100]}', '*');
                    } catch (e) {}
                  }
                }}
              />
            </div>
          ) : (
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center cursor-pointer"
              style={{ backgroundImage: posterUrl ? `url(${posterUrl})` : undefined }}
              onClick={handleStartPlay}
            />
          )
        ) : rawUrl ? (
          isSimCoverPlaying ? (
            <video
              ref={currentVideoRef}
              src={rawUrl}
              poster={posterUrl}
              className="absolute inset-0 w-full h-full object-cover cursor-pointer z-10"
              playsInline
              autoPlay
              muted={isSimCoverMuted}
              onEnded={() => setIsSimCoverPlaying(false)}
              onClick={handleStartPlay}
            />
          ) : (
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center cursor-pointer"
              style={{ backgroundImage: posterUrl ? `url(${posterUrl})` : undefined }}
              onClick={handleStartPlay}
            />
          )
        ) : (
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center opacity-30 blur-xs"
            style={{ backgroundImage: posterUrl ? `url(${posterUrl})` : undefined }}
          />
        )}

        {/* Dynamic Gradient Overlay for contrast and readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent via-35% to-black/90 pointer-events-none z-15" />

        {/* Center Play Button Action: Completely hidden when video is playing */}
        {!isSimCoverPlaying && (
          <div
            onClick={handleStartPlay}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center cursor-pointer group pointer-events-auto"
          >
            {youtubeId || rawUrl ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartPlay(e);
                }}
                className="w-18 h-18 rounded-full flex items-center justify-center text-white border-2 border-white/95 shadow-2xl transition-all group-hover:scale-110 active:scale-95 ring-8 ring-white/20 bg-red-600 animate-pulse cursor-pointer pointer-events-auto"
                aria-label="Reproducir video de presentación"
              >
                <Play className="w-8 h-8 fill-white ml-0.5" />
              </button>
            ) : (
              <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center max-w-[280px] shadow-2xl space-y-1.5">
                <Film className="w-8 h-8 text-red-400 mx-auto" />
                <div className="text-xs font-bold text-white">Portada de Presentación</div>
                <p className="text-[10px] text-white/70 leading-snug">
                  Pega el enlace de un YouTube Short en la barra lateral para reproducir tu video vertical aquí.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Bottom Actions: ONLY Ver Catálogo button, Arrow, and Sound Control - FIXED AT BOTTOM */}
        <div className="absolute bottom-0 inset-x-0 z-30 p-4 pb-6 flex flex-col gap-2 pointer-events-auto">
          {/* Bouncing down arrow indicator */}
          <div
            onClick={handleGoToCatalog}
            className="flex justify-center -mb-1 animate-bounce cursor-pointer py-1"
            title="Ir al catálogo"
          >
            <ChevronDown className="w-7 h-7 text-white drop-shadow-lg hover:scale-110 transition-transform" />
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleGoToCatalog}
              className="flex-1 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-2xl border border-white/25 active:scale-98 transition-all cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${settings.themeColor || "#2563eb"}, #1d4ed8)`
              }}
            >
              <span>Ver Catálogo</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={handleToggleAudio}
              className="w-12 h-12 rounded-2xl bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/25 shadow-2xl active:scale-95 transition-all cursor-pointer flex-shrink-0"
              title={isSimCoverMuted ? "Activar audio" : "Silenciar"}
            >
              {isSimCoverMuted ? (
                <VolumeX className="w-5 h-5 text-white/90" />
              ) : (
                <Volume2 className="w-5 h-5 text-emerald-400" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!storageReady) return <div className="p-8">Cargando catálogo guardado...</div>;

  return (
    <div id="main-root" className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      
      {/* Top Application Header */}
      <header id="app-header" className="bg-white border-b border-slate-200/80 sticky top-0 z-50 px-6 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold font-display tracking-tight text-slate-900 flex items-center gap-1.5">
                Creador de Catálogos Interactivos
              </h1>
              <p className="text-xs text-slate-400 font-medium">Sube tus fotos, calcula precios mayoristas y genera un archivo HTML listo para WhatsApp</p>
            </div>
          </div>

          <div className="flex items-center space-x-3.5">
            <button
              onClick={handleCompressAllImages}
              disabled={isCompressingAll || products.length === 0}
              className={`px-3 py-2 rounded-xl text-xs font-bold font-display flex items-center space-x-1.5 transition-all border shadow-2xs ${
                calculateCatalogSizeMB(products, settings) > 20
                  ? "bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100 animate-pulse"
                  : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100"
              }`}
              title="Optimizar y comprimir todas las imágenes para que el catálogo no supere los 25 MB"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>
                {isCompressingAll
                  ? "Comprimiendo..."
                  : `Peso est.: ${calculateCatalogSizeMB(products, settings)} MB / 25 MB`}
              </span>
            </button>

            <div className="text-right hidden sm:block">
              <span className="inline-flex items-center text-xs text-slate-500 font-medium gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {saveStatus === "saved" ? "Cambios guardados" : saveStatus === "error" ? "No se pudo guardar: exportá una copia" : "Guardando..."}
              </span>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              id="import-btn"
              className="bg-white hover:bg-slate-50 text-slate-700 font-bold font-display px-4 py-2.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center space-x-2 transition-all hover:translate-y-[-1px] active:translate-y-0"
              title="Cargar productos y ajustes desde un archivo de catálogo HTML previamente exportado"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Importar HTML</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportCatalog}
              accept=".html"
              className="hidden"
            />

            <button
              onClick={handleExportCatalog}
              id="export-btn"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold font-display px-5 py-2.5 rounded-xl shadow-lg shadow-blue-100 flex items-center space-x-2 transition-all hover:translate-y-[-1px] active:translate-y-0"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Archivo Interactivo</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main id="app-workspace" className="flex-1 max-w-[1536px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:overflow-hidden overflow-y-auto">
        
        {/* LEFT COLUMN: Sidebar Navigation & Store Settings (lg:col-span-3) */}
        <section id="sidebar-panel" className="lg:col-span-3 flex flex-col space-y-5 lg:overflow-y-auto lg:max-h-[calc(100vh-110px)] h-auto pr-1">
          


          {/* Store Branding Box */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/60">
            <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-slate-500" /> Ajustes del Catálogo
            </h2>
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Nombre de la Tienda</label>
                <input
                  type="text"
                  value={settings.storeName}
                  onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                  placeholder="Ej: Bazar Chic, Distribuidora Saffadi"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Celular de WhatsApp (para recibir pedidos)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={settings.whatsappNumber}
                    onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-mono"
                    placeholder="Ej: 5491112345678"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Sin símbolos ni espacios. Aquí recibirás los pedidos enviados por WhatsApp.</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Email del Vendedor (opcional)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="email"
                    value={settings.contactEmail || ""}
                    onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                    placeholder="Ej: tu-email@ejemplo.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Moneda</label>
                  <input
                    type="text"
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-center"
                    placeholder="Ej: $"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Color de Marca</label>
                  <div className="flex items-center space-x-1.5 h-[34px]">
                    <input
                      type="color"
                      value={settings.themeColor}
                      onChange={(e) => setSettings({ ...settings, themeColor: e.target.value })}
                      className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer border-0 p-0"
                    />
                    <span className="text-[10px] font-bold font-mono uppercase text-slate-500">{settings.themeColor}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Portada con Video (Primera Página al abrir el catálogo) */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/60">
            <label htmlFor="cover-type" className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-2">Portada del catálogo (1ª página)</label>
            <select id="cover-type" value={coverType} onChange={(e) => {
              const next = e.target.value as "video" | "christmas" | "none";
              setIsSimCoverPlaying(false);
              setSettings({ ...settings, coverType: next, enableCoverVideo: next !== "none" });
              setSimPageIndex(next === "none" ? 0 : -1);
            }} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold mb-3">
              <option value="video">Portada con video</option>
              <option value="christmas">Portada navideña</option>
              <option value="none">Sin portada</option>
            </select>

            {coverType === "video" ? (
              <div className="space-y-3">
                {/* YouTube Shorts optimized notification */}
                <div className="bg-red-50/70 border border-red-200/60 rounded-xl p-2.5 text-[11px] text-red-900 leading-snug">
                  <div className="flex items-center gap-1 font-bold mb-0.5 text-red-950">
                    <Film className="w-3.5 h-3.5 text-red-600" /> YouTube Shorts (Recomendado)
                  </div>
                  Los <strong>YouTube Shorts</strong> tienen formato vertical nativo (9:16), cargan a máxima velocidad y <strong>pesan 0 MB</strong> en tu archivo HTML, manteniéndolo siempre por debajo de los 25 MB.
                  <div className="mt-1 text-[10px] text-red-800 font-medium border-t border-red-200/50 pt-1">
                    ⚡ La persona puede dar <strong>Play</strong> para reproducirlo en vertical o tocar <strong>&quot;Ver Catálogo&quot;</strong> para pasar directo a los productos.
                  </div>
                </div>

                {/* YouTube Short / Video URL Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">
                      Enlace de YouTube Short <span className="text-emerald-600 font-bold text-[10px]">• 0 MB extra</span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="url"
                      value={settings.coverVideoUrl || ""}
                      onChange={(e) => {
                        setIsSimCoverPlaying(false);
                        setSettings({ ...settings, coverVideoUrl: e.target.value });
                      }}
                      placeholder="https://www.youtube.com/shorts/..."
                      className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none transition-all pr-8"
                    />
                    {settings.coverVideoUrl && (
                      <button
                        onClick={() => {
                          setIsSimCoverPlaying(false);
                          setSettings({ ...settings, coverVideoUrl: "" });
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Borrar enlace"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Real-time YouTube Short Preview Detection */}
                  {(() => {
                    const ytId = extractYouTubeId(settings.coverVideoUrl);
                    if (ytId) {
                      return (
                        <div className="mt-2 flex items-center gap-2.5 p-2 bg-red-50/90 border border-red-200 rounded-xl shadow-2xs">
                          <img
                            src={getYouTubeThumbnailUrl(ytId)}
                            alt="Miniatura YouTube"
                            className="w-9 h-12 object-cover rounded-lg shadow-2xs border border-red-200 bg-black flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0 text-[11px]">
                            <div className="font-bold text-red-950 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-red-600"></span>
                              <span>YouTube Short Detectado</span>
                            </div>
                            <div className="text-[10px] text-red-700 font-mono truncate">ID: {ytId}</div>
                            <div className="text-[10px] text-emerald-700 font-bold mt-0.5">✓ Formato vertical optimizado</div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Preview Trigger Button */}
                <button
                  type="button"
                  onClick={() => setSimPageIndex(-1)}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                    simPageIndex === -1
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{simPageIndex === -1 ? "Viendo Portada en Simulador" : "Previsualizar Portada"}</span>
                </button>
              </div>
            ) : coverType === "christmas" ? (
              <button type="button" onClick={() => setSimPageIndex(-1)} className="w-full py-2 px-3 rounded-xl bg-red-50 text-red-800 text-xs font-bold">Ver portada navideña</button>
            ) : (
              <p className="text-[11px] text-slate-500">El catálogo se abrirá directamente en los productos.</p>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/60 space-y-3">
            <div><h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Fotos a pantalla completa</h2><p className="text-xs text-slate-500 mt-1">Elegí dónde mostrar cada foto. Las fotos en una misma posición siguen el orden de esta lista.</p></div>
            <label className="block text-center py-2 px-3 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold cursor-pointer">{uploadingEditorial ? "Cargando fotos..." : "+ Cargar fotos"}<input type="file" accept="image/*" multiple disabled={uploadingEditorial} className="sr-only" onChange={e => { const files = Array.from(e.currentTarget.files || []) as File[]; e.currentTarget.value = ""; void uploadEditorialPages(files); }} /></label>
            {(settings.editorialPages || []).map((page, index, pages) => (
              <div key={page.id} className="border border-slate-200 rounded-xl p-2 space-y-2">
                <div className="flex items-center gap-2"><img src={page.image} alt="" className="w-12 h-16 object-cover rounded-lg" /><div className="flex-1 min-w-0"><p className="text-xs font-bold">Foto {index + 1}</p><button type="button" onClick={() => setEditorialPreview(page)} className="text-xs text-blue-700 font-semibold">Ver foto</button></div><button type="button" aria-label={`Subir foto ${index + 1}`} disabled={index === 0} onClick={() => moveEditorialPage(page.id, -1)} className="p-1 disabled:opacity-30">↑</button><button type="button" aria-label={`Bajar foto ${index + 1}`} disabled={index === pages.length - 1} onClick={() => moveEditorialPage(page.id, 1)} className="p-1 disabled:opacity-30">↓</button><button type="button" aria-label={`Quitar foto ${index + 1}`} onClick={() => setSettings(prev => ({ ...prev, editorialPages: (prev.editorialPages || []).filter(item => item.id !== page.id) }))} className="p-1 text-rose-600"><Trash2 className="w-4 h-4" /></button></div>
                <label className="block text-xs text-slate-600">Ubicación<select value={products.some(p => p.id === page.beforeProductId) ? page.beforeProductId : ""} onChange={e => changeEditorialPage(page.id, { beforeProductId: e.target.value })} className="block w-full mt-1 rounded-lg border border-slate-300 p-1.5 text-xs"><option value="">Después de todas las prendas</option>{products.map((p, i) => <option key={p.id} value={p.id}>Antes de #{i + 1} · {p.title || "Sin título"}</option>)}</select></label>
                <label className="block text-xs text-slate-600">Ajuste de imagen<select value={page.fit || "cover"} onChange={e => changeEditorialPage(page.id, { fit: e.target.value as "cover" | "contain" })} className="block w-full mt-1 rounded-lg border border-slate-300 p-1.5 text-xs"><option value="cover">Llenar pantalla (puede recortar)</option><option value="contain">Mostrar foto completa</option></select></label>
              </div>
            ))}
          </div>

          {/* Products Nav Box */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/60 flex-1 flex flex-col min-h-[360px]">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                📦 Prendas ({products.length})
              </h2>

              <div className="flex items-center space-x-1.5">
                {/* View switcher: List vs Mosaic/Grid in sidebar */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
                  <button
                    onClick={() => setSidebarViewMode("list")}
                    className={`p-1 rounded-md transition-all cursor-pointer ${
                      sidebarViewMode === "list"
                        ? "bg-white text-blue-600 shadow-2xs font-bold"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                    title="Vista en Lista"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSidebarViewMode("grid")}
                    className={`p-1 rounded-md transition-all cursor-pointer ${
                      sidebarViewMode === "grid"
                        ? "bg-white text-blue-600 shadow-2xs font-bold"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                    title="Vista Mosaico en barra"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={handleAddProduct}
                  className="text-blue-600 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50 transition-colors"
                  title="Añadir Producto"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Prominent Quick Button to open the Visual Mosaic Reordering Organizer */}
            <button
              onClick={() => setIsReorderModalOpen(true)}
              className="w-full mb-3 py-2 px-3 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 border border-blue-200/80 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-all shadow-2xs cursor-pointer group active:scale-98"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
              <span>Modo Mosaico (Reordenar)</span>
              <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded-full font-mono font-bold ml-1">
                Visual
              </span>
            </button>

            <label htmlFor="product-search" className="text-xs font-semibold text-slate-600 mb-1">Buscar prendas</label>
            <input id="product-search" type="search" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Nombre, color o talle" className="w-full mb-2 px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400" />
            {productSearch && <p className="text-xs text-slate-500 mb-2" role="status">{matchingCount === 0 ? "No encontramos prendas. Probá con otra búsqueda." : `${matchingCount} de ${products.length} prendas`}</p>}

            {/* Product navigation cards (List or Grid/Mosaic Mode) */}
            {sidebarViewMode === "list" ? (
              <div className="space-y-1.5 overflow-y-auto flex-1 max-h-[380px] no-scrollbar pr-1">
                {products.map((p, idx) => {
                  if (!matchesProduct(p)) return null;
                  const isActive = p.id === activeProductId;
                  return (
                    <div
                      key={p.id}
                      data-product-index={idx}
                      onClick={() => handleSelectProduct(p.id)}
                      draggable
                      onDragStart={() => handleProductDragStart(idx)}
                      onDragOver={(e) => handleProductDragOver(e, idx)}
                      onDrop={(e) => handleProductDrop(e, idx)}
                      onDragEnd={handleProductDragEnd}
                      className={`group p-2 flex items-center justify-between gap-2 cursor-pointer rounded-xl border transition-all ${
                        isActive
                          ? "bg-blue-50/75 border-blue-200 shadow-xs"
                          : "bg-white border-slate-150 hover:bg-slate-50/50 hover:border-slate-300"
                      } ${draggedProductIdx === idx ? "opacity-40 border-dashed border-blue-400" : ""}`}
                    >
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        {/* Position badge & Up/Down Sorting Buttons */}
                        <div className="flex items-center space-x-1 flex-shrink-0 border-r border-slate-100 pr-1.5 mr-0.5">
                          <span
                            className={`text-[9px] font-black font-mono w-5 h-5 rounded-md flex items-center justify-center ${
                              idx === 0
                                ? "bg-emerald-500 text-white"
                                : isActive
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                            title={`Posición #${idx + 1}`}
                          >
                            #{idx + 1}
                          </span>
                          <div className="flex flex-col items-center">
                            <button
                              onClick={(e) => moveProductUp(idx, e)}
                              disabled={idx === 0}
                              className="p-0.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                              title="Subir"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => moveProductDown(idx, e)}
                              disabled={idx === products.length - 1}
                              className="p-0.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                              title="Bajar"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="w-8.5 h-8.5 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0">
                          <img src={p.images[0]} className="w-full h-full object-cover select-none pointer-events-none" alt="" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className={`text-xs font-bold truncate ${isActive ? "text-blue-900" : "text-slate-700"}`}>
                            {p.title || "Sin título"}
                          </h3>
                          <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
                            {settings.currency}{p.retailPrice.toLocaleString('es-AR')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleDeleteProduct(p.id, e)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Inline Mosaic Grid in Sidebar */
              <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1 max-h-[380px] no-scrollbar pr-1">
                {products.map((p, idx) => {
                  if (!matchesProduct(p)) return null;
                  const isActive = p.id === activeProductId;
                  return (
                    <div
                      key={p.id}
                      data-product-index={idx}
                      onClick={() => handleSelectProduct(p.id)}
                      draggable
                      onDragStart={() => handleProductDragStart(idx)}
                      onDragOver={(e) => handleProductDragOver(e, idx)}
                      onDrop={(e) => handleProductDrop(e, idx)}
                      onDragEnd={handleProductDragEnd}
                      className={`group relative p-2 flex flex-col justify-between cursor-pointer rounded-xl border transition-all ${
                        isActive
                          ? "bg-blue-50/75 border-blue-400 shadow-xs ring-1 ring-blue-300"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs"
                      } ${draggedProductIdx === idx ? "opacity-40 border-dashed border-blue-400" : ""}`}
                    >
                      {/* Badge # */}
                      <span
                        className={`absolute top-1.5 left-1.5 text-[9px] font-black font-mono px-1.5 py-0.2 rounded-md shadow-xs z-10 ${
                          idx === 0
                            ? "bg-emerald-500 text-white"
                            : isActive
                            ? "bg-blue-600 text-white"
                            : "bg-slate-900/80 text-white"
                        }`}
                      >
                        #{idx + 1}
                      </span>

                      {/* Image Thumbnail */}
                      <div className="w-full aspect-square rounded-lg overflow-hidden bg-slate-50 border border-slate-100 mb-1.5 flex items-center justify-center">
                        <img src={p.images[0]} className="w-full h-full object-cover select-none pointer-events-none" alt="" />
                      </div>

                      <h3 className={`text-[11px] font-bold truncate ${isActive ? "text-blue-900" : "text-slate-700"}`}>
                        {p.title || "Sin título"}
                      </h3>
                      <p className="text-[9.5px] text-slate-400 font-semibold font-mono">
                        {settings.currency}{p.retailPrice.toLocaleString('es-AR')}
                      </p>

                      {/* Micro reordering arrows */}
                      <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-100">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveProductToStart(idx);
                            }}
                            disabled={idx === 0}
                            className="p-0.5 rounded text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:pointer-events-none"
                            title="Al inicio (#1)"
                          >
                            <ChevronsLeft className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => moveProductUp(idx, e)}
                            disabled={idx === 0}
                            className="p-0.5 rounded text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:pointer-events-none"
                            title="Mover anterior"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => moveProductDown(idx, e)}
                            disabled={idx === products.length - 1}
                            className="p-0.5 rounded text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:pointer-events-none"
                            title="Mover siguiente"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={(e) => handleDeleteProduct(p.id, e)}
                          className="p-0.5 text-slate-300 hover:text-rose-600 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-4 mt-auto border-t border-slate-100 grid grid-cols-2 gap-2">
              <button
                onClick={handleRestoreDefaults}
                className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-[10px] font-bold text-slate-500 rounded-lg transition-colors border border-slate-200/40"
              >
                Restaurar Ejemplos
              </button>
              <button
                onClick={handleClearCatalog}
                className="py-1.5 px-2 bg-rose-50/50 hover:bg-rose-50 text-[10px] font-bold text-rose-600 rounded-lg transition-colors border border-rose-100/30"
              >
                Vaciar Catálogo
              </button>
            </div>
          </div>
        </section>

        {/* MIDDLE COLUMN: Active Product Editor Form (lg:col-span-4) */}
        <section id="editor-panel" className="lg:col-span-5 min-w-0 flex flex-col space-y-5 lg:overflow-y-auto lg:max-h-[calc(100vh-110px)] h-auto">
          {activeProduct ? (
            <div className="bg-white rounded-3xl p-5 md:p-6 shadow-xs border border-slate-200/60 flex-1 space-y-5">
              
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-3">
                <img src={christmasCover} alt="" className="w-14 h-20 object-cover rounded-lg" />
                <div className="flex-1">
                  <label className="flex items-center gap-2 text-sm font-bold text-emerald-900 cursor-pointer">
                    <input type="checkbox" checked={!!activeProduct.isChristmasCapsule} onChange={(e) => updateActiveProduct("isChristmasCapsule", e.target.checked)} className="w-4 h-4 accent-emerald-700" />
                    ✦ Cápsula Navideña
                  </label>
                  <p className="text-xs text-emerald-800 mt-1">Marcá las prendas de la colección y ordenalas juntas. La portada aparecerá antes de cada grupo navideño.</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">
                      Editando Prenda
                    </span>
                    {(() => {
                      const currentIdx = products.findIndex((p) => p.id === activeProduct.id);
                      if (currentIdx === -1) return null;
                      return (
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                          #{currentIdx + 1} de {products.length}
                          {currentIdx === 0 && <span className="text-emerald-600 font-extrabold">(Portada)</span>}
                        </span>
                      );
                    })()}
                  </div>
                  <h2 className="text-base font-extrabold font-display text-slate-900 tracking-tight">{activeProduct.title || "Nueva Prenda"}</h2>
                </div>

                <div className="flex items-center space-x-1.5 flex-wrap">
                  {/* Quick move controls for currently active product */}
                  {(() => {
                    const currentIdx = products.findIndex((p) => p.id === activeProduct.id);
                    if (currentIdx === -1) return null;
                    return (
                      <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200/80 p-0.5 rounded-lg">
                        <button
                          onClick={(e) => moveProductToStart(currentIdx, e)}
                          disabled={currentIdx === 0}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:pointer-events-none"
                          title="Mover al inicio (#1)"
                        >
                          <ChevronsLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => moveProductUp(currentIdx, e)}
                          disabled={currentIdx === 0}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:pointer-events-none"
                          title="Subir posición"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => moveProductDown(currentIdx, e)}
                          disabled={currentIdx === products.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:pointer-events-none"
                          title="Bajar posición"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => moveProductToEnd(currentIdx, e)}
                          disabled={currentIdx === products.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:pointer-events-none"
                          title="Mover al final"
                        >
                          <ChevronsRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })()}

                  <button
                    onClick={() => setIsReorderModalOpen(true)}
                    className="py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10.5px] rounded-lg transition-colors border border-blue-200/60 flex items-center space-x-1 cursor-pointer"
                    title="Organizar todas las prendas en mosaico"
                  >
                    <LayoutGrid className="w-3 h-3" />
                    <span>Mosaico</span>
                  </button>

                  <button
                    onClick={(e) => handleDuplicateProduct(activeProduct, e)}
                    className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-[10.5px] rounded-lg transition-colors border border-slate-200/50 cursor-pointer"
                  >
                    Duplicar
                  </button>
                </div>
              </div>

              {/* Title input */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Título del Producto</label>
                <input
                  type="text"
                  value={activeProduct.title}
                  onChange={(e) => updateActiveProduct("title", e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-800"
                  placeholder="Ej: Auriculares WavePro ANC"
                />
              </div>

              {/* Dual Prices input with automatic formula block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Precio Minorista</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      {settings.currency}
                    </span>
                    <input
                      type="number"
                      value={activeProduct.retailPrice || ""}
                      onChange={(e) => updateActiveProduct("retailPrice", Number(e.target.value))}
                      className="w-full text-xs font-bold border border-slate-200 rounded-xl pl-8 pr-3.5 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-800 font-mono"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Precio Mayorista (Calculado)</label>
                  <div className="relative bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-500">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span className="font-bold font-mono">
                        {settings.currency}{Math.round(activeProduct.retailPrice / 2).toLocaleString("es-AR")}
                      </span>
                    </div>
                    <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                      50% Desct.
                    </span>
                  </div>
                  <p className="text-[9.5px] text-slate-400 mt-1">Calculado automáticamente como la mitad del precio minorista.</p>
                </div>
              </div>

              {/* Description input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-500 block">Descripción del Producto</label>
                  {activeProduct && (
                    <button
                      type="button"
                      onClick={improveDescriptionWithAI}
                      disabled={isOptimizingDesc}
                      className="flex items-center space-x-1.5 text-[10px] font-extrabold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:bg-slate-50 disabled:text-slate-400 px-2.5 py-1.5 rounded-xl transition-all border border-blue-100/30 shadow-xs cursor-pointer"
                    >
                      {isOptimizingDesc ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                          <span>Mejorando...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-blue-500" />
                          <span>Mejorar con IA</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <textarea
                  value={activeProduct.description}
                  onChange={(e) => updateActiveProduct("description", e.target.value)}
                  rows={4}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-800 leading-relaxed"
                  placeholder="Detalles sobre el producto, medidas, colores disponibles, materiales..."
                />
                {descAiError && (
                  <p className="text-[10px] text-red-500 font-semibold mt-1.5 bg-red-50/80 border border-red-100/60 px-3 py-1.5 rounded-xl">
                    ⚠️ {descAiError}
                  </p>
                )}
              </div>

              {/* Opción Tipo de Producto / Canal de Venta */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div>
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                    ¿Dónde se procesa el pedido de este producto?
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Define si el cliente realiza el pedido a través de este catálogo (por curvas/unidades) o en tu tienda virtual externa.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Opción 1: Producto Nuevo (Catálogo) */}
                  <button
                    type="button"
                    onClick={() => updateActiveProduct("isExistingInStore", false)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      !activeProduct.isExistingInStore
                        ? "bg-white border-blue-500 ring-2 ring-blue-100 shadow-xs"
                        : "bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        !activeProduct.isExistingInStore ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"
                      }`}>
                        {!activeProduct.isExistingInStore && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-xs font-extrabold text-slate-800">
                        Producto Nuevo (Catálogo)
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-500 mt-1.5 pl-6 leading-relaxed">
                      El cliente pide por curva o unidades directamente en este catálogo y te envía el pedido por WhatsApp o Email.
                    </p>
                  </button>

                  {/* Opción 2: Ya existe en Tienda Virtual */}
                  <button
                    type="button"
                    onClick={() => updateActiveProduct("isExistingInStore", true)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      activeProduct.isExistingInStore
                        ? "bg-white border-blue-500 ring-2 ring-blue-100 shadow-xs"
                        : "bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        activeProduct.isExistingInStore ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"
                      }`}>
                        {activeProduct.isExistingInStore && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <span>Ya existe en Tienda Virtual</span>
                        <Globe className="w-3.5 h-3.5 text-blue-600" />
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-500 mt-1.5 pl-6 leading-relaxed">
                      Muestra toda la info al cliente y lo redirige con un botón directo para comprar en tu tienda online.
                    </p>
                  </button>
                </div>

                {/* Si ya existe en tienda virtual: Pedir Link con botón de prueba */}
                {activeProduct.isExistingInStore && (
                  <div className="pt-3 border-t border-slate-200/70 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                        <span>Link del Producto en tu Tienda Virtual</span>
                      </label>
                      {activeProduct.externalStoreUrl && (
                        <a
                          href={activeProduct.externalStoreUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10.5px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                        >
                          <span>Probar enlace</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <input
                      type="url"
                      value={activeProduct.externalStoreUrl || ""}
                      onChange={(e) => updateActiveProduct("externalStoreUrl", e.target.value)}
                      placeholder="https://mitienda.com/productos/nombre-de-la-prenda"
                      className="w-full text-xs font-semibold border border-blue-200 bg-blue-50/40 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-800 focus:bg-white"
                    />
                    <p className="text-[10px] text-slate-500">
                      💡 El cliente verá fotos, descripción, talles y colores en el catálogo, pero el botón de compra lo llevará a este enlace para pagar en tu tienda virtual.
                    </p>
                  </div>
                )}
              </div>

              {/* Talles y Colores inputs condicionales */}
              {!activeProduct.isExistingInStore ? (
                // Producto Nuevo: dejar todo como está (talles disponibles, cantidad de talles, colores disponibles)
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Talles Disponibles</label>
                    <input
                      type="text"
                      value={activeProduct.sizes || ""}
                      onChange={(e) => updateActiveProduct("sizes", e.target.value)}
                      className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-800"
                      placeholder="Ej: S al XL, o 36 al 44"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Cantidad de Talles (Curva)</label>
                    <input
                      type="number"
                      min="1"
                      value={activeProduct.sizesCount ?? ""}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        updateActiveProduct("sizesCount", isNaN(val) ? undefined : val);
                      }}
                      className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-800"
                      placeholder="Por defecto se calcula de los talles"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Colores Disponibles</label>
                    <input
                      type="text"
                      value={activeProduct.colors || ""}
                      onChange={(e) => updateActiveProduct("colors", e.target.value)}
                      className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-800"
                      placeholder="Ej: Negro, Blanco, Azul"
                    />
                  </div>
                </div>
              ) : (
                // Producto en Tienda Virtual: preguntame talles disponibles y colores disponibles
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Talles Disponibles</label>
                    <input
                      type="text"
                      value={activeProduct.sizes || ""}
                      onChange={(e) => updateActiveProduct("sizes", e.target.value)}
                      className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-800"
                      placeholder="Ej: S al XL, o 36 al 44"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Colores Disponibles</label>
                    <input
                      type="text"
                      value={activeProduct.colors || ""}
                      onChange={(e) => updateActiveProduct("colors", e.target.value)}
                      className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-800"
                      placeholder="Ej: Negro, Blanco, Azul"
                    />
                  </div>
                </div>
              )}

              {/* Image Uploader & Thumbnail list */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 block">Fotos del Producto (Variantes)</label>

                {/* Drag n drop box */}
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    dragOver
                      ? "border-blue-500 bg-blue-50/50"
                      : "border-slate-200 hover:border-blue-400 hover:bg-slate-50/50"
                  }`}
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={onFileChange}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 text-slate-400 mb-2.5 stroke-[1.5]" />
                  <p className="text-xs font-bold text-slate-700">Arrastra fotos aquí o haz clic para subir</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Soporta PNG, JPG, WEBP. Puedes subir varias de una vez.</p>
                </div>

                {/* Image Thumbnails Manage Area */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Imágenes Subidas ({activeProduct.images.length}) <span className="text-blue-500 font-semibold normal-case ml-1.5">• Reordená y configurá las fotos</span>
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {activeProduct.images.map((img, index) => {
                      const isMain = index === 0;
                      return (
                        <div
                          key={index}
                          data-image-index={index}
                          draggable
                          onDragStart={() => handleImageDragStart(index)}
                          onDragOver={(e) => handleImageDragOver(e, index)}
                          onDrop={(e) => handleImageDrop(e, index)}
                          onDragEnd={handleImageDragEnd}
                          className={`relative rounded-xl overflow-hidden aspect-square border transition-all ${
                            isMain ? "border-blue-400 shadow-sm" : "border-slate-100"
                          } ${draggedImageIdx === index ? "opacity-35 border-dashed border-blue-400 scale-95" : ""}`}
                        >
                          <img src={img} className="w-full h-full object-cover bg-slate-50 select-none pointer-events-none" alt="" />
                          
                          {/* Main badge overlay */}
                          {isMain && (
                            <span className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                              Principal
                            </span>
                          )}

                          {/* Navigation & Actions Overlay at bottom - ALWAYS visible, high-contrast & tap-friendly */}
                          <div className="absolute bottom-1.5 inset-x-1.5 flex items-center justify-between gap-1 z-10">
                            {/* Left/Right controls */}
                            <div className="flex items-center space-x-1 bg-white/90 backdrop-blur-xs p-0.5 rounded-lg shadow-sm">
                              <button
                                onClick={(e) => moveImageLeft(index, e)}
                                disabled={index === 0}
                                className="p-1 rounded-md text-slate-700 hover:text-blue-600 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                                title="Mover Izquierda"
                              >
                                <ArrowLeft className="w-3 h-3 stroke-[2.5]" />
                              </button>
                              <button
                                onClick={(e) => moveImageRight(index, e)}
                                disabled={index === activeProduct.images.length - 1}
                                className="p-1 rounded-md text-slate-700 hover:text-blue-600 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                                title="Mover Derecha"
                              >
                                <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                              </button>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center space-x-1 bg-white/90 backdrop-blur-xs p-0.5 rounded-lg shadow-sm">
                              {!isMain && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setAsPrimaryImage(index); }}
                                  className="p-1 rounded-md text-blue-600 hover:text-blue-700 transition-colors"
                                  title="Establecer Principal"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteProductImage(index); }}
                                className="p-1 rounded-md text-rose-600 hover:text-rose-700 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/60 flex flex-col items-center justify-center min-h-[400px]">
              <ImageIcon className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700">No hay productos seleccionados</p>
              <button
                onClick={handleAddProduct}
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md"
              >
                Crear Producto
              </button>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Interactive Smartphone / Device Live Preview (lg:col-span-4) */}
        <section id="preview-panel" className="lg:col-span-4 min-w-0 flex flex-col space-y-3.5 items-center">
          
          {/* Header Controls for simulator */}
          <div className="w-full flex items-center justify-between px-2 bg-slate-50 flex-wrap gap-2">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-slate-600" /> Vista Previa
              </span>

              {/* Quick page switcher tabs */}
              <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
                {hasSimCover && (
                  <button
                    onClick={() => setSimPageIndex(-1)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      simPageIndex === -1 ? "bg-blue-600 text-white shadow-2xs" : "text-slate-600 hover:bg-slate-50"
                    }`}
                    title="Ver Portada con Video"
                  >
                    <Video className="w-3 h-3" />
                    <span>Portada</span>
                  </button>
                )}
                <button
                  onClick={() => setSimPageIndex(0)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    simPageIndex >= 0 && simPageIndex < products.length
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                  title="Ver Prendas"
                >
                  <span>Prendas</span>
                </button>
                <button
                  onClick={() => setSimPageIndex(products.length)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    simPageIndex === products.length
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                  title="Ver Resumen de Pedido"
                >
                  <span>Resumen</span>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  className={`p-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                    previewDevice === "mobile" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"
                  }`}
                  title="Vista Celular"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">Celular</span>
                </button>
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={`p-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                    previewDevice === "desktop" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"
                  }`}
                  title="Vista Escritorio"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">Escritorio</span>
                </button>
              </div>


              <button
                onClick={() => setIsFullscreenDesktop(true)}
                className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all font-bold text-[10.5px] flex items-center space-x-1 shadow-xs cursor-pointer"
                title="Ampliar vista previa completa en computadora (PC)"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ampliar PC</span>
              </button>
            </div>
          </div>

          {/* SIMULATOR STAGE */}
          <div
            id="simulator-canvas"
            onTouchStart={handleSimTouchStart}
            onTouchEnd={handleSimTouchEnd}
            className={`transition-all duration-300 bg-slate-800 shadow-2xl overflow-hidden ${
              previewDevice === "mobile"
                ? "relative w-[340px] max-w-full h-[640px] rounded-[40px] border-[10px] border-slate-900"
                : "relative w-full max-w-[680px] h-[840px] rounded-2xl border-4 border-slate-700"
            } flex flex-col bg-slate-50`}
          >
            {/* Phone Speaker Notch details */}
            {previewDevice === "mobile" && (
              <div className="absolute top-0 inset-x-0 h-4 bg-slate-900 flex items-center justify-center z-50">
                <div className="w-16 h-2 bg-slate-800 rounded-full"></div>
              </div>
            )}

            {/* Inner App Container inside phone screen */}
            <div className={`flex-1 flex flex-col overflow-hidden bg-slate-100 ${previewDevice === "mobile" ? "pt-4" : ""}`}>
              
              {/* Slider screen simulator */}
              <div className="flex-1 relative overflow-hidden flex flex-col bg-white">
                
                {editorialPreview && <div className="absolute inset-0 z-[60] bg-black flex items-center justify-center"><img src={editorialPreview.image} alt="Vista previa de foto a pantalla completa" className="w-full h-full" style={{ objectFit: editorialPreview.fit || "cover" }} /><button type="button" onClick={() => setEditorialPreview(null)} className="absolute top-4 right-4 bg-white text-slate-900 rounded-full px-3 py-2 text-xs font-bold shadow">Cerrar vista</button></div>}
                {/* Floating Grid Button (Top-Left) */}
                {simPageIndex < products.length && (
                  <div className="absolute top-3 left-3 z-30">
                    <button
                      onClick={() => setIsSimGridViewOpen(true)}
                      className="w-8 h-8 rounded-full bg-white/95 shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 transition-all active:scale-90 animate-in fade-in"
                      title="Ver todos los productos"
                    >
                      <LayoutGrid className="w-4 h-4 stroke-[2]" />
                    </button>
                  </div>
                )}

                {/* Grid View Overlay in Simulator */}
                {isSimGridViewOpen && (
                  <div className="absolute inset-0 bg-white z-50 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
                    {/* Header of Grid View */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-150">
                      <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                        Productos Disponibles
                      </span>
                      <button
                        onClick={() => setIsSimGridViewOpen(false)}
                        className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Scrollable grid content */}
                    <div className="flex-1 overflow-y-auto p-2 sm:p-3 no-scrollbar bg-slate-50">
                      <div className={`grid gap-2 sm:gap-3 ${
                        previewDevice === "desktop"
                          ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
                          : "grid-cols-2 sm:grid-cols-3"
                      }`}>
                        {products.map((product, i) => {
                          const wholesalePrice = Math.round((product.retailPrice || 0) / 2);
                          return (
                            <div
                              key={product.id}
                              onClick={() => {
                                setSimPageIndex(i);
                                setIsSimGridViewOpen(false);
                              }}
                              className="bg-white border border-slate-200 rounded-xl p-2 cursor-pointer hover:border-blue-500 transition-all active:scale-[0.96] flex flex-col space-y-1.5 shadow-2xs hover:shadow-xs"
                            >
                              <div className="aspect-square w-full rounded-lg overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center p-1">
                                <img
                                  src={product.images[0] || ""}
                                  alt={product.title}
                                  className="max-w-full max-h-full object-contain"
                                />
                              </div>
                              <div className="flex flex-col flex-1 min-h-[32px] justify-between">
                                <h5 className="text-[10px] sm:text-xs font-bold text-slate-800 line-clamp-2 leading-snug">
                                  {product.title || "Producto"}
                                </h5>
                                <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                                  <span className="text-[10px] sm:text-xs font-black text-green-600 font-mono">
                                    {settings.currency}{wholesalePrice.toLocaleString("es-AR")}
                                  </span>
                                  <span className="text-[7px] sm:text-[8px] font-extrabold text-slate-400 bg-slate-100 px-1 py-0.5 rounded uppercase">
                                    Mayorista
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {simPageIndex === products.length ? (
                  // SUMMARY PAGE IN SIMULATOR
                  <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar p-3.5 justify-between">
                    <div className="space-y-4">
                      {/* Summary page header */}
                      <div className={coverType === "christmas" ? "text-center rounded-xl border-t-[3px] border-[#dba73c] bg-gradient-to-b from-[#fff8f4] to-white p-2" : "text-center"}>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-bold uppercase tracking-wider mb-1 ${
                            previewDevice === "desktop" ? "text-[10px]" : "text-[8.5px]"
                          }`}
                          style={{
                            backgroundColor: `${settings.themeColor}15`,
                            color: settings.themeColor
                          }}
                        >
                          Paso Final
                        </span>
                        <h4 className={`font-extrabold font-display text-slate-800 tracking-tight leading-snug ${
                          previewDevice === "desktop" ? "text-lg" : "text-sm"
                        }`}>
                          Resumen de tu Pedido
                        </h4>
                        {coverType === "christmas" && <ChristmasDetail />}
                      </div>

                      {/* Summary Calculations */}
                      {(() => {
                        let grandTotalItems = 0;
                        let grandTotalPrice = 0;
                        const orderItems: Array<{
                          product: Product;
                          variants: Record<string, number>;
                          variantsNotes: string;
                          units: number;
                          totalGarments: number;
                          subtotal: number;
                        }> = [];

                        products.forEach(product => {
                          const state = simOrders[product.id];
                          if (!state) return;
                          
                          const sizeCount = getSimProductSizesCount(product);
                          let curvesCount = 0;
                          for (const color in state.variants) {
                            curvesCount += state.variants[color] || 0;
                          }
                          const unitsCount = state.units || 0;
                          const totalGarments = (curvesCount * sizeCount) + unitsCount;
                          if (totalGarments > 0) {
                            const wholesalePrice = Math.round(product.retailPrice / 2);
                            const subtotal = totalGarments * wholesalePrice;
                            grandTotalItems += totalGarments;
                            grandTotalPrice += subtotal;
                            orderItems.push({
                              product,
                              variants: state.variants,
                              variantsNotes: state.variantsNotes || "",
                              units: unitsCount,
                              totalGarments,
                              subtotal
                            });
                          }
                        });

                        const buildSimTextMessage = () => {
                          let text = '🛒 *NUEVO PEDIDO DESDE EL CATÁLOGO*\n';
                          text += '━━━━━━━━━━━━━━━━━━━━━━━━\n';
                          text += `👤 *Cliente:* ${customerName.trim() || 'No especificado'}\n`;
                          if (customerEmail.trim()) text += `📧 *Email:* ${customerEmail.trim()}\n`;
                          if (customerPhone.trim()) text += `📞 *Teléfono:* ${customerPhone.trim()}\n`;
                          text += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
                          
                          if (customerNotes.trim()) {
                            text += `📝 *Observaciones de talles:* ${customerNotes.trim()}\n`;
                            text += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
                          }
                          
                          orderItems.forEach(item => {
                            const wholesalePrice = Math.round(item.product.retailPrice / 2);
                            
                            text += `📦 *${item.product.title}*\n`;
                            const variantLines: string[] = [];
                            Object.entries(item.variants).forEach(([color, qty]) => {
                              if (qty > 0) {
                                variantLines.push(`${qty} curvas (${color})`);
                              }
                            });
                            if (variantLines.length > 0) {
                              text += `  • Curvas: ${variantLines.join(', ')}\n`;
                            }
                            if (item.units > 0) {
                              text += `  • Unidades adicionales: ${item.units} un.\n`;
                            }
                            if (item.variantsNotes.trim()) {
                              text += `  • Talle y color de cada unidad: ${item.variantsNotes.trim()}\n`;
                            }
                            text += `  _Subtotal: ${settings.currency || '$'}${item.subtotal.toLocaleString('es-AR')}_\n\n`;
                          });
                          
                          text += '━━━━━━━━━━━━━━━━━━━━━━━━\n';
                          text += `🔥 *TOTAL PRENDAS:* ${grandTotalItems} prendas\n`;
                          text += `💰 *TOTAL MAYORISTA:* ${settings.currency || '$'}${grandTotalPrice.toLocaleString('es-AR')}\n`;
                          text += '━━━━━━━━━━━━━━━━━━━━━━━━\n';
                          text += `Generado desde el catálogo interactivo de: ${settings.storeName}`;
                          return text;
                        };

                        const triggerSimWhatsapp = () => {
                          try {
                            if (grandTotalItems === 0) {
                              alert("No has seleccionado ningún producto. Por favor agrega curvas o unidades a tu pedido antes de enviarlo.");
                              return;
                            }
                            const cleanNumber = (settings.whatsappNumber || "").replace(/[^0-9]/g, "");
                            if (!cleanNumber) {
                              alert("Este catálogo no tiene un número de WhatsApp configurado en los ajustes para recibir pedidos.");
                              return;
                            }
                            const msg = buildSimTextMessage();
                            const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`;
                            const newWin = window.open(url, "_blank");
                            if (!newWin || newWin.closed || typeof newWin.closed === "undefined") {
                              window.location.href = url;
                            }
                          } catch (err: any) {
                            alert("Ocurrió un error al intentar enviar por WhatsApp: " + (err?.message || err));
                          }
                        };

                        const triggerSimEmail = () => {
                          try {
                            if (grandTotalItems === 0) {
                              alert("No has seleccionado ningún producto. Por favor agrega curvas o unidades a tu pedido antes de enviarlo.");
                              return;
                            }
                            const contactEmail = (settings.contactEmail || "").trim();
                            if (!contactEmail) {
                              alert("Este catálogo no tiene un correo de contacto configurado en los ajustes para recibir pedidos.");
                              return;
                            }
                            const msg = buildSimTextMessage();
                            const subject = `Nuevo Pedido - ${settings.storeName}`;
                            const mailtoUrl = `mailto:${encodeURIComponent(contactEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;
                            
                            const a = document.createElement("a");
                            a.href = mailtoUrl;
                            a.style.display = "none";
                            document.body.appendChild(a);
                            a.click();
                            setTimeout(() => {
                              if (document.body && document.body.contains(a)) {
                                document.body.removeChild(a);
                              }
                            }, 1000);
                          } catch (err: any) {
                            alert("Ocurrió un error al intentar enviar por Email: " + (err?.message || err));
                          }
                        };

                        if (orderItems.length === 0) {
                          return (
                            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-4 space-y-3">
                              <ShoppingBag className="w-12 h-12 text-slate-300" />
                              <h5 className="font-extrabold text-slate-700 text-sm">Tu pedido está vacío</h5>
                              <p className="text-slate-400 text-[11px] leading-relaxed">
                                Regresa a los productos anteriores y agrega curvas o variantes de color para completar tu pedido.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-4">
                            {/* Scrollable list */}
                            <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar">
                              {orderItems.map((item, idx) => {
                                const wholesalePrice = Math.round(item.product.retailPrice / 2);
                                const detailText: string[] = [];
                                Object.entries(item.variants).forEach(([color, qty]) => {
                                  if (qty > 0) {
                                    detailText.push(`${qty} curvas (${color})`);
                                  }
                                });
                                if (item.units > 0) {
                                  detailText.push(`${item.units} un.`);
                                }

                                return (
                                  <div key={idx} className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl text-left space-y-0.5">
                                    <div className="flex justify-between font-extrabold text-slate-800 text-xs">
                                      <span className="truncate max-w-[160px]">{item.product.title}</span>
                                      <span>{settings.currency}{item.subtotal.toLocaleString("es-AR")}</span>
                                    </div>
                                    <div className="text-[9.5px] text-slate-500 font-medium">
                                      {detailText.join(", ")} ({item.totalGarments} pr. x {settings.currency}{wholesalePrice.toLocaleString("es-AR")})
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Totals Card */}
                            <div className="bg-green-50 border border-green-200 rounded-xl p-2.5 flex justify-between items-center text-left">
                              <div>
                                <span className="text-[8px] font-extrabold text-green-700 uppercase tracking-wider block">Total del Pedido</span>
                                <span className="text-[10.5px] text-green-600 font-bold">{grandTotalItems} prendas</span>
                              </div>
                              <span className="font-display font-black text-green-700 text-base">
                                {settings.currency}{grandTotalPrice.toLocaleString("es-AR")}
                              </span>
                            </div>

                            {/* Contact Inputs */}
                            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-2.5 space-y-2 text-left">
                              <div>
                                <label className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">Tu Nombre / Negocio</label>
                                <input
                                  type="text"
                                  value={customerName}
                                  onChange={e => setCustomerName(e.target.value)}
                                  placeholder="Ej: Juan Pérez o Boutique"
                                  className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">Tu Correo Electrónico (Opcional)</label>
                                <input
                                  type="email"
                                  value={customerEmail}
                                  onChange={e => setCustomerEmail(e.target.value)}
                                  placeholder="Ej: cliente@correo.com"
                                  className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">Tu Teléfono / Celular</label>
                                <input
                                  type="text"
                                  value={customerPhone}
                                  onChange={e => setCustomerPhone(e.target.value)}
                                  placeholder="Ej: +54911..."
                                  className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">Observaciones de talles</label>
                                <textarea
                                  value={customerNotes}
                                  onChange={e => setCustomerNotes(e.target.value)}
                                  placeholder="Ej: Jean azul en talle 40, remera roja en S..."
                                  rows={2}
                                  className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-blue-500 resize-none leading-normal"
                                />
                              </div>
                            </div>

                            {/* Dispatch buttons */}
                            <div className="flex flex-col gap-1.5 pt-2">
                              <button
                                onClick={triggerSimWhatsapp}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11.5px] py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
                                style={coverType === "christmas" ? { backgroundColor: "#267447" } : undefined}
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Mandar Pedido por WhatsApp {coverType === "christmas" && <span aria-hidden="true" className="text-amber-200">✦</span>}
                              </button>
                              <button
                                onClick={triggerSimEmail}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11.5px] py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
                                style={coverType === "christmas" ? { backgroundColor: "#a92e38" } : undefined}
                              >
                                <Mail className="w-3.5 h-3.5" />
                                Mandar Pedido por Email {coverType === "christmas" && <span aria-hidden="true" className="text-amber-200">✦</span>}
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : simPageIndex === -1 && hasSimCover ? (
                  renderCoverPage(false)
                ) : currentSimProduct ? (
                  // PRODUCT SLIDE IN SIMULATOR
                  <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar p-3 justify-between">
                    <div className="space-y-3">
                      
                      {/* Product page header indicator */}
                      <div className={currentSimProduct.isChristmasCapsule ? "text-center rounded-xl border-t-[3px] border-[#dba73c] bg-gradient-to-b from-[#fff8f4] to-white px-2 pt-2 pb-1.5" : "text-center"}>
                        <div className="flex items-center justify-center gap-1.5 mb-1 flex-wrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              previewDevice === "desktop" ? "text-[10px]" : "text-[8.5px]"
                            }`}
                            style={{
                              backgroundColor: `${settings.themeColor}15`,
                              color: settings.themeColor
                            }}
                          >
                            Producto {simPageIndex + 1} de {products.length}
                          </span>
                          {currentSimProduct.isChristmasCapsule && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-amber-300 text-[8px] font-bold">✦ Cápsula Navideña ✦</span>}
                          {currentSimProduct.isExistingInStore && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[8px] font-extrabold uppercase tracking-wide border border-blue-200">
                              <Globe className="w-2.5 h-2.5" />
                              <span>Tienda Online</span>
                            </span>
                          )}
                        </div>
                        <h4 className={`font-extrabold font-display text-slate-800 tracking-tight leading-snug ${
                          previewDevice === "desktop" ? "text-lg" : "text-sm"
                        }`}>
                          {currentSimProduct.title || "Sin título"}
                        </h4>
                        {currentSimProduct.isChristmasCapsule && <ChristmasDetail />}
                      </div>

                      {/* Main Image Screen */}
                      <div className={`relative aspect-square w-full mx-auto rounded-xl overflow-hidden bg-slate-50 border border-slate-100/60 shadow-2xs transition-all duration-300 ${
                        previewDevice === "desktop" ? "max-w-[420px]" : "max-w-[240px]"
                      }`}>
                        <img
                          src={currentSimProduct.images[currentSimProductActiveImageIdx] || currentSimProduct.images[0]}
                          className="w-full h-full object-contain bg-slate-50"
                          alt=""
                        />
                      </div>

                      {/* Variant thumbnails carousel */}
                      {currentSimProduct.images.length > 1 && (
                        <div className="space-y-1.5">
                          <span className={`font-extrabold text-slate-400 uppercase tracking-wider px-0.5 ${
                            previewDevice === "desktop" ? "text-[11px]" : "text-[8px]"
                          }`}>
                            Fotos Variantes ({currentSimProduct.images.length})
                          </span>
                          <div className="flex items-center space-x-2 overflow-x-auto pb-1.5 no-scrollbar">
                            {currentSimProduct.images.map((img, imgIdx) => (
                              <button
                                key={imgIdx}
                                onClick={() => setSimActiveImageForProduct(currentSimProduct.id, imgIdx)}
                                className={`flex-shrink-0 overflow-hidden border-2 transition-all hover:scale-105 ${
                                  previewDevice === "desktop" ? "w-20 h-20 rounded-xl" : "w-10 h-10 rounded-md"
                                } ${
                                  currentSimProductActiveImageIdx === imgIdx
                                    ? "border-blue-500 shadow-sm opacity-100"
                                    : "border-slate-200 opacity-75 hover:opacity-100"
                                }`}
                              >
                                <img src={img} className="w-full h-full object-cover" alt="" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Description Card */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <p className={`text-slate-500 leading-relaxed font-normal whitespace-pre-wrap ${
                          previewDevice === "desktop" ? "text-[11.5px]" : "text-[10px]"
                        }`}>
                          {currentSimProduct.description || "Sin descripción."}
                        </p>
                      </div>

                      {/* Sizes & Colors Specification block */}
                      {(currentSimProduct.sizes || currentSimProduct.colors) && (
                        <div className={`bg-slate-50/80 p-2.5 rounded-xl border border-slate-150 space-y-1.5 ${
                          previewDevice === "desktop" ? "text-[11px]" : "text-[9.5px]"
                        }`}>
                          {currentSimProduct.sizes && (
                            <div className="flex items-center justify-between gap-2">
                              <span className={`font-bold text-slate-400 uppercase tracking-wider shrink-0 ${
                                previewDevice === "desktop" ? "text-[9px]" : "text-[8px]"
                              }`}>Talles Disponibles</span>
                              <span className="font-semibold text-slate-700 truncate">{currentSimProduct.sizes}</span>
                            </div>
                          )}
                          {currentSimProduct.colors && (
                            <div className="flex items-center justify-between gap-2">
                              <span className={`font-bold text-slate-400 uppercase tracking-wider shrink-0 ${
                                previewDevice === "desktop" ? "text-[9px]" : "text-[8px]"
                              }`}>Colores Disponibles</span>
                              <span className="font-semibold text-slate-700 truncate" title={currentSimProduct.colors}>
                                {currentSimProduct.colors}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                    </div>

                    {/* Pricing Panel & Ordering Controls inside simulator */}
                    {(() => {
                      const productOrderState = simOrders[currentSimProduct.id] || { curves: 0, variants: {}, units: 0 };
                      const sizeCount = getSimProductSizesCount(currentSimProduct);
                      
                      // Parse colors list
                      let colorsList: string[] = ["Único"];
                      if (currentSimProduct.colors) {
                        const parsed = currentSimProduct.colors.split(/[,/]+/).map(c => c.trim()).filter(Boolean);
                        if (parsed.length > 0) {
                          colorsList = parsed;
                        }
                      }
                      
                      let curvesTotal = 0;
                      colorsList.forEach(color => {
                        curvesTotal += (productOrderState.variants || {})[color] || 0;
                      });
                      const pageTotalItems = (curvesTotal * sizeCount) + (productOrderState.units || 0);
                      const wholesalePrice = Math.round(currentSimProduct.retailPrice / 2);
                      const pageSubtotal = pageTotalItems * wholesalePrice;

                      return (
                        <div className="w-full pt-3 mt-4 border-t border-slate-100 space-y-3">
                          {/* Price Grid */}
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="bg-slate-50/70 p-1.5 rounded-lg border border-slate-100 text-center">
                              <span className={`font-bold text-slate-400 uppercase block ${
                                previewDevice === "desktop" ? "text-[9px]" : "text-[8px]"
                              }`}>Minorista</span>
                              <span className={`font-extrabold text-slate-800 font-mono ${
                                previewDevice === "desktop" ? "text-sm" : "text-xs"
                              }`}>
                                {settings.currency}{currentSimProduct.retailPrice.toLocaleString("es-AR")}
                              </span>
                            </div>
                            <div className="bg-green-100/90 p-1.5 rounded-lg border border-green-300 text-center shadow-xs">
                              <span className={`font-extrabold text-green-700 uppercase block tracking-wider ${
                                previewDevice === "desktop" ? "text-[9px]" : "text-[8px]"
                              }`}>Mayorista</span>
                              <span className={`font-black text-green-600 font-mono ${
                                previewDevice === "desktop" ? "text-[15px]" : "text-[13px]"
                              }`}>
                                {settings.currency}{wholesalePrice.toLocaleString("es-AR")}
                              </span>
                            </div>
                          </div>

                          {/* Conditional: Either Virtual Store Direct Link OR Wholesale Order Controls Card */}
                          {currentSimProduct.isExistingInStore ? (
                            <div className="bg-gradient-to-b from-blue-50/70 to-slate-50 border border-blue-200 rounded-xl p-3 text-center space-y-2.5 shadow-2xs">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[8.5px] font-black uppercase tracking-wide border border-blue-200/60">
                                <Store className="w-3 h-3 text-blue-600" />
                                <span>Disponible en Tienda Virtual</span>
                              </div>
                              <p className="text-[10px] text-slate-600 font-medium leading-relaxed px-1">
                                El pedido de esta prenda se realiza exclusivamente en la tienda virtual para chequear stock y medios de pago.
                              </p>
                              {currentSimProduct.externalStoreUrl ? (
                                <a
                                  href={currentSimProduct.externalStoreUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full py-2 px-3 text-white font-extrabold text-[11px] rounded-lg flex items-center justify-center space-x-1.5 transition-all shadow-xs active:scale-98 cursor-pointer"
                                  style={{ backgroundColor: settings.themeColor || "#2563eb" }}
                                >
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                  <span>Comprar en Tienda Virtual</span>
                                  <ExternalLink className="w-3 h-3 ml-0.5" />
                                </a>
                              ) : (
                                <div className="w-full py-2 px-3 bg-slate-200 text-slate-500 font-bold text-[10.5px] rounded-lg flex items-center justify-center space-x-1">
                                  <span>Configura el enlace de tu tienda</span>
                                </div>
                              )}
                              <span className="text-[8.5px] text-slate-400 font-medium block">
                                No se suma al carrito mayorista del catálogo.
                              </span>
                            </div>
                          ) : (
                            /* Order Controls Card normal para catálogo */
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 px-2.5 space-y-2 text-left">
                              {/* Variant picker (Colors) */}
                              <div className="space-y-1">
                                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Pedir por Curva Completa (por Color)
                                </span>
                                <div className="space-y-1">
                                  {colorsList.map((color, idx) => {
                                    const curvesCount = (productOrderState.variants || {})[color] || 0;
                                    return (
                                      <div key={idx} className="flex items-center justify-between gap-2">
                                        <div className="flex flex-col">
                                          <span className="text-[10px] font-semibold text-slate-600 leading-tight">{color}</span>
                                          {curvesCount > 0 && (
                                            <span className="text-[8px] text-slate-400 font-medium">
                                              {curvesCount * sizeCount} prendas
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center bg-white border border-slate-300 rounded-md p-0.5 shadow-2xs">
                                          <button
                                            onClick={() => updateSimVariantQty(currentSimProduct.id, color, -1)}
                                            className="w-5 h-5 rounded-sm bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 hover:bg-slate-200 active:scale-95"
                                          >
                                            -
                                          </button>
                                          <span className="w-7 text-center text-[10px] font-bold text-slate-800">
                                            {curvesCount} {curvesCount === 1 ? "curva" : "curvas"}
                                          </span>
                                          <button
                                            onClick={() => updateSimVariantQty(currentSimProduct.id, color, 1)}
                                            className="w-5 h-5 rounded-sm bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 hover:bg-slate-200 active:scale-95"
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Option for Units below curves */}
                              <div className="space-y-1 pt-1.5 border-t border-slate-200">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-700">Unidades</span>
                                    <span className="text-[8px] text-slate-400 font-medium">Prendas sueltas</span>
                                  </div>
                                  <div className="flex items-center bg-white border border-slate-300 rounded-md p-0.5 shadow-2xs">
                                    <button
                                      onClick={() => updateSimUnitsQty(currentSimProduct.id, -1)}
                                      className="w-5 h-5 rounded-sm bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 hover:bg-slate-200 active:scale-95"
                                    >
                                      -
                                    </button>
                                    <span className="w-7 text-center text-[10px] font-bold text-slate-800 font-mono">
                                      {productOrderState.units || 0}
                                    </span>
                                    <button
                                      onClick={() => updateSimUnitsQty(currentSimProduct.id, 1)}
                                      className="w-5 h-5 rounded-sm bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 hover:bg-slate-200 active:scale-95"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Talle y color de cada unidad observations */}
                              <div className="space-y-1 pt-1.5 border-t border-slate-200">
                                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Talle y color de cada unidad
                                </span>
                                <textarea
                                  value={productOrderState.variantsNotes || ""}
                                  onChange={e => updateSimVariantNotes(currentSimProduct.id, e.target.value)}
                                  placeholder="Ej: Rojo: talle 38 (x1), talle 40 (x2)..."
                                  rows={2}
                                  className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-[10px] font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none leading-normal"
                                />
                              </div>

                              {/* Page subtotal block */}
                              <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between text-[10px] text-slate-500 font-medium">
                                <span>Prendas: <strong className="text-slate-800 font-bold">{pageTotalItems}</strong></span>
                                <span>Subtotal: <strong className="text-slate-800 font-bold">{settings.currency}{pageSubtotal.toLocaleString("es-AR")}</strong></span>
                              </div>

                              {/* Direct Ver Carrito button */}
                              <button
                                type="button"
                                onClick={() => setSimPageIndex(products.length)}
                                className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition-all shadow-xs active:scale-98 cursor-pointer"
                                style={{ backgroundColor: coverType === "christmas" ? "#a92e38" : settings.themeColor }}
                              >
                                <ShoppingBag className="w-3.5 h-3.5" />
                                <span>Ver Carrito</span>
                                {coverType === "christmas" && <span aria-hidden="true" className="text-amber-200">✦</span>}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <p className="text-xs text-slate-400">No hay productos para previsualizar</p>
                  </div>
                )}

                {/* Left/Right Slider Arrow controls inside screen - perfectly aligned to image area with zero overlap for lower controls */}
                <div className="absolute top-[32%] -translate-y-1/2 left-2 z-20">
                  <button
                    onClick={handleSimPrevPage}
                    disabled={simPageIndex === minSimIndex}
                    className="w-7 h-7 rounded-full bg-white/95 shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:pointer-events-none transition-all active:scale-90"
                  >
                    <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
                <div className="absolute top-[32%] -translate-y-1/2 right-2 z-20">
                  <button
                    onClick={handleSimNextPage}
                    disabled={simPageIndex === products.length}
                    className="w-7 h-7 rounded-full bg-white/95 shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:pointer-events-none transition-all active:scale-90"
                  >
                    <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

              </div>

            </div>

          </div>

        </section>

      </main>



      {/* Fullscreen Desktop PC Preview Modal */}
      {isFullscreenDesktop && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="w-full max-w-[1240px] h-[92vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-wide text-white">Vista Previa Completa en Escritorio (PC)</h3>
                  <p className="text-[10px] text-slate-400">Así es exactamente como se ve la foto y el carrusel en una computadora de escritorio</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsPcMosaicOpen(!isPcMosaicOpen)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer ${
                    isPcMosaicOpen ? "bg-blue-600 text-white shadow-sm" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                  title="Ver todos los productos en cuadrícula mosaico"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>{isPcMosaicOpen ? "Ver Producto" : "Ver Mosaico (Todos)"}</span>
                </button>

                <button
                  onClick={() => {
                    setIsFullscreenDesktop(false);
                    setIsPcMosaicOpen(false);
                  }}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
                  title="Cerrar vista previa PC"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Full Desktop Catalog Simulator or Mosaic Grid */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex items-center justify-center">
              {isPcMosaicOpen ? (
                <div className="w-full max-w-[1180px] bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-4 my-auto">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-800">Mosaico Completo de Prendas ({products.length})</h3>
                      <p className="text-xs text-slate-500">Haz clic en cualquier prenda para verla en detalle</p>
                    </div>
                    <button
                      onClick={() => setIsPcMosaicOpen(false)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Volver a Vista Detallada
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[72vh] overflow-y-auto p-1.5 no-scrollbar">
                    {products.map((product, i) => {
                      const wholesalePrice = Math.round((product.retailPrice || 0) / 2);
                      return (
                        <div
                          key={product.id}
                          onClick={() => {
                            setSimPageIndex(i);
                            setIsPcMosaicOpen(false);
                          }}
                          className={`bg-white border rounded-2xl p-3 cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] flex flex-col space-y-2.5 shadow-2xs hover:shadow-lg ${
                            simPageIndex === i ? "border-blue-600 ring-4 ring-blue-100 shadow-md" : "border-slate-200/90 hover:border-blue-400"
                          }`}
                        >
                          <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center p-2">
                            <img
                              src={product.images[0] || ""}
                              alt={product.title}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          <div className="flex flex-col flex-1 justify-between space-y-1.5">
                            <h5 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 leading-tight">
                              {product.title || "Producto"}
                            </h5>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                              <div>
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Mayorista</span>
                                <span className="text-xs sm:text-sm font-black text-green-600 font-mono">
                                  {settings.currency}{wholesalePrice.toLocaleString("es-AR")}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] font-bold text-slate-400 block">Min. {settings.currency}{product.retailPrice.toLocaleString("es-AR")}</span>
                                <span className="text-[8px] font-extrabold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-md uppercase border border-green-200 inline-block">
                                  May. 50%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : simPageIndex === -1 && hasSimCover ? (
                renderCoverPage(true)
              ) : currentSimProduct ? (
                <div className="w-full max-w-[1180px] bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto">
                  
                  {/* Left Column: Product Photo & Variants Carousel */}
                  <div className="lg:col-span-7 flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <span
                        className="inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: `${settings.themeColor}15`,
                          color: settings.themeColor
                        }}
                      >
                        Producto {simPageIndex + 1} de {products.length}
                      </span>

                      <button
                        onClick={() => setIsPcMosaicOpen(true)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Ver Mosaico</span>
                      </button>
                    </div>

                    {currentSimProduct.isChristmasCapsule && <span className="self-start px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-amber-300 text-xs font-bold">✦ Cápsula Navideña ✦</span>}
                    <h2 className="text-2xl font-black text-slate-900 font-display">
                      {currentSimProduct.title || "Sin título"}
                    </h2>
                    {currentSimProduct.isChristmasCapsule && <ChristmasDetail />}

                    {/* Huge Product Image Container */}
                    <div className="relative aspect-square w-full max-h-[500px] min-h-[320px] mx-auto rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-xs flex items-center justify-center p-3">
                      <img
                        src={currentSimProduct.images[currentSimProductActiveImageIdx] || currentSimProduct.images[0]}
                        className="max-w-full max-h-full object-contain"
                        alt=""
                      />
                    </div>

                    {/* Large Variant Thumbnails Carousel */}
                    {currentSimProduct.images.length > 1 && (
                      <div className="space-y-2 pt-1">
                        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
                          Variantes de Foto ({currentSimProduct.images.length})
                        </span>
                        <div className="flex items-center space-x-3.5 overflow-x-auto pb-2.5 no-scrollbar">
                          {currentSimProduct.images.map((img, imgIdx) => (
                            <button
                              key={imgIdx}
                              onClick={() => setSimActiveImageForProduct(currentSimProduct.id, imgIdx)}
                              className={`flex-shrink-0 w-22 h-22 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2.5 transition-all cursor-pointer ${
                                currentSimProductActiveImageIdx === imgIdx
                                  ? "border-blue-600 ring-4 ring-blue-100 shadow-md scale-[1.03]"
                                  : "border-slate-200 opacity-75 hover:opacity-100 hover:scale-[1.03]"
                              }`}
                            >
                              <img src={img} className="w-full h-full object-cover" alt="" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">Descripción</h4>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {currentSimProduct.description || "Sin descripción."}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Pricing & Order Controls */}
                  <div className="lg:col-span-5 flex flex-col space-y-5 justify-between">
                    {/* Prices */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                        <span className="text-xs font-bold text-slate-400 uppercase block mb-0.5">Minorista</span>
                        <span className="text-base font-extrabold text-slate-800 font-mono">
                          {settings.currency}{currentSimProduct.retailPrice.toLocaleString("es-AR")}
                        </span>
                      </div>
                      <div className="bg-green-50 p-3 rounded-xl border border-green-200 text-center shadow-xs">
                        <span className="text-xs font-extrabold text-green-700 uppercase block mb-0.5">Mayorista</span>
                        <span className="text-xl font-black text-green-600 font-mono">
                          {settings.currency}{Math.round(currentSimProduct.retailPrice / 2).toLocaleString("es-AR")}
                        </span>
                      </div>
                    </div>

                    {/* Specifications */}
                    {(currentSimProduct.sizes || currentSimProduct.colors) && (
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                        {currentSimProduct.sizes && (
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-400 uppercase">Talles:</span>
                            <span className="font-semibold text-slate-800">{currentSimProduct.sizes}</span>
                          </div>
                        )}
                        {currentSimProduct.colors && (
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-400 uppercase">Colores:</span>
                            <span className="font-semibold text-slate-800">{currentSimProduct.colors}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ordering box or Virtual Store Link */}
                    {currentSimProduct.isExistingInStore ? (
                      <div className="bg-gradient-to-b from-blue-50/70 to-slate-50 border border-blue-200 rounded-2xl p-5 text-center space-y-3 shadow-xs">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-black uppercase tracking-wide border border-blue-200/70">
                          <Store className="w-3.5 h-3.5 text-blue-600" />
                          <span>Disponible en Tienda Virtual</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-sm mx-auto">
                          El pedido de este producto se tramita en nuestra tienda virtual externa.
                        </p>
                        {currentSimProduct.externalStoreUrl ? (
                          <a
                            href={currentSimProduct.externalStoreUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3 px-4 text-white font-extrabold text-sm rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md active:scale-98 cursor-pointer"
                            style={{ backgroundColor: settings.themeColor || "#2563eb" }}
                          >
                            <ShoppingBag className="w-4 h-4" />
                            <span>Comprar en Tienda Virtual</span>
                            <ExternalLink className="w-3.5 h-3.5 ml-1" />
                          </a>
                        ) : (
                          <div className="w-full py-2.5 px-3 bg-slate-200 text-slate-500 font-bold text-xs rounded-xl">
                            Configura el enlace de tu tienda en el editor
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                          Pedir por Curva Completa (por Color)
                        </span>
                        {/* Color curves list */}
                        <div className="space-y-2">
                          {(() => {
                            let colorsList: string[] = ["Único"];
                            if (currentSimProduct.colors) {
                              const parsed = currentSimProduct.colors.split(/[,/]+/).map(c => c.trim()).filter(Boolean);
                              if (parsed.length > 0) colorsList = parsed;
                            }
                            const productOrderState = simOrders[currentSimProduct.id] || { curves: 0, variants: {}, units: 0 };

                            return colorsList.map((color, idx) => {
                              const curvesCount = (productOrderState.variants || {})[color] || 0;
                              return (
                                <div key={idx} className="flex items-center justify-between gap-3 bg-white p-2 rounded-xl border border-slate-200">
                                  <span className="text-xs font-bold text-slate-700">{color}</span>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => updateSimVariantQty(currentSimProduct.id, color, -1)}
                                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-extrabold text-sm text-slate-700 cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <span className="w-16 text-center text-xs font-bold text-slate-800">
                                      {curvesCount} {curvesCount === 1 ? "curva" : "curvas"}
                                    </span>
                                    <button
                                      onClick={() => updateSimVariantQty(currentSimProduct.id, color, 1)}
                                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-extrabold text-sm text-slate-700 cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setIsFullscreenDesktop(false)}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Volver al Creador
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Visual Garment Reordering Mosaic Modal */}
      <ProductReorderModal
        isOpen={isReorderModalOpen}
        onClose={() => setIsReorderModalOpen(false)}
        products={products}
        onReorder={reorderProductsList}
        activeProductId={activeProductId}
        onSelectProduct={(id) => {
          handleSelectProduct(id);
        }}
        settings={settings}
      />
    </div>
  );
}
