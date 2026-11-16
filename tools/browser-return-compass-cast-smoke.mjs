import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {returnCompassArtFixtures} from './return-compass-art-fixtures.mjs';
await runCharacterArtSmoke({...await returnCompassArtFixtures(),group:'observatory',folder:'relocated'});
