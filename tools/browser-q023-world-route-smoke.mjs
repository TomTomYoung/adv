import {motherRingFixtures} from './q023-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';

await runCharacterArtSmoke({...motherRingFixtures(),group:'mother-ring',folder:'generated'});
