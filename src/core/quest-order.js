// Presentation order never changes quest IDs, event iteration or saved state.
export function questOrderErrors(data){
  const order=data.questOrder;
  if(order===undefined&&!data.game?.files?.databases?.questOrder)return [];
  if(!order||order.schemaVersion!==1||!Array.isArray(order.ids)||!order.ids.length)
    return ['questOrder: schemaVersion 1 と空でない ids 配列が必要です'];
  const errors=[],seen=new Set();
  for(const id of order.ids){
    if(typeof id!=='string'||!/^[a-z][a-z0-9_]*$/.test(id)||!Object.hasOwn(data.quests,id))errors.push(`questOrder: 未定義のクエストID ${String(id)}`);
    if(seen.has(id))errors.push(`questOrder: ID重複 ${id}`);
    seen.add(id);
  }
  for(const id of Object.keys(data.quests))if(!seen.has(id))errors.push(`questOrder: 表示順にないクエスト ${id}`);
  return errors;
}

export function orderedQuests(data){
  const errors=questOrderErrors(data);
  if(errors.length)throw Error(errors.join('\n'));
  // Historical fixtures predate the presentation registry.
  return data.questOrder?data.questOrder.ids.map(id=>data.quests[id]):Object.values(data.quests).sort((a,b)=>a.number-b.number||a.id.localeCompare(b.id));
}

export function questDisplayNumber(data,id){
  const index=orderedQuests(data).findIndex(q=>q.id===id);
  if(index<0)throw Error(`表示番号のないクエスト: ${id}`);
  return index+1;
}
