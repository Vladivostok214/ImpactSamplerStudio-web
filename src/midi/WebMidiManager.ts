import { audioBridge } from '../audio/WebAudioBridge';

export type MidiDeviceCallback = (devices: string[]) => void;
export type NoteEventCallback = (note: number, velocity: number, isNoteOn: boolean) => void;
export type CcEventCallback = (controller: number, value: number, channel: number) => void;
export type PitchBendCallback = (value: number, channel: number) => void;
export type TransportAction = 'play' | 'stop' | 'record' | 'rewind' | 'forward' | 'loop' | 'click';
export type TransportCallback = (action: TransportAction, value: number) => void;

export class WebMidiManager {
  private static instance: WebMidiManager;
  private midiAccess: MIDIAccess | null = null;
  private connectedDevices: string[] = [];
  private onDeviceChangeListeners: MidiDeviceCallback[] = [];
  private onNoteEventListeners: NoteEventCallback[] = [];
  private onCcEventListeners: CcEventCallback[] = [];
  private onPitchBendListeners: PitchBendCallback[] = [];
  private onTransportListeners: TransportCallback[] = [];

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

    // 0x09: Note On
    if (command === 0x09) {
      const note = data1;
      const velocity = data2;
      if (velocity > 0) {
        audioBridge.noteOn(note, velocity, channel);
        this.notifyNoteEvent(note, velocity, true);
      } else {
        // Velocity 0 es tratado como Note Off en protocolo MIDI
        audioBridge.noteOff(note, channel);
        this.notifyNoteEvent(note, 0, false);
      }
    }
    // 0x08: Note Off
    else if (command === 0x08) {
      const note = data1;
      audioBridge.noteOff(note, channel);
      this.notifyNoteEvent(note, 0, false);
    }
    // 0x0B: Control Change (Faders, Knobs, Mod Wheel, Transporte, etc.)
    else if (command === 0x0B) {
      const controller = data1;
      const value = data2;
      this.notifyCcEvent(controller, value, channel);

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
    }
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

  public getConnectedDevices(): string[] {
    return this.connectedDevices;
  }
}

export const webMidi = WebMidiManager.getInstance();
