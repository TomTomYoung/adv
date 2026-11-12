import {hourglassArtFixtures} from './hourglass-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await hourglassArtFixtures(),group:'library',folder:'relocated'});
