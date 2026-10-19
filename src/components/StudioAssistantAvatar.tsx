import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, ChevronRight, HelpCircle, Sparkles } from 'lucide-react';
import { FAQ_DATABASE, FaqCategory } from '../data/studioFaqDatabase';
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
  const [activeCategory, setActiveCategory] = useState<FaqCategory>('all');
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
    return searchFaqSemantic(searchQuery, activeCategory, FAQ_DATABASE);
  }, [searchQuery, activeCategory]);

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

      {/* Modal / Panel Slide-Over del Asistente */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[#090b10] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_30px_rgba(16,185,129,0.15)] overflow-hidden"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
          >
            {/* Cabecera del Asistente con Avatar Grande */}
            <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-emerald-950/40 via-zinc-900/60 to-black flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-black border border-emerald-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  {renderEyes('sm')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold tracking-wide text-white font-mono">
                      IMPACT <span className="text-emerald-400">VOSTOK</span>
                    </h3>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      STUDIO AI
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                    Asistente de configuración, atajos de hardware y herramientas de audio
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Buscador Predictivo */}
            <div className="p-4 border-b border-white/5 bg-zinc-950/40">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="¿Qué necesitas saber? Escribe tu consulta..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-xs font-mono text-white placeholder:text-zinc-500 transition"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filtros por Categoría */}
              <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 text-[11px] font-mono scrollbar-none">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'qwerty', label: 'Teclado QWERTY' },
                  { id: 'sequencer', label: 'Secuenciador & REC' },
                  { id: 'effects', label: 'Efectos & Ruteo' },
                  { id: 'midi', label: 'Controladores MIDI' },
                  { id: 'soundfonts', label: 'Instrumentos' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id as FaqCategory)}
                    className={`px-2.5 py-1 rounded-lg transition-all shrink-0 ${
                      activeCategory === cat.id
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                        : 'bg-white/[0.03] text-zinc-400 hover:text-white border border-white/5 hover:bg-white/[0.06]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contenido Principal: ¿Qué necesitas saber? o Lista de Resultados */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {!searchQuery.trim() && activeCategory === 'all' ? (
                /* Pantalla Inicial Limpia: ¿Qué necesitas saber? */
                <div className="py-8 px-4 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-2xl bg-black/90 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.25)] mb-3">
                    {renderEyes('lg')}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold font-mono text-white tracking-wide">
                    ¿Qué necesitas saber?
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1.5 max-w-sm font-sans">
                    Escribe tu consulta en el buscador de arriba o selecciona un tema frecuente para ver la respuesta:
                  </p>

                  {/* Sugerencias Rápidas */}
                  <div className="mt-5 w-full max-w-lg flex flex-col gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 text-left px-1">
                      Temas frecuentes:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                      {[
                        { text: '¿Cómo tocar con el teclado de la PC?', query: 'teclado' },
                        { text: '¿Cómo grabar patrones de batería?', query: 'grabar' },
                        { text: '¿Cómo conectar mi teclado MIDI?', query: 'midi' },
                        { text: '¿Cómo asignar controles con MIDI Learn?', query: 'learn' },
                        { text: '¿Cómo aplicar Delay y Reverb?', query: 'efectos' },
                        { text: '¿Cómo cambiar o descargar instrumentos?', query: 'instrumento' },
                      ].map((sug, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSearchQuery(sug.query)}
                          className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-emerald-950/30 border border-white/5 hover:border-emerald-500/40 text-xs text-zinc-300 hover:text-emerald-300 font-mono transition-all flex items-center justify-between group shadow-sm text-left"
                        >
                          <span className="truncate pr-1 text-[11px]">{sug.text}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-emerald-400 shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <HelpCircle className="w-8 h-8 text-zinc-600 mb-2" />
                  <p className="text-sm font-mono text-zinc-400">No encontramos respuestas para esa pregunta</p>
                  <p className="text-xs text-zinc-600 mt-1 max-w-sm">
                    Intenta preguntar de otra forma como "¿cómo activo el secuenciador?", "¿cómo cambio de octava?" o "¿cómo conectar MIDI?".
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategory('all');
                    }}
                    className="mt-4 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition"
                  >
                    Volver a inicio
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1 mb-1">
                    <span className="text-[10px] font-mono text-zinc-400">
                      {searchResults.length} {searchResults.length === 1 ? 'tema encontrado' : 'temas encontrados'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setActiveCategory('all');
                      }}
                      className="text-[10px] font-mono text-emerald-400/80 hover:text-emerald-300 underline"
                    >
                      ← Volver a inicio
                    </button>
                  </div>
                  {searchResults.map(({ item: faq, isBestMatch }) => {
                    const isExpanded = expandedFaqId === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                          isBestMatch && searchQuery.trim()
                            ? 'bg-emerald-950/20 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.12)]'
                            : isExpanded
                            ? 'bg-zinc-900/50 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
                            : 'bg-zinc-950/40 border-white/5 hover:border-white/10 hover:bg-zinc-900/30'
                        }`}
                      >
                        {/* Cabecera del ítem */}
                        <button
                          type="button"
                          onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                          className="w-full px-4 py-3 text-left flex items-start justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400/80 block">
                                {faq.categoryLabel}
                              </span>
                              {isBestMatch && searchQuery.trim().length >= 3 && (
                                <span className="px-1.5 py-0.2 rounded text-[8px] font-mono bg-emerald-500 text-black font-black uppercase tracking-wider shadow-[0_0_6px_#10b981] flex items-center gap-0.5">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>Mejor Coincidencia</span>
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-semibold text-white tracking-wide">
                              {faq.question}
                            </h4>
                            {!isExpanded && (
                              <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
                                {faq.shortAnswer}
                              </p>
                            )}
                          </div>
                          <ChevronRight
                            className={`w-4 h-4 text-zinc-500 mt-1 shrink-0 transition-transform duration-200 ${
                              isExpanded ? 'rotate-90 text-emerald-400' : ''
                            }`}
                          />
                        </button>

                        {/* Detalles desplegables */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 border-t border-white/5 text-xs text-zinc-300 space-y-2 animate-in fade-in duration-150">
                            <p className="text-emerald-300/90 font-medium font-sans">
                              {faq.shortAnswer}
                            </p>

                            <ul className="space-y-1.5 mt-2 bg-black/40 p-3 rounded-lg border border-white/5 font-mono text-[11px]">
                              {faq.detailedSteps.map((step, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-zinc-300">
                                  <span className="text-emerald-400 shrink-0 mt-0.5">•</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>

                            {/* Botón de acción interactiva si existe */}
                            {faq.action && (
                              <div className="pt-2 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleExecuteAction(faq.action!.type)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-mono font-bold text-[11px] hover:bg-emerald-400 transition shadow-[0_0_12px_rgba(16,185,129,0.3)] flex items-center gap-1.5"
                                >
                                  <span>{faq.action.label}</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
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

            {/* Pie del Asistente */}
            <div className="px-5 py-3 border-t border-white/10 bg-zinc-950/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span>VOSTOK Studio AI Assistant</span>
              <span className="text-zinc-600">Presiona [Esc] para cerrar</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
