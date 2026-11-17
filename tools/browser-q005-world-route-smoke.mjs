import {drainageFixtures} from './q005-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...drainageFixtures(),group:'drainage',folder:'generated'});
