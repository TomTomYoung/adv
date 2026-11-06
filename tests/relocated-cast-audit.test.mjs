import test from 'node:test';
import assert from 'node:assert/strict';
import {RELOCATED_CAST_REVIEW} from '../authoring/relocated-cast-review.mjs';
import {auditRelocatedCast,loadRelocatedCastQuests,relocatedCastFingerprint} from '../tools/audit-relocated-cast.mjs';

const quests=await loadRelocatedCastQuests();
test('cast audit distinguishes measured empty casts, reviewed scenes and candidate roles',()=>{
 const report=auditRelocatedCast(quests);
 assert.deepEqual(report.summary,{quests:100,scenes:753,emptyCastScenes:551,personEntities:123,characterLinkedEntities:62,reviewedQuests:44,reviewedScenes:302,noPersonEvidenceScenes:95,personEvidenceScenes:207,candidateRoles:3,connectedRoles:83,unreviewedScenes:451});
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
 assert.deepEqual(Object.fromEntries(Object.entries(strategist.review.people).map(([id,role])=>[id,{status:role.status,entity:role.entity}])),{
  q167_vice_captain:{status:'connected',entity:'viceCaptain'},q167_refugees:{status:'connected',entity:'refugees'}
 });
 assert.deepEqual(Object.fromEntries(strategist.scenes.map(s=>[s.id,s.review.people])),{
  entry:['q167_vice_captain','q167_refugees'],blocked:[],report:[],bridge_seen:[],enemy_seen:[],ridge:[],
  captured:[],evacuate:['q167_vice_captain','q167_refugees'],safe:['q167_refugees'],ridge_battle_ready:[]
 });
 assert.deepEqual(Object.fromEntries(strategist.scenes.map(s=>[s.id,s.cast.map(c=>c.entity)])),{
  entry:['viceCaptain','refugees'],blocked:[],report:[],bridge_seen:[],enemy_seen:[],ridge:[],
  captured:[],evacuate:['viceCaptain','refugees'],safe:['refugees'],ridge_battle_ready:[]
 });
 const twins=report.quests.find(q=>q.id==='q168');
 assert.deepEqual(Object.fromEntries(Object.entries(twins.review.people).map(([id,role])=>[id,{status:role.status,entity:role.entity}])),{
  q168_brother:{status:'connected',entity:'brother'},q168_younger:{status:'connected',entity:'younger'}
 });
 assert.deepEqual(Object.fromEntries(twins.scenes.map(s=>[s.id,s.review.people])),{
  entry:['q168_brother','q168_younger'],separated:['q168_younger'],adjust:['q168_brother','q168_younger'],
  invoice:['q168_brother','q168_younger'],fetch_brother:['q168_brother'],gather:['q168_brother','q168_younger'],
  test_both:['q168_brother','q168_younger'],tested:['q168_brother','q168_younger'],fetch_invoice:['q168_brother']
 });
 assert.deepEqual(Object.fromEntries(twins.scenes.map(s=>[s.id,s.cast.map(c=>c.entity)])),{
  entry:['brother','younger'],separated:['younger'],adjust:['brother','younger'],invoice:['brother','younger'],
  fetch_brother:['brother'],gather:['brother','younger'],test_both:['brother','younger'],
  tested:['brother','younger'],fetch_invoice:['brother']
 });
 const ring=report.quests.find(q=>q.id==='q169');
 assert.deepEqual(Object.fromEntries(Object.entries(ring.review.people).map(([id,role])=>[id,{status:role.status,entity:role.entity}])),{
  q169_mao:{status:'connected',entity:'mao'},q169_recipient:{status:'connected',entity:'recipientPerson'}
 });
 assert.deepEqual(Object.fromEntries(ring.scenes.map(s=>[s.id,s.review.people])),{
  entry:['q169_mao'],recipient:['q169_recipient'],friendship:['q169_recipient'],
  report:['q169_mao'],later:['q169_mao'],mail:[]
 });
 assert.deepEqual(Object.fromEntries(ring.scenes.map(s=>[s.id,s.cast.map(c=>c.entity)])),{
  entry:['mao'],recipient:['recipientPerson'],friendship:['recipientPerson'],report:['mao'],later:['mao'],mail:[]
 });
 const farewell=report.quests.find(q=>q.id==='q170');
 assert.deepEqual(Object.fromEntries(Object.entries(farewell.review.people).map(([id,role])=>[id,{status:role.status,entity:role.entity}])),{
  q170_sef:{status:'connected',entity:'sef'}
 });
 assert.ok(farewell.scenes.every(s=>s.review.people.length===1&&s.review.people[0]==='q170_sef'));
 assert.ok(farewell.scenes.every(s=>s.cast.length===1&&s.cast[0].entity==='sef'));
 const footsteps=report.quests.find(q=>q.id==='q171');
 assert.deepEqual(Object.fromEntries(Object.entries(footsteps.review.people).map(([id,role])=>[id,{status:role.status,entity:role.entity}])),{
  q171_dai:{status:'connected',entity:'dai'},q171_wife:{status:'candidate',entity:undefined},
  q171_family:{status:'connected',entity:'family'}
 });
 assert.deepEqual(Object.fromEntries(footsteps.scenes.map(s=>[s.id,s.review.people])),{
  entry:['q171_wife'],watch:['q171_dai'],onsite:['q171_dai','q171_wife'],rule_done:['q171_dai'],
  ward_done:['q171_dai'],wait_done:['q171_dai'],ring:['q171_dai'],loop_home:['q171_dai','q171_wife'],
  returned:['q171_dai'],return_home:['q171_dai','q171_wife'],defense:['q171_dai','q171_family'],
  defended:['q171_dai','q171_wife'],collect_family:['q171_dai','q171_family'],
  evacuated:['q171_dai','q171_family'],watch_ward_ready:['q171_dai']
 });
 assert.deepEqual(Object.fromEntries(footsteps.scenes.map(s=>[s.id,s.cast.map(c=>c.entity)])),{
  entry:[],watch:['dai'],onsite:['dai'],rule_done:['dai'],ward_done:['dai'],wait_done:['dai'],ring:['dai'],
  loop_home:['dai'],returned:['dai'],return_home:['dai'],defense:['dai','family'],defended:['dai'],
  collect_family:['dai','family'],evacuated:['dai','family'],watch_ward_ready:['dai']
 });
 const names=report.quests.find(q=>q.id==='q172');
 assert.deepEqual(Object.fromEntries(Object.entries(names.review.people).map(([id,role])=>[id,{status:role.status,entity:role.entity}])),{
  q172_lui:{status:'connected',entity:'lui'},q172_mother:{status:'connected',entity:'motherPerson'},
  q172_well_master:{status:'connected',entity:'wellMaster'}
 });
 assert.deepEqual(Object.fromEntries(names.scenes.map(s=>[s.id,s.review.people])),{
  entry:[],well:['q172_lui','q172_well_master'],onsite:['q172_lui'],mother_heard:['q172_mother'],
  market_heard:[],restored_confirm:['q172_lui'],restored:['q172_lui','q172_mother'],
  named:['q172_lui'],water:['q172_lui'],well_seal_ready:['q172_lui']
 });
 assert.deepEqual(Object.fromEntries(names.scenes.map(s=>[s.id,s.cast.map(c=>c.entity)])),{
  entry:[],well:['lui','wellMaster'],onsite:['lui'],mother_heard:['motherPerson'],market_heard:[],
  restored_confirm:['lui'],restored:['lui','motherPerson'],named:['lui'],water:['lui'],well_seal_ready:['lui']
 });
 const soldier=report.quests.find(q=>q.id==='q173');
 assert.deepEqual(Object.fromEntries(Object.entries(soldier.review.people).map(([id,role])=>[id,role.status])),{
  q173_tera:'connected',q173_spirit:'connected'
 });
 assert.deepEqual(Object.fromEntries(soldier.scenes.map(s=>[s.id,s.review.people])),{
  entry:[],spirit:['q173_spirit'],onsite:['q173_tera'],wife:['q173_tera'],
  guest_agree:['q173_tera','q173_spirit'],part_home:['q173_tera'],
  copy_home:['q173_tera','q173_spirit'],copy_later:['q173_tera','q173_spirit']
 });
 assert.deepEqual(Object.fromEntries(soldier.scenes.map(s=>[s.id,s.cast.map(c=>c.entity)])),{
  entry:[],spirit:['spiritPerson'],onsite:['tera'],wife:['tera'],guest_agree:['tera','spiritPerson'],
  part_home:['tera'],copy_home:['tera','spiritPerson'],copy_later:['tera','spiritPerson']
 });
 const funeral=report.quests.find(q=>q.id==='q174');
 assert.deepEqual(Object.fromEntries(Object.entries(funeral.review.people).map(([id,role])=>[id,role.status])),{
  q174_daughter:'candidate',q174_injured:'candidate'
 });
 assert.deepEqual(Object.fromEntries(funeral.scenes.map(s=>[s.id,s.review.people])),{
  entry:[],letter:[],onsite:['q174_daughter','q174_injured'],sealed:['q174_daughter','q174_injured'],
  named:['q174_daughter','q174_injured'],rescued:['q174_injured']
 });
 assert.ok(funeral.scenes.every(s=>s.cast.length===0),'q174 review does not implement cast yet');
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
 assert.equal(report.summary.emptyCastScenes,550);
 assert.equal(report.summary.characterLinkedEntities,63);
 assert.equal(report.summary.reviewedScenes,302);
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
