export interface MidiPortInfo {
  index: number;
  name: string;
  isDefault: boolean;
  isConnected: boolean;
}

export type MidiEventType =
  | { type: "noteon"; note: number; velocity: number; noteName?: string; padIndex?: number }
  | { type: "noteoff"; note: number; velocity?: number; noteName?: string; padIndex?: number }
  | { type: "controlchange"; controller: number; value: number; label?: string }
  | { type: "pitchbend"; value: number; normalized?: number };

export interface NormalizedMidiEvent {
  portName: string;
  channel: number;
  event: MidiEventType;
  timestampMs: number;
}
