import {footstepsWifeArtFixtures} from './footsteps-wife-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await footstepsWifeArtFixtures(),group:'machine',folder:'relocated'});
