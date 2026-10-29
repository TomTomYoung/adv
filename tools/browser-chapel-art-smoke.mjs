import {chapelArtFixtures} from './chapel-art-fixtures.mjs';
import {pilgrimArtFixtures} from './pilgrim-art-fixtures.mjs';
import {receiptArtFixtures} from './receipt-art-fixtures.mjs';
import {choirArtFixtures} from './choir-art-fixtures.mjs';
import {almsArtFixtures} from './alms-art-fixtures.mjs';
import {confessionArtFixtures} from './confession-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
const parts=await Promise.all([chapelArtFixtures(),pilgrimArtFixtures(),receiptArtFixtures(),almsArtFixtures(),choirArtFixtures(),confessionArtFixtures()]);
await runCharacterArtSmoke({fixtures:parts.flatMap(p=>p.fixtures),outcomes:parts.flatMap(p=>p.outcomes),group:'chapel',folder:'relocated'});
