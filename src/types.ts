export interface Product {
  id: string;
  title: string;
  description: string;
  retailPrice: number;
  images: string[]; // Base64 data URLs or SVG data URLs
  sizes?: string;
  colors?: string;
  sizesCount?: number;
  isExistingInStore?: boolean;
  externalStoreUrl?: string;
}

export interface CatalogSettings {
  storeName: string;
  whatsappNumber: string;
  currency: string;
  themeColor: string;
  enableCart: boolean;
  contactEmail: string;
  instagramUser: string;
  // Portada con Video (Primera Página)
  enableCoverVideo?: boolean;
  coverVideoUrl?: string;
  coverPosterUrl?: string;
  coverTitle?: string;
  coverSubtitle?: string;
  coverButtonText?: string;
}
