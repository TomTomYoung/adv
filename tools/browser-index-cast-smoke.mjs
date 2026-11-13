import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {indexArtFixtures} from './index-art-fixtures.mjs';
await runCharacterArtSmoke({...await indexArtFixtures(),group:'library',folder:'relocated'});
