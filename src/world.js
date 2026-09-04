import * as THREE from 'three';
import { part, sphere, sphereLo, box, cyl, cone, torus, mat, makeShopBuilding, makeTextPlate, SKIN_D } from './blobfish.js';

// Gentle dunes. Kept small on purpose: a near-flat floor means navigation and
// collision stay trivial, which is what a 6-year-old on a touchscreen wants.
export function groundHeight(x, z) {
  return Math.sin(x * 0.045) * Math.cos(z * 0.037) * 1.3 + Math.sin(z * 0.088) * 0.5;
}

export const BOUNDS = { minX: -125, maxX: 125, minZ: -190, maxZ: 80 };

export const ZONES = [
  { id: 'bay',    name: 'Wobble Bay',      sub: 'home of the squishy',   x: 0,   z: 0,    r: 46 },
  { id: 'vent',   name: 'The Great Vent',  sub: 'cold and quiet',        x: 0,   z: 58,   r: 26 },
  { id: 'market', name: 'Blobton Market',  sub: 'everything has a price',x: 0,   z: -72,  r: 36 },
  { id: 'maze',   name: 'The Kelp Tangle', sub: 'dark and whispery',     x: -80, z: -38,  r: 38 },
  { id: 'vault',  name: 'Pennysquish Plaza', sub: 'strictly no refunds', x: 82,  z: -48,  r: 34 },
  { id: 'castle', name: "The Grump's Keep",sub: 'mind the moat',         x: 0,   z: -150, r: 40 },
];

export function zoneAt(x, z) {
  let best = null, bd = Infinity;
  for (const zo of ZONES) {
    const d = Math.hypot(x - zo.x, z - zo.z);
    if (d < zo.r && d < bd) { bd = d; best = zo; }
  }
  return best;
}

function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export function buildWorld(scene) {
  const colliders = [];   // {x,z,r} - the player is pushed out of these
  const swayers = [];     // kelp clumps that wobble
  const g = new THREE.Group();
  scene.add(g);

  // ---------------------------------------------------------- sea floor
  const seg = 120;
  const geo = new THREE.PlaneGeometry(280, 300, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const cSand = new THREE.Color(0xd9c39a), cDeep = new THREE.Color(0x2f6f70), cMaze = new THREE.Color(0x2c5a46);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i) - 55;
    pos.setZ(i, z);
    pos.setY(i, groundHeight(x, z));
    // tint by zone so each area reads differently without any textures
    const dMaze = Math.hypot(x + 80, z + 38), dCastle = Math.hypot(x, z + 150);
    tmp.copy(cSand);
    if (dMaze < 55) tmp.lerp(cMaze, 1 - dMaze / 55);
    if (dCastle < 60) tmp.lerp(cDeep, (1 - dCastle / 60) * 0.8);
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const floor = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  g.add(floor);

  // ---------------------------------------------------------- scatter props
  const r = rng(1337);
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const rocks = new THREE.InstancedMesh(rockGeo, mat(0x8a9490, { flat: true, shiny: 6 }), 170);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 170; i++) {
    const x = -120 + r() * 240, z = -185 + r() * 260;
    const s = .6 + r() * 2.6;
    dummy.position.set(x, groundHeight(x, z) + s * .35, z);
    dummy.rotation.set(r() * 3, r() * 3, r() * 3);
    dummy.scale.set(s, s * .8, s * 1.1);
    dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix);
    if (s > 2) colliders.push({ x, z, r: s * .85 });
  }
  g.add(rocks);

  // coral - colour splashes
  const coralCols = [0xff7fb0, 0xffb347, 0x8be0ff, 0xb98bff, 0x6ee7a0];
  coralCols.forEach((c, ci) => {
    const im = new THREE.InstancedMesh(new THREE.ConeGeometry(0.5, 2.2, 6), mat(c, { flat: true, shiny: 15 }), 42);
    for (let i = 0; i < 42; i++) {
      const x = -115 + r() * 230, z = -180 + r() * 250;
      const s = .5 + r() * 1.4;
      dummy.position.set(x, groundHeight(x, z) + 1.1 * s, z);
      dummy.rotation.set((r() - .5) * .3, r() * 6, (r() - .5) * .3);
      dummy.scale.setScalar(s);
      dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
    }
    g.add(im);
  });

  // ---------------------------------------------------------- kelp clumps
  const stalkGeo = new THREE.CylinderGeometry(0.09, 0.22, 7, 5, 1);
  stalkGeo.translate(0, 3.5, 0);
  const leafGeo = new THREE.SphereGeometry(0.5, 6, 4);
  function kelpClump(cx, cz, n, spread, tall) {
    const clump = new THREE.Group();
    clump.position.set(cx, groundHeight(cx, cz), cz);
    for (let i = 0; i < n; i++) {
      const ox = (r() - .5) * spread, oz = (r() - .5) * spread;
      const h = tall * (.7 + r() * .7);
      const s = new THREE.Mesh(stalkGeo, mat(0x3f8a53, { shiny: 8 }));
      s.position.set(ox, 0, oz);
      s.scale.set(.8 + r() * .5, h / 7, .8 + r() * .5);
      s.rotation.y = r() * 6;
      clump.add(s);
      for (let k = 0; k < 2; k++) {
        const l = new THREE.Mesh(leafGeo, mat(k % 2 ? 0x4fae63 : 0x36754a, { shiny: 8 }));
        l.position.set(ox + (r() - .5) * .8, h * (.4 + k * .2), oz + (r() - .5) * .8);
        l.scale.set(1.4, .5, .9);
        clump.add(l);
      }
    }
    clump.userData.phase = r() * 6;
    swayers.push(clump);
    g.add(clump);
    return clump;
  }
  // scattered kelp
  for (let i = 0; i < 15; i++) kelpClump(-115 + r() * 230, -180 + r() * 250, 4, 6, 6);
  // the maze: a dense grid with gaps you have to weave through
  for (let i = 0; i < 30; i++) {
    const a = r() * Math.PI * 2, d = r() * 34;
    const x = -80 + Math.cos(a) * d, z = -38 + Math.sin(a) * d;
    kelpClump(x, z, 5, 5, 11);
    colliders.push({ x, z, r: 3.0 });
  }

  // ---------------------------------------------------------- boundary reef
  for (let i = 0; i < 64; i++) {
    const t = i / 64 * Math.PI * 2;
    const x = Math.cos(t) * 150, z = -55 + Math.sin(t) * 165;
    const m = part(sphereLo, 0x53625f, [x, groundHeight(x, z) + 4, z], [16, 14, 16], [r(), r() * 6, r()], { flat: true, shiny: 4 });
    g.add(m);
  }

  // ---------------------------------------------------------- landmarks
  const marks = {};

  // --- The Great Vent (main story object) - 5 empty pearl sockets
  {
    const v = new THREE.Group();
    v.position.set(0, groundHeight(0, 58), 58);
    v.add(part(cyl, 0x6b7d80, [0, 1.2, 0], [7, 2.4, 7], null, { flat: true, shiny: 10 }));
    v.add(part(cyl, 0x4d5c60, [0, 3.8, 0], [5.2, 3.2, 5.2], null, { flat: true, shiny: 10 }));
    v.add(part(cyl, 0x0a1416, [0, 5.4, 0], [4.2, .5, 4.2], null, { shiny: 0 }));
    const sockets = [];
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 - Math.PI / 2;
      const s = new THREE.Group();
      s.position.set(Math.cos(a) * 6.2, 2.7, Math.sin(a) * 6.2);
      s.add(part(cyl, 0x8d9ea0, [0, 0, 0], [.75, .5, .75], null, { flat: true }));
      const orb = part(sphere, 0x3a4548, [0, .55, 0], [.5, .5, .5], null, { shiny: 90, emissive: 0x000000 });
      s.add(orb); s.userData.orb = orb;
      v.add(s); sockets.push(s);
    }
    const glow = part(cyl, 0x9fe8ff, [0, 14, 0], [3.4, 24, 3.4], null, { opacity: .28, shiny: 0, emissive: 0x9fe8ff });
    glow.material.depthWrite = false;
    glow.material.blending = THREE.AdditiveBlending;
    glow.visible = false;
    v.add(glow);
    v.userData.sockets = sockets; v.userData.glow = glow;
    g.add(v);
    marks.vent = v;
    colliders.push({ x: 0, z: 58, r: 7.5 });
  }

  // --- Blobton Market: the blobfish-shaped shop plus stalls
  {
    const shop = makeShopBuilding('Shop');
    shop.position.set(-10, groundHeight(-10, -72), -72);
    shop.rotation.y = 0.35;
    g.add(shop);
    marks.shop = shop;
    colliders.push({ x: -10, z: -74, r: 5.2 });

    // market stalls: stripey awnings on posts
    const stalls = [[10, -66, 0xff7f6e], [16, -78, 0x7fd0ff], [2, -84, 0xffd166]];
    for (const [x, z, c] of stalls) {
      const st = new THREE.Group();
      st.position.set(x, groundHeight(x, z), z);
      st.add(part(box, 0xc79a6b, [0, 1.2, 0], [4.4, .4, 2.4], null, { shiny: 6 }));
      for (const s of [-1, 1]) for (const s2 of [-1, 1])
        st.add(part(cyl, 0x8a6a45, [s * 2, .6, s2 * 1], [.14, 1.2, .14]));
      for (const s of [-1, 1]) for (const s2 of [-1, 1])
        st.add(part(cyl, 0x8a6a45, [s * 2, 2.2, s2 * 1], [.14, 2, .14]));
      st.add(part(box, c, [0, 3.4, 0], [5, .3, 3.2], null, { shiny: 20 }));
      st.add(part(box, 0xf7ecd8, [0, 3.4, 1.7], [5, .3, .3]));
      for (let i = 0; i < 5; i++)
        st.add(part(sphere, [0xff9ab5, 0x9ee8a0, 0xffe08a][i % 3], [-1.6 + i * .8, 1.6, 0], [.35, .3, .35]));
      g.add(st);
      colliders.push({ x, z, r: 2.6 });
    }
  }

  // --- Pennysquish Plaza: the vault
  {
    const v = new THREE.Group();
    v.position.set(82, groundHeight(82, -48), -48);
    v.add(part(box, 0x1d3f36, [0, 4, 0], [16, 8, 12], null, { shiny: 40, spec: 0x88aa99 }));
    v.add(part(box, 0x27553f, [0, 8.4, 0], [17.5, 1, 13.5], null, { shiny: 40 }));
    for (const s of [-1, 1]) v.add(part(cyl, 0xf7ecd8, [s * 5.6, 4.6, 6.4], [.9, 4.6, .9], null, { shiny: 30 }));
    // big round vault door
    const door = part(cyl, 0xffc93c, [0, 3.4, 6.2], [3.2, .5, 3.2], [Math.PI / 2, 0, 0], { shiny: 100, spec: 0xfff0a0 });
    v.add(door);
    v.add(part(torus, 0xd99a00, [0, 3.4, 6.5], [3.5, 3.5, 3.5], null, { shiny: 90 }));
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      v.add(part(box, 0xd99a00, [Math.cos(a) * 1.9, 3.4 + Math.sin(a) * 1.9, 6.6], [.9, .22, .22], [0, 0, a], { shiny: 90 }));
    }
    const dollar = makeTextPlate('$$', 0xffc93c, 4, 4);
    dollar.position.set(0, 10.4, 6.2);
    v.add(dollar);
    g.add(v);
    marks.vault = v;
    colliders.push({ x: 82, z: -48, r: 9.5 });
  }

  // --- The Grump's Keep
  {
    const c = new THREE.Group();
    c.position.set(0, groundHeight(0, -150), -150);
    c.add(part(box, 0x6f7f92, [0, 5, 0], [26, 10, 20], null, { flat: true, shiny: 14 }));
    for (const s of [-1, 1]) {
      const t = new THREE.Group(); t.position.set(s * 13, 0, 8);
      t.add(part(cyl, 0x7d8ea2, [0, 8, 0], [3.6, 16, 3.6], null, { flat: true, shiny: 14 }));
      t.add(part(cone, 0xc0202c, [0, 18.5, 0], [4.4, 5, 4.4], null, { flat: true, shiny: 20 }));
      c.add(t);
      colliders.push({ x: s * 13, z: -142, r: 4 });
    }
    // battlements
    for (let i = -6; i <= 6; i++) c.add(part(box, 0x7d8ea2, [i * 2, 10.6, 10], [1.2, 1.6, 1.4], null, { flat: true }));
    // gold trim + a giant crown on the roof
    c.add(part(box, 0xffc93c, [0, 10.2, 10.2], [26, .5, .6], null, { shiny: 90 }));
    const crown = new THREE.Group(); crown.position.set(0, 12, 0); crown.scale.setScalar(4);
    crown.add(part(cyl, 0xffc93c, [0, .4, 0], [1, .8, 1], null, { shiny: 90 }));
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      crown.add(part(cone, 0xffc93c, [Math.cos(a) * .92, 1.1, Math.sin(a) * .92], [.16, .7, .16], null, { shiny: 90 }));
    }
    c.add(crown);
    // doorway
    c.add(part(box, 0x140f0c, [0, 3, 10.3], [5, 6, .6]));
    c.add(part(torus, 0xffc93c, [0, 6, 10.4], [2.6, 2.6, 2.6], null, { shiny: 90 }));
    g.add(c);
    marks.castle = c;
    for (const cx of [-9, 0, 9]) colliders.push({ x: cx, z: -152, r: 8 });
  }

  // ---------------------------------------------------------- ambience
  // rising bubbles
  const N = 260;
  const bp = new Float32Array(N * 3), bs = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    bp[i * 3] = -120 + r() * 240; bp[i * 3 + 1] = r() * 40; bp[i * 3 + 2] = -180 + r() * 250;
    bs[i] = .3 + r() * 1.1;
  }
  const bGeo = new THREE.BufferGeometry();
  bGeo.setAttribute('position', new THREE.BufferAttribute(bp, 3));
  bGeo.setAttribute('size', new THREE.BufferAttribute(bs, 1));
  const bubbles = new THREE.Points(bGeo, new THREE.PointsMaterial({
    color: 0xd8f6ff, size: 1.0, transparent: true, opacity: .5,
    map: dotTexture(), depthWrite: false, sizeAttenuation: true,
  }));
  g.add(bubbles);

  // sun shafts
  for (let i = 0; i < 7; i++) {
    const x = -90 + r() * 180, z = -160 + r() * 220;
    const shaft = part(cone, 0xbfefff, [x, 26, z], [14, 60, 14], null, { opacity: .05, shiny: 0 });
    shaft.material.depthWrite = false;
    shaft.material.blending = THREE.AdditiveBlending;
    g.add(shaft);
  }

  // drifting jellyfish for life
  const jellies = [];
  for (let i = 0; i < 14; i++) {
    const j = new THREE.Group();
    j.position.set(-100 + r() * 200, 6 + r() * 14, -170 + r() * 240);
    const cap = part(sphere, 0xffa8e0, [0, 0, 0], [1.2, .9, 1.2], null, { opacity: .55, shiny: 70 });
    j.add(cap);
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2;
      j.add(part(cyl, 0xffc9ee, [Math.cos(a) * .5, -1.3, Math.sin(a) * .5], [.07, 2.4, .07], null, { opacity: .45 }));
    }
    j.userData.p = r() * 6; j.userData.baseY = j.position.y;
    jellies.push(j); g.add(j);
  }

  let t = 0;
  function update(dt) {
    t += dt;
    for (const c of swayers) {
      c.rotation.z = Math.sin(t * 0.8 + c.userData.phase) * 0.07;
      c.rotation.x = Math.cos(t * 0.6 + c.userData.phase) * 0.05;
    }
    const a = bGeo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      a[i * 3 + 1] += dt * (1.5 + bs[i] * 2);
      a[i * 3] += Math.sin(t + i) * dt * 0.3;
      if (a[i * 3 + 1] > 42) a[i * 3 + 1] = 0;
    }
    bGeo.attributes.position.needsUpdate = true;
    for (const j of jellies) {
      j.userData.p += dt * 0.7;
      j.position.y = j.userData.baseY + Math.sin(j.userData.p) * 1.6;
      j.position.x += Math.sin(j.userData.p * 0.3) * dt * 1.2;
      j.children[0].scale.set(1.2 + Math.sin(j.userData.p) * .15, .9 - Math.sin(j.userData.p) * .12, 1.2 + Math.sin(j.userData.p) * .15);
    }
  }

  return { group: g, colliders, marks, update };
}

function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const grd = x.createRadialGradient(32, 32, 2, 32, 32, 30);
  grd.addColorStop(0, 'rgba(255,255,255,.95)');
  grd.addColorStop(.55, 'rgba(200,240,255,.45)');
  grd.addColorStop(1, 'rgba(200,240,255,0)');
  x.fillStyle = grd; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
export { dotTexture };
