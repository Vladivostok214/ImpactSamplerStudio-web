import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, ChevronRight, HelpCircle, Sparkles } from 'lucide-react';
import { FAQ_DATABASE } from '../data/studioFaqDatabase';
import { searchFaqSemantic, ScoredFaqItem } from '../utils/nlpSearchEngine';

interface StudioAssistantAvatarProps {
  onOpenSequencer?: () => void;
  onOpenKeys?: () => void;
  onOpenInstruments?: () => void;
  onToggleMetronome?: () => void;
}

export const StudioAssistantAvatar: React.FC<StudioAssistantAvatarProps> = ({
  onOpenSequencer,
  onOpenKeys,
  onOpenInstruments,
  onToggleMetronome,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Posición relativa de la mirada (seguimiento sutil del cursor)
  const [lookPos, setLookPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Ciclo orgánico de parpadeo (cada 3.5 a 5 segundos)
  useEffect(() => {
    let blinkTimer: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      const delay = 3000 + Math.random() * 2500;
      blinkTimer = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 180);
      }, delay);
    };

    scheduleBlink();
    return () => clearTimeout(blinkTimer);
  }, []);

  // Ocultar burbuja de saludo inicial tras 7 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowGreeting(false);
    }, 7000);
    return () => clearTimeout(timer);
  }, []);

  // Seguimiento suave del cursor del ratón para dar vida a la mirada
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const x = ((e.clientX / winW) - 0.5) * 2; // -1 a 1
      const y = ((e.clientY / winH) - 0.5) * 2;
      setLookPos({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Cerrar con tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Búsqueda Semántica con NLP y Puntuación de Relevancia (0 ms de latencia)
  const searchResults: ScoredFaqItem[] = useMemo(() => {
    return searchFaqSemantic(searchQuery, 'all', FAQ_DATABASE);
  }, [searchQuery]);

  // Auto-desplegar la mejor respuesta cuando el usuario escribe una pregunta abierta
  useEffect(() => {
    if (searchQuery.trim().length >= 4 && searchResults.length > 0 && searchResults[0].isBestMatch) {
      setExpandedFaqId(searchResults[0].item.id);
    }
  }, [searchQuery, searchResults]);

  const handleExecuteAction = (type: string) => {
    if (type === 'open_seq') {
      onOpenSequencer?.();
      setIsOpen(false);
    } else if (type === 'open_keys') {
      onOpenKeys?.();
      setIsOpen(false);
    } else if (type === 'open_instruments') {
      onOpenInstruments?.();
      setIsOpen(false);
    } else if (type === 'toggle_metronome') {
      onToggleMetronome?.();
    }
  };

  // Renderizador de ojos humanos/cibernéticos estilizados
  const renderEyes = (size: 'sm' | 'lg' = 'sm') => {
    const isSm = size === 'sm';
    const pupilOffsetX = lookPos.x * (isSm ? 1.8 : 3.5);
    const pupilOffsetY = lookPos.y * (isSm ? 1.2 : 2.5);

    const eyeScaleY = isBlinking ? 0.08 : isHovered ? 1.15 : 1;

    return (
      <svg
        viewBox="0 0 100 50"
        className={isSm ? 'w-9 h-5' : 'w-16 h-8'}
        style={{
          filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.75))',
          transition: 'transform 0.15s ease',
        }}
      >
        <defs>
          <radialGradient id={`irisGlow-${size}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="65%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#064e3b" />
          </radialGradient>
          <filter id={`eyeShine-${size}`}>
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ojo Izquierdo */}
        <g
          transform={`translate(30, 25) scale(1, ${eyeScaleY})`}
          style={{ transformOrigin: '30px 25px', transition: 'transform 0.08s ease-out' }}
        >
          {/* Esclerótica / Contorno humano almendrado */}
          <path
            d="M -18,0 Q 0,-12 18,0 Q 0,12 -18,0 Z"
            fill="#091410"
            stroke="#10b981"
            strokeWidth="1.8"
            strokeOpacity="0.8"
          />
          {/* Iris Esmeralda Reactivo */}
          <g transform={`translate(${pupilOffsetX}, ${pupilOffsetY})`}>
            <circle cx="0" cy="0" r="7.5" fill={`url(#irisGlow-${size})`} />
            {/* Pupila */}
            <circle cx="0" cy="0" r="3.8" fill="#021c14" />
            {/* Brillo especular de luz humana */}
            <circle cx="-2.2" cy="-2.2" r="1.8" fill="#ffffff" opacity="0.9" />
            <circle cx="2" cy="1.8" r="0.8" fill="#a7f3d0" opacity="0.7" />
          </g>
        </g>

        {/* Ojo Derecho */}
        <g
          transform={`translate(70, 25) scale(1, ${eyeScaleY})`}
          style={{ transformOrigin: '70px 25px', transition: 'transform 0.08s ease-out' }}
        >
          {/* Esclerótica / Contorno humano almendrado */}
          <path
            d="M -18,0 Q 0,-12 18,0 Q 0,12 -18,0 Z"
            fill="#091410"
            stroke="#10b981"
            strokeWidth="1.8"
            strokeOpacity="0.8"
          />
          {/* Iris Esmeralda Reactivo */}
          <g transform={`translate(${pupilOffsetX}, ${pupilOffsetY})`}>
            <circle cx="0" cy="0" r="7.5" fill={`url(#irisGlow-${size})`} />
            {/* Pupila */}
            <circle cx="0" cy="0" r="3.8" fill="#021c14" />
            {/* Brillo especular de luz humana */}
            <circle cx="-2.2" cy="-2.2" r="1.8" fill="#ffffff" opacity="0.9" />
            <circle cx="2" cy="1.8" r="0.8" fill="#a7f3d0" opacity="0.7" />
          </g>
        </g>
      </svg>
    );
  };

  return (
    <>
      {/* Botón Flotante del Avatar (Esquina inferior derecha) */}
      <div className="fixed bottom-12 right-4 z-40 flex items-center gap-3 select-none">
        {/* Burbuja de Saludo Inicial Flotante */}
        {showGreeting && !isOpen && (
          <div
            onClick={() => {
              setIsOpen(true);
              setShowGreeting(false);
            }}
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950/90 border border-emerald-500/40 shadow-[0_4px_20px_rgba(16,185,129,0.25)] text-xs text-zinc-300 font-mono backdrop-blur-md cursor-pointer animate-in fade-in slide-in-from-right-4 duration-300 hover:border-emerald-400"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>¿Tienes dudas? Pregúntale a Vostok</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowGreeting(false);
              }}
              className="text-zinc-500 hover:text-zinc-300 ml-1 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Cápsula Flotante del Avatar con Ojos Vivos */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setShowGreeting(false);
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`group relative w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all duration-300 active:scale-90 ${
            isOpen
              ? 'bg-emerald-950 border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.65)] scale-105'
              : 'bg-zinc-950/90 border border-emerald-500/40 hover:border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] backdrop-blur-md'
          }`}
          title="Asistente Vostok"
        >
          {/* Anillo de pulso sutil cuando está cerrado */}
          {!isOpen && (
            <span className="absolute inset-0 rounded-full border border-emerald-400/30 animate-ping opacity-40 pointer-events-none" />
          )}

          {/* Ojos Humanos Digitales */}
          <div className="relative z-10 flex flex-col items-center">
            {renderEyes('sm')}
            <span className="text-[8px] font-mono font-bold tracking-widest text-emerald-400/90 mt-0.5">
              VOSTOK
            </span>
          </div>
        </button>
      </div>

      {/* Popup Flotante Minimalista de Vostok (HUD anclado en la esquina inferior derecha) */}
      {isOpen && (
        <>
          {/* Backdrop sutil e interactivo para cerrar al hacer clic afuera */}
          <div
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div
            className="fixed bottom-28 right-4 sm:right-6 z-50 w-[350px] sm:w-[380px] max-h-[480px] flex flex-col rounded-2xl bg-[#090b10]/95 border border-white/10 shadow-[0_12px_45px_rgba(0,0,0,0.85),0_0_25px_rgba(16,185,129,0.18)] backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-150"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
          >
            {/* Cabecera Minimalista */}
            <div className="px-3.5 py-2.5 border-b border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                <span className="text-xs font-mono font-bold tracking-wider text-white">VOSTOK</span>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition"
                title="Cerrar (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Buscador Integrado */}
            <div className="p-3 border-b border-white/[0.06] bg-black/40">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="¿Qué necesitas saber?"
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/[0.04] border border-white/10 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-xs font-mono text-white placeholder:text-zinc-500 transition"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Contenido: ¿Qué necesitas saber? o Lista de Resultados */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              {!searchQuery.trim() ? (
                /* Vista Inicial Compacta */
                <div className="py-3 px-2 flex flex-col items-center text-center animate-in fade-in duration-150">
                  <div className="w-12 h-12 rounded-xl bg-black border border-emerald-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.25)] mb-2.5">
                    {renderEyes('sm')}
                  </div>

                  <h4 className="text-sm font-mono font-bold text-white tracking-wide">
                    ¿Qué necesitas saber?
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1 max-w-[260px]">
                    Escribe tu consulta arriba o pulsa en uno de los temas frecuentes:
                  </p>

                  <div className="mt-3.5 w-full flex flex-col gap-1.5">
                    {[
                      { label: '🎹 Teclado de la computadora', query: 'teclado' },
                      { label: '🥁 Grabar en el secuenciador', query: 'grabar' },
                      { label: '🔌 Conectar teclado MIDI', query: 'midi' },
                      { label: '🎛 Ruteo de Efectos (Delay/Reverb)', query: 'efectos' },
                      { label: '🎻 Cambiar o cargar Instrumentos', query: 'instrumento' },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSearchQuery(item.query)}
                        className="w-full px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-emerald-950/30 border border-white/5 hover:border-emerald-500/40 text-left text-xs font-mono text-zinc-300 hover:text-emerald-300 transition-all flex items-center justify-between group"
                      >
                        <span className="truncate text-[11px]">{item.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-emerald-400 transition-transform group-hover:translate-x-0.5 shrink-0 ml-1.5" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
                  <HelpCircle className="w-6 h-6 text-zinc-600 mb-2" />
                  <p className="text-xs font-mono text-zinc-400">Sin coincidencias</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 max-w-[240px]">
                    Prueba buscando "teclado", "grabar", "midi", "efectos" o "sonido".
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-3 px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/10 text-[10px] font-mono text-zinc-300"
                  >
                    Volver al inicio
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1 mb-1 text-[10px] font-mono text-zinc-500">
                    <span>{searchResults.length} {searchResults.length === 1 ? 'coincidencia' : 'coincidencias'}</span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-emerald-400 hover:underline"
                    >
                      ← Volver
                    </button>
                  </div>
                  {searchResults.map(({ item: faq, isBestMatch }) => {
                    const isExpanded = expandedFaqId === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className={`rounded-xl border transition-all duration-150 overflow-hidden ${
                          isExpanded
                            ? 'bg-zinc-900/60 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
                            : 'bg-zinc-950/40 border-white/5 hover:border-white/10 hover:bg-zinc-900/30'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                          className="w-full px-3 py-2.5 text-left flex items-start justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[8.5px] font-mono uppercase tracking-wider text-emerald-400/80">
                                {faq.categoryLabel}
                              </span>
                              {isBestMatch && (
                                <span className="px-1 py-0.2 rounded text-[7.5px] font-mono bg-emerald-500 text-black font-black uppercase tracking-wider flex items-center gap-0.5">
                                  <Sparkles className="w-2 h-2" />
                                  <span>Relevante</span>
                                </span>
                              )}
                            </div>
                            <h5 className="text-xs font-semibold text-white tracking-tight">
                              {faq.question}
                            </h5>
                            {!isExpanded && (
                              <p className="text-[10.5px] text-zinc-400 mt-0.5 line-clamp-1">
                                {faq.shortAnswer}
                              </p>
                            )}
                          </div>
                          <ChevronRight
                            className={`w-3.5 h-3.5 text-zinc-500 mt-1 shrink-0 transition-transform duration-200 ${
                              isExpanded ? 'rotate-90 text-emerald-400' : ''
                            }`}
                          />
                        </button>

                        {isExpanded && (
                          <div className="px-3 pb-3 pt-1 border-t border-white/5 text-[11px] text-zinc-300 space-y-2 animate-in fade-in duration-100">
                            <p className="text-emerald-300/90 font-medium font-sans">
                              {faq.shortAnswer}
                            </p>
                            <ul className="space-y-1 bg-black/40 p-2 rounded-lg border border-white/5 font-mono text-[10px]">
                              {faq.detailedSteps.map((step, idx) => (
                                <li key={idx} className="flex items-start gap-1.5 text-zinc-300">
                                  <span className="text-emerald-400 shrink-0">•</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                            {faq.action && (
                              <div className="pt-1 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleExecuteAction(faq.action!.type)}
                                  className="px-2.5 py-1 rounded-md bg-emerald-500 text-black font-mono font-bold text-[10px] hover:bg-emerald-400 transition shadow-[0_0_10px_rgba(16,185,129,0.3)] flex items-center gap-1"
                                >
                                  <span>{faq.action.label}</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};
