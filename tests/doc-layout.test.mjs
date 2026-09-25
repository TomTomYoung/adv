import test from 'node:test';
import assert from 'node:assert/strict';
import {docPath,relocateDoc,docGroups} from '../tools/doc-layout.mjs';
test('all documentation groups retain their destination and rebase cross-folder generated sections',()=>{
  for(const [folder,names] of Object.entries(docGroups))for(const name of names){
    assert.equal(docPath(name),`${folder}/${name}`);
    assert.equal(docPath(docPath(name)),`${folder}/${name}`);
  }
  assert.equal(relocateDoc('[town](LOCATION_CATALOG.md) [editor](CONFIG_EDITORS.md) [checks](PROGRESS.md) ![image](../assets/images/slime.png)','MONSTER_CATALOG.md'),
    '[town](../world/LOCATION_CATALOG.md) [editor](../authoring/CONFIG_EDITORS.md) [checks](../development/PROGRESS.md) ![image](../../assets/images/slime.png)');
  assert.equal(docPath('DUNGEON_SYSTEMS_1_7.md'),'dungeons/DUNGEON_SYSTEMS.md');
  assert.equal(docPath('scenarios/EXPLORATION_AND_PROSE_1_11.md'),'scenarios/EXPLORATION_AND_PROSE.md');
});
test('UI documentation generators resolve the new folder and preserve root, scenario and asset links',()=>{
  assert.equal(docPath('VIEW_CONTRACT.md'),'ui/VIEW_CONTRACT.md');assert.equal(docPath('ui/VIEW_CONTRACT.md'),'ui/VIEW_CONTRACT.md');
  assert.equal(relocateDoc('[spec](SPEC.md) [keys](KEYBOARD_CONTROLS.md) [story](SCRIPT_REFERENCE.md) ![image](../assets/images/slime.png)','IN_SCENE_VIEW.md'),'[spec](../SPEC.md) [keys](KEYBOARD_CONTROLS.md) [story](../scenarios/SCRIPT_REFERENCE.md) ![image](../../assets/images/slime.png)');
  assert.equal(relocateDoc('<img src="../assets/effects/fx_slash_arc.png"> <a href="SPEC.md">spec</a>','EFFECT_CATALOG.md'),'<img src="../../assets/effects/fx_slash_arc.png"> <a href="../SPEC.md">spec</a>');
});
test('cross-folder links gain ui prefix without altering external links, anchors or fenced examples',()=>{
  const source='[view](VIEW_CONTRACT.md#viewmodel) [external](https://example.test/VIEW_CONTRACT.md) [anchor](#viewmodel)\n```md\n[view](VIEW_CONTRACT.md)\n```';
  assert.equal(relocateDoc(source,'SCRIPT_REFERENCE.md'),'[view](../ui/VIEW_CONTRACT.md#viewmodel) [external](https://example.test/VIEW_CONTRACT.md) [anchor](#viewmodel)\n```md\n[view](VIEW_CONTRACT.md)\n```');
});
