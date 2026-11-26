import {gearStages, guideActor, guideBands, loadGuide, monsterFloorText} from './application/labyrinth-guide.js';
import {conditionText, monsterGroups, targetText} from './application/monster-catalog.js';
import {STAT_KEYS} from './core/jobs.js';

import {MONSTER_HABITS} from './core/monster-habits.js';

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
let listedFamily;
const familyLabels = {goblin: 'ゴブリン', orc: 'オーク', ogre: 'オーガ'};
const familyPath = family => family ? 'monsters/' + family : 'monsters';

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
function summaryCard(section, id, name, picture, subtitle) {
  const card = el('article', undefined, 'guide-entry');
  const head = el('div', undefined, 'entry-head'), text = el('div'), title = el('h4');
  const link = el('a', name);
  link.href = '#' + section + '/' + id;
  title.append(link);
  text.append(title);
  if (subtitle) text.append(el('small', subtitle));
  head.append(image(picture), text);
  const numbers = el('dl', undefined, 'entry-stats');
  for (const key of STAT_KEYS) {
    const pair = el('div');
    pair.append(el('dt', data.jobProfile.statNames[key]), el('dd'));
    numbers.append(pair);
  }
  card.append(head, numbers, el('p', undefined, 'entry-footer'));
  return card;
}

function updateSummary(card, stats, footer) {
  const values = card.querySelectorAll('dd');
  STAT_KEYS.forEach((key, index) => { values[index].textContent = stats[key]; });
  card.querySelector('.entry-footer').textContent = footer;
}

function drawAllyGrid(level, mode) {
  const grid = $('ally-grid');
  for (const [id, actor] of Object.entries(data.actors)) {
    const job = actor.initialJob;
    let card = $('ally-card-' + id);
    if (!card) {
      card = summaryCard('allies', id, actor.name, data.assets.images[actor.portrait], data.jobs[job].name);
      card.id = 'ally-card-' + id;
      grid.append(card);
    }
    const {stats, gear} = guideActor(data, id, job, level, mode);
    updateSummary(card, stats, equipmentText(gear));
  }
}

function filterMonsters() {
  const query = $('monster-search').value.trim().normalize('NFKC').toLowerCase();
  let count = 0;
  for (const group of $('monster-index').querySelectorAll('.monster-category')) {
    let matches = 0;
    for (const card of group.querySelectorAll('.guide-entry')) {
      card.hidden = !card.dataset.search.includes(query);
      if (!card.hidden) matches++;
    }
    group.hidden = matches === 0;
    group.querySelector('h3 small').textContent = String(matches) + '件';
    count += matches;
  }
  $('monster-empty').hidden = count > 0;
}

function fillMonsterList(family) {
  if (family === listedFamily) return;
  if (listedFamily !== undefined) $('monster-search').value = '';
  listedFamily = family;
  $('monster').replaceChildren();
  $('monster-index').replaceChildren();
  const enemies = Object.values(data.enemies).filter(e => !family || e.family === family);
  const groups = family
    ? [...new Set(enemies.map(e => e.levelBand))].sort((a, b) => a - b).map(level => {
        const entries = enemies.filter(e => e.levelBand === level);
        return ['Lv' + level + '帯　' + entries[0].breed, entries];
      })
    : monsterGroups(enemies);
  const names = new Set(), duplicates = new Set();
  for (const {name} of enemies) {
    if (names.has(name)) duplicates.add(name);
    names.add(name);
  }
  for (const [category, entries] of groups) {
    const group = el('optgroup');
    group.label = category;
    const section = el('section', undefined, 'monster-category');
    const title = el('h3', category), grid = el('div', undefined, 'guide-grid');
    title.append(el('small', entries.length + '件'));
    section.append(title, grid);
    for (const enemy of entries) {
      const {id, name, sprite, stats, rewards} = enemy;
      const variant = duplicates.has(name) ? id : '';
      group.append(new Option(variant ? name + '（' + variant + '）' : name, id));
      const subtitle = enemy.family ? 'Lv' + enemy.levelBand + '帯　' + enemy.breed : variant;
      const card = summaryCard(familyPath(family), id, name, data.assets.images[sprite], subtitle);
      updateSummary(card, stats, rewards.xp + ' EXP　' + rewards.gold + ' G');
      if (variant) card.querySelector('a').setAttribute('aria-label', name + '（' + variant + '）');
      card.dataset.search = (name + ' ' + id + ' ' + (enemy.breed ?? '')).normalize('NFKC').toLowerCase();
      grid.append(card);
    }
    $('monster').append(group);
    $('monster-index').append(section);
  }
  const empty = el('p', '一致する魔物はいません。');
  empty.id = 'monster-empty';
  empty.hidden = true;
  $('monster-index').append(empty);
  filterMonsters();
}

function drawMonster(id) {
  const enemy = data.enemies[id];
  const card = el('article', undefined, 'card');
  const header = el('div', undefined, 'card-head'), heading = el('div');
  heading.append(el('h3', enemy.name));
  if (enemy.family) heading.append(el('small', 'Lv' + enemy.levelBand + '帯　' + enemy.breed));
  if (enemy.description) heading.append(el('p', enemy.description));
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
      el('p', enemy.classSkill === rule.skill ? skill.description : conditionText(rule.condition) + ' ／ 対象　' + targetText(rule, skill)));
    list.append(item);
  }
  actions.append(list);
  const detail = block(), link = el('a', '出現場所・遭遇条件の詳細');
  link.href = 'https://github.com/TomTomYoung/adv/blob/master/doc/battle/MONSTER_CATALOG.md#monster-' + id;
  const floors = monsterFloorText(guideBands(data, false), id);
  if (floors) detail.append(el('p', '千変の迷宮　' + floors));
  detail.append(link);
  card.append(header, parameters, rewards, affinity);
  if (enemy.habits?.length) {
    const habits = block('習性');
    for (const id of enemy.habits) {
      const habit = MONSTER_HABITS[id];
      habits.append(el('strong', habit.name), el('p', habit.description));
    }
    card.append(habits);
  }
  card.append(actions, detail);
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
  const mode = $('gear').value;
  if ($('ally-detail').hidden) {
    drawAllyGrid(level, mode);
    return;
  }
  const id = $('actor').value, job = $('job').value;
  drawActor(id, job, level, mode);
  drawGrowth(id, job, level, mode);
}
function changeActor() {
  const initial = data.actors[$('actor').value].initialJob;
  const jobs = $('job');
  jobs.replaceChildren();
  for (const [key, job] of Object.entries(data.jobs)) option(jobs, key, job.name + (key === initial ? '（初期職）' : ''));
  jobs.value = initial;
}
function switchPage(event) {
  const [section, key, child] = location.hash.slice(1).split('/');
  const family = section === 'monsters' && Object.hasOwn(familyLabels, key ?? '') ? key : '';
  const entryId = family ? child : key;
  const active = ['monsters', 'enemies'].includes(section) ? section : 'allies';
  for (const id of ['allies', 'monsters', 'enemies']) {
    $(id).hidden = id !== active;
    $('nav-' + id).setAttribute('aria-current', id === active ? 'page' : 'false');
  }
  if (active === 'enemies') return;
  const allies = active === 'allies';
  if (!allies) {
    fillMonsterList(family);
    $('monsters-back').href = '#' + familyPath(family);
    $('monsters-back').textContent = (familyLabels[family] ?? '魔物') + '一覧に戻る';
    for (const link of document.querySelectorAll('.monster-families a')) {
      link.setAttribute('aria-current', link.dataset.family === family ? 'page' : 'false');
    }
  }
  const detail = Object.hasOwn(allies ? data.actors : data.enemies, entryId ?? '') &&
    (!family || data.enemies[entryId].family === family);
  const select = $(allies ? 'actor' : 'monster');
  const fromAllyGrid = allies && $('ally-detail').hidden;
  select.closest('label').hidden = !detail;
  $(active + '-back').hidden = !detail;
  $(allies ? 'ally-grid' : 'monster-index').hidden = detail;
  $(allies ? 'ally-detail' : 'monster-sheet').hidden = !detail;
  if (allies) {
    $('job').closest('label').hidden = !detail;
    if (detail && (fromAllyGrid || select.value !== entryId)) {
      select.value = entryId;
      changeActor();
    }
    refreshAlly();
  } else {
    $('monster-search-label').hidden = detail;
    if (detail) {
      select.value = entryId;
      drawMonster(entryId);
    }
  }
  if (!event) return;
  const previousHash = new URL(event.oldURL).hash;
  const [previous, previousId] = previousHash.slice(1).split('/');
  if (!detail && previous === active && previousId) {
    const index = $(allies ? 'ally-grid' : 'monster-index');
    const link = Array.from(index.querySelectorAll('a')).find(a => a.hash === previousHash);
    if (link && link.getClientRects().length) link.focus();
  } else if (detail && document.activeElement !== select) {
    $(allies ? 'ally-title' : 'monster-title').focus();
  }
}
async function init() {
  data = await loadGuide();
  option($('band'), 'all', 'すべてのレベル帯');
  for (const b of data.encounterGroups.bands) option($('band'), String(b.minLevel), 'Lv' + range(b.minLevel, b.maxLevel));
  for (const [key, def] of Object.entries(data.actors)) option($('actor'), key, def.name);
  for (const [key, label] of Object.entries(gearStages)) option($('gear'), key, label);
  $('monster-search').addEventListener('input', filterMonsters);
  $('monster').addEventListener('change', () => { location.hash = familyPath(listedFamily) + '/' + $('monster').value; });
  $('level').max = data.system.maxLevel;
  $('source').addEventListener('change', drawGroups); $('band').addEventListener('change', drawGroups);
  $('actor').addEventListener('change', () => {
    changeActor();
    location.hash = 'allies/' + $('actor').value;
  });
  $('job').addEventListener('change', refreshAlly);
  $('gear').addEventListener('change', refreshAlly); $('level').addEventListener('input', refreshAlly);
  $('level').addEventListener('change', () => {
    const input = $('level');
    input.value = Math.min(data.system.maxLevel, Math.max(1, Math.trunc(input.valueAsNumber) || 1));
    refreshAlly();
  });
  $('levels').addEventListener('toggle', refreshAlly);
  window.addEventListener('hashchange', switchPage);
  drawGroups(); switchPage(); $('status').hidden = true;
}
init().catch(error => { $('status').textContent = '図鑑を読み込めませんでした。' + error.message; });
