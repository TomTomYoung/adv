import {previous,catalog} from '../tests/deep-abyss-helpers.mjs';
import {verifyPublishedSaves} from './verify-published-saves.mjs';

export async function verifyDeepAbyssSaves(page){
  const cases=[
    ['q096',['follow','route'],['redirect'],'informed'],['q097',['name','register'],['certificate'],'informed'],
    ['q098',['open'],[],'contract'],['q099',['talk','resident'],['returner','connect'],'informed'],['q100',['key'],[],'contract']
  ];
  await verifyPublishedSaves(page,{previous,catalog,level:10,cases});
}
