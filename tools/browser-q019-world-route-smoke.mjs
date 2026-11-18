import {mineScaleFixtures} from './q019-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';

await runCharacterArtSmoke({...mineScaleFixtures(),group:'mine-scale',folder:'generated'});
