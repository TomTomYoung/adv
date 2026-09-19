// Small DOM adapter for Node integration tests; no CSS/layout/paint emulation.
const dataName=name=>name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
function matches(e,selector){
  let s=selector.trim();
  if(s.includes(':not(:disabled)')){if(e.disabled)return false;s=s.replace(':not(:disabled)','');}
  if(s.includes(':disabled')){if(!e.disabled)return false;s=s.replace(':disabled','');}
  for(const [,name,,value] of s.matchAll(/\[([^=\]]+)(=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]/g)){
    if(e.getAttribute(name)===null)return false;
    if(value!==undefined&&e.getAttribute(name)!==value)return false;
  }
  s=s.replace(/\[[^\]]+\]/g,'');
  for(const [,name] of s.matchAll(/\.([\w-]+)/g))if(!e.classList.contains(name))return false;
  const id=s.match(/#([\w-]+)/);if(id&&e.id!==id[1])return false;
  const tag=s.match(/^[\w-]+/);return !tag||e.tagName===tag[0].toUpperCase();
}
export function installDOM(){
  const keys=['document','Option','Image','requestAnimationFrame','matchMedia'];
  const original=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));
  let doc;
  class Element{
    constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};this.listeners={};this.scrollTop=0;this.style={setProperty(k,v){this[k]=v;},removeProperty(k){delete this[k];}};this.className='';this.value='';
      this.classList={contains:name=>this.className.split(' ').includes(name),add:(...names)=>{this.className=[...new Set([...this.className.split(' '),...names])].join(' ').trim();},toggle:(name,on)=>{const active=on??!this.classList.contains(name);this.className=this.className.split(' ').filter(c=>c!==name).join(' ');if(active)this.classList.add(name);return active;}};
    }
    get parentElement(){return this.parentNode??null;}get firstElementChild(){return this.children[0]??null;}get lastElementChild(){return this.children.at(-1)??null;}
    get lastChild(){return this.lastElementChild;}get firstChild(){return this.firstElementChild;}
    get isConnected(){return this===doc.body||Boolean(this.parentElement?.isConnected);}
    append(...nodes){for(const node of nodes){node.remove();node.parentNode=this;this.children.push(node);}}
    replaceChildren(...nodes){for(const c of [...this.children])c.remove();this.ownText='';this.append(...nodes);}
    remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(c=>c!==this);this.parentNode=null;}
    set textContent(v){this.replaceChildren();this.ownText=String(v);}get textContent(){return (this.ownText??'')+this.children.map(c=>c.textContent).join('');}
    setAttribute(k,v){this.attrs[k]=String(v);if(k==='id')this.id=String(v);if(k==='class')this.className=String(v);if(k.startsWith('data-'))this.dataset[dataName(k)]=String(v);}
    getAttribute(k){if(k.startsWith('data-'))return this.dataset[dataName(k)]??null;if(k==='id')return this.id??null;if(k==='class')return this.className;if(k==='hidden')return this.hidden?'':null;if(k==='href')return this.href??null;return this.attrs[k]??null;}
    addEventListener(type,listener){(this.listeners[type]??=[]).push(listener);}
    dispatchEvent(event){event.target=this;for(const fn of this.listeners[event.type]??[])fn(event);}
    click(){if(!this.disabled&&!this.closest('[inert]'))this.dispatchEvent({type:'click'});}
    set inert(v){this.attrs.inert=v?'':undefined;if(!v)delete this.attrs.inert;}get inert(){return this.attrs.inert!==undefined;}
    querySelectorAll(selector){const results=[];const selectors=selector.split(',');const walk=e=>{for(const c of e.children){if(selectors.some(s=>matches(c,s)))results.push(c);walk(c);}};walk(this);return results;}
    querySelector(s){return this.querySelectorAll(s)[0]??null;}
    closest(s){let e=this;while(e){if(matches(e,s))return e;e=e.parentElement;}return null;}
    contains(e){return e===this||this.children.some(c=>c.contains(e));}
    focus(){doc.activeElement=this;}setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}
    getClientRects(){return this.closest('[hidden]')?[]:[this.getBoundingClientRect()];}
    getBoundingClientRect(){return {left:12,top:12,width:1000,height:700,right:1012,bottom:712};}
  }
  doc={createElement:tag=>new Element(tag),activeElement:null};doc.body=new Element('body');doc.activeElement=doc.body;
  globalThis.document=doc;globalThis.Option=class extends Element{constructor(text,value){super('option');this.textContent=text;this.value=value;}};
  globalThis.Image=class extends Element{constructor(){super('img');}};
  globalThis.requestAnimationFrame=()=>0; // Canvas rendering belongs to real-browser checks.
  globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  const root=doc.createElement('div');root.id='app';doc.body.append(root);
  return {root,document:doc,restore(){for(const k of keys){if(original[k]===undefined)delete globalThis[k];else globalThis[k]=original[k];}}};
}
