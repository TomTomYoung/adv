import {oilBaptismArtFixtures} from './oil-baptism-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await oilBaptismArtFixtures(),group:'machine',folder:'relocated'});
