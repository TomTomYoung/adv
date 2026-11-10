import {truceArtFixtures} from './truce-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await truceArtFixtures(),group:'observatory',folder:'relocated'});
