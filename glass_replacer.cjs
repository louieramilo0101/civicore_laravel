const fs = require('fs');
const path = require('path');

const targetClasses = [
    { from: "bg-white rounded-2xl p-6 shadow-sm border border-slate-100", to: "bg-white/60 backdrop-blur-xl rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60" },
    { from: "bg-white rounded-2xl shadow-sm border border-slate-100", to: "bg-white/60 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60" },
    { from: "bg-white p-6 rounded-2xl shadow-sm border border-slate-100", to: "bg-white/60 backdrop-blur-xl p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60" }
];

const files = [
    "resources/js/components/Documents.jsx",
    "resources/js/components/Issuances.jsx",
    "resources/js/components/Accounts.jsx",
    "resources/js/components/Mapping.jsx"
];

files.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (!fs.existsSync(fullPath)) return;
    let content = fs.readFileSync(fullPath, 'utf8');
    targetClasses.forEach(tc => {
        content = content.split(tc.from).join(tc.to);
    });
    fs.writeFileSync(fullPath, content);
});
console.log("Done replacing.");
