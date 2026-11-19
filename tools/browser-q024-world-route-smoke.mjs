import {edibleMapFixtures} from './q024-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';

await runCharacterArtSmoke({...edibleMapFixtures(),group:'edible-map',folder:'generated'});
