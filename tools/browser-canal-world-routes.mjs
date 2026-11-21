import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import * as canal from '../tests/canal-world-helpers.mjs';
import {worldRouteFixtures} from './world-route-browser-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {measureWorldRoutes} from './measure-world-routes.mjs';

const quest=process.argv[2];assert.ok(Object.hasOwn(canal.routes,quest));
const output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-'+quest+'-canal';
await mkdir(output,{recursive:true});process.env.ADV_BROWSER_OUTPUT=output;
const routes={[quest]:canal.routes[quest]},trials=measureWorldRoutes({...canal,routes},[1,2],canal.catalog.quests.e2[quest].parties);
assert.equal(trials.length,routes[quest].length*12);await writeFile(path.join(output,'normal-trials.json'),JSON.stringify(trials,null,2));
await runCharacterArtSmoke({...worldRouteFixtures(quest,canal),group:quest+'-canal',folder:'generated'});
