import {whiteDebtFixtures} from './q018-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';

await runCharacterArtSmoke({...whiteDebtFixtures(),group:'white-debt',folder:'generated'});
