import React, { useState, useRef } from 'react';
import { X, Check, Upload, Trash2, ArrowRight, Loader2, DownloadCloud, Sparkles } from 'lucide-react';
import { SoundFontInfo } from '../types/soundfont';
import pianoImg from '../assets/instruments/piano.png';
import rhodesImg from '../assets/instruments/rhodes.png';
import melotronImg from '../assets/instruments/melotron.png';
import rx7Img from '../assets/instruments/yamaharx7.png';

export interface FactoryInstrumentDef {
  id: string;
  filename: string;
  displayName: string;
  subtitle: string;
  description: string;
  fileSizeMb: number;
  downloadUrl: string;
  imgSrc: string;
  theme: {
    border: string;
    glow: string;
    activeLed: string;
    accentText: string;
    btnColor: string;
  };
}

export const FACTORY_INSTRUMENTS: FactoryInstrumentDef[] = [
  {
    id: 'Yamaha_RX7_Drums.sf2',
    filename: 'Yamaha_RX7_Drums.sf2',
    displayName: 'Yamaha RX7',
    subtitle: '1987 PCM Drum Machine',
    description: 'Kit de percusión de fábrica de 16-bit PCM. Ideal para secuencias rítmicas TR.',
    fileSizeMb: 19.3,
    downloadUrl: 'https://github.com/Vladivostok214/ImpactSamplerStudio/releases/download/soundfonts-v1.0.0/Yamaha_RX7_Drums.sf2',
    imgSrc: rx7Img,
    theme: {
      border: 'border-purple-500/50 hover:border-purple-400',
      glow: 'shadow-[0_0_30px_rgba(168,85,247,0.25)]',
      activeLed: 'bg-purple-400 shadow-[0_0_8px_#c084fc]',
      accentText: 'text-purple-300',
      btnColor: 'bg-purple-500 hover:bg-purple-400 text-black',
    },
  },
  {
    id: 'Piano - Realtime.sf2',
    filename: 'Piano - Realtime.sf2',
    displayName: 'Grand Piano',
    subtitle: 'Steinway Concert Samples',
    description: 'Muestreo acústico estéreo de gran cola con respuesta dinámica natural.',
    fileSizeMb: 126.7,
    downloadUrl: 'https://github.com/Vladivostok214/ImpactSamplerStudio/releases/download/soundfonts-v1.0.0/Piano.-.Realtime.sf2',
    imgSrc: pianoImg,
    theme: {
      border: 'border-amber-500/50 hover:border-amber-400',
      glow: 'shadow-[0_0_30px_rgba(245,158,11,0.25)]',
      activeLed: 'bg-amber-400 shadow-[0_0_8px_#f59e0b]',
      accentText: 'text-amber-300',
      btnColor: 'bg-amber-500 hover:bg-amber-400 text-black',
    },
  },
  {
    id: 'Rhodes (from Dream Piano).sf2',
    filename: 'Rhodes (from Dream Piano).sf2',
    displayName: 'Rhodes Mark I',
    subtitle: 'Vintage Electro-Mechanic',
    description: 'Timbres clásicos de púas electromecánicas con calidez analógica y timbre aterciopelado.',
    fileSizeMb: 522.1,
    downloadUrl: 'https://github.com/Vladivostok214/ImpactSamplerStudio/releases/download/soundfonts-v1.0.0/Rhodes.from.Dream.Piano.sf2',
    imgSrc: rhodesImg,
    theme: {
      border: 'border-cyan-500/50 hover:border-cyan-400',
      glow: 'shadow-[0_0_30px_rgba(6,182,212,0.25)]',
      activeLed: 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]',
      accentText: 'text-cyan-300',
      btnColor: 'bg-cyan-500 hover:bg-cyan-400 text-black',
    },
  },
  {
    id: 'Mellotron.sf2',
    filename: 'Mellotron.sf2',
    displayName: 'Mellotron Tape',
    subtitle: 'Classic Analog Tape',
    description: 'Sonidos psicodélicos de cintas magnéticas de los años 60: flautas, cuerdas y coros.',
    fileSizeMb: 116.2,
    downloadUrl: 'https://github.com/Vladivostok214/ImpactSamplerStudio/releases/download/soundfonts-v1.0.0/Mellotron.sf2',
    imgSrc: melotronImg,
    theme: {
      border: 'border-rose-500/50 hover:border-rose-400',
      glow: 'shadow-[0_0_30px_rgba(244,63,94,0.25)]',
      activeLed: 'bg-rose-400 shadow-[0_0_8px_#f43f5e]',
      accentText: 'text-rose-300',
      btnColor: 'bg-rose-500 hover:bg-rose-400 text-black',
    },
  },
];

interface InstrumentSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSoundfont: SoundFontInfo | null;
  savedSoundfonts: { id: string; displayName: string; fileSizeMb: number }[];
  onSelectStored: (id: string) => Promise<void>;
  onDownloadFactory: (instrument: FactoryInstrumentDef) => Promise<void>;
  onImportFile: (file: File) => Promise<void>;
  onDeleteStored: (id: string) => Promise<void>;
  downloadProgress: { [id: string]: number }; // 0..100
  downloadingId: string | null;
}

export const InstrumentSelectModal: React.FC<InstrumentSelectModalProps> = ({
  isOpen,
  onClose,
  currentSoundfont,
  savedSoundfonts,
  onSelectStored,
  onDownloadFactory,
  onImportFile,
  onDeleteStored,
  downloadProgress,
  downloadingId,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await onImportFile(e.target.files[0]);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await onImportFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 select-none">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`w-full max-w-5xl bg-[#08090d] border ${
          dragOver ? 'border-cyan-400 ring-2 ring-cyan-400/50' : 'border-white/15'
        } rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] flex flex-col max-h-[92vh] overflow-hidden transition-all`}
      >
        {/* Cabecera del Modal */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#121318] to-[#0a0b0e]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wider uppercase">
                Catálogo de Instrumentos
              </h2>
              <p className="text-[11px] text-zinc-400 font-mono">
                Modelos de fábrica y SoundFonts locales persistidos en WebAssembly
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".sf2"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar .SF2</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-black/40 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contenido con Scroll: Instrumentos de Fábrica + Instrumentos de Usuario */}
        <div className="p-5 overflow-y-auto space-y-6">
          {/* 1. Modelos de Fábrica (Grand Piano, Rhodes, Mellotron, Yamaha RX7) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-zinc-400">
                Colección de Fábrica
              </h3>
              <span className="text-[10px] font-mono text-zinc-500">
                Calidad de estudio profesional
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FACTORY_INSTRUMENTS.map((inst) => {
                const isSelected = currentSoundfont?.filename === inst.filename;
                const isSaved = savedSoundfonts.some((s) => s.id === inst.id);
                const isDownloading = downloadingId === inst.id;
                const progress = downloadProgress[inst.id] || 0;

                return (
                  <div
                    key={inst.id}
                    className={`rounded-xl border ${inst.theme.border} bg-gradient-to-b from-[#13141a] to-[#0a0a0e] p-3.5 flex flex-col justify-between transition-all duration-200 relative overflow-hidden group ${
                      isSelected ? inst.theme.glow : 'hover:scale-[1.01]'
                    }`}
                  >
                    {/* Render Fotográfico */}
                    <div className="relative w-full h-28 rounded-lg bg-black/60 border border-white/10 overflow-hidden flex items-center justify-center p-2 mb-3">
                      <img
                        src={inst.imgSrc}
                        alt={inst.displayName}
                        className="max-h-full max-w-full object-contain filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] group-hover:scale-105 transition-transform duration-300"
                      />
                      {isSelected && (
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/80 border border-emerald-500/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                          <span className="text-[9px] font-mono text-emerald-300 font-bold">ACTIVO</span>
                        </div>
                      )}
                    </div>

                    {/* Metadatos */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white font-mono">{inst.displayName}</h4>
                        <span className="text-[10px] font-mono text-zinc-400 font-bold">
                          {inst.fileSizeMb} MB
                        </span>
                      </div>
                      <p className={`text-[10.5px] font-mono font-medium ${inst.theme.accentText} mt-0.5`}>
                        {inst.subtitle}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {inst.description}
                      </p>
                    </div>

                    {/* Barra de Progreso si está descargando */}
                    {isDownloading && (
                      <div className="mb-2">
                        <div className="flex justify-between text-[9.5px] font-mono text-amber-300 mb-1">
                          <span className="flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Descargando...
                          </span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                          <div
                            className="h-full bg-amber-400 transition-all duration-150"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Botón de Acción */}
                    <div>
                      {isSelected ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <button
                            type="button"
                            disabled
                            className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold flex items-center justify-center gap-1.5 cursor-default"
                          >
                            <Check className="w-3.5 h-3.5" /> En Uso
                          </button>
                        </div>
                      ) : isSaved ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <button
                            type="button"
                            onClick={() => onSelectStored(inst.id)}
                            className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                          >
                            <span>Cargar</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteStored(inst.id)}
                            className="w-8 h-8 rounded-lg bg-black/40 hover:bg-rose-950/40 border border-white/10 text-zinc-500 hover:text-rose-400 flex items-center justify-center transition cursor-pointer"
                            title="Eliminar de almacenamiento local"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isDownloading}
                          onClick={() => onDownloadFactory(inst)}
                          className={`w-full py-1.5 rounded-lg ${inst.theme.btnColor} font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md`}
                        >
                          <DownloadCloud className="w-3.5 h-3.5" />
                          <span>Descargar ({inst.fileSizeMb} MB)</span>
                        </button>
                      )}

                      {!isSelected && !isSaved && !isDownloading && (
                        <div className="flex justify-end mt-1.5">
                          <a
                            href={inst.downloadUrl}
                            download={inst.filename}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9.5px] font-mono text-zinc-500 hover:text-cyan-400 transition underline underline-offset-2"
                            title="Descargar archivo .sf2 directamente a tu disco para importarlo manualmente"
                          >
                            Descarga directa .sf2
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. SoundFonts Personalizados / Importados por el Usuario Guardados en IndexedDB */}
          {(() => {
            const customSoundfonts = savedSoundfonts.filter(
              (s) => !FACTORY_INSTRUMENTS.some((f) => f.id === s.id)
            );
            if (customSoundfonts.length === 0) return null;

            return (
              <div className="pt-2 border-t border-white/10">
                <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-zinc-400 mb-3">
                  Biblioteca de Usuario / Archivos Importados ({customSoundfonts.length})
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {customSoundfonts.map((sf) => {
                    const isCurrent = currentSoundfont?.id === sf.id || currentSoundfont?.filename === sf.id;
                    return (
                      <div
                        key={sf.id}
                        onClick={() => onSelectStored(sf.id)}
                        className={`px-3 py-2.5 rounded-xl border ${
                          isCurrent
                            ? 'border-emerald-500/50 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                            : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                        } flex items-center justify-between gap-3 cursor-pointer transition`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isCurrent ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-zinc-600'
                              }`}
                            />
                            <h5 className="text-xs font-mono font-bold text-white truncate max-w-[180px]">
                              {sf.displayName}
                            </h5>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500 ml-3.5">
                            {sf.fileSizeMb.toFixed(1)} MB · Guardado offline
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteStored(sf.id);
                            }}
                            className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-white/10 transition cursor-pointer"
                            title="Eliminar de almacenamiento local"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Zona de Arrastrar y Soltar */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-6 rounded-xl border-2 border-dashed border-white/15 hover:border-cyan-400/50 bg-black/30 flex flex-col items-center justify-center text-center cursor-pointer transition group"
          >
            <Upload className="w-6 h-6 text-zinc-500 group-hover:text-cyan-400 group-hover:scale-110 transition mb-2" />
            <p className="text-xs font-mono font-bold text-zinc-300">
              Arrastra un archivo SoundFont (.sf2) aquí o haz clic para explorar
            </p>
            <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
              Se almacenará localmente en tu navegador sin subir a ningún servidor
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
