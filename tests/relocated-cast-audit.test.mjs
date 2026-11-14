import test from 'node:test';
import assert from 'node:assert/strict';
import {RELOCATED_CAST_REVIEW} from '../authoring/relocated-cast-review.mjs';
import {auditRelocatedCast,loadRelocatedCastQuests,relocatedCastFingerprint} from '../tools/audit-relocated-cast.mjs';

const quests=await loadRelocatedCastQuests();
test('cast audit distinguishes measured empty casts, reviewed scenes and candidate roles',()=>{
 const report=auditRelocatedCast(quests);
 assert.deepEqual(report.summary,{"quests":100,"scenes":753,"emptyCastScenes":308,"personEntities":145,"characterLinkedEntities":131,"reviewedQuests":79,"reviewedScenes":607,"noPersonEvidenceScenes":161,"personEvidenceScenes":446,"candidateRoles":1,"connectedRoles":178,"unreviewedScenes":146});
 const scaleQuest=report.quests.find(q=>q.id==='q148');
 assert.deepEqual(Object.keys(scaleQuest.review.people),['q148_egi','q148_customer']);
 assert.deepEqual(Object.fromEntries(scaleQuest.scenes.map(s=>[s.id,s.cast.map(c=>c.entity)])),{
  entry:[],denied:['egi','customer'],proof:['egi','customer'],market:['egi','customer'],
  public_demo:['egi','customer'],private_refund:['egi','customer'],fetch_scale:[],removed:[]
 });
 const banner=report.quests.find(q=>q.id==='q141');
 assert.deepEqual(Object.fromEntries(Object.entries(banner.review.people).map(([id,role])=>[id,{status:role.status,entity:role.entity}])),{
  q141_band:{status:'connected',entity:'band'},q141_sana:{status:'connected',entity:'sana'}
 });
 assert.deepEqual(Object.fromEntries(banner.scenes.map(s=>[s.id,s.cast.map(c=>c.entity)])),{
  entry:['band'],sana:['sana'],score_use:[],performed_use:['band'],score_new:[],performed_new:['band'],performed_silent:['band']
 });
 const jewel=report.quests.find(q=>q.id==='q142');
 assert.deepEqual(Object.fromEntries(Object.entries(jewel.review.people).map(([id,role])=>[id,{status:role.status,entity:role.entity}])),{
  q142_kio:{status:'connected',entity:'kio'},q142_buyer:{status:'connected',entity:'buyerPerson'}
 });
 assert.deepEqual(Object.fromEntries(jewel.scenes.map(s=>[s.id,s.cast.map(c=>c.entity)])),{
  entry:['kio'],buyer:['kio','buyerPerson'],refunded:['kio','buyerPerson'],repair_contract:['kio','buyerPerson']
 });
 const kitchen=report.quests.find(q=>q.id==='q143');
 assert.deepEqual(Object.fromEntries(Object.entries(kitchen.review.people).map(([id,role])=>[id,{status:role.status,entity:role.entity}])),{
  q143_meme:{status:'connected',entity:'meme'},q143_assistant:{status:'connected',entity:'assistant'},
  q143_spirit:{status:'connected',entity:'spirit'},q143_replacement:{status:'connected',entity:'replacement'}
 });
 const crew=['meme','assistant','spirit'],all=[...crew,'replacement'];
 assert.deepEqual(Object.fromEntries(kitchen.scenes.map(s=>[s.id,s.cast.map(c=>c.entity)])),{
  entry:crew,roles:crew,hire:all,fire_show:all,plates:crew,taste_show:crew,shift_show:crew,entry_hire_ready:crew
 });
 const villain=report.quests.find(q=>q.id==='q144'),pair=['jill','wardrobe'],trio=[...pair,'youngActor'];
 assert.deepEqual(Object.fromEntries(Object.entries(villain.review.people).map(([id,p])=>[id,{status:p.status,entity:p.entity}])),{
  q144_jill:{status:'connected',entity:'jill'},q144_wardrobe:{status:'connected',entity:'wardrobe'},q144_youngActor:{status:'connected',entity:'youngActor'}
 });
 assert.deepEqual(Object.fromEntries(villain.scenes.map(s=>[s.id,s.cast.map(c=>c.entity)])),{
  entry:pair,play:trio,repair:pair,show_light:trio,show_wit:trio,
  retire_consent:pair,retire_after_trial:trio,last_show:trio
 });
 assert.deepEqual(villain.scenes.find(s=>s.id==='last_show').cast[2].when,{op:'eq',left:{ref:'stories.q144.values.youngActorAt'},right:'stage'});
 const bloom=report.quests.find(q=>q.id==='q145');
 assert.deepEqual(Object.fromEntries(Object.entries(bloom.review.people).map(([id,p])=>[id,{status:p.status,entity:p.entity}])),{
  q145_mother:{status:'connected',entity:'motherPerson'}
 });
 assert.deepEqual(Object.fromEntries(bloom.scenes.map(s=>[s.id,s.cast.map(c=>c.entity)])),{
  entry:[],letter:['motherPerson'],mother:['motherPerson'],now_garden:['motherPerson'],sent:[],
  half_garden:['motherPerson'],collect_letter:[],waited_garden:['motherPerson']
 });
 const uniform=report.quests.find(q=>q.id==='q146');
 assert.deepEqual(Object.fromEntries(Object.entries(uniform.review.people).map(([id,p])=>[id,{status:p.status,entity:p.entity}])),{
  q146_veteran:{status:'connected',entity:'veteran'},q146_colleagues:{status:'connected',entity:'colleagues'}
 });
 assert.deepEqual(Object.fromEntries(uniform.scenes.map(s=>[s.id,s.cast.map(c=>c.entity)])),{
  entry:['veteran'],friends:['veteran','colleagues'],dyed:['veteran'],
  reunion:['veteran','colleagues'],tailored:['veteran'],stored:['veteran']
 });
 const lateDelivery=report.quests.find(q=>q.id==='q147');
 assert.deepEqual(Object.keys(lateDelivery.review.people),['q147_recipient']);
 assert.deepEqual(lateDelivery.scenes.filter(s=>s.cast.length).map(s=>s.id),['closed','quiet_arrival','tomorrow_arrival']);
 assert.ok(lateDelivery.scenes.filter(s=>s.cast.length).every(s=>s.cast[0].entity==='recipient'));
 const obituary=report.quests.find(q=>q.id==='q044');assert.deepEqual(obituary.scenes.filter(s=>s.review.people.length).map(s=>s.id),['safe','escaped','protected','safe_refuge']);
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
  q174_daughter:'connected',q174_injured:'connected'
 });
 assert.deepEqual(Object.fromEntries(funeral.scenes.map(s=>[s.id,s.review.people])),{
  entry:[],letter:[],onsite:['q174_daughter','q174_injured'],sealed:['q174_daughter','q174_injured'],
  named:['q174_daughter','q174_injured'],rescued:['q174_injured']
 });
 assert.deepEqual(Object.fromEntries(Object.entries(funeral.review.people).map(([id,r])=>[id,{status:r.status,entity:r.entity}])),{
  q174_daughter:{status:'connected',entity:'daughterPerson'},q174_injured:{status:'connected',entity:'injured'}
 });
 assert.deepEqual(Object.fromEntries(funeral.scenes.map(s=>[s.id,s.cast.map(c=>c.entity)])),{
  entry:[],letter:[],onsite:['daughterPerson','injured'],sealed:['daughterPerson','injured'],named:['daughterPerson','injured'],rescued:['injured']
 });
 const hunter=report.quests.find(q=>q.id==='q175');
 assert.ok(Object.values(hunter.review.people).every(p=>p.status==='connected'));
 assert.deepEqual(hunter.scenes.filter(s=>!s.cast.length).map(s=>s.id),['entry']);
 const god=report.quests.find(q=>q.id==='q176');assert.equal(Object.keys(god.review.people).length,4);
 assert.ok(Object.values(god.review.people).every(p=>p.status==='connected'));
 assert.deepEqual(god.scenes.filter(s=>!s.cast.length).map(s=>s.id),['entry']);
 assert.deepEqual(god.scenes.find(s=>s.id==='road').cast.map(c=>c.entity),['priestPerson','roadkeepers']);
 assert.deepEqual(god.scenes.filter(s=>s.review.people.includes('q176_merchant')).map(s=>s.id),['travel']);
 assert.match(god.scenes.find(s=>s.id==='road').review.reason,/shrineに留まり/);
 const mirror=report.quests.find(q=>q.id==='q177');
 assert.deepEqual(Object.keys(mirror.review.people),['q177_courier','q177_customers']);
 assert.ok(Object.values(mirror.review.people).every(p=>p.status==='connected'));
 assert.deepEqual(mirror.scenes.filter(s=>s.review.people.includes('q177_courier')).map(s=>s.id),['onsite']);
 assert.deepEqual(mirror.scenes.filter(s=>s.review.people.includes('q177_customers')).map(s=>s.id),['notice']);
 assert.deepEqual(mirror.scenes.filter(s=>s.cast.length).map(s=>[s.id,s.cast.map(c=>c.entity)]),[['onsite',['courierPerson']],['notice',['customers']]]);
 const garden=report.quests.find(q=>q.id==='q179');
 assert.equal(garden.scenes.length,17);assert.equal(Object.keys(garden.review.people).length,4);
 assert.ok(Object.values(garden.review.people).every(p=>p.status==='connected'));
 assert.deepEqual(garden.scenes.filter(s=>!s.review.people.length).map(s=>s.id),['entry']);
 assert.equal(garden.scenes.filter(s=>s.review.people.includes('q179_keeper')).length,16);
 for(let i=1;i<=3;i++)assert.deepEqual(garden.scenes.filter(s=>s.review.people.includes('q179_house'+i)).map(s=>s.id),['house'+i,'house'+i+'_done']);
 const tale=report.quests.find(q=>q.id==='q180');
 assert.equal(tale.scenes.length,9);assert.deepEqual(Object.keys(tale.review.people),['q180_mui','q180_listeners']);
 assert.ok(Object.values(tale.review.people).every(p=>p.status==='connected'));
 assert.deepEqual(tale.scenes.filter(s=>s.review.people.includes('q180_listeners')).map(s=>s.id),['onsite','told_original','told_new','sealed_here','sealed_refuge','banned']);
 const door=report.quests.find(q=>q.id==='q178');
 assert.deepEqual(Object.keys(door.review.people),['q178_daughter','q178_parent','q178_host']);
 assert.ok(Object.values(door.review.people).every(p=>p.status==='connected'));
 assert.deepEqual(door.scenes.filter(s=>s.review.people.includes('q178_parent')).map(s=>s.id),['family','wait_talk','wait']);
 assert.deepEqual(door.scenes.filter(s=>s.review.people.includes('q178_host')).map(s=>s.id),['delivered']);
 assert.deepEqual(door.scenes.filter(s=>!s.review.people.length).map(s=>s.id),['entry','closed']);
 assert.match(door.scenes.find(s=>s.id==='daughter_door').review.reason,/次の出発時/);
 assert.match(door.scenes.find(s=>s.id==='delivered').review.reason,/finish時/);
 assert.deepEqual(hunter.scenes.filter(s=>s.review.people.includes('q175_lookout')).map(s=>s.id),['warned','pursued']);
 assert.deepEqual(hunter.scenes.filter(s=>s.review.people.includes('q175_miro')).map(s=>s.id),['hidden','route','warning','onsite','battle','changed','warned','pursuit','pursued']);
 assert.deepEqual(hunter.scenes.filter(s=>s.review.people.includes('q175_sister')).map(s=>s.id),['hidden','route','warning','onsite','battle','changed','warned','pursuit','pursued']);
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
 const report=auditRelocatedCast(changed),baseline=auditRelocatedCast(quests);
 assert.equal(report.summary.emptyCastScenes,baseline.summary.emptyCastScenes-1);
 assert.equal(report.summary.characterLinkedEntities,baseline.summary.characterLinkedEntities+1);
 assert.equal(report.summary.reviewedScenes,baseline.summary.reviewedScenes);
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
