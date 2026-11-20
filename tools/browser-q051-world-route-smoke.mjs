import {changeCounterFixtures} from './q051-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';

await runCharacterArtSmoke({...changeCounterFixtures(),group:'change-counter',folder:'generated'});
