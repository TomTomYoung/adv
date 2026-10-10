// Classic script: install the import map before resolving any game modules.
// index.html gives this entry a fresh URL on every navigation.
(async()=>{
  const base=new URL('../',document.currentScript.src),fresh=(Date.now().toString(36)+Math.random().toString(36).slice(2));
  const fail=error=>{
    const root=document.querySelector('#app'),message=document.createElement('p'),retry=document.createElement('button');
    message.setAttribute('role','alert');message.textContent=`更新を読み込めませんでした。記録は変更していません。\n${error.message}`;
    retry.textContent='もう一度読み込む';retry.onclick=()=>{const url=new URL(location.href);url.searchParams.set('reload',(Date.now().toString(36)+Math.random().toString(36).slice(2)));location.replace(url);};
    root.replaceChildren(message,retry);
  };
  try{
    if(!HTMLScriptElement.supports?.('importmap'))throw Error('このブラウザはゲームの読み込み方式に対応していません。');
    const url=new URL('runtime.json',base);url.searchParams.set('check',fresh);
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw Error(`配信情報の取得に失敗しました (${response.status})`);
    const manifest=await response.json();
    if(manifest.schemaVersion!==1||!/^[a-f0-9]{64}$/.test(manifest.revision)||!manifest.files||Array.isArray(manifest.files))throw Error('配信情報が不正です。');
    const imports={},integrity={};
    // A partially deployed response can itself be cached despite failing SRI.
    // A per-start token lets a normal retry recover once publishing completes.
    const versioned=file=>{const url=new URL(file,base);url.searchParams.set('v',manifest.revision);url.searchParams.set('load',fresh);return url.href;};
    for(const [file,hash] of Object.entries(manifest.files)){
      if(!/^(?:src|data|assets)\/[a-zA-Z0-9_./-]+$/.test(file)&&file!=='index.html'||file.split('/').includes('..')||!/^sha256-[A-Za-z0-9+/]{43}=$/.test(hash))throw Error('配信ファイルの情報が不正です。');
      if(file.startsWith('src/')&&file.endsWith('.js')){
        imports[new URL(file,base).href]=versioned(file);integrity[versioned(file)]=hash;
      }
    }
    if(!manifest.files['src/main.js'])throw Error('起動ファイルがありません。');
    Object.freeze(manifest.files);Object.freeze(manifest);
    Object.defineProperty(globalThis,'advRuntime',{value:Object.freeze({base:base.href,fresh,manifest})});
    const map=document.createElement('script');map.type='importmap';map.textContent=JSON.stringify({imports,integrity});document.head.append(map);
    await Promise.all(['src/view/style.css','src/view/scene-style.css'].map(file=>new Promise((resolve,reject)=>{
      if(!manifest.files[file]){reject(Error('画面の配信情報がありません。'));return;}
      const link=document.createElement('link');link.rel='stylesheet';link.href=versioned(file);link.integrity=manifest.files[file];link.crossOrigin='anonymous';
      link.onload=resolve;link.onerror=()=>reject(Error('画面の更新がまだ揃っていません。'));document.head.append(link);
    })));
    await import(new URL('src/main.js',base).href);
  }catch(error){fail(error);}
})();
