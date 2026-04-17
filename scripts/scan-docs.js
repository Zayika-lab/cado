// Scans glb_loads for docs missing the `uid` field — those are undeletable
// via the client rules (resource.data.uid == request.auth.uid evaluates false).
import admin from 'firebase-admin';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sa = require('../cado-sa.json');
admin.initializeApp({ credential: admin.credential.cert(sa), projectId: sa.project_id });
const db = admin.firestore();

const snap = await db.collection('glb_loads').get();
let total = 0, missingUid = 0, missingPath = 0;
const uids = new Map(); // uid -> count
const orphans = [];
snap.forEach(d => {
  total++;
  const x = d.data();
  if (!x.uid) { missingUid++; orphans.push({ id: d.id, ...x }); }
  else uids.set(x.uid, (uids.get(x.uid) || 0) + 1);
  if (!x.storagePath) missingPath++;
});
console.log('total docs:       ', total);
console.log('missing uid:      ', missingUid);
console.log('missing storage:  ', missingPath);
console.log('docs per uid:');
for (const [u, n] of uids) console.log('  ', u, '→', n);
if (orphans.length) {
  console.log('\norphans (no uid):');
  for (const o of orphans) console.log('  ', o.id, JSON.stringify(Object.keys(o)));
}
process.exit(0);
