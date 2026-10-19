pub const NUM_PADS: usize = 8;
pub const MAX_STEPS: usize = 32;
pub const TICKS_PER_BEAT: u32 = 96;
pub const BEATS_PER_BAR: u32 = 4;
pub const TICKS_PER_BAR: u32 = BEATS_PER_BAR * TICKS_PER_BEAT; // 384 ticks
pub const MAX_EVENTS_PER_TRACK: usize = 64;

// Mapeo GM estándar de los 8 pads de batería
pub const DEFAULT_PAD_NOTES: [u8; NUM_PADS] = [
    36, // Pad 1: Kick
    38, // Pad 2: Snare
    42, // Pad 3: Closed HH
    46, // Pad 4: Open HH
    41, // Pad 5: Low Tom
    45, // Pad 6: Mid Tom
    49, // Pad 7: Crash
    51, // Pad 8: Ride
];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SequencerEvent {
    pub tick: u32,
    pub original_tick: u32,
    pub velocity: u8,
}

#[derive(Debug, Clone, Copy)]
pub struct TrackEvents {
    pub events: [SequencerEvent; MAX_EVENTS_PER_TRACK],
    pub count: usize,
}

impl TrackEvents {
    pub const fn new() -> Self {
        Self {
            events: [SequencerEvent { tick: 0, original_tick: 0, velocity: 0 }; MAX_EVENTS_PER_TRACK],
            count: 0,
        }
    }

    pub fn clear(&mut self) {
        self.count = 0;
    }

    pub fn add_or_update(&mut self, tick: u32, original_tick: u32, velocity: u8) {
        let tick = tick % TICKS_PER_BAR;
        let original_tick = original_tick % TICKS_PER_BAR;
        for i in 0..self.count {
            if self.events[i].tick == tick {
                if velocity == 0 {
                    self.remove_at(i);
                } else {
                    self.events[i].velocity = velocity;
                    self.events[i].original_tick = original_tick;
                }
                return;
            }
        }
        if velocity > 0 && self.count < MAX_EVENTS_PER_TRACK {
            self.events[self.count] = SequencerEvent { tick, original_tick, velocity };
            self.count += 1;
        }
    }

    pub fn remove_at(&mut self, index: usize) {
        if index < self.count {
            for i in index..self.count - 1 {
                self.events[i] = self.events[i + 1];
            }
            self.count -= 1;
        }
    }

    pub fn remove_at_tick(&mut self, tick: u32) -> bool {
        let tick = tick % TICKS_PER_BAR;
        for i in 0..self.count {
            if self.events[i].tick == tick {
                self.remove_at(i);
                return true;
            }
        }
        false
    }
}

#[derive(Debug, Clone, Copy)]
pub struct BankPattern {
    pub tracks: [TrackEvents; NUM_PADS],
}

impl BankPattern {
    pub const fn new() -> Self {
        Self {
            tracks: [TrackEvents::new(); NUM_PADS],
        }
    }

    pub fn clear(&mut self) {
        for t in self.tracks.iter_mut() {
            t.clear();
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StepResolution {
    Eighth,       // 1/8: 8 pasos (48 ticks/paso)
    Sixteenth,    // 1/16: 16 pasos (24 ticks/paso)
    ThirtySecond, // 1/32: 32 pasos (12 ticks/paso)
}

impl StepResolution {
    #[inline]
    pub fn ticks_per_step(&self) -> u32 {
        match self {
            StepResolution::Eighth => 48,
            StepResolution::Sixteenth => 24,
            StepResolution::ThirtySecond => 12,
        }
    }

    #[inline]
    pub fn steps_per_bar(&self) -> usize {
        match self {
            StepResolution::Eighth => 8,
            StepResolution::Sixteenth => 16,
            StepResolution::ThirtySecond => 32,
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "eighth" | "1/8" => StepResolution::Eighth,
            "thirtySecond" | "1/32" => StepResolution::ThirtySecond,
            _ => StepResolution::Sixteenth,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            StepResolution::Eighth => "eighth",
            StepResolution::Sixteenth => "sixteenth",
            StepResolution::ThirtySecond => "thirtySecond",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PatternBank {
    A,
    B,
}

#[derive(Clone)]
pub struct StepSequencer {
    pub bank_a: BankPattern,
    pub bank_b: BankPattern,
    pub current_bank: PatternBank,
    pub bank_b_initialized: bool,
    pub is_playing: bool,
    pub is_paused: bool,
    pub is_recording: bool,
    pub bpm: f32,
    pub current_tick: u32,
    pub current_step: usize,
    pub resolution: StepResolution,
    pub is_click_enabled: bool,
    pub selected_pad: usize,
    pub sample_accum: f32,
    pub samples_per_tick: f32,
    pub sample_rate: f32,
    pub need_start_trigger: bool,
    pub suppress_next_tick: [Option<u32>; NUM_PADS],
    undo_history: Vec<BankPattern>,
}

impl StepSequencer {
    pub fn new(sample_rate: f32) -> Self {
        let bpm = 120.0f32;
        let mut seq = Self {
            bank_a: BankPattern::new(),
            bank_b: BankPattern::new(),
            current_bank: PatternBank::A,
            bank_b_initialized: false,
            is_playing: false,
            is_paused: false,
            is_recording: false,
            bpm,
            current_tick: 0,
            current_step: 0,
            resolution: StepResolution::Sixteenth,
            is_click_enabled: false,
            selected_pad: 0,
            sample_accum: 0.0,
            samples_per_tick: 0.0,
            sample_rate,
            need_start_trigger: false,
            suppress_next_tick: [None; NUM_PADS],
            undo_history: Vec::with_capacity(16),
        };
        seq.recalculate_samples_per_tick();
        seq
    }

    #[inline]
    pub fn get_active_bank(&self) -> &BankPattern {
        match self.current_bank {
            PatternBank::A => &self.bank_a,
            PatternBank::B => &self.bank_b,
        }
    }

    #[inline]
    pub fn get_active_bank_mut(&mut self) -> &mut BankPattern {
        match self.current_bank {
            PatternBank::A => &mut self.bank_a,
            PatternBank::B => &mut self.bank_b,
        }
    }

    pub fn get_active_pattern(&self) -> [[u8; MAX_STEPS]; NUM_PADS] {
        let mut grid = [[0u8; MAX_STEPS]; NUM_PADS];
        let bank = self.get_active_bank();
        let ticks_step = self.resolution.ticks_per_step();
        let max_steps = self.resolution.steps_per_bar();

        for pad_idx in 0..NUM_PADS {
            let track = &bank.tracks[pad_idx];
            for i in 0..track.count {
                let ev = track.events[i];
                let step_idx = ((ev.tick as f32 + (ticks_step as f32 / 2.0)) / ticks_step as f32).floor() as usize;
                if step_idx < max_steps && step_idx < MAX_STEPS {
                    grid[pad_idx][step_idx] = ev.velocity;
                }
            }
        }
        grid
    }

    pub fn set_resolution(&mut self, resolution: StepResolution) {
        self.resolution = resolution;
        self.update_current_step();
    }

    pub fn set_bpm(&mut self, bpm: f32) {
        self.bpm = bpm.clamp(40.0, 300.0);
        self.recalculate_samples_per_tick();
    }

    fn recalculate_samples_per_tick(&mut self) {
        let seconds_per_tick = 60.0 / (self.bpm * TICKS_PER_BEAT as f32);
        self.samples_per_tick = self.sample_rate * seconds_per_tick;
    }

    pub fn toggle_bank(&mut self) -> PatternBank {
        match self.current_bank {
            PatternBank::A => {
                if !self.bank_b_initialized {
                    self.bank_b = self.bank_a;
                    self.bank_b_initialized = true;
                }
                self.current_bank = PatternBank::B;
            }
            PatternBank::B => {
                self.current_bank = PatternBank::A;
            }
        }
        self.current_bank
    }

    pub fn clear_all(&mut self) {
        self.save_undo_state();
        let bank = self.get_active_bank_mut();
        bank.clear();
    }

    pub fn clear_track(&mut self, pad_idx: usize) {
        if pad_idx < NUM_PADS {
            self.save_undo_state();
            let bank = self.get_active_bank_mut();
            bank.tracks[pad_idx].clear();
        }
    }

    pub fn toggle_step(&mut self, pad_idx: usize, step_idx: usize) -> u8 {
        if pad_idx < NUM_PADS && step_idx < self.resolution.steps_per_bar() {
            self.save_undo_state();
            let target_tick = (step_idx as u32 * self.resolution.ticks_per_step()) % TICKS_PER_BAR;
            let bank = self.get_active_bank_mut();
            if bank.tracks[pad_idx].remove_at_tick(target_tick) {
                0
            } else {
                bank.tracks[pad_idx].add_or_update(target_tick, target_tick, 127);
                127
            }
        } else {
            0
        }
    }

    /// Registra un golpe en vivo durante la grabación (Overdub) cuantizando al paso más cercano
    /// con ventana simétrica (50% antes / 50% después del pulso) y compensación de latencia de audio.
    /// Retorna el índice del paso cuantizado (0..max_steps-1), o -1 si no hubo cambio.
    pub fn record_quantized_hit(&mut self, pad_idx: usize, velocity: u8, latency_ms: f32) -> i32 {
        if pad_idx >= NUM_PADS || velocity == 0 {
            return -1;
        }

        // 1. Posición continua sub-tick en el instante exacto del evento
        let frac_tick = if self.samples_per_tick > 0.0 {
            (self.sample_accum / self.samples_per_tick).clamp(0.0, 0.999)
        } else {
            0.0
        };
        let raw_tick = self.current_tick as f32 + frac_tick;

        // 2. Compensar la latencia acústica de salida (lo que el usuario escucha vs el reloj del worklet)
        let ticks_per_ms = (self.bpm * TICKS_PER_BEAT as f32) / 60000.0;
        let latency_ticks = latency_ms.clamp(0.0, 120.0) * ticks_per_ms;
        let bar_ticks = TICKS_PER_BAR as f32;
        let compensated_tick = (raw_tick - latency_ticks + bar_ticks) % bar_ticks;

        // 3. Redondeo simétrico al paso más cercano: floor((tick + ticks_step / 2) / ticks_step) % max_steps
        let ticks_step_u32 = self.resolution.ticks_per_step();
        let ticks_step = ticks_step_u32 as f32;
        let max_steps = self.resolution.steps_per_bar();
        let quantized_step = (((compensated_tick + (ticks_step * 0.5)) / ticks_step).floor() as usize) % max_steps;
        let target_tick = (quantized_step as u32 * ticks_step_u32) % TICKS_PER_BAR;

        // 4. Si el golpe fue anticipado y cuantizado hacia adelante (target_tick está justo delante del playhead),
        // suprimir el redesencadenamiento automático en ese tick inmediato para evitar doble golpe (flam),
        // ya que el golpe en vivo del usuario acaba de sonar.
        let forward_dist = (target_tick + TICKS_PER_BAR - self.current_tick) % TICKS_PER_BAR;
        if forward_dist > 0 && forward_dist <= ticks_step_u32 {
            self.suppress_next_tick[pad_idx] = Some(target_tick);
        }

        // 5. Verificar si ya existía el evento en ese tick para solo guardar undo en notas nuevas
        let already_exists = {
            let bank = self.get_active_bank();
            let track = &bank.tracks[pad_idx];
            let mut found = false;
            for i in 0..track.count {
                if track.events[i].tick == target_tick && track.events[i].velocity > 0 {
                    found = true;
                    break;
                }
            }
            found
        };

        if !already_exists {
            self.save_undo_state();
        }

        let orig_tick = (compensated_tick.round() as u32) % TICKS_PER_BAR;
        let bank = self.get_active_bank_mut();
        bank.tracks[pad_idx].add_or_update(target_tick, orig_tick, velocity);

        quantized_step as i32
    }

    pub fn save_undo_state(&mut self) {
        let current = *self.get_active_bank();
        if self.undo_history.len() >= 16 {
            self.undo_history.remove(0);
        }
        self.undo_history.push(current);
    }

    pub fn undo(&mut self) -> bool {
        if let Some(prev) = self.undo_history.pop() {
            let bank = self.get_active_bank_mut();
            *bank = prev;
            true
        } else {
            false
        }
    }

    pub fn play(&mut self) {
        if !self.is_playing {
            self.is_playing = true;
            if self.is_paused {
                self.is_paused = false;
                self.need_start_trigger = false;
            } else {
                self.current_tick = 0;
                self.sample_accum = 0.0;
                self.suppress_next_tick = [None; NUM_PADS];
                self.update_current_step();
                self.need_start_trigger = true;
            }
        }
    }

    pub fn pause(&mut self) {
        self.is_playing = false;
        self.is_paused = true;
        self.need_start_trigger = false;
    }

    pub fn stop(&mut self) {
        self.is_playing = false;
        self.is_paused = false;
        self.current_tick = 0;
        self.current_step = 0;
        self.sample_accum = 0.0;
        self.need_start_trigger = false;
        self.suppress_next_tick = [None; NUM_PADS];
    }

    pub fn toggle_play(&mut self) -> bool {
        if self.is_playing {
            self.pause();
            false
        } else {
            self.play();
            true
        }
    }

    #[inline]
    fn update_current_step(&mut self) {
        let ticks_step = self.resolution.ticks_per_step();
        let max_steps = self.resolution.steps_per_bar();
        let step = (self.current_tick / ticks_step) as usize;
        self.current_step = step % max_steps;
    }

    /// Avanza un frame de audio sample-accurate.
    /// Retorna Some((nuevo_paso_visual, triggers_pad_nota_vel, cantidad)) si hubo disparos de notas en este frame.
    #[inline]
    pub fn advance_sample(&mut self) -> Option<(usize, [(usize, u8, u8); NUM_PADS], usize)> {
        if !self.is_playing {
            return None;
        }

        // 1. Disparo inmediato en tick 0 al arrancar
        if self.need_start_trigger {
            self.need_start_trigger = false;
            self.current_tick = 0;
            self.sample_accum = 0.0;
            self.update_current_step();

            let mut count = 0;
            let mut triggers = [(0usize, 0u8, 0u8); NUM_PADS];
            let bank = self.get_active_bank();
            for pad_idx in 0..NUM_PADS {
                let track = &bank.tracks[pad_idx];
                for i in 0..track.count {
                    if track.events[i].tick == 0 {
                        let note = DEFAULT_PAD_NOTES[pad_idx];
                        triggers[count] = (pad_idx, note, track.events[i].velocity);
                        count += 1;
                        break;
                    }
                }
            }

            return Some((self.current_step, triggers, count));
        }

        // 2. Acumulación fraccional de muestras por tick
        self.sample_accum += 1.0;
        if self.sample_accum >= self.samples_per_tick {
            self.sample_accum -= self.samples_per_tick;

            self.current_tick = (self.current_tick + 1) % TICKS_PER_BAR;
            self.update_current_step();

            let cur_tick = self.current_tick;
            let mut suppress = self.suppress_next_tick;
            let mut count = 0;
            let mut triggers = [(0usize, 0u8, 0u8); NUM_PADS];
            {
                let bank = self.get_active_bank();
                for pad_idx in 0..NUM_PADS {
                    let track = &bank.tracks[pad_idx];
                    for i in 0..track.count {
                        if track.events[i].tick == cur_tick {
                            if suppress[pad_idx] == Some(cur_tick) {
                                suppress[pad_idx] = None;
                            } else {
                                let note = DEFAULT_PAD_NOTES[pad_idx];
                                triggers[count] = (pad_idx, note, track.events[i].velocity);
                                count += 1;
                            }
                            break;
                        }
                    }
                }
            }
            self.suppress_next_tick = suppress;

            if count > 0 {
                return Some((self.current_step, triggers, count));
            }
        }

        None
    }
}
