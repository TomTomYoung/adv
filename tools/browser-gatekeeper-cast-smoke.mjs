import {gatekeeperArtFixtures} from './gatekeeper-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await gatekeeperArtFixtures(),group:'machine',folder:'relocated'});
