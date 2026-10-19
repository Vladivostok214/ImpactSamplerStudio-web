import { FaqItem } from '../data/studioFaqDatabase';

// Palabras vacías en español que no aportan carga semántica en la consulta
const SPANISH_STOPWORDS = new Set([
  'a', 'al', 'algo', 'algunas', 'algunos', 'ante', 'antes', 'como', 'con', 'contra',
  'cual', 'cuales', 'cuando', 'de', 'del', 'desde', 'donde', 'dos', 'el', 'ella',
  'ellas', 'ello', 'ellos', 'en', 'entre', 'era', 'erais', 'eran', 'eras', 'eres',
  'es', 'esa', 'esas', 'ese', 'eso', 'esos', 'esta', 'estaba', 'estado', 'estais',
  'estamos', 'estan', 'estar', 'estas', 'este', 'estos', 'estoy', 'ha', 'hace',
  'haces', 'haceis', 'hacemos', 'hacen', 'hacer', 'haces', 'hago', 'hasta', 'incluso',
  'la', 'las', 'le', 'les', 'lo', 'los', 'mas', 'me', 'mi', 'mis', 'mucho',
  'muchos', 'muy', 'nada', 'ni', 'no', 'nos', 'nosotras', 'nosotros', 'o', 'otra',
  'otras', 'otro', 'otros', 'para', 'pero', 'poco', 'por', 'porque', 'puedo', 'que',
  'quien', 'quienes', 'se', 'sea', 'seais', 'sean', 'seas', 'ser', 'sera', 'seran',
  'seras', 'sere', 'seriais', 'serian', 'serias', 'si', 'sido', 'siendo', 'sin',
  'sobre', 'sois', 'somos', 'son', 'soy', 'su', 'sus', 'suya', 'suyas', 'suyo',
  'suyos', 'tambien', 'tanto', 'te', 'tendra', 'tendran', 'tendras', 'tendre',
  'teneis', 'tenemos', 'tener', 'tenga', 'tengais', 'tengan', 'tengas', 'tengo',
  'ti', 'tiene', 'tienen', 'tienes', 'toda', 'todas', 'todo', 'todos', 'tu',
  'tus', 'un', 'una', 'unas', 'uno', 'unos', 'usa', 'usar', 'uso', 'va',
  'vais', 'vamos', 'van', 'vas', 'voy', 'ya', 'yo', 'quiero', 'quisiera', 'necesito'
]);

// Mapa de sinónimos y lematización de intenciones hacia palabras clave maestras
const INTENT_SYNONYMS: Record<string, string[]> = {
  // Intención: Activar / Abrir / Ver / Navegar
  activar: ['abrir', 'ir', 'ver', 'entrar', 'mostrar', 'poner', 'cambiar', 'acceder', 'cargar', 'desplegar', 'habilitar'],
  abrir: ['activar', 'ir', 'ver', 'entrar', 'mostrar', 'poner', 'cambiar', 'acceder', 'cargar'],
  donde: ['ubicar', 'encontrar', 'donde esta', 'ver'],

  // Intención: Tocar notas / Teclado
  tocar: ['ejecutar', 'sonar', 'teclas', 'teclado', 'qwerty', 'notas', 'presionar'],
  teclado: ['qwerty', 'teclas', 'notas', 'computadora', 'piano', 'keys'],
  octava: ['octavas', 'transporte', 'transportar', 'agudo', 'grave', 'z', 'x', 'subir', 'bajar'],

  // Intención: Secuenciador / Ritmo / Batería
  secuenciador: ['seq', 'bateria', 'ritmo', 'patron', 'drums', 'caja de ritmos', 'pasos', 'tr'],
  bateria: ['secuenciador', 'seq', 'ritmo', 'drums', 'kick', 'snare', 'rx7', 'yamaha', 'pads'],
  grabar: ['rec', 'overdub', 'registro', 'registrar', 'grabo', 'guardar'],

  // Intención: Metrónomo / Tempo
  metronomo: ['clic', 'click', 'tempo', 'bpm', 'compas', 'campana', 'tiempo'],

  // Intención: Efectos / Audio
  efectos: ['fx', 'delay', 'reverb', 'filtro', 'cutoff', 'eco', 'distorsion', 'drive', 'eco'],
  delay: ['eco', 'repeticiones', 'tiempo', 'feedback'],
  reverb: ['ambiente', 'sala', 'espacio', 'reverberacion'],
  ruteo: ['routing', 'fx keys', 'fx pads', 'bypass', 'activar efectos'],

  // Intención: Instrumentos / Sonidos
  instrumento: ['sonido', 'soundfont', 'sf2', 'piano', 'mellotron', 'rhodes', 'rx7', 'preset', 'patch'],
  mellotron: ['flauta', 'cuerdas', 'coro', 'voces', 'tape', 'vintage'],
  preset: ['presets', 'patch', 'programa', 'sonido'],

  // Intención: Solución de problemas / Silencio
  silencio: ['no suena', 'no escucho', 'mudo', 'se corta', 'volumen', 'fader'],
};

// Normalizar texto eliminando tildes y caracteres especiales
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9\s]/g, ' ') // Dejar solo letras y números
    .replace(/\s+/g, ' ')
    .trim();
}

// Calcular distancia de Levenshtein para tolerancia a errores tipográficos
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // eliminación
        matrix[i][j - 1] + 1, // inserción
        matrix[i - 1][j - 1] + cost // sustitución
      );
    }
  }

  return matrix[a.length][b.length];
}

// Tokenizar y expandir consulta con sinónimos e intenciones
export function extractQueryTokens(rawQuery: string): { originalTokens: string[]; expandedTokens: string[] } {
  const normalized = normalizeText(rawQuery);
  const words = normalized.split(/\s+/).filter(Boolean);

  const originalTokens = words.filter((w) => !SPANISH_STOPWORDS.has(w) && w.length > 1);

  // Si todas las palabras eran stopwords (ej. "¿como es?"), mantener al menos las originales
  const meaningfulTokens = originalTokens.length > 0 ? originalTokens : words;

  const expandedSet = new Set<string>(meaningfulTokens);

  meaningfulTokens.forEach((token) => {
    // Buscar en mapa de sinónimos
    for (const [key, synonyms] of Object.entries(INTENT_SYNONYMS)) {
      if (token === key || synonyms.includes(token)) {
        expandedSet.add(key);
        synonyms.forEach((syn) => expandedSet.add(syn));
      }
    }
  });

  return {
    originalTokens: meaningfulTokens,
    expandedTokens: Array.from(expandedSet),
  };
}

export interface ScoredFaqItem {
  item: FaqItem;
  score: number;
  isBestMatch: boolean;
}

// Motor de Búsqueda Semántica con Puntuación de Relevancia
export function searchFaqSemantic(
  query: string,
  category: string,
  database: FaqItem[]
): ScoredFaqItem[] {
  if (!query.trim()) {
    return database
      .filter((item) => category === 'all' || item.category === category)
      .map((item) => ({ item, score: 0, isBestMatch: false }));
  }

  const normalizedQuery = normalizeText(query);
  const { originalTokens, expandedTokens } = extractQueryTokens(query);

  const scoredList: { item: FaqItem; score: number }[] = [];

  for (const item of database) {
    if (category !== 'all' && item.category !== category) {
      continue;
    }

    let score = 0;
    const normalizedQuestion = normalizeText(item.question);
    const normalizedAnswer = normalizeText(item.shortAnswer);
    const normalizedTags = item.tags.map(normalizeText);
    const normalizedSteps = item.detailedSteps.map(normalizeText).join(' ');

    // 1. Coincidencia exacta de frase completa
    if (normalizedQuestion.includes(normalizedQuery)) {
      score += 120;
    } else if (normalizedAnswer.includes(normalizedQuery)) {
      score += 60;
    }

    // 2. Coincidencia de tokens originales (alta prioridad)
    for (const token of originalTokens) {
      // Coincidencia en título
      if (normalizedQuestion.includes(token)) {
        score += 35;
      }
      // Coincidencia en tags
      if (normalizedTags.some((t) => t === token || t.includes(token))) {
        score += 25;
      }
      // Coincidencia en respuesta corta
      if (normalizedAnswer.includes(token)) {
        score += 15;
      }
      // Coincidencia en pasos detallados
      if (normalizedSteps.includes(token)) {
        score += 8;
      }

      // Fuzzy matching para errores de escritura (solo si la palabra tiene 4 o más letras)
      if (token.length >= 4) {
        const questionWords = normalizedQuestion.split(/\s+/);
        for (const qw of questionWords) {
          if (qw.length >= 4 && Math.abs(qw.length - token.length) <= 2) {
            const dist = levenshteinDistance(token, qw);
            if (dist === 1) {
              score += 20; // Casi idéntica
            } else if (dist === 2 && token.length >= 6) {
              score += 10;
            }
          }
        }
      }
    }

    // 3. Coincidencia de sinónimos expandidos (media prioridad)
    for (const syn of expandedTokens) {
      if (normalizedQuestion.includes(syn)) {
        score += 15;
      } else if (normalizedTags.some((t) => t.includes(syn))) {
        score += 12;
      } else if (normalizedAnswer.includes(syn)) {
        score += 6;
      }
    }

    if (score > 0) {
      scoredList.push({ item, score });
    }
  }

  // Ordenar descendentemente por puntuación
  scoredList.sort((a, b) => b.score - a.score);

  const highestScore = scoredList[0]?.score || 0;

  return scoredList.map((scored, index) => ({
    item: scored.item,
    score: scored.score,
    isBestMatch: index === 0 && highestScore >= 35,
  }));
}
