import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {returnSignalArtFixtures} from './return-signal-art-fixtures.mjs';
await runCharacterArtSmoke({...await returnSignalArtFixtures(),group:'observatory',folder:'relocated'});
