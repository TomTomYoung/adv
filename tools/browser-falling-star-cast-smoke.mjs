import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {fallingStarArtFixtures} from './falling-star-art-fixtures.mjs';
await runCharacterArtSmoke({...await fallingStarArtFixtures(),group:'observatory',folder:'relocated'});
