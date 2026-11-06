import {nightSoldierArtFixtures} from './night-soldier-art-fixtures.mjs';
import {funeralArtFixtures} from './funeral-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
const fixtures=process.argv.includes('--funeral-only')?funeralArtFixtures:nightSoldierArtFixtures;
await runCharacterArtSmoke({...await fixtures(),group:'machine',folder:'relocated'});
