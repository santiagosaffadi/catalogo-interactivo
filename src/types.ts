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
  isChristmasCapsule?: boolean;
  capsuleTag?: string;
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
  // Cápsula Navideña
  enableChristmasCapsule?: boolean;
  christmasCapsuleTitle?: string;
  christmasCapsuleSubtitle?: string;
  christmasCapsuleDescription?: string;
}
