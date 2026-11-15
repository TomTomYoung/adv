import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {partsMemoryArtFixtures} from './parts-memory-art-fixtures.mjs';
await runCharacterArtSmoke({...await partsMemoryArtFixtures(),group:'machine',folder:'machine'});
