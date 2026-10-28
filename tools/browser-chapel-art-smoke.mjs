import {chapelArtFixtures} from './chapel-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await chapelArtFixtures(),group:'chapel',folder:'relocated'});
