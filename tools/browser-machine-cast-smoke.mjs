import {nightSoldierArtFixtures} from './night-soldier-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await nightSoldierArtFixtures(),group:'machine',folder:'relocated'});
