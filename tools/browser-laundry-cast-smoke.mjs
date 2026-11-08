import {laundryArtFixtures} from './laundry-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await laundryArtFixtures(),group:'observatory',folder:'relocated'});
