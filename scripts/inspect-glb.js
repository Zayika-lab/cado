// Читає GLB-файл, парсить JSON-частину і виводить дерево нод/меш/примітивів.
// Використання: node scripts/inspect-glb.js "test files/test_6.glb"
import fs from 'node:fs';
import path from 'node:path';

const fp = process.argv[2];
if (!fp) { console.error('usage: node scripts/inspect-glb.js <path>'); process.exit(1); }

const buf = fs.readFileSync(fp);
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const magic = dv.getUint32(0, true);
const ver = dv.getUint32(4, true);
const total = dv.getUint32(8, true);
const jsonLen = dv.getUint32(12, true);
const jsonType = dv.getUint32(16, true);
console.log(`magic=0x${magic.toString(16)} ver=${ver} fileSize=${buf.length} totalHeader=${total}`);
console.log(`json chunk: len=${jsonLen} type=0x${jsonType.toString(16)}`);

const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf.buffer, buf.byteOffset + 20, jsonLen)));
console.log('\n=== ASSET ===');
console.log(json.asset || {});
console.log('\n=== SCENES ===');
console.log(`scene index: ${json.scene ?? 0}, total scenes: ${(json.scenes||[]).length}`);
(json.scenes||[]).forEach((s, i) => console.log(`  scene[${i}] name="${s.name||''}" roots=${JSON.stringify(s.nodes)}`));

console.log(`\n=== NODES (${(json.nodes||[]).length}) ===`);
(json.nodes||[]).forEach((n, i) => {
  const bits = [];
  if (n.name) bits.push(`name="${n.name}"`);
  if (n.mesh !== undefined) bits.push(`mesh=${n.mesh}`);
  if (n.children) bits.push(`children=[${n.children.join(',')}]`);
  if (n.translation) bits.push(`t=[${n.translation.map(x=>x.toFixed(2)).join(',')}]`);
  if (n.rotation) bits.push(`r=[${n.rotation.map(x=>x.toFixed(3)).join(',')}]`);
  if (n.scale) bits.push(`s=[${n.scale.map(x=>x.toFixed(3)).join(',')}]`);
  console.log(`  node[${i}] ${bits.join(' ')}`);
});

console.log(`\n=== MESHES (${(json.meshes||[]).length}) ===`);
(json.meshes||[]).forEach((m, i) => {
  console.log(`  mesh[${i}] name="${m.name||''}" primitives=${m.primitives.length}`);
  m.primitives.forEach((p, j) => {
    const attrs = Object.keys(p.attributes).join(',');
    console.log(`    prim[${j}] attrs=[${attrs}] indices=${p.indices ?? 'none'} material=${p.material ?? 'none'}`);
  });
});

console.log(`\n=== MATERIALS (${(json.materials||[]).length}) ===`);
(json.materials||[]).forEach((m, i) => {
  const bc = m.pbrMetallicRoughness?.baseColorFactor?.map(x=>x.toFixed(3)).join(',');
  console.log(`  material[${i}] name="${m.name||''}" baseColor=[${bc||'—'}]`);
});

// Simuliere meinen parseGLB: grouping von parts zu bodies
console.log(`\n=== WALK SIMULATION (what my parseGLB would produce) ===`);
const parts = [];
function walk(nodeIdx, pathName) {
  const n = json.nodes[nodeIdx];
  const nodeName = n.name || ('node'+nodeIdx);
  const pn = pathName ? pathName+'/'+nodeName : nodeName;
  if (n.mesh !== undefined) {
    const mesh = json.meshes[n.mesh];
    mesh.primitives.forEach((prim, pIdx) => {
      parts.push({ nodePath: pn, meshName: mesh.name, primIdx: pIdx, material: prim.material });
    });
  }
  if (n.children) for (const c of n.children) walk(c, pn);
}
const sceneIdx = json.scene !== undefined ? json.scene : 0;
const roots = json.scenes?.[sceneIdx]?.nodes || [];
for (const r of roots) walk(r);
console.log(`parts: ${parts.length}`);
parts.forEach((p, i) => console.log(`  part[${i}] path="${p.nodePath}" mesh="${p.meshName||''}" primIdx=${p.primIdx} mat=${p.material}`));

// Body grouping (same consecutive node path)
const bodies = [];
let cur = null;
parts.forEach((p, i) => {
  if (cur && cur.name === p.nodePath) { cur.partIndices.push(i); }
  else { cur = { name: p.nodePath, partIndices: [i] }; bodies.push(cur); }
});
console.log(`\nbodies (after grouping): ${bodies.length}`);
bodies.forEach((b, i) => console.log(`  body[${i}] name="${b.name}" parts=${b.partIndices.length}`));
