import React, { useState, useRef, useEffect } from "react";
import { Settings } from "lucide-react";
import { FxRouting } from "../types/sampler";
import { ArpMode, ArpRate, ArpStateInfo } from "../types/arpeggiator";

interface PerformanceBayProps {
  fxRouting?: FxRouting;
  onChangeFxRouting?: (routing: FxRouting) => void;
  arpState?: ArpStateInfo;
  onChangeArpState?: (state: ArpStateInfo) => void;
}

export const PerformanceBay: React.FC<PerformanceBayProps> = ({
  fxRouting = "both",
  onChangeFxRouting,
  arpState: externalArpState,
  onChangeArpState,
}) => {
  const [internalArpState, setInternalArpState] = useState<ArpStateInfo>({
    enabled: false,
    hold: false,
    mode: "up",
    rate: "sixteenth",
    octaves: 1,
  });

  const arpState = externalArpState || internalArpState;
  const updateArpState = (updater: (prev: ArpStateInfo) => ArpStateInfo) => {
    const next = updater(arpState);
    if (onChangeArpState) {
      onChangeArpState(next);
    } else {
      setInternalArpState(next);
    }
  };

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    };
    if (isPopoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPopoverOpen]);

  const handleToggleArp = () => {
    updateArpState((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  const handleToggleHold = () => {
    updateArpState((prev) => ({ ...prev, hold: !prev.hold }));
  };

  const handleToggleKeys = () => {
    if (!onChangeFxRouting) return;
    if (fxRouting === "keys") onChangeFxRouting("off");
    else if (fxRouting === "off") onChangeFxRouting("keys");
    else if (fxRouting === "both") onChangeFxRouting("pads");
    else if (fxRouting === "pads") onChangeFxRouting("both");
  };

  const handleTogglePads = () => {
    if (!onChangeFxRouting) return;
    if (fxRouting === "pads") onChangeFxRouting("off");
    else if (fxRouting === "off") onChangeFxRouting("pads");
    else if (fxRouting === "both") onChangeFxRouting("keys");
    else if (fxRouting === "keys") onChangeFxRouting("both");
  };

  const isFxKeysActive = fxRouting === "keys" || fxRouting === "both";
  const isFxPadsActive = fxRouting === "pads" || fxRouting === "both";

  const fxBtnBase =
    "w-full h-7 px-2 rounded-md flex items-center justify-center gap-1.5 font-mono text-[9.5px] tracking-wider transition-all active:scale-95 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_1px_3px_rgba(0,0,0,0.5)]";
  const fxBtnOff =
    "bg-[#18191e] text-zinc-400 hover:text-zinc-200 hover:bg-[#24262d] border border-white/10 hover:border-white/20 font-bold";
  const fxBtnCyan =
    "bg-cyan-950/30 text-cyan-300 border border-cyan-400/60 shadow-[0_0_6px_rgba(34,211,238,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] font-black";

  const renderLed = (on: boolean, colorClass: string, glow: string) => (
    <span
      className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all ${
        on ? `${colorClass} ${glow}` : "bg-zinc-700"
      }`}
    />
  );

  return (
    <div className="w-full flex flex-col items-center justify-center gap-2 relative">
      {/* 1. Cápsula Unificada de Controles ARP [ ARP | HOLD | ⚙ ] */}
      <div className="flex items-stretch w-full h-7 rounded-md bg-[#18191e] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_1px_3px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Segmento ARP */}
        <button
          type="button"
          onClick={handleToggleArp}
          className={`flex-1 h-full px-1.5 flex items-center justify-center gap-1 font-mono text-[9.5px] tracking-wider transition-all cursor-pointer border-r border-white/10 ${
            arpState.enabled
              ? "bg-emerald-950/40 text-emerald-300 font-black shadow-[inset_0_0_8px_rgba(16,185,129,0.2)]"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-[#24262d] font-bold"
          }`}
        >
          {renderLed(arpState.enabled, "bg-emerald-400", "shadow-[0_0_6px_#10b981]")}
          <span>ARP</span>
        </button>

        {/* Segmento HOLD */}
        <button
          type="button"
          onClick={handleToggleHold}
          className={`flex-1 h-full px-1.5 flex items-center justify-center gap-1 font-mono text-[9.5px] tracking-wider transition-all cursor-pointer border-r border-white/10 ${
            arpState.hold
              ? "bg-amber-950/40 text-amber-300 font-black shadow-[inset_0_0_8px_rgba(245,158,11,0.2)]"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-[#24262d] font-bold"
          }`}
        >
          {renderLed(arpState.hold, "bg-amber-400", "shadow-[0_0_6px_#f59e0b]")}
          <span>HOLD</span>
        </button>

        {/* Segmento Ajustes (Engranaje) */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          className={`w-7 h-full flex items-center justify-center transition-all cursor-pointer ${
            isPopoverOpen
              ? "bg-white/15 text-white"
              : "text-zinc-500 hover:text-zinc-200 hover:bg-[#24262d]"
          }`}
          title="Ajustes de Arpegiador"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Popover de Ajustes */}
      {isPopoverOpen && (
        <div
          ref={popoverRef}
          className="absolute top-9 left-0 right-0 z-50 p-2.5 bg-[#121318] border border-white/15 rounded-lg shadow-2xl backdrop-blur-md flex flex-col gap-2 font-mono text-[10px]"
        >
          <div className="flex items-center justify-between text-zinc-400 border-b border-white/10 pb-1">
            <span>MODO</span>
            <div className="flex gap-1">
              {(["up", "down", "upDown"] as ArpMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => updateArpState((p) => ({ ...p, mode: m }))}
                  className={`px-1.5 py-0.5 rounded text-[9px] uppercase transition ${
                    arpState.mode === m ? "bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {m === "upDown" ? "U/D" : m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-zinc-400 border-b border-white/10 pb-1">
            <span>RATE</span>
            <div className="flex gap-1">
              {(["quarter", "eighth", "sixteenth", "thirtySecond"] as ArpRate[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => updateArpState((p) => ({ ...p, rate: r }))}
                  className={`px-1.5 py-0.5 rounded text-[9px] transition ${
                    arpState.rate === r ? "bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {r === "quarter" ? "1/4" : r === "eighth" ? "1/8" : r === "sixteenth" ? "1/16" : "1/32"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-zinc-400">
            <span>OCTAVAS</span>
            <div className="flex gap-1">
              {[1, 2, 3].map((oct) => (
                <button
                  key={oct}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => updateArpState((p) => ({ ...p, octaves: oct }))}
                  className={`px-2 py-0.5 rounded text-[9px] transition ${
                    arpState.octaves === oct ? "bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {oct}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Botones de Enrutamiento de Efectos (FX ROUTE) */}
      <div className="flex flex-col w-full gap-1.5">
        <button
          type="button"
          onClick={handleToggleKeys}
          className={`${fxBtnBase} ${isFxKeysActive ? fxBtnCyan : fxBtnOff}`}
        >
          {renderLed(isFxKeysActive, "bg-cyan-400", "shadow-[0_0_6px_#22d3ee]")}
          <span>FX KEYS</span>
        </button>

        <button
          type="button"
          onClick={handleTogglePads}
          className={`${fxBtnBase} ${isFxPadsActive ? fxBtnCyan : fxBtnOff}`}
        >
          {renderLed(isFxPadsActive, "bg-cyan-400", "shadow-[0_0_6px_#22d3ee]")}
          <span>FX PADS</span>
        </button>
      </div>
    </div>
  );
};
