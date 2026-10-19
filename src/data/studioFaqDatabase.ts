export type FaqCategory = 'all' | 'qwerty' | 'sequencer' | 'effects' | 'midi' | 'soundfonts';

export interface FaqItem {
  id: string;
  category: 'qwerty' | 'sequencer' | 'effects' | 'midi' | 'soundfonts';
  categoryLabel: string;
  question: string;
  shortAnswer: string;
  detailedSteps: string[];
  tags: string[];
  action?: {
    type: 'open_seq' | 'open_keys' | 'open_instruments' | 'toggle_metronome';
    label: string;
  };
}

export const FAQ_DATABASE: FaqItem[] = [
  // --- ATTAJOS Y MODO QWERTY ---
  {
    id: 'qwerty-play-notes',
    category: 'qwerty',
    categoryLabel: 'Teclado QWERTY',
    question: '¿Cómo tocar notas con el teclado de mi computadora?',
    shortAnswer: 'Las teclas desde la A hasta el punto y coma (;) funcionan como un teclado cromático de 18 notas.',
    detailedSteps: [
      'Fila de teclas blancas (C4 en adelante): A, S, D, F, G, H, J, K, L, Ñ / ;',
      'Fila de teclas negras (sostenidos/bemoles): W, E, T, Y, U, O, P',
      'Todas las notas se ejecutan automáticamente a máxima velocidad (Velocity 127).',
    ],
    tags: ['teclado', 'qwerty', 'notas', 'tocar', 'piano', 'teclas', 'computadora', 'velocidad', 'velocity'],
    action: {
      type: 'open_keys',
      label: 'Ver Teclado en Pantalla',
    },
  },
  {
    id: 'qwerty-change-octave',
    category: 'qwerty',
    categoryLabel: 'Teclado QWERTY',
    question: '¿Cómo subir o bajar de octava en el teclado?',
    shortAnswer: 'Usa las teclas Z y X para transportar el teclado hacia octavas más graves o más agudas.',
    detailedSteps: [
      'Presiona la tecla Z para descender una octava (hasta C2).',
      'Presiona la tecla X para subir una octava (hasta C6).',
      'En la barra inferior verás la octava activa en tiempo real (ej. C3, C4, C5).',
    ],
    tags: ['octava', 'octavas', 'z', 'x', 'transportar', 'bajar', 'subir', 'grave', 'agudo'],
  },
  {
    id: 'qwerty-drum-pads',
    category: 'qwerty',
    categoryLabel: 'Teclado QWERTY',
    question: '¿Cómo disparar los pads de batería con el teclado?',
    shortAnswer: 'Los números 1 al 8 de tu teclado disparan inmediatamente los 8 pads rítmicos del sampler.',
    detailedSteps: [
      '1 = Kick (Bombo)',
      '2 = Snare (Caja / Redoblante)',
      '3 = Closed Hi-Hat (Charles cerrado)',
      '4 = Open Hi-Hat (Charles abierto)',
      '5 = Low Tom (Tom grave)',
      '6 = Mid Tom (Tom medio)',
      '7 = Crash Cymbal (Plato crash)',
      '8 = Ride Cymbal (Plato ride)',
    ],
    tags: ['pads', 'bateria', 'numeros', '1', '2', '3', '4', '5', '6', '7', '8', 'drums', 'kick', 'snare'],
  },
  {
    id: 'qwerty-transport',
    category: 'qwerty',
    categoryLabel: 'Teclado QWERTY',
    question: '¿Cuáles son los atajos para Play, Pausa y Stop?',
    shortAnswer: 'Usa la Barra Espaciadora para reproducir/pausar y la tecla Escape para detener el audio.',
    detailedSteps: [
      'Barra Espaciadora (Space): Inicia la reproducción o pausa el secuenciador y arpegiador.',
      'Escape (Esc): Detiene la reproducción inmediatamente (Stop) y reinicia el compás al paso inicial.',
    ],
    tags: ['espacio', 'play', 'pausa', 'stop', 'escape', 'esc', 'reproducir', 'detener', 'transporte'],
  },

  // --- SECUENCIADOR & GRABACIÓN EN VIVO ---
  {
    id: 'seq-how-to-open',
    category: 'sequencer',
    categoryLabel: 'Secuenciador & Grabación',
    question: '¿Cómo activo o abro el secuenciador rítmico?',
    shortAnswer: 'Haz clic en el selector "SEQ" ubicado sobre la consola o pulsa el botón directo a continuación.',
    detailedSteps: [
      '1. En el centro de la consola, haz clic en el tab "SEQ" (situado junto a "KEYS").',
      '2. Al entrar a modo SEQ, la aplicación conmuta automáticamente a la batería Yamaha RX7.',
      '3. Se desplegará la cuadrícula TR de 32 pasos y los 8 pads listos para tocar o grabar.',
    ],
    tags: ['activar', 'activo', 'activa', 'abrir', 'abro', 'secuenciador', 'seq', 'entrar', 'ver', 'donde', 'bateria', 'ritmo', 'poner', 'mostrar'],
    action: {
      type: 'open_seq',
      label: 'Abrir Secuenciador Rítmico',
    },
  },
  {
    id: 'keys-how-to-open',
    category: 'qwerty',
    categoryLabel: 'Teclado QWERTY',
    question: '¿Cómo activo o regreso al teclado de piano?',
    shortAnswer: 'Haz clic en el tab "KEYS" en el selector central para volver a la vista del teclado melódico.',
    detailedSteps: [
      '1. Haz clic en el botón "KEYS" situado junto a "SEQ".',
      '2. La estación de trabajo restaurará tu instrumento melódico (Grand Piano, Mellotron o Rhodes).',
      '3. El teclado de piano en pantalla se desplegará de inmediato.',
    ],
    tags: ['activar', 'activo', 'activa', 'abrir', 'abro', 'teclado', 'keys', 'piano', 'melodico', 'volver', 'regresar', 'ver', 'donde'],
    action: {
      type: 'open_keys',
      label: 'Ver Teclado Melódico',
    },
  },
  {
    id: 'audio-no-sound',
    category: 'effects',
    categoryLabel: 'Efectos & Ruteo',
    question: '¿Por qué no se escucha ningún sonido o está en silencio?',
    shortAnswer: 'El navegador requiere una interacción previa para desbloquear el motor de audio.',
    detailedSteps: [
      '1. Toca cualquier tecla de tu teclado físico o haz clic en una tecla en pantalla para iniciar el motor WebAudio.',
      '2. Verifica que el Master Fader (el fader derecho F9) no se encuentre en cero.',
      '3. Si estás usando efectos, verifica que los botones FX KEYS o FX PADS estén activados según desees procesar teclas o pads.',
    ],
    tags: ['no suena', 'no escucho', 'silencio', 'mudo', 'se corta', 'volumen', 'audio', 'fader', 'sonido', 'problema'],
  },
  {
    id: 'seq-live-recording',
    category: 'sequencer',
    categoryLabel: 'Secuenciador & Grabación',
    question: '¿Cómo grabar patrones de batería en vivo (Overdub)?',
    shortAnswer: 'Haz clic en el botón rojo REC (●) y presiona los pads o los números 1-8 al compás del metrónomo.',
    detailedSteps: [
      '1. Entra a la vista SEQ (Secuenciador) o presiona REC en la barra superior.',
      '2. El botón REC empezará a parpadear en rojo indicando el modo Overdub activo.',
      '3. Toca los pads con el ratón o con las teclas numéricas 1 a 8.',
      '4. Los golpes se cuantizan y se graban automáticamente en los pasos correspondientes sin detener la música.',
    ],
    tags: ['grabar', 'rec', 'overdub', 'vivo', 'tiempo real', 'secuenciador', 'patron', 'ritmo', 'bateria'],
    action: {
      type: 'open_seq',
      label: 'Abrir Secuenciador Rítmico',
    },
  },
  {
    id: 'seq-metronome-sync',
    category: 'sequencer',
    categoryLabel: 'Secuenciador & Grabación',
    question: '¿Cómo activar el metrónomo y cómo está sincronizado?',
    shortAnswer: 'Haz clic en el icono de campana en la barra superior o en el secuenciador.',
    detailedSteps: [
      'El metrónomo emite un clic agudo (1600 Hz) en el primer golpe de cada compás (Downbeat) y un clic medio (1000 Hz) en los tiempos 2, 3 y 4.',
      'Está enlazado a nivel de muestra (Sample-Accurate) con el motor de audio WASM, garantizando cero desfase al grabar.',
    ],
    tags: ['metronomo', 'clic', 'click', 'campana', 'tempo', 'tiempo', 'sincronizado', 'downbeat'],
    action: {
      type: 'toggle_metronome',
      label: 'Alternar Metrónomo',
    },
  },
  {
    id: 'seq-banks-and-clear',
    category: 'sequencer',
    categoryLabel: 'Secuenciador & Grabación',
    question: '¿Cómo alternar entre los bancos A/B o borrar pistas?',
    shortAnswer: 'En el secuenciador, usa los botones BANK A/B para tener 2 variaciones de ritmo de hasta 32 pasos.',
    detailedSteps: [
      'Botón BANK A/B: Cambia entre dos patrones independientes para crear partes como verso y estribillo.',
      'Botón CLR TRACK: Borra todos los pasos del pad seleccionado actualmente.',
      'Botón CLR ALL: Limpia la totalidad del patrón del banco activo.',
      'Botón UNDO: Deshace la última modificación de pasos realizada.',
    ],
    tags: ['banco', 'bancos', 'bank', 'a', 'b', 'clear', 'borrar', 'limpiar', 'undo', 'deshacer'],
    action: {
      type: 'open_seq',
      label: 'Ir al Secuenciador',
    },
  },

  // --- EFECTOS & ENRUTAMIENTO ---
  {
    id: 'fx-routing-keys-pads',
    category: 'effects',
    categoryLabel: 'Efectos & Ruteo',
    question: '¿Por qué no se escuchan los efectos de Delay o Reverb?',
    shortAnswer: 'Debes activar los botones FX KEYS o FX PADS situados junto a la rueda de modulación.',
    detailedSteps: [
      'Por defecto, el rack de efectos inicia en bypass para un sonido puro sin procesar.',
      'Presiona FX KEYS para activar los efectos en el teclado melódico (Piano, Mellotron, Rhodes).',
      'Presiona FX PADS para activar los efectos en los pads de percusión.',
      'Puedes encender ambos simultáneamente si deseas procesar todo el conjunto.',
    ],
    tags: ['efectos', 'fx', 'routing', 'ruteo', 'delay', 'reverb', 'filtro', 'fx keys', 'fx pads', 'bypass', 'activar'],
  },
  {
    id: 'fx-knobs-functions',
    category: 'effects',
    categoryLabel: 'Efectos & Ruteo',
    question: '¿Qué función cumple cada una de las 8 perillas (Knobs)?',
    shortAnswer: 'Las 8 perillas controlan en tiempo real los parámetros de síntesis y procesamiento digital DSP.',
    detailedSteps: [
      'Knob 1: Filter Cutoff (Frecuencia de corte del filtro paso bajo)',
      'Knob 2: Filter Resonance (Resonancia y pico del filtro)',
      'Knob 3: Drive / Saturation (Distorsión cálida analógica)',
      'Knob 4: Delay Time (Tiempo de retardo de las repeticiones)',
      'Knob 5: Delay Feedback (Cantidad de repeticiones del eco)',
      'Knob 6: Reverb Size (Dimensión acústica del espacio virtual)',
      'Knob 7: Reverb Mix (Proporción entre señal seca y reverberada)',
      'Knob 8: Master Volume / Trim adicional',
    ],
    tags: ['knobs', 'perillas', 'cutoff', 'resonancia', 'drive', 'delay', 'reverb', 'dsp', 'parametros'],
  },

  // --- CONTROLADORES MIDI FÍSICOS ---
  {
    id: 'midi-connect-device',
    category: 'midi',
    categoryLabel: 'Controladores MIDI',
    question: '¿Cómo conectar un teclado o controlador MIDI físico?',
    shortAnswer: 'Solo conéctalo por USB a tu computadora y abre el navegador. La web lo detectará automáticamente.',
    detailedSteps: [
      '1. Conecta tu teclado o controlador MIDI por USB antes o después de abrir la web.',
      '2. El navegador solicitará permisos de Web MIDI si es la primera vez (haz clic en Permitir).',
      '3. En la barra superior aparecerá el nombre de tu dispositivo con un LED verde brillante.',
      '4. Las teclas, pads, pitch bend y rueda de modulación funcionarán de inmediato sin configurar drivers.',
    ],
    tags: ['midi', 'controlador', 'teclado midi', 'usb', 'conectar', 'dispositivo', 'web midi'],
  },
  {
    id: 'midi-cc-mapping',
    category: 'midi',
    categoryLabel: 'Controladores MIDI',
    question: '¿Cuáles son los números CC asignados para faders y perillas?',
    shortAnswer: 'El motor sigue los estándares MIDI CC universales de hardware de estudio.',
    detailedSteps: [
      'Faders 1 al 8: CC 12 a CC 19 (o CC 41 a 48 según fabricante)',
      'Master Fader (F9): CC 20 o CC 49',
      'Knobs 1 al 8: CC 21 a CC 28 (o CC 56 a 63)',
      'Modulation Wheel: CC 1',
      'Transporte: Play = CC 106, Record = CC 107, Stop = CC 108, Click = CC 47',
    ],
    tags: ['cc', 'mapeo', 'faders', 'knobs', 'midi cc', 'master', 'mod wheel', 'pitch bend'],
  },

  // --- INSTRUMENTOS & SOUNDFONTS ---
  {
    id: 'sf-instruments-suite',
    category: 'soundfonts',
    categoryLabel: 'Instrumentos & Sonidos',
    question: '¿Qué instrumentos incluye de fábrica Impact Sampler Studio?',
    shortAnswer: 'Incluye 4 instrumentos de estudio con muestras acústicas y electrónicas de alta resolución.',
    detailedSteps: [
      '1. Grand Piano (Steinway Realtime, 126.7 MB): Piano acústico de cola muestreado en capas dinámicas.',
      '2. Yamaha RX7 (19.3 MB): Caja de ritmos digital PCM vintage de 1987 con timbres de percusión clásicos.',
      '3. Mellotron Tape (116.2 MB): Cintas analógicas de los años 60 con 12 presets (Flauta, Cuerdas, Coros, etc.).',
      '4. Rhodes Mark I (522.1 MB): Piano electro-mecánico de alta gama con calidez analógica.',
    ],
    tags: ['instrumentos', 'sonidos', 'piano', 'rx7', 'yamaha', 'mellotron', 'rhodes', 'fabrica', 'soundfonts'],
    action: {
      type: 'open_instruments',
      label: 'Abrir Catálogo de Instrumentos',
    },
  },
  {
    id: 'sf-import-custom',
    category: 'soundfonts',
    categoryLabel: 'Instrumentos & Sonidos',
    question: '¿Puedo cargar mis propios instrumentos SoundFont (.sf2)?',
    shortAnswer: '¡Sí! Puedes importar cualquier archivo .sf2 arrastrándolo o usando el botón de importación.',
    detailedSteps: [
      '1. Arrastra tu archivo .sf2 directamente sobre la ventana de la aplicación.',
      '2. O abre el Catálogo de Instrumentos y haz clic en "Importar .SF2".',
      '3. El archivo se analizará en WebAssembly y se guardará de forma permanente en la base de datos IndexedDB de tu navegador para que siempre esté disponible.',
    ],
    tags: ['importar', 'sf2', 'custom', 'propios', 'arrastrar', 'drag drop', 'cargar', 'archivo'],
    action: {
      type: 'open_instruments',
      label: 'Importar SoundFont',
    },
  },
  {
    id: 'sf-select-presets',
    category: 'soundfonts',
    categoryLabel: 'Instrumentos & Sonidos',
    question: '¿Cómo cambiar de preset dentro de un instrumento (ej. Mellotron)?',
    shortAnswer: 'Usa el menú desplegable PATCH ubicado en la barra de transporte superior.',
    detailedSteps: [
      'Cuando cargas un instrumento con múltiples presets (como el Mellotron que cuenta con 12 sonidos diferentes: Flute, Strings, Cello, 8-Voice Choir, etc.), el selector "PATCH" se habilita en la barra superior.',
      'Haz clic en el selector y elige el timbre que deseas escuchar sin necesidad de recargar el archivo.',
    ],
    tags: ['preset', 'presets', 'patch', 'mellotron', 'flauta', 'cuerdas', 'voces', 'timbre', 'cambiar'],
  },

  // --- ARPEGIADOR & EXPRESIÓN ---
  {
    id: 'arp-how-it-works',
    category: 'qwerty',
    categoryLabel: 'Arpegiador & Modos',
    question: '¿Qué es el arpegiador y cómo configurarlo?',
    shortAnswer: 'Descompone los acordes que tocas en patrones melódicos rítmicos sincronizados al tempo.',
    detailedSteps: [
      '1. Presiona el botón ARP (junto a las ruedas) para activarlo o desactivarlo.',
      '2. Haz clic en el icono de ajustes (⚙) para seleccionar el Modo: UP (ascendente), DOWN (descendente), UP/DOWN o RANDOM (aleatorio).',
      '3. Configura la velocidad métrica (Rate: 1/4, 1/8, 1/16, 1/32) y el número de octavas que recorrerá (1 a 4).',
    ],
    tags: ['arpegiador', 'arp', 'acordes', 'secuencia', 'modo', 'up', 'down', 'random', 'rate', 'velocidad', 'octavas'],
  },
  {
    id: 'arp-hold-feature',
    category: 'qwerty',
    categoryLabel: 'Arpegiador & Modos',
    question: '¿Para qué sirve el botón ARP HOLD?',
    shortAnswer: 'Mantiene el arpegio sonando en bucle aunque sueltes las teclas físicas.',
    detailedSteps: [
      '1. Toca un acorde con el arpegiador activado.',
      '2. Presiona ARP HOLD (se iluminará en color cian).',
      '3. Suelta las manos del teclado: el arpegio continuará indefinidamente al compás del BPM.',
      '4. Esto te permite tener las manos libres para manipular perillas de filtro, faders o disparar percusión.',
    ],
    tags: ['hold', 'arp hold', 'mantener', 'loop', 'arpegiador', 'soltar', 'teclas', 'sonar'],
  },
  {
    id: 'pitch-bend-mod-wheel',
    category: 'qwerty',
    categoryLabel: 'Controladores & Expresión',
    question: '¿Cómo funcionan el Pitch Bend y la Rueda de Modulación?',
    shortAnswer: 'Modifican la afinación continua y la intensidad del vibrato/LFO tanto en pantalla como por MIDI.',
    detailedSteps: [
      'Pitch Bend: Desliza la afinación continua +/- 2 semitonos. Vuelve automáticamente al centro al soltarlo.',
      'Modulation Wheel (CC 1): Añade modulación tímbrica o vibrato expresivo. Permanece en la posición donde lo dejes.',
      'Si conectas un teclado MIDI con ruedas físicas, se sincronizan automáticamente en tiempo real.',
    ],
    tags: ['pitch bend', 'afinacion', 'rueda', 'modulacion', 'mod wheel', 'vibrato', 'bend', 'semitonos'],
  },

  // --- MIDI LEARN Y CONTROLADORES ---
  {
    id: 'midi-learn-how-to',
    category: 'midi',
    categoryLabel: 'Controladores MIDI',
    question: '¿Cómo mapear perillas o faders de mi controlador físico (MIDI Learn)?',
    shortAnswer: 'El modo MIDI Learn te permite asignar cualquier fader, perilla, pad o botón a tu controlador físico.',
    detailedSteps: [
      '1. Haz clic en el botón ámbar MIDI LEARN en la barra superior (el marco parpadeará en color ámbar).',
      '2. Haz clic en pantalla sobre el fader, perilla, botón de transporte o pad que desees vincular.',
      '3. Mueve la perilla o fader, o presiona la tecla/pad en tu controlador MIDI físico.',
      '4. La asignación se registrará al instante y se guardará automáticamente en tu navegador para futuras sesiones.',
    ],
    tags: ['midi learn', 'mapear', 'asignar', 'vincular', 'aprender', 'controlador', 'perillas', 'faders', 'ambar'],
  },
  {
    id: 'midi-learn-compatible-devices',
    category: 'midi',
    categoryLabel: 'Controladores MIDI',
    question: '¿Qué controladores MIDI son compatibles con la aplicación?',
    shortAnswer: 'Cualquier teclado, launchpad o controlador USB class-compliant estándar es 100% compatible sin instalar drivers.',
    detailedSteps: [
      'Compatible con marcas como Nektar, Novation, Akai, Arturia, Korg, M-Audio, Alesis, Native Instruments, etc.',
      'Funciona directamente a través del protocolo Web MIDI nativo del navegador.',
      'Puedes usar tanto teclas de piano como faders, knobs rotatorios y drum pads.',
    ],
    tags: ['controlador', 'teclados compatibles', 'marcas', 'akai', 'arturia', 'novation', 'nektar', 'korg', 'usb'],
  },

  // --- SECUENCIADOR RÍTMICO AVANZADO ---
  {
    id: 'seq-grid-pages',
    category: 'sequencer',
    categoryLabel: 'Secuenciador & Grabación',
    question: '¿Cómo funciona la resolución rítmica (GRID) y las Páginas 1 y 2?',
    shortAnswer: 'El selector GRID define la subdivisión de tiempo entre corcheas (1/8), semicorcheas (1/16) y fusas (1/32).',
    detailedSteps: [
      '1/8: Ritmos espaciados de corcheas (16 pasos en total).',
      '1/16: La subdivisión clásica estándar de 16 pasos por compás.',
      '1/32: Subdivisión rápida para redobles de hi-hats estilo Trap. Al elegir 1/32 se habilitan las páginas [1] y [2] para ver los 32 pasos completos con indicador LED de seguimiento.',
    ],
    tags: ['grid', 'malla', 'resolucion', 'paginas', 'page', '1 8', '1 16', '1 32', 'fusa', 'redoble', 'trap'],
    action: {
      type: 'open_seq',
      label: 'Abrir Secuenciador',
    },
  },
  {
    id: 'seq-quantize-q',
    category: 'sequencer',
    categoryLabel: 'Secuenciador & Grabación',
    question: '¿Qué hace el botón Q (Cuantización) en el secuenciador?',
    shortAnswer: 'Alinea automáticamente los golpes grabados en vivo a la subdivisión rítmica exacta.',
    detailedSteps: [
      'Al hacer clic en [ Q ] se abre el panel de cuantización.',
      'Strength (Fuerza): Permite ajustar el grado de corrección de 0% (groove humano original) a 100% (alineación matemática precisa).',
      'Botón Re-Quantize: Aplica la cuantización a todas las pistas del patrón activo de inmediato.',
    ],
    tags: ['cuantizar', 'cuantizacion', 'q', 'strength', 'fuerza', 'alinear', 'groove', 'ritmo', 'tiempo'],
    action: {
      type: 'open_seq',
      label: 'Ir al Secuenciador',
    },
  },
  {
    id: 'seq-tap-tempo',
    category: 'sequencer',
    categoryLabel: 'Secuenciador & Grabación',
    question: '¿Cómo usar el botón TAP Tempo para fijar los BPM?',
    shortAnswer: 'Pulsa rítmicamente el botón TAP al pulso deseado y el BPM se calculará automáticamente.',
    detailedSteps: [
      '1. Pulsa el botón TAP 3 o 4 veces seguidas siguiendo el ritmo que imaginas en tu cabeza.',
      '2. El sistema promedia las pulsaciones y fija el tempo de inmediato.',
      '3. También puedes hacer doble clic sobre el número de BPM en la pantalla VFD para escribirlo directamente.',
    ],
    tags: ['tap', 'tap tempo', 'bpm', 'velocidad', 'ritmo', 'pulsar', 'marcar', 'tempo'],
  },

  // --- MOTOR, ALMACENAMIENTO Y MODO OFFLINE ---
  {
    id: 'app-offline-mode',
    category: 'soundfonts',
    categoryLabel: 'Arquitectura & Offline',
    question: '¿Se puede usar la aplicación sin conexión a internet (Offline)?',
    shortAnswer: '¡Sí! Una vez cargada en el navegador y guardados los instrumentos, funciona 100% offline.',
    detailedSteps: [
      'El motor DSP de audio y síntesis SF2 está compilado en WebAssembly (WASM) y corre localmente en tu CPU.',
      'Los instrumentos que descargas se almacenan permanentemente en la base de datos IndexedDB de tu navegador.',
      'Puedes usarla en viajes, aviones o en vivo en el escenario sin necesidad de conexión Wi-Fi.',
    ],
    tags: ['offline', 'sin internet', 'desconectado', 'wifi', 'avion', 'local', 'guardar', 'cache', 'viaje'],
  },
  {
    id: 'audio-latency-clicks',
    category: 'effects',
    categoryLabel: 'Optimización de Audio',
    question: '¿Cómo solucionar latencia, chasquidos o ruidos en el audio?',
    shortAnswer: 'La latencia suele deberse al uso de auriculares Bluetooth o a saturación de CPU.',
    detailedSteps: [
      '1. Auriculares: Evita auriculares Bluetooth, ya que introducen entre 100ms y 250ms de retraso inalámbrico. Usa auriculares con cable.',
      '2. Frecuencia: Asegúrate de que tu interfaz o tarjeta de audio esté a 44.1 kHz o 48 kHz.',
      '3. CPU: Cierra pestañas pesadas o programas en segundo plano para garantizar rendimiento de audio en tiempo real.',
    ],
    tags: ['latencia', 'retraso', 'chasquidos', 'ruido', 'clicks', 'buffer', 'bluetooth', 'auriculares', 'lento'],
  },
  {
    id: 'general-what-is-impact',
    category: 'soundfonts',
    categoryLabel: 'Acerca del Estudio',
    question: '¿Qué es Impact Sampler Studio y cómo funciona su motor?',
    shortAnswer: 'Es una estación de trabajo de producción musical y sampler híbrido con teclado cromático y secuenciador TR.',
    detailedSteps: [
      'Núcleo en WebAssembly (WASM): Procesa polifonía multicapa estéreo con latencia sub-milisegundo vía AudioWorklet.',
      'Soporte SoundFont 2 (.sf2): Compatible con bibliotecas de instrumentos orquestales, vintage y acústicos.',
      'Diseño Noir-Tech: Estética de consola hardware física con cero distracción y máxima respuesta táctil.',
    ],
    tags: ['que es', 'impact sampler', 'como funciona', 'motor', 'wasm', 'webassembly', 'arquitectura', 'dsp'],
  },
];
