import {orchardPromiseFixtures} from './q026-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';

await runCharacterArtSmoke({...orchardPromiseFixtures(),group:'orchard-promise',folder:'generated'});
