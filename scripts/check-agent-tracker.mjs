#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const trackerPath = path.join(rootDir, 'AGENT_TRACKER.md');

if (!fs.existsSync(trackerPath)) {
  console.error('::error:: AGENT_TRACKER.md is missing from repository root!');
  process.exit(1);
}

const content = fs.readFileSync(trackerPath, 'utf-8');

// Ensure table exists and has headers
const requiredHeaders = [
  'Timestamp (ISO)',
  'Agent Name',
  'Target Files / Feature Area',
  'Task Objective',
  'Status',
  'Verification Gate',
];

for (const header of requiredHeaders) {
  if (!content.includes(header)) {
    console.error(`::error:: AGENT_TRACKER.md is missing mandatory table column: "${header}"`);
    process.exit(1);
  }
}

// Find table rows
const lines = content.split('\n');
const tableLines = lines.filter((line) => line.trim().startsWith('|') && !line.includes('---'));

if (tableLines.length < 2) {
  console.error('::error:: AGENT_TRACKER.md does not contain any logged task entries!');
  process.exit(1);
}

// Check for valid status values
const validStatuses = ['CLAIMED', 'IN_PROGRESS', 'VERIFYING', 'BLOCKED', 'COMPLETED', 'ABORTED'];
let foundAnyValidStatus = false;

for (const line of tableLines) {
  if (line.includes('Status')) continue; // Header row
  const hasValidStatus = validStatuses.some((status) => line.includes(`\`${status}\``) || line.includes(` ${status} `));
  if (hasValidStatus) {
    foundAnyValidStatus = true;
    break;
  }
}

if (!foundAnyValidStatus) {
  console.error(`::error:: No valid agent task status found in AGENT_TRACKER.md (expected one of: ${validStatuses.join(', ')})`);
  process.exit(1);
}

console.log('check-agent-tracker: AGENT_TRACKER.md is valid, structured, and properly maintained.');
