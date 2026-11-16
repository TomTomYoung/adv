import {runCharacterArtSmoke} from './character-art-browser.mjs';
import {wishTicketArtFixtures} from './wish-ticket-art-fixtures.mjs';
await runCharacterArtSmoke({...await wishTicketArtFixtures(),group:'observatory',folder:'relocated'});
