import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {flowerDeliveryArtFixtures} from './flower-delivery-art-fixtures.mjs';
await runCharacterArtSmoke({...await flowerDeliveryArtFixtures(),group:'library',folder:'relocated'});
