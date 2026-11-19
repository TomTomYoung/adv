import {crownFixtures} from './q020-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';

await runCharacterArtSmoke({...crownFixtures(),group:'crown',folder:'generated'});
