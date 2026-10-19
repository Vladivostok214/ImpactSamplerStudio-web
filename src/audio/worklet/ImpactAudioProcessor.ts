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
  private drumEngine: WasmEngine | null = null;
  private soundFontLoaded = false;
  private drumLoaded = false;
  private lastStep = -1;
  private isRecording = false;
  private drumLeft = new Float32Array(128);
  private drumRight = new Float32Array(128);

  constructor(options?: { processorOptions?: { wasmModule?: WebAssembly.Module } }) {
    super();

    // 1. Inicialización sincrónica si el WebAssembly.Module pre-compilado viene en processorOptions
    if (options?.processorOptions?.wasmModule) {
      try {
        initSync({ module: options.processorOptions.wasmModule });
        this.engine = new WasmEngine(sampleRate);
        this.drumEngine = new WasmEngine(sampleRate);
      } catch (err: any) {
        this.port.postMessage({ type: 'WASM_ERROR', error: err?.message || String(err) });
      }
    }

    // 2. Canal de mensajes bidireccional de baja latencia con el hilo principal
    this.port.onmessage = (event) => this.handleMessage(event.data);
  }

  private getSeqEngine(): WasmEngine | null {
    return this.drumLoaded && this.drumEngine ? this.drumEngine : this.engine;
  }

  private handleMessage(data: any): void {
    if (!data) return;

    // Inicialización de respaldo si el módulo WASM se envía post-construcción
    if (data.type === 'INIT_WASM') {
      try {
        if (!this.engine) {
          initSync({ module: data.wasmModule });
          this.engine = new WasmEngine(sampleRate);
          this.drumEngine = new WasmEngine(sampleRate);
        }
        this.port.postMessage({ type: 'WASM_READY' });
      } catch (err: any) {
        this.port.postMessage({ type: 'WASM_ERROR', error: err?.message || String(err) });
      }
      return;
    }

    if (!this.engine) return;
    const seqEngine = this.getSeqEngine()!;

    switch (data.type) {
      case 'SET_RECORDING':
        this.isRecording = Boolean(data.recording);
        break;

      case 'NOTE_ON': {
        const channel = data.channel ?? 0;
        const key = data.key;
        const velocity = data.velocity ?? 100;

        if (data.target === 'drum' && this.drumLoaded && this.drumEngine) {
          this.drumEngine.note_on(channel, key, velocity);
        } else {
          this.engine.note_on(channel, key, velocity);
        }

        // Overdub en tiempo real si el secuenciador está reproduciendo y en modo grabación
        if (this.isRecording && seqEngine.seq_is_playing()) {
          const padIdx = DRUM_NOTE_TO_PAD[key];
          if (padIdx !== undefined) {
            const currentStep = seqEngine.seq_get_current_step();
            const pattern = this.getFlatPatternGrid(seqEngine);
            // Si el paso no está activo, activarlo y enviar actualización del patrón
            if (pattern[padIdx][currentStep] === 0) {
              const active = seqEngine.seq_toggle_step(padIdx, currentStep);
              const updatedPattern = this.getFlatPatternGrid(seqEngine);
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
        if (data.target === 'drum' && this.drumLoaded && this.drumEngine) {
          this.drumEngine.note_off(data.channel ?? 0, data.key);
        } else {
          this.engine.note_off(data.channel ?? 0, data.key);
        }
        break;

      case 'NOTE_OFF_ALL':
        this.engine.note_off_all(data.immediate ?? false);
        this.drumEngine?.note_off_all(data.immediate ?? false);
        break;

      case 'LOAD_SOUNDFONT':
        try {
          const bytes = new Uint8Array(data.buffer);
          if (data.target === 'drum' && this.drumEngine) {
            this.drumEngine.load_soundfont(bytes);
            this.drumLoaded = true;
          } else {
            this.engine.load_soundfont(bytes);
            this.soundFontLoaded = true;
            if (!this.drumLoaded && this.drumEngine && String(data.name || '').toLowerCase().includes('rx7')) {
              this.drumEngine.load_soundfont(bytes);
              this.drumLoaded = true;
            }
          }
          this.port.postMessage({ type: 'SOUNDFONT_LOADED', loadId: data.loadId, name: data.name, target: data.target });
        } catch (err: any) {
          this.port.postMessage({ type: 'SOUNDFONT_ERROR', loadId: data.loadId, error: err?.message || String(err) });
        }
        break;

      case 'SET_KNOB':
        this.engine.set_knob(data.index, data.value);
        this.drumEngine?.set_knob(data.index, data.value);
        break;

      case 'SET_MASTER_FADER':
        this.engine.set_master_fader(data.value);
        this.drumEngine?.set_master_fader(data.value);
        break;

      case 'SET_FX_ROUTING': {
        const r = String(data.routing || 'off');
        const keysFx = r === 'keys' || r === 'both' ? 'keys' : 'off';
        const padsFx = r === 'pads' || r === 'both' ? 'pads' : 'off';
        this.engine.set_fx_routing(keysFx);
        this.drumEngine?.set_fx_routing(padsFx);
        break;
      }

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
        this.drumEngine?.set_bpm(data.bpm);
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
        if (data.bpm !== undefined) {
          this.drumEngine?.set_bpm(data.bpm);
        }
        break;

      case 'SEQ_PLAY':
        seqEngine.seq_play();
        break;

      case 'SEQ_PAUSE':
        seqEngine.seq_pause();
        break;

      case 'SEQ_STOP':
        seqEngine.seq_stop();
        this.lastStep = -1;
        this.isRecording = false;
        break;

      case 'SEQ_TOGGLE_PLAY': {
        const isPlaying = seqEngine.seq_toggle_play();
        this.port.postMessage({ type: 'SEQ_PLAY_STATE', isPlaying });
        break;
      }

      case 'SEQ_TOGGLE_STEP': {
        const active = seqEngine.seq_toggle_step(data.padIdx, data.stepIdx);
        const pattern = this.getFlatPatternGrid(seqEngine);
        this.port.postMessage({ type: 'SEQ_PATTERN_UPDATED', pattern, padIdx: data.padIdx, stepIdx: data.stepIdx, active });
        break;
      }

      case 'SEQ_CLEAR_TRACK': {
        seqEngine.seq_clear_track(data.padIdx);
        const pattern = this.getFlatPatternGrid(seqEngine);
        this.port.postMessage({ type: 'SEQ_PATTERN_UPDATED', pattern });
        break;
      }

      case 'SEQ_CLEAR_ALL': {
        seqEngine.seq_clear_all();
        const pattern = this.getFlatPatternGrid(seqEngine);
        this.port.postMessage({ type: 'SEQ_PATTERN_UPDATED', pattern });
        break;
      }

      case 'SEQ_SET_RESOLUTION':
        seqEngine.seq_set_resolution(data.resolution);
        break;

      case 'SEQ_TOGGLE_BANK': {
        const bank = seqEngine.seq_toggle_bank();
        const pattern = this.getFlatPatternGrid(seqEngine);
        this.port.postMessage({ type: 'SEQ_BANK_UPDATED', bank, pattern });
        break;
      }

      case 'SEQ_UNDO': {
        const success = seqEngine.seq_undo();
        if (success) {
          const pattern = this.getFlatPatternGrid(seqEngine);
          this.port.postMessage({ type: 'SEQ_PATTERN_UPDATED', pattern });
        }
        break;
      }

      case 'SEQ_GET_PATTERN': {
        const pattern = this.getFlatPatternGrid(seqEngine);
        this.port.postMessage({ type: 'SEQ_PATTERN_DATA', pattern });
        break;
      }
    }
  }

  private getFlatPatternGrid(targetEngine: WasmEngine | null = this.getSeqEngine()): number[][] {
    const grid: number[][] = Array.from({ length: 8 }, () => new Array(32).fill(0));
    if (!targetEngine) return grid;
    const flat = targetEngine.seq_get_pattern_flat();
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
    const len = left.length;

    if (!this.engine || (!this.soundFontLoaded && !this.drumLoaded)) {
      left.fill(0);
      right.fill(0);
      return true;
    }

    try {
      // 1. Renderizar bus melódico (KEYS)
      if (this.soundFontLoaded) {
        this.engine.render(left, right);
      } else {
        left.fill(0);
        right.fill(0);
      }

      // 2. Renderizar y mezclar bus de percusión / secuenciador (PADS / SEQ) sin asignaciones de memoria
      if (this.drumLoaded && this.drumEngine) {
        if (this.drumLeft.length < len) {
          this.drumLeft = new Float32Array(len);
          this.drumRight = new Float32Array(len);
        }
        const dLeft = this.drumLeft.subarray(0, len);
        const dRight = this.drumRight.subarray(0, len);
        this.drumEngine.render(dLeft, dRight);

        for (let i = 0; i < len; i++) {
          left[i] += dLeft[i];
          right[i] += dRight[i];
        }
      }

      // 3. Si el secuenciador está activo, notificar únicamente cuando cambia el step
      const seqEngine = this.getSeqEngine();
      if (seqEngine && seqEngine.seq_is_playing()) {
        const currentStep = seqEngine.seq_get_current_step();
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
