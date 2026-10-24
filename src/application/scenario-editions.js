import {GameEngine} from '../core/engine.js';
import {resolveScenarioEdition,savedScenarioEdition} from '../core/scenario-editions.js';

export const SCENARIO_SAVE_KEY='scenario:saves';
const slots=new Set(['auto','slot1','slot2','slot3']);
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const emptyRegistry=()=>({schemaVersion:1,preference:'latest',active:null,editions:{}});
const storageMessage='保存できませんでした。現在の旅と既存の記録はそのままです。記録ファイルを書き出して保存してください。';

// A single localStorage write commits the active edition and all its save slots.
// The old unversioned keys are read-only fallbacks for e1, never migration targets.
export class ScenarioEditionSession{
  constructor({loadData,loadCatalog,catalog,storage,prefix='lantern-archive:v1:',createEngine=data=>new GameEngine(data),onBusy=()=>{}}){
    this.loadData=loadData;this.loadCatalog=loadCatalog;this.catalog=catalog;this.storage=storage;this.prefix=prefix;this.createEngine=createEngine;this.onBusy=onBusy;
    this.registry=emptyRegistry();this.registryRaw=null;this.cache=new Map();this.busy=false;this.storageReadable=true;this.recoveryError=null;
  }
  get activeEdition(){return this.data?.scenarioEdition??null;}
  get preference(){return this.registry.preference;}
  get requiresRecovery(){return Boolean(this.recoveryError);}
  label(edition=this.activeEdition){return this.catalog?.editions[edition]?.label??edition;}
  selectedEdition(preference=this.preference){return resolveScenarioEdition(this.catalog,preference);}
  readStorage(key){return this.storage.getItem(this.prefix+key);}
  readRegistry(){
    const raw=this.readStorage(SCENARIO_SAVE_KEY);this.registryRaw=raw;
    if(raw===null)return null;
    let value;try{value=JSON.parse(raw);}catch{throw Error('版別の記録一覧が壊れています。保存内容は変更していません。');}
    if(!record(value)||value.schemaVersion!==1||!record(value.editions)||!['latest','e1','e2'].includes(value.preference)||!['e1','e2'].includes(value.active))throw Error('版別の記録一覧が不正です。保存内容は変更していません。');
    for(const [edition,saves] of Object.entries(value.editions)){
      resolveScenarioEdition(this.catalog,edition);
      if(!record(saves)||Object.entries(saves).some(([slot,text])=>!slots.has(slot)||typeof text!=='string'))throw Error('版別の保存枠が不正です。保存内容は変更していません。');
    }
    resolveScenarioEdition(this.catalog,value.active);resolveScenarioEdition(this.catalog,value.preference);
    return value;
  }
  readSave(edition,slot='auto'){
    if(!slots.has(slot))throw Error('保存枠が不正です。');
    if(Object.hasOwn(this.registry.editions[edition]??{},slot))return this.registry.editions[edition][slot];
    // Accept individually namespaced records too, while keeping their raw bytes.
    const versioned=this.readStorage(`scenario:${edition}:${slot}`);
    if(versioned!==null)return versioned;
    return edition==='e1'?this.readStorage(slot):null;
  }
  readSlot(number){return this.readSave(this.activeEdition,this.slotName(number));}
  exportSave(){
    if(!this.requiresRecovery)return this.engine.save();
    const raw=this.readSave(this.activeEdition);
    if(raw===null)throw Error('保護中の自動記録を読み取れませんでした。仮の新規状態は書き出していません。');
    return raw;
  }
  slotName(number){if(![1,2,3].includes(number))throw Error('保存枠が不正です。');return `slot${number}`;}
  async editionData(edition){
    edition=resolveScenarioEdition(this.catalog,edition);
    if(!this.cache.has(edition))this.cache.set(edition,Promise.resolve().then(()=>this.loadData(edition)).then(data=>{
      if(data.scenarioEdition!==edition)throw Error('読み込んだシナリオ版が一致しません。');
      return data;
    }));
    const pending=this.cache.get(edition);
    try{return await pending;}catch(error){if(this.cache.get(edition)===pending)this.cache.delete(edition);throw error;}
  }
  async candidate(edition,text=null){
    if(text!==null&&savedScenarioEdition(text)!==edition)throw Error('保存枠と記録のシナリオ版が一致しません。');
    const data=await this.editionData(edition),engine=this.createEngine(data);
    if(text!==null)engine.load(text);
    return {data,engine};
  }
  async locked(action){
    if(this.busy)throw Error('シナリオ版を読み込み中です。完了するまでお待ちください。');
    this.busy=true;this.onBusy(true);
    try{return await action();}finally{this.busy=false;this.onBusy(false);}
  }
  put(registry,edition,slot,text){registry.editions[edition]??={};registry.editions[edition][slot]=text;}
  currentDraft(){
    const draft=structuredClone(this.registry);
    if(this.engine&&!this.requiresRecovery)this.put(draft,this.activeEdition,'auto',this.engine.save());
    return draft;
  }
  commit(registry){
    if(!this.storageReadable)throw Error(storageMessage);
    let current;try{current=this.readStorage(SCENARIO_SAVE_KEY);}catch{throw Error(storageMessage);}
    if(current!==this.registryRaw)throw Error('別の画面で記録が更新されました。現在の旅を書き出し、再読み込みしてから再開してください。');
    const text=JSON.stringify(registry);
    try{this.storage.setItem(this.prefix+SCENARIO_SAVE_KEY,text);}catch{throw Error(storageMessage);}
    this.registry=registry;this.registryRaw=text;
  }
  adopt(candidate){this.data=candidate.data;this.engine=candidate.engine;this.recoveryError=null;}
  async start(preference='latest'){
    return this.locked(async()=>{
      this.catalog??=await this.loadCatalog();
      // An unavailable storage API still permits play and file exports, but no
      // operation may overwrite an unread registry when access later changes.
      let registry;
      try{this.readStorage(SCENARIO_SAVE_KEY);}catch{this.storageReadable=false;}
      if(this.storageReadable)registry=this.readRegistry();
      this.registry=registry??{...emptyRegistry(),preference};
      resolveScenarioEdition(this.catalog,this.preference);
      let edition=this.registry.active,raw=null;
      if(!edition&&this.storageReadable){
        const old=this.readSave('e1');
        if(old!==null){edition='e1';raw=old;}
      }
      edition??=this.selectedEdition();
      if(raw===null&&this.storageReadable)raw=this.readSave(edition);
      // A distribution/network failure is not a broken save. Let startup fail
      // safely rather than offering to replace a record we have not validated.
      await this.editionData(edition);
      let candidate;
      try{candidate=await this.candidate(edition,raw);}
      catch(error){
        if(raw===null)throw error;
        // Keep an unreadable auto save intact. Gameplay is blocked until the
        // player explicitly loads, switches editions, or starts a new journey.
        candidate=await this.candidate(edition);this.recoveryError=error;
        this.data=candidate.data;this.engine=candidate.engine;
        return {resumed:false,recovery:true,message:`自動記録を読み込めませんでした。記録は保護されています。「記録」から別の記録を読み込むか、版を切り替えるか、新しい旅を始めてください。 ${error.message}`};
      }
      this.adopt(candidate);
      const draft=structuredClone(this.registry);draft.active=edition;
      if(raw!==null)this.put(draft,edition,'auto',raw);else this.put(draft,edition,'auto',this.engine.save());
      try{this.commit(draft);}
      catch(error){return {resumed:raw!==null,message:error.message};}
      return {resumed:raw!==null,message:''};
    });
  }
  autosave(){
    if(this.busy)throw Error('シナリオ版を読み込み中です。');
    if(this.requiresRecovery)throw Error('読めなかった自動記録を保護しています。「記録」から再開方法を選んでください。');
    const draft=this.currentDraft();draft.active=this.activeEdition;this.commit(draft);
  }
  saveSlot(number){
    if(this.busy)throw Error('シナリオ版を読み込み中です。');
    if(this.requiresRecovery)throw Error('読めなかった自動記録を保護しています。先に再開方法を選んでください。');
    const draft=this.currentDraft();this.put(draft,this.activeEdition,this.slotName(number),this.engine.save());draft.active=this.activeEdition;this.commit(draft);
  }
  async switchEdition(preference){
    return this.locked(async()=>{
      const edition=this.selectedEdition(preference);
      if(edition===this.activeEdition){
        if(this.requiresRecovery)throw Error('この版の自動記録は読み込めません。記録ファイル・保存枠を読み込むか、新しい旅を始めてください。');
        const draft=this.currentDraft();draft.preference=preference;draft.active=edition;this.commit(draft);return {changed:false};
      }
      const candidate=await this.candidate(edition,this.readSave(edition));
      const draft=this.currentDraft();draft.preference=preference;draft.active=edition;this.put(draft,edition,'auto',candidate.engine.save());
      this.commit(draft);this.adopt(candidate);return {changed:true};
    });
  }
  async newGame(){
    return this.locked(async()=>{
      const edition=this.selectedEdition(),candidate=await this.candidate(edition),draft=this.currentDraft();
      draft.active=edition;this.put(draft,edition,'auto',candidate.engine.save());this.commit(draft);this.adopt(candidate);return {changed:true};
    });
  }
  async importSave(text){
    return this.locked(async()=>{
      const edition=resolveScenarioEdition(this.catalog,savedScenarioEdition(text)),candidate=await this.candidate(edition,text),draft=this.currentDraft();
      draft.active=edition;this.put(draft,edition,'auto',candidate.engine.save());this.commit(draft);this.adopt(candidate);return {changed:true};
    });
  }
  async loadSlot(number){
    return this.locked(async()=>{
      const edition=this.activeEdition,text=this.readSlot(number);if(text===null)throw Error('この保存枠は空です。');
      const candidate=await this.candidate(edition,text),draft=this.currentDraft();draft.active=edition;this.put(draft,edition,'auto',candidate.engine.save());
      this.commit(draft);this.adopt(candidate);return {changed:true};
    });
  }
}
