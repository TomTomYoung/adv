import {twoGravesFixtures} from './q017-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';

await runCharacterArtSmoke({...twoGravesFixtures(),group:'two-graves',folder:'generated'});
