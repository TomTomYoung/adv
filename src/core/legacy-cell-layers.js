// Only pre-layer archived content uses this adapter. Current maps must author
// every visual/environment layer explicitly; '#' there means impassable only.
export const legacyCellLayers=passage=>({passage,visual:{wall:passage==='#',floor:passage==='.',opaque:passage==='#',material:passage==='#'?'wall':'floor'},parameters:{illumination:0,water_passable:passage==='.'},events:[]});
