import { SoundFontPresetInfo } from '../types/soundfont';

/**
 * Analizador binario ultraligero de cabeceras RIFF para SoundFont 2 (.sf2).
 * Extrae la lista real de instrumentos y patches desde el sub-chunk 'pdta' -> 'phdr'.
 */
export function parseSf2Presets(buffer: ArrayBuffer): SoundFontPresetInfo[] {
  const fallbackPreset: SoundFontPresetInfo[] = [
    { index: 0, name: 'Default Patch', bank: 0, patch: 0 },
  ];

  if (!buffer || buffer.byteLength < 32) {
    return fallbackPreset;
  }

  try {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    const readFourCC = (offset: number): string => {
      if (offset + 4 > bytes.length) return '';
      return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    };

    if (readFourCC(0) !== 'RIFF' || readFourCC(8) !== 'sfbk') {
      return fallbackPreset;
    }

    let offset = 12;
    let phdrOffset = -1;
    let phdrSize = 0;

    // Recorrer chunks principales del archivo RIFF
    while (offset < bytes.length - 8) {
      const chunkId = readFourCC(offset);
      const chunkSize = view.getUint32(offset + 4, true);

      if (chunkId === 'LIST') {
        const listType = readFourCC(offset + 8);
        if (listType === 'pdta') {
          // Explorar sub-chunks de pdta para localizar 'phdr'
          let subOffset = offset + 12;
          const subEnd = Math.min(offset + 8 + chunkSize, bytes.length);

          while (subOffset < subEnd - 8) {
            const subId = readFourCC(subOffset);
            const subSize = view.getUint32(subOffset + 4, true);

            if (subId === 'phdr') {
              phdrOffset = subOffset + 8;
              phdrSize = subSize;
              break;
            }
            subOffset += 8 + subSize + (subSize % 2); // Alineación a palabra par en RIFF
          }
          break;
        }
        offset += 8 + chunkSize + (chunkSize % 2);
      } else {
        offset += 8 + chunkSize + (chunkSize % 2);
      }
    }

    if (phdrOffset <= 0 || phdrSize < 38) {
      return fallbackPreset;
    }

    const RECORD_SIZE = 38;
    const count = Math.floor(phdrSize / RECORD_SIZE);
    const presets: SoundFontPresetInfo[] = [];

    // Cada registro phdr tiene 38 bytes (el último es 'EOP' - End of Presets)
    for (let i = 0; i < count - 1; i++) {
      const rec = phdrOffset + i * RECORD_SIZE;
      let name = '';
      for (let c = 0; c < 20; c++) {
        const b = bytes[rec + c];
        if (b === 0) break;
        name += String.fromCharCode(b);
      }

      const patch = view.getUint16(rec + 20, true);
      const bank = view.getUint16(rec + 22, true);
      const cleanName = name.trim() || `Preset ${i}`;

      presets.push({
        index: i,
        name: cleanName,
        patch,
        bank,
      });
    }

    return presets.length > 0 ? presets : fallbackPreset;
  } catch (err) {
    console.warn('No se pudieron analizar los presets del SoundFont:', err);
    return fallbackPreset;
  }
}
