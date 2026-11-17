import {wageBoxFixtures} from './q006-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...wageBoxFixtures(),group:'wage-box',folder:'generated'});
