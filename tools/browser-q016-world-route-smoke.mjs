import {silentBlastFixtures} from './q016-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';

await runCharacterArtSmoke({...silentBlastFixtures(),group:'silent-blast',folder:'generated'});
