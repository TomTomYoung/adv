import {weepingPillarFixtures} from './q015-world-route-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...weepingPillarFixtures(),group:'weeping-pillar',folder:'generated'});
