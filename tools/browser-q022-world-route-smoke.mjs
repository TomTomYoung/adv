import {greenSleepFixtures} from './q022-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';

await runCharacterArtSmoke({...greenSleepFixtures(),group:'green-sleep',folder:'generated'});
