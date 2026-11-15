import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {stigmataWiringArtFixtures} from './stigmata-wiring-art-fixtures.mjs';
await runCharacterArtSmoke({...await stigmataWiringArtFixtures(),group:'machine',folder:'machine'});
