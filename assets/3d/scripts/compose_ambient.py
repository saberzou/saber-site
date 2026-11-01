"""An original ambient loop for the cassette player.

Slow, warm pad chords in F, a few music-box notes with echo, and a little
tape hiss. The tail is folded back onto the start so the loop is seamless.
Everything here is synthesized, so the track has no licensing strings.

Run: python3 assets/3d/scripts/compose_ambient.py
Writes assets/3d/audio/side-a.mp3 (needs numpy, scipy and ffmpeg).
"""
import os
import subprocess
import numpy as np
from scipy.signal import butter, sosfilt

SR = 44100
BAR = 9.0                 # seconds per chord
CHORDS = [                # MIDI notes, voiced low and open
    [41, 53, 57, 60, 64, 67],   # Fmaj9
    [45, 52, 57, 60, 64, 67],   # Am7
    [38, 50, 57, 60, 64, 65],   # Dm9
    [46, 53, 57, 62, 64, 69],   # Bbmaj7#11
    [41, 53, 57, 60, 64, 69],   # Fmaj6/9
    [45, 52, 59, 60, 64, 67],   # Am(add9)
    [43, 50, 57, 59, 62, 67],   # G6sus
    [36, 48, 55, 58, 64, 67],   # C7sus
]
LOOP = BAR * len(CHORDS)  # 72 seconds
TAIL = 8.0
N = int(SR * (LOOP + TAIL))
t = np.arange(N) / SR
rng = np.random.default_rng(7)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env(start, length, attack, release):
    e = np.zeros(N)
    a = int(SR * start)
    n = int(SR * (length + release))
    x = np.arange(n) / SR
    shape = np.minimum(1, x / attack) * np.where(x > length, np.exp(-(x - length) / (release / 4)), 1)
    shape = np.where(x < attack, np.sin(0.5 * np.pi * x / attack) ** 2, shape)
    end = min(N, a + n)
    e[a:end] = shape[: end - a]
    return e


def pad():
    left = np.zeros(N)
    right = np.zeros(N)
    for i, chord in enumerate(CHORDS):
        e = env(i * BAR, BAR, 3.2, 5.0)
        for j, m in enumerate(chord):
            f = hz(m)
            amp = 0.11 if j == 0 else 0.055
            for det, pan in ((-0.07, 0.25), (0.07, 0.75)):
                ff = f * 2 ** (det / 12)
                wob = 0.0025 * np.sin(2 * np.pi * (0.13 + 0.03 * j) * t + j)
                ph = 2 * np.pi * ff * t * (1 + wob)
                tone = np.sin(ph) + 0.28 * np.sin(2 * ph + 0.3) + 0.08 * np.sin(3 * ph)
                left += tone * e * amp * (1 - pan)
                right += tone * e * amp * pan
    sos = butter(2, 1400, "low", fs=SR, output="sos")
    return sosfilt(sos, left), sosfilt(sos, right)


def bells():
    left = np.zeros(N)
    right = np.zeros(N)
    scale = [65, 67, 69, 72, 74, 77, 79, 81]  # F major pentatonic, upper octave
    beat = BAR / 6
    for step in range(int(LOOP / beat)):
        if rng.random() > 0.42:
            continue
        start = step * beat + rng.uniform(0, 0.06)
        m = scale[rng.integers(len(scale))]
        f = hz(m)
        n = int(SR * 4.5)
        a = int(SR * start)
        x = np.arange(n) / SR
        tone = (np.sin(2 * np.pi * f * x) + 0.35 * np.sin(2 * np.pi * f * 2.76 * x) * np.exp(-x * 3)) * np.exp(-x * 1.4)
        tone *= np.minimum(1, x / 0.004) * 0.06
        pan = rng.uniform(0.2, 0.8)
        end = min(N, a + n)
        left[a:end] += tone[: end - a] * (1 - pan)
        right[a:end] += tone[: end - a] * pan
    # Ping-pong echo.
    d = int(SR * beat * 0.75)
    for k in range(1, 5):
        g = 0.42 ** k
        sl, sr_ = (right, left) if k % 2 else (left, right)
        left[d * k:] += sl[: N - d * k] * g * 0.6
        right[d * k:] += sr_[: N - d * k] * g * 0.6
    return left, right


def hiss():
    noise = rng.normal(0, 1, (2, N))
    sos = butter(2, [2500, 9000], "band", fs=SR, output="sos")
    return sosfilt(sos, noise) * 0.004


def main():
    pl, pr = pad()
    bl, br = bells()
    h = hiss()
    left = pl + bl + h[0]
    right = pr + br + h[1]
    # Fold the tail onto the head so the loop point is seamless.
    loop_n = int(SR * LOOP)
    left[: N - loop_n] += left[loop_n:]
    right[: N - loop_n] += right[loop_n:]
    mix = np.stack([left[:loop_n], right[:loop_n]], axis=1)
    mix *= 0.6 / np.max(np.abs(mix))
    pcm = (mix * 32767).astype("<i2")
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    out = os.path.join(root, "audio", "side-a.mp3")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-",
         "-codec:a", "libmp3lame", "-b:a", "96k", out],
        input=pcm.tobytes(), check=True,
    )
    print("wrote", out, os.path.getsize(out), "bytes", LOOP, "seconds")


if __name__ == "__main__":
    main()
