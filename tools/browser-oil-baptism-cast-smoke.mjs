import {oilBaptismArtFixtures} from './oil-baptism-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
const cases=await oilBaptismArtFixtures();
// The old heating-first save must expose the repaired consultation in the real UI.
for(const f of cases.fixtures)if(f.scene==='warm'&&!f.absentStoryScene)f.availableChoice='change';
await runCharacterArtSmoke({...cases,group:'machine',folder:'relocated'});
