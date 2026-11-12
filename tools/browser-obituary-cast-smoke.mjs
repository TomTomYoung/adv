import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {obituaryArtFixtures} from './obituary-art-fixtures.mjs';
await runCharacterArtSmoke({...await obituaryArtFixtures(),group:'library',folder:'relocated'});
