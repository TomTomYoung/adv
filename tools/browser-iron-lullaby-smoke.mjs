import {ironLullabyArtFixtures} from './iron-lullaby-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await ironLullabyArtFixtures(),group:'machine',folder:'relocated'});
