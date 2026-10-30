import test from 'node:test';
import assert from 'node:assert/strict';
import {RELOCATED_CAST_REVIEW} from '../authoring/relocated-cast-review.mjs';
import {auditRelocatedCast,loadRelocatedCastQuests,relocatedCastFingerprint} from '../tools/audit-relocated-cast.mjs';

const quests=await loadRelocatedCastQuests();
test('cast audit distinguishes measured empty casts, reviewed scenes and candidate roles',()=>{
 const report=auditRelocatedCast(quests);
 assert.deepEqual(report.summary,{quests:100,scenes:753,emptyCastScenes:714,personEntities:106,characterLinkedEntities:20,reviewedQuests:14,reviewedScenes:68,noPersonEvidenceScenes:22,personEvidenceScenes:46,candidateRoles:4,connectedRoles:22,unreviewedScenes:685});
 assert.ok(report.regions.every(r=>r.quests===20));
 assert.equal(report.quests.find(q=>q.id==='q135').scenes[0].review,null);
 assert.deepEqual(report.quests.find(q=>q.id==='q032').scenes.filter(s=>s.review.people.length).map(s=>s.id),['cell','workshop']);
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
 const changed=structuredClone(quests),q=changed.find(q=>q.id==='q135'),entity=Object.values(q.story.entities).find(e=>e.kind==='person');
 entity.character='future_owner';Object.values(q.story.scenes)[0].cast=[{entity:'ane'}];
 const report=auditRelocatedCast(changed);
 assert.equal(report.summary.emptyCastScenes,713);
 assert.equal(report.summary.characterLinkedEntities,21);
 assert.equal(report.summary.reviewedScenes,68);
 assert.equal(report.quests.find(q=>q.id==='q135').review,null);
});

test('a missing reviewed quest fails instead of reducing the denominator',()=>{
 assert.throws(()=>auditRelocatedCast(quests.filter(q=>q.id!=='q032')),/q032: reviewed quest missing/);
});
