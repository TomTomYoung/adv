const elevation=cell=>cell?.parameters?.bottomless?-Infinity:-(cell?.parameters?.floor_depth??0);
// Draw only the outside edge of a depression; equal-depth neighbours join.
export function reliefPreview(tile,cell,neighbours=[]){
 const p=cell.parameters??{};if(!(p.floor_depth>0||p.bottomless))return;
 tile.dataset.depression=p.bottomless?'bottomless':p.floor_depth<=.3?'shallow':'deep';
 const shadows=[],offsets=['0 4px','-4px 0','0 -4px','4px 0'];
 for(let i=0;i<4;i++)if(elevation(neighbours[i])>elevation(cell))shadows.push(`inset ${offsets[i]} 0 #18252b`);
 tile.style.boxShadow=shadows.join(',');
}
