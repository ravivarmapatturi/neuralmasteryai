"""Deterministic long-answer diagnostics, partitioned using the frozen corpus.
These reuse corpus clips; they are not extra independent test examples.
"""
from pathlib import Path
import json,wave,numpy as np,hashlib
root=Path(__file__).resolve().parent
lock=root/'frozen-corpus.json'
if lock.exists() and isinstance(json.loads(lock.read_text()).get('selection'), dict):
    raise SystemExit('Corpus and selection are frozen. Create a new evaluation version instead of overwriting.')
corpus=json.loads((root/'corpus.json').read_text())
rows=[]
for split,speaker in [('tune','p248'),('heldout','p251')]:
    selected=[r for r in corpus if r['speaker']==speaker]
    chunks=[]
    for row in selected:
        with wave.open(str(root/row['path'])) as w: chunks.append(np.frombuffer(w.readframes(w.getnframes()),dtype='<i2'))
        chunks.append(np.zeros(32000,dtype='<i2'))
    audio=np.concatenate(chunks)
    path=root/'audio'/f'sequence-{split}.wav'
    with wave.open(str(path),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(16000);w.writeframes(audio.tobytes())
    rows.append(dict(id=path.stem,split=split,speaker=speaker,condition='long-answer-with-2s-pauses',reference=' '.join(r['reference'] for r in selected),terms=[],path='audio/'+path.name,durationSeconds=len(audio)/16000,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),sourceClipIds=[r['id'] for r in selected],license='CC-BY-4.0',attribution=selected[0]['attribution']))
(root/'sequence.json').write_text(json.dumps(rows,indent=2)+'\n')
