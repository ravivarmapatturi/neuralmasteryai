"""Fetch a fixed, speaker-disjoint VCTK sample using HTTP ranges, not the 10 GB zip.
Requires: pip install remotezip numpy scipy; ffmpeg on PATH.
The manifest is frozen before inference. Never reassign splits after measuring.
"""
from pathlib import Path
import hashlib, json, subprocess, tempfile
import numpy as np
from remotezip import RemoteZip
ROOT = Path(__file__).resolve().parent
lock=ROOT/'frozen-corpus.json'
if lock.exists() and isinstance(json.loads(lock.read_text()).get('selection'), dict):
    raise SystemExit('Corpus and selection are frozen. Create a new evaluation version instead of overwriting.')
REV = 'd6abe2fc25972d26993c20bfaa574b8a5dec2dac'
URL = f'https://huggingface.co/datasets/arampacha/vctk_22kHz/resolve/{REV}/raw_data.zip'
OUT = ROOT / 'audio'
OUT.mkdir(exist_ok=True)
manifest = []
with RemoteZip(URL, timeout=30) as archive:
    names = set(archive.namelist())
    for si, speaker in enumerate(['p248', 'p225', 'p226', 'p251', 'p250', 'p227']):
        candidates = sorted(n[:-4] for n in names if n.startswith(speaker+'/') and n.endswith('.txt') and int(n[-7:-4]) >= 30 + si * 10 and n[:-4]+'.wav' in names)[:6]
        for j, base in enumerate(candidates):
            key = base.split('/')[-1]
            reference = archive.read(base + '.txt').decode().strip()
            with tempfile.TemporaryDirectory() as temp:
                source = Path(temp) / 'source.wav'
                source.write_bytes(archive.read(base + '.wav'))
                # All samples derive from real human recordings. Modifications are labelled.
                condition = ['clean', 'clean', 'fast-1.25x', 'noise-15dB', 'quiet-0.1x', 'clean'][j]
                raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(source), '-af', 'atempo=1.25' if condition.startswith('fast') else 'anull', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'])
                audio = np.frombuffer(raw, dtype='<f4').copy()
                if condition.startswith('noise'):
                    noise = np.random.default_rng(20261108 + si).normal(size=len(audio))
                    audio += noise * np.sqrt(np.mean(audio**2) / (10**1.5))
                if condition.startswith('quiet'):
                    audio *= 0.1
                target = OUT / f'{key}.wav'
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', '16000', '-ac', '1', '-i', '-', '-c:a', 'pcm_s16le', str(target)], input=audio.astype('<f4').tobytes(), check=True)
            row = dict(id=key, split='tune' if si < 3 else 'heldout', speaker=speaker, accent='Indian' if speaker in ['p248','p251'] else 'British Isles', condition=condition, reference=reference, terms=[], durationSeconds=len(audio)/16000, path=f'audio/{key}.wav', sha256=hashlib.sha256(target.read_bytes()).hexdigest(), source=URL, sourceMember=base+'.wav', transcriptMember=base+'.txt', license='CC-BY-4.0', attribution='Christophe Veaux, Junichi Yamagishi, Kirsten MacDonald, CSTR VCTK Corpus', licenseSource='https://datashare.ed.ac.uk/handle/10283/3443')
            manifest.append(row)
            (ROOT/'corpus.json').write_text(json.dumps(manifest, indent=2)+'\n')
            print(key,condition,flush=True)
(ROOT/'corpus.json').write_text(json.dumps(manifest, indent=2)+'\n')
