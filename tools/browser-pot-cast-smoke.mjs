import {potArtFixtures} from './pot-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await potArtFixtures(),group:'observatory',folder:'relocated'});
