import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as wagon from '../tests/q111-world-helpers.mjs';
import {worldRouteFixtures} from './world-route-browser-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {measureWorldRoutes} from './measure-world-routes.mjs';

const output=process.env.ADV_BROWSER_OUTPUT??'/tmp/q111-wagon';
await fs.mkdir(output,{recursive:true});process.env.ADV_BROWSER_OUTPUT=output;
const trials=measureWorldRoutes(wagon,[1,2,3],wagon.catalog.quests.e2.q111.parties);
assert.equal(trials.length,wagon.routes.q111.length*18);
await fs.writeFile(path.join(output,'normal-trials.json'),JSON.stringify(trials,null,2));
await runCharacterArtSmoke({...worldRouteFixtures('q111',wagon),group:'q111-wagon',folder:'generated'});
