import {quiverArtFixtures} from './quiver-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await quiverArtFixtures(),group:'observatory',folder:'relocated'});
