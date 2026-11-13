import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {warPageArtFixtures} from './war-page-art-fixtures.mjs';
await runCharacterArtSmoke({...await warPageArtFixtures(),group:'library',folder:'relocated'});
