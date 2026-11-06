import {nightSoldierArtFixtures} from './night-soldier-art-fixtures.mjs';
import {funeralArtFixtures} from './funeral-art-fixtures.mjs';
import {hunterArtFixtures} from './hunter-art-fixtures.mjs';
import {godSandalsArtFixtures} from './god-sandals-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
const fixtures=process.argv.includes('--god-sandals-only')?godSandalsArtFixtures:process.argv.includes('--hunter-only')?hunterArtFixtures:process.argv.includes('--funeral-only')?funeralArtFixtures:nightSoldierArtFixtures;
await runCharacterArtSmoke({...await fixtures(),group:'machine',folder:'relocated'});
