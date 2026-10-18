import initWasm, { WasmEngine } from '../wasm/impact_wasm';
import { StepResolution } from '../types/sampler';

export class WebAudioBridge {
  private static instance: WebAudioBridge;
  private ctx: AudioContext | null = null;
  private engine: WasmEngine | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private currentSoundFontName: string = 'Ninguno';
  private hasLoggedProcessError = false;

  private constructor() {}

  public static getInstance(): WebAudioBridge {
    if (!WebAudioBridge.instance) {
      WebAudioBridge.instance = new WebAudioBridge();
    }
    return WebAudioBridge.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        // Inicializar WebAudio AudioContext
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioContextClass({ latencyHint: 'interactive' });

        // Inicializar módulo WebAssembly (Singleton)
        await initWasm();

        // Crear instancia del motor de audio en Rust
        this.engine = new WasmEngine(this.ctx.sampleRate);

        // Conectar el nodo de procesamiento de audio en tiempo real (buffer de 512 muestras ~10ms)
        this.scriptNode = this.ctx.createScriptProcessor(512, 0, 2);
        this.scriptNode.onaudioprocess = (e) => {
          const left = e.outputBuffer.getChannelData(0);
          const right = e.outputBuffer.getChannelData(1);

          // Si el motor no está instanciado o no hay SoundFont cargado, emitir silencio limpio
          if (!this.engine || !this.currentSoundFontName || this.currentSoundFontName === 'Ninguno') {
            left.fill(0);
            right.fill(0);
            return;
          }

          try {
            this.engine.render(left, right);
          } catch (err) {
            left.fill(0);
            right.fill(0);
            if (!this.hasLoggedProcessError) {
              console.error('Error no fatal en render de WebAssembly:', err);
              this.hasLoggedProcessError = true;
            }
          }
        };

        this.scriptNode.connect(this.ctx.destination);
        this.isInitialized = true;
      } catch (err) {
        this.initializationPromise = null;
        this.isInitialized = false;
        throw err;
      }
    })();

    return this.initializationPromise;
  }

  public async resumeAudio(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public async loadSoundFont(buffer: ArrayBuffer, name: string): Promise<void> {
    await this.initialize();
    if (!this.engine) throw new Error('Motor de audio no inicializado');

    const bytes = new Uint8Array(buffer);
    this.engine.load_soundfont(bytes);
    this.currentSoundFontName = name;
    this.hasLoggedProcessError = false;
  }

  public noteOn(key: number, velocity: number = 127, channel: number = 0): void {
    if (!this.engine || !this.currentSoundFontName || this.currentSoundFontName === 'Ninguno') return;
    this.resumeAudio();
    this.engine.note_on(channel, key, velocity);
  }

  public noteOff(key: number, channel: number = 0): void {
    if (!this.engine || !this.currentSoundFontName || this.currentSoundFontName === 'Ninguno') return;
    this.engine.note_off(channel, key);
  }

  public noteOffAll(immediate: boolean = false): void {
    if (!this.engine) return;
    this.engine.note_off_all(immediate);
  }

  public setKnob(knobIndex: number, value7bit: number): void {
    if (!this.engine) return;
    this.engine.set_knob(knobIndex, value7bit);
  }

  public setMasterFader(value7bit: number): void {
    if (!this.engine) return;
    this.engine.set_master_fader(value7bit);
  }

  public setFxRouting(routing: string): void {
    if (!this.engine) return;
    this.engine.set_fx_routing(routing);
  }

  public setPitchBend(bend: number, channel: number = 0): void {
    if (!this.engine) return;
    this.engine.set_pitch_bend(channel, bend);
  }

  public setModWheel(value7bit: number, channel: number = 0): void {
    if (!this.engine) return;
    this.engine.set_mod_wheel(channel, value7bit);
  }

  public setProgram(patch: number, bank: number = 0, channel: number = 0): void {
    if (!this.engine) return;
    this.engine.set_program(channel, patch, bank);
  }

  public setBpm(bpm: number): void {
    if (!this.engine) return;
    this.engine.set_bpm(bpm);
  }

  public setArpEnabled(enabled: boolean): void {
    if (!this.engine) return;
    this.engine.set_arp_enabled(enabled);
  }

  public setArpHold(hold: boolean): void {
    if (!this.engine) return;
    this.engine.set_arp_hold(hold);
  }

  public setArpMode(mode: string): void {
    if (!this.engine) return;
    this.engine.set_arp_mode(mode);
  }

  public setArpRate(rate: string): void {
    if (!this.engine) return;
    this.engine.set_arp_rate(rate);
  }

  public setArpOctaves(octaves: number): void {
    if (!this.engine) return;
    this.engine.set_arp_octaves(octaves);
  }

  public syncArpState(state: { enabled: boolean; hold: boolean; mode: string; rate: string; octaves: number }, bpm?: number): void {
    if (!this.engine) return;
    this.engine.update_arp_params(state.enabled, state.hold, state.mode, state.rate, state.octaves, bpm ?? 120.0);
  }

  public playMetronomeClick(accent: boolean = false): void {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(accent ? 1600 : 1000, this.ctx.currentTime);

      gain.gain.setValueAtTime(accent ? 0.35 : 0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.035);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {
      // Ignorar errores transitorios si el contexto se suspende
    }
  }

  // === Métodos del Secuenciador Rítmico (Bloque 4) ===

  public seqPlay(): void {
    if (!this.engine) return;
    this.engine.seq_play();
  }

  public seqPause(): void {
    if (!this.engine) return;
    this.engine.seq_pause();
  }

  public seqStop(): void {
    if (!this.engine) return;
    this.engine.seq_stop();
  }

  public seqTogglePlay(): boolean {
    if (!this.engine) return false;
    return this.engine.seq_toggle_play();
  }

  public seqIsPlaying(): boolean {
    if (!this.engine) return false;
    return this.engine.seq_is_playing();
  }

  public seqGetCurrentStep(): number {
    if (!this.engine) return 0;
    return this.engine.seq_get_current_step();
  }

  public seqToggleStep(padIdx: number, stepIdx: number): number {
    if (!this.engine) return 0;
    return this.engine.seq_toggle_step(padIdx, stepIdx);
  }

  public seqClearTrack(padIdx: number): void {
    if (!this.engine) return;
    this.engine.seq_clear_track(padIdx);
  }

  public seqClearAll(): void {
    if (!this.engine) return;
    this.engine.seq_clear_all();
  }

  public seqSetResolution(res: StepResolution): void {
    if (!this.engine) return;
    this.engine.seq_set_resolution(res);
  }

  public seqToggleBank(): string {
    if (!this.engine) return 'a';
    return this.engine.seq_toggle_bank();
  }

  public seqUndo(): boolean {
    if (!this.engine) return false;
    return this.engine.seq_undo();
  }

  public seqGetPattern(): number[][] {
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

  public getSoundFontName(): string {
    return this.currentSoundFontName;
  }

  public getSampleRate(): number {
    return this.ctx ? this.ctx.sampleRate : 48000;
  }

  public isReady(): boolean {
    return this.isInitialized && this.engine !== null;
  }
}

export const audioBridge = WebAudioBridge.getInstance();
