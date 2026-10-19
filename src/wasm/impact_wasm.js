/* @ts-self-types="./impact_wasm.d.ts" */

export class WasmEngine {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmEngineFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmengine_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get_bpm() {
        const ret = wasm.wasmengine_get_bpm(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {boolean}
     */
    is_arp_enabled() {
        const ret = wasm.wasmengine_is_arp_enabled(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {Uint8Array} sf2_bytes
     */
    load_soundfont(sf2_bytes) {
        const ptr0 = passArray8ToWasm0(sf2_bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmengine_load_soundfont(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {number} sample_rate
     */
    constructor(sample_rate) {
        const ret = wasm.wasmengine_new(sample_rate);
        this.__wbg_ptr = ret;
        WasmEngineFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} channel
     * @param {number} key
     */
    note_off(channel, key) {
        wasm.wasmengine_note_off(this.__wbg_ptr, channel, key);
    }
    /**
     * @param {boolean} immediate
     */
    note_off_all(immediate) {
        wasm.wasmengine_note_off_all(this.__wbg_ptr, immediate);
    }
    /**
     * @param {number} channel
     * @param {number} key
     * @param {number} velocity
     */
    note_on(channel, key, velocity) {
        wasm.wasmengine_note_on(this.__wbg_ptr, channel, key, velocity);
    }
    /**
     * @param {number} pad_idx
     * @param {number} key
     */
    pad_note_off(pad_idx, key) {
        wasm.wasmengine_pad_note_off(this.__wbg_ptr, pad_idx, key);
    }
    /**
     * @param {number} pad_idx
     * @param {number} key
     * @param {number} velocity
     */
    pad_note_on(pad_idx, key, velocity) {
        wasm.wasmengine_pad_note_on(this.__wbg_ptr, pad_idx, key, velocity);
    }
    /**
     * @param {Float32Array} left
     * @param {Float32Array} right
     */
    render(left, right) {
        var ptr0 = passArrayF32ToWasm0(left, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passArrayF32ToWasm0(right, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        wasm.wasmengine_render(this.__wbg_ptr, ptr0, len0, left, ptr1, len1, right);
    }
    seq_clear_all() {
        wasm.wasmengine_seq_clear_all(this.__wbg_ptr);
    }
    /**
     * @param {number} pad_idx
     */
    seq_clear_track(pad_idx) {
        wasm.wasmengine_seq_clear_track(this.__wbg_ptr, pad_idx);
    }
    /**
     * @returns {number}
     */
    seq_get_current_step() {
        const ret = wasm.wasmengine_seq_get_current_step(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Uint8Array}
     */
    seq_get_pattern_flat() {
        const ret = wasm.wasmengine_seq_get_pattern_flat(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {boolean}
     */
    seq_is_playing() {
        const ret = wasm.wasmengine_seq_is_playing(this.__wbg_ptr);
        return ret !== 0;
    }
    seq_pause() {
        wasm.wasmengine_seq_pause(this.__wbg_ptr);
    }
    seq_play() {
        wasm.wasmengine_seq_play(this.__wbg_ptr);
    }
    /**
     * @param {number} pad_idx
     * @param {number} velocity
     * @param {number} latency_ms
     * @returns {number}
     */
    seq_record_hit(pad_idx, velocity, latency_ms) {
        const ret = wasm.wasmengine_seq_record_hit(this.__wbg_ptr, pad_idx, velocity, latency_ms);
        return ret;
    }
    /**
     * @param {string} res_str
     */
    seq_set_resolution(res_str) {
        const ptr0 = passStringToWasm0(res_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmengine_seq_set_resolution(this.__wbg_ptr, ptr0, len0);
    }
    seq_stop() {
        wasm.wasmengine_seq_stop(this.__wbg_ptr);
    }
    /**
     * @returns {string}
     */
    seq_toggle_bank() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmengine_seq_toggle_bank(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {boolean}
     */
    seq_toggle_play() {
        const ret = wasm.wasmengine_seq_toggle_play(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {number} pad_idx
     * @param {number} step_idx
     * @returns {number}
     */
    seq_toggle_step(pad_idx, step_idx) {
        const ret = wasm.wasmengine_seq_toggle_step(this.__wbg_ptr, pad_idx, step_idx);
        return ret;
    }
    /**
     * @returns {boolean}
     */
    seq_undo() {
        const ret = wasm.wasmengine_seq_undo(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} enabled
     */
    set_arp_enabled(enabled) {
        wasm.wasmengine_set_arp_enabled(this.__wbg_ptr, enabled);
    }
    /**
     * @param {boolean} hold
     */
    set_arp_hold(hold) {
        wasm.wasmengine_set_arp_hold(this.__wbg_ptr, hold);
    }
    /**
     * @param {string} mode_str
     */
    set_arp_mode(mode_str) {
        const ptr0 = passStringToWasm0(mode_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmengine_set_arp_mode(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {number} octaves
     */
    set_arp_octaves(octaves) {
        wasm.wasmengine_set_arp_octaves(this.__wbg_ptr, octaves);
    }
    /**
     * @param {string} rate_str
     */
    set_arp_rate(rate_str) {
        const ptr0 = passStringToWasm0(rate_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmengine_set_arp_rate(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {number} bpm
     */
    set_bpm(bpm) {
        wasm.wasmengine_set_bpm(this.__wbg_ptr, bpm);
    }
    /**
     * @param {string} routing
     */
    set_fx_routing(routing) {
        const ptr0 = passStringToWasm0(routing, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmengine_set_fx_routing(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {number} knob_idx
     * @param {number} val_7bit
     */
    set_knob(knob_idx, val_7bit) {
        wasm.wasmengine_set_knob(this.__wbg_ptr, knob_idx, val_7bit);
    }
    /**
     * @param {number} val_7bit
     */
    set_master_fader(val_7bit) {
        wasm.wasmengine_set_master_fader(this.__wbg_ptr, val_7bit);
    }
    /**
     * @param {number} channel
     * @param {number} value_7bit
     */
    set_mod_wheel(channel, value_7bit) {
        wasm.wasmengine_set_mod_wheel(this.__wbg_ptr, channel, value_7bit);
    }
    /**
     * @param {number} pad_idx
     * @param {number} val_7bit
     */
    set_pad_fader(pad_idx, val_7bit) {
        wasm.wasmengine_set_pad_fader(this.__wbg_ptr, pad_idx, val_7bit);
    }
    /**
     * @param {number} channel
     * @param {number} bend
     */
    set_pitch_bend(channel, bend) {
        wasm.wasmengine_set_pitch_bend(this.__wbg_ptr, channel, bend);
    }
    /**
     * @param {number} channel
     * @param {number} patch
     * @param {number} bank
     */
    set_program(channel, patch, bank) {
        wasm.wasmengine_set_program(this.__wbg_ptr, channel, patch, bank);
    }
    /**
     * @param {boolean} enabled
     * @param {boolean} hold
     * @param {string} mode_str
     * @param {string} rate_str
     * @param {number} octaves
     * @param {number} bpm
     */
    update_arp_params(enabled, hold, mode_str, rate_str, octaves, bpm) {
        const ptr0 = passStringToWasm0(mode_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(rate_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.wasmengine_update_arp_params(this.__wbg_ptr, enabled, hold, ptr0, len0, ptr1, len1, octaves, bpm);
    }
}
if (Symbol.dispose) WasmEngine.prototype[Symbol.dispose] = WasmEngine.prototype.free;
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_copy_to_typed_array_88899a52af046901: function(arg0, arg1, arg2) {
            new Uint8Array(arg2.buffer, arg2.byteOffset, arg2.byteLength).set(getArrayU8FromWasm0(arg0, arg1));
        },
        __wbg___wbindgen_throw_41e9ee4f547fc59a: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_generic_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./impact_wasm_bg.js": import0,
    };
}

const WasmEngineFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmengine_free(ptr, 1));

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedFloat32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('impact_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
