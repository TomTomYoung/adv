import * as footprints from '../tests/q091-helpers.mjs';
import {worldRouteFixtures} from './world-route-browser-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';

await runCharacterArtSmoke({...worldRouteFixtures('q091',footprints),group:'returning-footprints',folder:'generated'});
