import fs from 'fs';

const data = JSON.parse(fs.readFileSync('C:/Users/Personal/Desktop/Proyectos/BusinessHub/data/extracted_leads.json', 'utf-8'));

console.log('Total extracted:', data.length);
const withPhone = data.filter(d => d.phone);
const withWeb = data.filter(d => d.tieneWeb);
console.log('With phone:', withPhone.length);
console.log('With web:', withWeb.length);

const zones = {};
data.forEach(d => {
  zones[d.zona] = (zones[d.zona] || 0) + 1;
});
console.log('Zones in extracted leads:', zones);

const categories = {};
data.forEach(d => {
  categories[d.category] = (categories[d.category] || 0) + 1;
});
console.log('Categories:', categories);
