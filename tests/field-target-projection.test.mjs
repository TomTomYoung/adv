import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from './helpers.mjs';
import {projectGame} from '../src/application/projection.js';
import {projectFieldSkillTargets} from '../src/application/character-profile.js';

test('field targets retain names, party order and ability restrictions without mutating the game',()=>{
  const g=newGame();g.state.members.push('berg');g.state.actors.nio.statuses=['poison'];g.state.actors.sera.mp=1;
  const saved=g.save(),m=projectGame(g),targets=m.party.find(a=>a.id==='sera').skills.find(s=>s.id==='cleanse').fieldTargets;
  assert.deepEqual(targets.map(t=>t.id),g.state.members);
  assert.deepEqual(targets.map(t=>t.name),g.state.members.map(id=>g.data.actors[id].name));
  assert.ok(targets.every(t=>!t.enabled&&t.reasonScope==='ability'));
  assert.ok(targets.every(t=>/MP/.test(t.reason)));
  targets.find(t=>t.id==='nio').name='表示側の変更';targets[0].enabled=true;targets.pop();
  assert.equal(g.save(),saved,'changing the target display does not modify the game');
});

test('group targets provide one party operation while self skills name only the caster',()=>{
  const g=newGame();g.award(0,3600);assert.ok(g.dispatch({type:'job.change',actor:'ada',job:'monk'}));g.state.actors.ada.hp=1;g.state.actors.ada.statuses=['wet'];g.state.actors.nio.hp=0;
  const saved=g.save(),groups=projectFieldSkillTargets(g,'sera','purify'),[group]=groups;
  assert.equal(groups.length,1);
  assert.equal(group.name,'仲間全員');assert.equal(group.id,'sera');assert.equal(group.enabled,true);
  const selves=projectFieldSkillTargets(g,'ada','breathe'),[self]=selves;
  assert.equal(selves.length,1);assert.equal(self.id,'ada');assert.equal(self.name,g.data.actors.ada.name);assert.equal(self.enabled,true);
  assert.deepEqual(projectFieldSkillTargets(g,'il','fire'),[]);
  assert.equal(g.save(),saved);
});
