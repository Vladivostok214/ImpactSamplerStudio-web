import React, { useState, useEffect } from 'react';
import { RotateCw, Maximize2, Sparkles } from 'lucide-react';

export const OrientationGuard: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Solo activamos la guardia en dispositivos con ancho o alto móvil/tablet (<= 1024px)
      const isMobileSize = window.innerWidth <= 1024 || window.innerHeight <= 1024;
      const isVertical = window.innerHeight > window.innerWidth;
      setIsPortrait(isMobileSize && isVertical);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleFullscreenRequest = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      // Intentar bloqueo de orientación si la API está disponible
      if ('orientation' in screen && 'lock' in (screen.orientation as any)) {
        await (screen.orientation as any).lock('landscape').catch(() => {
          // Ignorar si el navegador o sistema restringe el bloqueo
        });
      }
    } catch {
      // Ignorar rechazos de fullscreen
    }
  };

  if (!isPortrait || dismissed) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-[#050507] text-white select-none overflow-hidden">
      {/* Fondo Noir-Tech con Iluminación Cenital y Rejilla */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 35%, rgba(6, 182, 212, 0.15) 0%, rgba(16, 185, 129, 0.05) 45%, transparent 75%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255, 255, 255, 0.25) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
        {/* Teléfono Animado Rotando a Horizontal */}
        <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
          {/* Anillo de Pulso */}
          <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping opacity-40" />

          {/* Halo Glow */}
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-cyan-500/10 via-emerald-500/10 to-transparent border border-white/10 flex items-center justify-center shadow-[0_0_35px_rgba(6,182,212,0.25)]">
            <div className="animate-tilt-landscape origin-center">
              <div className="w-12 h-20 rounded-xl border-2 border-cyan-400 bg-black/60 flex flex-col items-center justify-between p-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                {/* Altavoz Superior */}
                <div className="w-4 h-1 rounded-full bg-cyan-400/60" />
                {/* Icono de Rotación Central */}
                <RotateCw className="w-5 h-5 text-emerald-400 animate-spin" />
                {/* Botón Home / Barra Inferior */}
                <div className="w-3 h-0.5 rounded-full bg-cyan-400/40" />
              </div>
            </div>
          </div>
        </div>

        {/* Título y Mensaje */}
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h2 className="text-base sm:text-lg font-bold font-mono tracking-wider uppercase text-white">
            GIRA TU DISPOSITIVO
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans mb-8">
          Para una experiencia de interpretación táctil precisa, la consola de estudio requiere ser visualizada en{' '}
          <span className="text-cyan-300 font-bold">modo horizontal (Landscape)</span>.
        </p>

        {/* Botón de Pantalla Completa */}
        <button
          type="button"
          onClick={handleFullscreenRequest}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-cyan-500/20 mb-3 cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
          <span>Pantalla Completa</span>
        </button>

        {/* Enlace para continuar de todos modos */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition underline underline-offset-4 cursor-pointer"
        >
          Continuar en modo vertical
        </button>
      </div>
    </div>
  );
};
