import './workletPolyfills';
import { initSync, WasmEngine } from '../../wasm/impact_wasm';

declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare function registerProcessor(
  name: string,
  processorCtor: new (options?: any) => AudioWorkletProcessor
): void;

declare const sampleRate: number;

const DRUM_NOTE_TO_PAD: Record<number, number> = {
  36: 0, // Pad 1 · Kick
  38: 1, // Pad 2 · Snare
  42: 2, // Pad 3 · Closed HH
  46: 3, // Pad 4 · Open HH
  41: 4, // Pad 5 · Low Tom
  45: 5, // Pad 6 · Mid Tom
  49: 6, // Pad 7 · Crash
  51: 7, // Pad 8 · Ride
};

class ImpactAudioProcessor extends AudioWorkletProcessor {
  private engine: WasmEngine | null = null;
  private soundFontLoaded = false;
  private lastStep = -1;
  private isRecording = false;

  constructor(options?: { processorOptions?: { wasmModule?: WebAssembly.Module } }) {
    super();

    // 1. Inicialización sincrónica si el WebAssembly.Module pre-compilado viene en processorOptions
    if (options?.processorOptions?.wasmModule) {
      try {
        initSync({ module: options.processorOptions.wasmModule });
        this.engine = new WasmEngine(sampleRate);
      } catch (err: any) {
        this.port.postMessage({ type: 'WASM_ERROR', error: err?.message || String(err) });
      }
    }

    // 2. Canal de mensajes bidireccional de baja latencia con el hilo principal
    this.port.onmessage = (event) => this.handleMessage(event.data);
  }

  private handleMessage(data: any): void {
    if (!data) return;

    // Inicialización de respaldo si el módulo WASM se envía post-construcción
    if (data.type === 'INIT_WASM') {
      try {
        if (!this.engine) {
          initSync({ module: data.wasmModule });
          this.engine = new WasmEngine(sampleRate);
        }
        this.port.postMessage({ type: 'WASM_READY' });
      } catch (err: any) {
        this.port.postMessage({ type: 'WASM_ERROR', error: err?.message || String(err) });
      }
      return;
    }

    if (!this.engine) return;

    switch (data.type) {
      case 'SET_RECORDING':
        this.isRecording = Boolean(data.recording);
        break;

      case 'NOTE_ON': {
        const channel = data.channel ?? 0;
        const key = data.key;
        const velocity = data.velocity ?? 100;
        this.engine.note_on(channel, key, velocity);

        // Overdub en tiempo real si el secuenciador está reproduciendo y en modo grabación
        if (this.isRecording && this.engine.seq_is_playing()) {
          const padIdx = DRUM_NOTE_TO_PAD[key];
          if (padIdx !== undefined) {
            const currentStep = this.engine.seq_get_current_step();
            const pattern = this.getFlatPatternGrid();
            // Si el paso no está activo, activarlo y enviar actualización del patrón
            if (pattern[padIdx][currentStep] === 0) {
              const active = this.engine.seq_toggle_step(padIdx, currentStep);
              const updatedPattern = this.getFlatPatternGrid();
              this.port.postMessage({
                type: 'SEQ_PATTERN_UPDATED',
                pattern: updatedPattern,
                padIdx,
                stepIdx: currentStep,
                active,
              });
            }
          }
        }
        break;
      }

      case 'NOTE_OFF':
        this.engine.note_off(data.channel ?? 0, data.key);
        break;

      case 'NOTE_OFF_ALL':
        this.engine.note_off_all(data.immediate ?? false);
        break;

      case 'LOAD_SOUNDFONT':
        try {
          const bytes = new Uint8Array(data.buffer);
          this.engine.load_soundfont(bytes);
          this.soundFontLoaded = true;
          this.port.postMessage({ type: 'SOUNDFONT_LOADED', loadId: data.loadId, name: data.name });
        } catch (err: any) {
          this.port.postMessage({ type: 'SOUNDFONT_ERROR', loadId: data.loadId, error: err?.message || String(err) });
        }
        break;

      case 'SET_KNOB':
        this.engine.set_knob(data.index, data.value);
        break;

      case 'SET_MASTER_FADER':
        this.engine.set_master_fader(data.value);
        break;

      case 'SET_FX_ROUTING':
        this.engine.set_fx_routing(data.routing);
        break;

      case 'SET_PITCH_BEND':
        this.engine.set_pitch_bend(data.channel ?? 0, data.bend);
        break;

      case 'SET_MOD_WHEEL':
        this.engine.set_mod_wheel(data.channel ?? 0, data.value);
        break;

      case 'SET_PROGRAM':
        this.engine.set_program(data.channel ?? 0, data.patch, data.bank ?? 0);
        break;

      case 'SET_BPM':
        this.engine.set_bpm(data.bpm);
        break;

      case 'SET_ARP_ENABLED':
        this.engine.set_arp_enabled(data.enabled);
        break;

      case 'SET_ARP_HOLD':
        this.engine.set_arp_hold(data.hold);
        break;

      case 'SET_ARP_MODE':
        this.engine.set_arp_mode(data.mode);
        break;

      case 'SET_ARP_RATE':
        this.engine.set_arp_rate(data.rate);
        break;

      case 'SET_ARP_OCTAVES':
        this.engine.set_arp_octaves(data.octaves);
        break;

      case 'SYNC_ARP':
        this.engine.update_arp_params(
          data.state.enabled,
          data.state.hold,
          data.state.mode,
          data.state.rate,
          data.state.octaves,
          data.bpm ?? 120.0
        );
        break;

      case 'SEQ_PLAY':
        this.engine.seq_play();
        break;

      case 'SEQ_PAUSE':
        this.engine.seq_pause();
        break;

      case 'SEQ_STOP':
        this.engine.seq_stop();
        this.lastStep = -1;
        this.isRecording = false;
        break;

      case 'SEQ_TOGGLE_PLAY': {
        const isPlaying = this.engine.seq_toggle_play();
        this.port.postMessage({ type: 'SEQ_PLAY_STATE', isPlaying });
        break;
      }

      case 'SEQ_TOGGLE_STEP': {
        const active = this.engine.seq_toggle_step(data.padIdx, data.stepIdx);
        const pattern = this.getFlatPatternGrid();
        this.port.postMessage({ type: 'SEQ_PATTERN_UPDATED', pattern, padIdx: data.padIdx, stepIdx: data.stepIdx, active });
        break;
      }

      case 'SEQ_CLEAR_TRACK': {
        this.engine.seq_clear_track(data.padIdx);
        const pattern = this.getFlatPatternGrid();
        this.port.postMessage({ type: 'SEQ_PATTERN_UPDATED', pattern });
        break;
      }

      case 'SEQ_CLEAR_ALL': {
        this.engine.seq_clear_all();
        const pattern = this.getFlatPatternGrid();
        this.port.postMessage({ type: 'SEQ_PATTERN_UPDATED', pattern });
        break;
      }

      case 'SEQ_SET_RESOLUTION':
        this.engine.seq_set_resolution(data.resolution);
        break;

      case 'SEQ_TOGGLE_BANK': {
        const bank = this.engine.seq_toggle_bank();
        const pattern = this.getFlatPatternGrid();
        this.port.postMessage({ type: 'SEQ_BANK_UPDATED', bank, pattern });
        break;
      }

      case 'SEQ_UNDO': {
        const success = this.engine.seq_undo();
        if (success) {
          const pattern = this.getFlatPatternGrid();
          this.port.postMessage({ type: 'SEQ_PATTERN_UPDATED', pattern });
        }
        break;
      }

      case 'SEQ_GET_PATTERN': {
        const pattern = this.getFlatPatternGrid();
        this.port.postMessage({ type: 'SEQ_PATTERN_DATA', pattern });
        break;
      }
    }
  }

  private getFlatPatternGrid(): number[][] {
    const grid: number[][] = Array.from({ length: 8 }, () => new Array(32).fill(0));
    if (!this.engine) return grid;
    const flat = this.engine.seq_get_pattern_flat();
    for (let pad = 0; pad < 8; pad++) {
      for (let step = 0; step < 32; step++) {
        grid[pad][step] = flat[pad * 32 + step];
      }
    }
    return grid;
  }

  public process(_inputs: Float32Array[][], outputs: Float32Array[][], _parameters: Record<string, Float32Array>): boolean {
    const output = outputs[0];
    if (!output || output.length < 2) return true;

    const left = output[0];
    const right = output[1];

    if (!this.engine || !this.soundFontLoaded) {
      left.fill(0);
      right.fill(0);
      return true;
    }

    try {
      this.engine.render(left, right);

      // Si el secuenciador está activo, notificar únicamente cuando cambia el step
      if (this.engine.seq_is_playing()) {
        const currentStep = this.engine.seq_get_current_step();
        if (currentStep !== this.lastStep) {
          this.lastStep = currentStep;
          this.port.postMessage({ type: 'SEQ_STEP_CHANGE', step: currentStep });
        }
      }
    } catch {
      left.fill(0);
      right.fill(0);
    }

    return true;
  }
}

registerProcessor('impact-audio-processor', ImpactAudioProcessor);
