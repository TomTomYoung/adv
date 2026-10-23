// Display categories are explicit: MP costs, elements and healing alone do not
// distinguish a spell from alchemy, breathing, songs or weapon techniques.
const magicSkills=new Set(['fire','heal','cleanse','ice','lightning','firestorm','ice_bind','rune_armor','thundercloud','flameblade','greater_heal','purify','holy_guard','holy_light','lamplight','roots','blood_light','homeward','repel_kuragari','valley_curse','waterway_spark','mine_salt_bolt']);
const magicAbilities=new Set(['kuragari_ward','kindle_calm','kindle_lure','read_path','field_prayer','water_breath','dry_clothes','exp_oil_spark']);
export const abilityCategory=(id,field=false)=>(field?magicAbilities:magicSkills).has(id)?'magic':'skills';
