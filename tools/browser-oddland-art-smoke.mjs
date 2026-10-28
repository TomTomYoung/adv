import {oddlandArtFixtures} from './oddland-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await oddlandArtFixtures(),group:'oddland',folder:'oddland'});
