import {breathingVeinFixtures} from './q013-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...breathingVeinFixtures(),group:'breathing-vein',folder:'generated'});
