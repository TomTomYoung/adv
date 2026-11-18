import {threePicksFixtures} from './q012-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...threePicksFixtures(),group:'three-picks',folder:'generated'});
