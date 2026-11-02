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
      // A slightly shorter page is preferable when it leaves a whole sentence to read.
      const shortTail=parts.length-start-best<=3;
      const normalMinimum=Math.ceil(best*.75);
      const leadingMark=closingPunctuation.test(parts[start+best]);
      const minimum=leadingMark||shortTail ? 1 : normalMinimum;
      for(let count=best;count>=minimum;count--){
        if(/[。！？\n]$/u.test(parts[start+count-1]) && !closingPunctuation.test(parts[start+count])){
          // Only use an earlier sentence break for a short tail if the remainder fits.
          if(shortTail && !leadingMark && count<normalMinimum && !fits(parts.slice(start+count).join('')))break;
          best=count;
          break;
        }
      }
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
