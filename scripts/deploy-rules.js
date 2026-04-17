// Deploys firestore.rules and storage.rules to Firebase using the Admin SDK.
// Bypasses `firebase deploy` (which needs serviceusage permission that the
// default firebase-adminsdk SA does not have).
import admin from 'firebase-admin';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const sa = require('../cado-sa.json');

admin.initializeApp({
  credential: admin.credential.cert(sa),
  projectId: sa.project_id,
  storageBucket: `${sa.project_id}.firebasestorage.app`,
});

const rules = admin.securityRules();

async function deployFirestore() {
  const source = fs.readFileSync('firestore.rules', 'utf8');
  console.log('→ Firestore rules: releasing', source.length, 'bytes');
  await rules.releaseFirestoreRulesetFromSource(source);
  console.log('✓ Firestore rules deployed');
}

async function deployStorage() {
  const source = fs.readFileSync('storage.rules', 'utf8');
  const bucket = `${sa.project_id}.firebasestorage.app`;
  console.log('→ Storage rules: releasing', source.length, 'bytes → bucket', bucket);
  await rules.releaseStorageRulesetFromSource(source, bucket);
  console.log('✓ Storage rules deployed');
}

try {
  await deployFirestore();
  await deployStorage();
  process.exit(0);
} catch (e) {
  console.error('✗ Deploy failed:', e.code || '', e.message || e);
  if (e.errorInfo) console.error(e.errorInfo);
  process.exit(1);
}
