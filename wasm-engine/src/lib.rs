use wasm_bindgen::prelude::*;
use rustysynth::{SoundFont, Synthesizer, SynthesizerSettings};
use std::sync::Arc;
use std::io::Cursor;

mod fx;
use fx::AudioFxRack;

mod arpeggiator;
use arpeggiator::{Arpeggiator, ArpMode, ArpRate, ArpOutputEvent};

mod sequencer;
use sequencer::{StepSequencer, StepResolution, NUM_PADS, MAX_STEPS};

#[wasm_bindgen]
pub struct WasmEngine {
    synthesizer: Option<Synthesizer>,
    sample_rate: f32,
    fx_rack: AudioFxRack,
    arpeggiator: Arpeggiator,
    sequencer: StepSequencer,
    bpm: f32,
}

#[wasm_bindgen]
impl WasmEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32) -> Self {
        Self {
            synthesizer: None,
            sample_rate,
            fx_rack: AudioFxRack::new(sample_rate),
            arpeggiator: Arpeggiator::new(sample_rate),
            sequencer: StepSequencer::new(sample_rate),
            bpm: 120.0,
        }
    }

    pub fn load_soundfont(&mut self, sf2_bytes: &[u8]) -> Result<(), JsValue> {
        let mut cursor = Cursor::new(sf2_bytes);
        let sf = Arc::new(SoundFont::new(&mut cursor).map_err(|e| JsValue::from_str(&e.to_string()))?);
        let settings = SynthesizerSettings::new(self.sample_rate as i32);
        let synth = Synthesizer::new(&sf, &settings).map_err(|e| JsValue::from_str(&e.to_string()))?;
        self.synthesizer = Some(synth);
        Ok(())
    }

    pub fn set_bpm(&mut self, bpm: f32) {
        self.bpm = bpm.clamp(30.0, 300.0);
        self.sequencer.set_bpm(self.bpm);
    }

    pub fn get_bpm(&self) -> f32 {
        self.bpm
    }

    pub fn update_arp_params(&mut self, enabled: bool, hold: bool, mode_str: &str, rate_str: &str, octaves: u8, bpm: f32) {
        self.bpm = bpm.clamp(30.0, 300.0);
        if !enabled {
            if self.arpeggiator.enabled {
                self.arpeggiator.set_enabled(false);
                if let Some(synth) = &mut self.synthesizer {
                    synth.note_off_all(false);
                }
            }
            return;
        }

        self.arpeggiator.set_enabled(true);
        self.arpeggiator.set_hold(hold);
        self.arpeggiator.set_mode(ArpMode::from_str(mode_str));
        self.arpeggiator.set_rate(ArpRate::from_str(rate_str));
        self.arpeggiator.set_octaves(octaves);
    }

    pub fn set_arp_enabled(&mut self, enabled: bool) {
        if !enabled && self.arpeggiator.enabled {
            self.arpeggiator.set_enabled(false);
            if let Some(synth) = &mut self.synthesizer {
                synth.note_off_all(false);
            }
        } else if enabled {
            self.arpeggiator.set_enabled(true);
        }
    }

    pub fn is_arp_enabled(&self) -> bool {
        self.arpeggiator.enabled
    }

    pub fn set_arp_hold(&mut self, hold: bool) {
        self.arpeggiator.set_hold(hold);
    }

    pub fn set_arp_mode(&mut self, mode_str: &str) {
        self.arpeggiator.set_mode(ArpMode::from_str(mode_str));
    }

    pub fn set_arp_rate(&mut self, rate_str: &str) {
        self.arpeggiator.set_rate(ArpRate::from_str(rate_str));
    }

    pub fn set_arp_octaves(&mut self, octaves: u8) {
        self.arpeggiator.set_octaves(octaves);
    }

    pub fn note_on(&mut self, channel: i32, key: i32, velocity: i32) {
        if channel == 0 && self.arpeggiator.enabled {
            self.arpeggiator.handle_note_on(key as u8, velocity as u8);
        } else if let Some(synth) = &mut self.synthesizer {
            synth.note_on(channel, key, velocity);
        }
    }

    pub fn note_off(&mut self, channel: i32, key: i32) {
        if channel == 0 && self.arpeggiator.enabled {
            self.arpeggiator.handle_note_off(key as u8);
        } else if let Some(synth) = &mut self.synthesizer {
            synth.note_off(channel, key);
        }
    }

    pub fn note_off_all(&mut self, immediate: bool) {
        self.arpeggiator.reset();
        if let Some(synth) = &mut self.synthesizer {
            synth.note_off_all(immediate);
        }
    }

    pub fn set_pitch_bend(&mut self, channel: i32, bend: i32) {
        if let Some(synth) = &mut self.synthesizer {
            let raw = (bend + 8192).clamp(0, 16383);
            let lsb = raw & 0x7F;
            let msb = (raw >> 7) & 0x7F;
            synth.process_midi_message(channel, 0xE0, lsb, msb);
        }
    }

    pub fn set_mod_wheel(&mut self, channel: i32, value_7bit: i32) {
        if let Some(synth) = &mut self.synthesizer {
            let val = value_7bit.clamp(0, 127);
            synth.process_midi_message(channel, 0xB0, 1, val);
        }
    }

    pub fn set_program(&mut self, channel: i32, patch: i32, bank: i32) {
        if let Some(synth) = &mut self.synthesizer {
            synth.note_off_all(false);
            synth.process_midi_message(channel, 0xB0, 0, bank);
            synth.process_midi_message(channel, 0xB0, 32, 0);
            synth.process_midi_message(channel, 0xC0, patch, 0);
        }
    }

    pub fn set_knob(&mut self, knob_idx: usize, val_7bit: f32) {
        self.fx_rack.set_knob_7bit(knob_idx, val_7bit);
    }

    pub fn set_master_fader(&mut self, val_7bit: f32) {
        self.fx_rack.set_master_fader_7bit(val_7bit);
    }

    pub fn set_fx_routing(&mut self, routing: &str) {
        self.fx_rack.set_routing_str(routing);
    }

    // === Métodos del Secuenciador Rítmico (Bloque 4) ===

    pub fn seq_play(&mut self) {
        self.sequencer.play();
    }

    pub fn seq_pause(&mut self) {
        self.sequencer.pause();
    }

    pub fn seq_stop(&mut self) {
        self.sequencer.stop();
        if let Some(synth) = &mut self.synthesizer {
            for note in sequencer::DEFAULT_PAD_NOTES {
                synth.note_off(9, note as i32);
                synth.note_off(0, note as i32);
            }
        }
    }

    pub fn seq_toggle_play(&mut self) -> bool {
        let is_playing = self.sequencer.toggle_play();
        if !is_playing {
            if let Some(synth) = &mut self.synthesizer {
                for note in sequencer::DEFAULT_PAD_NOTES {
                    synth.note_off(9, note as i32);
                    synth.note_off(0, note as i32);
                }
            }
        }
        is_playing
    }

    pub fn seq_is_playing(&self) -> bool {
        self.sequencer.is_playing
    }

    pub fn seq_get_current_step(&self) -> usize {
        self.sequencer.current_step
    }

    pub fn seq_toggle_step(&mut self, pad_idx: usize, step_idx: usize) -> u8 {
        self.sequencer.toggle_step(pad_idx, step_idx)
    }

    pub fn seq_clear_track(&mut self, pad_idx: usize) {
        self.sequencer.clear_track(pad_idx);
    }

    pub fn seq_clear_all(&mut self) {
        self.sequencer.clear_all();
    }

    pub fn seq_set_resolution(&mut self, res_str: &str) {
        self.sequencer.set_resolution(StepResolution::from_str(res_str));
    }

    pub fn seq_toggle_bank(&mut self) -> String {
        let bank = self.sequencer.toggle_bank();
        match bank {
            sequencer::PatternBank::A => "a".to_string(),
            sequencer::PatternBank::B => "b".to_string(),
        }
    }

    pub fn seq_undo(&mut self) -> bool {
        self.sequencer.undo()
    }

    pub fn seq_get_pattern_flat(&self) -> Vec<u8> {
        let pattern = self.sequencer.get_active_pattern();
        let mut flat = Vec::with_capacity(NUM_PADS * MAX_STEPS);
        for pad in 0..NUM_PADS {
            for step in 0..MAX_STEPS {
                flat.push(pattern[pad][step]);
            }
        }
        flat
    }

    pub fn render(&mut self, left: &mut [f32], right: &mut [f32]) {
        let len = left.len().min(right.len());
        if len == 0 {
            return;
        }

        if let Some(synth) = &mut self.synthesizer {
            if self.arpeggiator.enabled || self.sequencer.is_playing {
                let mut current_frame = 0;
                while current_frame < len {
                    let mut next_event_frame = len;
                    let mut pending_event = None;

                    for f in current_frame..len {
                        // 1. Avance del secuenciador rítmico en cada sample
                        if let Some((_step, triggers, count)) = self.sequencer.advance_sample() {
                            for i in 0..count {
                                let (note, vel) = triggers[i];
                                synth.note_off(9, note as i32);
                                synth.note_on(9, note as i32, vel as i32);
                                synth.note_off(0, note as i32);
                                synth.note_on(0, note as i32, vel as i32);
                            }
                        }

                        // 2. Avance del arpegiador
                        if self.arpeggiator.enabled {
                            if let Some(event) = self.arpeggiator.advance_sample(self.bpm) {
                                next_event_frame = f;
                                pending_event = Some(event);
                                break;
                            }
                        }
                    }

                    let chunk_len = next_event_frame - current_frame;
                    if chunk_len > 0 {
                        synth.render(&mut left[current_frame..next_event_frame], &mut right[current_frame..next_event_frame]);
                        current_frame = next_event_frame;
                    }

                    if let Some(event) = pending_event {
                        match event {
                            ArpOutputEvent::NoteTrigger { note, velocity } => {
                                synth.note_on(0, note as i32, velocity as i32);
                            }
                            ArpOutputEvent::NoteRelease { note } => {
                                synth.note_off(0, note as i32);
                            }
                        }
                    }
                }
            } else {
                synth.render(left, right);
            }

            // Procesamiento de efectos en cascada + master fader + soft limiter
            for i in 0..len {
                let (proc_l, proc_r) = self.fx_rack.process_stereo_frame(left[i], right[i]);
                left[i] = proc_l;
                right[i] = proc_r;
            }
        } else {
            left.fill(0.0);
            right.fill(0.0);
        }
    }
}
