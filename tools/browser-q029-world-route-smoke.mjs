import {redHoneyFixtures} from './q029-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';

await runCharacterArtSmoke({...redHoneyFixtures(),group:'red-honey',folder:'generated'});
