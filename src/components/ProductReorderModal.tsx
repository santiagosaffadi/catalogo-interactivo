import React, { useState } from "react";
import {
  X,
  GripVertical,
  ArrowLeft,
  ArrowRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ArrowUpDown,
  Sparkles,
  Check,
  LayoutGrid,
  ChevronDown,
  Edit3,
  SlidersHorizontal,
  Globe
} from "lucide-react";
import { Product, CatalogSettings } from "../types";

interface ProductReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onReorder: (newProducts: Product[]) => void;
  activeProductId: string;
  onSelectProduct: (id: string) => void;
  settings: CatalogSettings;
}

export function ProductReorderModal({
  isOpen,
  onClose,
  products,
  onReorder,
  activeProductId,
  onSelectProduct,
  settings
}: ProductReorderModalProps) {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSortMenu, setShowSortMenu] = useState(false);

  if (!isOpen) return null;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const reordered = [...products];
    const [moved] = reordered.splice(draggedIdx, 1);
    reordered.splice(targetIndex, 0, moved);

    onReorder(reordered);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const moveToPosition = (fromIdx: number, targetIdx: number) => {
    if (fromIdx === targetIdx) return;
    if (targetIdx < 0 || targetIdx >= products.length) return;
    const reordered = [...products];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    onReorder(reordered);
  };

  const moveToStart = (idx: number) => {
    moveToPosition(idx, 0);
  };

  const moveToEnd = (idx: number) => {
    moveToPosition(idx, products.length - 1);
  };

  const moveLeft = (idx: number) => {
    if (idx > 0) moveToPosition(idx, idx - 1);
  };

  const moveRight = (idx: number) => {
    if (idx < products.length - 1) moveToPosition(idx, idx + 1);
  };

  const handleReverseOrder = () => {
    const reordered = [...products].reverse();
    onReorder(reordered);
    setShowSortMenu(false);
  };

  const handleSortByName = (asc = true) => {
    const reordered = [...products].sort((a, b) => {
      const nameA = a.title || "";
      const nameB = b.title || "";
      return asc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
    onReorder(reordered);
    setShowSortMenu(false);
  };

  const handleSortByPrice = (asc = true) => {
    const reordered = [...products].sort((a, b) => {
      const priceA = a.retailPrice || 0;
      const priceB = b.retailPrice || 0;
      return asc ? priceA - priceB : priceB - priceA;
    });
    onReorder(reordered);
    setShowSortMenu(false);
  };

  const filteredIndices = products
    .map((p, idx) => ({ product: p, originalIndex: idx }))
    .filter(({ product }) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        (product.title && product.title.toLowerCase().includes(query)) ||
        (product.description && product.description.toLowerCase().includes(query)) ||
        (product.retailPrice && product.retailPrice.toString().includes(query))
      );
    });

  return (
    <div
      id="product-reorder-modal-backdrop"
      className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="product-reorder-modal-container"
        className="bg-white w-full max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: settings.themeColor || "#2563eb" }}
            >
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight font-display">
                  Organizador de Prendas en Mosaico
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {products.length} {products.length === 1 ? "prenda" : "prendas"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Arrastra las tarjetas o usa los botones rápidos para cambiar el orden en que las verá tu cliente.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 w-full md:w-auto justify-between md:justify-end">
            {/* Search filter input */}
            <div className="relative flex-1 md:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar prenda..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Sort Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
                title="Herramientas de ordenado rápido"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Ordenar</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showSortMenu && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-1">
                  <button
                    onClick={handleReverseOrder}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <span>🔄</span>
                    <span>Invertir orden actual</span>
                  </button>
                  <button
                    onClick={() => handleSortByName(true)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <span>🔤</span>
                    <span>Por Nombre (A - Z)</span>
                  </button>
                  <button
                    onClick={() => handleSortByName(false)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <span>🔤</span>
                    <span>Por Nombre (Z - A)</span>
                  </button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button
                    onClick={() => handleSortByPrice(true)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <span>💵</span>
                    <span>Por Menor Precio</span>
                  </button>
                  <button
                    onClick={() => handleSortByPrice(false)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <span>💎</span>
                    <span>Por Mayor Precio</span>
                  </button>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Listo</span>
            </button>
          </div>
        </div>

        {/* Modal Body / Mosaic Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60 no-scrollbar">
          {filteredIndices.length === 0 ? (
            <div className="text-center py-16">
              <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-600">No se encontraron prendas con "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery("")}
                className="mt-2 text-xs font-bold text-blue-600 hover:underline"
              >
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
              {filteredIndices.map(({ product: p, originalIndex: idx }) => {
                const isSelected = p.id === activeProductId;
                const isDragging = draggedIdx === idx;
                const isOver = dragOverIdx === idx && draggedIdx !== idx;

                return (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`group relative bg-white rounded-2xl border transition-all duration-150 flex flex-col overflow-hidden shadow-xs select-none ${
                      isSelected
                        ? "ring-2 ring-blue-500 border-blue-400 shadow-md"
                        : "border-slate-200/80 hover:border-slate-300 hover:shadow-sm"
                    } ${isDragging ? "opacity-30 scale-95 border-dashed border-blue-500" : ""} ${
                      isOver ? "ring-2 ring-emerald-500 border-emerald-500 scale-[1.02] shadow-lg" : ""
                    }`}
                  >
                    {/* Top Floating Badges */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
                      {/* Position sequence badge (#1, #2, ...) */}
                      <span
                        className="text-[11px] font-black px-2 py-0.5 rounded-lg shadow-sm font-mono text-white flex items-center gap-1"
                        style={{
                          backgroundColor: idx === 0 ? "#10b981" : settings.themeColor || "#1e293b"
                        }}
                      >
                        #{idx + 1}
                        {idx === 0 && <span className="text-[9px] font-bold uppercase tracking-wider">Portada</span>}
                      </span>

                      {/* Indicators */}
                      <div className="flex items-center gap-1">
                        {p.isExistingInStore && (
                          <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-md bg-blue-500/90 text-white shadow-xs flex items-center gap-0.5">
                            <Globe className="w-2.5 h-2.5" />
                            <span>Tienda</span>
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-600 text-white shadow-xs">
                            Editando
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Image Preview / Drag Handle Area */}
                    <div
                      onClick={() => onSelectProduct(p.id)}
                      className="relative aspect-square w-full bg-slate-50 overflow-hidden cursor-grab active:cursor-grabbing border-b border-slate-100 flex items-center justify-center"
                    >
                      <img
                        src={p.images[0]}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                      />

                      {/* Drag overlay hint */}
                      <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-white/90 backdrop-blur-xs px-2 py-1 rounded-lg text-[10px] font-bold text-slate-700 flex items-center gap-1 shadow-sm">
                          <GripVertical className="w-3 h-3 text-slate-500" />
                          <span>Arrastrar</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Info & Details */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                      <div>
                        <h4
                          onClick={() => onSelectProduct(p.id)}
                          className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors cursor-pointer"
                          title={p.title}
                        >
                          {p.title || "Prenda sin título"}
                        </h4>
                        <div className="flex items-center justify-between mt-1 text-[11px]">
                          <span className="font-extrabold font-mono text-slate-700">
                            {settings.currency}{p.retailPrice.toLocaleString("es-AR")}
                          </span>
                          <span className="text-[10px] font-bold font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                            May: {settings.currency}{Math.round(p.retailPrice / 2).toLocaleString("es-AR")}
                          </span>
                        </div>
                      </div>

                      {/* Position Quick Selector Dropdown */}
                      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Posición:</span>
                        <select
                          value={idx}
                          onChange={(e) => moveToPosition(idx, Number(e.target.value))}
                          className="text-[10px] font-bold font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                          title="Cambiar posición numérica directa"
                        >
                          {products.map((_, pIdx) => (
                            <option key={pIdx} value={pIdx}>
                              #{pIdx + 1} {pIdx === 0 ? "(Portada)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quick Move Button Row */}
                      <div className="flex items-center justify-between gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/60">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveToStart(idx);
                          }}
                          disabled={idx === 0}
                          className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white disabled:opacity-20 disabled:pointer-events-none transition-all shadow-2xs cursor-pointer"
                          title="Mover al inicio (#1)"
                        >
                          <ChevronsLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveLeft(idx);
                          }}
                          disabled={idx === 0}
                          className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white disabled:opacity-20 disabled:pointer-events-none transition-all shadow-2xs cursor-pointer"
                          title="Mover 1 a la izquierda"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveRight(idx);
                          }}
                          disabled={idx === products.length - 1}
                          className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white disabled:opacity-20 disabled:pointer-events-none transition-all shadow-2xs cursor-pointer"
                          title="Mover 1 a la derecha"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveToEnd(idx);
                          }}
                          disabled={idx === products.length - 1}
                          className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white disabled:opacity-20 disabled:pointer-events-none transition-all shadow-2xs cursor-pointer"
                          title="Mover al final"
                        >
                          <ChevronsRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Select/Edit Button */}
                      <button
                        onClick={() => {
                          onSelectProduct(p.id);
                          onClose();
                        }}
                        className="w-full text-center py-1 rounded-lg text-[10.5px] font-bold text-slate-600 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200/50 hover:border-blue-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Editar prenda</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="font-medium hidden sm:inline">
              Los cambios se guardan automáticamente en tu catálogo y sincronización en tiempo real.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer ml-auto"
          >
            Aceptar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
