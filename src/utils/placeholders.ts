import { Product, CatalogSettings } from "../types";

// Helper to safely encode SVG to data URI
const svgToDataUri = (svgMarkup: string): string => {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
};

export const getHeadphonesSvg = (
  accentColor: string,
  cushionColor: string,
  bgStart: string,
  bgEnd: string
): string => {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgStart}" />
        <stop offset="100%" stop-color="${bgEnd}" />
      </linearGradient>
      <linearGradient id="bandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#475569" />
        <stop offset="100%" stop-color="#1e293b" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" flood-opacity="0.3"/>
      </filter>
    </defs>
    <rect width="100%" height="100%" rx="24" fill="url(#bgGrad)" />
    
    <!-- Outer Headband -->
    <path d="M 100 200 A 100 100 0 0 1 300 200" fill="none" stroke="url(#bandGrad)" stroke-width="14" stroke-linecap="round" filter="url(#shadow)" />
    <!-- Inner Headband Accent -->
    <path d="M 115 190 A 85 85 0 0 1 285 190" fill="none" stroke="${accentColor}" stroke-width="2" opacity="0.4" />

    <!-- Left Connector -->
    <rect x="92" y="190" width="16" height="35" rx="4" fill="#64748b" />
    <rect x="96" y="215" width="8" height="25" fill="${accentColor}" />

    <!-- Right Connector -->
    <rect x="292" y="190" width="16" height="35" rx="4" fill="#64748b" />
    <rect x="296" y="215" width="8" height="25" fill="${accentColor}" />

    <!-- Left Ear Cup -->
    <g filter="url(#shadow)">
      <rect x="70" y="220" width="44" height="85" rx="22" fill="#0f172a" />
      <rect x="84" y="225" width="30" height="75" rx="15" fill="${cushionColor}" />
      <rect x="76" y="240" width="6" height="45" rx="3" fill="${accentColor}" opacity="0.8" />
    </g>

    <!-- Right Ear Cup -->
    <g filter="url(#shadow)">
      <rect x="286" y="220" width="44" height="85" rx="22" fill="#0f172a" />
      <rect x="286" y="225" width="30" height="75" rx="15" fill="${cushionColor}" />
      <rect x="318" y="240" width="6" height="45" rx="3" fill="${accentColor}" opacity="0.8" />
    </g>

    <!-- Sleek Design Highlights -->
    <circle cx="200" cy="115" r="3" fill="${accentColor}" />
    <circle cx="208" cy="116" r="2" fill="${accentColor}" opacity="0.6" />
    <circle cx="192" cy="116" r="2" fill="${accentColor}" opacity="0.6" />

    <text x="200" y="345" fill="#f8fafc" font-family="'Inter', sans-serif" font-weight="700" font-size="14" letter-spacing="2" text-anchor="middle" opacity="0.9">AUDIO PRO</text>
    <text x="200" y="362" fill="${accentColor}" font-family="'Inter', sans-serif" font-weight="500" font-size="11" letter-spacing="1" text-anchor="middle">ANC SERIES</text>
  </svg>
  `;
  return svgToDataUri(svg);
};

export const getWatchSvg = (
  accentColor: string,
  strapColor: string,
  bgStart: string,
  bgEnd: string
): string => {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgStart}" />
        <stop offset="100%" stop-color="${bgEnd}" />
      </linearGradient>
      <linearGradient id="strapGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${strapColor}" />
        <stop offset="50%" stop-color="#475569" />
        <stop offset="100%" stop-color="${strapColor}" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" flood-opacity="0.3"/>
      </filter>
    </defs>
    <rect width="100%" height="100%" rx="24" fill="url(#bgGrad)" />
    
    <!-- Strap Top -->
    <rect x="160" y="40" width="80" height="110" rx="6" fill="url(#strapGrad)" filter="url(#shadow)" />
    <!-- Strap Top Details (stitches) -->
    <line x1="166" y1="45" x2="166" y2="130" stroke="${accentColor}" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.6" />
    <line x1="234" y1="45" x2="234" y2="130" stroke="${accentColor}" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.6" />

    <!-- Strap Bottom -->
    <rect x="160" y="250" width="80" height="110" rx="6" fill="url(#strapGrad)" filter="url(#shadow)" />
    <!-- Strap Bottom Details (stitches) -->
    <line x1="166" y1="270" x2="166" y2="355" stroke="${accentColor}" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.6" />
    <line x1="234" y1="270" x2="234" y2="355" stroke="${accentColor}" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.6" />

    <!-- Watch Case -->
    <circle cx="200" cy="200" r="75" fill="#0f172a" stroke="#334155" stroke-width="6" filter="url(#shadow)" />
    <circle cx="200" cy="200" r="69" fill="#1e293b" />
    
    <!-- Outer Bezel Ring -->
    <circle cx="200" cy="200" r="65" fill="none" stroke="${accentColor}" stroke-width="1.5" opacity="0.7" />

    <!-- Hour Markers -->
    <line x1="200" y1="140" x2="200" y2="148" stroke="#f8fafc" stroke-width="3" />
    <line x1="200" y1="260" x2="200" y2="252" stroke="#f8fafc" stroke-width="3" />
    <line x1="140" y1="200" x2="148" y2="200" stroke="#f8fafc" stroke-width="3" />
    <line x1="260" y1="200" x2="252" y2="200" stroke="#f8fafc" stroke-width="3" />

    <!-- Subtle Dial Accents -->
    <circle cx="200" cy="172" r="12" fill="none" stroke="#475569" stroke-width="1" />
    <circle cx="200" cy="172" r="2" fill="${accentColor}" />
    
    <!-- Watch Hands -->
    <!-- Hour Hand -->
    <line x1="200" y1="200" x2="175" y2="180" stroke="#f8fafc" stroke-width="4.5" stroke-linecap="round" />
    <!-- Minute Hand -->
    <line x1="200" y1="200" x2="230" y2="165" stroke="#f8fafc" stroke-width="3" stroke-linecap="round" />
    <!-- Second Hand (Accent) -->
    <line x1="200" y1="200" x2="190" y2="245" stroke="${accentColor}" stroke-width="1.5" stroke-linecap="round" />
    
    <!-- Center Hub -->
    <circle cx="200" cy="200" r="5" fill="#0f172a" />
    <circle cx="200" cy="200" r="2.5" fill="${accentColor}" />

    <!-- Crown -->
    <rect x="274" y="190" width="8" height="20" rx="2" fill="#64748b" />
  </svg>
  `;
  return svgToDataUri(svg);
};

export const getBackpackSvg = (
  accentColor: string,
  bodyColor: string,
  bgStart: string,
  bgEnd: string
): string => {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgStart}" />
        <stop offset="100%" stop-color="${bgEnd}" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" flood-opacity="0.3"/>
      </filter>
    </defs>
    <rect width="100%" height="100%" rx="24" fill="url(#bgGrad)" />
    
    <!-- Top Carry Handle -->
    <path d="M 170 100 Q 200 65 230 100" fill="none" stroke="#1e293b" stroke-width="12" stroke-linecap="round" filter="url(#shadow)" />
    <path d="M 175 98 Q 200 68 225 98" fill="none" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" opacity="0.8" />

    <!-- Backpack Main Body -->
    <path d="M 120 330 L 120 160 C 120 120, 280 120, 280 160 L 280 330 C 280 345, 265 350, 250 350 L 150 350 C 135 350, 120 345, 120 330 Z" fill="${bodyColor}" filter="url(#shadow)" />
    
    <!-- Top Zip flap -->
    <path d="M 124 165 C 135 140, 265 140, 276 165" fill="none" stroke="#0f172a" stroke-width="4" />
    <path d="M 130 163 C 145 142, 255 142, 270 163" fill="none" stroke="${accentColor}" stroke-width="2" stroke-dasharray="4,2" />

    <!-- Front Zipper Pocket -->
    <path d="M 140 335 L 140 235 C 140 225, 150 220, 160 220 L 240 220 C 250 220, 260 225, 260 235 L 260 335 C 260 340, 255 342, 250 342 L 150 342 C 145 342, 140 340, 140 335 Z" fill="#0f172a" opacity="0.3" />
    <path d="M 145 330 L 145 240 C 145 233, 152 228, 160 228 L 240 228 C 248 228, 255 233, 255 240 L 255 330 C 255 336, 248 338, 242 338 L 158 338 C 152 338, 145 336, 145 330 Z" fill="#1e293b" />
    
    <!-- Front Pocket Accent Patch -->
    <rect x="180" y="270" width="40" height="25" rx="4" fill="${bodyColor}" />
    <rect x="185" y="274" width="30" height="17" rx="2" fill="#0f172a" />
    <circle cx="200" cy="282.5" r="2.5" fill="${accentColor}" />

    <!-- Lash Tabs / Pig Snouts -->
    <g transform="translate(155, 175)">
      <circle cx="0" cy="0" r="10" fill="#0f172a" />
      <rect x="-4" y="-2" width="2" height="4" fill="#475569" />
      <rect x="2" y="-2" width="2" height="4" fill="#475569" />
    </g>
    <g transform="translate(245, 175)">
      <circle cx="0" cy="0" r="10" fill="#0f172a" />
      <rect x="-4" y="-2" width="2" height="4" fill="#475569" />
      <rect x="2" y="-2" width="2" height="4" fill="#475569" />
    </g>

    <!-- Side Mesh Pockets -->
    <path d="M 120 250 L 110 260 L 110 320 L 120 310" fill="#0f172a" />
    <path d="M 280 250 L 290 260 L 290 320 L 280 310" fill="#0f172a" />
  </svg>
  `;
  return svgToDataUri(svg);
};

// Define initial values
export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    title: "Auriculares WavePro ANC",
    description: "Auriculares inalámbricos de alta resolución con cancelación activa de ruido híbrida. Almohadillas de espuma viscoelástica para una comodidad insuperable durante todo el día, autonomía de 45 horas de reproducción continua y drivers dinámicos de 40mm que ofrecen graves profundos y agudos cristalinos.",
    retailPrice: 14500,
    images: [
      getHeadphonesSvg("#3b82f6", "#1e40af", "#0f172a", "#1e293b"), // Slate blue primary
      getHeadphonesSvg("#ef4444", "#991b1b", "#1e1b1b", "#2e1818"), // Dark red variant
      getHeadphonesSvg("#10b981", "#065f46", "#111c17", "#162e24"), // Green forest variant
    ],
    sizes: "Estándar ajustable",
    colors: "Azul Slate, Rojo Carmesí, Verde Bosque",
  },
  {
    id: "prod-2",
    title: "Reloj Minimalist Chrono",
    description: "Reloj de cuarzo de alta precisión con caja de acero inoxidable cepillado de 40 mm. Cristal mineral endurecido resistente a rayaduras, correa de cuero genuino italiano intercambiable y resistencia al agua de 5 ATM. Un diseño sofisticado y contemporáneo que complementa cualquier estilo.",
    retailPrice: 22000,
    images: [
      getWatchSvg("#eab308", "#334155", "#1c1917", "#292524"), // Gold/dark grey primary
      getWatchSvg("#3b82f6", "#475569", "#172554", "#1e1b4b"), // Silver/blue variant
      getWatchSvg("#f43f5e", "#1e293b", "#1e1b29", "#110c14"), // Rose variant
    ],
    sizes: "Caja de 40 mm",
    colors: "Oro Clásico, Plata Oxford, Rosa Metalizado",
  },
  {
    id: "prod-3",
    title: "Mochila Impermeable Nomade",
    description: "Mochila urbana de alta resistencia fabricada con poliéster reciclado impermeable. Capacidad modular de 22 litros con compartimento acolchado flotante para notebook de hasta 16 pulgadas, múltiples bolsillos organizadores internos, cierres termosellados y respaldo ergonómico con canal de ventilación flujo de aire.",
    retailPrice: 9800,
    images: [
      getBackpackSvg("#10b981", "#334155", "#064e3b", "#022c22"), // Emerald accent dark body
      getBackpackSvg("#f97316", "#1e293b", "#1c1917", "#292524"), // Orange accent dark grey body
      getBackpackSvg("#a855f7", "#475569", "#2e1065", "#1e1b4b"), // Purple accent body
    ],
    sizes: "Capacidad 22L",
    colors: "Esmeralda Oscuro, Naranja Grisáceo, Violeta Oxford",
  },
];

export const DEFAULT_SETTINGS: CatalogSettings = {
  storeName: "Mi Tienda Digital",
  whatsappNumber: "5491112345678",
  currency: "$",
  themeColor: "#3b82f6", // Blue primary
  enableCart: true,
  contactEmail: "contacto@mitienda.com",
  instagramUser: "mitienda.digital",
  enableCoverVideo: true,
  coverVideoUrl: "https://www.youtube.com/shorts/vpIJWiT74ew",
  coverTitle: "",
  coverSubtitle: "",
  coverButtonText: "Ver Catálogo",
};
