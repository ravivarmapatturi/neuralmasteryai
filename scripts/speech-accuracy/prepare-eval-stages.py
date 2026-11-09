"""Prepare 15s, 30s, 60s, and 120s test audio and reference texts from held-out VCTK p251."""
import array
import hashlib
import json
from pathlib import Path
import wave

root = Path(__file__).resolve().parent
audio_dir = root / 'audio'

# Load held-out sequence clips
with open(root / 'sequence.json') as f:
    seq = json.load(f)
heldout_seq = next(x for x in seq if x['split'] == 'heldout')

# Read clips for p251
clip_ids = heldout_seq['sourceClipIds']  # ['p251_060', 'p251_061', 'p251_062', 'p251_063', 'p251_064', 'p251_065']
with open(root / 'corpus.json') as f:
    corpus = json.load(f)
corpus_map = {c['id']: c for c in corpus}

def read_wav_samples(path: Path) -> array.array:
    with wave.open(str(path), 'rb') as w:
        assert w.getframerate() == 16000 and w.getnchannels() == 1 and w.getsampwidth() == 2
        return array.array('h', w.readframes(w.getnframes()))

def write_wav(path: Path, samples: array.array):
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(samples.tobytes())

pause_2s = array.array('h', [0]) * (2 * 16000)
pause_6s = array.array('h', [0]) * (6 * 16000)

# 15s case: first 4 clips with 2s pauses (~15.8s)
c15_ids = clip_ids[:4]
s15 = array.array('h')
for i, cid in enumerate(c15_ids):
    s15.extend(read_wav_samples(root / corpus_map[cid]['path']))
    if i < len(c15_ids) - 1:
        s15.extend(pause_2s)
ref15 = ' '.join(corpus_map[cid]['reference'] for cid in c15_ids)

# 30s case: all 6 clips with 2s pauses (~29.1s) = sequence-heldout.wav
s30 = read_wav_samples(audio_dir / 'sequence-heldout.wav')
ref30 = heldout_seq['reference']

# 60s case: capture-long-heldout.wav (~64.3s)
s60 = read_wav_samples(audio_dir / 'capture-long-heldout.wav')
ref60 = ref30 + ' ' + ref30

# 120s case: s60 + pause_6s + s60 (~134.5s)
s120 = s60 + pause_6s + s60
ref120 = ref60 + ' ' + ref60

cases = [
    {
        'id': 'eval-15s',
        'targetDuration': 15,
        'durationSeconds': len(s15) / 16000.0,
        'path': 'audio/eval-15s.wav',
        'reference': ref15,
        'samples': s15,
    },
    {
        'id': 'eval-30s',
        'targetDuration': 30,
        'durationSeconds': len(s30) / 16000.0,
        'path': 'audio/eval-30s.wav',
        'reference': ref30,
        'samples': s30,
    },
    {
        'id': 'eval-60s',
        'targetDuration': 60,
        'durationSeconds': len(s60) / 16000.0,
        'path': 'audio/eval-60s.wav',
        'reference': ref60,
        'samples': s60,
    },
    {
        'id': 'eval-120s',
        'targetDuration': 120,
        'durationSeconds': len(s120) / 16000.0,
        'path': 'audio/eval-120s.wav',
        'reference': ref120,
        'samples': s120,
    },
]

manifest = []
for c in cases:
    target_path = root / c['path']
    write_wav(target_path, c['samples'])
    sha = hashlib.sha256(target_path.read_bytes()).hexdigest()
    manifest.append({
        'id': c['id'],
        'targetDuration': c['targetDuration'],
        'durationSeconds': round(c['durationSeconds'], 4),
        'path': c['path'],
        'reference': c['reference'],
        'sha256': sha,
    })
    print(f"Generated {c['id']}: {c['durationSeconds']:.2f}s, SHA: {sha[:12]}")

out_path = root / 'eval-stage-cases.json'
with open(out_path, 'w') as f:
    json.dump(manifest, f, indent=2)
print("Saved manifest to", out_path)
