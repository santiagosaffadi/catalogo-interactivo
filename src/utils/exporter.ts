import { Product, CatalogSettings } from "../types";
import { christmasCover } from "../assets/christmasCover";
import { extractYouTubeId } from "./youtube";

const escapeHtml = (value: unknown): string => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));

export const generateInteractiveCatalogHtml = (
  products: Product[],
  settings: CatalogSettings
): string => {
  const productsJson = JSON.stringify(products).replace(/<\/script>/g, '<\\/script>');
  const settingsJson = JSON.stringify(settings).replace(/<\/script>/g, '<\\/script>');

  const hasCover = settings.enableCoverVideo !== false;
  const rawCoverVideoUrl = (settings.coverVideoUrl || "").trim();
  const youtubeId = extractYouTubeId(rawCoverVideoUrl);
  const coverTitle = settings.coverTitle || "Colección Exclusiva";
  const coverSubtitle = settings.coverSubtitle || "Mira el video de presentación o pasa directamente a ver el catálogo";
  const coverButtonText = settings.coverButtonText || "Ver Catálogo";
  const defaultPoster = products[0] && products[0].images && products[0].images[0] ? products[0].images[0] : "";
  const coverPoster = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : (settings.coverPosterUrl || defaultPoster);

  const groupStarts = products.map((p, i) => !!p.isChristmasCapsule && (i === 0 || !products[i - 1].isChristmasCapsule));
  const productSlideIndex = (i: number) => (hasCover ? 1 : 0) + i + groupStarts.slice(0, i + 1).filter(Boolean).length;
  const summaryIndex = (hasCover ? 1 : 0) + products.length + groupStarts.filter(Boolean).length;

  const slidesHtml = products.map((product, i) => {
    const title = product.title || "Producto";
    const description = product.description || "";
    const images = product.images || [];
    const firstImg = images.length > 0 ? images[0] : "";
    const retailPrice = product.retailPrice || 0;
    const wholesalePrice = Math.round(retailPrice / 2);

    // Parse sizes to count them for "Curva" calculation
    let sizesList: string[] = [];
    if (product.sizes) {
      sizesList = product.sizes.split(/[,/\s\-]+/).map(s => s.trim()).filter(Boolean);
    }
    const sizesCount = sizesList.length || 4; // Default to 4 if empty

    // Parse colors
    let colorsList: string[] = ["Único"];
    if (product.colors) {
      const parsedColors = product.colors.split(/[,/]+/).map(c => c.trim()).filter(Boolean);
      if (parsedColors.length > 0) {
        colorsList = parsedColors;
      }
    }

    let thumbnailsMarkup = '';
    if (images.length > 1) {
      images.forEach((img, j) => {
        const activeClass = j === 0 ? 'active' : '';
        thumbnailsMarkup += `
          <button type="button"
                  id="thumb-${product.id}-${j}" 
                  class="thumbnail-btn ${activeClass}"
                  data-thumb-product="${product.id}"
                  data-thumb-index="${j}"
                  onclick="window.handleThumbnailClick(this, event)"
                  ontouchend="window.handleThumbnailClick(this, event)">
            <img src="${img}" alt="variante ${j + 1}" />
          </button>`;
      });
    }

    let variantsSectionMarkup = '';
    if (images.length > 1) {
      variantsSectionMarkup = `
        <div class="variants-section">
          <span class="variants-title">Variantes / Fotos</span>
          <div class="thumbnails-list">
            ${thumbnailsMarkup}
          </div>
        </div>`;
    }

    return `
      ${groupStarts[i] ? `<div class="slide christmas-cover" id="slide-${productSlideIndex(i) - 1}"><div class="christmas-cover-content"><span>✦ UNA COLECCIÓN PARA CELEBRAR ✦</span><h2>Cápsula<br>Navideña</h2><p>Descubrí los productos de nuestra colección especial</p><button type="button" onclick="window.goToSlide(${productSlideIndex(i)})">Ver colección →</button></div></div>` : ''}
      <div class="slide product-slide ${product.isChristmasCapsule ? 'christmas-product' : ''}" id="slide-${productSlideIndex(i)}">
        <div class="slide-content">
          <!-- Title Block -->
          <div class="product-header">
            <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 4px;">
              <span class="product-badge">
                Producto ${i + 1} de ${products.length}
              </span>
              ${product.isChristmasCapsule ? `<span class="christmas-badge">✦ Cápsula Navideña ✦</span>` : ''}
              ${product.isExistingInStore ? `
                <span class="product-badge" style="background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;">
                  Tienda Online
                </span>
              ` : ''}
            </div>
            <h2 class="product-title">${escapeHtml(title)}</h2>
          </div>

          <!-- Main Image Display -->
          <div class="image-container">
            <img id="main-img-${product.id}" src="${firstImg}" class="product-image" alt="${escapeHtml(title)}" />
          </div>

          <!-- Variant Carousel -->
          ${variantsSectionMarkup}

          <!-- Description -->
          <div class="description-container">
            <p class="product-description">${escapeHtml(description)}</p>
          </div>

          <!-- Sizes & Colors Specification -->
          ${(product.sizes || product.colors) ? `
          <div class="specs-container">
            ${product.sizes ? `
            <div class="spec-row">
              <span class="spec-label">Talles Disponibles</span>
              <span class="spec-value">${escapeHtml(product.sizes)}</span>
            </div>` : ''}
            ${product.colors ? `
            <div class="spec-row">
              <span class="spec-label">Colores Disponibles</span>
              <span class="spec-value">${escapeHtml(product.colors)}</span>
            </div>` : ''}
          </div>` : ''}
        </div>

        <!-- Pricing Panel -->
        <div class="pricing-panel">
          <div class="price-grid">
            <div class="price-card">
              <span class="price-label">Precio Minorista</span>
              <span class="price-value">${escapeHtml(settings.currency || '$')}${retailPrice.toLocaleString('es-AR')}</span>
            </div>
            <div class="price-card wholesale">
              <span class="price-label">Precio Mayorista</span>
              <span class="price-value">${escapeHtml(settings.currency || '$')}${wholesalePrice.toLocaleString('es-AR')}</span>
            </div>
          </div>
        </div>

        <!-- Either Online Store Direct Link OR Order Controls Card -->
        ${product.isExistingInStore ? `
        <div class="online-store-card">
          <div class="online-store-header">
            <span class="online-store-badge">
              <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>Disponible en Tienda Virtual</span>
            </span>
          </div>
          <p class="online-store-desc">
            El pedido de esta prenda se realiza exclusivamente a través de nuestra tienda online para consultar stock en tiempo real y abonar con tus medios de pago.
          </p>
          <a href="${product.externalStoreUrl || '#'}" target="_blank" rel="noopener noreferrer" class="btn-online-store">
            <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Comprar en Tienda Virtual</span>
            <svg style="width: 13px; height: 13px; margin-left: 2px;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
        ` : `
        <!-- Order Controls Card -->
        <div class="order-controls-card">
          <div class="variants-order-title">Pedir por Curva Completa (por Color)</div>
          <div class="variants-qty-list">
            ${colorsList.map((color, j) => `
              <div class="order-row" style="margin-top: 4px;">
                <span class="variant-color-name">${escapeHtml(color)}</span>
                <div class="quantity-picker">
                  <button class="qty-btn" type="button" onclick="window.updateVariantQty('${product.id}', '${escapeHtml(color.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '\\r').replace(/\n/g, '\\n'))}', ${j}, -1)">-</button>
                  <span id="variant-qty-${product.id}-${j}" class="qty-display" style="font-size: 11px; white-space: nowrap; font-weight: 700; color: #0f172a; min-width: 44px; text-align: center;">0 curvas</span>
                  <button class="qty-btn" type="button" onclick="window.updateVariantQty('${product.id}', '${escapeHtml(color.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '\\r').replace(/\n/g, '\\n'))}', ${j}, 1)">+</button>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Unidades adicionales -->
          <div class="unidades-row" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; flex-direction: column; text-align: left;">
              <span class="variant-color-name" style="font-weight: 700; color: #1e293b;">Unidades</span>
              <span style="font-size: 9px; color: #64748b; font-weight: 500;">Prendas sueltas</span>
            </div>
            <div class="quantity-picker">
              <button class="qty-btn" type="button" onclick="window.updateUnitsQty('${product.id}', -1)">-</button>
              <span id="units-qty-${product.id}" class="qty-display" style="font-weight: 700; color: #0f172a; font-size: 11px;">0</span>
              <button class="qty-btn" type="button" onclick="window.updateUnitsQty('${product.id}', 1)">+</button>
            </div>
          </div>
          
          <!-- Talle y color de cada unidad notes -->
          <div class="variants-notes-container" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
            <div class="variants-order-title" style="margin-bottom: 4px;">Talle y color de cada unidad</div>
            <textarea id="variants-notes-${product.id}" class="variants-notes-textarea" rows="2" placeholder="Ej: Rojo: talle 38 (x1), talle 40 (x2)..." oninput="window.updateVariantNotes('${product.id}')" style="width: 100%; font-family: inherit; font-size: 10.5px; padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; resize: none; color: #334155; font-weight: 500; outline: none; line-height: 1.4;"></textarea>
          </div>
          
          <div class="page-order-subtotal">
            <span>Prendas añadidas: <strong id="page-total-items-${product.id}">0</strong></span>
            <span>Subtotal Mayorista: <strong id="page-subtotal-price-${product.id}">${escapeHtml(settings.currency || '$')}0</strong></span>
          </div>

          <!-- Direct Ver Carrito Button -->
          <button type="button" 
                  class="btn-go-to-cart" 
                  onclick="window.goToSlide(${summaryIndex})"
                  ontouchend="window.goToSlide(${summaryIndex})">
            <svg style="width: 15px; height: 15px;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span>Ver Carrito</span>
          </button>
        </div>
        `}
      </div>`;
  }).join('\n');

  const gridItemsHtml = products.map((product, i) => {
    const retailPrice = product.retailPrice || 0;
    const wholesalePrice = Math.round(retailPrice / 2);
    const firstImg = product.images && product.images.length > 0 ? product.images[0] : '';
    return `
      <button type="button" class="grid-item" onclick="window.selectProductFromGrid(${productSlideIndex(i)})">
        <div class="grid-item-image-wrapper">
          <img src="${firstImg}" alt="${escapeHtml(product.title || 'Producto')}" />
        </div>
        <div class="grid-item-info">
          <div class="grid-item-title">${escapeHtml(product.title || 'Producto')}</div>
          <div class="grid-item-price-row">
            <span class="grid-item-price">${escapeHtml(settings.currency || '$')}${wholesalePrice.toLocaleString('es-AR')}</span>
            <span class="grid-item-badge" ${product.isExistingInStore ? 'style="background-color: #eff6ff; color: #1d4ed8; border-color: #bfdbfe;"' : ''}>${product.isExistingInStore ? 'Tienda Online' : 'Mayorista'}</span>
          </div>
        </div>
      </button>
    `;
  }).join('');

  // Portada Slide con Video vertical (Primera página)
  const coverSlideHtml = hasCover ? `
    <div class="slide cover-slide" id="slide-0">
      <div class="cover-media-container" id="coverMediaContainer">
        ${youtubeId ? `
        <div id="youtubeWrapper" class="cover-youtube-wrapper" style="display: none;">
          <iframe
            id="coverYoutubeIframe"
            class="cover-youtube-iframe"
            data-src="https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&loop=1&playlist=${youtubeId}"
            src=""
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          ></iframe>
        </div>
        ${coverPoster ? `<div class="cover-poster-bg" id="coverPosterBg" style="background-image: url('${coverPoster}');" onclick="window.toggleCoverVideo(event)"></div>` : `<div class="cover-poster-bg" id="coverPosterBg" style="background-color: #000;" onclick="window.toggleCoverVideo(event)"></div>`}
        ` : rawCoverVideoUrl ? `
        <video
          id="coverVideo"
          class="cover-video"
          playsinline
          webkit-playsinline
          preload="none"
          style="display: none;"
          ${coverPoster ? `poster="${coverPoster}"` : ''}
          src="${rawCoverVideoUrl}"
          onclick="window.toggleCoverVideo(event)"
          onended="window.handleCoverVideoEnded()"
        ></video>
        ${coverPoster ? `<div class="cover-poster-bg" id="coverPosterBg" style="background-image: url('${coverPoster}');" onclick="window.toggleCoverVideo(event)"></div>` : `<div class="cover-poster-bg" id="coverPosterBg" style="background-color: #000;" onclick="window.toggleCoverVideo(event)"></div>`}
        ` : `
        ${coverPoster ? `<div class="cover-poster-bg" id="coverPosterBg" style="background-image: url('${coverPoster}');"></div>` : '<div class="cover-poster-bg" id="coverPosterBg"></div>'}
        `}

        <!-- Dynamic contrast overlay -->
        <div class="cover-overlay"></div>

        <!-- Center Interactive Play Button -->
        <div class="cover-center-action" id="coverCenterAction">
          <button type="button" class="cover-play-btn" id="coverPlayBtn" onclick="window.toggleCoverVideo(event)" aria-label="Reproducir video de presentación">
            <svg class="play-svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <svg class="pause-svg" viewBox="0 0 24 24" fill="currentColor" style="display: none;">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          </button>
        </div>

        <!-- Bottom Actions: Only Ver Catálogo button, Arrow, and Sound Control -->
        <div class="cover-bottom-bar">
          <!-- Bouncing arrow down indicator -->
          <div class="cover-down-indicator" onclick="window.goToSlide(1); if (event) event.stopPropagation();" title="Ir al catálogo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14M19 12l-7 7-7-7"/>
            </svg>
          </div>

          <!-- Direct Action Row -->
          <div class="cover-cta-row">
            <button
              type="button"
              class="btn-cover-catalog"
              onclick="window.goToSlide(1); if (event) event.stopPropagation();"
            >
              <span>Ver Catálogo</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>

            <button
              type="button"
              id="coverMuteBtn"
              class="cover-sound-btn"
              onclick="window.toggleCoverAudio(event)"
              title="Activar sonido"
            >
              <svg class="sound-on-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
              <svg class="sound-off-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  ` : '';

  let sliderContent = '';
  if (products.length === 0) {
    sliderContent = coverSlideHtml + `
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; text-align: center; height: 100%;">
        <svg style="width: 64px; height: 64px; color: #cbd5e1; margin-bottom: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <h3 style="font-size: 16px; font-weight: 700; color: #1e293b;">No hay productos</h3>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Este catálogo no contiene productos actualmente.</p>
      </div>`;
  } else {
    sliderContent = (coverSlideHtml ? coverSlideHtml + '\n' : '') + slidesHtml;
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${escapeHtml(settings.storeName)} - Catálogo Interactivo</title>
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  
  <style>
    :root {
      --primary-color: ${settings.themeColor};
      --primary-color-hover: ${settings.themeColor}dd;
      --primary-color-light: ${settings.themeColor}15;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    /* Garantizar compatibilidad interactiva con WebKit / iOS / Chrome de iOS */
    button, nav, div.interactive, .interactive, .nav-btn, .thumbnail-btn {
      touch-action: manipulation;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    html, body {
      height: 100%;
      width: 100%;
      overflow: hidden;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #f1f5f9;
      color: #1e293b;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      -webkit-tap-highlight-color: transparent;
    }
    .catalog-container {
      width: 100%;
      max-width: 520px;
      height: 100%;
      max-height: 860px;
      background-color: #ffffff;
      box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
      position: relative;
      overflow: hidden;
      border-radius: 24px;
      border: 1px solid #e2e8f0;
    }
    @media (min-width: 768px) {
      .catalog-container {
        max-width: 1220px;
        height: 90vh;
        max-height: 920px;
        min-height: 620px;
        overflow: visible;
        border-radius: 24px;
      }
      .product-slide {
        display: grid !important;
        grid-template-columns: 1.25fr 0.75fr;
        grid-template-rows: auto 1fr;
        grid-template-areas: 
          "left-side right-side-top"
          "left-side right-side-bottom";
        gap: 32px;
        padding: 28px 36px;
        box-sizing: border-box;
        overflow-y: hidden;
      }
      .product-title {
        font-size: 24px;
        text-align: left;
      }
      .product-header {
        text-align: left;
        margin-bottom: 14px;
      }
      .slide-content {
        grid-area: left-side;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        height: 100%;
        overflow-y: auto;
        padding-right: 14px;
        scrollbar-width: thin;
      }
      .slide-content::-webkit-scrollbar {
        width: 6px;
      }
      .slide-content::-webkit-scrollbar-thumb {
        background-color: #cbd5e1;
        border-radius: 4px;
      }
      .image-container {
        width: 100%;
        aspect-ratio: 1 / 1;
        max-height: 500px;
        min-height: 320px;
        margin-bottom: 18px;
        border-radius: 20px;
        background-color: #fafafa;
        border: 1px solid #f1f5f9;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
        box-sizing: border-box;
      }
      .product-image {
        max-height: 100%;
        max-width: 100%;
        width: auto;
        height: auto;
        object-fit: contain;
      }
      .variants-section {
        max-width: 100%;
        margin-bottom: 18px;
      }
      .variants-title {
        font-size: 12px;
        font-weight: 800;
        margin-bottom: 10px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .thumbnails-list {
        display: flex;
        gap: 14px;
        padding-bottom: 8px;
        overflow-x: auto;
        scrollbar-width: thin;
      }
      .thumbnail-btn {
        width: 88px;
        height: 88px;
        border-radius: 14px;
        border: 2.5px solid #e2e8f0;
        flex-shrink: 0;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        background-color: #ffffff;
      }
      .thumbnail-btn:hover {
        transform: translateY(-2px) scale(1.05);
        border-color: var(--primary-color);
        box-shadow: 0 6px 16px rgba(0,0,0,0.08);
        opacity: 1;
      }
      .thumbnail-btn.active {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(37,99,235,0.25);
        transform: scale(1.04);
      }
      .pricing-panel {
        grid-area: right-side-top;
        margin-top: 0 !important;
        padding-top: 0 !important;
        border-top: none !important;
        align-self: start;
      }
      .order-controls-card,
      .online-store-card {
        grid-area: right-side-bottom;
        margin-top: 0 !important;
        align-self: start;
        width: 100%;
        max-width: 100%;
        padding: 16px 18px;
        border-radius: 20px;
      }
      /* Center the summary slide nicely on desktop */
      #slide-${summaryIndex} {
        max-width: 720px;
        margin: 0 auto;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
      }
    }
    @media (min-width: 1280px) {
      .catalog-container {
        max-width: 1320px;
        height: 92vh;
        max-height: 960px;
        min-height: 680px;
      }
      .product-slide {
        gap: 40px;
        padding: 32px 44px;
      }
      .image-container {
        max-height: 560px;
        min-height: 360px;
      }
      .thumbnail-btn {
        width: 96px;
        height: 96px;
        border-radius: 16px;
      }
      .thumbnails-list {
        gap: 16px;
      }
      .product-title {
        font-size: 26px;
      }
    }
    @media (max-width: 480px) {
      body {
        background-color: #ffffff;
      }
      .catalog-container {
        max-width: 100%;
        height: 100%;
        height: 100vh;
        height: 100dvh;
        max-height: 100%;
        box-shadow: none;
        border-radius: 0;
        border: none;
      }
      .slide {
        overflow-y: auto !important;
        display: block !important;
        padding: 16px 14px 70px !important;
        scrollbar-width: thin;
      }
      .slide::-webkit-scrollbar {
        width: 4px;
      }
      .slide::-webkit-scrollbar-thumb {
        background-color: #cbd5e1;
        border-radius: 2px;
      }
      .product-title {
        font-size: 16px;
      }
      .image-container {
        height: 48vh;
        max-height: 380px;
        margin-bottom: 12px;
        max-width: 100%;
      }
      .variants-section {
        max-width: 100%;
        margin-bottom: 14px;
      }
      .thumbnails-list {
        gap: 10px !important;
        padding-bottom: 8px !important;
      }
      .thumbnail-btn {
        width: 64px;
        height: 64px;
        border-radius: 8px;
      }
      .description-container {
        margin-bottom: 8px;
        max-width: 100%;
      }
      .product-description {
        font-size: 11px;
      }
      .specs-container {
        max-width: 100%;
        padding: 6px 10px;
        margin-bottom: 8px;
      }
      .spec-value {
        font-size: 10px;
      }
      .product-header {
        margin-bottom: 10px;
      }
      .pricing-panel {
        max-width: 100%;
        margin-top: 8px;
        padding-top: 8px;
      }
      .price-card.wholesale .price-value {
        font-size: 14px;
      }
    }
    .slides-window {
      height: 100%;
      width: 100%;
      overflow-x: scroll;
      overflow-y: hidden;
      scroll-snap-type: x mandatory;
      scroll-behavior: smooth;
      position: relative;
      z-index: 10;
      -webkit-overflow-scrolling: touch;
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .slides-window::-webkit-scrollbar {
      display: none;
    }
    .slider-container {
      display: flex;
      flex-wrap: nowrap;
      height: 100%;
    }
    .slide {
      flex: 0 0 100%;
      width: 100%;
      min-width: 100%;
      max-width: 100%;
      height: 100%;
      padding: 16px 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      box-sizing: border-box;
      scroll-snap-align: start;
      scroll-snap-stop: always;
    }
    /* Hide scrollbars */
    .slide::-webkit-scrollbar {
      display: none;
    }
    .slide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .slide-content {
      width: 100%;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .product-header {
      text-align: center;
      margin-bottom: 12px;
    }
    .product-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
      background-color: var(--primary-color-light);
      color: var(--primary-color);
    }
    .product-title {
      font-family: 'Outfit', sans-serif;
      font-size: 19px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.3;
      text-align: center;
    }
    .image-container {
      position: relative;
      width: 100%;
      max-width: 460px;
      height: 42vh;
      max-height: 370px;
      margin: 0 auto 10px;
      border-radius: 16px;
      overflow: hidden;
      background-color: #f8fafc;
      border: 1px solid #f1f5f9;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .product-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .variants-section {
      width: 100%;
      max-width: 460px;
      margin: 0 auto 8px;
    }
    .variants-title {
      font-size: 9px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
      display: block;
    }
    .thumbnails-list {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .thumbnails-list::-webkit-scrollbar {
      display: none;
    }
    .thumbnails-list {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .thumbnail-btn {
      display: block;
      touch-action: manipulation;
      -webkit-appearance: none;
      appearance: none;
      -webkit-tap-highlight-color: transparent;
      flex-shrink: 0;
      width: 56px;
      height: 56px;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid #f1f5f9;
      opacity: 0.75;
      cursor: pointer;
      padding: 0;
      background: none;
      transition: all 0.2s ease;
    }
    .thumbnail-btn.active {
      border-color: var(--primary-color);
      opacity: 1;
    }
    .thumbnail-btn img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      pointer-events: none;
    }
    .description-container {
      width: 100%;
      max-width: 460px;
      margin: 0 auto 6px;
      background-color: #f8fafc;
      padding: 8px 10px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }
    .product-description {
      font-size: 12px;
      color: #475569;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .specs-container {
      width: 100%;
      max-width: 460px;
      margin: 0 auto 6px;
      background-color: #f8fafc;
      padding: 6px 10px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .spec-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .spec-label {
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.03em;
    }
    .spec-value {
      font-weight: 600;
      color: #334155;
      font-size: 11px;
      text-align: right;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pricing-panel {
      width: 100%;
      max-width: 420px;
      margin: 8px auto 0;
      padding-top: 10px;
      border-top: 1px solid #f1f5f9;
    }
    .price-grid {
      display: grid;
      grid-template-cols: 1fr 1fr;
      gap: 8px;
    }
    .price-card {
      background-color: #f8fafc;
      padding: 8px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      text-align: center;
    }
    .price-card.wholesale {
      background-color: #f0fdf4;
      border-color: #bbf7d0;
    }
    .price-label {
      font-size: 8px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      display: block;
      margin-bottom: 2px;
    }
    .price-card.wholesale .price-label {
      color: #166534;
    }
    .price-value {
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 800;
      color: #1e293b;
    }
    .price-card.wholesale .price-value {
      color: #15803d;
      font-size: 16.5px;
      font-weight: 900;
    }
    
    /* Navigation buttons overlay */
    .nav-btn {
      display: flex;
      touch-action: manipulation;
      -webkit-appearance: none;
      appearance: none;
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      -webkit-transform: translateY(-50%);
      will-change: transform;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.75);
      border: 1px solid #cbd5e1;
      align-items: center;
      justify-content: center;
      color: #334155;
      cursor: pointer;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
      z-index: 99999;
      transition: all 0.2s ease;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
      pointer-events: auto;
      opacity: 0.5;
    }
    .nav-btn:hover, .nav-btn:active {
      opacity: 1;
      color: #000000;
      background-color: #ffffff;
      transform: translateY(-50%) scale(1.05);
      -webkit-transform: translateY(-50%) scale(1.05);
    }
    .nav-btn.prev {
      left: 10px;
    }
    .nav-btn.next {
      right: 10px;
    }
    .nav-btn svg, .nav-btn path {
      width: 18px;
      height: 18px;
      pointer-events: none;
    }
    
    @media (min-width: 1160px) {
      .nav-btn {
        width: 48px;
        height: 48px;
        opacity: 0.8;
      }
      .nav-btn.prev {
        left: -64px;
      }
      .nav-btn.next {
        right: -64px;
      }
      .nav-btn svg, .nav-btn path {
        width: 24px;
        height: 24px;
      }
    }
    
    /* Custom Order Controls Styling */
    .order-controls-card {
      width: 100%;
      max-width: 460px;
      margin: 10px auto 0;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 10px 12px;
      box-sizing: border-box;
    }
    .order-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .order-info {
      display: flex;
      flex-direction: column;
      text-align: left;
    }
    .order-label-main {
      font-size: 11px;
      font-weight: 700;
      color: #1e293b;
    }
    .order-sublabel {
      font-size: 9px;
      color: #64748b;
      margin-top: 1px;
    }
    .quantity-picker {
      display: flex;
      align-items: center;
      background-color: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 2px;
    }
    .qty-btn {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background-color: #f1f5f9;
      border: none;
      font-weight: 800;
      font-size: 14px;
      color: #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .qty-btn:active {
      background-color: #e2e8f0;
    }
    .qty-display {
      width: 28px;
      text-align: center;
      font-size: 11.5px;
      font-weight: 700;
      color: #1e293b;
    }
    .order-divider {
      border: 0;
      border-top: 1px solid #e2e8f0;
      margin: 8px 0;
    }
    .variants-order-title {
      font-size: 9px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
      text-align: left;
    }
    .variants-qty-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .variant-color-name {
      font-size: 10.5px;
      font-weight: 600;
      color: #475569;
    }
    .page-order-subtotal {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      color: #475569;
    }
    .page-order-subtotal strong {
      color: #0f172a;
    }
    .btn-go-to-cart {
      margin-top: 10px;
      width: 100%;
      background-color: var(--primary-color);
      color: #ffffff;
      font-family: inherit;
      font-weight: 700;
      font-size: 11.5px;
      padding: 9px 12px;
      border-radius: 10px;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      transition: all 0.15s ease;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    .btn-go-to-cart:hover {
      filter: brightness(0.92);
      transform: translateY(-1px);
    }
    .btn-go-to-cart:active {
      transform: translateY(0) scale(0.98);
    }

    /* Online Store Action Card */
    .online-store-card {
      width: 100%;
      max-width: 440px;
      margin: 10px auto 0;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1.5px solid #cbd5e1;
      border-radius: 14px;
      padding: 14px 16px;
      box-sizing: border-box;
      text-align: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.03);
    }
    .online-store-header {
      display: flex;
      justify-content: center;
      margin-bottom: 8px;
    }
    .online-store-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background-color: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      font-size: 10px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .online-store-desc {
      font-size: 11px;
      color: #475569;
      line-height: 1.45;
      margin: 0 0 12px 0;
      font-weight: 500;
    }
    .btn-online-store {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 11px 16px;
      background-color: var(--primary-color, #2563eb);
      color: #ffffff;
      font-size: 12px;
      font-weight: 800;
      border-radius: 12px;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(37,99,235,0.22);
      transition: all 0.2s ease;
      box-sizing: border-box;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    .btn-online-store:hover {
      filter: brightness(1.08);
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(37,99,235,0.32);
    }
    .btn-online-store:active {
      transform: translateY(0);
    }

    /* Cover Video Presentation Slide Styles */
    .slide.cover-slide {
      padding: 0 !important;
      position: relative;
      background: radial-gradient(circle at center, #111827 0%, #030712 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      user-select: none;
      -webkit-user-select: none;
    }
    .cover-media-container {
      position: relative;
      width: 100%;
      height: 100%;
      max-width: 480px;
      margin: 0 auto;
      overflow: hidden;
      background-color: #000000;
      transition: all 0.3s ease;
    }
    @media (min-width: 768px) {
      .cover-media-container {
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
        height: 94%;
        margin: auto;
      }
    }
    /* Immersive Fullscreen Mode */
    body.catalog-fullscreen {
      overflow: hidden !important;
      position: fixed !important;
      inset: 0 !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      width: 100% !important;
      height: 100vh !important;
      height: 100dvh !important;
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      z-index: 99999 !important;
      background: #000000 !important;
    }
    body.catalog-fullscreen .catalog-container {
      position: fixed !important;
      inset: 0 !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      width: 100% !important;
      height: 100vh !important;
      height: 100dvh !important;
      height: 100% !important;
      max-width: none !important;
      max-height: none !important;
      min-width: 0 !important;
      min-height: 0 !important;
      border-radius: 0 !important;
      border: none !important;
      box-shadow: none !important;
      margin: 0 !important;
      padding: 0 !important;
      z-index: 99999 !important;
      overflow: hidden !important;
      background: #000000 !important;
    }
    body.catalog-fullscreen .slides-window,
    body.catalog-fullscreen .slider-container {
      width: 100vw !important;
      width: 100% !important;
      height: 100vh !important;
      height: 100dvh !important;
      height: 100% !important;
      max-width: none !important;
      max-height: none !important;
      border-radius: 0 !important;
      border: none !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
    body.catalog-fullscreen #slide-0,
    body.catalog-fullscreen #slide-0.cover-slide {
      position: relative !important;
      width: 100vw !important;
      width: 100% !important;
      height: 100vh !important;
      height: 100dvh !important;
      height: 100% !important;
      max-width: none !important;
      max-height: none !important;
      border-radius: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
      border: none !important;
      overflow: hidden !important;
    }
    body.catalog-fullscreen #slide-0 #coverMediaContainer,
    body.catalog-fullscreen #slide-0 .cover-media-container,
    body.catalog-fullscreen #coverMediaContainer {
      position: absolute !important;
      inset: 0 !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      max-width: none !important;
      max-height: none !important;
      border-radius: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
      border: none !important;
    }
    body.catalog-fullscreen .cover-bottom-bar {
      padding-bottom: max(24px, env(safe-area-inset-bottom, 24px)) !important;
      z-index: 100 !important;
    }
    body.catalog-fullscreen .cover-fs-exit-top {
      display: flex !important;
    }
    .cover-fs-exit-top {
      display: none;
      position: absolute;
      top: max(16px, env(safe-area-inset-top, 16px));
      right: 16px;
      z-index: 120;
      padding: 8px 14px;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 9999px;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      transition: all 0.2s;
    }
    .cover-fs-exit-top:active {
      transform: scale(0.95);
    }
    .cover-fs-exit-top svg {
      width: 14px;
      height: 14px;
    }
    .cover-video {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 1;
      cursor: pointer;
    }
    .cover-youtube-wrapper {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 2;
      background: #000000;
      overflow: hidden;
    }
    .cover-youtube-iframe {
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
    }
    .cover-poster-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      z-index: 1;
      cursor: pointer;
    }
    .cover-overlay {
      position: absolute;
      inset: 0;
      z-index: 10;
      pointer-events: none;
      background: linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.85) 85%, rgba(0,0,0,0.96) 100%);
    }
    .cover-center-action {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 20;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: opacity 0.3s ease, transform 0.2s ease;
      pointer-events: auto;
    }
    .cover-play-btn {
      width: 74px;
      height: 74px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-color, #2563eb) 0%, #1d4ed8 100%);
      border: 3.5px solid rgba(255,255,255,0.9);
      box-shadow: 0 10px 28px rgba(37,99,235,0.45), 0 0 0 8px rgba(255,255,255,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      animation: coverPlayPulse 2.4s infinite;
    }
    @keyframes coverPlayPulse {
      0% { box-shadow: 0 10px 28px rgba(37,99,235,0.45), 0 0 0 0 rgba(255,255,255,0.35); }
      70% { box-shadow: 0 10px 28px rgba(37,99,235,0.45), 0 0 0 16px rgba(255,255,255,0); }
      100% { box-shadow: 0 10px 28px rgba(37,99,235,0.45), 0 0 0 0 rgba(255,255,255,0); }
    }
    .cover-play-btn:hover {
      transform: scale(1.08);
      filter: brightness(1.1);
    }
    .cover-play-btn:active {
      transform: scale(0.94);
    }
    .cover-play-btn svg {
      width: 32px;
      height: 32px;
      margin-left: 3px;
    }
    .cover-play-btn svg.pause-svg {
      margin-left: 0;
    }
    .cover-bottom-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 30;
      padding: 16px 14px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      text-align: center;
      pointer-events: auto;
    }
    .cover-down-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      margin-bottom: 4px;
      animation: coverBounceArrow 2s infinite ease-in-out;
      color: #ffffff;
      transition: transform 0.2s;
    }
    .cover-down-indicator:hover {
      transform: translateY(2px);
    }
    .cover-down-indicator svg {
      width: 28px;
      height: 28px;
      filter: drop-shadow(0 2px 8px rgba(0,0,0,0.8));
    }
    @keyframes coverBounceArrow {
      0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-7px); }
      60% { transform: translateY(-3px); }
    }
    .cover-cta-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 2px;
    }
    .btn-cover-catalog {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: linear-gradient(135deg, var(--primary-color, #2563eb) 0%, #1d4ed8 100%);
      color: #ffffff;
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 800;
      padding: 13px 18px;
      border-radius: 14px;
      border: 1.5px solid rgba(255,255,255,0.3);
      box-shadow: 0 8px 24px rgba(37,99,235,0.45);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      text-decoration: none;
    }
    .btn-cover-catalog:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px rgba(37,99,235,0.55);
      filter: brightness(1.08);
    }
    .btn-cover-catalog:active {
      transform: translateY(0) scale(0.98);
    }
    .btn-cover-catalog svg {
      width: 16px;
      height: 16px;
    }
    .cover-sound-btn,
    .cover-fullscreen-btn {
      width: 46px;
      height: 46px;
      border-radius: 14px;
      background: rgba(255,255,255,0.18);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.25);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      touch-action: manipulation;
      flex-shrink: 0;
    }
    .cover-sound-btn:hover,
    .cover-fullscreen-btn:hover {
      background: rgba(255,255,255,0.28);
    }
    .cover-sound-btn:active,
    .cover-fullscreen-btn:active {
      transform: scale(0.95);
    }
    .cover-sound-btn svg,
    .cover-fullscreen-btn svg {
      width: 18px;
      height: 18px;
    }
    .cover-progress-track {
      width: 100%;
      height: 4px;
      background: rgba(255,255,255,0.25);
      border-radius: 9999px;
      overflow: hidden;
      margin-top: 2px;
    }
    .cover-progress-bar {
      width: 0%;
      height: 100%;
      background: var(--primary-color, #3b82f6);
      transition: width 0.1s linear;
    }

    /* Summary Slide Styling */
    .summary-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      justify-content: space-between;
    }
    .summary-scroll {
      flex: 1;
      overflow-y: auto;
      padding-right: 2px;
      margin-bottom: 8px;
    }
    .summary-item {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 8px 10px;
      margin-bottom: 6px;
      text-align: left;
    }
    .summary-totals-card {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      padding: 10px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .summary-total-label {
      font-size: 10px;
      font-weight: 700;
      color: #166534;
      text-transform: uppercase;
    }
    .summary-total-val {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      font-weight: 900;
      color: #15803d;
    }
    .form-input-group {
      margin-bottom: 6px;
      text-align: left;
    }
    .form-input-label {
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      display: block;
      margin-bottom: 2px;
    }
    .form-input {
      width: 100%;
      padding: 6px 8px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      font-size: 11.5px;
      font-weight: 600;
      color: #1e293b;
      outline: none;
      box-sizing: border-box;
    }
    .form-input:focus {
      border-color: var(--primary-color);
    }
    .btn-submit-order {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 8px;
      border-radius: 8px;
      border: none;
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      font-weight: 800;
      color: #ffffff;
      cursor: pointer;
    }
    .btn-submit-order.whatsapp {
      background-color: #22c55e;
    }
    .btn-submit-order.whatsapp:hover {
      background-color: #16a34a;
    }
    .btn-submit-order.email {
      background-color: var(--primary-color);
    }
    .btn-submit-order.email:hover {
      background-color: var(--primary-color-hover);
    }

    /* Grid View Style overrides & additions */
    .grid-toggle-btn {
      position: absolute;
      top: 14px;
      left: 14px;
      z-index: 100;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background-color: #ffffffd9;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #334155;
      cursor: pointer;
      transition: all 0.2s ease;
      touch-action: manipulation;
    }
    .grid-toggle-btn:hover {
      background-color: #ffffff;
      transform: scale(1.05);
      color: var(--primary-color);
    }
    .grid-toggle-btn:active {
      transform: scale(0.95);
    }
    .grid-toggle-btn svg {
      width: 18px;
      height: 18px;
    }
    .christmas-cover { position: relative; background: #102719 url('${christmasCover}') center / cover no-repeat; color: #fff8df; display: flex; align-items: center; justify-content: center; text-align: center; }
    .christmas-cover-content { padding: 24px; text-shadow: 0 2px 12px #06190e; }
    .christmas-cover-content span { font-size: 11px; letter-spacing: .22em; color: #f5d895; font-weight: 700; }
    .christmas-cover-content h2 { font-family: Georgia, serif; font-size: clamp(36px, 8vw, 64px); line-height: 1.05; margin: 20px 0; }
    .christmas-cover-content p { font-size: 14px; margin: 0 auto 24px; max-width: 260px; }
    .christmas-cover-content button { cursor: pointer; border: 1px solid #edd395; border-radius: 999px; padding: 12px 24px; background: #f5e5be; color: #173826; font-weight: 800; }
    .christmas-badge { background: #e7f2e8; color: #245b3e; border: 1px solid #d3b36d; padding: 3px 8px; border-radius: 999px; font-size: 9px; font-weight: 800; }
    .christmas-product .product-header { border-top: 3px solid #d3b36d; border-radius: 8px; }
    .grid-view-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #ffffff;
      z-index: 150;
      display: none;
      flex-direction: column;
      animation: gridFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes gridFadeIn {
      from { opacity: 0; transform: translateY(15px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .grid-view-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-b: 1px solid #f1f5f9;
      background-color: #ffffff;
    }
    .grid-view-title {
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 800;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .grid-view-close-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background-color: #f1f5f9;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .grid-view-close-btn:hover {
      background-color: #e2e8f0;
      color: #0f172a;
    }
    .grid-view-close-btn svg {
      width: 16px;
      height: 16px;
    }
    .grid-view-content {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      background-color: #f8fafc;
      -webkit-overflow-scrolling: touch;
    }
    .products-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    @media (min-width: 480px) {
      .products-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }
    }
    @media (min-width: 768px) {
      .products-grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
      }
    }
    .grid-search { margin: 12px 12px 0; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 16px; }
    .grid-search:focus-visible, .grid-item:focus-visible { outline: 3px solid #60a5fa; outline-offset: 2px; }
    .grid-search-status { margin: 8px 14px 0; font-size: 12px; color: #475569; }
    .grid-item[hidden] { display: none; }
    .grid-item {
      text-align: left;
      font: inherit;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 8px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .grid-item:hover {
      border-color: var(--primary-color);
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 6px 18px rgba(0,0,0,0.08);
    }
    .grid-item:active {
      transform: translateY(0) scale(0.98);
    }
    .grid-item-image-wrapper {
      aspect-ratio: 1 / 1;
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
      background-color: #fafafa;
      border: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      box-sizing: border-box;
    }
    .grid-item-image-wrapper img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .grid-item-info {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      justify-content: space-between;
      min-height: 36px;
    }
    .grid-item-title {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .grid-item-price-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 4px;
    }
    .grid-item-price {
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      font-weight: 800;
      color: #16a34a;
    }
    .grid-item-badge {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      background-color: #f0fdf4;
      color: #16a34a;
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid #bbf7d0;
    }
  </style>
</head>
<body>

  <!-- Slider Wrapper -->
  <main class="catalog-container">
    
    <!-- Floating Grid Toggle Button -->
    <button id="gridViewBtn" class="grid-toggle-btn" onclick="window.toggleGridView(event)" ontouchend="window.toggleGridView(event)" title="Ver todos los productos">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    </button>

    <!-- Grid View Overlay -->
    <div id="gridViewOverlay" class="grid-view-overlay">
      <div class="grid-view-header">
        <span class="grid-view-title">Productos Disponibles</span>
        <button type="button" class="grid-view-close-btn" onclick="window.toggleGridView(event)" ontouchend="window.toggleGridView(event)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <input id="gridSearch" class="grid-search" type="search" placeholder="Buscar por nombre, color o talle" aria-label="Buscar productos" oninput="window.filterGridProducts(this.value)" />
      <p id="gridSearchStatus" class="grid-search-status" role="status" aria-live="polite"></p>
      <div class="grid-view-content">
        <div class="products-grid">
          ${gridItemsHtml}
        </div>
      </div>
    </div>
    
    <!-- Slides Window -->
    <div id="slidesWindow" class="slides-window">
      <div id="slider" class="slider-container">
        ${sliderContent}
        
        <!-- SUMMARY SLIDE -->
        <div class="slide" id="slide-${summaryIndex}">
          <div class="slide-content" style="height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
            <div class="product-header">
              <span class="product-badge" style="background-color: #f1f5f9; color: #475569;">
                Paso Final
              </span>
              <h2 class="product-title">Resumen de tu Pedido</h2>
            </div>
            
            <div class="summary-container" style="flex: 1; display: flex; flex-direction: column; min-height: 0; margin-top: 8px;">
              <!-- Empty state -->
              <div id="summary-empty" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 16px;">
                <svg style="width: 48px; height: 48px; color: #cbd5e1; margin-bottom: 12px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <h3 style="font-size: 14px; font-weight: 700; color: #475569;">Tu pedido está vacío</h3>
                <p style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Regresa a los productos anteriores y agrega curvas o variantes de color para completar tu pedido.</p>
              </div>
              
              <!-- Content state -->
              <div id="summary-content" style="display: none; flex: 1; flex-direction: column; min-height: 0; justify-content: space-between;">
                <div id="summary-list" class="summary-scroll" style="flex: 1; overflow-y: auto; max-height: calc(100vh - 430px); margin-bottom: 10px;">
                  <!-- Items populated by JS -->
                </div>
                
                <!-- Totals Card -->
                <div class="summary-totals-card">
                  <div>
                    <span class="summary-total-label">Total del Pedido</span>
                    <span style="display: block; font-size: 11px; color: #15803d; font-weight: 600;"><span id="summary-total-prendas">0</span> prendas</span>
                  </div>
                  <span id="summary-total-precio" class="summary-total-val">$0</span>
                </div>
                
                <!-- Customer Contact Info Form -->
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px; margin-bottom: 8px;">
                  <div class="form-input-group">
                    <label class="form-input-label">Tu Nombre / Negocio</label>
                    <input type="text" id="customer-name" class="form-input" placeholder="Ej: Juan Pérez o Local 'Boutique'" oninput="window.saveContactFields()" />
                  </div>
                  <div class="form-input-group">
                    <label class="form-input-label">Tu Correo Electrónico (Opcional)</label>
                    <input type="email" id="customer-email" class="form-input" placeholder="Ej: cliente@correo.com" oninput="window.saveContactFields()" />
                  </div>
                  <div class="form-input-group">
                    <label class="form-input-label">Tu Teléfono / Celular</label>
                    <input type="text" id="customer-phone" class="form-input" placeholder="Ej: +54911..." oninput="window.saveContactFields()" />
                  </div>
                  <div class="form-input-group" style="margin-bottom: 0;">
                    <label class="form-input-label">Observaciones de talles</label>
                    <textarea id="customer-notes" class="form-input" style="resize: none; height: 48px;" placeholder="Ej: Jean azul en talle 40, remera roja en S..." oninput="window.saveContactFields()"></textarea>
                  </div>
                </div>
                
                <!-- Submit buttons -->
                <div style="display: flex; flex-direction: column; gap: 6px; margin-top: auto;">
                  <button type="button" onclick="window.sendOrderWhatsapp()" class="btn-submit-order whatsapp">
                    <svg style="width: 16px; height: 16px;" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                    <span>Mandar Pedido por WhatsApp</span>
                  </button>
                  <button type="button" onclick="window.sendOrderEmail()" class="btn-submit-order email">
                    <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" stroke-dasharray="none" stroke-width="2.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L22 8m-2 11H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2z" />
                    </svg>
                    <span>Mandar Pedido por Email</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>

    <!-- Navigation Overlay controls OUTSIDE slidesWindow to prevent iOS z-index issues -->
    <button id="prevBtn" class="nav-btn prev" onclick="window.prevSlide(event)" ontouchend="window.prevSlide(event)">
      <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    <button id="nextBtn" class="nav-btn next" onclick="window.nextSlide(event)" ontouchend="window.nextSlide(event)">
      <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </main>

  <!-- Error tracking for debugging on mobile -->
  <script>
    window.onerror = function(msg, url, line, col, error) {
      var errDiv = document.createElement('div');
      errDiv.style.position = 'fixed';
      errDiv.style.top = '0';
      errDiv.style.left = '0';
      errDiv.style.right = '0';
      errDiv.style.backgroundColor = '#ef4444';
      errDiv.style.color = '#ffffff';
      errDiv.style.padding = '12px';
      errDiv.style.fontSize = '12px';
      errDiv.style.zIndex = '99999';
      errDiv.style.wordBreak = 'break-all';
      errDiv.innerHTML = '<strong>Error de Diagnóstico:</strong> ' + msg + ' (L' + line + ':C' + col + ')';
      document.body.appendChild(errDiv);
      return false;
    };
  </script>

  <!-- Main JavaScript Logic -->
  <script>
    // Direct JSON assignment for absolute reliability across iOS/Chrome/Safari/Android and desktop
    var products = ${productsJson};
    var settings = ${settingsJson};
    var hasCover = ${hasCover ? 'true' : 'false'};
    var maxSlideIndex = ${summaryIndex};

    // Application State
    var currentIndex = 0;
    var activeImageMap = {}; // productId -> active image index
    var orderState = {}; // productId -> { curves: 0, variants: { colorName: 0 }, variantsNotes: '', units: 0 }

    // Initialize Active Image Map with 0 for all products
    if (products && products.forEach) {
      products.forEach(function(p) {
        activeImageMap[p.id] = 0;
        orderState[p.id] = { curves: 0, variants: {}, variantsNotes: '', units: 0 };
      });
    }

    // DOM Elements
    var slidesWindow = document.getElementById('slidesWindow');
    var slider = document.getElementById('slider');
    var prevBtn = document.getElementById('prevBtn');
    var nextBtn = document.getElementById('nextBtn');

    if (!products || products.length === 0) {
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
    }

    // Carousel Image Swapping for a specific product
    window.setProductActiveImage = function(productId, imgIdx) {
      activeImageMap[productId] = imgIdx;
      
      // Update Main image source
      var mainImg = document.getElementById('main-img-' + productId);
      var productObj = null;
      for (var i = 0; i < products.length; i++) {
        if (String(products[i].id) === String(productId)) {
          productObj = products[i];
          break;
        }
      }
      
      if (mainImg && productObj && productObj.images && productObj.images[imgIdx]) {
        mainImg.src = productObj.images[imgIdx];
      }

      // Update active thumbnail border
      if (productObj && productObj.images) {
        for (var idx = 0; idx < productObj.images.length; idx++) {
          var thumb = document.getElementById('thumb-' + productId + '-' + idx);
          if (thumb) {
            if (idx === imgIdx) {
              thumb.className = 'thumbnail-btn active';
            } else {
              thumb.className = 'thumbnail-btn';
            }
          }
        }
      }
    };

    window.handleThumbnailClick = function(element, event) {
      if (event) {
        if (event.cancelable) {
          event.preventDefault();
        }
        event.stopPropagation();
      }
      if (!element) return;
      var productId = element.getAttribute('data-thumb-product');
      var imgIdx = parseInt(element.getAttribute('data-thumb-index'), 10);
      if (productId && !isNaN(imgIdx)) {
        window.setProductActiveImage(productId, imgIdx);
      }
    };

    // --- Core Ordering Logic Functions ---
    window.updateCurveQty = function(productId, delta) {
      if (!orderState[productId]) {
        orderState[productId] = { curves: 0, variants: {}, variantsNotes: '', units: 0 };
      }
      var current = orderState[productId].curves || 0;
      var next = current + delta;
      if (next < 0) next = 0;
      orderState[productId].curves = next;
      
      // Update Display
      var display = document.getElementById('curve-qty-' + productId);
      if (display) display.innerText = next;
      
      updatePageTotals(productId);
      updateFinalSummary();
    };

    window.updateVariantQty = function(productId, color, colorIdx, delta) {
      if (!orderState[productId]) {
        orderState[productId] = { curves: 0, variants: {}, variantsNotes: '', units: 0 };
      }
      var current = orderState[productId].variants[color] || 0;
      var next = current + delta;
      if (next < 0) next = 0;
      orderState[productId].variants[color] = next;
      
      // Update Display using index for absolute safety
      var display = document.getElementById('variant-qty-' + productId + '-' + colorIdx);
      if (display) {
        display.innerText = next + (next === 1 ? ' curva' : ' curvas');
      }
      
      updatePageTotals(productId);
      updateFinalSummary();
    };

    window.updateUnitsQty = function(productId, delta) {
      if (!orderState[productId]) {
        orderState[productId] = { curves: 0, variants: {}, variantsNotes: '', units: 0 };
      }
      var current = orderState[productId].units || 0;
      var next = current + delta;
      if (next < 0) next = 0;
      orderState[productId].units = next;
      
      // Update Display
      var display = document.getElementById('units-qty-' + productId);
      if (display) display.innerText = next;
      
      updatePageTotals(productId);
      updateFinalSummary();
    };

    window.updateVariantNotes = function(productId) {
      if (!orderState[productId]) {
        orderState[productId] = { curves: 0, variants: {}, variantsNotes: '', units: 0 };
      }
      var ta = document.getElementById('variants-notes-' + productId);
      if (ta) {
        orderState[productId].variantsNotes = ta.value;
      }
      updateFinalSummary();
    };

    function getProductSizesCount(productId) {
      var productObj = null;
      for (var i = 0; i < products.length; i++) {
        if (String(products[i].id) === String(productId)) {
          productObj = products[i];
          break;
        }
      }
      if (!productObj) return 4;
      if (productObj.sizesCount !== undefined && productObj.sizesCount > 0) {
        return productObj.sizesCount;
      }
      if (!productObj.sizes) return 4;
      var clean = productObj.sizes.trim();
      if (!clean) return 4;
      var parts = clean.split(/[,/\\s\\-]+/);
      parts = parts.filter(function(p) { return p.trim().length > 0; });
      return parts.length || 4;
    }

    function updatePageTotals(productId) {
      var state = orderState[productId];
      if (!state) return;
      
      var sizesCount = getProductSizesCount(productId);
      
      var curvesTotal = 0;
      for (var color in state.variants) {
        curvesTotal += state.variants[color] || 0;
      }
      var curveGarments = curvesTotal * sizesCount;
      var units = state.units || 0;
      
      var totalGarments = curveGarments + units;
      
      // Find product price
      var productObj = null;
      for (var i = 0; i < products.length; i++) {
        if (String(products[i].id) === String(productId)) {
          productObj = products[i];
          break;
        }
      }
      var retailPrice = productObj ? productObj.retailPrice : 0;
      var wholesalePrice = Math.round(retailPrice / 2);
      var subtotal = totalGarments * wholesalePrice;
      
      var totalItemsDisplay = document.getElementById('page-total-items-' + productId);
      if (totalItemsDisplay) totalItemsDisplay.innerText = totalGarments;
      
      var subtotalDisplay = document.getElementById('page-subtotal-price-' + productId);
      if (subtotalDisplay) {
        subtotalDisplay.innerText = (settings.currency || '$') + subtotal.toLocaleString('es-AR');
      }
    }

    function updateFinalSummary() {
      var summaryList = document.getElementById('summary-list');
      var summaryEmpty = document.getElementById('summary-empty');
      var summaryContent = document.getElementById('summary-content');
      var totalPrendasDisplay = document.getElementById('summary-total-prendas');
      var totalPrecioDisplay = document.getElementById('summary-total-precio');
      
      if (!summaryList) return;
      
      summaryList.innerHTML = '';
      var grandTotalItems = 0;
      var grandTotalPrice = 0;
      var hasItems = false;
      
      products.forEach(function(product) {
        var state = orderState[product.id];
        if (!state) return;
        
        var sizesCount = getProductSizesCount(product.id);
        
        var curvesTotal = 0;
        var variantLines = [];
        for (var color in state.variants) {
          var qty = state.variants[color] || 0;
          if (qty > 0) {
            curvesTotal += qty;
            variantLines.push(qty + ' ' + (qty === 1 ? 'curva' : 'curvas') + ' (' + color + ')');
          }
        }
        var curveGarments = curvesTotal * sizesCount;
        var units = state.units || 0;
        
        var totalGarments = curveGarments + units;
        if (totalGarments > 0) {
          hasItems = true;
          var wholesalePrice = Math.round(product.retailPrice / 2);
          var subtotal = totalGarments * wholesalePrice;
          
          grandTotalItems += totalGarments;
          grandTotalPrice += subtotal;
          
          var detailText = [];
          if (curvesTotal > 0) {
            detailText.push(variantLines.join(', ') + ' (' + curveGarments + ' prendas)');
          }
          if (units > 0) {
            detailText.push(units + ' un. adicionales');
          }
          
          var notesHtml = '';
          if (state.variantsNotes && state.variantsNotes.trim()) {
            notesHtml = '<div style="font-size: 10.5px; color: #475569; font-style: italic; margin-top: 4px; padding-left: 6px; border-left: 2px solid #3b82f6;">' +
              'Talle y color de cada unidad: ' + state.variantsNotes.trim() +
            '</div>';
          }

          var itemDiv = document.createElement('div');
          itemDiv.className = 'summary-item';
          itemDiv.innerHTML = 
            '<div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 13px; color: #0f172a;">' +
              '<span>' + product.title + '</span>' +
              '<span>' + (settings.currency || '$') + subtotal.toLocaleString('es-AR') + '</span>' +
            '</div>' +
            '<div style="font-size: 11px; color: #64748b; margin-top: 2px;">' +
              detailText.join(' + ') + ' (' + totalGarments + ' prendas x ' + (settings.currency || '$') + wholesalePrice.toLocaleString('es-AR') + ')' +
            '</div>' + notesHtml;
          summaryList.appendChild(itemDiv);
        }
      });
      
      if (hasItems) {
        if (summaryEmpty) summaryEmpty.style.display = 'none';
        if (summaryContent) summaryContent.style.display = 'flex';
        if (totalPrendasDisplay) totalPrendasDisplay.innerText = grandTotalItems;
        if (totalPrecioDisplay) totalPrecioDisplay.innerText = (settings.currency || '$') + grandTotalPrice.toLocaleString('es-AR');
      } else {
        if (summaryEmpty) summaryEmpty.style.display = 'flex';
        if (summaryContent) summaryContent.style.display = 'none';
      }
    }

    window.saveContactFields = function() {
      var nameInput = document.getElementById('customer-name');
      var emailInput = document.getElementById('customer-email');
      var phoneInput = document.getElementById('customer-phone');
      var notesInput = document.getElementById('customer-notes');
      
      var nameVal = nameInput ? nameInput.value : '';
      var emailVal = emailInput ? emailInput.value : '';
      var phoneVal = phoneInput ? phoneInput.value : '';
      var notesVal = notesInput ? notesInput.value : '';
      
      try {
        localStorage.setItem('customer_name', nameVal);
        localStorage.setItem('customer_email', emailVal);
        localStorage.setItem('customer_phone', phoneVal);
        localStorage.setItem('customer_notes', notesVal);
      } catch (e) {}
    };

    function loadContactFields() {
      try {
        var nameVal = localStorage.getItem('customer_name') || '';
        var emailVal = localStorage.getItem('customer_email') || '';
        var phoneVal = localStorage.getItem('customer_phone') || '';
        var notesVal = localStorage.getItem('customer_notes') || '';
        
        var nameInput = document.getElementById('customer-name');
        var emailInput = document.getElementById('customer-email');
        var phoneInput = document.getElementById('customer-phone');
        var notesInput = document.getElementById('customer-notes');
        
        if (nameInput) nameInput.value = nameVal;
        if (emailInput) emailInput.value = emailVal;
        if (phoneInput) phoneInput.value = phoneVal;
        if (notesInput) notesInput.value = notesVal;
      } catch (e) {}
    }

    function buildOrderTextMessage() {
      var nameInput = document.getElementById('customer-name');
      var emailInput = document.getElementById('customer-email');
      var phoneInput = document.getElementById('customer-phone');
      var notesInput = document.getElementById('customer-notes');
      
      var nameVal = nameInput ? nameInput.value.trim() : '';
      var emailVal = emailInput ? emailInput.value.trim() : '';
      var phoneVal = phoneInput ? phoneInput.value.trim() : '';
      var notesVal = notesInput ? notesInput.value.trim() : '';
      
      var grandTotalItems = 0;
      var grandTotalPrice = 0;
      var itemsText = '';
      
      products.forEach(function(product) {
        var state = orderState[product.id];
        if (!state) return;
        
        var sizesCount = getProductSizesCount(product.id);
        
        var curvesTotal = 0;
        var variantLines = [];
        for (var color in state.variants) {
          var qty = state.variants[color] || 0;
          if (qty > 0) {
            curvesTotal += qty;
            variantLines.push(qty + ' curvas (' + color + ')');
          }
        }
        var curveGarments = curvesTotal * sizesCount;
        var units = state.units || 0;
        
        var totalGarments = curveGarments + units;
        if (totalGarments > 0) {
          var wholesalePrice = Math.round(product.retailPrice / 2);
          var subtotal = totalGarments * wholesalePrice;
          
          grandTotalItems += totalGarments;
          grandTotalPrice += subtotal;
          
          itemsText += '📦 *' + product.title + '*\\n';
          if (curvesTotal > 0) {
            itemsText += '  • Curvas: ' + variantLines.join(', ') + '\\n';
          }
          if (units > 0) {
            itemsText += '  • Unidades adicionales: ' + units + ' un.\\n';
          }
          if (state.variantsNotes && state.variantsNotes.trim()) {
            itemsText += '  • Talle y color de cada unidad: ' + state.variantsNotes.trim() + '\\n';
          }
          itemsText += '  _Subtotal: ' + (settings.currency || '$') + subtotal.toLocaleString('es-AR') + '_\\n\\n';
        }
      });
      
      if (grandTotalItems === 0) {
        alert('No has agregado ningún producto a tu pedido. Por favor selecciona al menos una curva o unidad.');
        return null;
      }
      
      var text = '🛒 *NUEVO PEDIDO DESDE EL CATÁLOGO*\\n';
      text += '━━━━━━━━━━━━━━━━━━━━━━━━\\n';
      text += '👤 *Cliente:* ' + (nameVal || 'No especificado') + '\\n';
      if (emailVal) text += '📧 *Email:* ' + emailVal + '\\n';
      if (phoneVal) text += '📞 *Teléfono:* ' + phoneVal + '\\n';
      text += '━━━━━━━━━━━━━━━━━━━━━━━━\\n\\n';
      
      if (notesVal) {
        text += '📝 *Observaciones de talles:* ' + notesVal + '\\n';
        text += '━━━━━━━━━━━━━━━━━━━━━━━━\\n\\n';
      }
      
      text += itemsText;
      
      text += '━━━━━━━━━━━━━━━━━━━━━━━━\\n';
      text += '🔥 *TOTAL PRENDAS:* ' + grandTotalItems + ' prendas\\n';
      text += '💰 *TOTAL MAYORISTA:* ' + (settings.currency || '$') + grandTotalPrice.toLocaleString('es-AR') + '\\n';
      text += '━━━━━━━━━━━━━━━━━━━━━━━━\\n';
      text += 'Generado desde el catálogo interactivo de: ' + settings.storeName;
      
      return text;
    }

    window.sendOrderWhatsapp = function() {
      try {
        var msg = buildOrderTextMessage();
        if (!msg) return;
        
        var whatsappNumber = settings.whatsappNumber || '';
        var cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
        if (!cleanNumber) {
          alert('Este catálogo no tiene un número de WhatsApp de destino configurado en los ajustes. Por favor, contacta al vendedor o intenta enviar por email.');
          return;
        }
        
        var url = 'https://wa.me/' + cleanNumber + '?text=' + encodeURIComponent(msg);
        
        var newWin = window.open(url, '_blank');
        if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
          window.location.href = url;
        }
      } catch (e) {
        alert('Ocurrió un error al procesar el envío por WhatsApp: ' + (e.message || e));
      }
    };

    window.sendOrderEmail = function() {
      try {
        var msg = buildOrderTextMessage();
        if (!msg) return;
        
        var contactEmail = (settings.contactEmail || '').trim();
        if (!contactEmail) {
          alert('Este catálogo no tiene un email de contacto configurado en los ajustes para recibir pedidos.');
          return;
        }
        
        var subject = 'Nuevo Pedido - ' + settings.storeName;
        var mailtoUrl = 'mailto:' + encodeURIComponent(contactEmail) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(msg);
        
        var a = document.createElement('a');
        a.href = mailtoUrl;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
          if (document.body && document.body.contains(a)) {
            document.body.removeChild(a);
          }
        }, 1000);
      } catch (e) {
        alert('Ocurrió un error al procesar el envío por Email: ' + (e.message || e));
      }
    };

    function updateArrowsState() {
      if (!products || products.length === 0) return;
      
      var pBtn = document.getElementById('prevBtn');
      var nBtn = document.getElementById('nextBtn');
      var gridBtn = document.getElementById('gridViewBtn');
      
      if (pBtn) {
        pBtn.style.opacity = currentIndex === 0 ? '0.3' : '1';
        pBtn.style.pointerEvents = currentIndex === 0 ? 'none' : 'auto';
      }
      if (nBtn) {
        nBtn.style.opacity = currentIndex === maxSlideIndex ? '0.3' : '1';
        nBtn.style.pointerEvents = currentIndex === maxSlideIndex ? 'none' : 'auto';
      }
      if (gridBtn) {
        gridBtn.style.display = currentIndex === maxSlideIndex ? 'none' : 'flex';
      }
    }

    // --- Cover Video Interactive Controls ---
    window.isYtCoverPlaying = false;
    var lastToggleCoverTime = 0;
    window.toggleCoverVideo = function(event) {
      var now = Date.now();
      if (now - lastToggleCoverTime < 450) {
        if (event) {
          if (event.cancelable) event.preventDefault();
          event.stopPropagation();
        }
        return;
      }
      lastToggleCoverTime = now;

      if (event) {
        if (event.cancelable) event.preventDefault();
        event.stopPropagation();
      }

      var ytIframe = document.getElementById('coverYoutubeIframe');
      var ytWrapper = document.getElementById('youtubeWrapper');
      var posterBg = document.getElementById('coverPosterBg');
      var centerAction = document.getElementById('coverCenterAction');
      var playBtn = document.getElementById('coverPlayBtn');

      if (ytIframe) {
        if (!window.isYtCoverPlaying) {
          // START PLAYING: load iframe src if needed, show wrapper, hide poster and play button
          var dataSrc = ytIframe.getAttribute('data-src');
          if ((!ytIframe.src || ytIframe.src === '' || ytIframe.src === window.location.href) && dataSrc) {
            ytIframe.src = dataSrc + (window.isCoverAudioMuted ? '&mute=1' : '');
          } else if (ytIframe.contentWindow) {
            try {
              ytIframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
            } catch(e) {}
          }
          if (ytWrapper) ytWrapper.style.display = 'block';
          if (posterBg) posterBg.style.display = 'none';
          if (centerAction) centerAction.style.display = 'none';
          window.isYtCoverPlaying = true;
        } else {
          // PAUSE
          if (ytIframe.contentWindow) {
            try {
              ytIframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            } catch(e) {}
          }
          window.isYtCoverPlaying = false;
          if (centerAction) centerAction.style.display = 'flex';
          if (playBtn) {
            var playSvg = playBtn.querySelector('.play-svg');
            var pauseSvg = playBtn.querySelector('.pause-svg');
            if (playSvg) playSvg.style.display = 'block';
            if (pauseSvg) pauseSvg.style.display = 'none';
          }
        }
        return;
      }

      // HTML5 video element fallback
      var video = document.getElementById('coverVideo');
      if (!video) return;

      if (video.paused) {
        video.style.display = 'block';
        if (posterBg) posterBg.style.display = 'none';
        var playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.then(function() {
            if (centerAction) centerAction.style.display = 'none';
          }).catch(function(err) {
            console.warn('Playback error (retrying muted):', err);
            video.muted = true;
            video.play().then(function() {
              if (centerAction) centerAction.style.display = 'none';
            }).catch(function(e) {
              console.error('Playback failed completely:', e);
            });
          });
        }
      } else {
        video.pause();
        if (centerAction) centerAction.style.display = 'flex';
        if (playBtn) {
          var playSvg2 = playBtn.querySelector('.play-svg');
          var pauseSvg2 = playBtn.querySelector('.pause-svg');
          if (playSvg2) playSvg2.style.display = 'block';
          if (pauseSvg2) pauseSvg2.style.display = 'none';
        }
      }
    };

    window.handleCoverVideoEnded = function() {
      var centerAction = document.getElementById('coverCenterAction');
      if (centerAction) centerAction.style.display = 'flex';
      var playBtn = document.getElementById('coverPlayBtn');
      if (playBtn) {
        var playSvg = playBtn.querySelector('.play-svg');
        var pauseSvg = playBtn.querySelector('.pause-svg');
        if (playSvg) playSvg.style.display = 'block';
        if (pauseSvg) pauseSvg.style.display = 'none';
      }
    };

    window.isCoverAudioMuted = true;
    window.toggleCoverAudio = function(event) {
      if (event) {
        if (event.cancelable) event.preventDefault();
        event.stopPropagation();
      }
      var muteBtn = document.getElementById('coverMuteBtn');
      if (!muteBtn) return;
      
      window.isCoverAudioMuted = !window.isCoverAudioMuted;
      
      var ytIframe = document.getElementById('coverYoutubeIframe');
      if (ytIframe && ytIframe.contentWindow) {
        try {
          if (window.isCoverAudioMuted) {
            ytIframe.contentWindow.postMessage('{"event":"command","func":"mute","args":""}', '*');
          } else {
            ytIframe.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
            ytIframe.contentWindow.postMessage('{"event":"command","func":"setVolume","args":[100]}', '*');
          }
        } catch(e) {}
      }

      var video = document.getElementById('coverVideo');
      if (video) {
        video.muted = window.isCoverAudioMuted;
      }

      var onSvg = muteBtn.querySelector('.sound-on-svg');
      var offSvg = muteBtn.querySelector('.sound-off-svg');
      if (window.isCoverAudioMuted) {
        if (onSvg) onSvg.style.display = 'none';
        if (offSvg) offSvg.style.display = 'block';
        muteBtn.setAttribute('title', 'Activar sonido');
      } else {
        if (onSvg) onSvg.style.display = 'block';
        if (offSvg) offSvg.style.display = 'none';
        muteBtn.setAttribute('title', 'Silenciar');
      }
    };


    var covVideo = document.getElementById('coverVideo');
    if (covVideo) {
      covVideo.addEventListener('play', function() {
        var centerAction = document.getElementById('coverCenterAction');
        if (centerAction) centerAction.style.display = 'none';
      });
      covVideo.addEventListener('pause', function() {
        var centerAction = document.getElementById('coverCenterAction');
        if (centerAction) centerAction.style.display = 'flex';
        var playBtn = document.getElementById('coverPlayBtn');
        if (playBtn) {
          var playSvg = playBtn.querySelector('.play-svg');
          var pauseSvg = playBtn.querySelector('.pause-svg');
          if (playSvg) playSvg.style.display = 'block';
          if (pauseSvg) pauseSvg.style.display = 'none';
        }
      });
      covVideo.addEventListener('timeupdate', function() {
        var bar = document.getElementById('coverProgressBar');
        if (bar && covVideo.duration > 0) {
          var pct = (covVideo.currentTime / covVideo.duration) * 100;
          bar.style.width = pct + '%';
        }
      });
      covVideo.addEventListener('ended', function() {
        var centerAction = document.getElementById('coverCenterAction');
        if (centerAction) centerAction.style.display = 'flex';
        var playHint = document.getElementById('coverPlayHint');
        if (playHint) playHint.textContent = 'Repetir video';
        var playBtn = document.getElementById('coverPlayBtn');
        if (playBtn) {
          var playSvg = playBtn.querySelector('.play-svg');
          var pauseSvg = playBtn.querySelector('.pause-svg');
          if (playSvg) playSvg.style.display = 'block';
          if (pauseSvg) pauseSvg.style.display = 'none';
        }
      });
    }

    window.filterGridProducts = function(query) {
      var normalize = function(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); };
      var term = normalize(query);
      var cards = document.querySelectorAll('.products-grid .grid-item');
      var count = 0;
      cards.forEach(function(card, index) {
        var product = products[index] || {};
        var searchable = [product.title, product.description, product.colors, product.sizes].join(' ');
        var matches = normalize(searchable).includes(term);
        card.hidden = !matches;
        if (matches) count++;
      });
      var status = document.getElementById('gridSearchStatus');
      if (status) status.textContent = !term ? '' : count ? count + ' de ' + products.length + ' productos' : 'No encontramos productos. Probá con otra búsqueda.';
    };

    window.toggleGridView = function(event) {
      if (event) {
        if (event.cancelable) event.preventDefault();
        event.stopPropagation();
      }
      var overlay = document.getElementById('gridViewOverlay');
      if (overlay) {
        if (overlay.style.display === 'flex') {
          overlay.style.display = 'none';
        } else {
          overlay.style.display = 'flex';
        }
      }
    };

    window.selectProductFromGrid = function(idx) {
      var overlay = document.getElementById('gridViewOverlay');
      if (overlay) {
        overlay.style.display = 'none';
      }
      window.goToSlide(idx);
    };

    var isScrollingProgrammatically = false;
    var scrollTimeout = null;

    function scrollSliderToActive() {
      if (!products || products.length === 0 || !slidesWindow) return;
      
      var width = slidesWindow.clientWidth;
      if (width <= 0) return;
      
      isScrollingProgrammatically = true;
      
      // Pause cover video if navigating away from the first page
      if (hasCover && currentIndex !== 0) {
        var ytIfr = document.getElementById('coverYoutubeIframe');
        if (ytIfr && ytIfr.contentWindow) {
          try {
            ytIfr.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
          } catch(e) {}
        }
        var videoEl = document.getElementById('coverVideo');
        if (videoEl && !videoEl.paused) {
          videoEl.pause();
          var centerAction = document.getElementById('coverCenterAction');
          if (centerAction) {
            centerAction.style.display = 'flex';
            centerAction.style.opacity = '1';
          }
          var playBtn = document.getElementById('coverPlayBtn');
          if (playBtn) {
            var playSvg = playBtn.querySelector('.play-svg');
            var pauseSvg = playBtn.querySelector('.pause-svg');
            if (playSvg) playSvg.style.display = 'block';
            if (pauseSvg) pauseSvg.style.display = 'none';
          }
        }
      }
      
      // Turn off scroll-snap temporarily so iOS allows programmatic scrolling without fighting it
      slidesWindow.style.scrollSnapType = 'none';
      
      try {
        if (typeof slidesWindow.scrollTo === 'function') {
          slidesWindow.scrollTo({
            left: currentIndex * width,
            behavior: 'smooth'
          });
        } else {
          slidesWindow.scrollLeft = currentIndex * width;
        }
      } catch (e) {
        slidesWindow.scrollLeft = currentIndex * width;
      }
      
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(function() {
        if (slidesWindow) {
          slidesWindow.style.scrollSnapType = 'x mandatory';
        }
        isScrollingProgrammatically = false;
      }, 500);
      
      updateArrowsState();
    }

    window.prevSlide = function(event) {
      if (event) {
        if (event.cancelable) {
          event.preventDefault();
        }
        event.stopPropagation();
      }
      if (currentIndex > 0) {
        currentIndex--;
        scrollSliderToActive();
      }
    };

    window.nextSlide = function(event) {
      if (event) {
        if (event.cancelable) {
          event.preventDefault();
        }
        event.stopPropagation();
      }
      if (currentIndex < maxSlideIndex) {
        currentIndex++;
        scrollSliderToActive();
      }
    };

    window.goToSlide = function(idx) {
      if (idx >= 0 && idx <= maxSlideIndex) {
        if (idx !== 0) {
          // Pause cover video and exit fullscreen if active
          var ytIframe = document.getElementById('coverYoutubeIframe');
          if (ytIframe && ytIframe.contentWindow && window.isYtCoverPlaying) {
            try {
              ytIframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            } catch(e) {}
            window.isYtCoverPlaying = false;
          }
          var coverVid = document.getElementById('coverVideo');
          if (coverVid && !coverVid.paused) {
            coverVid.pause();
          }
        }
        currentIndex = idx;
        scrollSliderToActive();
      }
    };

    // Listen to scroll events on slidesWindow to synchronize slide indicators and next/prev arrows
    if (slidesWindow) {
      slidesWindow.addEventListener('scroll', function() {
        if (isScrollingProgrammatically) return;
        
        var width = slidesWindow.clientWidth;
        if (width > 0) {
          var newIndex = Math.round(slidesWindow.scrollLeft / width);
          if (newIndex >= 0 && newIndex <= maxSlideIndex && newIndex !== currentIndex) {
            currentIndex = newIndex;
            updateArrowsState();

            if (hasCover && currentIndex !== 0) {
              var ytIfrScroll = document.getElementById('coverYoutubeIframe');
              if (ytIfrScroll && ytIfrScroll.contentWindow) {
                try {
                  ytIfrScroll.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                } catch(e) {}
              }
              var videoEl = document.getElementById('coverVideo');
              if (videoEl && !videoEl.paused) {
                videoEl.pause();
                var centerAction = document.getElementById('coverCenterAction');
                if (centerAction) {
                  centerAction.style.display = 'flex';
                  centerAction.style.opacity = '1';
                }
                var playBtn = document.getElementById('coverPlayBtn');
                if (playBtn) {
                  var playSvg = playBtn.querySelector('.play-svg');
                  var pauseSvg = playBtn.querySelector('.pause-svg');
                  if (playSvg) playSvg.style.display = 'block';
                  if (pauseSvg) pauseSvg.style.display = 'none';
                }
              }
            }
          }
        }
      }, { passive: true });
    }

    // Handle screen rotation or resize
    window.addEventListener('resize', function() {
      scrollSliderToActive();
    }, { passive: true });

    // Initialize arrows and values on load
    loadContactFields();
    updateArrowsState();
    updateFinalSummary();
  </script>
</body>
</html>`;
};
