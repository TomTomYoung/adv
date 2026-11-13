import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {bookmarkArtFixtures} from './bookmark-art-fixtures.mjs';
await runCharacterArtSmoke({...await bookmarkArtFixtures(),group:'library',folder:'relocated'});
