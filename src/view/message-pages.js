// Pagination is view state only. A fits callback measures actual rendered text.
const graphemes=text=>globalThis.Intl?.Segmenter?[...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(text)].map(s=>s.segment):Array.from(text);
export function messagePages(text,limit=150){
  const parts=graphemes(String(text??'')),pages=[];
  const fits=typeof limit==='function'?limit:value=>graphemes(value).length<=limit;
  for(let start=0;start<parts.length;){
    let lo=1,hi=parts.length-start,best=0;
    while(lo<=hi){const mid=(lo+hi)>>1;if(fits(parts.slice(start,start+mid).join(''))){best=mid;lo=mid+1;}else hi=mid-1;}
    // Even a tiny viewport must make progress without splitting a grapheme.
    best=Math.max(1,best);
    if(start+best<parts.length){for(let n=best;n>=Math.ceil(best*.75);n--)if(/[。！？\n]$/u.test(parts[start+n-1])){best=n;break;}}
    pages.push(parts.slice(start,start+best).join(''));start+=best;
  }
  return pages.length?pages:[''];
}
export function pageAtOffset(pages,offset){
  let end=0;for(let i=0;i<pages.length;i++){end+=pages[i].length;if(offset<end)return i;}return pages.length-1;
}
