import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {whiteDebtSource} from '../authoring/editions/e2/story-q018.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildWhiteDebtQuest(first,items) {
  return compilePreservedWorldQuest(first,items,whiteDebtSource(),'whitedebt');
}
export function buildWhiteDebt(options) {
  return buildPreservedWorldFile('q018',buildWhiteDebtQuest,options);
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  await buildWhiteDebt({check:process.argv.includes('--check')});
