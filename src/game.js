import * as THREE from 'three';
import { makeBlobfish, makeNameTag, part, sphere, sphereLo, box, cyl, cone, torus, mat, HATS } from './blobfish.js';
import { buildWorld, groundHeight, zoneAt, ZONES, BOUNDS } from './world.js';
import { NPCS, QUESTS, SHOP, RANKS, xpForLevel, QUEST_ITEMS, FRIEND_SPOTS } from './story.js';
import * as A from './audio.js';

const $ = (s) => document.querySelector(s);
const SAVE_KEY = 'blobfish-adventure-v1';
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const _camTarget = new THREE.Vector3();

// ============================================================ save state
const freshState = () => ({
  name: 'Blobby', coins: 0, xp: 0, level: 1, pearls: 0,
  hat: null, hats: [], items: {}, quests: {}, flags: {},
  unlocks: {}, taken: {}, pipFound: 0, visited: { bay: 1 },
  playtime: 0,
});
let S = freshState();

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* private mode */ }
}
function load() {
  try {
    const r = localStorage.getItem(SAVE_KEY);
    if (!r) return false;
    S = Object.assign(freshState(), JSON.parse(r));
    return true;
  } catch (e) { return false; }
}

// ============================================================ three.js setup
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1.25 : 1.75));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const FOG_COLD = new THREE.Color(0x0a3b4a), FOG_WARM = new THREE.Color(0x1a7a92);
scene.background = FOG_COLD.clone();
scene.fog = new THREE.FogExp2(FOG_COLD.clone(), 0.0095);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.4, 500);

const hemi = new THREE.HemisphereLight(0xbfe9ff, 0x4a6a5a, 0.85);
scene.add(hemi);
scene.add(new THREE.AmbientLight(0xffffff, 0.28));
const sun = new THREE.DirectionalLight(0xffe9c8, 0.9);
sun.position.set(40, 80, 30);
scene.add(sun);
const lantern = new THREE.PointLight(0xffd98a, 0, 24, 2);  // switched on by the shop lantern
scene.add(lantern);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const world = buildWorld(scene);

// Scenery is scattered randomly, so a rock or kelp clump can land on top of a
// hand-placed quest item or NPC and push the player permanently out of reach.
// Clear the small (scenery) colliders away from every fixed point that must
// stay reachable. Structural colliders (buildings) are large and never overlap
// these spots, so they are left alone.
{
  const protectedSpots = [
    ...Object.values(QUEST_ITEMS).flat(),
    ...FRIEND_SPOTS,
    ...NPCS.map((n) => [n.x, n.z]),
    [0, 14],   // player spawn
  ];
  for (let i = world.colliders.length - 1; i >= 0; i--) {
    const c = world.colliders[i];
    if (c.r > 4) continue;
    if (protectedSpots.some(([x, z]) => Math.hypot(x - c.x, z - c.z) < c.r + 2.2))
      world.colliders.splice(i, 1);
  }
}

// only chunky things can swallow the camera; ignore pebbles
const bigColliders = world.colliders.filter((c) => c.r >= 2.5);

const billboards = [];
scene.traverse((o) => { if (o.userData.billboard) billboards.push(o); });

// ============================================================ player
const player = makeBlobfish({ size: 1.0 });
scene.add(player);
const P = { x: 0, z: 14, y: 0, vy: 0, yaw: 0, speed: 0, airborne: false, squash: 0, dashT: -9, dashCd: 0 };

// waypoint arrow floating over the player's head
const arrow = new THREE.Group();
{
  const a = part(cone, 0xffc93c, [0, 0, 0], [.45, 1.1, .45], [Math.PI / 2, 0, 0], { shiny: 90, emissive: 0x7a5200 });
  arrow.add(a);
  scene.add(arrow);
}

// ============================================================ NPCs
const npcs = [];
for (const def of NPCS) {
  const m = makeBlobfish(def.look);
  m.position.set(def.x, groundHeight(def.x, def.z), def.z);
  m.rotation.y = def.ry || 0;
  const tag = makeNameTag(def.name);
  // local space: counter-scale so a big character does not get a giant label
  const sz = def.look.size || 1;
  tag.position.set(0, 2.05, 0);
  tag.scale.setScalar(1 / sz);
  m.add(tag); billboards.push(tag);
  scene.add(m);
  npcs.push({ def, mesh: m, tag, x: def.x, z: def.z, line: 0 });
  world.colliders.push({ x: def.x, z: def.z, r: (def.look.size || 1) * 1.1 });
}
const npcById = (id) => npcs.find((n) => n.def.id === id);

// ============================================================ collectibles
const items = [];      // {tag, mesh, x, z, base, taken, respawnAt, id, value}
const ITEM_STYLE = {
  blubble: { color: 0x7fe0ff, emissive: 0x2a89b8, r: 0.38, value: 1, xp: 1 },
  goldcoin: { color: 0xffc93c, emissive: 0x9a6f00, r: 0.42, value: 2, xp: 1 },
};

function mkItem(tag, x, z) {
  const g = new THREE.Group();
  let y = 1.0;
  switch (tag) {
    case 'blubble': case 'goldcoin': {
      const st = ITEM_STYLE[tag];
      g.add(part(sphereLo, st.color, [0, 0, 0], [st.r, st.r, st.r], null, { shiny: 100, emissive: st.emissive, ei: .9 }));
      break;
    }
    case 'crate':
      g.add(part(box, 0xb98249, [0, 0, 0], [1.1, 1.0, 1.1], null, { shiny: 8 }));
      g.add(part(box, 0x7d5630, [0, 0, 0], [1.16, .2, 1.16]));
      g.add(part(box, 0x7d5630, [0, 0, 0], [.2, 1.06, 1.16]));
      y = .6; break;
    case 'switch': {
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2;
        g.add(part(cone, 0xff7fb0, [Math.cos(a) * .35, .5, Math.sin(a) * .35], [.16, 1.1, .16],
          [Math.cos(a) * .3, 0, -Math.sin(a) * .3], { emissive: 0x8a2a55, ei: .7 }));
      }
      g.add(part(sphereLo, 0xfff0a0, [0, .5, 0], [.4, .4, .4], null, { emissive: 0xffd24d, ei: 1 }));
      y = .3; break;
    }
    case 'pearl2':
      g.add(part(sphere, 0xfff3c4, [0, 0, 0], [.7, .7, .7], null, { shiny: 120, emissive: 0xffb43c, ei: .8 }));
      g.add(part(torus, 0xffc93c, [0, 0, 0], [1.1, 1.1, 1.1], [Math.PI / 2.4, 0, 0], { shiny: 100 }));
      y = 1.4; break;
    case 'luckycoin':
      g.add(part(cyl, 0xffc93c, [0, 0, 0], [.5, .1, .5], [Math.PI / 2, 0, .3], { shiny: 110, emissive: 0x9a6f00, ei: .5 }));
      y = 1.1; break;
    case 'gift_rock':
      g.add(part(sphereLo, 0xf3a9c9, [0, 0, 0], [.85, .6, .8], null, { shiny: 60 }));
      g.add(part(sphereLo, 0xffd0e2, [.2, .3, .2], [.35, .28, .3], null, { shiny: 70 }));
      y = .55; break;
    case 'friend': {
      const b = makeBlobfish({ size: .42, happy: true, tiny: true, eyeSize: 1.3, color: 0xffcdb8 });
      b.userData.anim(0, {}); g.add(b); y = 0; break;
    }
  }
  g.position.set(x, groundHeight(x, z) + y, z);
  scene.add(g);
  const it = { tag, mesh: g, x, z, base: g.position.y, taken: false, respawnAt: 0, ph: Math.random() * 6 };
  items.push(it);
  return it;
}

function removeItem(it) {
  const i = items.indexOf(it);
  if (i >= 0) items.splice(i, 1);
  scene.remove(it.mesh);
}

// scattered Blubbles: clusters near every zone plus a light dusting between them
function scatterBlubbles() {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const z of ZONES) {
    for (let i = 0; i < 20; i++) {
      const a = rnd() * Math.PI * 2, d = 6 + rnd() * (z.r - 8);
      mkItem('blubble', z.x + Math.cos(a) * d, z.z + Math.sin(a) * d);
    }
  }
  for (let i = 0; i < 60; i++) mkItem('blubble', -110 + rnd() * 220, -175 + rnd() * 245);
  // trails of blubbles along the roads between zones - free breadcrumbs
  const roads = [[0, 20, 0, -60], [0, -85, 0, -135], [-20, -60, -70, -40], [20, -60, 70, -46], [8, 20, 4, 50]];
  for (const [x1, z1, x2, z2] of roads)
    for (let t = 0; t <= 1.001; t += 1 / 14)
      mkItem('blubble', x1 + (x2 - x1) * t + (rnd() - .5) * 4, z1 + (z2 - z1) * t + (rnd() - .5) * 4);
}
scatterBlubbles();
FRIEND_SPOTS.forEach(([x, z], i) => { const it = mkItem('friend', x, z); it.id = 'friend' + i; });

// hide already-collected permanent items on load
function applyTaken() {
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it.id && S.taken[it.id]) removeItem(it);
  }
}

// ============================================================ particles
const bursts = [];
const burstGeo = new THREE.IcosahedronGeometry(0.16, 0);
const burstPool = [];
for (let i = 0; i < 90; i++) {
  const m = new THREE.Mesh(burstGeo, mat(0xffffff, { emissive: 0xffffff, ei: 1 }).clone());
  m.visible = false; scene.add(m); burstPool.push(m);
}
let burstIdx = 0;
function burst(pos, color, n = 10, power = 1) {
  for (let i = 0; i < n; i++) {
    const m = burstPool[burstIdx = (burstIdx + 1) % burstPool.length];
    m.visible = true; m.position.copy(pos);
    m.material.color.setHex(color); m.material.emissive.setHex(color);
    m.scale.setScalar(0.6 + Math.random() * 0.9);
    bursts.push({ m, vx: (Math.random() - .5) * 9 * power, vy: 3 + Math.random() * 7 * power, vz: (Math.random() - .5) * 9 * power, life: .8 });
  }
}

// ============================================================ UI helpers
const ui = {
  hud: $('#hud'), coins: $('#coinNum'), coinBox: $('#coins'), xp: $('#xpfill'),
  rank: $('#rankName'), badge: $('#rankBadge'), tracker: $('#tracker'),
  trackTitle: $('#trackTitle'), trackSteps: $('#trackSteps'), pearlRow: $('#pearlRow'),
  toasts: $('#toasts'), combo: $('#combo'), zoneCard: $('#zoneCard'), prompt: $('#prompt'),
  promptTxt: $('#promptTxt'), dialog: $('#dialog'), modal: $('#modal'), modalBox: $('#modalBox'),
  fade: $('#fade'), tAct: $('#tAct'),
};

function toast(msg, good = false) {
  const d = document.createElement('div');
  d.className = 'toast' + (good ? ' good' : '');
  d.innerHTML = msg;
  ui.toasts.appendChild(d);
  setTimeout(() => { d.style.transition = 'opacity .4s, transform .4s'; d.style.opacity = 0; d.style.transform = 'translateY(-14px)'; }, 2200);
  setTimeout(() => d.remove(), 2700);
}

let zoneTimer = 0;
function showZone(z) {
  ui.zoneCard.querySelector('b').textContent = z.name;
  ui.zoneCard.querySelector('span').textContent = z.sub;
  ui.zoneCard.classList.add('on');
  zoneTimer = 2.6;
}

function refreshHUD() {
  ui.coins.textContent = S.coins;
  const need = xpForLevel(S.level);
  ui.xp.style.width = clamp(S.xp / need * 100, 0, 100) + '%';
  ui.rank.textContent = RANKS[Math.min(S.level - 1, RANKS.length - 1)];
  ui.badge.textContent = S.level;
  ui.pearlRow.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const d = document.createElement('div');
    d.className = 'pearl' + (i < S.pearls ? ' got' : '');
    ui.pearlRow.appendChild(d);
  }
  refreshTracker();
}

function addCoins(n) {
  S.coins += n;
  ui.coinBox.classList.remove('pulse'); void ui.coinBox.offsetWidth; ui.coinBox.classList.add('pulse');
  refreshHUD();
}
function addXP(n) {
  S.xp += n;
  while (S.xp >= xpForLevel(S.level)) {
    S.xp -= xpForLevel(S.level);
    S.level++;
    A.sfxLevel();
    toast('LEVEL UP! You are now a <b>' + RANKS[Math.min(S.level - 1, RANKS.length - 1)] + '</b>', true);
    burst(player.position.clone().setY(player.position.y + 2), 0x7ef7b0, 26, 1.4);
    save();
  }
  refreshHUD();
}

// ============================================================ quest engine
const questDef = (id) => QUESTS.find((q) => q.id === id);
function qs(id) { return S.quests[id]; }
function qstatus(id) {
  const st = qs(id);
  if (st) return st.status;
  const d = questDef(id);
  if (!d.unlockedBy) return 'offered';
  return qstatus(d.unlockedBy) === 'done' ? 'offered' : 'locked';
}
function startQuest(id) {
  if (qs(id)) return;
  S.quests[id] = { status: 'active', c: {} };
  const d = questDef(id);
  toast('New quest: <b>' + d.title + '</b>');
  A.sfxQuest();
  syncQuestItems();
  refreshHUD(); save();
}
function stepDone(qid, i) {
  const d = questDef(qid), st = qs(qid), s = d.steps[i];
  if (!st) return false;
  if (s.t === 'collect') return (st.c[s.tag] || 0) >= s.n;
  if (s.t === 'buy') return !!S.items[s.item];
  return !!st.c['s' + i];
}
function checkReady(qid) {
  const d = questDef(qid), st = qs(qid);
  if (!st || st.status !== 'active') return;
  if (d.steps.every((_, i) => stepDone(qid, i))) {
    st.status = 'ready';
    if (!d.giver) { finishQuest(qid); }
    else { toast('Return to <b>' + (npcById(d.giver)?.def.name || '?') + '</b>', true); A.sfxQuest(); }
  }
  refreshHUD(); save();
}
function finishQuest(qid) {
  const d = questDef(qid), st = qs(qid);
  st.status = 'done';
  const r = d.reward || {};
  if (r.coins) { addCoins(r.coins); toast('+' + r.coins + ' Blubbles', true); }
  if (r.xp) addXP(r.xp);
  if (r.pearl) {
    S.pearls = Math.max(S.pearls, r.pearl);
    A.sfxPearl();
    toast('&#11088; <b>Glow Pearl ' + r.pearl + ' of 5</b>', true);
    burst(player.position.clone().setY(player.position.y + 2), 0xffc93c, 34, 1.6);
  }
  if (r.unlock) { S.unlocks[r.unlock] = 1; toast('Unlocked: <b>' + r.unlock.toUpperCase() + '</b>', true); }
  if (r.item) { S.items[r.item] = 1; onCollect(r.item); }
  if (r.hat || r.hatUnlock) {
    const h = r.hat || r.hatUnlock;
    if (!S.hats.includes(h)) S.hats.push(h);
    toast('New hat: <b>' + h + '</b>', true);
    if (r.hat) setHat(h);
  }
  A.sfxQuest();
  syncQuestItems();
  refreshHUD(); save();
}
function onCollect(tag) {
  for (const id in S.quests) {
    const st = S.quests[id];
    if (st.status !== 'active') continue;
    const d = questDef(id);
    for (const s of d.steps) if (s.t === 'collect' && s.tag === tag) st.c[tag] = (st.c[tag] || 0) + 1;
    checkReady(id);
  }
}
function onBuy(item) { for (const id in S.quests) checkReady(id); }
function setFlag(f) {
  S.flags[f] = 1;
  for (const id in S.quests) {
    const st = S.quests[id]; if (st.status !== 'active') continue;
    questDef(id).steps.forEach((s, i) => { if (s.t === 'flag' && s.flag === f) st.c['s' + i] = 1; });
    checkReady(id);
  }
  save();
}
function onGoto(x, z) {
  for (const id in S.quests) {
    const st = S.quests[id]; if (st.status !== 'active') continue;
    let hit = false;
    questDef(id).steps.forEach((s, i) => {
      if (s.t === 'goto' && !st.c['s' + i] && Math.hypot(x - s.x, z - s.z) < s.r) { st.c['s' + i] = 1; hit = true; }
    });
    if (hit) { A.sfxQuest(); checkReady(id); }
  }
}
// auto-start any quest with no giver as soon as it unlocks
function pollAutoStart() {
  for (const d of QUESTS) if (!d.giver && !qs(d.id) && qstatus(d.id) === 'offered') startQuest(d.id);
}

// the quest the tracker and the arrow care about
function focusQuest() {
  for (const d of QUESTS) {
    if (d.side) continue;
    const s = qstatus(d.id);
    if (s === 'offered' || s === 'active' || s === 'ready') return d;
  }
  return QUESTS.find((d) => d.side && qstatus(d.id) !== 'done') || null;
}

function refreshTracker() {
  const d = focusQuest();
  if (!d) { ui.tracker.style.display = 'none'; return; }
  ui.tracker.style.display = 'block';
  ui.trackTitle.textContent = d.title;
  const status = qstatus(d.id);
  let html = '';
  if (status === 'offered') {
    html = '<div>Go and see <b>' + (npcById(d.giver)?.def.name || 'someone') + '</b></div>';
  } else if (status === 'ready') {
    html = '<div class="tick">&#10003; All done!</div><div>Return to <b>' + (npcById(d.giver)?.def.name || '') + '</b></div>';
  } else {
    const st = qs(d.id);
    d.steps.forEach((s, i) => {
      const done = stepDone(d.id, i);
      let t = s.text || '';
      if (s.t === 'collect') t += ' (' + Math.min(st.c[s.tag] || 0, s.n) + '/' + s.n + ')';
      html += '<div class="' + (done ? 'tick' : '') + '">' + (done ? '&#10003; ' : '&bull; ') + t + '</div>';
    });
  }
  ui.trackSteps.innerHTML = html;
}

// where the golden arrow should point
function waypointTarget() {
  const d = focusQuest();
  if (!d) return null;
  const status = qstatus(d.id);
  if (status === 'offered' || status === 'ready') {
    const n = npcById(d.giver); return n ? { x: n.x, z: n.z } : null;
  }
  const st = qs(d.id);
  if (!st) return null;
  for (let i = 0; i < d.steps.length; i++) {
    if (stepDone(d.id, i)) continue;
    const s = d.steps[i];
    if (s.t === 'goto') return { x: s.x, z: s.z };
    if (s.t === 'buy') { const n = npcById('shelly'); return { x: n.x, z: n.z }; }
    if (s.t === 'flag') return s.at ? { x: s.at[0], z: s.at[1] } : null;
    if (s.t === 'collect') {
      let best = null, bd = Infinity;
      for (const it of items) {
        if (it.tag !== s.tag) continue;
        const dd = (it.x - P.x) ** 2 + (it.z - P.z) ** 2;
        if (dd < bd) { bd = dd; best = it; }
      }
      if (best) return { x: best.x, z: best.z };
      if (s.tag === 'gift_joke') { const n = npcById('pip'); return { x: n.x, z: n.z }; }
    }
  }
  return null;
}

// quest items only exist while the quest that needs them is running
function syncQuestItems() {
  const want = new Set();
  const lanternQ = qs('lantern');
  if (lanternQ && lanternQ.status === 'active') {
    want.add('switch');
    if ((lanternQ.c.switch || 0) >= 3) want.add('pearl2');
  }
  const cratesQ = qs('crates');
  if (cratesQ && cratesQ.status === 'active') want.add('crate');
  const tyc = qs('tycoon');
  if (tyc && tyc.status === 'active' && S.flags.seekcoin && !S.items.luckycoin) want.add('luckycoin');
  const cheer = qs('cheerup');
  if (cheer && cheer.status === 'active') want.add('gift_rock');

  for (const tag of ['crate', 'switch', 'pearl2', 'luckycoin', 'gift_rock']) {
    const have = items.some((i) => i.tag === tag);
    if (want.has(tag) && !have) {
      (QUEST_ITEMS[tag] || []).forEach(([x, z], i) => {
        const it = mkItem(tag, x, z); it.id = tag + i;
        if (S.taken[it.id]) removeItem(it);
      });
    } else if (!want.has(tag) && have) {
      for (let i = items.length - 1; i >= 0; i--) if (items[i].tag === tag) removeItem(items[i]);
    }
  }
  // Pip hides while the hide-and-seek quest is running
  const hide = qs('hide');
  const pip = npcById('pip');
  if (hide && hide.status === 'active' && S.pipFound < 3) {
    const spot = QUEST_ITEMS.pipSpots[S.pipFound];
    pip.x = spot[0]; pip.z = spot[1];
    pip.mesh.position.set(spot[0], groundHeight(spot[0], spot[1]), spot[1]);
    pip.tag.visible = false;
  } else {
    pip.x = -18; pip.z = -6;
    pip.mesh.position.set(-18, groundHeight(-18, -6), -6);
    pip.tag.visible = true;
  }
}

// ============================================================ dialogue
let dlg = null;  // {lines, i, onEnd, choices}
function say(who, lines, opts = {}) {
  dlg = { who, lines: lines.slice(), i: 0, onEnd: opts.onEnd, choices: opts.choices };
  ui.dialog.style.display = 'block';
  ui.dialog.querySelector('.who').textContent = who;
  renderLine();
}
function renderLine() {
  const d = dlg;
  ui.dialog.querySelector('.txt').textContent = d.lines[d.i] || '';
  const row = ui.dialog.querySelector('.row');
  row.innerHTML = '';
  A.sfxBlip();
  const last = d.i >= d.lines.length - 1;
  if (last && d.choices) {
    for (const c of d.choices) {
      const b = document.createElement('button');
      b.className = 'btn' + (c.ghost ? ' ghost' : '');
      b.innerHTML = c.label;
      if (c.disabled) b.disabled = true;
      b.onclick = () => { closeDialog(); c.go(); };
      row.appendChild(b);
    }
  } else {
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = last ? 'Bye!' : 'Next';
    b.onclick = () => {
      if (d.i < d.lines.length - 1) { d.i++; renderLine(); }
      else { const f = d.onEnd; closeDialog(); if (f) f(); }
    };
    row.appendChild(b);
  }
}
function closeDialog() { dlg = null; ui.dialog.style.display = 'none'; }

// ============================================================ talking to NPCs
function talkTo(n) {
  const id = n.def.id;
  A.resumeAudio();

  // Pip during hide-and-seek: finding him counts as a collect
  const hideQ = qs('hide');
  if (id === 'pip' && hideQ && hideQ.status === 'active' && S.pipFound < 3) {
    S.pipFound++;
    onCollect('pip');
    burst(n.mesh.position.clone().setY(n.mesh.position.y + 1.5), 0xffd4a8, 16, 1.1);
    A.sfxPickup(S.pipFound * 3);
    const left = 3 - S.pipFound;
    say('Pip', left > 0
      ? ['Squeak! You found me!', 'Again again! ' + left + ' more time' + (left > 1 ? 's' : '') + '!']
      : ['Squeeeak! Three times! You win!'],
      { onEnd: () => { syncQuestItems(); refreshHUD(); save(); } });
    return;
  }

  // Mr Pennysquish's two deals are choices, so they bypass the generic flow.
  if (id === 'penny') {
    const tSt = qstatus('tycoon');
    if ((tSt === 'offered' || tSt === 'active') && !S.flags.pearl3) {
      if (S.items.luckycoin) {
        say(n.def.name, ['My lucky coin! You actually found it!',
          'I have not felt lucky since I lost that. A deal is a deal.'],
          { onEnd: () => { delete S.items.luckycoin; startQuest('tycoon'); setFlag('pearl3'); } });
        return;
      }
      const d = questDef('tycoon');
      say(n.def.name, S.flags.seekcoin ? d.nag : d.start, {
        choices: [
          { label: 'Pay 200 Blubbles', disabled: S.coins < 200,
            go: () => { startQuest('tycoon'); addCoins(-200); A.sfxCoin(); setFlag('pearl3'); } },
          { label: 'I will find your coin', ghost: true,
            go: () => { startQuest('tycoon'); setFlag('seekcoin'); syncQuestItems();
                        toast('The lucky coin is somewhere in <b>Wobble Bay</b>'); } },
        ],
      });
      return;
    }
    const vSt = qstatus('vaultrun');
    if ((vSt === 'offered' || vSt === 'active') && !S.flags.vaultrun) {
      const d = questDef('vaultrun');
      say(n.def.name, vault.tried ? d.nag : d.start, {
        choices: [{ label: 'Start the run!', go: () => { startQuest('vaultrun'); startVaultRun(); } },
                  { label: 'Not yet', ghost: true, go: () => { startQuest('vaultrun'); } }],
      });
      vault.tried = true;
      return;
    }
  }

  // 1. turn in a finished quest
  for (const d of QUESTS) {
    if (d.giver === id && qstatus(d.id) === 'ready') {
      say(n.def.name, d.turnIn && d.turnIn.length ? d.turnIn : ['Thank you!'],
        { onEnd: () => finishQuest(d.id) });
      return;
    }
  }
  // 2. offer a new quest
  for (const d of QUESTS) {
    if (d.giver === id && qstatus(d.id) === 'offered') {
      say(n.def.name, d.start || ['...'], { onEnd: () => startQuest(d.id) });
      return;
    }
  }
  // 3. nag about an active one
  for (const d of QUESTS) {
    if (d.giver === id && qstatus(d.id) === 'active' && d.nag) {
      say(n.def.name, d.nag, { onEnd: n.def.shop ? openShop : null });
      return;
    }
  }
  // 4. shop or small talk
  if (n.def.shop) { openShop(); return; }
  const lines = n.def.idle;
  say(n.def.name, [lines[n.line++ % lines.length]]);
}

// ============================================================ shop
function openShop() {
  A.sfxOpen();
  const box = ui.modalBox;
  const render = () => {
    box.innerHTML = '<h2>Shelly\'s Shop</h2><div class="sub">You have <b style="color:var(--gold)">' +
      S.coins + '</b> Blubbles.</div><div class="shelf"></div>' +
      '<div class="closeRow"><button class="btn ghost" id="shopClose">Close</button></div>';
    const shelf = box.querySelector('.shelf');
    for (const it of SHOP) {
      const owned = !!S.items[it.id] || (it.hat && S.hats.includes(it.hat));
      const d = document.createElement('div');
      d.className = 'item' + (owned ? ' owned' : '');
      d.innerHTML = '<div class="ico">' + it.ico + '</div><div class="nm">' + it.name +
        '</div><div class="ds">' + it.desc + '</div>' +
        (owned ? '<div class="price">Owned</div>'
               : '<div class="price">' + it.price + ' Blubbles</div>');
      if (!owned) {
        const b = document.createElement('button');
        b.className = 'btn';
        b.textContent = 'Buy';
        b.disabled = S.coins < it.price;
        b.onclick = () => {
          if (S.coins < it.price) { A.sfxDeny(); return; }
          addCoins(-it.price);
          if (it.hat) { S.hats.push(it.hat); setHat(it.hat); }
          else S.items[it.id] = 1;
          if (it.id === 'lantern') lantern.intensity = 1.6;
          A.sfxCoin();
          toast('Bought <b>' + it.name + '</b>', true);
          onBuy(it.id); applyPerks(); save(); render();
        };
        d.appendChild(b);
      }
      shelf.appendChild(d);
    }
    box.querySelector('#shopClose').onclick = closeModal;
  };
  render();
  ui.modal.style.display = 'grid';
}

function openJournal() {
  A.sfxOpen();
  let html = '<h2>Quest Journal</h2><div class="sub">' + S.name + ' &bull; ' +
    RANKS[Math.min(S.level - 1, RANKS.length - 1)] + ' &bull; ' + S.pearls + '/5 Glow Pearls</div>';
  for (const d of QUESTS) {
    const st = qstatus(d.id);
    if (st === 'locked') continue;
    html += '<div class="qcard ' + (st === 'done' ? 'done' : '') + '"><h4>' +
      (st === 'done' ? '&#10003; ' : '') + d.title + (d.side ? ' <span style="opacity:.6;font-size:13px">(side)</span>' : '') + '</h4>' +
      '<div class="step" style="opacity:.75">' + (d.desc || '') + '</div>';
    if (st === 'offered') html += '<div class="step">Go and see ' + (npcById(d.giver)?.def.name || '?') + '.</div>';
    if (st === 'ready') html += '<div class="step tick">All done - return to ' + (npcById(d.giver)?.def.name || '?') + '.</div>';
    if (st === 'active') {
      const q = qs(d.id);
      d.steps.forEach((s, i) => {
        let t = s.text || '';
        if (s.t === 'collect') t += ' (' + Math.min(q.c[s.tag] || 0, s.n) + '/' + s.n + ')';
        html += '<div class="step">' + (stepDone(d.id, i) ? '&#10003; ' : '&bull; ') + t + '</div>';
      });
    }
    html += '</div>';
  }
  html += '<div class="closeRow"><button class="btn ghost" id="jClose">Close</button></div>';
  ui.modalBox.innerHTML = html;
  ui.modalBox.querySelector('#jClose').onclick = closeModal;
  ui.modal.style.display = 'grid';
}

function openMenu() {
  A.sfxOpen();
  const zonesVisited = ZONES.filter((z) => S.visited[z.id]);
  let html = '<h2>Menu</h2><div class="sub">Hats, travel and settings.</div>';
  html += '<h4 style="color:var(--gold);margin:6px 0">Wardrobe</h4><div class="shelf">';
  html += '<div class="item"><div class="ico">&#128584;</div><div class="nm">No hat</div><div class="ds">Just a blob.</div>' +
    '<button class="btn ghost" data-hat="">Wear</button></div>';
  for (const h of HATS) {
    const owned = S.hats.includes(h);
    html += '<div class="item' + (owned ? ' owned' : '') + '"><div class="ico">' +
      (owned ? '&#127913;' : '&#128274;') + '</div><div class="nm">' + h + '</div>' +
      '<div class="ds">' + (owned ? (S.hat === h ? 'Wearing it.' : 'In your wardrobe.') : 'Not found yet.') + '</div>' +
      (owned ? '<button class="btn' + (S.hat === h ? '' : ' ghost') + '" data-hat="' + h + '">' + (S.hat === h ? 'Worn' : 'Wear') + '</button>' : '') +
      '</div>';
  }
  html += '</div>';
  html += '<h4 style="color:var(--gold);margin:14px 0 6px">Bubble Travel</h4><div class="shelf">';
  for (const z of zonesVisited)
    html += '<div class="item"><div class="ico">&#127754;</div><div class="nm">' + z.name +
      '</div><div class="ds">' + z.sub + '</div><button class="btn ghost" data-go="' + z.id + '">Go</button></div>';
  html += '</div>';
  html += '<div class="closeRow"><button class="btn ghost" id="mReset">Start Over</button>' +
    '<button class="btn" id="mClose">Back to the Deep</button></div>';
  ui.modalBox.innerHTML = html;
  ui.modalBox.querySelectorAll('[data-hat]').forEach((b) => b.onclick = () => { setHat(b.dataset.hat || null); save(); openMenu(); });
  ui.modalBox.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => {
    const z = ZONES.find((x) => x.id === b.dataset.go);
    P.x = z.x + 6; P.z = z.z + 10; P.y = 0; P.vy = 0;
    closeModal(); showZone(z); A.sfxDash();
  });
  ui.modalBox.querySelector('#mClose').onclick = closeModal;
  ui.modalBox.querySelector('#mReset').onclick = () => {
    ui.modalBox.innerHTML = '<h2>Start over?</h2><div class="sub">This wipes all your pearls, hats and Blubbles.</div>' +
      '<div class="closeRow"><button class="btn ghost" id="no">No, keep playing</button><button class="btn" id="yes">Yes, start over</button></div>';
    ui.modalBox.querySelector('#no').onclick = openMenu;
    ui.modalBox.querySelector('#yes').onclick = () => { localStorage.removeItem(SAVE_KEY); location.reload(); };
  };
  ui.modal.style.display = 'grid';
}
function closeModal() { ui.modal.style.display = 'none'; A.sfxBlip(); }

function setHat(h) {
  S.hat = h || null;
  player.userData.setHat(S.hat);
}
function applyPerks() {
  lantern.intensity = S.items.lantern ? 1.6 : 0;
}

// ============================================================ vault run
const vault = { on: false, t: 0, got: 0, tried: false, el: null };
function startVaultRun() {
  vault.on = true; vault.t = 60; vault.got = 0;
  for (let i = 0; i < 45; i++) {
    const a = Math.random() * Math.PI * 2, d = 8 + Math.random() * 24;
    mkItem('goldcoin', 82 + Math.cos(a) * d, -48 + Math.sin(a) * d);
  }
  if (!vault.el) {
    vault.el = document.createElement('div');
    vault.el.style.cssText = 'position:absolute;top:14%;left:50%;transform:translateX(-50%);font-weight:900;' +
      'font-size:30px;color:var(--gold);text-shadow:0 3px 0 #7a5200;text-align:center;';
    ui.hud.appendChild(vault.el);
  }
  vault.el.style.display = 'block';
  toast('GO! Grab 25 gold coins!', true);
  A.sfxQuest();
}
function endVaultRun(win) {
  vault.on = false;
  vault.el.style.display = 'none';
  for (let i = items.length - 1; i >= 0; i--) if (items[i].tag === 'goldcoin') removeItem(items[i]);
  if (win) { setFlag('vaultrun'); toast('YOU DID IT!', true); }
  else toast('Out of time! Talk to Mr. Pennysquish to try again.');
}

// ============================================================ finale
// Driven by the game clock rather than setTimeout, so the sequence cannot be
// desynced or stalled by a backgrounded tab.
let ending = -1, endPhase = 0;
function playFinale() {
  if (ending >= 0) return;
  ending = 0; endPhase = 0;
  closeDialog();
  A.sfxPearl();
}
function updateFinale(dt) {
  if (ending < 0) return;
  ending += dt;
  const v = world.marks.vent;
  while (endPhase < 5 && ending >= 0.4 + endPhase * 0.55) {
    const s = v.userData.sockets[endPhase];
    s.userData.orb.material = mat(0xfff3c4, { shiny: 120, emissive: 0xffc93c, ei: 1 });
    burst(s.getWorldPosition(new THREE.Vector3()), 0xffc93c, 16, 1.2);
    A.sfxPickup(endPhase * 4);
    endPhase++;
  }
  if (endPhase === 5 && ending >= 3.2) {
    endPhase = 6;
    v.userData.glow.visible = true;
    A.sfxPearl();
    burst(new THREE.Vector3(0, 8, 58), 0x9fe8ff, 60, 2.4);
  }
  if (endPhase === 6 && ending >= 4.4) {
    endPhase = 7;
    setFlag('lit');
    ui.modalBox.innerHTML =
      '<h2>The Deep Is Warm Again</h2>' +
      '<div class="sub">The Great Vent roars back to life. Everywhere, blobfish start to wobble.</div>' +
      '<div style="font-size:17px;line-height:1.6">' +
      'Grandma Wobble says you are the finest blob she ever raised.<br>' +
      'Professor Glub is already writing a paper about you.<br>' +
      'Mr. Pennysquish claims he helped. He did not.<br>' +
      'And King Grumpfish, warm at last, is smiling. Actually smiling.</div>' +
      '<div style="margin-top:14px;font-size:16px">Glow Pearls <b>5/5</b> &bull; Little friends found <b>' +
      (qs('friends')?.c.friend || 0) + '/12</b> &bull; Hats <b>' + S.hats.length + '/' + HATS.length + '</b>' +
      '<br><span style="opacity:.75">There are still friends and hats out there. Go and find them.</span></div>' +
      '<div class="closeRow"><button class="btn" id="fClose">Keep exploring</button></div>';
    ui.modalBox.querySelector('#fClose').onclick = closeModal;
    ui.modal.style.display = 'grid';
    save();
  }
}

// ============================================================ input
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = 1;
  if (e.code === 'KeyE' || e.code === 'Enter') doInteract();
  if (e.code === 'KeyJ') ui.modal.style.display === 'grid' ? closeModal() : openJournal();
  if (e.code === 'Escape') ui.modal.style.display === 'grid' ? closeModal() : openMenu();
  if (e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', (e) => { keys[e.code] = 0; });

const stick = { active: false, id: -1, cx: 0, cy: 0, dx: 0, dy: 0 };
const drag = { id: -1, x: 0 };
let camYaw = 0, camPitch = 0.32;
const stickEl = $('#stick'), knobEl = $('#knob');

const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) $('#touch').style.display = 'block';

$('#stickZone').addEventListener('pointerdown', (e) => {
  stick.active = true; stick.id = e.pointerId;
  stick.cx = e.clientX; stick.cy = e.clientY; stick.dx = stick.dy = 0;
  stickEl.style.display = 'block';
  stickEl.style.left = e.clientX + 'px'; stickEl.style.top = e.clientY + 'px';
  knobEl.style.transform = 'translate(-50%,-50%)';
  try { e.target.setPointerCapture(e.pointerId); } catch (err) { /* pointer already released */ }
});
addEventListener('pointermove', (e) => {
  if (stick.active && e.pointerId === stick.id) {
    let dx = e.clientX - stick.cx, dy = e.clientY - stick.cy;
    const d = Math.hypot(dx, dy), max = 58;
    if (d > max) { dx *= max / d; dy *= max / d; }
    stick.dx = dx / max; stick.dy = dy / max;
    knobEl.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
    return;
  }
  if (drag.id === e.pointerId) { camYaw -= (e.clientX - drag.x) * 0.006; drag.x = e.clientX; }
});
function endPointer(e) {
  if (stick.active && e.pointerId === stick.id) {
    stick.active = false; stick.dx = stick.dy = 0; stickEl.style.display = 'none';
  }
  if (drag.id === e.pointerId) drag.id = -1;
}
addEventListener('pointerup', endPointer);
addEventListener('pointercancel', endPointer);
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (isTouch && e.clientX < innerWidth * 0.45 && e.clientY > innerHeight * 0.3) return;
  drag.id = e.pointerId; drag.x = e.clientX;
});

let jumpQueued = false, dashQueued = false;
$('#tJump').addEventListener('pointerdown', (e) => { e.preventDefault(); jumpQueued = true; });
$('#tDash').addEventListener('pointerdown', (e) => { e.preventDefault(); dashQueued = true; });
$('#tAct').addEventListener('pointerdown', (e) => { e.preventDefault(); doInteract(); });
$('#btnJournal').onclick = () => ui.modal.style.display === 'grid' ? closeModal() : openJournal();
$('#btnMenu').onclick = () => ui.modal.style.display === 'grid' ? closeModal() : openMenu();

// ============================================================ interaction
let near = null;   // {kind:'npc'|'vent', npc?}
function doInteract() {
  A.resumeAudio();
  if (dlg) { ui.dialog.querySelector('.row .btn:last-child')?.click(); return; }
  if (ui.modal.style.display === 'grid') return;
  if (!near) return;
  if (near.kind === 'npc') talkTo(near.npc);
  else if (near.kind === 'vent') {
    if (S.pearls >= 5 && !S.flags.lit) playFinale();
    else if (S.flags.lit) say('The Great Vent', ['Warm bubbles pour out of it. The whole Deep hums.']);
    else say('The Great Vent', ['Five empty sockets. You have ' + S.pearls + ' of 5 Glow Pearls.',
      'Nothing happens yet. Keep looking.']);
  }
}

// ============================================================ main loop
let last = performance.now(), running = false, combo = 0, comboT = 0, shake = 0, curZone = null;
let saveT = 0;

function step(now) {
  requestAnimationFrame(step);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!running) { renderer.render(scene, camera); return; }

  const paused = ui.modal.style.display === 'grid';
  S.playtime += dt;

  // ---- input vector
  let ix = 0, iz = 0;
  if (!paused && !dlg) {
    if (keys.KeyW || keys.ArrowUp) iz -= 1;
    if (keys.KeyS || keys.ArrowDown) iz += 1;
    if (keys.KeyA || keys.ArrowLeft) ix -= 1;
    if (keys.KeyD || keys.ArrowRight) ix += 1;
    if (stick.active) { ix += stick.dx; iz += stick.dy; }
  }
  const mag = Math.hypot(ix, iz);
  if (mag > 1) { ix /= mag; iz /= mag; }

  // ---- movement, relative to the camera
  const cs = Math.cos(camYaw), sn = Math.sin(camYaw);
  let mx = ix * cs - iz * sn, mz = ix * sn + iz * cs;
  const baseSpeed = 12 * (S.items.fins ? 1.35 : 1);
  P.dashCd -= dt; P.dashT -= dt;
  if (!paused && !dlg && (keys.ShiftLeft || keys.ShiftRight || dashQueued) && S.unlocks.dash && P.dashCd <= 0) {
    P.dashT = 0.24; P.dashCd = 1.1; A.sfxDash(); shake = 0.25;
    burst(player.position.clone().setY(player.position.y + .6), 0xbfefff, 10, .8);
  }
  dashQueued = false;
  const spd = P.dashT > 0 ? 30 : baseSpeed;
  if (mag > 0.08 || P.dashT > 0) {
    const dirLen = Math.hypot(mx, mz) || 1;
    if (P.dashT > 0 && mag < 0.08) { mx = -Math.sin(P.yaw); mz = -Math.cos(P.yaw); }
    P.x += (mx / dirLen) * spd * dt;
    P.z += (mz / dirLen) * spd * dt;
    P.yaw = Math.atan2(-mx, -mz);
    P.speed = spd;
  } else P.speed = 0;

  // ---- jump + gravity
  const canJump = !paused && !dlg;
  if (canJump && (keys.Space || jumpQueued) && !P.airborne) {
    P.vy = S.items.floaty ? 17 : 13.5;
    P.airborne = true; A.sfxJump();
  }
  jumpQueued = false;
  if (P.airborne || P.y > 0) {
    P.vy -= 30 * dt;
    P.y += P.vy * dt;
    if (P.y <= 0) { P.y = 0; P.vy = 0; if (P.airborne) { A.sfxLand(); P.squash = 0.16; shake = 0.12; } P.airborne = false; }
  }
  P.squash = Math.max(0, P.squash - dt);

  // ---- collide + bounds
  for (const c of world.colliders) {
    const dx = P.x - c.x, dz = P.z - c.z, d = Math.hypot(dx, dz), min = c.r + 1.0;
    if (d < min && d > 0.0001) { P.x = c.x + dx / d * min; P.z = c.z + dz / d * min; }
  }
  const bx = clamp(P.x, BOUNDS.minX, BOUNDS.maxX), bz = clamp(P.z, BOUNDS.minZ, BOUNDS.maxZ);
  if (bx !== P.x || bz !== P.z) { P.x = bx; P.z = bz; }

  const gy = groundHeight(P.x, P.z);
  player.position.set(P.x, gy + P.y, P.z);
  player.rotation.y = P.yaw;
  player.userData.anim(dt, { speed: P.speed, airborne: P.airborne && P.vy > 1, y: P.y, squash: P.squash > 0 });
  lantern.position.set(P.x, gy + 3, P.z);

  // ---- zone + goto checks
  const z = zoneAt(P.x, P.z);
  if (z && z !== curZone) {
    curZone = z;
    showZone(z);
    if (!S.visited[z.id]) { S.visited[z.id] = 1; addXP(15); toast('Discovered <b>' + z.name + '</b>', true); save(); }
  } else if (!z) curZone = null;
  onGoto(P.x, P.z);
  pollAutoStart();

  // ---- collectibles
  const magnetR = S.items.magnet ? 8 : 3.2;
  comboT -= dt;
  if (comboT <= 0 && combo > 0) { combo = 0; ui.combo.classList.remove('on'); }
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    const m = it.mesh;
    if (m.visible === false) {
      if (now / 1000 > it.respawnAt) { m.visible = true; it.taken = false; }
      continue;
    }
    it.ph += dt;
    m.position.y = it.base + Math.sin(it.ph * 2) * 0.22;
    m.rotation.y += dt * (it.tag === 'friend' ? 0.4 : 1.6);
    const dx = P.x - it.x, dz = P.z - it.z;
    let d = Math.hypot(dx, dz);
    if (d < magnetR && d > 1.1 && (it.tag === 'blubble' || it.tag === 'goldcoin')) {
      const k = dt * 9 * (1 - d / magnetR + 0.4);
      it.x += dx * k; it.z += dz * k;
      m.position.x = it.x; m.position.z = it.z;
      d = Math.hypot(P.x - it.x, P.z - it.z);
    }
    if (d < 1.5 && Math.abs(P.y - (m.position.y - groundHeight(it.x, it.z))) < 3.5) pickUp(it, i);
  }

  // ---- vault run timer
  if (vault.on) {
    vault.t -= dt;
    vault.el.innerHTML = Math.ceil(vault.t) + 's &nbsp; <span style="color:#fff">' + vault.got + '/25</span>';
    if (vault.got >= 25) endVaultRun(true);
    else if (vault.t <= 0) endVaultRun(false);
  }

  // ---- waypoint arrow
  const wt = waypointTarget();
  if (wt) {
    arrow.visible = true;
    arrow.position.set(P.x, gy + P.y + 3.4 + Math.sin(now / 300) * 0.18, P.z);
    const a = Math.atan2(wt.x - P.x, wt.z - P.z);
    arrow.rotation.set(0, a, 0);
    arrow.children[0].rotation.set(Math.PI / 2, 0, 0);
    const far = Math.hypot(wt.x - P.x, wt.z - P.z) > 8;
    arrow.visible = far;
  } else arrow.visible = false;

  // ---- nearest interactable
  let best = null, bd = 5.2;
  for (const n of npcs) {
    const d = Math.hypot(P.x - n.x, P.z - n.z);
    if (d < bd) { bd = d; best = { kind: 'npc', npc: n, label: 'Talk to ' + n.def.name }; }
  }
  // The vent has its own (larger) reach: its collider holds the player ~8.5
  // units out, well beyond the NPC search radius, so it must not be compared
  // against `bd` unless an NPC actually won that search.
  const dv = Math.hypot(P.x - 0, P.z - 58);
  if (dv < 11 && (!best || dv < bd)) best = { kind: 'vent', label: S.pearls >= 5 && !S.flags.lit ? 'LIGHT THE VENT!' : 'Look at the Vent' };
  near = best;
  if (near && !dlg && !paused) {
    ui.prompt.style.display = 'flex';
    ui.promptTxt.textContent = near.label;
    ui.tAct.style.display = isTouch ? 'grid' : 'none';
  } else {
    ui.prompt.style.display = 'none';
    ui.tAct.style.display = 'none';
  }

  updateFinale(dt);

  // ---- particles
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i];
    b.life -= dt;
    if (b.life <= 0) { b.m.visible = false; bursts.splice(i, 1); continue; }
    b.vy -= 22 * dt;
    b.m.position.x += b.vx * dt; b.m.position.y += b.vy * dt; b.m.position.z += b.vz * dt;
    b.m.scale.setScalar(b.life);
  }

  // ---- camera
  // Pull the camera in when the spot behind the player is inside something,
  // otherwise it ends up looking at the inside of a building.
  let camDist = 15;
  for (; camDist > 4.5; camDist -= 1.4) {
    const cx = P.x + Math.sin(camYaw) * camDist, cz = P.z + Math.cos(camYaw) * camDist;
    if (!bigColliders.some((c) => Math.hypot(cx - c.x, cz - c.z) < c.r + 1.2)) break;
  }
  const camH = 7.5;
  const tx = P.x + Math.sin(camYaw) * camDist;
  const tz = P.z + Math.cos(camYaw) * camDist;
  const ty = gy + P.y + camH;
  camera.position.lerp(_camTarget.set(tx, ty, tz), 1 - Math.pow(0.0015, dt));
  shake = Math.max(0, shake - dt);
  if (shake > 0) {
    camera.position.x += (Math.random() - .5) * shake * 2;
    camera.position.y += (Math.random() - .5) * shake * 2;
  }
  camera.lookAt(P.x, gy + P.y + 1.6, P.z);

  // ---- billboards + world ambience
  for (const b of billboards) b.quaternion.copy(camera.quaternion);
  world.update(dt);

  // The Tangle is genuinely dark, which is the entire point of the lantern.
  const inMaze = curZone && curZone.id === 'maze';
  const wantHemi = S.flags.lit ? 1.35 : inMaze ? (S.items.lantern ? 0.55 : 0.16) : 0.85;
  const wantSun = inMaze ? (S.items.lantern ? 0.35 : 0.06) : 0.9;
  const wantFog = inMaze ? 0.030 : 0.0095;
  hemi.intensity += (wantHemi - hemi.intensity) * Math.min(1, dt * 1.6);
  sun.intensity += (wantSun - sun.intensity) * Math.min(1, dt * 1.6);
  scene.fog.density += (wantFog - scene.fog.density) * Math.min(1, dt * 1.6);

  // warm the water up once the Vent is lit
  if (S.flags.lit) {
    scene.fog.color.lerp(FOG_WARM, dt * 0.4);
    scene.background.lerp(FOG_WARM, dt * 0.4);
  }

  if (zoneTimer > 0) { zoneTimer -= dt; if (zoneTimer <= 0) ui.zoneCard.classList.remove('on'); }
  saveT += dt; if (saveT > 20) { saveT = 0; save(); }

  renderer.render(scene, camera);
}

function pickUp(it, idx) {
  const wp = it.mesh.position.clone();
  if (it.tag === 'blubble' || it.tag === 'goldcoin') {
    combo++; comboT = 2.6;
    const bonus = Math.floor(combo / 5);
    const val = (ITEM_STYLE[it.tag].value) + bonus;
    addCoins(val); addXP(ITEM_STYLE[it.tag].xp);
    A.sfxPickup(combo);
    burst(wp, it.tag === 'goldcoin' ? 0xffc93c : 0x7fe0ff, 6, .7);
    if (combo >= 3) {
      ui.combo.classList.add('on');
      ui.combo.innerHTML = combo + 'x COMBO!' + (bonus ? '<br><span style="font-size:18px">+' + bonus + ' bonus</span>' : '');
    }
    if (it.tag === 'goldcoin') { vault.got++; removeItem(it); return; }
    it.mesh.visible = false; it.taken = true;
    it.respawnAt = performance.now() / 1000 + 80;
    onCollect('blubble');
    return;
  }
  // one-off items
  A.sfxCoin();
  burst(wp, 0xffe08a, 18, 1.2);
  shake = 0.16;
  if (it.id) S.taken[it.id] = 1;
  const NAMES = {
    crate: 'a lost crate', switch: 'a Glow Anemone', pearl2: 'the Glow Pearl',
    luckycoin: 'the Lucky Coin', gift_rock: 'the Softest Rock', friend: 'a lost baby blobfish',
  };
  toast('Found <b>' + (NAMES[it.tag] || it.tag) + '</b>!', true);
  if (it.tag === 'luckycoin') S.items.luckycoin = 1;
  if (it.tag === 'gift_rock') S.items.gift_rock = 1;
  removeItem(it);
  onCollect(it.tag);
  syncQuestItems();
  save();
}

// ============================================================ boot
function begin() {
  A.initAudio(); A.resumeAudio();
  $('#start').style.display = 'none';
  ui.hud.classList.add('on');
  applyTaken(); applyPerks(); setHat(S.hat);
  pollAutoStart(); syncQuestItems(); refreshHUD();
  P.x = 0; P.z = 14;
  camYaw = 0;
  camera.position.set(0, 14, 32);
  running = true;
  const z = zoneAt(P.x, P.z); if (z) { curZone = z; showZone(z); }
}

$('#btnPlay').onclick = () => {
  S = freshState();
  const n = $('#nameIn').value.trim();
  if (n) S.name = n;
  save(); begin();
};
$('#btnContinue').onclick = () => { begin(); };

if (load()) {
  $('#btnContinue').classList.remove('hidden');
  $('#btnPlay').textContent = 'New Game';
  $('#nameIn').value = S.name;
}
$('#loading').textContent = 'Tip: drag the right side of the screen to look around.';

// Debug handle: lets automated tests drive the game without a keyboard.
window.__blob = { P, step, get save() { return S; }, npcs, items, world, camera, scene, warp: (x, z) => { P.x = x; P.z = z; } };

requestAnimationFrame(step);
