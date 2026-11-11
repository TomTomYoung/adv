import {flaglessSoldierArtFixtures} from './flagless-soldier-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await flaglessSoldierArtFixtures(),group:'observatory',folder:'relocated'});
