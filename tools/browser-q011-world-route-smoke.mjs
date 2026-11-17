import {saltBrideFixtures} from './q011-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...saltBrideFixtures(),group:'saltbride',folder:'generated'});
