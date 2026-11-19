import {gardenersSeatFixtures} from './q028-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';

await runCharacterArtSmoke({...gardenersSeatFixtures(),group:'gardeners-seat',folder:'generated'});
