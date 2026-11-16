import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {calendarTransitionArtFixtures} from './calendar-transition-art-fixtures.mjs';
await runCharacterArtSmoke({...await calendarTransitionArtFixtures(),group:'observatory',folder:'relocated'});
