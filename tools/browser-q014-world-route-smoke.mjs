import {returnCartFixtures} from './q014-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...returnCartFixtures(),group:'return-cart',folder:'generated'});
