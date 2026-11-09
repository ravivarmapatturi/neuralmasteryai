"""Build a >60-second diagnostic from licensed held-out recordings; not new subjects."""
import array
import hashlib
import json
from pathlib import Path
import wave

root = Path(__file__).parent
row = next(r for r in json.loads((root / 'sequence.json').read_text()) if r['split'] == 'heldout')
with wave.open(str(root / row['path'])) as source:
    assert source.getframerate() == 16000 and source.getnchannels() == 1 and source.getsampwidth() == 2
    samples = array.array('h', source.readframes(source.getnframes()))
long_samples = samples + array.array('h', [0]) * (6 * 16000) + samples
path = root / 'audio/capture-long-heldout.wav'
if not path.exists():
    with wave.open(str(path), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(16000)
        output.writeframes(long_samples.tobytes())
with wave.open(str(path)) as check:
    assert check.readframes(check.getnframes()) == long_samples.tobytes()
case = {**row, 'id': 'capture-long-heldout', 'path': 'audio/capture-long-heldout.wav',
        'durationSeconds': len(long_samples) / 16000, 'reference': row['reference'] + ' ' + row['reference'],
        'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'condition': 'Repeated held-out Indian-English composite with six-second hesitation; not an independent subject',
        'parentSHA256': row['sha256']}
manifest = root / 'capture-cases.json'
if manifest.exists():
    assert json.loads(manifest.read_text()) == [case]
else:
    manifest.write_text(json.dumps([case], indent=2) + '\n')
print(case['id'], case['durationSeconds'], case['sha256'])
