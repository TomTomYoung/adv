import {sluiceFixtures} from './q010-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...sluiceFixtures(),group:'sluice',folder:'generated'});
