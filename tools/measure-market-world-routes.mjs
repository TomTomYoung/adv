import {pathToFileURL} from 'node:url';
import * as market from '../tests/market-world-helpers.mjs';
import {measureWorldRoutes} from './measure-world-routes.mjs';

export function measureMarketRoutes(){return measureWorldRoutes(market,[6,7],['balanced','sustain','explore']);}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(measureMarketRoutes()));
