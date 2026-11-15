import {unpaidSaintArtFixtures} from './unpaid-saint-art-fixtures.mjs';
import {runCharacterArtSmoke} from './character-art-browser.mjs';
await runCharacterArtSmoke({...await unpaidSaintArtFixtures(),group:'machine',folder:'relocated'});
