// Small, sharp geometric marks. All timing is visual; these never call the engine.
const piece=(shape,color,frames)=>({shape,color,frames});
export function strikePieces(pattern,color){
  if(pattern==='slash')return [
    piece('polygon(8% 84%,24% 48%,48% 24%,86% 8%,62% 26%,40% 49%,21% 78%)',color,[
      {offset:0,opacity:.35,transform:'translate(-12%,12%) scale(.8)'},
      {offset:.18,opacity:1,transform:'translate(0,0) scale(1)'},
      {offset:.5,opacity:.55,transform:'translate(9%,-9%) scale(1.05)'},
      {offset:1,opacity:0,transform:'translate(14%,-14%) scale(1.05)'}]),
    piece('polygon(14% 83%,75% 16%,87% 7%,78% 24%,23% 82%)','#fff9df',[
      {offset:0,opacity:1,transform:'translate(-4%,4%)'},
      {offset:.22,opacity:1,transform:'translate(4%,-4%)'},
      {offset:.55,opacity:0,transform:'translate(12%,-12%)'},
      {offset:1,opacity:0,transform:'translate(12%,-12%)'}])
  ];
  if(pattern==='pierce')return [
    piece('polygon(0% 48%,73% 43%,100% 50%,73% 57%,0% 52%)',color,[
      {offset:0,opacity:.85,transform:'translateX(-30%) scaleX(.7)'},
      {offset:.16,opacity:1,transform:'translateX(0) scaleX(1)'},
      {offset:.5,opacity:.6,transform:'translateX(24%) scaleX(.85)'},
      {offset:1,opacity:0,transform:'translateX(42%) scaleX(.2)'}]),
    piece('polygon(12% 49%,78% 47%,100% 50%,78% 53%,12% 51%)','#fff9df',[
      {offset:0,opacity:1,transform:'translateX(-15%)'},
      {offset:.2,opacity:1,transform:'translateX(15%)'},
      {offset:.6,opacity:0,transform:'translateX(40%)'},
      {offset:1,opacity:0,transform:'translateX(40%)'}])
  ];
  const parts=[piece('polygon(50% 20%,58% 41%,80% 50%,58% 59%,50% 80%,42% 59%,20% 50%,42% 41%)','#fff9df',[
    {offset:0,opacity:1,transform:'scale(.75)'},
    {offset:.15,opacity:1,transform:'scale(.75)'},
    {offset:.4,opacity:.65,transform:'scale(1.05)'},
    {offset:1,opacity:0,transform:'scale(1.2)'}])];
  for(let i=0;i<8;i++){
    const angle=i*45,turn=`rotate(${angle}deg)`;
    parts.push(piece('polygon(55% 48%,72% 46%,82% 50%,72% 54%,55% 52%)',color,[
      {offset:0,opacity:1,transform:`${turn} scale(.5)`},
      {offset:.15,opacity:1,transform:`${turn} scale(.5)`},
      {offset:.55,opacity:.8,transform:`${turn} scale(1.2)`},
      {offset:1,opacity:0,transform:`${turn} scale(1.6)`}]))
  }
  return parts;
}

export function strikeAngle(anchor,source){
  if(!source)return 0;
  const x=anchor.left+anchor.width/2-source.left-source.width/2;
  const y=anchor.top+anchor.height/2-source.top-source.height/2;
  return Math.atan2(y,x)*180/Math.PI;
}
