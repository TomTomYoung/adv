import {sunkenArtFixtures} from './sunken-art-fixtures.mjs';
import {heirsArtFixtures} from './heirs-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
const parts=await Promise.all([sunkenArtFixtures(),heirsArtFixtures()]);
await runCharacterArtSmoke({fixtures:parts.flatMap(p=>p.fixtures),outcomes:parts.flatMap(p=>p.outcomes),group:'sunken',folder:'relocated'});
