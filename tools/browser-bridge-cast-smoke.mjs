import {bridgeArtFixtures} from './bridge-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await bridgeArtFixtures(),group:'observatory',folder:'relocated'});
