import {seedBirdFixtures} from './q021-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';

await runCharacterArtSmoke({...seedBirdFixtures(),group:'seed-bird',folder:'generated'});
