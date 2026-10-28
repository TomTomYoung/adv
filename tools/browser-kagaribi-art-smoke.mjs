import {kagaribiArtFixtures} from './kagaribi-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await kagaribiArtFixtures(),group:'kagaribi',folder:'kagaribi'});
