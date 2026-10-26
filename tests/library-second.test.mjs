import test from 'node:test';
import assert from 'node:assert/strict';
import {data,ready,start,choose,audit,checkpoint,go,drain} from './library-helpers.mjs';
const reports={};
for(let n=141;n<=150;n++){const id='q'+n;test(`${id}: every physical choice and ending, saves, holders, one reward and a free continuation`,()=>{reports[id]=audit(id);});}
test('ten second-half requests complete consecutively from one save',()=>{const g=ready();for(let n=141;n<=150;n++){const id='q'+n,r=reports[id]??audit(id);start(g,id);for(const c of Object.values(r.ends)[0])choose(g,id,c);assert.equal(g.state.quests[id].stage,'completed');}assert.equal(g.state.vars.region_5,10);checkpoint(g);});
const values=(g,id)=>g.state.stories[id].values;
const depart=(g,id,c)=>{assert.ok(g.dispatch({type:'choose',id:c}),g.state.notice);drain(g);assert.ok(g.state.journey);checkpoint(g);assert.equal(g.dispatch({type:'story.resume',quest:id}),false);};
const arrive=(g,id,p)=>{go(g,data.quests[id].story.worldPlaces[p]);drain(g);checkpoint(g);};
test('q141 music and name permission do not make the nonperforming composer travel to the stage',()=>{
 const id='q141',g=ready();start(g,id);choose(g,id,'ask');depart(g,id,'use');assert.equal(values(g,id).musicAllowed,true);assert.equal(values(g,id).performerAgreed,false);assert.equal(values(g,id).sanaAt,'laundry');arrive(g,id,'score');depart(g,id,'carry');assert.equal(values(g,id).scoreSheetAt,'party');assert.equal(values(g,id).performed,false);arrive(g,id,'stage');choose(g,id,'finish');assert.equal(values(g,id).sanaAt,'laundry');assert.equal(values(g,id).scoreSheetAt,'stage');assert.equal(values(g,id).bannerAt,'stage');
});
for(const timing of ['tell','later'])test(`q142 ${timing}: explanation timing survives while the buyer always keeps the ring`,()=>{
 const id='q142',g=ready();start(g,id);choose(g,id,timing);assert.equal(values(g,id).before,timing==='tell');assert.equal(values(g,id).ringAt,'buyerPerson');assert.equal(values(g,id).kioAt,'buyer');choose(g,id,'repair');assert.equal(values(g,id).buyerPersonAt,'repair');choose(g,id,'finish');assert.equal(values(g,id).ringAt,'buyerPerson');assert.equal(values(g,id).repairSigned,true);checkpoint(g);
});
test('q143 the substitute is paid once, fetched and escorted; the original spirit gets a rest',()=>{
 const id='q143',g=ready();start(g,id);const gold=g.state.gold;choose(g,id,'hire');assert.equal(g.state.gold,gold-40);assert.equal(values(g,id).hirePaid,true);assert.equal(values(g,id).replacementAt,'hire');assert.equal(values(g,id).served,false);choose(g,id,'continue');depart(g,id,'escort');assert.equal(values(g,id).replacementAt,'transit');assert.equal(g.state.gold,gold-40);arrive(g,id,'stage');choose(g,id,'finish');assert.equal(values(g,id).resting,true);assert.equal(values(g,id).replacementAt,'stage');assert.equal(g.state.gold,gold-40+105);
});
test('q144 costume compensation, lightening and retirement consent remain distinct',()=>{
 const id='q144',g=ready();start(g,id);for(const c of ['trial','try','retire'])choose(g,id,c);assert.equal(values(g,id).compensationRecorded,true);assert.equal(values(g,id).lightened,true);assert.equal(values(g,id).retireAgreed,false);depart(g,id,'stage');assert.equal(values(g,id).retireAgreed,true);arrive(g,id,'stage');choose(g,id,'finish');assert.equal(values(g,id).costumeAt,'jill');assert.equal(values(g,id).jillAt,'stage');
});
test('q145 the next letter must physically reach the mother before she changes the garden decision',()=>{
 const id='q145',g=ready();start(g,id);for(const c of ['visit','wait'])choose(g,id,c);assert.equal(values(g,id).opened,false);assert.equal(values(g,id).letterReceived,false);assert.equal(g.dispatch({type:'choose',id:'open'}),false);depart(g,id,'deliver');assert.equal(values(g,id).letterSheetAt,'party');assert.equal(values(g,id).letterReceived,false);arrive(g,id,'mother');assert.equal(values(g,id).letterSheetAt,'motherPerson');assert.equal(values(g,id).letterReceived,true);depart(g,id,'open');assert.equal(values(g,id).opened,false);arrive(g,id,'garden');choose(g,id,'finish');assert.equal(values(g,id).opened,true);assert.equal(values(g,id).motherPersonAt,'garden');
});
test('q146 dye release needs both parties and a real reunion; cutting does not release the oath',()=>{
 const id='q146',g=ready();start(g,id);choose(g,id,'friends');depart(g,id,'release');assert.equal(values(g,id).bothAgreed,true);assert.equal(values(g,id).released,false);arrive(g,id,'dyer');choose(g,id,'meet');choose(g,id,'finish');assert.equal(values(g,id).reunited,true);assert.equal(values(g,id).uniformAt,'veteran');assert.equal(values(g,id).cut,false);
 const other=ready();start(other,id);choose(other,id,'coat');choose(other,id,'finish');assert.equal(values(other,id).cut,true);assert.equal(values(other,id).released,false);
});
for(const mode of ['run','water','car'])test(`q147 ${mode}: selected route, fee and flower state persist until actual receipt`,()=>{
 const id='q147',g=ready();start(g,id);const gold=g.state.gold;choose(g,id,mode);if(mode==='car'){assert.equal(g.state.gold,gold-30);choose(g,id,'continue');}assert.equal(g.state.location.map,mode==='water'?'e2_salome_canal':'e2_highland_lower');assert.equal(values(g,id).deliveryMode,mode==='run'?'mountain':mode);assert.equal(values(g,id).flowerClosed,mode==='run');assert.equal(values(g,id).delivered,false);depart(g,id,'deliver');assert.equal(values(g,id).flowerAt,'party');arrive(g,id,'receiver');
 if(mode==='run'){choose(g,id,'tomorrow');assert.equal(values(g,id).flowerAt,'rest');assert.equal(values(g,id).overnight,false);depart(g,id,'next');assert.equal(values(g,id).overnight,true);assert.equal(values(g,id).flowerAt,'party');assert.equal(values(g,id).flowerClosed,false);arrive(g,id,'receiver');}
 choose(g,id,'finish');assert.equal(values(g,id).flowerAt,'receiver');assert.equal(values(g,id).delivered,true);assert.equal(g.state.gold,gold-(mode==='car'?30:0)+105);
});
test('q147 reporting only a speed record never credits a successful flower delivery',()=>{
 const id='q147',g=ready();start(g,id);for(const c of ['run','deliver','record','finish'])choose(g,id,c);assert.equal(values(g,id).deliveryFailed,true);assert.equal(values(g,id).delivered,false);assert.equal(values(g,id).flowerClosed,true);assert.equal(values(g,id).flowerAt,'record');
});
test('q148 an unsupported accusation cannot publish a comparison and retrieval must visit the market',()=>{
 const id='q148',g=ready();start(g,id);for(const c of ['visit','accuse'])choose(g,id,c);assert.equal(values(g,id).proof,false);assert.equal(g.dispatch({type:'choose',id:'public'}),false);choose(g,id,'remove');assert.equal(values(g,id).scaleAt,'market');depart(g,id,'carry');assert.equal(values(g,id).scaleAt,'party');arrive(g,id,'storage');choose(g,id,'finish');assert.equal(values(g,id).scaleAt,'storage');assert.equal(values(g,id).refundProcedureStarted,false);
 const other=ready();start(other,id);for(const c of ['visit','test','public','finish'])choose(other,id,c);assert.equal(values(other,id).demonstrated,true);assert.equal(values(other,id).oneRefunded,false);assert.equal(values(other,id).coinAt,'customer');
});
test('q149 the subsidy is paid once at the smith; the tool is given only at the farmer destination',()=>{
 const id='q149',g=ready();start(g,id);for(const c of ['carry','user'])choose(g,id,c);const gold=g.state.gold;choose(g,id,'pay');assert.equal(g.state.gold,gold-40);assert.equal(values(g,id).swordAt,'party');assert.equal(values(g,id).delivered,false);depart(g,id,'continue');assert.equal(values(g,id).farmerAt,'transit');arrive(g,id,'farm');choose(g,id,'finish');assert.equal(values(g,id).swordAt,'farmer');assert.equal(g.state.gold,gold-40+105);
});
test('q148 the accused and customer walk to the hearing and back before the same-coin retest',()=>{
 const id='q148',g=ready();start(g,id);choose(g,id,'visit');depart(g,id,'accuse');assert.equal(values(g,id).egiAt,'transit');assert.equal(values(g,id).customerAt,'transit');assert.equal(values(g,id).coinAt,'market');arrive(g,id,'office');depart(g,id,'test');arrive(g,id,'market');choose(g,id,'test');depart(g,id,'public');assert.equal(values(g,id).coinAt,'party');arrive(g,id,'office');choose(g,id,'finish');assert.equal(values(g,id).egiAt,'office');assert.equal(values(g,id).customerAt,'office');
});
test('q150 the returned wallet stays with its owner and is distinct from repairing a clasp',()=>{
 const id='q150',g=ready();start(g,id);for(const c of ['stage','singer','thief'])choose(g,id,c);assert.equal(values(g,id).thief,true);assert.equal(values(g,id).walletReturned,false);assert.equal(values(g,id).walletAt,'stage');choose(g,id,'thief');assert.equal(values(g,id).walletReturned,true);assert.equal(values(g,id).walletAt,'walletOwner');assert.equal(values(g,id).walletOwnerAt,'stage');assert.equal(values(g,id).thiefPersonAt,'contracts');choose(g,id,'thief');checkpoint(g);
});
test('q150 observed work gates recruitment; troupe tools require payment, collection and return',()=>{
 const id='q150',g=ready();start(g,id);for(const c of ['stage','porter','finish'])choose(g,id,c);assert.equal(values(g,id).porter,true);assert.equal(values(g,id).thief,false);assert.equal(g.dispatch({type:'choose',id:'thief'}),false);assert.equal(g.dispatch({type:'choose',id:'singer'}),false);choose(g,id,'company');const gold=g.state.gold;choose(g,id,'agree');assert.equal(g.state.gold,gold-40);assert.equal(values(g,id).sharedToolsAt,'tools');choose(g,id,'continue');depart(g,id,'carry');assert.equal(values(g,id).sharedToolsAt,'party');arrive(g,id,'stage');choose(g,id,'finish');assert.equal(values(g,id).sharedToolsAt,'stage');assert.equal(values(g,id).companyAgreed,true);assert.equal(values(g,id).feesSettled,true);
});
