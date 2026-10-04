import wave
import struct
import math
import random

SAMPLE_RATE = 44100

def write_wav(filename, samples, sample_rate=SAMPLE_RATE):
    # Normalize and write 16-bit mono WAV
    max_val = max(abs(s) for s in samples) if samples else 1.0
    if max_val == 0:
        max_val = 1.0
    # Peak limit to 0.8 to prevent clipping and keep quiet
    scale = 0.8 / max_val
    with wave.open(filename, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2) # 16-bit
        wav_file.setframerate(sample_rate)
        raw_data = bytearray()
        for s in samples:
            val = int(max(min(s * scale, 0.999), -0.999) * 32767)
            raw_data.extend(struct.pack('<h', val))
        wav_file.writeframes(raw_data)
    print(f"Generated {filename} ({len(samples)} samples, {len(samples)/sample_rate:.2f}s)")

# 1. Curtain swipe: soft fabric whoosh (~0.45s)
def generate_curtain_swipe():
    duration = 0.45
    n_samples = int(duration * SAMPLE_RATE)
    samples = []
    # Bandpassed noise sweep
    filter_state = 0.0
    for i in range(n_samples):
        t = i / SAMPLE_RATE
        # Envelope: smooth rise and fall
        envelope = math.sin(math.pi * (t / duration)) ** 1.5
        noise = (random.random() * 2.0 - 1.0)
        # Lowpass filter with sweeping cutoff
        cutoff = 0.08 + 0.15 * math.sin(math.pi * (t / duration))
        filter_state += cutoff * (noise - filter_state)
        # Add soft airy resonance
        air = math.sin(2.0 * math.pi * 320.0 * t) * 0.15
        samples.append((filter_state + air) * envelope * 0.45)
    return samples

# 2. Bed tone: soft nighttime room tone / gentle hum loop (~3.0s seamless)
def generate_bed_tone():
    duration = 3.0
    n_samples = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n_samples):
        t = i / SAMPLE_RATE
        phase = 2.0 * math.pi * (i / n_samples)
        # Deep gentle warm hum at 55Hz (A1) and 110Hz (A2)
        hum1 = math.sin(2.0 * math.pi * 55.0 * t) * 0.4
        hum2 = math.sin(2.0 * math.pi * 110.0 * t + 0.3) * 0.2
        hum3 = math.sin(2.0 * math.pi * 165.0 * t + 0.7) * 0.08
        # Gentle breathing modulation
        breath = 0.75 + 0.25 * math.sin(phase)
        # Soft tape hiss / room air
        noise = (random.random() * 2.0 - 1.0) * 0.04
        s = (hum1 + hum2 + hum3 + noise) * breath * 0.3
        samples.append(s)
    return samples

# 3. Thinking loop: quiet contemplative gentle chime / page rustle loop (~3.0s seamless)
def generate_thinking_loop():
    duration = 3.0
    n_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * n_samples
    
    # Add a soft warm chime at t=0.2s and t=1.7s
    chime_times = [0.2, 1.7]
    chime_freqs = [440.0, 523.25] # A4, C5
    for t_start, freq in zip(chime_times, chime_freqs):
        i_start = int(t_start * SAMPLE_RATE)
        chime_len = int(1.2 * SAMPLE_RATE)
        for j in range(chime_len):
            idx = (i_start + j) % n_samples
            tj = j / SAMPLE_RATE
            env = math.exp(-tj * 3.5)
            chime = (math.sin(2.0 * math.pi * freq * tj) + 0.3 * math.sin(2.0 * math.pi * freq * 2.0 * tj)) * env * 0.25
            samples[idx] += chime

    # Add soft paper rustle at t=0.9s and t=2.3s
    rustle_times = [0.9, 2.3]
    for r_start in rustle_times:
        i_start = int(r_start * SAMPLE_RATE)
        rustle_len = int(0.35 * SAMPLE_RATE)
        lp = 0.0
        for j in range(rustle_len):
            idx = (i_start + j) % n_samples
            tj = j / SAMPLE_RATE
            env = math.sin(math.pi * (tj / 0.35)) ** 2
            noise = (random.random() * 2.0 - 1.0)
            lp += 0.2 * (noise - lp)
            samples[idx] += lp * env * 0.12

    # Add soft ambient base
    for i in range(n_samples):
        t = i / SAMPLE_RATE
        ambient = math.sin(2.0 * math.pi * 174.0 * t) * 0.04
        samples[i] = (samples[i] + ambient) * 0.4
    return samples

# 4. Game clicks: gentle retro 8-bit screen clicks / cozy arcade taps (~2.5s seamless)
def generate_game_clicks():
    duration = 2.5
    n_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * n_samples

    # Subtle electronic blips at rhythms: 0.2s, 0.6s, 1.1s, 1.5s, 1.9s, 2.3s
    blip_events = [
        (0.2, 587.33, 0.06), # D5
        (0.6, 659.25, 0.05), # E5
        (1.1, 880.00, 0.07), # A5
        (1.5, 587.33, 0.05), # D5
        (1.9, 783.99, 0.06), # G5
        (2.3, 659.25, 0.05), # E5
    ]
    for t_start, freq, length in blip_events:
        i_start = int(t_start * SAMPLE_RATE)
        blip_samples = int(length * SAMPLE_RATE)
        for j in range(blip_samples):
            idx = (i_start + j) % n_samples
            tj = j / SAMPLE_RATE
            env = (1.0 - tj / length) ** 2
            # Square wave / soft retro blip
            sq = 1.0 if math.sin(2.0 * math.pi * freq * tj) > 0 else -1.0
            samples[idx] += sq * env * 0.18

    # Subtle tactile key click on each event
    for t_start, _, _ in blip_events:
        i_start = int((t_start - 0.02) * SAMPLE_RATE)
        click_samples = int(0.015 * SAMPLE_RATE)
        for j in range(click_samples):
            idx = (i_start + j) % n_samples
            samples[idx] += (random.random() * 2.0 - 1.0) * 0.15

    # Gentle low desk hum
    for i in range(n_samples):
        t = i / SAMPLE_RATE
        hum = math.sin(2.0 * math.pi * 120.0 * t) * 0.03
        samples[i] = (samples[i] + hum) * 0.4
    return samples

# 5. Simmer loop: gentle low kitchen simmering / bubbling (~3.0s seamless)
def generate_simmer_loop():
    duration = 3.0
    n_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * n_samples

    # Procedural bubble pops
    num_bubbles = 45
    for _ in range(num_bubbles):
        b_time = random.uniform(0.0, duration)
        i_start = int(b_time * SAMPLE_RATE)
        b_len = int(random.uniform(0.03, 0.08) * SAMPLE_RATE)
        freq_start = random.uniform(250.0, 500.0)
        freq_end = freq_start + random.uniform(150.0, 350.0)
        vol = random.uniform(0.08, 0.25)
        for j in range(b_len):
            idx = (i_start + j) % n_samples
            tj = j / SAMPLE_RATE
            p = tj / (b_len / SAMPLE_RATE)
            f = freq_start + (freq_end - freq_start) * p
            env = math.sin(math.pi * p)
            samples[idx] += math.sin(2.0 * math.pi * f * tj) * env * vol

    # Low frequency warm stew boiling churn (filtered noise)
    filter_state = 0.0
    for i in range(n_samples):
        noise = (random.random() * 2.0 - 1.0)
        filter_state += 0.03 * (noise - filter_state)
        samples[i] = (samples[i] + filter_state * 0.3) * 0.35

    return samples

if __name__ == '__main__':
    random.seed(42)
    write_wav('assets/audio/curtain_swipe.wav', generate_curtain_swipe())
    write_wav('assets/audio/bed_tone.wav', generate_bed_tone())
    write_wav('assets/audio/thinking_loop.wav', generate_thinking_loop())
    write_wav('assets/audio/game_clicks.wav', generate_game_clicks())
    write_wav('assets/audio/simmer_loop.wav', generate_simmer_loop())
