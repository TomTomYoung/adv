import test from 'node:test';
import assert from 'node:assert/strict';
import {RELOCATED_CAST_REVIEW} from '../authoring/relocated-cast-review.mjs';
import {auditRelocatedCast,loadRelocatedCastQuests,relocatedCastFingerprint} from '../tools/audit-relocated-cast.mjs';

const quests=await loadRelocatedCastQuests();
test('cast audit distinguishes measured empty casts, reviewed scenes and candidate roles',()=>{
 const report=auditRelocatedCast(quests);
 assert.deepEqual(report.summary,{quests:100,scenes:753,emptyCastScenes:608,personEntities:119,characterLinkedEntities:50,reviewedQuests:37,reviewedScenes:237,noPersonEvidenceScenes:89,personEvidenceScenes:148,candidateRoles:2,connectedRoles:69,unreviewedScenes:516});
 assert.ok(report.regions.every(r=>r.quests===20));
 assert.equal(report.quests.find(q=>q.id==='q071').scenes[0].review,null);
 assert.deepEqual(report.quests.find(q=>q.id==='q032').scenes.filter(s=>s.review.people.length).map(s=>s.id),['cell','workshop']);
 const aid=report.quests.find(q=>q.id==='q165');
 assert.deepEqual(Object.fromEntries(Object.entries(aid.review.people).map(([id,role])=>[id,{status:role.status,entity:role.entity}])),{
  q165_lina:{status:'connected',entity:'lina'},q165_il:{status:'connected',entity:'ilGuest'}
 });
 assert.ok(aid.scenes.every(s=>s.review.people.includes('q165_lina')));
 assert.deepEqual(aid.scenes.filter(s=>s.review.people.includes('q165_il')).map(s=>s.id),['public','ask_il','secret_report','open_supply']);
 const apprentice=report.quests.find(q=>q.id==='q166');
 assert.deepEqual(Object.fromEntries(Object.entries(apprentice.review.people).map(([id,role])=>[id,{status:role.status,entity:role.entity}])),{
  q166_ruu:{status:'connected',entity:'ruu'},q166_master:{status:'connected',entity:'master'},
  q166_examiner:{status:'connected',entity:'examiner'},q166_porter:{status:'connected',entity:'porter'}
 });
 // A later ending or an office name does not place the master, examiner or porter in every scene.
 assert.deepEqual(Object.fromEntries(apprentice.scenes.map(s=>[s.id,s.review.people])),{
  entry:['q166_ruu','q166_master'],trial:['q166_ruu','q166_porter'],
  report:['q166_ruu','q166_examiner'],interview:['q166_ruu','q166_examiner'],
  retry_report:['q166_ruu'],trial_battle_ready:['q166_ruu']
 });
 assert.deepEqual(Object.fromEntries(apprentice.scenes.map(s=>[s.id,s.cast.map(c=>c.entity)])),{
  entry:['ruu','master'],trial:['ruu','porter'],report:['ruu','examiner'],interview:['ruu','examiner'],
  retry_report:['ruu'],trial_battle_ready:['ruu']
 });
 const strategist=report.quests.find(q=>q.id==='q167');
 assert.deepEqual(Object.fromEntries(Object.entries(strategist.review.people).map(([id,role])=>[id,role.status])),{
  q167_vice_captain:'candidate',q167_refugees:'candidate'
 });
 assert.deepEqual(Object.fromEntries(strategist.scenes.map(s=>[s.id,s.review.people])),{
  entry:['q167_vice_captain','q167_refugees'],blocked:[],report:[],bridge_seen:[],enemy_seen:[],ridge:[],
  captured:[],evacuate:['q167_vice_captain','q167_refugees'],safe:['q167_refugees'],ridge_battle_ready:[]
 });
 assert.ok(strategist.scenes.every(s=>s.cast.length===0),'q167 review does not implement cast yet');
});

test('a change to reviewed prose or location cannot silently retain the review',()=>{
 for(const mutate of [q=>q.model.graph[0].text+=' キリが入ってきた。',q=>q.story.worldPlaces.entry.x++]){
  const changed=structuredClone(quests);mutate(changed.find(q=>q.id==='q031'));
  assert.throws(()=>auditRelocatedCast(changed),/q031: source changed/);
 }
 const changed=structuredClone(quests);changed.find(q=>q.id==='q036').client='別の依頼人';
 assert.throws(()=>auditRelocatedCast(changed),/related client q036 changed/);
});

test('updating a fingerprint cannot hide lost prose evidence or an unreviewed new scene',()=>{
 for(const kind of ['evidence','scene']){
  const changed=structuredClone(quests),review=structuredClone(RELOCATED_CAST_REVIEW),q=changed.find(q=>q.id==='q032');
  if(kind==='evidence')q.model.graph.find(n=>n.id==='cell').text='地下牢に人影はない。';
  else q.story.scenes.new_room={place:'entry',cast:[]};
  review.quests.q032.sourceSha256=relocatedCastFingerprint(q);
  assert.throws(()=>auditRelocatedCast(changed,review),kind==='evidence'?/q032\/cell: evidence missing/:/review must cover every scene/);
 }
});

test('reviews reject unknown, contradictory and orphan candidate roles',()=>{
 for(const kind of ['unknown','contradictory','orphan']){
  const review=structuredClone(RELOCATED_CAST_REVIEW),r=review.quests.q032;
  if(kind==='unknown')r.scenes.cell.people=['unverified_client'];
  if(kind==='contradictory')r.scenes.cell.decision='no-person-evidence';
  if(kind==='orphan')r.people.extra={label:'余分な役',status:'candidate',need:'未制作'};
  assert.throws(()=>auditRelocatedCast(quests,review),kind==='unknown'?/unknown role/:kind==='contradictory'?/decision and people disagree/:/has no scene evidence/);
 }
});

test('future character and cast hookups change measured counts without marking unrelated scenes reviewed',()=>{
 const changed=structuredClone(quests),q=changed.find(q=>q.id==='q071'),entity=Object.values(q.story.entities).find(e=>e.kind==='person');
 entity.character='future_owner';Object.values(q.story.scenes)[0].cast=[{entity:'workerPerson'}];
 const report=auditRelocatedCast(changed);
 assert.equal(report.summary.emptyCastScenes,607);
 assert.equal(report.summary.characterLinkedEntities,51);
 assert.equal(report.summary.reviewedScenes,237);
 assert.equal(report.quests.find(q=>q.id==='q071').review,null);
});

test('a missing reviewed quest fails instead of reducing the denominator',()=>{
 assert.throws(()=>auditRelocatedCast(quests.filter(q=>q.id!=='q032')),/q032: reviewed quest missing/);
});

// Evidence may be a single conditional prose branch, but cannot be invented by concatenation.
test('conditional scene evidence is checked against individual prose fragments',()=>{
 const review=structuredClone(RELOCATED_CAST_REVIEW);review.quests.q136.scenes.purpose.evidence='旅の仮名が来訪帳へ刻まれた。';
 assert.doesNotThrow(()=>auditRelocatedCast(quests,review));
 const changed=structuredClone(quests),q=changed.find(q=>q.id==='q136');q.model.graph.find(n=>n.id==='purpose').text[0].yes='別の記録になった。';review.quests.q136.sourceSha256=relocatedCastFingerprint(q);
 assert.throws(()=>auditRelocatedCast(changed,review),/q136\/purpose: evidence missing/);
});
