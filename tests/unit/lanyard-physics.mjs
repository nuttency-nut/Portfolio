// Run: node tests/unit/lanyard-physics.mjs (uses the same pinned CDN as the page).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../../src/scripts/pages/home/lanyard.js', import.meta.url), 'utf8');
const response = await fetch(source.match(/from "([^"]+)"/)[1]);
assert.ok(response.ok, 'The pinned Three.js module must be available');
const THREE = await import(`data:text/javascript;base64,${Buffer.from(await response.text()).toString('base64')}`);
const core = new Function('THREE',
  source.slice(source.indexOf('\n') + 1, source.indexOf('/* ---------- component ---------- */')) +
  '\nreturn { createRig, configureRig, resetRig, stepRig, cardLayout, CONFIG, clamp, lerp };'
)(THREE);
globalThis.window = { matchMedia: () => ({ matches: false }) };
let props = core.CONFIG();
const physicsCode = source.slice(source.indexOf('  const physics = () => {'), source.indexOf('  const tick = (now)'));
const physics = new Function('props', 'reducedMotion', 'clamp', 'lerp', 'SEGMENTS', physicsCode + '\nreturn physics();')(
  props, false, core.clamp, core.lerp, 4
);

for (const [width, heightPx] of [[1440, 822], [390, 844], [320, 568]]) {
  window.matchMedia = () => ({ matches: width <= 767 });
  window.innerHeight = heightPx;
  props = core.CONFIG();
  for (const fps of [30, 60, 120]) {
    const layout = core.cardLayout('portrait', props.cornerRadius);
    const viewWidth = width;
    const height = Math.max(layout.height / props.size, layout.width / .72 / (viewWidth / heightPx));
    const length = height * core.lerp(.12, .42, props.strapLength) + .01;
    const rig = core.createRig();
    rig.anchor.set(0, height / 2 + .05, 0);
    core.configureRig(rig, layout, length);
    core.resetRig(rig, layout, true);
    const anchor = rig.anchor.clone();
    const releaseY = rig.body.position.y;
    let lastVelocity = rig.body.velocity.y;
    let fastestFall = 0;
    const rebounds = [];

    for (let i = 0; i < fps * 8; i++) {
      core.stepRig(rig, 1 / fps, physics, i / fps);
      const body = rig.body;
      assert.ok([...body.position.toArray(), ...body.quaternion.toArray()].every(Number.isFinite));
      assert.ok(rig.nodes[0].distanceTo(anchor) < 1e-10, 'The strap anchor must stay fixed');
      fastestFall = Math.min(fastestFall, body.velocity.y);
      if (lastVelocity < 0 && body.velocity.y >= 0) rebounds.push({ time: i / fps, y: body.position.y });
      lastVelocity = body.velocity.y;
      assert.ok(body.position.y - layout.height / 2 > -height / 2, 'The initial recoil must stay on screen');
    }

    assert.ok(fastestFall < -8, 'Gravity must accelerate the released card');
    assert.ok(rebounds.length >= 2, 'The taut strap must catch the fall and rebound');
    assert.ok(rebounds[0].time < .6, 'The drop must be quick rather than a slow slide');
    assert.ok(releaseY - rebounds[0].y > length, 'The card must travel through the slack');
    const settledY = rig.body.position.y;
    assert.ok(Math.abs(rebounds[1].y - settledY) < Math.abs(rebounds[0].y - settledY), 'Recoil must decay');

    // Reduced motion starts already hanging: no release above the viewport.
    core.resetRig(rig, layout, false);
    assert.ok(rig.body.position.y < anchor.y - length);
    console.log(`PASS ${width}x${heightPx}, ${fps} fps: fixed anchor, fast fall, decaying recoil, visible card`);
  }
}
assert.doesNotMatch(source, /root\.position\.y\s*=/, 'The fixed rope must not be translated with the card');
