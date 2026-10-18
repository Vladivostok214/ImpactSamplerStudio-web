export type UIActionId =
  | "play"
  | "stop"
  | "record"
  | "tapTempo"
  | "bpmDown"
  | "bpmUp"
  | "click"
  | "visualMetronome"
  | "bank"
  | "grid"
  | "page"
  | "undo"
  | "clearTrack"
  | "clearPattern"
  | "fxRouteKeys"
  | "fxRoutePads"
  | "workstationMode"
  | "toggleArp"
  | "toggleArpHold";

export interface ActionBinding {
  messageType: "cc" | "note";
  number: number;
}

export type MidiLearnTarget =
  | { type: "fader"; index: number }
  | { type: "knob"; index: number }
  | { type: "pad"; index: number }
  | { type: "action"; id: UIActionId };

export interface MidiLearnMapping {
  faders: Record<number, number>;
  knobs: Record<number, number>;
  pads: Record<number, number>;
  actions: Record<string, ActionBinding>;
}

export const DEFAULT_MIDI_LEARN_MAPPING: MidiLearnMapping = {
  faders: { 0: 38, 1: 39, 2: 40, 3: 41, 4: 42, 5: 43, 6: 44, 7: 45, 8: 46 },
  knobs: { 0: 56, 1: 57, 2: 58, 3: 59, 4: 60, 5: 61, 6: 62, 7: 63 },
  pads: { 0: 36, 1: 38, 2: 42, 3: 46, 4: 41, 5: 45, 6: 49, 7: 51 },
  actions: {},
};
