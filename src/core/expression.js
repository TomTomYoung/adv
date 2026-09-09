export const clone = value => structuredClone(value);
export const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const blocked = new Set(['__proto__', 'prototype', 'constructor']);
export function pathParts(path) {
  if (typeof path !== 'string' || !/^[a-zA-Z_][\w]*(\.[a-zA-Z_][\w]*|\.\d+)*$/.test(path)) throw new Error(`不正な状態パス: ${path}`);
  const parts = path.split('.');
  if (parts.some(p => blocked.has(p))) throw new Error('予約済みの状態パスです');
  return parts;
}
export function getPath(object, path) {
  return pathParts(path).reduce((o, k) => o != null && Object.hasOwn(o, k) ? o[k] : undefined, object);
}
export function setPath(object, path, value) {
  const parts = pathParts(path), last = parts.pop();
  let target = object;
  for (const part of parts) {
    if (!Object.hasOwn(target, part)) target[part] = {};
    if (!isRecord(target[part]) && !Array.isArray(target[part])) throw new Error(`書き込めない状態パス: ${path}`);
    target = target[part];
  }
  target[last] = clone(value);
}
export const EXPRESSION_OPS = new Set(['eq','ne','gt','gte','lt','lte','and','or','not','exists','in','contains','add','sub','mul','div','mod','min','max','floor','ceil','round','abs','clamp','has_item','has_member','has_status','event_done','map_discovered']);
export function evaluate(value, context, depth = 0) {
  if (depth > 32) throw new Error('式の入れ子が深すぎます');
  if (!isRecord(value)) return value;
  if (Object.hasOwn(value, 'ref')) return getPath(context, value.ref);
  const e = x => evaluate(x, context, depth + 1);
  if (value.format !== undefined) return value.format.replace(/\{([\w]+)\}/g, (_, key) => String(e(value.values?.[key]) ?? ''));
  const args = () => (value.args ?? []).map(e);
  const binary = fn => fn(e(value.left), e(value.right));
  switch (value.op) {
    case 'eq': return binary((a,b) => a === b);
    case 'ne': return binary((a,b) => a !== b);
    case 'gt': return binary((a,b) => a > b);
    case 'gte': return binary((a,b) => a >= b);
    case 'lt': return binary((a,b) => a < b);
    case 'lte': return binary((a,b) => a <= b);
    case 'and': return value.args.every(x => Boolean(e(x)));
    case 'or': return value.args.some(x => Boolean(e(x)));
    case 'not': return !e(value.arg);
    case 'exists': return e(value.value) !== undefined;
    case 'in': return binary((a,b) => Array.isArray(b) && b.includes(a));
    case 'contains': return binary((a,b) => (Array.isArray(a) || typeof a === 'string') && a.includes(b));
    case 'add': return args().reduce((a,b) => a+b,0);
    case 'sub': { const a=args(); return a.slice(1).reduce((x,y)=>x-y,a[0]); }
    case 'mul': return args().reduce((a,b)=>a*b,1);
    case 'div': { const a=args(); if (!a[1]) throw new Error('ゼロ除算'); return a[0]/a[1]; }
    case 'mod': { const a=args(); if (!a[1]) throw new Error('ゼロ剰余'); return a[0]%a[1]; }
    case 'min': return Math.min(...args());
    case 'max': return Math.max(...args());
    case 'floor': return Math.floor(args()[0]);
    case 'ceil': return Math.ceil(args()[0]);
    case 'round': return Math.round(args()[0]);
    case 'abs': return Math.abs(args()[0]);
    case 'clamp': {const [v,min,max]=args();return Math.max(min,Math.min(max,v));}
    case 'has_item': return (context.inventory?.[value.item] ?? 0) >= (value.count ?? 1);
    case 'has_member': return context.members?.includes(value.actor) ?? false;
    case 'has_status': return context.actors?.[value.actor]?.statuses?.includes(value.status) ?? false;
    case 'event_done': return Boolean(context.events?.[value.event]);
    case 'map_discovered': return Boolean(context.discovered?.[value.map]?.includes(`${value.x},${value.y}`));
    default: throw new Error(`未対応の式: ${value.op}`);
  }
}
export function random(state) {
  let x = state.rng >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  state.rng = x >>> 0;
  return state.rng / 4294967296;
}
