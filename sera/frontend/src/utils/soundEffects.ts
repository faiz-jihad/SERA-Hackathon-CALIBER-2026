/**
 * SERA Industrial Audio Engine (Web Audio API)
 * Synthesizes tactile micro-clicks, alarm pulses, success chimes, and alert tones
 * without relying on external mp3/wav assets (100% offline, zero latency).
 * All methods are fail-safe with defensive try-catch guards.
 */

class IndustrialAudioEngine {
  private ctx: AudioContext | null = null
  private enabled: boolean = true

  constructor() {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('sera_audio_enabled')
        this.enabled = saved !== null ? saved === 'true' : true
      }
    } catch {
      this.enabled = true
    }
  }

  private getContext(): AudioContext | null {
    try {
      if (typeof window === 'undefined') return null
      if (!this.ctx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtxClass) {
          this.ctx = new AudioCtxClass()
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {})
      }
      return this.ctx
    } catch {
      return null
    }
  }

  public isEnabled(): boolean {
    return this.enabled
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sera_audio_enabled', enabled ? 'true' : 'false')
      }
    } catch {
      // ignore
    }
    if (enabled) {
      this.playClick()
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled)
    return this.enabled
  }

  /**
   * Tactile micro-click for table row selection, tab switches, and filter clicks.
   * Very short, subtle high-frequency transient.
   */
  public playClick(): void {
    if (!this.enabled) return
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(1400, now)
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.03)

      gain.gain.setValueAtTime(0.06, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.035)
    } catch {
      // Fail-safe: ignore audio errors
    }
  }

  /**
   * Industrial Trip / Critical Alarm Pulse.
   * Two alternating tones (880 Hz -> 587 Hz) designed like SCADA panel enunciators.
   */
  public playAlarm(): void {
    if (!this.enabled) return
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(1600, now)

      osc.type = 'triangle'
      // Tone 1: 880Hz
      osc.frequency.setValueAtTime(880, now)
      // Tone 2: 587.33Hz (D5)
      osc.frequency.setValueAtTime(587.33, now + 0.12)
      // Tone 1 repeat: 880Hz
      osc.frequency.setValueAtTime(880, now + 0.24)

      gain.gain.setValueAtTime(0.09, now)
      gain.gain.setValueAtTime(0.09, now + 0.32)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.4)
    } catch {
      // Fail-safe: ignore audio errors
    }
  }

  /**
   * Warning / Attention Alert Chime.
   * Gentle, warm prompt for ISO Zone C warnings or non-critical anomalies.
   */
  public playWarning(): void {
    if (!this.enabled) return
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, now)
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.18)

      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.25)
    } catch {
      // Fail-safe: ignore audio errors
    }
  }

  /**
   * Success / Authorization Chime.
   * Clean 3-note ascending arpeggio (C5 -> E5 -> G5) for Work Order approval,
   * live telemetry transmission, or batch ingest completion.
   */
  public playSuccess(): void {
    if (!this.enabled) return
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const notes = [523.25, 659.25, 783.99] // C5, E5, G5
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime + idx * 0.07
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now)

        gain.gain.setValueAtTime(0.07, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now)
        osc.stop(now + 0.18)
      })
    } catch {
      // Fail-safe: ignore audio errors
    }
  }

  /**
   * Soft notification ping for search or navigation focus.
   */
  public playNotification(): void {
    if (!this.enabled) return
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(659.25, now)
      osc.frequency.setValueAtTime(880, now + 0.08)

      gain.gain.setValueAtTime(0.06, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.22)
    } catch {
      // Fail-safe: ignore audio errors
    }
  }
}

export const soundEffects = new IndustrialAudioEngine()
export default soundEffects
