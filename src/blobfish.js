import * as THREE from 'three';

// Every character, shop and prop in this game is built out of spheres here.
// No .glb files, no texture downloads, no asset pipeline, nothing to 404.

const SKIN = 0xf6b5a6;
const SKIN_D = 0xd98577;
const CREAM = 0xf7ecd8;

const sphere = new THREE.SphereGeometry(1, 18, 13);
const sphereLo = new THREE.SphereGeometry(1, 10, 8);
const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 16);
const cone = new THREE.ConeGeometry(1, 1, 14);
const torus = new THREE.TorusGeometry(1, 0.1, 6, 20);
const mouthGeo = new THREE.TorusGeometry(1, 0.17, 6, 18, Math.PI);

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + '|' + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshPhongMaterial({
      color, shininess: opts.shiny ?? 26, specular: opts.spec ?? 0x445055,
      flatShading: !!opts.flat, transparent: !!opts.opacity, opacity: opts.opacity ?? 1,
      emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.ei ?? 1, side: opts.side ?? THREE.FrontSide,
    }));
  }
  return matCache.get(key);
}

function part(geo, color, pos, scale, rot, opts) {
  const m = new THREE.Mesh(geo, mat(color, opts));
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (scale) m.scale.set(scale[0], scale[1], scale[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  return m;
}
export { part, sphere, sphereLo, box, cyl, cone, torus };

// ---------------------------------------------------------------- hats
export function makeHat(kind) {
  const g = new THREE.Group();
  switch (kind) {
    case 'crown': {
      g.add(part(cyl, 0xffc93c, [0, .18, 0], [.46, .36, .46], null, { shiny: 90, spec: 0xffee99 }));
      g.add(part(sphere, 0x8e1d3d, [0, .40, 0], [.42, .26, .42]));      // velvet cushion
      for (let i = 0; i < 6; i++) {                                      // spikes + jewels
        const a = i / 6 * Math.PI * 2;
        g.add(part(cone, 0xffc93c, [Math.cos(a) * .42, .48, Math.sin(a) * .42], [.07, .3, .07], null, { shiny: 90 }));
        g.add(part(sphere, i % 2 ? 0x2fbf5f : 0xd8203c, [Math.cos(a) * .47, .2, Math.sin(a) * .47], [.055, .055, .055], null, { shiny: 100 }));
      }
      g.add(part(sphere, 0xffc93c, [0, .68, 0], [.09, .09, .09], null, { shiny: 90 }));
      break;
    }
    case 'tophat': {
      g.add(part(cyl, 0x2b2b30, [0, .06, 0], [.62, .05, .62], null, { shiny: 60 }));  // brim
      g.add(part(cyl, 0x2b2b30, [0, .42, 0], [.38, .72, .38], null, { shiny: 60 }));  // stack
      g.add(part(cyl, 0xc0202c, [0, .22, 0], [.395, .16, .395], null, { shiny: 40 })); // band
      break;
    }
    case 'woolly': {
      g.add(part(sphere, 0xe0503f, [0, .16, 0], [.5, .40, .5]));
      g.add(part(cyl, 0xf7ecd8, [0, .05, 0], [.52, .16, .52]));
      g.add(part(sphere, 0xf7ecd8, [0, .56, 0], [.14, .14, .14]));
      break;
    }
    case 'party': {
      g.add(part(cone, 0x35c9e8, [0, .42, 0], [.34, .84, .34], null, { flat: true }));
      g.add(part(sphere, 0xffc93c, [0, .86, 0], [.11, .11, .11]));
      break;
    }
    case 'chef': {
      g.add(part(cyl, CREAM, [0, .12, 0], [.42, .24, .42]));
      g.add(part(sphere, CREAM, [0, .42, 0], [.52, .32, .52]));
      break;
    }
    case 'pirate': {
      g.add(part(sphere, 0x1c1c22, [0, .16, 0], [.5, .3, .5]));
      g.add(part(box, 0x1c1c22, [0, .2, 0], [1.25, .1, .62], [0, 0, 0]));
      g.add(part(sphere, CREAM, [0, .34, .28], [.1, .12, .04]));
      break;
    }
    case 'flower': {
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2;
        g.add(part(sphere, 0xff7fb0, [Math.cos(a) * .2, .18, Math.sin(a) * .2], [.14, .06, .14]));
      }
      g.add(part(sphere, 0xffe14d, [0, .2, 0], [.1, .07, .1]));
      break;
    }
    case 'snorkel': {
      g.add(part(torus, 0x38b6ff, [0, .1, .18], [.34, .34, .34], [Math.PI / 2.3, 0, 0], { shiny: 80 }));
      g.add(part(cyl, 0xffc93c, [.3, .3, .05], [.05, .8, .05], [0, 0, .18]));
      break;
    }
  }
  return g;
}

export const HATS = ['crown', 'tophat', 'woolly', 'party', 'chef', 'pirate', 'flower', 'snorkel'];

// ---------------------------------------------------------------- blobfish
/**
 * Builds a blobfish. Returns a Group with .anim(dt, state) for squash-and-stretch.
 * Every NPC in the game is this function with different numbers.
 */
export function makeBlobfish(o = {}) {
  const {
    color = SKIN, size = 1, brows = false, angry = false, happy = false,
    hat = null, eyeSize = 1, tiny = false,
  } = o;
  const root = new THREE.Group();
  const body = new THREE.Group();           // squashed independently of root
  root.add(body);
  const lo = tiny;
  const S = lo ? sphereLo : sphere;

  // main blob - wide, low, droopy
  const blob = part(S, color, [0, .70, 0], [1.16, .74, 1.02], null, { shiny: 48, spec: 0x88a0a8 });
  body.add(blob);
  // The droop reads as heavy jowls at the sides, not as a brow over the face -
  // a forward-projecting brow just swallows the nose and mouth.
  for (const s of [-1, 1])
    body.add(part(S, color, [s * .62, .30, .52], [.40, .30, .42], null, { shiny: 45 }));
  // the big droopy nose
  body.add(part(S, color, [0, .56, .92], [.22, .32, .26], [.34, 0, 0], { shiny: 55 }));

  // eyes
  const eyeGroup = new THREE.Group(); body.add(eyeGroup);
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(s * .61, 1.00, .76);
    const white = part(S, 0xf5eddb, [0, 0, 0], [.26 * eyeSize, .28 * eyeSize, .26 * eyeSize], null, { shiny: 90, spec: 0xffffff });
    const pupil = part(S, 0x0a0a0c, [s * .04, -.03, .19 * eyeSize], [.12 * eyeSize, .13 * eyeSize, .09 * eyeSize], null, { shiny: 100, spec: 0xffffff });
    e.add(white); e.add(pupil);
    e.userData.white = white; e.userData.pupil = pupil;
    eyeGroup.add(e); eyes.push(e);
    if (brows) {
      const b = part(box, 0x241d1a, [s * .61, 1.30, .72], [.36, .05, .08], [0, 0, s * (angry ? -.55 : .2)]);
      body.add(b);
    }
  }

  // mouth - a half-ring arc. Default arc opens downward (a frown, as nature
  // intended for a blobfish); flip it 180 degrees for a smile.
  const mouth = part(mouthGeo, 0xb0574a, [0, happy ? .20 : .28, .88],
    [.40, .26, .34], [0, 0, happy ? Math.PI : 0], { shiny: 14 });
  body.add(mouth);

  // side fins ("ears")
  for (const s of [-1, 1]) {
    body.add(part(S, color, [s * 1.12, .58, .10], [.32, .11, .20], [0, 0, s * -.35], { shiny: 40 }));
  }
  // little front feet
  for (const s of [-1, 1]) {
    body.add(part(S, color, [s * .34, .11, .66], [.24, .11, .30], null, { shiny: 40 }));
  }
  // tail
  body.add(part(cone, color, [0, .62, -1.02], [.34, .5, .28], [-Math.PI / 2, 0, 0], { shiny: 40 }));

  // hat anchor
  const hatAnchor = new THREE.Group();
  hatAnchor.position.set(0, 1.38, .02);
  body.add(hatAnchor);
  if (hat) hatAnchor.add(makeHat(hat));

  // fake contact shadow - far cheaper than a shadow map on a tablet
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.15, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .26, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  root.add(shadow);

  root.scale.setScalar(size);

  let t = Math.random() * 10, blinkT = 1 + Math.random() * 3;
  root.userData.hatAnchor = hatAnchor;
  root.userData.setHat = (k) => {
    hatAnchor.clear();
    if (k) hatAnchor.add(makeHat(k));
  };
  /** state: {speed, airborne, y (height above ground), squash} */
  root.userData.anim = (dt, st = {}) => {
    t += dt;
    const spd = st.speed || 0;
    // idle breathing + walk waddle
    const breathe = Math.sin(t * 2.2) * .035;
    const bounce = spd > .1 ? Math.abs(Math.sin(t * 9)) * .09 * Math.min(spd / 6, 1) : 0;
    let sx = 1 + breathe * .5 + bounce * .35, sy = 1 - breathe - bounce * .55;
    if (st.airborne) { sy = 1.18; sx = 0.90; }           // stretch in the air
    if (st.squash) { sy = 0.70; sx = 1.22; }             // splat on landing
    body.scale.set(sx, sy, sx);
    body.position.y = bounce * .25;
    body.rotation.z = spd > .1 ? Math.sin(t * 9) * .06 : Math.sin(t * 1.6) * .015;
    // shadow shrinks as you rise
    const h = st.y || 0;
    const k = Math.max(.25, 1 - h * .12);
    shadow.scale.setScalar(k);
    shadow.material.opacity = .26 * k;
    shadow.position.y = -h + .03;
    // blinking
    blinkT -= dt;
    if (blinkT < 0) {
      const b = blinkT > -0.09 ? .12 : 1;
      for (const e of eyes) e.userData.white.scale.y = .28 * eyeSize * b;
      if (blinkT < -0.09) blinkT = 1.6 + Math.random() * 4;
    }
  };
  return root;
}

// A blobfish-shaped building, straight off the reference drawing.
export function makeShopBuilding(label = 'Shop', color = SKIN) {
  const g = new THREE.Group();
  const b = makeBlobfish({ color, size: 3.4 });
  b.userData.anim(0, {});
  g.add(b);
  // dark doorway punched into the face
  const door = new THREE.Group();
  door.position.set(0, 0, 3.25);
  const arch = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.95, 1.5, 4, 14),
    mat(0x050a0c, { shiny: 0 })
  );
  arch.position.y = 1.5; arch.scale.z = 0.5;
  door.add(arch);
  const frame = part(torus, SKIN_D, [0, 1.5, -.1], [1.12, 1.4, 1.12], null, { shiny: 40 });
  frame.scale.set(1.12, 1.4, .5);
  door.add(frame);
  door.add(part(box, SKIN_D, [0, .12, .1], [2.9, .24, .9]));   // step
  g.add(door);
  // sign on posts
  const sign = new THREE.Group();
  sign.position.set(0, 5.4, 1.2);
  sign.add(part(box, 0xe6c9a4, [0, 0, 0], [4.2, 1.05, .28], null, { shiny: 8 }));
  for (const s of [-1, 1]) sign.add(part(cyl, SKIN_D, [s * 1.5, -.9, 0], [.14, 1.8, .14]));
  sign.add(makeTextPlate(label, 0xf0a293));
  g.add(sign);
  return g;
}

// Text as a canvas texture - the one place a canvas beats geometry.
export function makeTextPlate(text, color = 0xffffff, w = 3.9, h = 0.9) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 512, 128);
  // shrink to fit rather than letting a long name run off the canvas
  let px = 92;
  do { x.font = '900 ' + px + 'px "Baloo 2", "Trebuchet MS", sans-serif'; px -= 4; }
  while (px > 24 && x.measureText(text).width > 470);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 14; x.strokeStyle = 'rgba(90,40,30,.55)';
  x.strokeText(text, 256, 68);
  x.fillStyle = '#' + color.toString(16).padStart(6, '0');
  x.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.position.z = 0.16;
  return m;
}

// Floating name tag above an NPC, always facing the camera.
export function makeNameTag(text) {
  const p = makeTextPlate(text, 0xfff4e6, 2.6, 0.62);
  p.position.z = 0;
  p.userData.billboard = true;
  return p;
}

export { SKIN, SKIN_D, CREAM };
