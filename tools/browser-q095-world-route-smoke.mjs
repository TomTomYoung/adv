import * as memorial from '../tests/q095-helpers.mjs';
import {worldRouteFixtures} from './world-route-browser-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';

await runCharacterArtSmoke({...worldRouteFixtures('q095',memorial),group:'hero-memorial',folder:'generated'});
