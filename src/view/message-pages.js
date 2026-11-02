// Pagination is view state only. A fits callback measures actual rendered text.
const graphemes=text=>globalThis.Intl?.Segmenter?[...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(text)].map(s=>s.segment):Array.from(text);
const closingPunctuation=/^[。、！？）」』】〉》〕］｝]/u;
export function messagePages(text,limit=150){
  const parts=graphemes(String(text??'')),pages=[];
  const fits=typeof limit==='function'?limit:value=>graphemes(value).length<=limit;
  for(let start=0;start<parts.length;){
    let lo=1,hi=parts.length-start,best=0;
    while(lo<=hi){const mid=(lo+hi)>>1;if(fits(parts.slice(start,start+mid).join(''))){best=mid;lo=mid+1;}else hi=mid-1;}
    // Even a tiny viewport must make progress without splitting a grapheme.
    best=Math.max(1,best);
    if(start+best<parts.length){
      const shortTail=parts.length-start-best<=Math.max(3,Math.floor(best/4));
      const normalMinimum=Math.ceil(best*.75);
      const leadingMark=closingPunctuation.test(parts[start+best]);
      const minimum=leadingMark||shortTail ? 1 : normalMinimum;
      // Prefer a whole sentence. A comma can also carry a short ending with its clause.
      let clauseBreak=0;
      for(let count=best;count>=minimum;count--){
        if(closingPunctuation.test(parts[start+count]))continue;
        const previous=parts[start+count-1];
        if(/[。！？\n]$/u.test(previous)){
          if(leadingMark || count>=normalMinimum || fits(parts.slice(start+count).join(''))){
            best=count;
            clauseBreak=0;
          }
          break;
        }
        if(shortTail && !clauseBreak && previous==='、' && fits(parts.slice(start+count).join('')))clauseBreak=count;
      }
      if(clauseBreak)best=clauseBreak;
    }
    // Keep closing marks with the preceding grapheme when they cross a page boundary.
    if(start+best<parts.length && closingPunctuation.test(parts[start+best])){
      let boundary=best;
      while(boundary>0 && closingPunctuation.test(parts[start+boundary]))boundary--;
      if(boundary>0)best=boundary;
    }
    pages.push(parts.slice(start,start+best).join(''));start+=best;
  }
  return pages.length?pages:[''];
}
export function pageAtOffset(pages,offset){
  let end=0;for(let i=0;i<pages.length;i++){end+=pages[i].length;if(offset<end)return i;}return pages.length-1;
}
