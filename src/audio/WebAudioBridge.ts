import workletUrl from './worklet/ImpactAudioProcessor.ts?worker&url';
import wasmUrl from '../wasm/impact_wasm_bg.wasm?url';
import { StepResolution } from '../types/sampler';

export class WebAudioBridge {
  private static instance: WebAudioBridge;
  private ctx: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private currentSoundFontName: string = 'Ninguno';
  private hasLoggedProcessError = false;

  // Cache optimista en hilo principal para respuesta sincrónica sin retardo de round-trip
  private cachedStep: number = 0;
  private cachedIsPlaying: boolean = false;
  private cachedIsRecording: boolean = false;
  private cachedBank: 'a' | 'b' = 'a';
  private cachedPattern: number[][] = Array.from({ length: 8 }, () => new Array(32).fill(0));
  private stepListeners: Set<(step: number) => void> = new Set();
  private patternListeners: Set<(pattern: number[][]) => void> = new Set();
  private soundFontLoadResolvers: Map<string, { resolve: () => void; reject: (err: Error) => void }> = new Map();

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

        // 1. Pre-compilar el binario WebAssembly en el hilo principal
        const wasmResponse = await fetch(wasmUrl);
        const wasmBytes = await wasmResponse.arrayBuffer();
        const wasmModule = await WebAssembly.compile(wasmBytes);

        // 2. Cargar el módulo AudioWorkletProcessor compilado por Vite
        await this.ctx.audioWorklet.addModule(workletUrl);

        // 3. Crear el AudioWorkletNode pasando el WebAssembly.Module compilado
        this.workletNode = new AudioWorkletNode(this.ctx, 'impact-audio-processor', {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [2],
          processorOptions: {
            wasmModule,
          },
        });

        // Inicialización de respaldo en caso de que processorOptions no clone WebAssembly.Module
        this.workletNode.port.postMessage({ type: 'INIT_WASM', wasmModule });

        // 4. Configurar receptor de mensajes de alta velocidad desde el hilo de audio
        this.workletNode.port.onmessage = (event: MessageEvent) => {
          const data = event.data;
          if (!data) return;

          switch (data.type) {
            case 'SEQ_STEP_CHANGE':
              this.cachedStep = data.step;
              this.stepListeners.forEach((listener) => {
                try {
                  listener(data.step);
                } catch {
                  // Prevenir que errores en UI interrumpan el listener
                }
              });
              break;

            case 'SEQ_PLAY_STATE':
              this.cachedIsPlaying = data.isPlaying;
              break;

            case 'SEQ_PATTERN_UPDATED':
              if (data.pattern) {
                this.cachedPattern = data.pattern;
                this.patternListeners.forEach((listener) => {
                  try {
                    listener(this.cachedPattern);
                  } catch {
                    // Prevenir que errores en UI interrumpan otros listeners
                  }
                });
              }
              break;

            case 'SEQ_BANK_UPDATED':
              if (data.bank) {
                this.cachedBank = data.bank;
              }
              if (data.pattern) {
                this.cachedPattern = data.pattern;
              }
              break;

            case 'SOUNDFONT_LOADED': {
              const resolver = data.loadId ? this.soundFontLoadResolvers.get(data.loadId) : null;
              if (resolver) {
                this.soundFontLoadResolvers.delete(data.loadId);
                this.currentSoundFontName = data.name;
                resolver.resolve();
              } else if (this.soundFontLoadResolvers.size > 0) {
                const entry = this.soundFontLoadResolvers.entries().next().value;
                if (entry) {
                  this.soundFontLoadResolvers.delete(entry[0]);
                  this.currentSoundFontName = data.name;
                  entry[1].resolve();
                }
              }
              break;
            }

            case 'SOUNDFONT_ERROR': {
              const resolver = data.loadId ? this.soundFontLoadResolvers.get(data.loadId) : null;
              if (resolver) {
                this.soundFontLoadResolvers.delete(data.loadId);
                resolver.reject(new Error(data.error));
              } else if (this.soundFontLoadResolvers.size > 0) {
                const entry = this.soundFontLoadResolvers.entries().next().value;
                if (entry) {
                  this.soundFontLoadResolvers.delete(entry[0]);
                  entry[1].reject(new Error(data.error));
                }
              }
              break;
            }

            case 'WASM_ERROR':
              if (!this.hasLoggedProcessError) {
                console.error('Error en AudioWorklet WASM:', data.error);
                this.hasLoggedProcessError = true;
              }
              break;
          }
        };

        // 5. Conectar el nodo de AudioWorklet directamente a los altavoces
        this.workletNode.connect(this.ctx.destination);
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

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  public async loadSoundFont(buffer: ArrayBuffer, name: string): Promise<void> {
    await this.initialize();
    if (!this.workletNode) throw new Error('Motor de audio no inicializado');

    const loadId = `${Date.now()}_${Math.random()}`;
    return new Promise<void>((resolve, reject) => {
      this.soundFontLoadResolvers.set(loadId, { resolve, reject });
      // Enviar el buffer al AudioWorklet (sin transferirlo para preservar almacenamiento IndexedDB)
      this.workletNode!.port.postMessage({
        type: 'LOAD_SOUNDFONT',
        loadId,
        buffer,
        name,
      });
      this.hasLoggedProcessError = false;
    });
  }

  public noteOn(key: number, velocity: number = 127, channel: number = 0): void {
    if (!this.workletNode || !this.currentSoundFontName || this.currentSoundFontName === 'Ninguno') return;
    this.resumeAudio();
    this.workletNode.port.postMessage({ type: 'NOTE_ON', key, velocity, channel });
  }

  public noteOff(key: number, channel: number = 0): void {
    if (!this.workletNode || !this.currentSoundFontName || this.currentSoundFontName === 'Ninguno') return;
    this.workletNode.port.postMessage({ type: 'NOTE_OFF', key, channel });
  }

  public noteOffAll(immediate: boolean = false): void {
    if (!this.workletNode) return;
    this.workletNode.port.postMessage({ type: 'NOTE_OFF_ALL', immediate });
  }

  public setKnob(knobIndex: number, value7bit: number): void {
    if (!this.workletNode) return;
    this.workletNode.port.postMessage({ type: 'SET_KNOB', index: knobIndex, value: value7bit });
  }

  public setMasterFader(value7bit: number): void {
    if (!this.workletNode) return;
    this.workletNode.port.postMessage({ type: 'SET_MASTER_FADER', value: value7bit });
  }

  public setFxRouting(routing: string): void {
    if (!this.workletNode) return;
    this.workletNode.port.postMessage({ type: 'SET_FX_ROUTING', routing });
  }

  public setPitchBend(bend: number, channel: number = 0): void {
    if (!this.workletNode) return;
    this.workletNode.port.postMessage({ type: 'SET_PITCH_BEND', bend, channel });
  }

  public setModWheel(value7bit: number, channel: number = 0): void {
    if (!this.workletNode) return;
    this.workletNode.port.postMessage({ type: 'SET_MOD_WHEEL', value: value7bit, channel });
  }

  public setProgram(patch: number, bank: number = 0, channel: number = 0): void {
    if (!this.workletNode) return;
    this.workletNode.port.postMessage({ type: 'SET_PROGRAM', patch, bank, channel });
  }

  public setBpm(bpm: number): void {
    if (!this.workletNode) return;
    this.workletNode.port.postMessage({ type: 'SET_BPM', bpm });
  }

  public setArpEnabled(enabled: boolean): void {
    if (!this.workletNode) return;
    this.workletNode.port.postMessage({ type: 'SET_ARP_ENABLED', enabled });
  }

  public setArpHold(hold: boolean): void {
    if (!this.workletNode) return;
    this.workletNode.port.postMessage({ type: 'SET_ARP_HOLD', hold });
  }

  public setArpMode(mode: string): void {
    if (!this.workletNode) return;
    this.workletNode.port.postMessage({ type: 'SET_ARP_MODE', mode });
  }

  public setArpRate(rate: string): void {
    if (!this.workletNode) return;
    this.workletNode.port.postMessage({ type: 'SET_ARP_RATE', rate });
  }

  public setArpOctaves(octaves: number): void {
    if (!this.workletNode) return;
    this.workletNode.port.postMessage({ type: 'SET_ARP_OCTAVES', octaves });
  }

  public syncArpState(state: { enabled: boolean; hold: boolean; mode: string; rate: string; octaves: number }, bpm?: number): void {
    if (!this.workletNode) return;
    this.workletNode.port.postMessage({ type: 'SYNC_ARP', state, bpm });
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

  // === Métodos del Secuenciador Rítmico ===

  public seqPlay(): void {
    this.cachedIsPlaying = true;
    this.workletNode?.port.postMessage({ type: 'SEQ_PLAY' });
  }

  public seqPause(): void {
    this.cachedIsPlaying = false;
    this.workletNode?.port.postMessage({ type: 'SEQ_PAUSE' });
  }

  public seqStop(): void {
    this.cachedIsPlaying = false;
    this.cachedIsRecording = false;
    this.cachedStep = 0;
    this.workletNode?.port.postMessage({ type: 'SEQ_STOP' });
  }

  public seqSetRecording(recording: boolean): void {
    this.cachedIsRecording = recording;
    this.workletNode?.port.postMessage({ type: 'SET_RECORDING', recording });
  }

  public seqIsRecording(): boolean {
    return this.cachedIsRecording;
  }

  public seqTogglePlay(): boolean {
    this.cachedIsPlaying = !this.cachedIsPlaying;
    this.workletNode?.port.postMessage({ type: 'SEQ_TOGGLE_PLAY' });
    return this.cachedIsPlaying;
  }

  public seqIsPlaying(): boolean {
    return this.cachedIsPlaying;
  }

  public seqGetCurrentStep(): number {
    return this.cachedStep;
  }

  public seqToggleStep(padIdx: number, stepIdx: number): number {
    if (padIdx >= 0 && padIdx < 8 && stepIdx >= 0 && stepIdx < 32) {
      const active = this.cachedPattern[padIdx][stepIdx] ? 0 : 100;
      this.cachedPattern[padIdx][stepIdx] = active;
      this.workletNode?.port.postMessage({ type: 'SEQ_TOGGLE_STEP', padIdx, stepIdx });
      return active;
    }
    return 0;
  }

  public seqClearTrack(padIdx: number): void {
    if (padIdx >= 0 && padIdx < 8) {
      this.cachedPattern[padIdx].fill(0);
      this.workletNode?.port.postMessage({ type: 'SEQ_CLEAR_TRACK', padIdx });
    }
  }

  public seqClearAll(): void {
    for (let i = 0; i < 8; i++) {
      this.cachedPattern[i].fill(0);
    }
    this.workletNode?.port.postMessage({ type: 'SEQ_CLEAR_ALL' });
  }

  public seqSetResolution(res: StepResolution): void {
    this.workletNode?.port.postMessage({ type: 'SEQ_SET_RESOLUTION', resolution: res });
  }

  public seqToggleBank(): string {
    this.cachedBank = this.cachedBank === 'a' ? 'b' : 'a';
    this.workletNode?.port.postMessage({ type: 'SEQ_TOGGLE_BANK' });
    return this.cachedBank;
  }

  public seqUndo(): boolean {
    this.workletNode?.port.postMessage({ type: 'SEQ_UNDO' });
    return true;
  }

  public seqGetPattern(): number[][] {
    return this.cachedPattern.map((row) => [...row]);
  }

  public onStepChange(callback: (step: number) => void): () => void {
    this.stepListeners.add(callback);
    return () => this.stepListeners.delete(callback);
  }

  public onPatternChange(callback: (pattern: number[][]) => void): () => void {
    this.patternListeners.add(callback);
    return () => this.patternListeners.delete(callback);
  }

  public getSoundFontName(): string {
    return this.currentSoundFontName;
  }

  public getSampleRate(): number {
    return this.ctx ? this.ctx.sampleRate : 48000;
  }

  public isReady(): boolean {
    return this.isInitialized && this.workletNode !== null;
  }
}

export const audioBridge = WebAudioBridge.getInstance();
