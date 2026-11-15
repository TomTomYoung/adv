import {prayerOrderArtFixtures} from './prayer-order-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await prayerOrderArtFixtures(),group:'machine',folder:'relocated'});
