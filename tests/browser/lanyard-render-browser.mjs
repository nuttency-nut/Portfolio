import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, browserExecutable } from '../helpers/browser.mjs';

const origin = new URL(process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/').origin;
const source = await readFile(new URL('../../src/scripts/pages/home/lanyard.js', import.meta.url), 'utf8');
const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
try {
  for (const depthBits of [24, 16]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(bits => {
      window.__cardSizeWrites = 0;
      for (const property of ['width', 'height']) {
        const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, property);
        Object.defineProperty(HTMLCanvasElement.prototype, property, { ...descriptor, set(value) {
          if (this.classList.contains('lanyard-canvas')) window.__cardSizeWrites++;
          descriptor.set.call(this, value);
        } });
      }
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
        const gl = getContext.call(this, kind, ...args);
        if (gl && kind === 'webgl2' && bits === 16) {
          // Emulate limited mobile depth precision on a desktop test GPU.
          const shaderSource = gl.shaderSource.bind(gl);
          gl.shaderSource = (shader, text) => shaderSource(shader,
            gl.getShaderParameter(shader, gl.SHADER_TYPE) === gl.FRAGMENT_SHADER
              ? text.replace(/}\s*$/, 'gl_FragDepth = floor(gl_FragCoord.z * 65535.0 + 0.5) / 65535.0;\n}') : text);
        }
        return gl;
      };
    }, depthBits);
    // Expose the actual renderer only in the intercepted test response.
    await page.route('**/src/scripts/pages/home/lanyard.js*', route => route.fulfill({ contentType: 'text/javascript', body:
      source.replace('canvas.style.visibility = "visible";', `canvas.style.visibility = "visible";
        window.__cardQA = { renderer, camera, card, rig, bodyMesh, frontMesh, backMesh, render,
          stop: () => { started = false; cancelAnimationFrame(raf); raf = 0; } };`)
    }));
    await page.goto(origin + '/', { waitUntil: 'load' });
    await page.waitForFunction(() => window.__cardQA);
    const results = await page.evaluate(() => {
      const q = window.__cardQA;
      q.stop();
      const gl = q.renderer.getContext(), width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
      const snapshot = () => {
        q.render();
        const bytes = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
        return bytes;
      };
      return ['front', 'back'].flatMap(face => [-.3, -.1, 0, .1, .3].map(angle => {
        q.rig.body.position.set(0, 0, 0);
        q.rig.body.quaternion.setFromAxisAngle(q.rig.body.position.clone().set(0, 1, 0), angle + (face === 'back' ? Math.PI : 0));
        q.bodyMesh.visible = true;
        const withBody = snapshot();
        q.bodyMesh.visible = false;
        const withoutBody = snapshot();
        let covered = 0, samples = 0;
        for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) {
          const point = q.rig.body.position.clone().set(-.6 + x * 1.2 / 14, -.9 + y * 1.8 / 14, (face === 'front' ? q.frontMesh : q.backMesh).position.z);
          q.card.localToWorld(point);
          point.project(q.camera);
          const px = Math.floor((point.x + 1) * width / 2), py = Math.floor((point.y + 1) * height / 2);
          if (px < 0 || px >= width || py < 0 || py >= height) continue;
          const i = (py * width + px) * 4;
          samples++;
          if (Math.abs(withBody[i] - withoutBody[i]) + Math.abs(withBody[i + 1] - withoutBody[i + 1]) + Math.abs(withBody[i + 2] - withoutBody[i + 2]) > 20) covered++;
        }
        q.bodyMesh.visible = true;
        return { face, angle, covered, samples };
      }));
    });
    console.log(`${depthBits}-bit depth: ${JSON.stringify(results)}`);
    for (const result of results) {
      assert.equal(result.samples, 225, 'The complete test area stays visible');
      assert.equal(result.covered, 0, 'The card body must never overwrite the portrait at any tested angle');
    }
    const writes = await page.evaluate(async () => {
      const container = document.getElementById('lanyard');
      window.__cardSizeWrites = 0;
      // Fractional CSS layout changes still round to the same drawing size.
      for (const offset of [.1, .2, 0]) {
        container.style.width = `calc(100% - ${offset}px)`;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }
      container.style.removeProperty('width');
      return window.__cardSizeWrites;
    });
    assert.equal(writes, 0, 'Subpixel layout changes must not clear the WebGL canvas');
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('PASS: mobile artwork remains above the card body across rotations, with native and simulated 16-bit depth.');
} finally { await browser.close(); }
