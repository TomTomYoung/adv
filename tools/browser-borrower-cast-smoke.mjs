import {borrowerArtFixtures} from './borrower-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await borrowerArtFixtures(),group:'library',folder:'relocated'});
