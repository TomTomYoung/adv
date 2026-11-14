import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const expected={
 'authoring/editions/e2/salome/library-second.mjs':'8e3889040578c1396acfc359869ec6d6f31ee2a1e2326615b2805ab323a6064d',
 'tools/build-library-second-quests.mjs':'28a36b5630c2574ef6ca93efb63d7ce02a81903e30fba8c672c261119670df06',
 'authoring/relocated-character-art.mjs':'6990d1e8b51c41ca9ca9e0f81599137d24f6015328be42f13763a2ede808ab74',
 'authoring/relocated-cast-review.mjs':'3846a910d9614ff69da1d41bc574f845ca3c032f84f57c5b4730b3106888b2e8',
 'tests/relocated-cast-audit.test.mjs':'d7d1a57ff130595bcbf5e82dc225df544073e6fcd917a80744fdda7cf9e6c58d',
 'tests/flower-delivery-cast.test.mjs':null,
 'tools/flower-delivery-art-fixtures.mjs':null,
 'tools/browser-flower-delivery-cast-smoke.mjs':null,
 'tools/measure-flower-delivery.mjs':null,
 '.github/workflows/salome-quests.yml':'924246ac93f73a56e9d017f0bdf74e45c7a1066172f6a8a99386029aa43989be',
 'doc/HANDOFF.md':'9416f3e9efe025d286bcee84000826aba1d5b8e8e5a3da7c72d120ba6d5bb76b',
 'doc/CURRENT_STATUS.md':'b657a45ec24f259f483d6c1ecaf8b9aff50635ae1444d2243cc04e736ff40aed',
 'doc/development/PROGRESS.md':'fc6b5c4041d0e037dd7137cf7a5db41b28540c584fb2fafe50f40229db7b724a',
 'doc/development/REMAINING_WORK.md':'fae81d0889c19ea8e99ce649bcd641ebea91bb28131594422f614a6a35c328f3',
 'doc/development/TEST_OVERVIEW.md':'f57f93627dc8d07832113cf302062d9b43eb9cdde27a14ea1843fd5674b18882',
 'doc/development/Q147_PLAYTEST_RESULTS.json':null
};
for(const [path,hash] of Object.entries(expected)){
 if(hash===null){if(fs.existsSync(path))throw Error('Unexpected existing file: '+path);}
 else if(sha(fs.readFileSync(path))!==hash)throw Error('Source changed: '+path);
}
const before=fs.readFileSync('data/scenario-editions/e2/q147.json');
if(sha(before)!=='14f02705b6d972ccba024988242dcc16c60c7be882c8fba8bac4d8f954e7cfdb')throw Error('q147 baseline changed');
let payload=[1,2,3,4].map(i=>fs.readFileSync('tools/q147-transfer/part'+i+'.txt','utf8').trim()).join('');
// Repair two identified text-transport transcription errors, then verify the full original patch hash.
payload=payload.replace('WOaFFjO0u3','WOaFjO0u3').replace('VtO3ZYj9z','VtO3bpO3ZYj9z');
fs.writeFileSync('/tmp/q147-received-payload.txt',payload);
const patch=gunzipSync(Buffer.from(payload,'base64'));
if(sha(patch)!=='731a68c23fc5d5ae7e70f70913a726b58ae1bcb1d4319d9f902e75e0d7b52f7b')throw Error('Patch checksum mismatch');
execFileSync('git',['apply','--check','-'],{input:patch});
execFileSync('git',['apply','-'],{input:patch});
const fixture='tests/fixtures/e2-q147-before-cast.json';
if(fs.existsSync(fixture))throw Error('Existing q147 fixture');
fs.writeFileSync(fixture,before);
console.log('Applied verified q147 patch; original fixture preserved.');
