import fs from 'node:fs';
import {summarize} from './metrics.mjs';
const args=process.argv.slice(2);
const name=args.includes('--human-terms')?'human-terms':args.includes('--terms')?'terms':args.includes('--sequence')?'sequence':'corpus';
const corpus=JSON.parse(fs.readFileSync(`scripts/speech-accuracy/${name}.json`));
for(const file of args.filter(arg=>!arg.startsWith('--'))){
 const run=JSON.parse(fs.readFileSync(file));
 if(run.split==='heldout' && typeof JSON.parse(fs.readFileSync('scripts/speech-accuracy/frozen-corpus.json')).selection !== 'object') throw Error('Heldout results are sealed until selection is frozen');
 console.log(file,JSON.stringify(summarize(corpus,run,args.includes('--corrected')?'correctedText':'text')));
}
