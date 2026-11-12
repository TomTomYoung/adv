import {inkFireArtFixtures} from './ink-fire-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await inkFireArtFixtures(),group:'library',folder:'relocated'});
