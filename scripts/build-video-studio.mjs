import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const editorRoot = path.join(root, 'vendor', 'braincut');
const editorDependencies = path.join(editorRoot, 'node_modules', '@sveltejs', 'kit', 'package.json');
const editorBuild = path.join(editorRoot, 'build');
const publishedEditor = path.join(root, 'public', 'video-studio');

function runNpm(args) {
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`npm ${args.join(' ')} failed with status ${result.status}.`);
}

if (!existsSync(editorDependencies)) runNpm(['ci', '--prefix', path.join('vendor', 'braincut')]);
runNpm(['run', 'build', '--prefix', path.join('vendor', 'braincut')]);

const resolvedRoot = path.resolve(root);
const resolvedBuild = path.resolve(editorBuild);
const resolvedPublish = path.resolve(publishedEditor);
if (resolvedBuild !== path.join(resolvedRoot, 'vendor', 'braincut', 'build')) {
  throw new Error('Refusing to copy the editor build from outside vendor/braincut/build.');
}
if (resolvedPublish !== path.join(resolvedRoot, 'public', 'video-studio')) {
  throw new Error('Refusing to replace an unexpected published editor directory.');
}
if (!existsSync(path.join(editorBuild, 'index.html'))) {
  throw new Error('The nested editor build did not produce build/index.html.');
}

rmSync(publishedEditor, { recursive: true, force: true });
mkdirSync(path.dirname(publishedEditor), { recursive: true });
cpSync(editorBuild, publishedEditor, { recursive: true });
console.log('Synced vendor/braincut/build into public/video-studio.');
