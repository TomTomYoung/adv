import {rootMorningFixtures} from './q030-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';

await runCharacterArtSmoke({...rootMorningFixtures(),group:'root-morning',folder:'generated'});
