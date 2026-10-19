// Polyfills esenciales para AudioWorkletGlobalScope en navegadores basados en Chromium/Chrome
// Donde TextDecoder y TextEncoder no están expuestos en el hilo de audio por diseño de Chrome.

const g = typeof globalThis !== 'undefined' ? globalThis : self;

if (typeof (g as any).TextDecoder === 'undefined') {
  (g as any).TextDecoder = class TextDecoderPolyfill {
    decode(bytes?: Uint8Array): string {
      if (!bytes || bytes.length === 0) return '';
      let str = '';
      for (let i = 0; i < bytes.length; ) {
        const b = bytes[i++];
        if (b < 0x80) {
          str += String.fromCharCode(b);
        } else if (b > 0xbf && b < 0xe0) {
          str += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i++] & 0x3f));
        } else if (b > 0xdf && b < 0xf0) {
          str += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
        } else {
          const cp = (((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f)) - 0x10000;
          str += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
        }
      }
      return str;
    }
  };
}

if (typeof (g as any).TextEncoder === 'undefined') {
  (g as any).TextEncoder = class TextEncoderPolyfill {
    encode(str: string): Uint8Array {
      const utf8: number[] = [];
      for (let i = 0; i < str.length; i++) {
        let charcode = str.charCodeAt(i);
        if (charcode < 0x80) {
          utf8.push(charcode);
        } else if (charcode < 0x800) {
          utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
        } else if (charcode < 0xd800 || charcode >= 0xe000) {
          utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
        } else {
          i++;
          charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
          utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
        }
      }
      return new Uint8Array(utf8);
    }

    encodeInto(str: string, destination: Uint8Array): { read: number; written: number } {
      const encoded = this.encode(str);
      const toWrite = Math.min(encoded.length, destination.length);
      destination.set(encoded.subarray(0, toWrite));
      return { read: str.length, written: toWrite };
    }
  };
}

export {};
