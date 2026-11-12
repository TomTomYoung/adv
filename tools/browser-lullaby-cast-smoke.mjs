import {lullabyArtFixtures} from './lullaby-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await lullabyArtFixtures(),group:'observatory',folder:'relocated'});
