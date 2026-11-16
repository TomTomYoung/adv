import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {undergroundEclipseArtFixtures} from './underground-eclipse-art-fixtures.mjs';
await runCharacterArtSmoke({...await undergroundEclipseArtFixtures(),group:'observatory',folder:'relocated'});
