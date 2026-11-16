import {ironInheritanceArtFixtures} from './iron-inheritance-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await ironInheritanceArtFixtures(),group:'machine',folder:'relocated'});
