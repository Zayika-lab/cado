// Builds tests/fixtures/chair.glb — a minimal valid glTF 2.0 binary.
// One shared unit-cube mesh, 6 transformed instances (seat + back + 4 legs).
const fs = require('fs');
const path = require('path');

const positions = new Float32Array([
  // +Z
  -0.5,-0.5, 0.5,  0.5,-0.5, 0.5,  0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
  // -Z
   0.5,-0.5,-0.5, -0.5,-0.5,-0.5, -0.5, 0.5,-0.5,  0.5, 0.5,-0.5,
  // +Y
  -0.5, 0.5, 0.5,  0.5, 0.5, 0.5,  0.5, 0.5,-0.5, -0.5, 0.5,-0.5,
  // -Y
  -0.5,-0.5,-0.5,  0.5,-0.5,-0.5,  0.5,-0.5, 0.5, -0.5,-0.5, 0.5,
  // +X
   0.5,-0.5, 0.5,  0.5,-0.5,-0.5,  0.5, 0.5,-0.5,  0.5, 0.5, 0.5,
  // -X
  -0.5,-0.5,-0.5, -0.5,-0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5,-0.5,
]);
const normals = new Float32Array([
  0,0,1, 0,0,1, 0,0,1, 0,0,1,
  0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
  0,1,0, 0,1,0, 0,1,0, 0,1,0,
  0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
  1,0,0, 1,0,0, 1,0,0, 1,0,0,
  -1,0,0, -1,0,0, -1,0,0, -1,0,0,
]);
const indices = new Uint16Array([
  0,1,2, 0,2,3,
  4,5,6, 4,6,7,
  8,9,10, 8,10,11,
  12,13,14, 12,14,15,
  16,17,18, 16,18,19,
  20,21,22, 20,22,23,
]);

const parts = [
  { name:'seat',     t:[0,      0.45,  0],      s:[0.5,  0.05, 0.5]  },
  { name:'backrest', t:[0,      0.75, -0.225],  s:[0.5,  0.5,  0.05] },
  { name:'leg-fl',   t:[-0.225, 0.225, 0.225],  s:[0.05, 0.45, 0.05] },
  { name:'leg-fr',   t:[ 0.225, 0.225, 0.225],  s:[0.05, 0.45, 0.05] },
  { name:'leg-bl',   t:[-0.225, 0.225,-0.225],  s:[0.05, 0.45, 0.05] },
  { name:'leg-br',   t:[ 0.225, 0.225,-0.225],  s:[0.05, 0.45, 0.05] },
];

const posBL = positions.byteLength;
const nrmBL = normals.byteLength;
const idxBL = indices.byteLength;
const binLen = posBL + nrmBL + idxBL; // already 4-aligned: 288+288+72=648

const bin = Buffer.alloc(binLen);
Buffer.from(positions.buffer).copy(bin, 0);
Buffer.from(normals.buffer).copy(bin, posBL);
Buffer.from(indices.buffer).copy(bin, posBL + nrmBL);

const gltf = {
  asset: { version: '2.0', generator: 'cado-test chair gen' },
  scene: 0,
  scenes: [{ nodes: parts.map((_,i)=>i) }],
  nodes: parts.map(p => ({ name:p.name, translation:p.t, scale:p.s, mesh:0 })),
  meshes: [{
    name:'cube',
    primitives: [{ attributes:{ POSITION:0, NORMAL:1 }, indices:2, material:0, mode:4 }]
  }],
  materials: [{
    name:'wood',
    pbrMetallicRoughness: {
      baseColorFactor: [0.55, 0.35, 0.18, 1.0],
      metallicFactor: 0.0,
      roughnessFactor: 0.8
    }
  }],
  buffers: [{ byteLength: binLen }],
  bufferViews: [
    { buffer:0, byteOffset:0,              byteLength:posBL, target:34962 },
    { buffer:0, byteOffset:posBL,          byteLength:nrmBL, target:34962 },
    { buffer:0, byteOffset:posBL+nrmBL,    byteLength:idxBL, target:34963 },
  ],
  accessors: [
    { bufferView:0, componentType:5126, count:24, type:'VEC3', min:[-0.5,-0.5,-0.5], max:[0.5,0.5,0.5] },
    { bufferView:1, componentType:5126, count:24, type:'VEC3' },
    { bufferView:2, componentType:5123, count:36, type:'SCALAR' },
  ]
};

let jsonStr = JSON.stringify(gltf);
while (jsonStr.length % 4 !== 0) jsonStr += ' ';
const jsonBytes = Buffer.from(jsonStr, 'utf8');

const total = 12 + 8 + jsonBytes.byteLength + 8 + binLen;
const glb = Buffer.alloc(total);
let o = 0;
glb.writeUInt32LE(0x46546C67, o); o += 4; // magic 'glTF'
glb.writeUInt32LE(2,          o); o += 4; // version
glb.writeUInt32LE(total,      o); o += 4;
glb.writeUInt32LE(jsonBytes.byteLength, o); o += 4;
glb.writeUInt32LE(0x4E4F534A, o); o += 4; // 'JSON'
jsonBytes.copy(glb, o); o += jsonBytes.byteLength;
glb.writeUInt32LE(binLen,     o); o += 4;
glb.writeUInt32LE(0x004E4942, o); o += 4; // 'BIN\0'
bin.copy(glb, o);

const outPath = path.join(__dirname, 'chair.glb');
fs.writeFileSync(outPath, glb);
console.log('Wrote', outPath, glb.byteLength, 'bytes');
