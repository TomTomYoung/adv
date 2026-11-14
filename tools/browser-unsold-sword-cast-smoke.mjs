import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {unsoldSwordArtFixtures} from './unsold-sword-art-fixtures.mjs';
await runCharacterArtSmoke({...await unsoldSwordArtFixtures(),group:'library',folder:'relocated'});
