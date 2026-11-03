"""Side B: a slow music-box "Jingle Bells" (Pierpont, 1857, public domain).

Celesta melody, soft electric-piano chords, a round bass and sleigh bells.
Rendered twice end to end and the second pass kept, so the reverb tail of
the last bar runs into the first and the file loops without a seam.
Run: python3 assets/3d/scripts/compose_side_b.py  (needs numpy, ffmpeg)
"""
import os
import subprocess
import numpy as np

SR = 44100
BPM = 100
BEAT = 60 / BPM
BARS = 16
LOOP = BARS * 4 * BEAT
rng = np.random.default_rng(7)

def hz(n):  # MIDI note -> Hz
    return 440.0 * 2 ** ((n - 69) / 12)

N = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def m(name, octave):
    return 12 * (octave + 1) + N[name[0]] + (1 if '#' in name else 0)

# Melody in C, beats. Two eight-bar halves with the two endings.
A = [('E',1),('E',1),('E',2), ('E',1),('E',1),('E',2), ('E',1),('G',1),('C+',1.5),('D',0.5), ('E',4)]
B1 = [('F',1),('F',1),('F',1.5),('F',0.5), ('F',1),('E',1),('E',1),('E',0.5),('E',0.5), ('E',1),('D',1),('D',1),('E',1), ('D',2),('G',2)]
B2 = [('F',1),('F',1),('F',1.5),('F',0.5), ('F',1),('E',1),('E',1),('E',0.5),('E',0.5), ('G',1),('G',1),('F',1),('D',1), ('C+',4)]
def pitch(n):
    if n == 'C+': return m('C', 5)
    return m(n, 5)
melody = A + B1 + A + B2
CHORDS = ['C', 'C', 'C', 'C', 'F', 'C', 'D7', 'G7', 'C', 'C', 'C', 'C', 'F', 'C', 'G7', 'C']
VOICE = {'C': [48, 55, 60, 64], 'F': [41, 53, 57, 60], 'D7': [50, 54, 57, 60], 'G7': [43, 53, 55, 59]}

length = int(LOOP * SR)
out = np.zeros((2, length * 2 + SR * 4))

def place(sig, t, pan=0.0, gain=1.0):
    i = int(t * SR)
    l = np.cos((pan + 1) * np.pi / 4) * gain
    r = np.sin((pan + 1) * np.pi / 4) * gain
    out[0, i:i + len(sig)] += sig * l
    out[1, i:i + len(sig)] += sig * r

def env(n, attack, decay):
    t = np.arange(n) / SR
    return np.minimum(1, t / attack) * np.exp(-t / decay)

def celesta(f, dur):
    n = int((dur + 1.6) * SR)
    t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.25)
         + 0.12 * np.sin(2 * np.pi * f * 4.01 * t) * np.exp(-t / 0.08))
    return s * env(n, 0.004, 0.55)

def epiano(f, dur):
    n = int((dur + 1.2) * SR)
    t = np.arange(n) / SR
    mod = np.sin(2 * np.pi * f * t) * 1.2 * np.exp(-t / 0.35)
    s = np.sin(2 * np.pi * f * t + mod) * (1 + 0.08 * np.sin(2 * np.pi * 4.5 * t))
    e = env(n, 0.01, 1.4)
    e[int(dur * SR):] *= np.exp(-np.arange(n - int(dur * SR)) / SR / 0.25)
    return s * e

def bass(f, dur):
    n = int((dur + 0.4) * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.1)
    return s * env(n, 0.006, 0.45)

def bells(accent):
    n = int(0.18 * SR)
    noise = rng.standard_normal(n)
    # A cluster of high partials, jingling.
    t = np.arange(n) / SR
    jingle = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) for f in (5200, 6300, 7400, 8900))
    s = (0.5 * noise + 0.4 * jingle) * env(n, 0.002, 0.04)
    hp = np.diff(s, prepend=0)  # crude high-pass
    return hp * accent

def kick():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    f = 55 + 60 * np.exp(-t / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.12)

for p in range(2):
    base = p * LOOP
    # Melody, with a little swing on the off-beat eighths.
    t = 0.0
    for note, beats in melody:
        f = hz(pitch(note))
        place(celesta(f, beats * BEAT), base + t * BEAT, pan=-0.15, gain=0.32)
        place(celesta(f * 2, beats * BEAT), base + t * BEAT + 0.012, pan=0.3, gain=0.06)
        t += beats
    for bar, ch in enumerate(CHORDS):
        b0 = base + bar * 4 * BEAT
        v = VOICE[ch]
        # Bass on 1 and 3: root, then the fifth.
        place(bass(hz(v[0] - 12 if v[0] > 45 else v[0]), BEAT * 1.6), b0, gain=0.34)
        place(bass(hz(v[0] - 5 if v[0] > 45 else v[0] + 7), BEAT * 1.6), b0 + 2 * BEAT, gain=0.28)
        # Soft chords on 2 and 4.
        for beat in (1, 3):
            for k, n in enumerate(v[1:]):
                place(epiano(hz(n), BEAT * 0.9), b0 + beat * BEAT + k * 0.008, pan=0.25 - k * 0.2, gain=0.075)
        # Sleigh bells on the eighths, swung; a soft kick on 1 and 3.
        for e in range(8):
            swing = 0.06 * BEAT if e % 2 else 0
            place(bells(0.5 if e % 2 else 0.8), b0 + e * 0.5 * BEAT + swing, pan=0.45, gain=0.09)
        for beat in (0, 2):
            place(kick(), b0 + beat * BEAT, gain=0.22)

mix = out[:, length:length * 2].copy()
# Room: a short stereo reverb, applied circularly so the loop stays seamless.
def reverb(x, seed):
    n = len(x)
    r = np.random.default_rng(seed)
    ir_n = int(1.8 * SR)
    ir = r.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / SR / 0.45)
    ir[0] = 0
    X = np.fft.rfft(x)
    IR = np.fft.rfft(ir, n)
    return np.fft.irfft(X * IR, n) * 0.012
wet = np.stack([reverb(mix[0], 1), reverb(mix[1], 2)])
mix = mix + wet
# Gentle low-pass for warmth.
for c in range(2):
    y = np.zeros_like(mix[c]); a = 0.55; prev = mix[c][-1]
    for i in range(0, len(y)):
        prev = prev + a * (mix[c][i] - prev); y[i] = prev
    mix[c] = y
mix = mix / np.max(np.abs(mix)) * 0.86

root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
raw = os.path.join('/tmp', 'side-b.f32')
mix.T.astype(np.float32).tofile(raw)
dest = os.path.join(root, 'audio', 'side-b.mp3')
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', raw,
                '-b:a', '192k', dest], check=True)
os.remove(raw)
print('wrote', dest, round(LOOP, 2), 's')
