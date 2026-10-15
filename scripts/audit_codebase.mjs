import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk('./src');
const terms = ['BOS', 'Supabase', 'Real Write', 'Feature Flag', 'Cloud DEV', 'RPC', 'RLS'];

console.log('=== AUDITING FOR FORBIDDEN / JARGON TERMS IN USER-FACING UI ===');
let foundCount = 0;
files.forEach(f => {
  // skip service files that actually use supabase client internally
  const content = fs.readFileSync(f, 'utf8');
  terms.forEach(t => {
    const regex = new RegExp('\\b' + t + '\\b', 'i');
    if (regex.test(content)) {
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (
          new RegExp('\\b' + t + '\\b', 'i').test(line) &&
          !trimmed.startsWith('//') &&
          !trimmed.startsWith('*') &&
          !trimmed.startsWith('/*') &&
          !trimmed.includes("from '@supabase") &&
          !trimmed.includes('createClient') &&
          !trimmed.includes('SupabaseClient') &&
          !trimmed.includes('process.env.NEXT_PUBLIC_SUPABASE')
        ) {
          // If in src/app, likely UI
          if (f.includes('src\\app') || f.includes('src/app') || f.includes('src\\components') || f.includes('src/components')) {
            console.log(`[UI] ${f}:${idx + 1} -> ${trimmed}`);
            foundCount++;
          }
        }
      });
    }
  });
});
console.log(`Audit complete. Found ${foundCount} potential occurrences.`);
