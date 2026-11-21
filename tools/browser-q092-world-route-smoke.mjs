import * as shelter from '../tests/q092-helpers.mjs';
import {worldRouteFixtures} from './world-route-browser-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';

await runCharacterArtSmoke({...worldRouteFixtures('q092',shelter),group:'moving-shelter',folder:'generated'});
