import {ratRouteFixtures} from './q009-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...ratRouteFixtures(),group:'rat-route',folder:'generated'});
