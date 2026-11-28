export const TRAP_KINDS = ['barb','net','siphon','soot','snare','bell','ceiling','fireline','vise','coffin','treadle'];

export function trapSkillChoices(data,level) {
  return Object.entries(data.jobProfile.personalSkills.nio).filter(([id,lv])=>
    lv<=level && data.skills[id]?.effects[0]?.type==='set_trap').map(([id])=>id);
}
