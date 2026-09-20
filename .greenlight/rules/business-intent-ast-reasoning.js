const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');


// Default target is all files in js/generators, or specific changed files
let filesToCheck = [];
const args = process.argv.slice(2);
let baseRef = '';

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--base' && args[i+1]) {
        baseRef = args[i+1];
        i++;
    }
}

if (baseRef) {
    try {
        const changedFiles = execSync(`git diff --name-only ${baseRef}`).toString().trim().split('\n');
        filesToCheck = changedFiles.filter(f => f.startsWith('js/generators/') && f.endsWith('.js'));
    } catch (e) {
        console.error('Failed to get changed files:', e.message);
        process.exit(0);
    }
} else {
    const targetDir = 'js/generators';
    if (fs.existsSync(targetDir)) {
        filesToCheck = fs.readdirSync(targetDir)
            .filter(f => f.endsWith('.js'))
            .map(f => path.join(targetDir, f));
    }
}

let hasViolation = false;
let failedFile = '';

// Check grandfathered files
let baseline = {};
if (fs.existsSync('.greenlight/baseline.json')) {
    baseline = JSON.parse(fs.readFileSync('.greenlight/baseline.json', 'utf8'));
}
const grandfathered = baseline['GL-001'] || [];

// Check waivers
let waivers = [];
if (fs.existsSync('.greenlight/waivers.yml')) {
    const waiverContent = fs.readFileSync('.greenlight/waivers.yml', 'utf8');
    // Simple YAML parsing for waivers:
    // rule_id: GL-001
    // path: js/generators/automation.js
    // reason: ...
    const lines = waiverContent.split('\n');
    let currentWaiver = {};
    for (let line of lines) {
        if (line.startsWith('- rule_id:')) {
            if (currentWaiver.rule_id) waivers.push(currentWaiver);
            currentWaiver = { rule_id: line.split(':')[1].trim() };
        } else if (line.trim().startsWith('path:')) {
            currentWaiver.path = line.split(':')[1].trim();
        } else if (line.trim().startsWith('reason:')) {
            currentWaiver.reason = line.split(':')[1].trim();
        }
    }
    if (currentWaiver.rule_id) waivers.push(currentWaiver);
}
const waivedPaths = waivers.filter(w => w.rule_id === 'GL-001').map(w => w.path);

for (const file of filesToCheck) {
    if (!fs.existsSync(file)) continue; // File might have been deleted

    // Check if file is grandfathered or waived
    if (grandfathered.includes(file) || waivedPaths.includes(file)) {
        continue;
    }

    const content = fs.readFileSync(file, 'utf8');

    // We are looking for JSDoc style comments at the top of the file
    // that contain both 'Business Intent:' and 'AST Reasoning:'
    if (!content.includes('Business Intent:') || !content.includes('AST Reasoning:')) {
        hasViolation = true;
        failedFile = file;
        break;
    }
}

if (hasViolation) {
    console.error(`::error file=${failedFile}::[GL-001] File is missing "Business Intent:" and/or "AST Reasoning:" documentation in its header. Every other generator uses it (see js/generators/automation.js). Fix: add these fields to the JSDoc header block. Re-run: node .greenlight/rules/business-intent-ast-reasoning.js`);
    fs.writeFileSync('.greenlight/report.json', JSON.stringify({
        rule: 'GL-001',
        file: failedFile,
        message: 'File is missing "Business Intent:" and/or "AST Reasoning:" documentation in its header. Every other generator uses it (see js/generators/automation.js). Fix: add these fields to the JSDoc header block.'
    }));
    process.exit(1);
}

fs.writeFileSync('.greenlight/report.json', JSON.stringify({
    rule: 'GL-001',
    status: 'pass'
}));
process.exit(0);
