import * as inn from '../tests/q093-helpers.mjs';
import {worldRouteFixtures} from './world-route-browser-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';

await runCharacterArtSmoke({...worldRouteFixtures('q093',inn),group:'inn-names',folder:'generated'});
