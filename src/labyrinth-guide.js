import {gearStages, guideActor, guideBands, loadGuide} from './application/labyrinth-guide.js';
import {conditionText, monsterGroups, targetText} from './application/monster-catalog.js';
import {STAT_KEYS} from './core/jobs.js';

const $ = id => document.getElementById(id);
const el = (tag, text, cls) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
};
const option = (select, value, label) => select.add(new Option(label, value));
const range = (a, b) => a === b ? String(a) : a + '〜' + b;
const percent = new Intl.NumberFormat('ja-JP', {style: 'percent', maximumFractionDigits: 1});
const slotNames = {weapon: '武器', armor: '防具', charm: '装飾'};
const image = src => {
  const img = el('img'); img.src = src; img.alt = ''; img.loading = 'lazy'; return img;
};
let data;

function drawGroups() {
  const common = $('source').value === 'common';
  const groups = $('groups');
  groups.replaceChildren();
  groups.classList.toggle('common', common);
  $('probability-note').hidden = common;
  for (const section of guideBands(data, common)) {
    const {first, last, band, total} = section;
    if ($('band').value !== 'all' && Number($('band').value) !== band.minLevel) continue;
    const panel = el('article', undefined, 'band'), title = el('div', undefined, 'band-head');
    title.append(el('h3', 'Lv' + range(first, last)), el('small', common ? '共通候補' : '地下' + range(first, last) + '階'));
    panel.append(title);
    for (const group of section.groups) {
      const row = el('div', undefined, 'group'), roster = el('div'), members = el('div', undefined, 'members');
      for (const member of group.members) {
        const label = el('a', undefined, 'member');
        label.href = '#monsters/' + member.id;
        label.append(image(member.image), el('span', member.name + ' ×' + member.count));
        members.append(label);
      }
      roster.append(members);
      if (group.override) roster.append(el('small', 'この階の優先設定　重み ' + group.base + ' → ' + group.weight, 'override'));
      const share = common ? '' : group.weight && total ? percent.format(group.weight / total) : '出現なし';
      const rate = el('span', share, 'chance');
      rate.setAttribute('aria-label', '出現率 ' + share);
      row.append(roster, el('span', group.count + '匹', 'number'), rate);
      panel.append(row);
    }
    groups.append(panel);
  }
}

function skillName(grant) {
  const spec = grant.api === 'battle.skill' ? data.skills[grant.skill] : data.fieldAbilities[grant.skill];
  return spec.name;
}
function block(title) {
  const div = el('div', undefined, 'block');
  if (title) div.append(el('h4', title));
  return div;
}
function fillMonsterList() {
  const enemies = Object.values(data.enemies);
  const names = new Set(), duplicates = new Set();
  for (const {name} of enemies) {
    if (names.has(name)) duplicates.add(name);
    names.add(name);
  }
  for (const [category, entries] of monsterGroups(enemies)) {
    const group = el('optgroup');
    group.label = category;
    for (const {id, name} of entries) {
      group.append(new Option(duplicates.has(name) ? name + '（' + id + '）' : name, id));
    }
    $('monster').append(group);
  }
}

function drawMonster(id) {
  const enemy = data.enemies[id];
  const card = el('article', undefined, 'card');
  const header = el('div', undefined, 'card-head'), heading = el('div');
  heading.append(el('h3', enemy.name));
  if (enemy.role) heading.append(el('p', enemy.role));
  if (enemy.appearance) heading.append(el('p', enemy.appearance));
  header.append(image(data.assets.images[enemy.sprite]), heading);

  const parameters = block('基礎能力'), stats = el('dl', undefined, 'stats');
  for (const key of STAT_KEYS) {
    const cell = el('div');
    cell.append(el('dt', data.jobProfile.statNames[key]), el('dd', String(enemy.stats[key])));
    stats.append(cell);
  }
  parameters.append(stats);
  const rewards = block('報酬・宝箱');
  const loot = enemy.drop?.chance ? data.items[enemy.drop.item].name + '（' + percent.format(enemy.drop.chance) + '）' : 'なし';
  rewards.append(el('p', enemy.rewards.gold + 'G ／ ' + enemy.rewards.xp + 'EXP　宝箱　' + loot));
  const affinity = block('属性倍率');
  const elements = {physical:'物理', fire:'炎', ice:'氷', lightning:'雷', water:'水', light:'光', earth:'地', dark:'闇'};
  const modified = Object.entries(enemy.resist ?? {}).filter(([,rate]) => rate !== 1);
  affinity.append(el('p', modified.length
    ? modified.map(([key, rate]) => (elements[key] ?? key) + ' ×' + rate).join(' ／ ') + '　その他 ×1'
    : '全属性 ×1'));
  const actions = block('行動と使用条件'), list = el('ol');
  for (const rule of [...enemy.ai].sort((a, b) => b.priority - a.priority)) {
    const skill = data.skills[rule.skill];
    const item = el('li');
    item.append(el('strong', skill.name), el('small', 'MP' + skill.mp, 'tag'),
      el('p', conditionText(rule.condition) + ' ／ 対象　' + targetText(rule, skill)));
    list.append(item);
  }
  actions.append(list);
  const detail = block(), link = el('a', '出現場所・遭遇条件の詳細');
  link.href = 'https://github.com/TomTomYoung/adv/blob/master/doc/battle/MONSTER_CATALOG.md#monster-' + id;
  detail.append(link);
  card.append(header, parameters, rewards, affinity, actions, detail);
  $('monster-sheet').replaceChildren(card);
}
function drawActor(id, job, level, mode) {
  const def = data.actors[id], row = guideActor(data, id, job, level, mode);
  const card = el('article', undefined, 'card'), header = el('div', undefined, 'card-head'), heading = el('div');
  heading.append(el('h3', def.name + '　Lv' + level), el('p', '育成職　' + data.jobs[job].name + '（Lv1から継続）'));
  header.append(image(data.assets.images[def.portrait]), heading);
  const params = block(), stats = el('dl', undefined, 'stats');
  for (const key of STAT_KEYS) {
    const cell = el('div'), value = el('dd', String(row.stats[key]));
    const delta = row.stats[key] - row.base[key];
    value.append(el('small', '素 ' + row.base[key] + (delta ? '　装備 ' + (delta > 0 ? '+' : '') + delta : '')));
    cell.append(el('dt', data.jobProfile.statNames[key]), value); stats.append(cell);
  }
  params.append(stats);
  const gear = block('想定装備'), kit = el('div', undefined, 'kit');
  for (const [slot, label] of Object.entries(slotNames)) {
    const item = data.items[row.gear.equipment[slot]], part = el('span');
    part.append(el('small', label, 'tag'), document.createTextNode(item?.name ?? 'なし')); kit.append(part);
  }
  gear.append(kit);
  if (mode === 'auto') gear.append(el('p', '攻略想定はLv1〜2が装備なし、Lv3〜5が町の店売り、Lv6〜10が第1段階、Lv11以降が第2段階です。'));
  if (row.gear.requirement) gear.append(el('p', '武器の解放条件　' + row.gear.requirement));
  if (mode !== 'none' && row.gear.stage !== 'none') gear.append(el('p', job === def.initialJob
    ? '武器種と防具はクエスト試遊の人物別装備に準拠します。' : '転職時は、育成職が装備できる武器・防具を想定しています。'));
  const skills = block('このレベルまでに習得するスキル');
  for (const [label, grants] of [['戦闘', row.grants.filter(g => g.api === 'battle.skill')], ['探索', row.grants.filter(g => g.api !== 'battle.skill')]]) {
    const group = el('div', undefined, 'skillrow'), list = el('div', undefined, 'skills');
    group.append(el('strong', label, 'tag'));
    for (const g of grants.slice().sort((a,b) => a.level - b.level)) {
      const item = el('span');
      item.append(el('small', 'Lv' + g.level, 'tag'), document.createTextNode(skillName(g)));
      list.append(item);
    }
    if (!grants.length) list.append(el('span', 'なし'));
    group.append(list); skills.append(group);
  }
  const purchases = Object.entries(data.expedition.products).filter(([,p]) => p.jobs.includes(job));
  if (purchases.length) {
    const purchase = el('p', '技能店で別途習得　' + purchases.map(([key]) => (data.skills[key] ?? data.fieldAbilities[key]).name).join('、'));
    skills.append(purchase);
  }
  card.append(header, params, gear, skills);
  $('sheet').replaceChildren(card);
}

function equipmentText(gear) {
  return Object.values(gear.equipment).map(id => data.items[id].name).join('・') || '装備なし';
}
function drawGrowth(id, job, selected, mode) {
  const container = $('growth');
  if (!$('levels').open) return;
  const scroll = el('div', undefined, 'scroll'), table = el('table'), head = table.createTHead().insertRow();
  scroll.tabIndex = 0; scroll.setAttribute('aria-label', 'レベルごとの成長一覧');
  table.createCaption().textContent = data.actors[id].name + '・' + data.jobs[job].name + '／装備込みの能力値';
  for (const label of ['Lv', ...STAT_KEYS.map(k => data.jobProfile.statNames[k]), '想定装備', '新規習得']) {
    const th = el('th', label); th.scope = 'col'; head.append(th);
  }
  const body = table.createTBody();
  for (let level = 1; level <= data.system.maxLevel; level++) {
    const row = guideActor(data, id, job, level, mode);
    const tr = body.insertRow(), th = el('th', String(level)); th.scope = 'row'; tr.append(th);
    if (level === selected) tr.classList.add('picked');
    for (const k of STAT_KEYS) tr.insertCell().textContent = row.stats[k];
    tr.insertCell().textContent = equipmentText(row.gear);
    tr.insertCell().textContent = row.grants.filter(g => g.level === level).map(skillName).join('、') || '―';
  }
  scroll.append(table);
  container.replaceChildren(scroll);
}

function refreshAlly() {
  const input = $('level');
  const level = input.valueAsNumber;
  if (!Number.isInteger(level) || level < 1 || level > data.system.maxLevel) return;
  const id = $('actor').value, job = $('job').value, mode = $('gear').value;
  drawActor(id, job, level, mode);
  drawGrowth(id, job, level, mode);
}
function changeActor() {
  const initial = data.actors[$('actor').value].initialJob;
  const jobs = $('job');
  jobs.replaceChildren();
  for (const [key, job] of Object.entries(data.jobs)) option(jobs, key, job.name + (key === initial ? '（初期職）' : ''));
  jobs.value = initial;
  refreshAlly();
}
function switchPage() {
  const [section, monsterId] = location.hash.slice(1).split('/');
  const active = ['monsters', 'enemies'].includes(section) ? section : 'allies';
  for (const id of ['allies', 'monsters', 'enemies']) {
    $(id).hidden = id !== active;
    $('nav-' + id).setAttribute('aria-current', id === active ? 'page' : 'false');
  }
  if (active === 'monsters') {
    const select = $('monster');
    if (monsterId && Object.hasOwn(data.enemies, monsterId)) select.value = monsterId;
    drawMonster(select.value);
  }
}
async function init() {
  data = await loadGuide();
  option($('band'), 'all', 'すべてのレベル帯');
  for (const b of data.encounterGroups.bands) option($('band'), String(b.minLevel), 'Lv' + range(b.minLevel, b.maxLevel));
  for (const [key, def] of Object.entries(data.actors)) option($('actor'), key, def.name);
  for (const [key, label] of Object.entries(gearStages)) option($('gear'), key, label);
  fillMonsterList();
  $('monster').addEventListener('change', () => { location.hash = 'monsters/' + $('monster').value; });
  $('level').max = data.system.maxLevel;
  $('source').addEventListener('change', drawGroups); $('band').addEventListener('change', drawGroups);
  $('actor').addEventListener('change', changeActor); $('job').addEventListener('change', refreshAlly);
  $('gear').addEventListener('change', refreshAlly); $('level').addEventListener('input', refreshAlly);
  $('level').addEventListener('change', () => {
    const input = $('level');
    input.value = Math.min(data.system.maxLevel, Math.max(1, Math.trunc(input.valueAsNumber) || 1));
    refreshAlly();
  });
  $('levels').addEventListener('toggle', refreshAlly);
  window.addEventListener('hashchange', switchPage);
  changeActor(); drawGroups(); switchPage(); $('status').hidden = true;
}
init().catch(error => { $('status').textContent = '図鑑を読み込めませんでした。' + error.message; });
