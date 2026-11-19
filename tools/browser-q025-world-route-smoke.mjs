import {rainSongFixtures} from './q025-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';

await runCharacterArtSmoke({...rainSongFixtures(),group:'rain-song',folder:'generated'});
