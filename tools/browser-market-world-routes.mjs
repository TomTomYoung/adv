import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {marketFixtures} from './market-world-fixtures.mjs';
const quest=process.argv[2];
if(!/^q05[2-5]$/.test(quest))throw Error('Expected q052, q053, q054 or q055');
await runCharacterArtSmoke({...marketFixtures(quest),group:quest+'-market',folder:'generated'});
