"""Fetch five preselected human technical excerpts from openly licensed FOSDEM talks.
These are an additional held-out challenge: do not use them to tune recognition.
The published captions are imperfect; evaluate term presence, not gold-reference WER.
"""
from pathlib import Path
import requests,json,hashlib,subprocess
root=Path(__file__).resolve().parent
lock=root/'frozen-corpus.json'
if lock.exists() and isinstance(json.loads(lock.read_text()).get('selection'), dict):
    raise SystemExit('Corpus and selection are frozen. Create a new evaluation version instead of overwriting.')
# Fixed sources and times selected using published captions, before any ASR on these clips.
specs=[
 dict(id='4801',year=2025,slug='fosdem-2025-4801-apache-arrow-the-great-library-unifier',room='ub2252a',speaker='Matthew Topol',title='Apache Arrow: The Great Library Unifier',start=363.68,end=371.36,term='XGBoost',reference='pre-apac, for your pre-processing, maybe Coupai, Dail Pack is an often big one. XG Boost is another one'),
 dict(id='5676',year=2025,slug='fosdem-2025-5676-building-agentic-graphql-apis-with-llm-tool-use-knowledge-graphs',room='k4201',speaker='William Lyon',title='Building Agentic GraphQL APIs With LLM Tool Use & Knowledge Graphs',start=915,end=922,term='RAG',reference='And this idea of knowledge graph rag. Rag is retrieval augmented generation.'),
 dict(id='5154',year=2025,slug='fosdem-2025-5154-wllama-bringing-llama-cpp-to-the-web',room='ub2252a',speaker='Xuan-Son Nguyen',title='wllama: bringing llama.cpp to the web',start=942,end=951,term='LoRA',reference='with our browser. Yeah. I will also want to support the lower adapter, which should be something very simple to do. Just I don\'t get'),
 dict(id='7036',year=2026,slug='3AWMQZ-multi-vector-embeddings-revolution-or-evolution',room='ub4136',speaker='Marcin Antas; Roberto Esposito',title='Multi-Vector embeddings revolution? or evolution?',start=108,end=118,term='embeddings',reference='And that results in a model that is able to output embeddings of varying dimensionalities.'),
 dict(id='8937',year=2026,slug='CB7MBQ-rust-block-max-pruning',room='ub4136',speaker='Ferdinand Schlatt; Antonio Mallia',title='Implementing Block-Max Pruning in Rust: Faster Learned Sparse Retrieval for Modern Search',start=247,end=252,term='BM25',reference="I mean BM25 is still being used today and it's fairly hard to beat still."),
]
rows=[]
for spec in specs:
    base=f"https://video.fosdem.org/{spec['year']}/{spec['room']}/{spec['slug']}"
    caption_url=base+'.vtt'
    caption=requests.get(caption_url,timeout=30);caption.raise_for_status()
    caption_file=root/'sources'/f"fosdem-{spec['id']}.vtt"
    caption_file.parent.mkdir(exist_ok=True);caption_file.write_bytes(caption.content)
    video=base+'.mp4'
    target=root/'audio'/f"fosdem-{spec['id']}.wav"
    subprocess.run(['ffmpeg','-v','error','-y','-ss',str(spec['start']),'-i',video,'-t',str(spec['end']-spec['start']),'-vn','-ac','1','-ar','16000','-c:a','pcm_s16le',str(target)],check=True,timeout=180)
    license_url='https://creativecommons.org/licenses/by/2.0/be/deed.en'
    row=dict(id=target.stem,split='heldout',speaker=spec['speaker'],condition='human-conference-technical-speech',reference=spec['reference'],terms=[spec['term']],questionTitle='Explain '+spec['term'],path='audio/'+target.name,durationSeconds=spec['end']-spec['start'],sha256=hashlib.sha256(target.read_bytes()).hexdigest(),source=video,sourcePage=f"https://archive.fosdem.org/{spec['year']}/schedule/event/{spec['slug']}/",startSeconds=spec['start'],endSeconds=spec['end'],captionSource=caption_url,captionSHA256=hashlib.sha256(caption.content).hexdigest(),license='CC-BY-2.0-BE',licenseUrl=license_url,licenseSource=f"https://video.fosdem.org/{spec['year']}/{spec['room']}/",attribution=f"{spec['speaker']}, {spec['title']}, FOSDEM {spec['year']}",modifications='Audio excerpt, mono 16 kHz PCM conversion. Published captions retained without ASR-based editing.',referenceReview='Published captions, not manually audited. Use term accuracy only; these captions are not a gold WER reference.',termAnnotationEvidence='Published caption contains the term.' if spec['term'] != 'LoRA' else 'Video at 946 seconds shows the speaker slide Support LoRA adapters. Published captions spell the spoken acronym lower.',realSpeech=True)
    rows.append(row);print(row['id'],row['terms'],flush=True)
(root/'human-terms.json').write_text(json.dumps(rows,indent=2)+'\n')
