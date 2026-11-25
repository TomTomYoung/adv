import {facilityQuest} from './facility-quest.mjs';

// The canal quarter is reached from the square above the waterway. Each room is a navigable facility.
export const quarter={id:'e2_canal_quarter',name:'地下水道沿いの運河通り',parent:'hikarigaeri_square',background:'location_square',links:[],description:'水路に沿って工房や食堂が並ぶ。広場の階段を下りると灯守の地下水道に入る。'};
export const canalQuest=(number,sites,people,author)=>facilityQuest(number,quarter.id,sites,people,author);
