import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {starBottleArtFixtures} from './star-bottle-art-fixtures.mjs';
await runCharacterArtSmoke({...await starBottleArtFixtures(),group:'observatory',folder:'relocated'});
