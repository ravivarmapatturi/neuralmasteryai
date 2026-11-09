// Stop only the process group started here; never close another application's work.
import fs from 'node:fs';
import {spawn} from 'node:child_process';
const [command,...args]=process.argv.slice(2);
if(!command)throw Error('Pass a command and arguments');
const available=()=>Number(fs.readFileSync('/proc/meminfo','utf8').match(/^MemAvailable:\s+(\d+)/m)[1])/1024;
if(available()<2048)throw Error('Below 2 GiB available RAM; heavy command not started');
const child=spawn(command,args,{stdio:'inherit',detached:true});
let stopped=false;
const interval=setInterval(()=>{
 const mb=available();
 if(mb>=2048||stopped)return;
 stopped=true;console.error(`Memory floor: ${Math.round(mb)} MiB available; stopping this command group.`);
 try{process.kill(-child.pid,'SIGTERM');}catch{}
},250);
child.on('error',error=>{clearInterval(interval);console.error(error.message);process.exitCode=1;});
child.on('exit',(code)=>{clearInterval(interval);process.exitCode=stopped?75:code??1;});
