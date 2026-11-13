// Run: node tests/unit/lanyard-startup.mjs
// Exercise the actual startup code with delayed resources; no browser/GPU needed.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../../src/scripts/pages/home/lanyard.js', import.meta.url), 'utf8');
const response = await fetch(source.match(/from "([^"]+)"/)[1]);
assert.ok(response.ok);
const THREE = await import(`data:text/javascript;base64,${Buffer.from(await response.text()).toString('base64')}`);
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const flush = () => new Promise(setImmediate);

for (const { cached, withLogo } of [
  { cached: false, withLogo: false },
  { cached: true, withLogo: false },
  { cached: false, withLogo: true },
]) {
  const fonts = deferred(), shaders = deferred();
  const decodes = [], renderers = [], drawnImages = [], labels = [], windowEvents = {}, documentEvents = {};
  const frames = new Map();
  let frameId = 0, canvasId = 0;
  const context = () => new Proxy({
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    createLinearGradient: () => ({ addColorStop() {} }),
    drawImage: (image) => drawnImages.push(image),
    fillText: (text) => labels.push(text),
  }, { get: (target, key) => key in target ? target[key] : () => {} });
  const canvas = () => ({
    style: {}, width: 0, height: 0, id: ++canvasId,
    getContext: context,
    setAttribute() {}, addEventListener() {}, remove() {},
    toDataURL() { return `data:image/png;base64,${this.id}`; },
  });
  const container = { clientWidth: 1440, clientHeight: 822, appendChild() {} };
  const document = {
    readyState: cached ? 'complete' : 'loading', hidden: false,
    fonts: { ready: fonts.promise, load: () => fonts.promise },
    createElement: canvas, getElementById: () => container,
    addEventListener: (name, handler) => { documentEvents[name] = handler; },
    removeEventListener() {},
  };
  const window = {
    innerWidth: 1440, devicePixelRatio: 1,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener: (name, handler) => { windowEvents[name] = handler; },
  };
  class Image {
    constructor() { this.width = 1024; this.height = 1536; }
    set src(value) { this.source = value; queueMicrotask(() => this.onload()); }
    decode() {
      if (cached) return Promise.resolve();
      const gate = deferred(); decodes.push(gate); return gate.promise;
    }
  }
  class Renderer {
    constructor() {
      this.domElement = canvas();
      this.capabilities = { getMaxAnisotropy: () => 8 };
      this.uploads = 0; this.compiles = 0; this.renders = [];
      renderers.push(this);
    }
    setClearColor() {} setPixelRatio() {} setSize() {} dispose() {}
    initTexture() { this.uploads++; }
    compileAsync() { this.compiles++; return shaders.promise; }
    render(scene) {
      this.renders.push({ visibility: this.domElement.style.visibility, y: scene.children[0].children[0].position.y });
    }
  }
  class PMREMGenerator {
    fromScene() { return { texture: new THREE.Texture(), dispose() {} }; }
    dispose() {}
  }
  class Observer { observe() {} disconnect() {} }
  const runtime = { ...THREE, WebGLRenderer: Renderer, PMREMGenerator };
  if (cached) { fonts.resolve(); shaders.resolve(); }
  const configuredSource = withLogo ? source : source.replace('backLogoImage: "assets/images/home/lanyard/back-logo.png"', 'backLogoImage: null');
  const body = configuredSource.slice(configuredSource.indexOf('\n') + 1)
    .replace('\ninitLanyard().catch(', '\nconst startup = initLanyard();\nstartup.catch(');
  const startup = new Function('THREE', 'document', 'window', 'Image', 'ResizeObserver', 'IntersectionObserver', 'requestAnimationFrame', 'cancelAnimationFrame',
    body + '\nreturn startup;'
  )(runtime, document, window, Image, Observer, Observer,
    callback => { const id = ++frameId; frames.set(id, callback); return id; },
    id => frames.delete(id));
  const advanceFrame = async () => {
    assert.ok(frames.size, 'A warm-up or animation frame must be scheduled');
    const [id, callback] = frames.entries().next().value;
    frames.delete(id); callback(performance.now()); await flush();
  };

  await flush();
  if (!cached) {
    assert.equal(renderers.length, 0, 'No 3D setup before page and fonts finish');
    windowEvents.load(); await flush();
    assert.equal(renderers.length, 0, 'Page load alone must not bypass font loading');
    fonts.resolve(); await flush();
    const artworkCount = withLogo ? 2 : 1;
    assert.equal(decodes.length, artworkCount);
    assert.equal(renderers.length, 0, 'Decode the portrait before generating the front face');
    decodes[0].resolve(); await flush();
    if (withLogo) {
      assert.equal(renderers.length, 0, 'Wait for the PNG logo before generating the back face');
      decodes[1].resolve(); await flush();
    }
    assert.equal(decodes.length, artworkCount + 3);
    decodes[artworkCount].resolve(); decodes[artworkCount + 1].resolve(); await flush();
    assert.equal(renderers[0].uploads, 0, 'Wait for all three decoded images');
    assert.equal(frames.size, 0, 'Observers and redraws must not start physics');
    decodes[artworkCount + 2].resolve(); await flush();
    assert.equal(renderers[0].uploads, 5, 'Upload both faces, strap and normal maps');
    assert.equal(renderers[0].compiles, 1);
    assert.equal(renderers[0].renders.length, 0, 'Do not render while shaders compile');
    assert.equal(frames.size, 0);
    shaders.resolve(); await flush();
  } else {
    assert.equal(windowEvents.load, undefined, 'Cached pages must not wait for a load event that already fired');
  }

  const renderer = renderers[0];
  assert.ok(drawnImages.some(image => image.source === 'assets/images/home/lanyard/portrait.jpg'), 'Draw the supplied portrait into the card');
  assert.equal(drawnImages.some(image => image.source === 'assets/images/home/lanyard/back-logo.png'), withLogo, 'Draw the optional back logo when configured');
  assert.ok(!labels.includes('YOUR PHOTO'), 'Hide the placeholder label when the portrait loads');
  assert.equal(renderer.renders.length, 1);
  assert.equal(renderer.renders[0].visibility, 'hidden', 'Warm up without flashing an unfinished card');
  await advanceFrame();
  assert.equal(renderer.domElement.style.visibility, 'hidden');
  await advanceFrame();
  const lanyard = await startup;
  assert.equal(renderer.domElement.style.visibility, 'visible');
  assert.equal(renderer.renders.length, 1, 'No physics during the warm-up frames');
  await advanceFrame();
  assert.equal(renderer.renders[1].visibility, 'visible');
  assert.ok(renderer.renders[1].y < renderer.renders[0].y, 'The drop begins only after readiness');
  lanyard.destroy();
  assert.equal(frames.size, 0);
  console.log(`PASS ${cached ? 'cached' : 'cold'} startup${withLogo ? ' with back logo' : ''}: page + fonts + decoded artwork + GPU warm-up before drop`);
}
