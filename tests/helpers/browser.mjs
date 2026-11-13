import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const playwright = process.env.PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
  : await import('playwright');
export const chromium = playwright.chromium;
const brave = 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
export const browserExecutable = process.env.PORTFOLIO_BROWSER || (existsSync(brave) ? brave : undefined);

export const artifactDirectory = name => join(tmpdir(), 'portfolio-test-artifacts', name);

// Screenshots are opt-in and always live outside the source tree.
export async function capture(surface, options) {
  if (process.env.PORTFOLIO_SCREENSHOTS !== '1') return;
  const folder = artifactDirectory(basename(process.argv[1], '.mjs'));
  await mkdir(folder, { recursive: true });
  return surface.screenshot({ ...options, path: join(folder, basename(String(options.path))) });
}
