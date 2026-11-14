import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {scaleComparisonArtFixtures} from './scale-comparison-art-fixtures.mjs';
await runCharacterArtSmoke({...await scaleComparisonArtFixtures(),group:'library',folder:'relocated'});
