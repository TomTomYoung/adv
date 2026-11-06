import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// These generated reports are also assertions/inputs in executable tests.
const testedReports=new Set(['doc/dungeons/REGIONAL_RELOCATION_CHECK.md','doc/scenarios/RELOCATED_CAST_AUDIT.md']);
export const isDocumentation=file=>file==='README.md'||file==='AGENTS.md'||(file.startsWith('doc/')&&file.endsWith('.md')&&!testedReports.has(file));
function git(cwd,...args){return execFileSync('git',args,{cwd,encoding:'utf8',maxBuffer:16*1024*1024});}
const validSha=value=>typeof value==='string'&&/^[0-9a-f]{40,64}$/.test(value)&&!/^0+$/.test(value);

export function inspectScope({cwd=process.cwd(),eventName,event={},environment=[process.platform,process.arch,process.versions.node,process.env.ImageOS??'unknown',process.env.ImageVersion??'unknown']}={}){
 const entries=git(cwd,'ls-tree','-r','-z','HEAD').split('\0').filter(Boolean);
 const inputs=entries.filter(entry=>!isDocumentation(entry.slice(entry.indexOf('\t')+1)));
 // Git blob IDs include the file bytes; tree records also include mode and path.
 const fingerprint=createHash('sha256').update(JSON.stringify(environment)).update('\0').update(inputs.join('\0')).digest('hex');
 let docsOnly=false,reason='unknown event or unavailable comparison: run checks',changed=[];
 if(eventName==='workflow_dispatch')reason='manual run: run every selected check';
 else {
  const before=eventName==='pull_request'?event.pull_request?.base?.sha:eventName==='push'?event.before:null;
  const after=eventName==='pull_request'?event.pull_request?.head?.sha:eventName==='push'?event.after:null;
  if(validSha(before)&&validSha(after)){
   try{
    const base=eventName==='pull_request'?git(cwd,'merge-base',before,after).trim():before;
    // Disable rename detection so moving executable input into docs retains the deletion.
    changed=git(cwd,'diff','--no-renames','--name-only','-z',base,after,'--').split('\0').filter(Boolean);
    docsOnly=changed.length>0&&changed.every(isDocumentation);
    reason=docsOnly?'documentation-only change':'executable inputs changed or empty comparison';
   }catch{reason='comparison unavailable: run checks';}
  }
 }
 return {fingerprint,docsOnly,reason,changed};
}

export function decideRun({docsOnly=false,manual=false,cacheHit=false,record=null,key}={}){
 if(manual)return {run:true,reason:'manual run'};
 if(docsOnly)return {run:false,reason:'documentation only; documentation check still runs'};
 if(cacheHit&&record?.key===key&&record?.passed===true&&typeof record?.runUrl==='string'&&/^https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/\d+$/.test(record.runUrl))return {run:false,reason:`same inputs already passed: ${record.runUrl}`};
 return {run:true,reason:'no exact successful result; run checks'};
}

async function emit(values){for(const [k,v] of Object.entries(values))await fs.appendFile(process.env.GITHUB_OUTPUT,`${k}=${v}\n`);}
async function main(){
 const mode=process.argv[2]??'inspect';
 if(mode==='inspect'){
  const event=JSON.parse(await fs.readFile(process.env.GITHUB_EVENT_PATH,'utf8'));
  const result=inspectScope({eventName:process.env.GITHUB_EVENT_NAME,event});
  await emit({fingerprint:result.fingerprint,docs_only:result.docsOnly});
  console.log(`CI scope: ${result.reason}; ${result.changed.length} changed paths`);
 }else if(mode==='decide'){
  const record=await fs.readFile(path.join(process.env.CI_RESULT_PATH,'passed.json'),'utf8').then(JSON.parse).catch(()=>null);
  const result=decideRun({docsOnly:process.env.CI_DOCS_ONLY==='true',manual:process.env.GITHUB_EVENT_NAME==='workflow_dispatch',cacheHit:process.env.CI_CACHE_HIT==='true',record,key:process.env.CI_CACHE_KEY});
  await emit({run:result.run});console.log(`CI: ${result.reason}`);
  if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,`${process.env.CI_SUITE}: ${result.reason}\n\n`);
 }else if(mode==='record'){
  await fs.mkdir(process.env.CI_RESULT_PATH,{recursive:true});
  const record={passed:true,key:process.env.CI_CACHE_KEY,sha:process.env.GITHUB_SHA,runUrl:`${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`};
  await fs.writeFile(path.join(process.env.CI_RESULT_PATH,'passed.json'),JSON.stringify(record)+'\n');
 }else throw Error(`Unknown CI mode: ${mode}`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await main();
