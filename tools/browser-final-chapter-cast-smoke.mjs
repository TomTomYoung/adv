import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {finalChapterArtFixtures} from './final-chapter-art-fixtures.mjs';
await runCharacterArtSmoke({...await finalChapterArtFixtures(),group:'library',folder:'relocated'});
