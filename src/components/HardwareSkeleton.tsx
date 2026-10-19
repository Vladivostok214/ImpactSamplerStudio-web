import React from "react";
import { PadSlotInfo, KnobMappingInfo, KnobTarget, FxRouting } from "../types/sampler";
import { SoundFontInfo } from "../types/soundfont";
import { ArpStateInfo } from "../types/arpeggiator";
import { PerformanceBay } from "./PerformanceBay";
import { QWERTY_BASE_NOTE, QWERTY_NOTE_OFFSETS } from "../hooks/useQwertyKeyboard";
import { MidiLearnTarget, MidiLearnMapping } from "../types/midiLearn";

interface HardwareSkeletonProps {
  activeNotes?: Set<number>;
  faders: number[]; // 9 values, 0-127
  knobs: number[]; // 8 values, 0-127
  pitchBend: number; // -8192 to 8191
  modWheel: number; // 0 to 127
  keyRange?: { minNote: number; maxNote: number; label?: string };
  padSlots?: PadSlotInfo[];
  knobMappings?: KnobMappingInfo[];
  onSetKnobMapping?: (knobIndex: number, target: KnobTarget) => void;
  fxRouting?: FxRouting;
  onChangeFxRouting?: (routing: FxRouting) => void;
  arpState?: ArpStateInfo;
  onChangeArpState?: (state: ArpStateInfo) => void;
  isMidiLearnActive?: boolean;
  selectedLearnTarget?: MidiLearnTarget | null;
  onSelectLearnTarget?: (target: MidiLearnTarget) => void;
  midiLearnMapping?: MidiLearnMapping;
  availableSoundfonts?: SoundFontInfo[];
  currentSoundfont?: SoundFontInfo | null;
  activePresetIndex?: number;
  onSelectSoundfont?: (filename: string) => void;
  onSelectPreset?: (patch: number, index: number, bank?: number) => void;
  isDownloading?: boolean;
  downloadProgress?: number | null;
  onTriggerNote: (note: number, velocity: number) => void;
  onReleaseNote: (note: number) => void;
  onChangeFader: (index: number, value: number) => void;
  onChangeKnob: (index: number, value: number) => void;
  onChangePitchBend: (normalized: number) => void;
  onChangeModWheel: (value: number) => void;
  hideKeyboard?: boolean;
  qwertyEnabled?: boolean;
  qwertyOctaveOffset?: number;
  children?: React.ReactNode;
}

interface KeyItem {
  note: number;
  isBlack: boolean;
  isOutOfRange: boolean;
}

const FADER_PAD_COLORS = [
  { line: "bg-amber-400 shadow-[0_0_6px_#f59e0b]", dot: "bg-amber-400", border: "border-amber-400/40" },
  { line: "bg-emerald-400 shadow-[0_0_6px_#10b981]", dot: "bg-emerald-400", border: "border-emerald-400/40" },
  { line: "bg-teal-400 shadow-[0_0_6px_#14b8a6]", dot: "bg-teal-400", border: "border-teal-400/40" },
  { line: "bg-cyan-400 shadow-[0_0_6px_#06b6d4]", dot: "bg-cyan-400", border: "border-cyan-400/40" },
  { line: "bg-sky-400 shadow-[0_0_6px_#0ea5e9]", dot: "bg-sky-400", border: "border-sky-400/40" },
  { line: "bg-orange-400 shadow-[0_0_6px_#f97316]", dot: "bg-orange-400", border: "border-orange-400/40" },
  { line: "bg-rose-400 shadow-[0_0_6px_#f43f5e]", dot: "bg-rose-400", border: "border-rose-400/40" },
  { line: "bg-purple-400 shadow-[0_0_6px_#a855f7]", dot: "bg-purple-400", border: "border-purple-400/40" },
  { line: "bg-cyan-400 shadow-[0_0_8px_#22d3ee]", dot: "bg-cyan-400", border: "border-cyan-400/50" }, // Master F9
];

export const HardwareSkeleton: React.FC<HardwareSkeletonProps> = React.memo(({
  faders,
  knobs,
  pitchBend,
  modWheel,
  keyRange,
  padSlots = [],
  knobMappings = [],
  fxRouting = "off",
  onChangeFxRouting,
  arpState,
  onChangeArpState,
  isMidiLearnActive = false,
  selectedLearnTarget = null,
  onSelectLearnTarget,
  midiLearnMapping,
  availableSoundfonts = [],
  currentSoundfont,
  activePresetIndex = 0,
  onSelectSoundfont,
  onSelectPreset,
  isDownloading = false,
  downloadProgress = null,
  onTriggerNote,
  onReleaseNote,
  onChangeFader,
  onChangeKnob,
  onChangePitchBend,
  onChangeModWheel,
  hideKeyboard = false,
  qwertyEnabled = false,
  qwertyOctaveOffset = 0,
  children,
}) => {
  // Mapa de notas a letra física QWERTY según la octava actual
  const qwertyLabels = React.useMemo(() => {
    if (!qwertyEnabled) return new Map<number, string>();

    const map = new Map<number, string>();
    const base = QWERTY_BASE_NOTE + qwertyOctaveOffset * 12;

    const codeToLabel: Record<string, string> = {
      KeyA: "A",
      KeyW: "W",
      KeyS: "S",
      KeyE: "E",
      KeyD: "D",
      KeyF: "F",
      KeyT: "T",
      KeyG: "G",
      KeyY: "Y",
      KeyH: "H",
      KeyU: "U",
      KeyJ: "J",
      KeyK: "K",
      KeyO: "O",
      KeyL: "L",
      KeyP: "P",
      Semicolon: ";",
      Quote: "'",
    };

    for (const [code, offset] of Object.entries(QWERTY_NOTE_OFFSETS)) {
      const note = base + offset;
      if (note >= 36 && note <= 84) {
        if (!keyRange || (note >= keyRange.minNote && note <= keyRange.maxNote)) {
          map.set(note, codeToLabel[code] || code);
        }
      }
    }

    return map;
  }, [qwertyEnabled, qwertyOctaveOffset, keyRange]);

  // Generar las 49 teclas (C2 / nota 36 a C6 / nota 84) memoizadas sin re-renders de notas
  const keys = React.useMemo(() => {
    const list: KeyItem[] = [];
    const startNote = 36;
    const numKeys = 49;

    for (let i = 0; i < numKeys; i++) {
      const note = startNote + i;
      const noteInOctave = note % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave);
      const isOutOfRange =
        keyRange !== undefined &&
        (note < keyRange.minNote || note > keyRange.maxNote);

      list.push({
        note,
        isBlack,
        isOutOfRange,
      });
    }

    return list;
  }, [keyRange]);

  // Drag handlers para Faders
  const handleFaderPointerDown = (index: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);

    const updateFromPointer = (ev: PointerEvent | React.PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const relativeY = ev.clientY - rect.top;
      const pct = 1.0 - Math.min(Math.max(relativeY / rect.height, 0), 1);
      const val = Math.round(pct * 127);
      onChangeFader(index, val);
    };

    updateFromPointer(e);

    const onPointerMove = (ev: PointerEvent) => updateFromPointer(ev);
    const onPointerUp = (ev: PointerEvent) => {
      el.releasePointerCapture(ev.pointerId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // Drag handlers para Knobs
  const handleKnobPointerDown = (index: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const startY = e.clientY;
    const startVal = knobs[index];
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);

    const onPointerMove = (ev: PointerEvent) => {
      const deltaY = startY - ev.clientY;
      const deltaVal = Math.round((deltaY / 100) * 127);
      const newVal = Math.min(Math.max(startVal + deltaVal, 0), 127);
      onChangeKnob(index, newVal);
    };

    const onPointerUp = (ev: PointerEvent) => {
      el.releasePointerCapture(ev.pointerId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // Drag handlers para Pitch Wheel (con resorte de retorno a 0)
  const handlePitchWheelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);

    const updatePitch = (ev: PointerEvent | React.PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const relativeY = ev.clientY - rect.top;
      const normalizedRatio = 1.0 - 2.0 * Math.min(Math.max(relativeY / rect.height, 0), 1);
      const bend = Math.round(normalizedRatio * 8191);
      onChangePitchBend(bend);
    };

    updatePitch(e);

    const onPointerMove = (ev: PointerEvent) => updatePitch(ev);
    const onPointerUp = (ev: PointerEvent) => {
      el.releasePointerCapture(ev.pointerId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      onChangePitchBend(0);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // Drag handlers para Mod Wheel
  const handleModWheelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);

    const updateMod = (ev: PointerEvent | React.PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const relativeY = ev.clientY - rect.top;
      const pct = 1.0 - Math.min(Math.max(relativeY / rect.height, 0), 1);
      onChangeModWheel(Math.round(pct * 127));
    };

    updateMod(e);

    const onPointerMove = (ev: PointerEvent) => updateMod(ev);
    const onPointerUp = (ev: PointerEvent) => {
      el.releasePointerCapture(ev.pointerId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  return (
    <div className="bg-[#050508] border border-white/[0.12] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_1px_1px_rgba(255,255,255,0.06),inset_0_1px_0_0_rgba(255,255,255,0.1)] flex flex-col overflow-hidden select-none transition-all duration-200 w-full">
      {/* 1. Deck Superior: Wheels, Faders, OLED + Knobs, Performance Bay */}
      <div className="p-3.5 md:p-4 bg-gradient-to-b from-[#111216] via-[#0d0e12] to-[#08080a] border-b border-white/[0.08] flex flex-col lg:flex-row gap-3 lg:gap-4 items-stretch w-full">
        {/* Ruedas Pitch & Mod */}
        <div className="flex items-center gap-2 pr-3 lg:pr-4 pb-3 lg:pb-0 border-b lg:border-b-0 lg:border-r border-white/[0.08] shrink-0">
          {/* Pitch Wheel */}
          <div className="flex flex-col items-center">
            <span className="text-[9.5px] font-mono text-zinc-400 mb-1 font-bold tracking-wider">PITCH</span>
            <div
              onPointerDown={handlePitchWheelPointerDown}
              className="w-6 h-28 bg-[#08080a] rounded-lg border border-white/[0.08] relative overflow-hidden flex items-center justify-center cursor-ns-resize shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)] hover:border-white/20 transition"
              title="Pitch Bend"
            >
              <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none opacity-20">
                <div className="w-full h-[1px] bg-white" />
                <div className="w-full h-[1px] bg-white" />
                <div className="w-full h-[1px] bg-white" />
                <div className="w-full h-[1px] bg-white" />
              </div>
              <div className="absolute w-full h-[1px] bg-white/30 top-1/2 shadow-[0_0_4px_white]" />
              <div
                className="absolute w-full h-3 bg-cyan-400/90 rounded transition-all duration-75 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                style={{ top: `${50 - (pitchBend / 8192) * 40}%` }}
              />
            </div>
            <span className="text-[9.5px] font-mono text-zinc-400 mt-1 font-medium tabular-nums">
              {pitchBend >= 0 ? `+${pitchBend}` : pitchBend}
            </span>
          </div>

          {/* Mod Wheel */}
          <div className="flex flex-col items-center">
            <span className="text-[9.5px] font-mono text-zinc-400 mb-1 font-bold tracking-wider">MOD</span>
            <div
              onPointerDown={handleModWheelPointerDown}
              className="w-6 h-28 bg-[#08080a] rounded-lg border border-white/[0.08] relative overflow-hidden flex items-end cursor-ns-resize shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)] hover:border-white/20 transition"
              title="Modulation (CC 1)"
            >
              <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none opacity-20 z-0">
                <div className="w-full h-[1px] bg-white" />
                <div className="w-full h-[1px] bg-white" />
                <div className="w-full h-[1px] bg-white" />
              </div>
              <div
                className="w-full bg-emerald-500 rounded transition-all duration-75 shadow-[0_0_10px_rgba(16,185,129,0.8)] z-10"
                style={{ height: `${(modWheel / 127) * 100}%` }}
              />
            </div>
            <span className="text-[9.5px] font-mono text-zinc-400 mt-1 font-medium tabular-nums">{modWheel}</span>
          </div>
        </div>

        {/* Faders Matrix (F1 a F9) */}
        <div className="w-full lg:w-[340px] shrink-0 pr-0 lg:pr-4 pb-3 lg:pb-0 border-b lg:border-b-0 lg:border-r border-white/[0.08]">
          <div className="flex justify-between items-center mb-2 px-0.5">
            <span className="text-[9.5px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
              MIXER
            </span>
            <span className="text-[9px] font-mono text-cyan-400 font-semibold tracking-wide">
              MASTER
            </span>
          </div>
          <div className="flex justify-between items-center gap-1">
            {faders.map((val, idx) => {
              const isMaster = idx === 8;
              const heightPct = (val / 127) * 100;
              const padSample = idx < 8 ? padSlots[idx]?.sampleName : null;
              const colorTheme = FADER_PAD_COLORS[idx] || FADER_PAD_COLORS[0];

              const isTargetSelected =
                isMidiLearnActive &&
                selectedLearnTarget?.type === "fader" &&
                selectedLearnTarget?.index === idx;
              const mappedCc = midiLearnMapping?.faders[idx] ?? (isMaster ? 46 : 38 + idx);

              const handleFaderContainerClick = (e: React.MouseEvent) => {
                if (isMidiLearnActive) {
                  e.stopPropagation();
                  onSelectLearnTarget?.({ type: "fader", index: idx });
                }
              };

              return (
                <div
                  key={idx}
                  onClick={handleFaderContainerClick}
                  onDoubleClick={() => !isMidiLearnActive && onChangeFader(idx, isMaster ? 100 : 64)}
                  className="flex-1 flex flex-col items-center cursor-pointer transition-all rounded-lg p-0.5"
                >
                  <div
                    onPointerDown={(e) => {
                      if (!isMidiLearnActive) handleFaderPointerDown(idx, e);
                    }}
                    className={`w-full h-28 bg-[#08080a] rounded-lg relative flex items-center justify-center p-0.5 cursor-ns-resize transition shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)] overflow-hidden group/fader ${
                      isTargetSelected
                        ? "border-2 border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.9)] ring-2 ring-amber-400/50 animate-pulse"
                        : isMidiLearnActive
                        ? "border-2 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.35)] hover:border-amber-400 hover:shadow-[0_0_16px_rgba(245,158,11,0.6)]"
                        : isMaster
                        ? "border-2 border-cyan-400/90 shadow-[0_0_12px_rgba(34,211,238,0.35),inset_0_2px_6px_rgba(0,0,0,0.9)] hover:border-cyan-300"
                        : "border border-white/[0.08] hover:border-white/20"
                    }`}
                    title={
                      isMidiLearnActive
                        ? `MIDI Learn: Fader ${idx + 1} (CC ${mappedCc})`
                        : isMaster
                        ? `Master: ${val}`
                        : `Pad ${idx + 1}${padSample ? ` (${padSample})` : ""}: ${val}`
                    }
                  >
                    <div className="absolute left-1/2 -translate-x-1/2 w-[3px] h-[calc(100%-8px)] bg-black rounded-full border border-white/[0.06] shadow-inner" />
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 w-[2px] bottom-1 rounded-full transition-all duration-75 ${
                        isMaster ? "bg-cyan-400/80 shadow-[0_0_6px_rgba(34,211,238,0.6)]" : `${colorTheme.dot} opacity-60`
                      }`}
                      style={{ height: `${Math.max(0, heightPct * 0.78)}%` }}
                    />
                    <div
                      className="absolute left-1/2 -translate-x-1/2 w-[88%] h-4 rounded-sm bg-gradient-to-b from-[#383a42] via-[#22242a] to-[#141518] border border-white/20 shadow-[0_3px_6px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.35)] flex items-center justify-center transition-all duration-75 pointer-events-none group-hover/fader:border-white/40"
                      style={{ bottom: `calc(${heightPct}% * 0.76 + 2px)` }}
                    >
                      <div className={`w-[75%] h-[2px] rounded-full ${isMaster ? "bg-cyan-400 shadow-[0_0_6px_#22d3ee]" : colorTheme.line}`} />
                    </div>
                  </div>
                  <span className={`text-[9.5px] font-mono mt-1.5 tabular-nums ${isTargetSelected ? "text-amber-300 font-bold" : isMaster ? "text-cyan-300 font-bold" : "text-zinc-300 font-medium"}`}>
                    {val}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Knobs Matrix & OLED Display */}
        <div className="flex-1 min-w-0 pr-0 lg:pr-4 pb-3 lg:pb-0 border-b lg:border-b-0 lg:border-r border-white/[0.08] flex flex-col justify-center gap-2">
          {/* Pantalla OLED Dual */}
          <div className="p-1 bg-[#040406] border border-white/10 rounded-lg shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),0_1px_0_rgba(255,255,255,0.05)] flex items-center justify-between gap-1.5 flex-nowrap">
            <div className="flex-1 min-w-0 h-7 px-2 bg-[#0a0c10] border border-white/10 hover:border-white/25 rounded-md flex items-center gap-1.5 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] overflow-hidden">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDownloading ? "bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse" : "bg-emerald-400 shadow-[0_0_6px_#10b981]"}`} />
              <span className="text-[9.5px] font-mono uppercase font-bold tracking-wider text-zinc-400 shrink-0">INST:</span>
              {isDownloading ? (
                <div className="flex items-center gap-1.5 text-amber-300 font-mono text-[10px] font-bold truncate">
                  <span className="animate-pulse">CARGANDO...</span>
                  {downloadProgress !== null && <span className="tabular-nums">{downloadProgress}%</span>}
                </div>
              ) : (
                <select
                  value={
                    availableSoundfonts.find(
                      (sf) => sf.id === currentSoundfont?.id || sf.filename === currentSoundfont?.filename
                    )?.id || currentSoundfont?.id || currentSoundfont?.filename || ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    e.target.blur();
                    if (val && onSelectSoundfont) {
                      onSelectSoundfont(val);
                    }
                  }}
                  className="bg-transparent text-emerald-300 font-mono text-[10.5px] font-bold focus:outline-none cursor-pointer w-full truncate pr-1"
                  title="Cambiar Instrumento"
                >
                  {availableSoundfonts.length > 0 ? (
                    availableSoundfonts.map((sf) => (
                      <option key={sf.id || sf.filename} value={sf.id || sf.filename} className="bg-zinc-950 text-zinc-200 font-mono text-xs">
                        {sf.displayName.toUpperCase()}
                      </option>
                    ))
                  ) : (
                    <option value={currentSoundfont?.filename || ""} className="bg-zinc-950 text-zinc-200 font-mono text-xs">
                      {currentSoundfont ? currentSoundfont.displayName.toUpperCase() : "SIN INSTRUMENTO"}
                    </option>
                  )}
                </select>
              )}
            </div>

            {currentSoundfont && currentSoundfont.presets.length > 1 && (
              <div className="flex-1 min-w-0 max-w-[210px] h-7 px-2 bg-[#0a0c10] border border-white/10 hover:border-white/25 rounded-md flex items-center gap-1.5 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] overflow-hidden shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b] shrink-0" />
                <span className="text-[9.5px] font-mono uppercase font-bold tracking-wider text-zinc-400 shrink-0">PATCH:</span>
                <select
                  value={activePresetIndex}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value, 10);
                    e.target.blur();
                    const preset = currentSoundfont.presets[idx];
                    onSelectPreset?.(preset?.patch ?? 0, idx, preset?.bank ?? 0);
                  }}
                  className="bg-transparent text-amber-300 font-mono text-[10.5px] font-bold focus:outline-none cursor-pointer w-full truncate pr-1"
                  title="Cambiar Patch"
                >
                  {currentSoundfont.presets.map((p, idx) => (
                    <option key={idx} value={idx} className="bg-zinc-950 text-zinc-200 font-mono text-xs">
                      {p.name.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Matrix de 8 Knobs */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2">
            {knobs.map((val, idx) => {
              const rotDeg = -135 + (val / 127) * 270;
              const mapping = knobMappings.find((m) => m.index === idx);
              const defaultLabels = ["CUTOFF", "RES", "DRIVE", "REVERB", "D-TIME", "D-FDBK", "D-MIX", "PAN"];
              const activeLabel = mapping ? mapping.label : defaultLabels[idx] || `K${idx + 1}`;
              const circ = 87.96;
              const arcLength = 65.97;
              const activeDash = (val / 127) * arcLength;
              const isFxBypassed = fxRouting === "off";

              const isKnobTargetSelected =
                isMidiLearnActive &&
                selectedLearnTarget?.type === "knob" &&
                selectedLearnTarget?.index === idx;
              const mappedKnobCc = midiLearnMapping?.knobs[idx] ?? (56 + idx);

              const handleKnobContainerClick = (e: React.MouseEvent) => {
                if (isMidiLearnActive) {
                  e.stopPropagation();
                  onSelectLearnTarget?.({ type: "knob", index: idx });
                }
              };

              return (
                <div
                  key={idx}
                  onClick={handleKnobContainerClick}
                  onDoubleClick={() => !isMidiLearnActive && onChangeKnob(idx, [0, 1, 7].includes(idx) ? 64 : 0)}
                  className={`relative flex flex-col items-center cursor-pointer group py-1 px-1 rounded-lg transition-all ${
                    isKnobTargetSelected
                      ? "border-2 border-amber-400 bg-amber-500/20 shadow-[0_0_18px_rgba(245,158,11,0.85)] ring-2 ring-amber-400/50 animate-pulse"
                      : isMidiLearnActive
                      ? "border border-amber-500/50 bg-amber-950/20 shadow-[0_0_10px_rgba(245,158,11,0.3)] hover:border-amber-400 hover:shadow-[0_0_14px_rgba(245,158,11,0.55)]"
                      : "border border-transparent hover:bg-white/[0.03]"
                  }`}
                  title={
                    isMidiLearnActive
                      ? `MIDI Learn: Knob ${idx + 1} (${activeLabel}) -> CC ${mappedKnobCc}`
                      : `${activeLabel}: ${val}`
                  }
                >
                  <div
                    onPointerDown={(e) => {
                      if (!isMidiLearnActive) handleKnobPointerDown(idx, e);
                    }}
                    className="relative w-9 h-9 flex items-center justify-center cursor-ns-resize mt-0.5"
                  >
                    <svg className="w-9 h-9 rotate-[135deg] pointer-events-none" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#1e2026" strokeWidth="2.5" strokeDasharray={`${arcLength} ${circ}`} strokeLinecap="round" />
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke={isFxBypassed ? "#3f3f46" : isKnobTargetSelected ? "#fbbf24" : "#f59e0b"}
                        strokeWidth="2.5"
                        strokeDasharray={`${activeDash} ${circ}`}
                        strokeLinecap="round"
                        className={isFxBypassed ? "opacity-60" : "drop-shadow-[0_0_5px_rgba(251,191,36,0.85)]"}
                      />
                    </svg>
                    <div className="absolute w-6 h-6 rounded-full bg-gradient-to-b from-[#34373e] via-[#1e2025] to-[#121316] border border-white/15 shadow-[0_2px_5px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.25)] flex items-center justify-center group-hover:border-amber-400/60 transition">
                      <div
                        className={`absolute w-[1.5px] h-2.5 rounded-full origin-bottom bottom-1/2 transition-all ${
                          isFxBypassed ? "bg-zinc-500 shadow-none" : "bg-amber-400 shadow-[0_0_6px_#fbbf24]"
                        }`}
                        style={{ transform: `rotate(${rotDeg}deg)` }}
                      />
                    </div>
                  </div>
                  <span className={`text-[9.5px] font-mono font-bold mt-1.5 truncate max-w-[58px] text-center leading-tight tracking-wider ${isKnobTargetSelected ? "text-amber-200" : isFxBypassed ? "text-zinc-500" : "text-amber-300"}`}>
                    {activeLabel}
                  </span>
                  <span className={`text-[9.5px] font-mono mt-0.5 font-medium tabular-nums ${isKnobTargetSelected ? "text-amber-300 font-bold" : isFxBypassed ? "text-zinc-600" : "text-zinc-300"}`}>
                    {val}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Bay */}
        <div className="w-full lg:w-32 shrink-0 flex flex-col items-center justify-center self-center my-auto">
          <PerformanceBay
            fxRouting={fxRouting}
            onChangeFxRouting={onChangeFxRouting}
            arpState={arpState}
            onChangeArpState={onChangeArpState}
            isMidiLearnActive={isMidiLearnActive}
            selectedLearnTarget={selectedLearnTarget}
            onSelectLearnTarget={onSelectLearnTarget}
            midiLearnMapping={midiLearnMapping}
          />
        </div>
      </div>

      {/* 2. Deck Inferior: Teclado de 49 Teclas */}
      {!hideKeyboard && (
        <div className="bg-[#050507] flex flex-col relative">
          <div className="h-1 w-full bg-gradient-to-b from-black to-[#09090c] border-b border-black/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.95)] shrink-0 z-20" />
          <div className="flex w-full items-stretch relative">
            <div className="w-2 sm:w-3 bg-gradient-to-r from-[#0c0d10] to-[#060608] border-r border-black/90 shrink-0 z-30" />
            <div
              className="relative flex-1 h-44 flex overflow-x-auto overflow-y-hidden select-none bg-black"
              onMouseLeave={() => {
                document.querySelectorAll<HTMLElement>('.piano-key-active').forEach((el) => {
                  const note = Number(el.getAttribute('data-piano-note'));
                  if (!isNaN(note)) onReleaseNote(note);
                });
              }}
            >
              {keys.map((k) => {
                const isCKey = k.note % 12 === 0;
                const octaveNum = Math.floor(k.note / 12) - 2;
                const isMiddleC = k.note === 60;
                const qwertyLabel = qwertyLabels.get(k.note);

                if (k.isBlack) {
                  return (
                    <div
                      key={k.note}
                      data-piano-note={k.note}
                      onMouseDown={(e) => {
                        if (k.isOutOfRange) return;
                        e.stopPropagation();
                        onTriggerNote(k.note, 110);
                      }}
                      onMouseUp={(e) => {
                        if (k.isOutOfRange) return;
                        e.stopPropagation();
                        onReleaseNote(k.note);
                      }}
                      onMouseEnter={(e) => {
                        if (k.isOutOfRange) return;
                        if (e.buttons === 1) onTriggerNote(k.note, 110);
                      }}
                      onMouseLeave={(e) => {
                        if (k.isOutOfRange) return;
                        if (e.buttons === 1) onReleaseNote(k.note);
                      }}
                      className={`w-[22px] h-[106px] -mx-[11px] z-20 rounded-b-[2px] relative piano-key-black ${
                        k.isOutOfRange
                          ? "bg-zinc-950 opacity-20 cursor-not-allowed piano-key-out-of-range"
                          : ""
                      }`}
                      style={{ flexShrink: 0 }}
                    >
                      {qwertyLabel && !k.isOutOfRange && (
                        <span className="piano-key-label absolute bottom-1.5 left-1/2 -translate-x-1/2 font-mono text-[9px] font-bold tracking-tight select-none pointer-events-none transition-colors text-zinc-400/90">
                          {qwertyLabel}
                        </span>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={k.note}
                    data-piano-note={k.note}
                    onMouseDown={() => {
                      if (k.isOutOfRange) return;
                      onTriggerNote(k.note, 100);
                    }}
                    onMouseUp={() => {
                      if (k.isOutOfRange) return;
                      onReleaseNote(k.note);
                    }}
                    onMouseEnter={(e) => {
                      if (k.isOutOfRange) return;
                      if (e.buttons === 1) onTriggerNote(k.note, 100);
                    }}
                    onMouseLeave={(e) => {
                      if (k.isOutOfRange) return;
                      if (e.buttons === 1) onReleaseNote(k.note);
                    }}
                    className={`flex-1 min-w-[20px] h-full rounded-b-[4px] relative z-10 piano-key-white ${
                      k.isOutOfRange
                        ? "bg-zinc-900/60 opacity-20 cursor-not-allowed piano-key-out-of-range"
                        : ""
                    }`}
                  >
                    {isCKey && (
                      <span
                        className={`piano-key-octave absolute left-1/2 -translate-x-1/2 font-mono font-bold tracking-tight select-none pointer-events-none transition-all ${
                          qwertyLabel && !k.isOutOfRange ? "bottom-7 text-[8.5px]" : "bottom-2.5 text-[9.5px]"
                        } ${isMiddleC ? "text-cyan-700 font-extrabold" : "text-zinc-500 font-bold"}`}
                      >
                        C{octaveNum}
                      </span>
                    )}

                    {qwertyLabel && !k.isOutOfRange && (
                      <span className="piano-key-label absolute bottom-2.5 left-1/2 -translate-x-1/2 font-mono text-[10px] font-bold tracking-tight select-none pointer-events-none transition-colors text-zinc-600/90">
                        {qwertyLabel}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="w-2 sm:w-3 bg-gradient-to-l from-[#0c0d10] to-[#060608] border-l border-black/90 shrink-0 z-30" />
          </div>
        </div>
      )}

      {children && <div className="relative z-40">{children}</div>}
    </div>
  );
});
