/* tslint:disable */
/* eslint-disable */

export class WasmEngine {
    free(): void;
    [Symbol.dispose](): void;
    get_bpm(): number;
    is_arp_enabled(): boolean;
    load_soundfont(sf2_bytes: Uint8Array): void;
    constructor(sample_rate: number);
    note_off(channel: number, key: number): void;
    note_off_all(immediate: boolean): void;
    note_on(channel: number, key: number, velocity: number): void;
    render(left: Float32Array, right: Float32Array): void;
    seq_clear_all(): void;
    seq_clear_track(pad_idx: number): void;
    seq_get_current_step(): number;
    seq_get_pattern_flat(): Uint8Array;
    seq_is_playing(): boolean;
    seq_pause(): void;
    seq_play(): void;
    seq_record_hit(pad_idx: number, velocity: number, latency_ms: number): number;
    seq_set_resolution(res_str: string): void;
    seq_stop(): void;
    seq_toggle_bank(): string;
    seq_toggle_play(): boolean;
    seq_toggle_step(pad_idx: number, step_idx: number): number;
    seq_undo(): boolean;
    set_arp_enabled(enabled: boolean): void;
    set_arp_hold(hold: boolean): void;
    set_arp_mode(mode_str: string): void;
    set_arp_octaves(octaves: number): void;
    set_arp_rate(rate_str: string): void;
    set_bpm(bpm: number): void;
    set_fx_routing(routing: string): void;
    set_knob(knob_idx: number, val_7bit: number): void;
    set_master_fader(val_7bit: number): void;
    set_mod_wheel(channel: number, value_7bit: number): void;
    set_pitch_bend(channel: number, bend: number): void;
    set_program(channel: number, patch: number, bank: number): void;
    update_arp_params(enabled: boolean, hold: boolean, mode_str: string, rate_str: string, octaves: number, bpm: number): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_wasmengine_free: (a: number, b: number) => void;
    readonly wasmengine_get_bpm: (a: number) => number;
    readonly wasmengine_is_arp_enabled: (a: number) => number;
    readonly wasmengine_load_soundfont: (a: number, b: number, c: number) => [number, number];
    readonly wasmengine_new: (a: number) => number;
    readonly wasmengine_note_off: (a: number, b: number, c: number) => void;
    readonly wasmengine_note_off_all: (a: number, b: number) => void;
    readonly wasmengine_note_on: (a: number, b: number, c: number, d: number) => void;
    readonly wasmengine_render: (a: number, b: number, c: number, d: any, e: number, f: number, g: any) => void;
    readonly wasmengine_seq_clear_all: (a: number) => void;
    readonly wasmengine_seq_clear_track: (a: number, b: number) => void;
    readonly wasmengine_seq_get_current_step: (a: number) => number;
    readonly wasmengine_seq_get_pattern_flat: (a: number) => [number, number];
    readonly wasmengine_seq_is_playing: (a: number) => number;
    readonly wasmengine_seq_pause: (a: number) => void;
    readonly wasmengine_seq_play: (a: number) => void;
    readonly wasmengine_seq_record_hit: (a: number, b: number, c: number, d: number) => number;
    readonly wasmengine_seq_set_resolution: (a: number, b: number, c: number) => void;
    readonly wasmengine_seq_stop: (a: number) => void;
    readonly wasmengine_seq_toggle_bank: (a: number) => [number, number];
    readonly wasmengine_seq_toggle_play: (a: number) => number;
    readonly wasmengine_seq_toggle_step: (a: number, b: number, c: number) => number;
    readonly wasmengine_seq_undo: (a: number) => number;
    readonly wasmengine_set_arp_enabled: (a: number, b: number) => void;
    readonly wasmengine_set_arp_hold: (a: number, b: number) => void;
    readonly wasmengine_set_arp_mode: (a: number, b: number, c: number) => void;
    readonly wasmengine_set_arp_octaves: (a: number, b: number) => void;
    readonly wasmengine_set_arp_rate: (a: number, b: number, c: number) => void;
    readonly wasmengine_set_bpm: (a: number, b: number) => void;
    readonly wasmengine_set_fx_routing: (a: number, b: number, c: number) => void;
    readonly wasmengine_set_knob: (a: number, b: number, c: number) => void;
    readonly wasmengine_set_master_fader: (a: number, b: number) => void;
    readonly wasmengine_set_mod_wheel: (a: number, b: number, c: number) => void;
    readonly wasmengine_set_pitch_bend: (a: number, b: number, c: number) => void;
    readonly wasmengine_set_program: (a: number, b: number, c: number, d: number) => void;
    readonly wasmengine_update_arp_params: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
