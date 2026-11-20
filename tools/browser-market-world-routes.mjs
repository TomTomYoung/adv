import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {marketFixtures} from './market-world-fixtures.mjs';
const quest=process.argv[2];
if(!/^q0(?:5[2-9]|60)$/.test(quest))throw Error('Expected q052 through q060');
await runCharacterArtSmoke({...marketFixtures(quest),group:quest+'-market',folder:'generated'});
