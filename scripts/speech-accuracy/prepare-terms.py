"""Supplemental synthesized diagnostics. These are NOT the required real technical speech.
Uses the installed eSpeak NG C library; no downloads, server or API.
"""
import ctypes as C
from pathlib import Path
import json, subprocess, hashlib
root=Path(__file__).resolve().parent
lock=root/'frozen-corpus.json'
if lock.exists() and isinstance(json.loads(lock.read_text()).get('selection'), dict):
    raise SystemExit('Corpus and selection are frozen. Create a new evaluation version instead of overwriting.')
lib=C.CDLL('libespeak-ng.so.1')
lib.espeak_Initialize.argtypes=[C.c_int,C.c_int,C.c_char_p,C.c_int]
rate=lib.espeak_Initialize(2,0,None,0) # synchronous retrieval
chunks=[]
CB=C.CFUNCTYPE(C.c_int,C.POINTER(C.c_short),C.c_int,C.c_void_p)
@CB
def callback(wav,count,events):
    if wav and count: chunks.append(C.string_at(wav,count*2))
    return 0
lib.espeak_SetSynthCallback(callback)
lib.espeak_SetVoiceByName.argtypes=[C.c_char_p]
lib.espeak_Synth.argtypes=[C.c_char_p,C.c_size_t,C.c_uint,C.c_int,C.c_uint,C.c_uint,C.c_void_p,C.c_void_p]
items=[
 ('XGBoost is a useful baseline for tabular data.', 'ex gee boost is a useful baseline for tabular data.', ['XGBoost']),
 ('RAG retrieves relevant documents before generation.', 'rag retrieves relevant documents before generation.', ['RAG']),
 ('LoRA trains low rank adapters while freezing the base model.', 'low rah trains low rank adapters while freezing the base model.', ['LoRA']),
 ('We store embeddings in a vector index.', 'we store embeddings in a vector index.', ['embeddings']),
 ('BM25 ranks documents using lexical matches.', 'bee em twenty five ranks documents using lexical matches.', ['BM25']),
 ('For tabular prediction I would compare XGBoost with a linear model.', 'for tabular prediction I would compare ex gee boost with a linear model.', ['XGBoost']),
 ('RAG can answer questions using current documentation.', 'rag can answer questions using current documentation.', ['RAG']),
 ('LoRA reduces the number of parameters updated during training.', 'low rah reduces the number of parameters updated during training.', ['LoRA']),
 ('The embeddings should preserve semantic similarity.', 'the embeddings should preserve semantic similarity.', ['embeddings']),
 ('I combine BM25 with dense vector retrieval.', 'I combine bee em twenty five with dense vector retrieval.', ['BM25']),
]
rows=[]
for i,(ref,spoken,terms) in enumerate(items):
    voice='en-us' if i<5 else 'en-gb-scotland'
    assert lib.espeak_SetVoiceByName(voice.encode())==0
    chunks.clear(); data=spoken.encode()
    assert lib.espeak_Synth(data,len(data)+1,0,1,0,1,None,None)==0
    path=root/'audio'/f'synthetic-term-{i:02d}.wav'
    subprocess.run(['ffmpeg','-v','error','-y','-f','s16le','-ar',str(rate),'-ac','1','-i','-','-ar','16000',str(path)],input=b''.join(chunks),check=True)
    rows.append(dict(id=path.stem,split='tune' if i<5 else 'heldout',speaker=voice,questionTitle='How does LoRA work?' if 'LoRA' in terms else 'Explain '+terms[0],condition='synthetic',reference=ref,spokenInput=spoken,terms=terms,path='audio/'+path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),source='https://github.com/espeak-ng/espeak-ng',license='Original generated diagnostic audio and text dedicated to CC0-1.0 by this project; eSpeak NG software GPL-3.0-or-later',realSpeech=False))
(root/'terms.json').write_text(json.dumps(rows,indent=2)+'\n')
