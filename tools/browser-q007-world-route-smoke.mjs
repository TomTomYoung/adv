import {voiceWallFixtures} from './q007-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...voiceWallFixtures(),group:'voice-wall',folder:'generated'});
