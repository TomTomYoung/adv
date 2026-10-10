import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from './helpers.mjs';
import {projectGame} from '../src/application/projection.js';
import {projectFieldSkillTargets} from '../src/application/character-profile.js';

test('field targets retain party order and current conditions even when the caster cannot pay',()=>{
  const g=newGame();g.state.members.push('berg');g.state.actors.nio.statuses=['poison'];g.state.actors.sera.mp=1;
  const saved=g.save(),m=projectGame(g),targets=m.party.find(a=>a.id==='sera').skills.find(s=>s.id==='cleanse').fieldTargets;
  assert.deepEqual(targets.map(t=>t.id),g.state.members);
  assert.ok(targets.every(t=>!t.enabled&&t.reasonScope==='ability'));
  const poisoned=targets.find(t=>t.id==='nio');
  assert.deepEqual(poisoned.members.map(a=>({id:a.id,statuses:a.statuses})),[{id:'nio',statuses:['毒']}]);
  assert.equal(poisoned.members[0].hp,g.state.actors.nio.hp);
  assert.equal(poisoned.members[0].maxHp,g.stats('nio').hp);
  assert.deepEqual(poisoned.members[0].vitals,[],'detox does not need HP or MP target details');
  assert.deepEqual(targets.find(t=>t.id==='ada').members[0].statuses,[]);
  poisoned.members[0].statuses.push('表示側の変更');poisoned.members[0].hp=0;
  assert.equal(g.save(),saved,'the target display owns copies, including when it is disabled');
});

test('group targets describe the whole party while self skills describe only the caster',()=>{
  const g=newGame();g.award(0,3600);g.state.actors.ada.statuses=['wet'];g.state.actors.nio.hp=0;
  const saved=g.save(),[group]=projectFieldSkillTargets(g,'sera','purify');
  assert.equal(group.name,'仲間全員');assert.equal(group.id,'sera');assert.equal(group.enabled,true);
  assert.deepEqual(group.members.map(a=>a.id),g.state.members);
  assert.deepEqual(group.members.find(a=>a.id==='ada').statuses,['濡れ']);
  assert.equal(group.members.find(a=>a.id==='nio').hp,0);
  const [self]=projectFieldSkillTargets(g,'ada','breathe');
  assert.deepEqual(self.members.map(a=>a.id),['ada']);
  assert.equal(self.name,g.data.actors.ada.name);
  assert.deepEqual(self.members[0].vitals,[`HP ${g.state.actors.ada.hp}/${g.stats('ada').hp}`]);
  assert.deepEqual(projectFieldSkillTargets(g,'il','fire'),[]);
  assert.equal(g.save(),saved);
});
