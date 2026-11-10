"""Build the second held-out speech set: 10 to 40 second clips with human-written references.

Two sources, both real human speech with redistributable licences:
- NPTEL2020 Pure-Set (AI4Bharat): Indian-accent lecture speech, transcripts corrected by hand.
  Only chunks whose YouTube metadata carries the Creative Commons Attribution licence are used.
- CSTR VCTK (CC BY 4.0): read sentences from the three Indian-accent speakers and one English control.

Short source chunks are joined with 0.6 s of silence so every clip is answer-length.
Usage: python3 prepare-heldout-v2.py /path/to/extracted/nptel-pure
Requires: pip install remotezip numpy; ffmpeg on PATH. Audio is written to audio-v2/ (kept on the speech-eval branch).
"""
from pathlib import Path
import hashlib, json, re, subprocess, sys, tempfile, wave
import numpy as np
from remotezip import RemoteZip

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'audio-v2'
MANIFEST = ROOT / 'heldout-v2.json'
if MANIFEST.exists():
    raise SystemExit('heldout-v2.json exists. Create a new evaluation version instead of overwriting.')
OUT.mkdir(exist_ok=True)
RATE = 16000
GAP = np.zeros(int(0.6 * RATE), dtype='<f4')
PURE_URL = 'https://github.com/AI4Bharat/NPTEL2020-Indian-English-Speech-Dataset/releases/download/v0.1/nptel-pure-set.tar.gz'
PURE_SHA256 = 'cad8b68cce78adb4af2b432a2112d43c4c4425b0762564db20a03c3263bc051e'
VCTK_REV = 'd6abe2fc25972d26993c20bfaa574b8a5dec2dac'
VCTK_URL = f'https://huggingface.co/datasets/arampacha/vctk_22kHz/resolve/{VCTK_REV}/raw_data.zip'

# Spelled-out numbers and single letters have several valid written forms ("C SIX", "C6"), so those chunks are left out.
NUMBER_WORDS = set('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million billion first second third fourth fifth percent point'.split())
# Misspellings found in the hand-corrected transcripts; a wrong reference would be counted against the model.
REFERENCE_TYPOS = {'subroutiens', 'swithces', 'corresponsing', 'perunit'}
# Subject words a general listener would not know. Labelled from the reference text only.
TERMS = '''momentum vorticity anticyclonic polarizability spectrometer spectroscopy eigenvector gaussian probability probabilities
compiler processor scheduling acyclic turbine propellant nitramine emulsification micelles cascode emitter emitters inductance oscillator
diffraction scattering orthonormal automorphism calculus predictors correlation catalysis integral integrals vectors unsatisfiability
diffusion nanotechnology density voltage frequency electron molecule molecular seismic coefficients gramicidin equilibrium velocity
amplitudes geosynthetics landfill damping predicate profiler bromide chromium cylindrical spherical stationary conservation'''.split()


def write_clip(name, parts):
    audio = np.concatenate([x for i, part in enumerate(parts) for x in ((GAP, part) if i else (part,))])
    target = OUT / f'{name}.flac'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(RATE), '-ac', '1', '-i', '-', '-c:a', 'flac', '-sample_fmt', 's16', str(target)], input=audio.astype('<f4').tobytes(), check=True)
    return target, len(audio) / RATE


def terms_in(reference):
    words = set(re.findall(r"[a-z']+", reference.lower()))
    return [t for t in TERMS if t in words]


def lecture_rows(pure):
    chunks = []
    for text_file in sorted((pure / 'corrected_txt').glob('*.txt')):
        key = text_file.stem
        text = text_file.read_text().strip()
        meta = json.loads((pure / 'metadata' / f'{key}.json').read_text())
        video = meta['metadata']
        words = text.lower().split()
        if video.get('license') != 'Creative Commons Attribution license (reuse allowed)':
            continue
        if re.search(r"[^A-Za-z' ]", text) or len(words) < 8 or any(w in NUMBER_WORDS or w in REFERENCE_TYPOS or (len(w) == 1 and w not in 'ai') for w in words):
            continue
        with wave.open(str(pure / 'wav' / f'{key}.wav')) as w:
            if (w.getframerate(), w.getnchannels(), w.getsampwidth()) != (RATE, 1, 2):
                continue
            pcm = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype('<f4') / 32768
        if len(pcm) / RATE < 4:
            continue
        chunks.append(dict(key=key, text=text.lower(), pcm=pcm, video=video['id'], title=video['title'], url=video['webpage_url'], start=meta['ts_start'], end=meta['ts_end']))
    rows, group = [], []
    for chunk in chunks:
        group.append(chunk)
        if sum(len(c['pcm']) for c in group) / RATE + 0.6 * (len(group) - 1) < 12:
            continue
        name = f'nptel-{len(rows) + 1:03d}'
        target, seconds = write_clip(name, [c['pcm'] for c in group])
        reference = ' '.join(c['text'] for c in group)
        rows.append(dict(id=name, split='heldout', speaker='NPTEL lecturers', accent='Indian', condition='lecture', reference=reference, terms=terms_in(reference), durationSeconds=seconds, path=f'audio-v2/{name}.flac', sha256=hashlib.sha256(target.read_bytes()).hexdigest(),
                         source=PURE_URL, sourceSHA256=PURE_SHA256, sourceChunks=[dict(chunk=c['key'], video=c['url'], title=c['title'], start=c['start'], end=c['end']) for c in group],
                         license='CC-BY', attribution='NPTEL (nptelhrd on YouTube); chunks and corrected transcripts from the AI4Bharat NPTEL2020 Pure-Set', licenseSource='https://www.youtube.com/t/creative_commons',
                         modifications='Chunks joined with 0.6 s of silence, FLAC encoding. Transcripts lower-cased.', referenceReview='Transcript corrected by hand by the dataset authors. Chunks start and end mid-sentence.'))
        group = []
    return rows


def read_rows():
    rows = []
    # p248 and p251 sentences below 200 are in the first corpus; p227 is the held-out English speaker there.
    plan = [('p376', 'Indian', 25, 25), ('p248', 'Indian', 200, 15), ('p251', 'Indian', 200, 15), ('p227', 'British Isles', 200, 10)]
    with RemoteZip(VCTK_URL, timeout=60) as archive:
        names = set(archive.namelist())
        for speaker, accent, first, clips in plan:
            bases = sorted(n[:-4] for n in names if n.startswith(speaker + '/') and n.endswith('.txt') and int(n[-7:-4]) >= first and n[:-4] + '.wav' in names)
            sentences = []
            for base in bases:
                if len(sentences) == clips * 5:
                    break
                text = archive.read(base + '.txt').decode().strip()
                if re.search(r'\d', text):
                    continue
                with tempfile.TemporaryDirectory() as temp:
                    source = Path(temp) / 'source.wav'
                    source.write_bytes(archive.read(base + '.wav'))
                    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(source), '-ac', '1', '-ar', str(RATE), '-f', 'f32le', '-'])
                sentences.append((base, text, np.frombuffer(raw, dtype='<f4')))
            for i in range(0, len(sentences) - 4, 5):
                group = sentences[i:i + 5]
                name = f'{speaker}-read-{i // 5 + 1:02d}'
                target, seconds = write_clip(name, [g[2] for g in group])
                rows.append(dict(id=name, split='heldout', speaker=speaker, accent=accent, condition='read-sentences', reference=' '.join(g[1] for g in group), terms=[], durationSeconds=seconds, path=f'audio-v2/{name}.flac', sha256=hashlib.sha256(target.read_bytes()).hexdigest(),
                                 source=VCTK_URL, sourceMembers=[g[0] + '.wav' for g in group], license='CC-BY-4.0', attribution='Christophe Veaux, Junichi Yamagishi, Kirsten MacDonald, CSTR VCTK Corpus', licenseSource='https://datashare.ed.ac.uk/handle/10283/3443',
                                 modifications='Five sentences joined with 0.6 s of silence, 16 kHz mono, FLAC encoding.', referenceReview='Prompt text read by the speaker, published with the corpus.'))
                print(name, round(seconds, 1), flush=True)
    return rows


rows = lecture_rows(Path(sys.argv[1])) + read_rows()
MANIFEST.write_text(json.dumps(rows, indent=2) + '\n')
print(len(rows), 'clips', round(sum(r['durationSeconds'] for r in rows) / 60, 1), 'minutes')
