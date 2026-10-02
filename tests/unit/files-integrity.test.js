import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ROOT = process.cwd();
const rel = (...p) => path.join(ROOT, ...p);

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['node_modules', '.git', '05_Production_Builds', 'test-results', 'playwright-report', '07_System_Snapshots'].includes(e.name)) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out); else out.push(p);
    }
    return out;
}

describe('project files', () => {
    const files = walk(ROOT);

    test('no secret tokens or private keys in any project file', () => {
        const hits = [];
        for (const f of files) {
            if (path.basename(f) === '.env') continue; // local-only, git-ignored
            if (/\.(png|jpe?g|webp|gif|pdf|xlsx|ico|woff2?|ttf|mp4|zip)$/i.test(f)) continue;
            const text = fs.readFileSync(f, 'utf8');
            if (/ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN (RSA |EC )?PRIVATE KEY-----|AKIA[0-9A-Z]{16}/.test(text)) hits.push(path.relative(ROOT, f));
        }
        expect(hits).toEqual([]);
    });

    test('.env is ignored by git and not tracked', () => {
        const ignored = execFileSync('git', ['check-ignore', '.env'], { cwd: ROOT }).toString().trim();
        expect(ignored).toBe('.env');
        const tracked = execFileSync('git', ['ls-files', '--cached', '.env'], { cwd: ROOT }).toString().trim();
        expect(tracked).toBe('');
    });

    test('printable menu and inventory files exist and are valid', () => {
        for (const p of ['04_Digital_Assets/menu.pdf', 'public/menu.pdf', 'Inventory/Hotel_Sky5_Inventory_Stock.pdf']) {
            const buf = fs.readFileSync(rel(p));
            expect(buf.subarray(0, 5).toString(), p).toBe('%PDF-');
        }
        const xlsx = fs.readFileSync(rel('Inventory/Hotel_Sky5_Inventory_Stock.xlsx'));
        expect(xlsx.subarray(0, 2).toString()).toBe('PK'); // xlsx = zip
    });

    test('generated inventory data is up to date with register_counts.json', () => {
        const before = fs.readFileSync(rel('02_Application_Source/data/inventory.js'), 'utf8');
        execFileSync('python', ['03_Automation_System/build_inventory_data.py'], { cwd: ROOT });
        const after = fs.readFileSync(rel('02_Application_Source/data/inventory.js'), 'utf8');
        expect(after).toBe(before);
    });

    test('every local import in the app source resolves to a file', () => {
        const src = files.filter(f => f.includes(`${path.sep}02_Application_Source${path.sep}`) && /\.(jsx?|css)$/.test(f));
        const missing = [];
        for (const f of src) {
            const text = fs.readFileSync(f, 'utf8');
            for (const m of text.matchAll(/(?:import\s[^'"]*|@import\s+)['"]((?:\.{1,2}|@)\/[^'"]+)['"]/g)) {
                let target = m[1].startsWith('@/') ? rel('02_Application_Source', m[1].slice(2)) : path.resolve(path.dirname(f), m[1]);
                const candidates = [target, `${target}.js`, `${target}.jsx`, `${target}.json`, path.join(target, 'index.js')];
                if (!candidates.some(c => fs.existsSync(c) && fs.statSync(c).isFile())) missing.push(`${path.relative(ROOT, f)} -> ${m[1]}`);
            }
        }
        expect(missing).toEqual([]);
    });

    test('no oversized files in the source folders (> 5 MB)', () => {
        const big = files
            .filter(f => /02_Application_Source|04_Digital_Assets|public|tests/.test(f))
            .filter(f => fs.statSync(f).size > 5 * 1024 * 1024)
            .map(f => path.relative(ROOT, f));
        expect(big).toEqual([]);
    });

    test('no stray control characters in CSS / JS source (they silently break styles)', () => {
        // eslint-disable-next-line no-control-regex -- this test exists to find control characters
        const CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;
        const bad = files
            .filter(f => f.includes('02_Application_Source') && /\.(css|jsx?)$/.test(f))
            .filter(f => CONTROL.test(fs.readFileSync(f, 'utf8')))
            .map(f => path.relative(ROOT, f));
        expect(bad).toEqual([]);
    });
    test('inventory xlsx: every "CODE | Name" written in the sheets matches the item master', () => {
        const py = [
            'import openpyxl, re, json',
            'wb = openpyxl.load_workbook("Inventory/Hotel_Sky5_Inventory_Stock.xlsx")',
            'out = []',
            'for ws in wb:',
            '    for row in ws.iter_rows(values_only=True):',
            '        for v in row:',
            '            if isinstance(v, str):',
            '                out += re.findall(r"(SKY-[A-Z]{2}-\\d{3})\\s*\\|\\s*([^|]+?)\\s*\\|", v)',
            'print(json.dumps(out))',
        ].join('\n');
        const pairs = JSON.parse(execFileSync('python', ['-c', py], { cwd: ROOT }).toString());
        const text = fs.readFileSync(rel('02_Application_Source/data/inventory.js'), 'utf8');
        const names = Object.fromEntries([...text.matchAll(/"code": "(SKY-[A-Z]{2}-\d{3})",\s*"name": "([^"]+)"/g)].map(m => [m[1], m[2]]));
        expect(Object.keys(names).length).toBeGreaterThan(60);
        expect(pairs.length).toBeGreaterThan(0);
        for (const [code, name] of pairs) expect(names[code], `${code} | ${name}`).toBe(name);
    });
    test('every clickable <div>/<span> in the app is a keyboard-usable button (role + tabIndex + key handler)', () => {
        // end of a JSX opening tag: the first '>' that is not part of '=>' and not inside {...}
        const tagEnd = (text, from) => {
            let depth = 0;
            for (let i = from; i < text.length; i++) {
                const c = text[i];
                if (c === '{') depth++;
                else if (c === '}') depth--;
                else if (c === '>' && depth === 0 && text[i - 1] !== '=') return i;
            }
            return text.length;
        };
        const bad = [];
        for (const f of files.filter(x => x.includes('02_Application_Source') && x.endsWith('.jsx'))) {
            const text = fs.readFileSync(f, 'utf8');
            for (const m of text.matchAll(/<(div|span)\s/g)) {
                const tag = text.slice(m.index, tagEnd(text, m.index) + 1);
                if (!/\bonClick=/.test(tag)) continue;
                if (/className="inv-modal-bg"/.test(tag) || /role="dialog"/.test(tag)) continue; // backdrop: Esc also closes
                if (!/role="(button|switch)"/.test(tag) || !/tabIndex=\{0\}/.test(tag) || !/onKeyDown=/.test(tag)) {
                    bad.push(`${path.relative(ROOT, f)}:${text.slice(0, m.index).split('\n').length}`);
                }
            }
        }
        expect(bad).toEqual([]);
    });
});
