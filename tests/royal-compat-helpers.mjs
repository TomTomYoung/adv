import {loadContent} from '../src/core/loader.js';
import {read} from '../tools/audit-regional-relocation.mjs';
export const previous=await loadContent(async file=>{
 if(file==='data/scenario-editions/e2/geography.json')return read('tests/fixtures/e2-geography-before-royal-ruins.json');
 const value=await read(file);if(file==='data/scenario-editions.json')for(const n of [...Array.from({length:10},(_,i)=>81+i),...Array.from({length:10},(_,i)=>181+i)])delete value.editions.e2.questOverrides['q'+String(n).padStart(3,'0')];if(file==='data/scenario-editions.json'){for(let n=61;n<=70;n++)delete value.editions.e2.questOverrides['q0'+n];for(let n=161;n<=170;n++)delete value.editions.e2.questOverrides['q'+n];}return value;
},{edition:'e2'});
