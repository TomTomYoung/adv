import {spareArmArtFixtures} from './spare-arm-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await spareArmArtFixtures(),group:'machine',folder:'relocated'});
