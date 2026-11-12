import {postwarArtFixtures} from './postwar-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await postwarArtFixtures(),group:'observatory',folder:'relocated'});
