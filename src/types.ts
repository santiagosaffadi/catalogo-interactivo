export interface Product {
  id: string;
  title: string;
  description: string;
  retailPrice: number;
  images: string[]; // Base64 data URLs or SVG data URLs
  sizes?: string;
  colors?: string;
  sizesCount?: number;
  isChristmasCapsule?: boolean;
  isExistingInStore?: boolean;
  externalStoreUrl?: string;
}

export interface EditorialPage {
  id: string;
  image: string;
  beforeProductId: string; // Empty string places the page after all products.
  fit?: "cover" | "contain";
}

export interface CatalogSettings {
  editorialPages?: EditorialPage[];
  storeName: string;
  whatsappNumber: string;
  currency: string;
  themeColor: string;
  enableCart: boolean;
  contactEmail: string;
  instagramUser: string;
  // Portada con Video (Primera Página)
  coverType?: "video" | "christmas" | "none";
  enableCoverVideo?: boolean;
  coverVideoUrl?: string;
  coverPosterUrl?: string;
  coverTitle?: string;
  coverSubtitle?: string;
  coverButtonText?: string;
}
