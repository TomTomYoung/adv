import {skyReturnArtFixtures} from './sky-return-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await skyReturnArtFixtures(),group:'observatory',folder:'relocated'});
