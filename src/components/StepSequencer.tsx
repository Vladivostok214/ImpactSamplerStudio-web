import React, { useState } from "react";
import { RotateCcw, Trash2, Eraser, Play, Square, Circle, Bell } from "lucide-react";
import { PadSlotInfo, SequencerStateInfo, StepResolution } from "../types/sampler";
import {
  MidiLearnTarget,
  MidiLearnMapping,
  getMidiNoteName,
  getActionMappingLabel,
} from "../types/midiLearn";

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
  isMidiLearnActive?: boolean;
  selectedLearnTarget?: MidiLearnTarget | null;
  onSelectLearnTarget?: (target: MidiLearnTarget) => void;
  midiLearnMapping?: MidiLearnMapping;
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

const DEFAULT_PAD_NOTES = [36, 38, 42, 46, 41, 45, 49, 51];

const PAD_ROLE_THEMES = [
  // Pad 1: KICK
  {
    border: "border-amber-500/40 hover:border-amber-400",
    bg: "bg-gradient-to-b from-[#1a140d] via-[#120e09] to-[#0a0805]",
    text: "text-amber-200",
    shadow: "shadow-[inset_0_1px_0_rgba(245,158,11,0.2)]",
    hit: "bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-black border-2 border-white shadow-[0_0_24px_rgba(245,158,11,1)] font-black scale-[0.98]",
  },
  // Pad 2: SNARE
  {
    border: "border-emerald-500/40 hover:border-emerald-400",
    bg: "bg-gradient-to-b from-[#0d1a14] via-[#09120e] to-[#050a08]",
    text: "text-emerald-200",
    shadow: "shadow-[inset_0_1px_0_rgba(16,185,129,0.2)]",
    hit: "bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600 text-black border-2 border-white shadow-[0_0_24px_rgba(16,185,129,1)] font-black scale-[0.98]",
  },
  // Pad 3: CLOSED HAT
  {
    border: "border-teal-500/40 hover:border-teal-400",
    bg: "bg-gradient-to-b from-[#0d1a19] via-[#091211] to-[#050a0a]",
    text: "text-teal-200",
    shadow: "shadow-[inset_0_1px_0_rgba(20,184,166,0.2)]",
    hit: "bg-gradient-to-b from-teal-400 via-teal-500 to-teal-600 text-black border-2 border-white shadow-[0_0_24px_rgba(20,184,166,1)] font-black scale-[0.98]",
  },
  // Pad 4: OPEN HAT
  {
    border: "border-cyan-500/40 hover:border-cyan-400",
    bg: "bg-gradient-to-b from-[#0d181a] via-[#091112] to-[#05090a]",
    text: "text-cyan-200",
    shadow: "shadow-[inset_0_1px_0_rgba(6,182,212,0.2)]",
    hit: "bg-gradient-to-b from-cyan-400 via-cyan-500 to-cyan-600 text-black border-2 border-white shadow-[0_0_24px_rgba(6,182,212,1)] font-black scale-[0.98]",
  },
  // Pad 5: TOM LOW
  {
    border: "border-sky-500/40 hover:border-sky-400",
    bg: "bg-gradient-to-b from-[#0d151a] via-[#090f12] to-[#05080a]",
    text: "text-sky-200",
    shadow: "shadow-[inset_0_1px_0_rgba(14,165,233,0.2)]",
    hit: "bg-gradient-to-b from-sky-400 via-sky-500 to-sky-600 text-black border-2 border-white shadow-[0_0_24px_rgba(14,165,233,1)] font-black scale-[0.98]",
  },
  // Pad 6: TOM MID
  {
    border: "border-orange-500/40 hover:border-orange-400",
    bg: "bg-gradient-to-b from-[#1a120d] via-[#120d09] to-[#0a0705]",
    text: "text-orange-200",
    shadow: "shadow-[inset_0_1px_0_rgba(249,115,22,0.2)]",
    hit: "bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 text-black border-2 border-white shadow-[0_0_24px_rgba(249,115,22,1)] font-black scale-[0.98]",
  },
  // Pad 7: CRASH
  {
    border: "border-rose-500/40 hover:border-rose-400",
    bg: "bg-gradient-to-b from-[#1a0d10] via-[#12090b] to-[#0a0506]",
    text: "text-rose-200",
    shadow: "shadow-[inset_0_1px_0_rgba(244,63,94,0.2)]",
    hit: "bg-gradient-to-b from-rose-400 via-rose-500 to-rose-600 text-black border-2 border-white shadow-[0_0_24px_rgba(244,63,94,1)] font-black scale-[0.98]",
  },
  // Pad 8: RIDE
  {
    border: "border-purple-500/40 hover:border-purple-400",
    bg: "bg-gradient-to-b from-[#170d1a] via-[#100912] to-[#09050a]",
    text: "text-purple-200",
    shadow: "shadow-[inset_0_1px_0_rgba(168,85,247,0.2)]",
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
  isMidiLearnActive = false,
  selectedLearnTarget = null,
  onSelectLearnTarget,
  midiLearnMapping,
}) => {
  const [selectedTrack, setSelectedTrack] = useState<number>(0);
  const [activePage, setActivePage] = useState<number>(0); // 0 = pasos 0..15, 1 = pasos 16..31

  const { isPlaying, isPaused, isRecording, currentStep, resolution, currentBank, pattern } = sequencerState;

  // Acciones mapeables y estados de selección Learn
  const isWsSelected = isMidiLearnActive && selectedLearnTarget?.type === "action" && selectedLearnTarget.id === "workstationMode";
  const wsMapped = getActionMappingLabel(midiLearnMapping, "workstationMode");

  const isBankSelected = isMidiLearnActive && selectedLearnTarget?.type === "action" && selectedLearnTarget.id === "bank";
  const bankMapped = getActionMappingLabel(midiLearnMapping, "bank");

  const isGridSelected = isMidiLearnActive && selectedLearnTarget?.type === "action" && selectedLearnTarget.id === "grid";
  const gridMapped = getActionMappingLabel(midiLearnMapping, "grid");

  const isPageSelected = isMidiLearnActive && selectedLearnTarget?.type === "action" && selectedLearnTarget.id === "page";
  const pageMapped = getActionMappingLabel(midiLearnMapping, "page");

  const isUndoSelected = isMidiLearnActive && selectedLearnTarget?.type === "action" && selectedLearnTarget.id === "undo";
  const undoMapped = getActionMappingLabel(midiLearnMapping, "undo");

  const isClearTrackSelected = isMidiLearnActive && selectedLearnTarget?.type === "action" && selectedLearnTarget.id === "clearTrack";
  const clearTrackMapped = getActionMappingLabel(midiLearnMapping, "clearTrack");

  const isClearPatternSelected = isMidiLearnActive && selectedLearnTarget?.type === "action" && selectedLearnTarget.id === "clearPattern";
  const clearPatternMapped = getActionMappingLabel(midiLearnMapping, "clearPattern");

  const isBpmDownSelected = isMidiLearnActive && selectedLearnTarget?.type === "action" && selectedLearnTarget.id === "bpmDown";
  const bpmDownMapped = getActionMappingLabel(midiLearnMapping, "bpmDown");

  const isBpmUpSelected = isMidiLearnActive && selectedLearnTarget?.type === "action" && selectedLearnTarget.id === "bpmUp";
  const bpmUpMapped = getActionMappingLabel(midiLearnMapping, "bpmUp");

  const isTapTempoSelected = isMidiLearnActive && selectedLearnTarget?.type === "action" && selectedLearnTarget.id === "tapTempo";
  const tapTempoMapped = getActionMappingLabel(midiLearnMapping, "tapTempo");

  const isStopSelected = isMidiLearnActive && selectedLearnTarget?.type === "action" && selectedLearnTarget.id === "stop";
  const stopMapped = getActionMappingLabel(midiLearnMapping, "stop");

  const isPlaySelected = isMidiLearnActive && selectedLearnTarget?.type === "action" && selectedLearnTarget.id === "play";
  const playMapped = getActionMappingLabel(midiLearnMapping, "play");

  const isRecordSelected = isMidiLearnActive && selectedLearnTarget?.type === "action" && selectedLearnTarget.id === "record";
  const recordMapped = getActionMappingLabel(midiLearnMapping, "record");

  const isClickSelected = isMidiLearnActive && selectedLearnTarget?.type === "action" && selectedLearnTarget.id === "click";
  const clickMapped = getActionMappingLabel(midiLearnMapping, "click");

  return (
    <div className="w-full flex flex-col bg-[#07080a] border-t border-white/10 select-none">
      {/* 1. Barra de Herramientas Superior: Conmutador Workstation [KEYS/SEQ], Bancos, Grid y Acciones */}
      <div className="px-3.5 py-2 bg-gradient-to-b from-[#14151a] to-[#0d0e12] border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5">
        {/* Lado Izquierdo: Modo Workstation y Bancos */}
        <div className="flex items-center gap-2">
          {/* Conmutador Serigrafiado [ KEYS ] | [ SEQ ] */}
          <div
            onClick={() => {
              if (isMidiLearnActive) {
                onSelectLearnTarget?.({ type: "action", id: "workstationMode" });
              }
            }}
            title={isMidiLearnActive ? `Vista KEYS/SEQ: ${wsMapped ? `Asignado (${wsMapped})` : "Sin asignar"}` : "Alternar Modo Teclas / Secuenciador"}
            className={`flex items-center rounded-md p-0.5 shadow-inner transition cursor-pointer ${
              isWsSelected
                ? "border-2 border-amber-400 bg-amber-950/40 ring-2 ring-amber-400/50 animate-pulse"
                : isMidiLearnActive
                ? "border border-amber-500/50 bg-amber-950/20 hover:border-amber-400"
                : "bg-[#050507] border border-white/15"
            }`}
          >
            <button
              type="button"
              onClick={() => !isMidiLearnActive && onChangeViewMode?.("keys")}
              className={`px-3 py-1 text-[10px] font-mono font-bold tracking-wider rounded transition-all cursor-pointer ${
                isMidiLearnActive
                  ? "text-amber-300"
                  : viewMode === "keys"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              KEYS
            </button>
            <button
              type="button"
              onClick={() => !isMidiLearnActive && onChangeViewMode?.("seq")}
              className={`px-3 py-1 text-[10px] font-mono font-bold tracking-wider rounded transition-all cursor-pointer ${
                isMidiLearnActive
                  ? "text-amber-300"
                  : viewMode === "seq"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              SEQ
            </button>
          </div>

          {/* Selector de Banco A / B */}
          <div
            onClick={() => {
              if (isMidiLearnActive) {
                onSelectLearnTarget?.({ type: "action", id: "bank" });
              }
            }}
            title={isMidiLearnActive ? `Banco A/B: ${bankMapped ? `Asignado (${bankMapped})` : "Sin asignar"}` : "Alternar Banco Rítmico"}
            className={`flex items-center rounded-md p-0.5 shadow-inner transition cursor-pointer ${
              isBankSelected
                ? "border-2 border-amber-400 bg-amber-950/40 ring-2 ring-amber-400/50 animate-pulse"
                : isMidiLearnActive
                ? "border border-amber-500/50 bg-amber-950/20 hover:border-amber-400"
                : "bg-[#050507] border border-white/15"
            }`}
          >
            <button
              type="button"
              onClick={() => !isMidiLearnActive && onToggleBank?.()}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded transition-all cursor-pointer ${
                isMidiLearnActive
                  ? "text-amber-300"
                  : currentBank === "a"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_6px_rgba(6,182,212,0.3)]"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              BANK A
            </button>
            <button
              type="button"
              onClick={() => !isMidiLearnActive && onToggleBank?.()}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded transition-all cursor-pointer ${
                isMidiLearnActive
                  ? "text-amber-300"
                  : currentBank === "b"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_6px_rgba(6,182,212,0.3)]"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              BANK B
            </button>
          </div>

          {/* Selector de Resolución Grid (1/8, 1/16, 1/32) */}
          <div
            onClick={() => {
              if (isMidiLearnActive) {
                onSelectLearnTarget?.({ type: "action", id: "grid" });
              }
            }}
            title={isMidiLearnActive ? `Resolución Rejilla: ${gridMapped ? `Asignado (${gridMapped})` : "Sin asignar"}` : "Resolución de Cuantización"}
            className={`hidden sm:flex items-center rounded-md p-0.5 shadow-inner transition cursor-pointer ${
              isGridSelected
                ? "border-2 border-amber-400 bg-amber-950/40 ring-2 ring-amber-400/50 animate-pulse"
                : isMidiLearnActive
                ? "border border-amber-500/50 bg-amber-950/20 hover:border-amber-400"
                : "bg-[#050507] border border-white/15"
            }`}
          >
            {(["eighth", "sixteenth", "thirtySecond"] as StepResolution[]).map((res) => {
              const label = res === "eighth" ? "1/8" : res === "sixteenth" ? "1/16" : "1/32";
              const isActive = resolution === res;
              return (
                <button
                  key={res}
                  type="button"
                  onClick={() => !isMidiLearnActive && onChangeResolution?.(res)}
                  className={`px-2 py-1 text-[9.5px] font-mono font-bold rounded transition-all cursor-pointer ${
                    isMidiLearnActive
                      ? "text-amber-300"
                      : isActive
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
            <div
              onClick={() => {
                if (isMidiLearnActive) {
                  onSelectLearnTarget?.({ type: "action", id: "page" });
                }
              }}
              title={isMidiLearnActive ? `Página 1/32: ${pageMapped ? `Asignado (${pageMapped})` : "Sin asignar"}` : "Página 1-16 / 17-32"}
              className={`flex items-center rounded-md p-0.5 shadow-inner transition cursor-pointer ${
                isPageSelected
                  ? "border-2 border-amber-400 bg-amber-950/40 ring-2 ring-amber-400/50 animate-pulse"
                  : isMidiLearnActive
                  ? "border border-amber-500/50 bg-amber-950/20 hover:border-amber-400"
                  : "bg-[#050507] border border-white/15"
              }`}
            >
              <button
                type="button"
                onClick={() => !isMidiLearnActive && setActivePage(0)}
                className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded ${
                  activePage === 0 ? "bg-amber-400/20 text-amber-300" : "text-zinc-500"
                }`}
              >
                1-16
              </button>
              <button
                type="button"
                onClick={() => !isMidiLearnActive && setActivePage(1)}
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
              onClick={() => {
                if (isMidiLearnActive) {
                  onSelectLearnTarget?.({ type: "action", id: "undo" });
                } else {
                  onUndo?.();
                }
              }}
              className={`px-2 py-1 flex items-center gap-1 text-[10px] font-mono font-bold transition rounded ${
                isUndoSelected
                  ? "border-2 border-amber-400 bg-amber-950/40 text-amber-200 animate-pulse"
                  : isMidiLearnActive
                  ? "text-amber-300 hover:bg-amber-950/30"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title={isMidiLearnActive ? `Deshacer: ${undoMapped ? `Asignado (${undoMapped})` : "Sin asignar"}` : "Deshacer último cambio (Undo)"}
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden md:inline">UNDO</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (isMidiLearnActive) {
                  onSelectLearnTarget?.({ type: "action", id: "clearTrack" });
                } else {
                  onClearTrack?.(selectedTrack);
                }
              }}
              className={`px-2 py-1 flex items-center gap-1 text-[10px] font-mono font-bold transition border-l border-white/10 rounded ${
                isClearTrackSelected
                  ? "border-2 border-amber-400 bg-amber-950/40 text-amber-200 animate-pulse"
                  : isMidiLearnActive
                  ? "text-amber-300 hover:bg-amber-950/30"
                  : "text-zinc-400 hover:text-amber-400"
              }`}
              title={isMidiLearnActive ? `Limpiar Pista: ${clearTrackMapped ? `Asignado (${clearTrackMapped})` : "Sin asignar"}` : `Limpiar pista seleccionada (Pad ${selectedTrack + 1})`}
            >
              <Eraser className="w-3 h-3" />
              <span className="hidden md:inline">CLR TRK</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (isMidiLearnActive) {
                  onSelectLearnTarget?.({ type: "action", id: "clearPattern" });
                } else {
                  onClearAll?.();
                }
              }}
              className={`px-2 py-1 flex items-center gap-1 text-[10px] font-mono font-bold transition border-l border-white/10 rounded ${
                isClearPatternSelected
                  ? "border-2 border-amber-400 bg-amber-950/40 text-amber-200 animate-pulse"
                  : isMidiLearnActive
                  ? "text-amber-300 hover:bg-amber-950/30"
                  : "text-zinc-400 hover:text-rose-400"
              }`}
              title={isMidiLearnActive ? `Limpiar Patrón: ${clearPatternMapped ? `Asignado (${clearPatternMapped})` : "Sin asignar"}` : "Limpiar todo el patrón"}
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden md:inline">CLR ALL</span>
            </button>
          </div>

          {/* Tap Tempo & Ajuste BPM */}
          <div className="flex items-center rounded-md bg-[#050507] border border-white/15 p-0.5 shadow-inner font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                if (isMidiLearnActive) {
                  onSelectLearnTarget?.({ type: "action", id: "bpmDown" });
                } else {
                  onAdjustBpm?.(-1);
                }
              }}
              title={isMidiLearnActive ? `BPM -1: ${bpmDownMapped ? `Asignado (${bpmDownMapped})` : "Sin asignar"}` : "Reducir Tempo -1"}
              className={`w-5 h-6 flex items-center justify-center transition rounded ${
                isBpmDownSelected
                  ? "border-2 border-amber-400 bg-amber-950/40 text-amber-200 animate-pulse"
                  : isMidiLearnActive
                  ? "text-amber-300 hover:bg-amber-950/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              -
            </button>
            <span className="px-1.5 font-bold text-emerald-400 text-[11px] tabular-nums">
              {Math.round(bpm)}
            </span>
            <button
              type="button"
              onClick={() => {
                if (isMidiLearnActive) {
                  onSelectLearnTarget?.({ type: "action", id: "bpmUp" });
                } else {
                  onAdjustBpm?.(1);
                }
              }}
              title={isMidiLearnActive ? `BPM +1: ${bpmUpMapped ? `Asignado (${bpmUpMapped})` : "Sin asignar"}` : "Aumentar Tempo +1"}
              className={`w-5 h-6 flex items-center justify-center transition rounded ${
                isBpmUpSelected
                  ? "border-2 border-amber-400 bg-amber-950/40 text-amber-200 animate-pulse"
                  : isMidiLearnActive
                  ? "text-amber-300 hover:bg-amber-950/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              +
            </button>
            {onTapTempo && (
              <button
                type="button"
                onClick={() => {
                  if (isMidiLearnActive) {
                    onSelectLearnTarget?.({ type: "action", id: "tapTempo" });
                  } else {
                    onTapTempo();
                  }
                }}
                className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ml-1 transition ${
                  isTapTempoSelected
                    ? "border-2 border-amber-400 bg-amber-950/40 text-amber-200 animate-pulse"
                    : isMidiLearnActive
                    ? "text-amber-300 bg-amber-950/30 border border-amber-500/40"
                    : "bg-white/5 hover:bg-emerald-500 hover:text-black text-zinc-300"
                }`}
                title={isMidiLearnActive ? `Tap Tempo: ${tapTempoMapped ? `Asignado (${tapTempoMapped})` : "Sin asignar"}` : "Tap Tempo"}
              >
                TAP
              </button>
            )}
          </div>

          {/* Cápsula de Transporte Rápido */}
          <div className="flex items-center rounded-md bg-[#050507] border border-white/15 p-0.5 shadow-inner">
            <button
              type="button"
              onClick={() => {
                if (isMidiLearnActive) {
                  onSelectLearnTarget?.({ type: "action", id: "stop" });
                } else {
                  onStop();
                }
              }}
              className={`w-7 h-6 flex items-center justify-center rounded transition ${
                isStopSelected
                  ? "border-2 border-amber-400 bg-amber-950/40 text-amber-200 animate-pulse"
                  : isMidiLearnActive
                  ? "text-amber-300 hover:bg-amber-950/30"
                  : !isPlaying
                  ? "bg-zinc-800 text-zinc-300"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              title={isMidiLearnActive ? `Stop: ${stopMapped ? `Asignado (${stopMapped})` : "Sin asignar"}` : "Stop (Esc)"}
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (isMidiLearnActive) {
                  onSelectLearnTarget?.({ type: "action", id: "play" });
                } else {
                  onTogglePlay();
                }
              }}
              className={`w-7 h-6 flex items-center justify-center rounded transition ${
                isPlaySelected
                  ? "border-2 border-amber-400 bg-amber-950/40 text-amber-200 animate-pulse"
                  : isMidiLearnActive
                  ? "text-amber-300 hover:bg-amber-950/30"
                  : isPlaying
                  ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                  : "text-zinc-400 hover:text-emerald-400"
              }`}
              title={isMidiLearnActive ? `Play: ${playMapped ? `Asignado (${playMapped})` : "Sin asignar"}` : "Play / Pause (Espacio)"}
            >
              <Play className={`w-3 h-3 ${isPlaying ? "fill-current" : ""}`} />
            </button>
            {onToggleRecord && (
              <button
                type="button"
                onClick={() => {
                  if (isMidiLearnActive) {
                    onSelectLearnTarget?.({ type: "action", id: "record" });
                  } else {
                    onToggleRecord();
                  }
                }}
                className={`w-7 h-6 flex items-center justify-center rounded transition ${
                  isRecordSelected
                    ? "border-2 border-amber-400 bg-amber-950/40 text-amber-200 animate-pulse"
                    : isMidiLearnActive
                    ? "text-amber-300 hover:bg-amber-950/30"
                    : isRecording
                    ? "bg-rose-950/70 text-rose-400 border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.45)] animate-pulse"
                    : "text-zinc-500 hover:text-rose-400"
                }`}
                title={isMidiLearnActive ? `Record: ${recordMapped ? `Asignado (${recordMapped})` : "Sin asignar"}` : "Record (Overdub)"}
              >
                <Circle className={`w-3 h-3 ${isRecording ? "fill-current" : ""}`} />
              </button>
            )}
            {onToggleClick && (
              <button
                type="button"
                onClick={() => {
                  if (isMidiLearnActive) {
                    onSelectLearnTarget?.({ type: "action", id: "click" });
                  } else {
                    onToggleClick();
                  }
                }}
                className={`w-7 h-6 flex items-center justify-center rounded transition border-l border-white/10 ${
                  isClickSelected
                    ? "border-2 border-amber-400 bg-amber-950/40 text-amber-200 animate-pulse"
                    : isMidiLearnActive
                    ? "text-amber-300 hover:bg-amber-950/30"
                    : isClickEnabled
                    ? "text-cyan-300"
                    : "text-zinc-600 hover:text-zinc-300"
                }`}
                title={isMidiLearnActive ? `Metrónomo: ${clickMapped ? `Asignado (${clickMapped})` : "Sin asignar"}` : "Metrónomo (Clic)"}
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
          {/* 8 Pistas de Percusión con Botones Mecánicos TR-Style */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((padIdx) => {
            const padName = padSlots[padIdx]?.sampleName || DEFAULT_DRUM_NAMES[padIdx] || `P${padIdx + 1}`;
            const theme = PAD_ROLE_THEMES[padIdx] || PAD_ROLE_THEMES[0];
            const isHit = activePads.has(padIdx + 1);
            const isSelected = selectedTrack === padIdx;
            const mappedNote = midiLearnMapping?.pads[padIdx] ?? DEFAULT_PAD_NOTES[padIdx];
            const isLearnSelected = isMidiLearnActive && selectedLearnTarget?.type === "pad" && selectedLearnTarget.index === padIdx;

            return (
              <div key={`track-${padIdx}`} className="flex items-center gap-2">
                {/* Botón de Pista / Disparador de Pad */}
                <button
                  type="button"
                  onClick={() => {
                    if (isMidiLearnActive) {
                      onSelectLearnTarget?.({ type: "pad", index: padIdx });
                      return;
                    }
                    setSelectedTrack(padIdx);
                    onTriggerPad?.(padIdx);
                  }}
                  className={`w-28 sm:w-32 h-8 rounded-lg flex items-center justify-between px-2.5 transition-all shrink-0 cursor-pointer border font-mono text-[10px] font-bold select-none ${
                    isLearnSelected
                      ? "border-2 border-amber-400 bg-amber-950/40 text-amber-200 shadow-[0_0_18px_rgba(245,158,11,0.85)] ring-2 ring-amber-400/60 animate-pulse"
                      : isMidiLearnActive
                      ? "border border-amber-500/50 bg-amber-950/20 text-amber-300 hover:border-amber-400"
                      : isHit
                      ? theme.hit
                      : isSelected
                      ? `${theme.border} bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.2)]`
                      : `${theme.border} ${theme.bg} ${theme.text} ${theme.shadow} hover:brightness-125`
                  }`}
                  title={
                    isMidiLearnActive
                      ? `Pad ${padIdx + 1} (${padName}): Asignar MIDI (${getMidiNoteName(mappedNote)} #${mappedNote})`
                      : `Disparar Pad ${padIdx + 1}: ${padName} (${getMidiNoteName(mappedNote)})`
                  }
                >
                  <span className="truncate">{padName}</span>
                  <span className={`text-[8px] ${isMidiLearnActive ? "text-amber-400 font-bold" : "text-zinc-500"}`}>
                    {isMidiLearnActive ? getMidiNoteName(mappedNote) : `P${padIdx + 1}`}
                  </span>
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
