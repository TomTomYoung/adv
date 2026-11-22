"""Render the original battle skill cues as mono 32 kHz PCM. Python standard library."""
from array import array
from math import cos, exp, pi, sin, tanh
from pathlib import Path
from random import Random
import sys
import wave

RATE = 32000
DEST = Path(__file__).resolve().parents[2] / 'assets/audio/se'


class Clip:
    def __init__(self, name):
        self.name = name
        self.samples = []
        self.random = Random(name)

    def layer(self, wave_type, start_ms, length_ms, pitch, end_pitch, gain, decay=2, duty=.25):
        offset = round(start_ms * RATE / 1000)
        frames = round(length_ms * RATE / 1000)
        self.samples.extend([0.] * max(0, offset + frames - len(self.samples)))
        phase = low = previous = 0.
        value = self.random.uniform(-1, 1)
        for i in range(frames):
            t = i / frames
            hz = pitch * (end_pitch / pitch) ** t
            phase += hz / RATE
            if phase >= 1:
                phase -= 1
                if wave_type == 'noise':
                    value = self.random.uniform(-1, 1)
            angle = 2 * pi * phase
            if wave_type == 'noise':
                low += .55 * (value - low)
                previous += .035 * (low - previous)
                sample = low - previous
            elif wave_type == 'pulse':
                # Five harmonics are sufficient for the narrow, buzzy pitched attacks.
                sample = sum(sin(pi * n * duty) * cos(n * angle) / n for n in range(1, 6))
            elif wave_type == 'bell':
                sample = sin(angle) + .34 * sin(2 * pi * (i / RATE) * pitch * 2.73) * exp(-3*t)
            elif wave_type == 'triangle':
                sample = 1 - 4 * abs(phase - .5)
            else:
                sample = sin(angle)
            edge = min(1, i / 32, (frames - 1 - i) / min(frames / 3, 220))
            self.samples[offset + i] += gain * edge * exp(-decay * t) * sample

    def rhythm(self, wave_type, notes, gain, decay=1.5):
        for start, duration, pitch, end in notes:
            self.layer(wave_type, start, duration, pitch, end, gain, decay)

    def impact(self, start, length, pitch, hiss, weight=1):
        self.layer('sine', start, length, pitch * 2.8, pitch, weight, 3)
        self.layer('noise', start, length * .68, hiss, hiss / 4, .95 * weight, 2.8)

    def save(self):
        shaped = [tanh(1.2 * value) for value in self.samples]
        scale = .88 * 32767 / max(map(abs, shaped))
        frames = array('h', (round(x * scale) for x in shaped))
        if sys.byteorder != 'little':
            frames.byteswap()
        with wave.open(str(DEST / f'se_skill_{self.name}.wav'), 'wb') as out:
            out.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
            out.writeframes(frames.tobytes())


def physical():
    c = Clip('smash')
    c.impact(0, 175, 62, 6900); c.impact(46, 114, 92, 3900, .66)
    c.layer('triangle', 0, 116, 370, 70, .8, 2.1); c.save()
    c = Clip('cleave')
    c.rhythm('noise', [(0, 46, 1500, 12900), (48, 93, 10300, 1800)], 1)
    c.layer('pulse', 4, 86, 720, 155, .55); c.impact(47, 109, 83, 8200); c.save()
    c = Clip('thrust')
    c.layer('pulse', 0, 39, 360, 1540, .79)
    c.rhythm('bell', [(29, 69, 1240, 780), (65, 71, 802, 470)], .68)
    c.impact(32, 108, 104, 9900); c.save()
    c = Clip('volley')
    for start, pitch in [(0, 1180), (43, 1460), (84, 1740)]:
        c.layer('triangle', start, 38, pitch, pitch / 3, .87)
        c.impact(start + 19, 62, 125, 10500, .8)
    c.save()


def elemental():
    c = Clip('fire')
    c.layer('noise', 0, 180, 12800, 1100, 1.12, 1.5)
    c.rhythm('pulse', [(0, 38, 430, 700), (36, 103, 355, 94)], .86)
    c.impact(26, 149, 70, 7600); c.save()
    c = Clip('inferno')
    for start, hz, length in [(0, 205, 88), (54, 280, 96), (114, 185, 162)]:
        c.impact(start, length, hz / 3, 11500, .96)
        c.layer('pulse', start, length, hz * 2, hz / 2, .77)
    c.save()
    c = Clip('ice')
    c.rhythm('bell', [(0, 66, 1740, 1460), (23, 75, 2350, 1850), (67, 95, 1175, 820)], .85)
    c.impact(53, 96, 148, 13900); c.save()
    c = Clip('glacier')
    c.rhythm('triangle', [(0, 32, 1850, 840), (31, 35, 2330, 1090), (64, 34, 2800, 1370)], .93)
    c.impact(94, 146, 86, 13500); c.layer('bell', 96, 140, 1640, 1510, .73); c.save()
    c = Clip('bolt')
    for start, pitch in [(0, 1290), (31, 1950), (63, 820)]:
        c.layer('pulse', start, 29, pitch, pitch / 4, .96, .75)
        c.layer('noise', start, 23, 13700, 3500, 1.05)
    c.impact(66, 118, 65, 4500); c.save()
    c = Clip('storm')
    c.rhythm('pulse', [(0, 29, 1670, 310), (39, 24, 2130, 460), (83, 39, 1480, 210)], .96, .65)
    c.impact(6, 47, 121, 12500); c.impact(87, 180, 56, 13700)
    c.layer('noise', 139, 133, 3800, 580, .86); c.save()
    c = Clip('light')
    c.rhythm('bell', [(0, 71, 780, 790), (26, 75, 1190, 1190), (58, 118, 1560, 1550)], .87)
    c.impact(56, 105, 124, 10700); c.save()
    c = Clip('shadow')
    c.rhythm('pulse', [(0, 61, 370, 349), (50, 68, 311, 277), (109, 115, 185, 69)], .88, .86)
    c.layer('triangle', 9, 189, 183, 78, .78); c.impact(108, 103, 61, 2900); c.save()
    c = Clip('root')
    for start, hz in [(0, 4800), (32, 2500), (91, 3600)]:
        c.layer('noise', start, 43, hz, 780, 1.12)
    c.rhythm('triangle', [(10, 76, 240, 80), (90, 117, 184, 57)], 1.04); c.save()
    c = Clip('tide')
    c.rhythm('sine', [(0, 56, 360, 1010), (35, 77, 510, 180), (84, 104, 750, 270)], .89)
    c.layer('noise', 34, 145, 6100, 1750, .83); c.impact(79, 97, 99, 4900, .75); c.save()
    c = Clip('venom')
    c.rhythm('pulse', [(0, 39, 870, 290), (47, 53, 655, 210), (103, 75, 425, 108)], .81, 1)
    c.layer('noise', 0, 92, 8100, 1670, .9); c.save()


def support():
    c = Clip('heal')
    c.rhythm('triangle', [(0, 74, 440, 440), (40, 81, 554, 554), (82, 128, 740, 740)], .96)
    c.layer('bell', 82, 125, 1480, 1480, .36, 3); c.save()
    c = Clip('grace')
    c.rhythm('bell', [(0, 91, 370, 370), (39, 103, 554, 554), (78, 130, 740, 740),
                      (119, 139, 932, 932)], .84)
    c.layer('triangle', 114, 145, 466, 466, .65); c.save()
    c = Clip('cleanse')
    c.layer('noise', 0, 58, 1500, 9500, .9)
    c.rhythm('bell', [(24, 108, 1080, 1080), (78, 119, 1620, 1620)], .86); c.save()
    c = Clip('ward')
    c.impact(0, 100, 112, 7300, .91)
    c.rhythm('triangle', [(0, 55, 278, 278), (53, 125, 417, 417)], .93, .95)
    c.layer('bell', 53, 98, 835, 835, .43); c.save()
    c = Clip('chant')
    c.rhythm('pulse', [(0, 44, 330, 330), (55, 35, 440, 440), (104, 88, 550, 550)], .83, .75)
    c.rhythm('triangle', [(0, 61, 165, 165), (104, 104, 275, 275)], .77); c.save()
    c = Clip('focus')
    c.rhythm('triangle', [(0, 51, 530, 560), (52, 42, 820, 820), (111, 105, 1120, 1120)], .88)
    c.layer('bell', 111, 91, 560, 560, .47); c.save()
    c = Clip('drain')
    c.rhythm('pulse', [(0, 67, 695, 380), (74, 68, 520, 215), (152, 74, 260, 128)], .78)
    c.layer('sine', 16, 173, 278, 91, .81); c.save()


if __name__ == '__main__':
    physical()
    elemental()
    support()
