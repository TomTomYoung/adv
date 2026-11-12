import {returningSoldierArtFixtures} from './returning-soldier-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await returningSoldierArtFixtures(),group:'observatory',folder:'relocated'});
