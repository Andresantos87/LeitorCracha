const fs = require('fs');

const files = [
    'cmpc_all_pt_digital_rainbow_workers.csv',
    'mifibra_user (1).csv',
    'cmpc_all_pt_digital_sat_contratista.csv'
];

let found = false;

files.forEach(file => {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            if (line.includes('01074575040') || line.includes('98817093') || line.toUpperCase().includes('ANDRE SANTOS') || line.toUpperCase().includes('SANTOS, ANDRE')) {
                console.log(`\n--- FOUND IN ${file} LINE ${index + 1} ---`);
                console.log(line);
                const cols = line.split(',');
                cols.forEach((col, i) => {
                    if (col.toUpperCase().includes('ESPECIALISTA') || col.toUpperCase().includes('TRAINEE')) {
                        console.log(`!!! MATCHED CARGO KEYWORD AT COLUMN ${i}: ${col}`);
                    }
                });
                found = true;
            }
        });
    }
});

if (!found) console.log("Nothing found.");
