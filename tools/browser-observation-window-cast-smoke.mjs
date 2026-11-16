import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {observationWindowArtFixtures} from './observation-window-art-fixtures.mjs';
await runCharacterArtSmoke({...await observationWindowArtFixtures(),group:'observatory',folder:'relocated'});
