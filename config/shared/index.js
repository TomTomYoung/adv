import {editors} from './catalog.js';
const list=document.getElementById('catalog'),count=document.getElementById('count'),search=document.getElementById('search');
function render(){list.replaceChildren();const query=search.value.trim().toLowerCase(),visible=editors.filter(e=>`${e.title} ${e.id} ${e.file} ${e.group}`.toLowerCase().includes(query));count.textContent=`${visible.length} / ${editors.length} 件`;
 for(const group of [...new Set(visible.map(e=>e.group))]){const section=document.createElement('section'),h=document.createElement('h2'),grid=document.createElement('div');h.textContent=group;grid.className='catalog-grid';section.append(h,grid);
  for(const e of visible.filter(e=>e.group===group)){const link=document.createElement('a'),title=document.createElement('span'),file=document.createElement('small');link.className='config-card';link.href=e.page;title.textContent=e.title;file.textContent=e.file;link.append(title,file);grid.append(link);}list.append(section);
 }
}
search.addEventListener('input',render);render();
