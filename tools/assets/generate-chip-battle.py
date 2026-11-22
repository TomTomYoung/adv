"""Render ADV's pulse cues and stepped-noise contact with only the standard library."""
from array import array
from math import exp, pi, sin, tanh
from pathlib import Path
import sys
import wave

RATE = 44100
DEST = Path(__file__).resolve().parents[2] / 'assets/audio/se'


def write(name, samples, peak):
    gain = peak * 32767 / max(abs(v) for v in samples)
    pcm = array('h', (round(v * gain) for v in samples))
    if sys.byteorder != 'little':
        pcm.byteswap()
    with wave.open(str(DEST / (name + '.wav')), 'wb') as wav:
        wav.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        wav.writeframes(pcm.tobytes())


def pulse_cue(notes, duty, body):
    # Synthesize harmonics below Nyquist and keep oscillator phase across pitch steps.
    phase = 0.0
    result = []
    for step, (pitch, ms) in enumerate(notes):
        frames = round(ms * RATE / 1000)
        harmonics = [(n, sin(pi * n * duty) / n) for n in range(1, min(17, int(11000 / pitch)) + 1)]
        for i in range(frames):
            t = i / RATE
            phase += 2 * pi * pitch / RATE
            edge = min(1, (i + 1) / 22, (frames - i) / 24)
            pulse = sum(g * sin(n * phase) for n, g in harmonics)
            tone = pulse + body * sin(phase / 2)
            result.append(tanh(1.15 * tone) * edge * (.84 + .16 * exp(-t / .009)) * (1 if step < 3 else .93))
    return result


def contact():
    # Clock a 15-bit noise register at stepped rates. The short pitched knock gives the hit weight.
    result = []
    reg, frac, prev, hp, angle = 0x4e35, 0.0, 0.0, 0.0, 0.0
    for hz, ms, level in [(8300, 12, 1), (4400, 25, .98), (2600, 31, .93), (3550, 25, .88),
                          (1700, 36, .77), (940, 28, .60), (510, 31, .36)]:
        for _ in range(round(ms * RATE / 1000)):
            t = len(result) / RATE
            frac += hz / RATE
            if frac >= 1:
                frac -= 1
                reg = (reg >> 1) | (((reg ^ (reg >> 1)) & 1) << 14)
            raw = (reg & 1) * 2 - 1
            hp = .982 * (hp + raw - prev)
            prev = raw
            angle += 2 * pi * (90 + 166 * exp(-t / .022)) / RATE
            edge = min(1, t / .001, max(0, (.188 - t) / .016))
            result.append(edge * tanh(level * (.8 * hp + .72 * exp(-t / .065) * sin(angle))))
    return result


write('se_chip_ally', pulse_cue([(1460, 29), (1620, 33), (1340, 34), (1475, 30), (1650, 33), (1310, 39)], .27, .22), .84)
write('se_chip_enemy', pulse_cue([(548, 34), (438, 30), (622, 35), (541, 34), (458, 30), (590, 39)], .43, .30), .87)
write('se_chip_contact', contact(), .91)
