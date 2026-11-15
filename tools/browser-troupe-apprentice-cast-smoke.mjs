import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {troupeApprenticeArtFixtures} from './troupe-apprentice-art-fixtures.mjs';
await runCharacterArtSmoke({...await troupeApprenticeArtFixtures(),group:'library',folder:'relocated'});
