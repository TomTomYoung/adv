import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {proofreaderArtFixtures} from './proofreader-art-fixtures.mjs';
await runCharacterArtSmoke({...await proofreaderArtFixtures(),group:'library',folder:'relocated'});
