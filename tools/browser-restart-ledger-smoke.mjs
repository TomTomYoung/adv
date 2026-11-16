import {restartLedgerArtFixtures} from './restart-ledger-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await restartLedgerArtFixtures(),group:'machine',folder:'relocated'});
