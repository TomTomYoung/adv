import {pollenRansomFixtures} from './q027-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';

await runCharacterArtSmoke({...pollenRansomFixtures(),group:'pollen-ransom',folder:'generated'});
