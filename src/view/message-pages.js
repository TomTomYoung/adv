// Splits display text only. Never changes the scenario or dispatches an intent.
export function messagePages(text,limit=150){
  const pages=[];let page='';
  for(const part of String(text??'').match(/[^。！？\n]*[。！？\n]+|[^。！？\n]+$/gu)??[]){
    for(const char of part){
      if(Array.from(page).length>=limit){pages.push(page);page='';}
      page+=char;
    }
    if(Array.from(page).length>=limit*.75){pages.push(page);page='';}
  }
  if(page||!pages.length)pages.push(page);
  return pages;
}
