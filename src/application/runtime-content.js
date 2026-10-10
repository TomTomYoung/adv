// Distribution revision is independent of the game's save compatibility version.
export function runtimeReader(runtime=globalThis.advRuntime){
  if(!runtime)return undefined;
  return async file=>{
    const integrity=runtime.manifest.files[file];
    if(!integrity)throw Error(`配信情報にないデータです: ${file}`);
    const url=new URL(file,runtime.base);url.searchParams.set('v',runtime.manifest.revision);
    if(runtime.fresh)url.searchParams.set('load',runtime.fresh);
    let response;
    try{response=await fetch(url,{cache:'no-store',integrity});}
    catch{throw Error(`更新データが揃っていません。記録を保ったまま再読み込みしてください: ${file}`);}
    if(!response.ok)throw Error(`読込失敗: ${file} (${response.status})`);
    return response.json();
  };
}
export function versionRuntimeAssets(data,runtime=globalThis.advRuntime){
  if(!runtime)return;
  for(const group of Object.values(data.assets))for(const [id,file] of Object.entries(group)){
    if(!runtime.manifest.files[file])throw Error(`配信情報にない素材です: ${file}`);
    const url=new URL(file,runtime.base);url.searchParams.set('v',runtime.manifest.revision);group[id]=url.href;
  }
}
