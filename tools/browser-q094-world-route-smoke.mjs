import * as tax from '../tests/q094-helpers.mjs';
import {worldRouteFixtures} from './world-route-browser-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';

await runCharacterArtSmoke({...worldRouteFixtures('q094',tax),group:'return-tax',folder:'generated'});
