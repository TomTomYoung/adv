import {gunnerArtFixtures} from './gunner-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await gunnerArtFixtures(),group:'observatory',folder:'relocated'});
