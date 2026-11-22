/**
 * G-15 — platform-scoped orientation.
 *
 * Native (phone) stays portrait. The web shell must not inherit that lock:
 * a desktop browser is resized by the user and a PWA that forces portrait is
 * effectively unsupported on desktop. The generated Android manifest is
 * git-ignored prebuild output, so it is checked only when present.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/manifest.json'), 'utf8'));

describe('orientation is scoped by platform', () => {
  it('locks portrait for the native app at the Expo boundary', () => {
    expect(appJson.expo.orientation).toBe('portrait');
    expect(appJson.expo.android).toBeDefined();
    expect(appJson.expo.ios).toBeDefined();
  });

  it('does not cap the web app at portrait', () => {
    expect(manifest.orientation).toBe('any');
    expect(appJson.expo.web.orientation).toBeUndefined();
  });

  it('does not carry a platform-specific portrait override in app.json', () => {
    expect(appJson.expo.android.orientation).toBeUndefined();
    expect(appJson.expo.ios.orientation).toBeUndefined();
  });

  it('keeps the generated Android manifest portrait when prebuild output is present', () => {
    const generated = path.join(ROOT, 'android/app/src/main/AndroidManifest.xml');
    if (!fs.existsSync(generated)) return; // git-ignored prebuild output
    const source = fs.readFileSync(generated, 'utf8');
    expect(source).toContain('screenOrientation="portrait"');
  });
});
