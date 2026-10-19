import { audioBridge } from '../audio/WebAudioBridge';
import { NormalizedMidiEvent } from '../types/midi';
import { getMidiNoteName } from '../types/midiLearn';

export type MidiDeviceCallback = (devices: string[]) => void;
export type NoteEventCallback = (note: number, velocity: number, isNoteOn: boolean) => void;
export type CcEventCallback = (controller: number, value: number, channel: number) => void;
export type PitchBendCallback = (value: number, channel: number) => void;
export type TransportAction = 'play' | 'stop' | 'record' | 'rewind' | 'forward' | 'loop' | 'click';
export type TransportCallback = (action: TransportAction, value: number) => void;
export type NormalizedMidiEventCallback = (event: NormalizedMidiEvent) => void;

export class WebMidiManager {
  private static instance: WebMidiManager;
  private midiAccess: MIDIAccess | null = null;
  private connectedDevices: string[] = [];
  private onDeviceChangeListeners: MidiDeviceCallback[] = [];
  private onNoteEventListeners: NoteEventCallback[] = [];
  private onCcEventListeners: CcEventCallback[] = [];
  private onPitchBendListeners: PitchBendCallback[] = [];
  private onTransportListeners: TransportCallback[] = [];
  private onNormalizedMidiEventListeners: NormalizedMidiEventCallback[] = [];
  public shouldInterceptNote: ((note: number, velocity: number) => boolean) | null = null;

  private constructor() {}

  public static getInstance(): WebMidiManager {
    if (!WebMidiManager.instance) {
      WebMidiManager.instance = new WebMidiManager();
    }
    return WebMidiManager.instance;
  }

  public async requestAccess(): Promise<boolean> {
    if (!navigator.requestMIDIAccess) {
      console.warn('Web MIDI API no soportada en este navegador');
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.updateInputs();

      this.midiAccess.onstatechange = () => {
        this.updateInputs();
      };

      return true;
    } catch (err) {
      console.error('Error solicitando acceso Web MIDI:', err);
      return false;
    }
  }

  private updateInputs(): void {
    if (!this.midiAccess) return;

    const devices: string[] = [];
    for (const input of this.midiAccess.inputs.values()) {
      if (input.name) devices.push(input.name);
      input.onmidimessage = (msg) => this.handleMidiMessage(msg);
    }

    this.connectedDevices = devices;
    this.onDeviceChangeListeners.forEach((listener) => listener(devices));
  }

  private handleMidiMessage(msg: MIDIMessageEvent): void {
    if (!msg.data) return;
    const [status, data1, data2] = msg.data;
    const command = status >> 4;
    const channel = status & 0x0f;
    const portName = (msg.target as any)?.name || (this.connectedDevices[0] || 'Web MIDI');
    const timestampMs = Math.round(performance.now());

    // 0x09: Note On
    if (command === 0x09) {
      const note = data1;
      const velocity = data2;
      const intercepted = this.shouldInterceptNote ? this.shouldInterceptNote(note, velocity) : false;
      const isNoteOn = velocity > 0;
      if (isNoteOn) {
        if (!intercepted) {
          audioBridge.noteOn(note, velocity, channel);
        }
        this.notifyNoteEvent(note, velocity, true);
        this.notifyNormalizedMidiEvent({
          portName,
          channel: channel + 1,
          event: { type: 'noteon', note, velocity, noteName: getMidiNoteName(note) },
          timestampMs,
        });
      } else {
        // Velocity 0 es tratado como Note Off en protocolo MIDI
        if (!intercepted) {
          audioBridge.noteOff(note, channel);
        }
        this.notifyNoteEvent(note, 0, false);
        this.notifyNormalizedMidiEvent({
          portName,
          channel: channel + 1,
          event: { type: 'noteoff', note, velocity: 0, noteName: getMidiNoteName(note) },
          timestampMs,
        });
      }
    }
    // 0x08: Note Off
    else if (command === 0x08) {
      const note = data1;
      const intercepted = this.shouldInterceptNote ? this.shouldInterceptNote(note, 0) : false;
      if (!intercepted) {
        audioBridge.noteOff(note, channel);
      }
      this.notifyNoteEvent(note, 0, false);
      this.notifyNormalizedMidiEvent({
        portName,
        channel: channel + 1,
        event: { type: 'noteoff', note, velocity: 0, noteName: getMidiNoteName(note) },
        timestampMs,
      });
    }
    // 0x0B: Control Change (Faders, Knobs, Mod Wheel, Transporte, etc.)
    else if (command === 0x0B) {
      const controller = data1;
      const value = data2;
      this.notifyCcEvent(controller, value, channel);
      this.notifyNormalizedMidiEvent({
        portName,
        channel: channel + 1,
        event: { type: 'controlchange', controller, value },
        timestampMs,
      });

      // Parseo especializado de Transporte Hardware (Nektar LX49+ & Estándar DAW)
      if (value > 0) {
        if (controller === 106) this.notifyTransportEvent('play', value);
        else if (controller === 105) this.notifyTransportEvent('stop', value);
        else if (controller === 107) this.notifyTransportEvent('record', value);
        else if (controller === 103) this.notifyTransportEvent('rewind', value);
        else if (controller === 104) this.notifyTransportEvent('forward', value);
        else if (controller === 102) this.notifyTransportEvent('loop', value);
        else if (controller === 47) this.notifyTransportEvent('click', value);
      }
    }
    // 0x0E: Pitch Bend
    else if (command === 0x0E) {
      const raw = (data2 << 7) | data1;
      const bend = raw - 8192; // -8192 a 8191
      this.notifyPitchBendEvent(bend, channel);
      this.notifyNormalizedMidiEvent({
        portName,
        channel: channel + 1,
        event: { type: 'pitchbend', value: bend, normalized: bend },
        timestampMs,
      });
    }
  }

  private notifyNormalizedMidiEvent(event: NormalizedMidiEvent): void {
    this.onNormalizedMidiEventListeners.forEach((cb) => cb(event));
  }

  private notifyNoteEvent(note: number, velocity: number, isNoteOn: boolean): void {
    this.onNoteEventListeners.forEach((cb) => cb(note, velocity, isNoteOn));
  }

  private notifyCcEvent(controller: number, value: number, channel: number): void {
    this.onCcEventListeners.forEach((cb) => cb(controller, value, channel));
  }

  private notifyPitchBendEvent(value: number, channel: number): void {
    this.onPitchBendListeners.forEach((cb) => cb(value, channel));
  }

  private notifyTransportEvent(action: TransportAction, value: number): void {
    this.onTransportListeners.forEach((cb) => cb(action, value));
  }

  public onTransport(callback: TransportCallback): () => void {
    this.onTransportListeners.push(callback);
    return () => {
      this.onTransportListeners = this.onTransportListeners.filter((c) => c !== callback);
    };
  }

  public onDeviceChange(callback: MidiDeviceCallback): () => void {
    this.onDeviceChangeListeners.push(callback);
    callback(this.connectedDevices);
    return () => {
      this.onDeviceChangeListeners = this.onDeviceChangeListeners.filter((c) => c !== callback);
    };
  }

  public onNoteEvent(callback: NoteEventCallback): () => void {
    this.onNoteEventListeners.push(callback);
    return () => {
      this.onNoteEventListeners = this.onNoteEventListeners.filter((c) => c !== callback);
    };
  }

  public onCcEvent(callback: CcEventCallback): () => void {
    this.onCcEventListeners.push(callback);
    return () => {
      this.onCcEventListeners = this.onCcEventListeners.filter((c) => c !== callback);
    };
  }

  public onPitchBend(callback: PitchBendCallback): () => void {
    this.onPitchBendListeners.push(callback);
    return () => {
      this.onPitchBendListeners = this.onPitchBendListeners.filter((c) => c !== callback);
    };
  }

  public onNormalizedMidiEvent(callback: NormalizedMidiEventCallback): () => void {
    this.onNormalizedMidiEventListeners.push(callback);
    return () => {
      this.onNormalizedMidiEventListeners = this.onNormalizedMidiEventListeners.filter((c) => c !== callback);
    };
  }

  public getConnectedDevices(): string[] {
    return this.connectedDevices;
  }
}

export const webMidi = WebMidiManager.getInstance();
