const fs = require('fs');
const path = 'C:\\laragon\\www\\civicore_laravel\\resources\\js\\components\\Mapping.jsx';
let content = fs.readFileSync(path, 'utf8');

const old1 = "const issuedBirth = filteredApiDataNoTickets.filter(i => getNormalizedType(i) === 'birth').length;\n" +
"const issuedDeath = filteredApiDataNoTickets.filter(i => getNormalizedType(i) === 'death').length;\n" +
"const issuedMarriage = filteredApiDataNoTickets.filter(i => getNormalizedType(i) === 'marriage').length;\n" +
"const totalIssued = filteredApiDataNoTickets.length;";

const new1 = "const issuedBirth = filteredPrints.filter(i => getNormalizedType(i) === 'birth').length;\n" +
"const issuedDeath = filteredPrints.filter(i => getNormalizedType(i) === 'death').length;\n" +
"const issuedMarriage = filteredPrints.filter(i => getNormalizedType(i) === 'marriage').length;\n" +
"const totalIssued = filteredPrints.length;";

if (!content.includes(old1)) { console.log('old1 not found'); }
else { content = content.replace(old1, new1); console.log('old1 replaced'); }

const old2 = "// Most issued barangay (from issuances only)\nconst brgyIssuedCounts = {};\nfilteredApiDataNoTickets.forEach(i => {";
const new2 = "// Most issued barangay (from actually-printed issuances only)\nconst brgyIssuedCounts = {};\nfilteredPrints.forEach(i => {";

if (!content.includes(old2)) { console.log('old2 not found'); }
else { content = content.replace(old2, new2); console.log('old2 replaced'); }

fs.writeFileSync(path, content);
console.log('Done');