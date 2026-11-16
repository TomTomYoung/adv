import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {centuryObserverArtFixtures} from './century-observer-art-fixtures.mjs';
await runCharacterArtSmoke({...await centuryObserverArtFixtures(),group:'observatory',folder:'relocated'});
