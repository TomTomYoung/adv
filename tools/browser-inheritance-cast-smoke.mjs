import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {inheritanceArtFixtures} from './inheritance-art-fixtures.mjs';
await runCharacterArtSmoke({...await inheritanceArtFixtures(),group:'library',folder:'relocated'});
