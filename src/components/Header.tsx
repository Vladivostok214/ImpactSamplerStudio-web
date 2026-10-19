import React, { useState, useRef, useEffect } from "react";
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Radio,
  Activity,
  Keyboard,
  Sliders,
} from "lucide-react";
import { NormalizedMidiEvent } from "../types/midi";
import { MidiDinIcon, MidiStreamPopover } from "./MidiStreamPopover";
import { SoundFontInfo } from "../types/soundfont";

interface HeaderProps {
  onOpenInstrumentSelect: () => void;
  currentSoundfont: SoundFontInfo | null;
  midiEvents?: NormalizedMidiEvent[];
  onClearMidiEvents?: () => void;
  midiDevices?: string[];
  isAudioStarted: boolean;
  audioSampleRate?: number;
  audioLatencyMs?: number;
  masterGain: number; // 0..1
  onMasterGainChange: (gain: number) => void;
  isMidiLearnActive?: boolean;
  onToggleMidiLearn?: () => void;
  qwertyEnabled?: boolean;
  onToggleQwerty?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenInstrumentSelect,
  currentSoundfont,
  midiEvents = [],
  onClearMidiEvents,
  midiDevices = [],
  isAudioStarted,
  audioSampleRate = 48000,
  audioLatencyMs = 5.3,
  masterGain = 0.8,
  onMasterGainChange,
  isMidiLearnActive = false,
  onToggleMidiLearn,
  qwertyEnabled = false,
  onToggleQwerty,
}) => {
  const [isMidiPopoverOpen, setIsMidiPopoverOpen] = useState(false);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);

  const midiTriggerRef = useRef<HTMLButtonElement>(null);
  const volumeTriggerRef = useRef<HTMLButtonElement>(null);
  const volumePopoverRef = useRef<HTMLDivElement>(null);
  const lastNonZeroGainRef = useRef(masterGain > 0 ? masterGain : 0.8);

  const midiConnected = midiDevices.length > 0;
  const activePortName = midiConnected ? midiDevices[0] : "";

  // Cierre de popover de volumen al hacer clic afuera
  useEffect(() => {
    if (!isVolumeOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (volumeTriggerRef.current && volumeTriggerRef.current.contains(target)) {
        return;
      }
      if (volumePopoverRef.current && !volumePopoverRef.current.contains(target)) {
        setIsVolumeOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsVolumeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVolumeOpen]);

  const handleVolumeChange = (val: number) => {
    if (val > 0) lastNonZeroGainRef.current = val;
    onMasterGainChange(val);
  };

  const handleToggleMute = () => {
    if (masterGain > 0) {
      lastNonZeroGainRef.current = masterGain;
      handleVolumeChange(0);
    } else {
      handleVolumeChange(lastNonZeroGainRef.current || 0.8);
    }
  };

  const handleResetVolume = () => {
    handleVolumeChange(0.8);
  };

  return (
    <header className="h-14 bg-[#08080a]/80 backdrop-blur-md border-b border-white/[0.08] px-4 md:px-6 flex items-center justify-center z-30 shadow-[0_4px_30px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.06)] w-full transition-all safe-horizontal">
      {/* Contenedor con márgenes idénticos a los del chasis del instrumento (max-w-6xl) */}
      <div className="w-full max-w-6xl flex items-center justify-between gap-3">
        {/* Lado Izquierdo: Brand Logo + Selector de Instrumento + Monitores Hardware Inline */}
        <div className="flex items-center space-x-2.5 sm:space-x-3.5">
          {/* Logo Principal Interactivo (Abre Catálogo de Instrumentos) */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onOpenInstrumentSelect}
            className="text-sm font-black tracking-widest text-white flex items-center select-none hover:opacity-90 transition cursor-pointer group focus:outline-none shrink-0"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
            title={currentSoundfont ? `Instrumento actual: ${currentSoundfont.displayName} (Clic para abrir catálogo)` : "Abrir Catálogo de Instrumentos"}
          >
            <div className="w-6 h-6 rounded-md overflow-hidden mr-2 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.35)] flex items-center justify-center bg-black/60 shrink-0 group-hover:border-emerald-400 group-hover:shadow-[0_0_14px_rgba(16,185,129,0.6)] transition">
              <img src="/app-icon.png" alt="Impact Sampler" className="w-full h-full object-contain" />
            </div>
            <h1>
              IMPACT<span className="text-emerald-400 group-hover:drop-shadow-[0_0_10px_rgba(16,185,129,0.7)] transition-all">SAMPLER</span>
            </h1>
          </button>

          {/* Monitores Inline Telemetría (MIDI & Web Audio) */}
          <div className="hidden lg:flex items-center space-x-2.5 text-[11px] font-mono pl-1">
            {/* Monitor MIDI Status */}
            <div className="flex items-center space-x-1.5">
              <Radio
                size={12}
                className={midiConnected ? "text-emerald-400 animate-pulse" : "text-amber-500"}
              />
              <span className="text-zinc-500 hidden xl:inline">MIDI:</span>
              <span className={`truncate max-w-[140px] ${midiConnected ? "text-emerald-400 font-semibold" : "text-amber-400 font-medium"}`}>
                {midiConnected ? activePortName.replace(/Impact\s*/i, "") || "Conectado" : "Desconectado"}
              </span>
            </div>

            <span className="text-zinc-700">•</span>

            {/* Monitor Web Audio Hardware */}
            <div
              className="flex items-center space-x-1.5 text-zinc-300"
              title={`Web Audio · ${Math.round(audioSampleRate / 1000)}kHz · Latencia: ~${audioLatencyMs.toFixed(1)} ms`}
            >
              <Activity
                size={12}
                className={isAudioStarted ? "text-emerald-400" : "text-amber-400 animate-pulse"}
              />
              <span className="text-zinc-200 font-medium">
                {isAudioStarted ? "Web Audio" : "Suspendido"}
              </span>
              {isAudioStarted && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-400">
                    {Math.round(audioSampleRate / 1000)}kHz
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-emerald-400 font-medium">
                    ~{audioLatencyMs.toFixed(1)} ms
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Lado Derecho: Live MIDI DIN Popover + QWERTY + MIDI Learn + Master Volume */}
        <div className="flex items-center space-x-2">
          {/* Live MIDI Stream Popover Trigger (Icono DIN-5) */}
          <div className="relative">
            <button
              ref={midiTriggerRef}
              type="button"
              onClick={() => setIsMidiPopoverOpen((prev) => !prev)}
              className={`p-1.5 sm:p-2 rounded-xl border transition flex items-center justify-center shadow-sm cursor-pointer ${
                isMidiPopoverOpen
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  : "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border-white/[0.08]"
              }`}
              title="Monitor de Eventos MIDI en Vivo (DIN-5)"
            >
              <MidiDinIcon size={16} />
            </button>
            <MidiStreamPopover
              isOpen={isMidiPopoverOpen}
              onClose={() => setIsMidiPopoverOpen(false)}
              triggerRef={midiTriggerRef}
              events={midiEvents}
              onClear={onClearMidiEvents}
            />
          </div>

          {/* Botón Toggle de Teclado QWERTY */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onToggleQwerty}
            className={`px-2.5 py-1.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer text-xs font-mono select-none ${
              qwertyEnabled
                ? "bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)] font-bold"
                : "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border-white/[0.08]"
            }`}
            title="Activar / Desactivar tocar con teclado QWERTY de la PC"
          >
            <Keyboard size={14} className="shrink-0" />
            <span className="text-[11px] font-mono tracking-wider font-semibold hidden sm:inline">
              QWERTY
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full transition-all shrink-0 ${
                qwertyEnabled
                  ? "bg-amber-400 shadow-[0_0_8px_#f59e0b]"
                  : "bg-zinc-600"
              }`}
            />
          </button>

          {/* Botón Toggle de MIDI LEARN */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onToggleMidiLearn}
            className={`px-2.5 py-1.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer text-xs font-mono select-none ${
              isMidiLearnActive
                ? "bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] font-bold animate-pulse"
                : "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border-white/[0.08]"
            }`}
            title={isMidiLearnActive ? "Desactivar MIDI Learn" : "Activar MIDI Learn"}
          >
            <Sliders size={14} className="shrink-0" />
            <span className="text-[11px] font-mono tracking-wider font-semibold hidden md:inline">
              MIDI LEARN
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full transition-all shrink-0 ${
                isMidiLearnActive ? "bg-amber-400 shadow-[0_0_8px_#f59e0b]" : "bg-zinc-600"
              }`}
            />
          </button>

          {/* Master Volume Popover Vertical */}
          <div className="relative">
            <button
              ref={volumeTriggerRef}
              type="button"
              onClick={() => setIsVolumeOpen((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer text-xs font-mono select-none ${
                isVolumeOpen
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)] font-semibold"
                  : "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border-white/[0.08]"
              }`}
              title={`Volumen Master: ${Math.round(masterGain * 100)}%`}
            >
              {masterGain > 0 ? (
                <Volume2 size={15} className="text-emerald-400 shrink-0" />
              ) : (
                <VolumeX size={15} className="text-zinc-500 shrink-0" />
              )}
              <span className="text-[11px] font-mono tabular-nums text-zinc-200 font-medium">
                {Math.round(masterGain * 100)}%
              </span>
            </button>

            {/* Popover flotante del Fader Vertical Noir-Tech */}
            {isVolumeOpen && (
              <div
                ref={volumePopoverRef}
                className="absolute right-0 top-full mt-2 z-50 bg-black/95 backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.98),inset_0_1px_0_rgba(255,255,255,0.08)] p-3 flex flex-col items-center gap-2.5 w-28 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="flex items-center justify-between w-full border-b border-white/[0.08] pb-1.5">
                  <span className="text-[9.5px] uppercase font-bold tracking-wider text-zinc-400 font-sans">
                    MASTER
                  </span>
                  <span className="text-[11px] font-mono font-bold tabular-nums text-emerald-400">
                    {Math.round(masterGain * 100)}%
                  </span>
                </div>

                {/* Riel Vertical Fader */}
                <div className="h-32 flex items-center justify-center py-1">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={masterGain}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    onDoubleClick={handleResetVolume}
                    style={{
                      writingMode: "vertical-lr",
                      direction: "rtl",
                      WebkitAppearance: "slider-vertical",
                    }}
                    className="h-28 w-4 accent-emerald-400 cursor-pointer"
                    title="Doble clic: 80%"
                  />
                </div>

                {/* Acciones de pie: Silencio (Mute) y Reset (80%) */}
                <div className="flex items-center justify-between w-full pt-1.5 border-t border-white/[0.08] gap-1">
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className={`flex-1 py-1 rounded-lg border text-[10px] font-sans font-medium flex items-center justify-center transition cursor-pointer ${
                      masterGain === 0
                        ? "bg-red-500/20 text-red-400 border-red-500/40"
                        : "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 border-white/[0.06]"
                    }`}
                    title={masterGain === 0 ? "Unmute" : "Mute"}
                  >
                    {masterGain === 0 ? "Muted" : "Mute"}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetVolume}
                    className="p-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.06] transition cursor-pointer"
                    title="Restablecer al 80%"
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
