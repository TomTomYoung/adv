import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import * as abyss from '../tests/deep-abyss-helpers.mjs';
import {worldRouteFixtures} from './world-route-browser-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {measureWorldRoutes} from './measure-world-routes.mjs';

const quest=process.argv[2];assert.ok(Object.hasOwn(abyss.routes,quest));
const output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-'+quest+'-abyss';
await mkdir(output,{recursive:true});process.env.ADV_BROWSER_OUTPUT=output;
const routes={[quest]:abyss.routes[quest]},trials=measureWorldRoutes({...abyss,routes},[10,11],['balanced','sustain','support']);
assert.equal(trials.length,routes[quest].length*12);await writeFile(path.join(output,'normal-trials.json'),JSON.stringify(trials,null,2));
await runCharacterArtSmoke({...worldRouteFixtures(quest,abyss),group:quest+'-abyss',folder:'generated'});
