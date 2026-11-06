import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {inspectScope,decideRun,isDocumentation} from '../tools/ci-scope.mjs';

async function repository(t){
 const cwd=await mkdtemp(path.join(tmpdir(),'adv-ci-scope-'));t.after(()=>rm(cwd,{recursive:true,force:true}));
 const git=(...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
 git('init','-q');git('config','user.name','CI test');git('config','user.email','ci@example.invalid');
 const put=async(file,text)=>{await mkdir(path.dirname(path.join(cwd,file)),{recursive:true});await writeFile(path.join(cwd,file),text);};
 const commit=()=>{git('add','-A');git('commit','-qm','fixture');return git('rev-parse','HEAD');};
 await put('src/game.js','export const version=1;\n');await put('doc/HANDOFF.md','next\n');const base=commit();
 const inspect=(eventName,event,environment=['linux','x64','22','ubuntu24'])=>inspectScope({cwd,eventName,event,environment});
 const pr=(base,head)=>inspect('pull_request',{pull_request:{base:{sha:base},head:{sha:head}}});
 return {cwd,git,put,commit,base,inspect,pr};
}

test('CI documentation-only PR/push keeps its fingerprint while documentation is still checked separately',async t=>{
 const r=await repository(t),initial=r.pr(r.base,r.base);assert.equal(initial.docsOnly,false);
 await r.put('doc/HANDOFF.md','updated\n');const head=r.commit();const current=r.pr(r.base,head);
 assert.equal(current.docsOnly,true);assert.equal(current.fingerprint,initial.fingerprint);
 assert.equal(r.inspect('push',{before:r.base,after:head}).docsOnly,true);
 assert.deepEqual(decideRun({docsOnly:true}),{run:false,reason:'documentation only; documentation check still runs'});
});

test('CI a documentation follow-up cannot hide earlier untested code in the same PR',async t=>{
 const r=await repository(t);await r.put('src/game.js','export const version=2;\n');const code=r.commit(),before=r.pr(r.base,code);
 await r.put('doc/HANDOFF.md','new follow-up\n');const after=r.pr(r.base,r.commit());
 assert.equal(after.docsOnly,false);assert.equal(after.fingerprint,before.fingerprint);
 assert.equal(decideRun({key:after.fingerprint,cacheHit:false}).run,true);
 assert.equal(decideRun({key:after.fingerprint,cacheHit:true,record:{key:before.fingerprint,passed:true,runUrl:'https://github.com/TomTomYoung/adv/actions/runs/123'}}).run,false);
});

test('CI source manuscripts, test reports, JSON data, workflow policy and assets invalidate the result',async t=>{
 const r=await repository(t);let previous=r.pr(r.base,r.base).fingerprint;
 for(const file of ['authoring/reference/volume-08.md','doc/scenarios/RELOCATED_CAST_AUDIT.md','doc/dungeons/REGIONAL_RELOCATION_CHECK.md','doc/development/DATA_SNAPSHOT.json','tests/example.test.mjs','.github/workflows/ci.yml','assets/example.png','unknown-input']){
  await r.put(file,'changed\n');const state=r.pr(r.base,r.commit());assert.equal(state.docsOnly,false,file);assert.notEqual(state.fingerprint,previous,file);previous=state.fingerprint;
 }
 assert.equal(isDocumentation('doc/HANDOFF.md'),true);assert.equal(isDocumentation('doc/input.json'),false);
});

test('CI deleted, renamed and executable-mode inputs cannot become a documentation-only change',async t=>{
 const r=await repository(t);const before=r.pr(r.base,r.base).fingerprint;
 await chmod(path.join(r.cwd,'src/game.js'),0o755);const mode=r.pr(r.base,r.commit());assert.notEqual(mode.fingerprint,before);
 r.git('mv','src/game.js','doc/moved.md');const moved=r.pr(r.base,r.commit());assert.equal(moved.docsOnly,false);assert.ok(moved.changed.includes('src/game.js'));
 await rm(path.join(r.cwd,'doc/moved.md'));const removed=r.pr(r.base,r.commit());assert.equal(removed.docsOnly,false);
});

test('CI unknown events, missing history and first pushes never imply docs-only; environment changes invalidate reuse',async t=>{
 const r=await repository(t),first=r.pr(r.base,r.base);
 for(const [name,event] of [['unknown',{}],['push',{before:'0'.repeat(40),after:r.base}],['push',{before:'f'.repeat(40),after:r.base}],['workflow_dispatch',{}]])assert.equal(r.inspect(name,event).docsOnly,false);
 assert.notEqual(r.inspect('push',{},['linux','x64','23','ubuntu24']).fingerprint,first.fingerprint);
});

test('CI reuse requires an exact successful record and manual verification always runs',()=>{
 const record={key:'current',passed:true,runUrl:'https://github.com/TomTomYoung/adv/actions/runs/123'};
 assert.equal(decideRun({key:'current',cacheHit:true,record}).run,false);
 for(const args of [{cacheHit:false,record},{cacheHit:true,record:null},{cacheHit:true,record:{...record,key:'other'}},{cacheHit:true,record:{...record,passed:false}},{cacheHit:true,record:{...record,runUrl:undefined}},{cacheHit:true,record,manual:true},{docsOnly:true,manual:true}])assert.equal(decideRun({key:'current',...args}).run,true);
});
