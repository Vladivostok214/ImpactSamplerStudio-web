import React, { useState } from "react";
import { RotateCcw, Trash2, Eraser, Play, Square, Circle, Bell } from "lucide-react";
import { PadSlotInfo, SequencerStateInfo, StepResolution } from "../types/sampler";

interface StepSequencerProps {
  viewMode?: "keys" | "seq";
  onChangeViewMode?: (mode: "keys" | "seq") => void;
  sequencerState: SequencerStateInfo;
  padSlots?: PadSlotInfo[];
  activePads?: Set<number>;
  onTriggerPad?: (padIdx: number) => void;
  onTogglePlay: () => void;
  onStop: () => void;
  onToggleRecord?: () => void;
  bpm: number;
  onAdjustBpm?: (delta: number) => void;
  onTapTempo?: () => void;
  onToggleStep: (padIdx: number, stepIdx: number) => void;
  onClearTrack?: (padIdx: number) => void;
  onClearAll?: () => void;
  onChangeResolution?: (res: StepResolution) => void;
  onToggleBank?: () => void;
  onUndo?: () => void;
  isClickEnabled?: boolean;
  onToggleClick?: () => void;
}

const DEFAULT_DRUM_NAMES = [
  "Kick 1",
  "Snare",
  "Closed HH",
  "Open HH",
  "Low Tom",
  "Mid Tom",
  "Crash",
  "Ride",
];

// Paleta de Silicona Táctil por Pad (armonizada 1:1 con los Faders de mezcla F1-F8)
const PAD_ROLE_THEMES = [
  {
    border: "border-amber-500/35",
    bg: "bg-gradient-to-b from-[#1c1710] via-[#12100d] to-[#0a0907]",
    text: "text-amber-300",
    shadow: "shadow-[0_0_10px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.08)]",
    hit: "bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-black border-2 border-white shadow-[0_0_24px_rgba(245,158,11,1)] font-black scale-[0.98]",
  },
  {
    border: "border-emerald-500/35",
    bg: "bg-gradient-to-b from-[#101c15] via-[#0d130f] to-[#070b08]",
    text: "text-emerald-300",
    shadow: "shadow-[0_0_10px_rgba(16,185,129,0.2),inset_0_1px_1px_rgba(255,255,255,0.08)]",
    hit: "bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600 text-black border-2 border-white shadow-[0_0_24px_rgba(16,185,129,1)] font-black scale-[0.98]",
  },
  {
    border: "border-teal-500/35",
    bg: "bg-gradient-to-b from-[#101c1a] via-[#0d1312] to-[#070b0a]",
    text: "text-teal-300",
    shadow: "shadow-[0_0_10px_rgba(20,184,166,0.2),inset_0_1px_1px_rgba(255,255,255,0.08)]",
    hit: "bg-gradient-to-b from-teal-400 via-teal-500 to-teal-600 text-black border-2 border-white shadow-[0_0_24px_rgba(20,184,166,1)] font-black scale-[0.98]",
  },
  {
    border: "border-cyan-500/35",
    bg: "bg-gradient-to-b from-[#0e1a1e] via-[#0c1215] to-[#060a0c]",
    text: "text-cyan-300",
    shadow: "shadow-[0_0_10px_rgba(6,182,212,0.2),inset_0_1px_1px_rgba(255,255,255,0.08)]",
    hit: "bg-gradient-to-b from-cyan-400 via-cyan-500 to-cyan-600 text-black border-2 border-white shadow-[0_0_24px_rgba(6,182,212,1)] font-black scale-[0.98]",
  },
  {
    border: "border-sky-500/35",
    bg: "bg-gradient-to-b from-[#0e1820] via-[#0c1117] to-[#06090d]",
    text: "text-sky-300",
    shadow: "shadow-[0_0_10px_rgba(14,165,233,0.2),inset_0_1px_1px_rgba(255,255,255,0.08)]",
    hit: "bg-gradient-to-b from-sky-400 via-sky-500 to-sky-600 text-black border-2 border-white shadow-[0_0_24px_rgba(14,165,233,1)] font-black scale-[0.98]",
  },
  {
    border: "border-orange-500/35",
    bg: "bg-gradient-to-b from-[#1e150f] via-[#140e0a] to-[#0b0805]",
    text: "text-orange-300",
    shadow: "shadow-[0_0_10px_rgba(249,115,22,0.2),inset_0_1px_1px_rgba(255,255,255,0.08)]",
    hit: "bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 text-black border-2 border-white shadow-[0_0_24px_rgba(249,115,22,1)] font-black scale-[0.98]",
  },
  {
    border: "border-rose-500/35",
    bg: "bg-gradient-to-b from-[#1e1015] via-[#140b0e] to-[#0b0607]",
    text: "text-rose-300",
    shadow: "shadow-[0_0_10px_rgba(244,63,94,0.2),inset_0_1px_1px_rgba(255,255,255,0.08)]",
    hit: "bg-gradient-to-b from-rose-400 via-rose-500 to-rose-600 text-black border-2 border-white shadow-[0_0_24px_rgba(244,63,94,1)] font-black scale-[0.98]",
  },
  {
    border: "border-purple-500/35",
    bg: "bg-gradient-to-b from-[#191020] via-[#110b16] to-[#09060c]",
    text: "text-purple-300",
    shadow: "shadow-[0_0_10px_rgba(168,85,247,0.2),inset_0_1px_1px_rgba(255,255,255,0.08)]",
    hit: "bg-gradient-to-b from-purple-400 via-purple-500 to-purple-600 text-black border-2 border-white shadow-[0_0_24px_rgba(168,85,247,1)] font-black scale-[0.98]",
  },
];

const STEPS_16 = Array.from({ length: 16 }, (_, i) => i);

export const StepSequencer: React.FC<StepSequencerProps> = ({
  viewMode = "keys",
  onChangeViewMode,
  sequencerState,
  padSlots = [],
  activePads = new Set(),
  onTriggerPad,
  onTogglePlay,
  onStop,
  onToggleRecord,
  bpm,
  onAdjustBpm,
  onTapTempo,
  onToggleStep,
  onClearTrack,
  onClearAll,
  onChangeResolution,
  onToggleBank,
  onUndo,
  isClickEnabled = false,
  onToggleClick,
}) => {
  const [selectedTrack, setSelectedTrack] = useState<number>(0);
  const [activePage, setActivePage] = useState<number>(0); // 0 = pasos 0..15, 1 = pasos 16..31

  const { isPlaying, isPaused, isRecording, currentStep, resolution, currentBank, pattern } = sequencerState;


  return (
    <div className="w-full flex flex-col bg-[#07080a] border-t border-white/10 select-none">
      {/* 1. Barra de Herramientas Superior: Conmutador Workstation [KEYS/SEQ], Bancos, Grid y Acciones */}
      <div className="px-3.5 py-2 bg-gradient-to-b from-[#14151a] to-[#0d0e12] border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5">
        {/* Lado Izquierdo: Modo Workstation y Bancos */}
        <div className="flex items-center gap-2">
          {/* Conmutador Serigrafiado [ KEYS ] | [ SEQ ] */}
          <div className="flex items-center rounded-md bg-[#050507] border border-white/15 p-0.5 shadow-inner">
            <button
              type="button"
              onClick={() => onChangeViewMode?.("keys")}
              className={`px-3 py-1 text-[10px] font-mono font-bold tracking-wider rounded transition-all cursor-pointer ${
                viewMode === "keys"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              KEYS
            </button>
            <button
              type="button"
              onClick={() => onChangeViewMode?.("seq")}
              className={`px-3 py-1 text-[10px] font-mono font-bold tracking-wider rounded transition-all cursor-pointer ${
                viewMode === "seq"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              SEQ
            </button>
          </div>

          {/* Selector de Banco A / B */}
          <div className="flex items-center rounded-md bg-[#050507] border border-white/15 p-0.5 shadow-inner">
            <button
              type="button"
              onClick={onToggleBank}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded transition-all cursor-pointer ${
                currentBank === "a"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_6px_rgba(6,182,212,0.3)]"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              BANK A
            </button>
            <button
              type="button"
              onClick={onToggleBank}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded transition-all cursor-pointer ${
                currentBank === "b"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_6px_rgba(6,182,212,0.3)]"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              BANK B
            </button>
          </div>

          {/* Selector de Resolución Grid (1/8, 1/16, 1/32) */}
          <div className="hidden sm:flex items-center rounded-md bg-[#050507] border border-white/15 p-0.5 shadow-inner">
            {(["eighth", "sixteenth", "thirtySecond"] as StepResolution[]).map((res) => {
              const label = res === "eighth" ? "1/8" : res === "sixteenth" ? "1/16" : "1/32";
              const isActive = resolution === res;
              return (
                <button
                  key={res}
                  type="button"
                  onClick={() => onChangeResolution?.(res)}
                  className={`px-2 py-1 text-[9.5px] font-mono font-bold rounded transition-all cursor-pointer ${
                    isActive
                      ? "bg-white/15 text-white border border-white/20"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Selector de Página si es 1/32 (32 pasos) */}
          {resolution === "thirtySecond" && (
            <div className="flex items-center rounded-md bg-[#050507] border border-white/15 p-0.5 shadow-inner">
              <button
                type="button"
                onClick={() => setActivePage(0)}
                className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded ${
                  activePage === 0 ? "bg-amber-400/20 text-amber-300" : "text-zinc-500"
                }`}
              >
                1-16
              </button>
              <button
                type="button"
                onClick={() => setActivePage(1)}
                className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded ${
                  activePage === 1 ? "bg-amber-400/20 text-amber-300" : "text-zinc-500"
                }`}
              >
                17-32
              </button>
            </div>
          )}
        </div>

        {/* Lado Derecho: Acciones (Undo, Clear Track, Clear All) y Transporte Rápido */}
        <div className="flex items-center gap-2">
          {/* Cápsula de Acciones */}
          <div className="flex items-center rounded-md bg-[#050507] border border-white/15 p-0.5 shadow-inner">
            <button
              type="button"
              onClick={onUndo}
              className="px-2 py-1 flex items-center gap-1 text-[10px] font-mono font-bold text-zinc-400 hover:text-zinc-200 transition"
              title="Deshacer último cambio (Undo)"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden md:inline">UNDO</span>
            </button>
            <button
              type="button"
              onClick={() => onClearTrack?.(selectedTrack)}
              className="px-2 py-1 flex items-center gap-1 text-[10px] font-mono font-bold text-zinc-400 hover:text-amber-400 transition border-l border-white/10"
              title={`Limpiar pista seleccionada (Pad ${selectedTrack + 1})`}
            >
              <Eraser className="w-3 h-3" />
              <span className="hidden md:inline">CLR TRK</span>
            </button>
            <button
              type="button"
              onClick={onClearAll}
              className="px-2 py-1 flex items-center gap-1 text-[10px] font-mono font-bold text-zinc-400 hover:text-rose-400 transition border-l border-white/10"
              title="Limpiar todo el patrón"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden md:inline">CLR ALL</span>
            </button>
          </div>

          {/* Tap Tempo & Ajuste BPM */}
          <div className="flex items-center rounded-md bg-[#050507] border border-white/15 p-0.5 shadow-inner font-mono text-xs">
            <button
              type="button"
              onClick={() => onAdjustBpm?.(-1)}
              className="w-5 h-6 flex items-center justify-center text-zinc-400 hover:text-white"
            >
              -
            </button>
            <span className="px-1.5 font-bold text-emerald-400 text-[11px] tabular-nums">
              {Math.round(bpm)}
            </span>
            <button
              type="button"
              onClick={() => onAdjustBpm?.(1)}
              className="w-5 h-6 flex items-center justify-center text-zinc-400 hover:text-white"
            >
              +
            </button>
            {onTapTempo && (
              <button
                type="button"
                onClick={onTapTempo}
                className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-white/5 hover:bg-emerald-500 hover:text-black text-zinc-300 ml-1 transition"
                title="Tap Tempo"
              >
                TAP
              </button>
            )}
          </div>

          {/* Cápsula de Transporte Rápido */}
          <div className="flex items-center rounded-md bg-[#050507] border border-white/15 p-0.5 shadow-inner">
            <button
              type="button"
              onClick={onStop}
              className={`w-7 h-6 flex items-center justify-center rounded transition ${
                !isPlaying ? "bg-zinc-800 text-zinc-300" : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="Stop (Esc)"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              className={`w-7 h-6 flex items-center justify-center rounded transition ${
                isPlaying
                  ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                  : "text-zinc-400 hover:text-emerald-400"
              }`}
              title="Play / Pause (Espacio)"
            >
              <Play className={`w-3 h-3 ${isPlaying ? "fill-current" : ""}`} />
            </button>
            {onToggleRecord && (
              <button
                type="button"
                onClick={onToggleRecord}
                className={`w-7 h-6 flex items-center justify-center rounded transition ${
                  isRecording
                    ? "bg-rose-950/70 text-rose-400 border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.45)] animate-pulse"
                    : "text-zinc-500 hover:text-rose-400"
                }`}
                title="Record"
              >
                <Circle className={`w-3 h-3 ${isRecording ? "fill-current" : ""}`} />
              </button>
            )}
            {onToggleClick && (
              <button
                type="button"
                onClick={onToggleClick}
                className={`w-7 h-6 flex items-center justify-center rounded transition border-l border-white/10 ${
                  isClickEnabled ? "text-cyan-300" : "text-zinc-600 hover:text-zinc-300"
                }`}
                title="Metrónomo"
              >
                <Bell className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Si viewMode === "seq", mostramos la Grilla Rítmica TR Completa */}
      {viewMode === "seq" && (
        <div className="p-3.5 bg-[#08090c] flex flex-col gap-1.5 overflow-x-auto">
          {/* Fila de Barra de Pasos / Playhead LED */}
          <div className="flex items-center gap-2 mb-1">
            <div className="w-28 sm:w-32 shrink-0 text-[10px] font-mono text-zinc-500 font-bold tracking-wider uppercase px-1">
              PISTA / PAD
            </div>
            <div className="flex-1 flex items-center gap-1 min-w-[500px]">
              {STEPS_16.map((stepIdx) => {
                const actualStep = resolution === "thirtySecond" ? activePage * 16 + stepIdx : stepIdx;
                const isStepDisabled = resolution === "eighth" && stepIdx >= 8;
                const isCurrent = isPlaying && currentStep === actualStep && !isStepDisabled;
                const isBeatDown = stepIdx % 4 === 0;

                return (
                  <React.Fragment key={`playhead-${stepIdx}`}>
                    {stepIdx > 0 && stepIdx % 4 === 0 && <div className="w-1.5" />}
                    <div
                      className={`flex-1 h-2 rounded-[2px] transition-all flex items-center justify-center ${
                        isStepDisabled
                          ? "opacity-20 bg-zinc-900"
                          : isCurrent
                          ? isBeatDown
                            ? "bg-amber-400 shadow-[0_0_8px_#f59e0b]"
                            : "bg-emerald-400 shadow-[0_0_8px_#10b981]"
                          : isBeatDown
                          ? "bg-zinc-700"
                          : "bg-zinc-800"
                      }`}
                    />
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* 8 Pistas de Percusión con Botones Mecánicos TR-Style */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((padIdx) => {
            const padName = padSlots[padIdx]?.sampleName || DEFAULT_DRUM_NAMES[padIdx] || `P${padIdx + 1}`;
            const theme = PAD_ROLE_THEMES[padIdx] || PAD_ROLE_THEMES[0];
            const isHit = activePads.has(padIdx + 1);
            const isSelected = selectedTrack === padIdx;

            return (
              <div key={`track-${padIdx}`} className="flex items-center gap-2">
                {/* Botón de Pista / Disparador de Pad */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTrack(padIdx);
                    onTriggerPad?.(padIdx);
                  }}
                  className={`w-28 sm:w-32 h-8 rounded-lg flex items-center justify-between px-2.5 transition-all shrink-0 cursor-pointer border font-mono text-[10px] font-bold select-none ${
                    isHit
                      ? theme.hit
                      : isSelected
                      ? `${theme.border} bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.2)]`
                      : `${theme.border} ${theme.bg} ${theme.text} ${theme.shadow} hover:brightness-125`
                  }`}
                  title={`Disparar Pad ${padIdx + 1}: ${padName}`}
                >
                  <span className="truncate">{padName}</span>
                  <span className="text-[8px] text-zinc-500">{`P${padIdx + 1}`}</span>
                </button>

                {/* 16 Botones de Paso TR */}
                <div className="flex-1 flex items-center gap-1 min-w-[500px]">
                  {STEPS_16.map((stepIdx) => {
                    const actualStep = resolution === "thirtySecond" ? activePage * 16 + stepIdx : stepIdx;
                    const isStepDisabled = resolution === "eighth" && stepIdx >= 8;
                    const velocity = isStepDisabled ? 0 : pattern[padIdx]?.[actualStep] || 0;
                    const isActive = velocity > 0;
                    const isPlayhead = (isPlaying || isPaused) && currentStep === actualStep && !isStepDisabled;
                    const isBeatStart = stepIdx % 4 === 0;
                    const isEvenGroup = Math.floor(stepIdx / 4) % 2 === 0;

                    return (
                      <React.Fragment key={`pad-${padIdx}-step-${stepIdx}`}>
                        {stepIdx > 0 && stepIdx % 4 === 0 && <div className="w-1.5" />}
                        <button
                          type="button"
                          disabled={isStepDisabled}
                          onClick={() => {
                            if (!isStepDisabled) {
                              onToggleStep(padIdx, actualStep);
                            }
                          }}
                          className={`flex-1 h-8 rounded-[3px] font-mono text-[9px] transition-all relative overflow-hidden active:scale-95 ${
                            isStepDisabled
                              ? "opacity-15 bg-[#090a0d] border border-white/[0.04] cursor-not-allowed pointer-events-none"
                              : isActive
                              ? isPlayhead
                                ? "bg-amber-300 text-black border border-white shadow-[0_0_14px_#ffffff] z-10 cursor-pointer"
                                : "bg-gradient-to-b from-[#3a2f1c] via-[#2a2113] to-[#18130a] border-t border-amber-500/80 border-b-[2px] border-b-black shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_0_10px_rgba(245,158,11,0.35)] cursor-pointer"
                              : isPlayhead
                              ? "bg-[#282d38] border border-emerald-400/80 shadow-[0_0_10px_rgba(16,185,129,0.4)] cursor-pointer"
                              : isEvenGroup
                              ? "bg-gradient-to-b from-[#252730] via-[#1b1c22] to-[#111216] border-t border-white/10 border-b-[2px] border-b-black shadow-inner hover:brightness-125 cursor-pointer"
                              : "bg-gradient-to-b from-[#1c1e24] via-[#14151a] to-[#0c0d10] border-t border-white/5 border-b-[2px] border-b-black shadow-inner hover:brightness-125 cursor-pointer"
                          }`}
                        >
                          {/* Micro-Lente LED Interna */}
                          {!isStepDisabled && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span
                                className={`w-3.5 h-1 rounded-sm transition-all ${
                                  isActive
                                    ? isPlayhead
                                      ? "bg-white shadow-[0_0_10px_white]"
                                      : "bg-amber-400 shadow-[0_0_8px_#f59e0b]"
                                    : isPlayhead
                                    ? "bg-emerald-400 shadow-[0_0_8px_#10b981]"
                                    : isBeatStart
                                    ? "bg-white/30"
                                    : "bg-white/10"
                                }`}
                              />
                            </div>
                          )}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
