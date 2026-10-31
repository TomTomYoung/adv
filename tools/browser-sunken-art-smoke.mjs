import {sunkenArtFixtures} from './sunken-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await sunkenArtFixtures(),group:'sunken',folder:'relocated'});
