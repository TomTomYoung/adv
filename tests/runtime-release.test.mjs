import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {runtimeManifest} from '../tools/build-runtime.mjs';
import {runtimeReader,versionRuntimeAssets} from '../src/application/runtime-content.js';

test('the distributed runtime describes the current modules, data, styles and referenced assets',async()=>{
  const manifest=await runtimeManifest();
  assert.deepEqual(JSON.parse(await fs.readFile(new URL('../runtime.json',import.meta.url))),manifest);
  for(const file of ['src/core/engine.js','src/core/story.js','src/view/scene-style.css','data/quests/q001.json','assets/images/dungeon-corridor.png'])assert.match(manifest.files[file],/^sha256-/);
});

test('release data uses the same revision and rejects unknown files before making a request',async t=>{
  const runtime={base:'https://example.test/adv/',fresh:'new-start',manifest:{revision:'b'.repeat(64),files:{'data/game.json':'sha256-test'}}};
  const calls=[];t.mock.method(globalThis,'fetch',async(url,options)=>{calls.push({url:String(url),options});return new Response('{"version":"1.25.0"}');});
  assert.deepEqual(await runtimeReader(runtime)('data/game.json'),{version:'1.25.0'});
  assert.deepEqual(calls,[{url:`https://example.test/adv/data/game.json?v=${runtime.manifest.revision}&load=new-start`,options:{cache:'no-store',integrity:'sha256-test'}}]);
  await assert.rejects(runtimeReader(runtime)('data/missing.json'),/配信情報にない/);assert.equal(calls.length,1);
  assert.equal(runtimeReader(null),undefined);
});

test('a failed or incomplete release never falls back to another data version',async t=>{
  const runtime={base:'https://example.test/adv/',manifest:{revision:'b'.repeat(64),files:{'data/game.json':'sha256-test'}}};
  t.mock.method(globalThis,'fetch',async()=>{throw Error('integrity mismatch');});
  await assert.rejects(runtimeReader(runtime)('data/game.json'),/更新データが揃っていません/);
  globalThis.fetch.mock.mockImplementation(async()=>new Response('',{status:503}));
  await assert.rejects(runtimeReader(runtime)('data/game.json'),/503/);
});

test('image and audio URLs follow the release without changing save compatibility data',()=>{
  const data={game:{version:'1.25.0'},assets:{images:{elder:'assets/elder.webp'},audio:{battle:'assets/battle.ogg'}}};
  const runtime={base:'https://example.test/adv/',manifest:{revision:'c'.repeat(64),files:{'assets/elder.webp':'hash','assets/battle.ogg':'hash'}}};
  versionRuntimeAssets(data,runtime);
  assert.equal(data.game.version,'1.25.0');
  assert.equal(data.assets.images.elder,`https://example.test/adv/assets/elder.webp?v=${runtime.manifest.revision}`);
  assert.equal(data.assets.audio.battle,`https://example.test/adv/assets/battle.ogg?v=${runtime.manifest.revision}`);
});

test('a transient failure retries the same URL with its release fingerprint',async t=>{
  const runtime={base:'https://example.test/adv/',fresh:'same-start',manifest:{revision:'rev',files:{'data/game.json':'sha256-test'}}};
  const calls=[];
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    calls.push({url:String(url),options});
    return calls.length===1?new Response(null,{status:503}):Response.json({version:'recovered'});
  });
  assert.deepEqual(await runtimeReader(runtime)('data/game.json'),{version:'recovered'});
  assert.equal(calls.length,2);
  assert.deepEqual(calls[1],calls[0]);
  assert.equal(calls[1].options.integrity,'sha256-test');
});

test('permanent HTTP errors and invalid JSON are reported on the first read',async t=>{
  const {readContentJson}=await import('../src/core/read-content-json.js');
  const fetch=t.mock.method(globalThis,'fetch',async()=>new Response(null,{status:404}));
  await assert.rejects(readContentJson('data/missing.json'),/data\/missing\.json \(404\)/);
  assert.equal(fetch.mock.callCount(),1);
  fetch.mock.mockImplementation(async()=>new Response('invalid json'));
  await assert.rejects(readContentJson('data/malformed.json'),SyntaxError);
  assert.equal(fetch.mock.callCount(),2);
});

test('the loader bounds parallel reads and stops issuing new reads after a fatal error',async()=>{
  const {loadContent}=await import('../src/core/loader.js');
  const manifest=JSON.parse(await fs.readFile(new URL('../data/game.json',import.meta.url)));
  const firstFile=Object.values(manifest.files.databases)[0],started=[];
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  await assert.rejects(loadContent(async path=>{
    if(path==='data/game.json')return manifest;
    started.push(path);
    if(path===firstFile)throw Error('missing database');
    await gate;
  }),/missing database/);
  assert.equal(started.length,8);
  release();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(started.length,8);
});
