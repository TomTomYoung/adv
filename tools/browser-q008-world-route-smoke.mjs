import {floatingCoffinFixtures} from './q008-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...floatingCoffinFixtures(),group:'floating-coffin',folder:'generated'});
