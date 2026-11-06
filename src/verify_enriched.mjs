import fs from 'fs';

const data = JSON.parse(fs.readFileSync('C:/Users/Personal/Desktop/Proyectos/BusinessHub/data/enriched_leads.json', 'utf-8'));

console.log('Total Enriched Quality Leads:', data.length);

const zones = {};
const categories = {};
const decisor = {};
let totalReviews = 0;
let ratingSum = 0;
let withPhoneCount = 0;

data.forEach(d => {
  zones[d.zona] = (zones[d.zona] || 0) + 1;
  categories[d.category] = (categories[d.category] || 0) + 1;
  decisor[d.perfilDecisor] = (decisor[d.perfilDecisor] || 0) + 1;
  totalReviews += (d.numResenas || 0);
  ratingSum += (d.rating || 0);
  if (d.phone) withPhoneCount++;
});

console.log('--- Zones ---');
console.log(zones);

console.log('--- Categories ---');
console.log(categories);

console.log('--- Decision Profile ---');
console.log(decisor);

console.log('--- Key Metrics ---');
console.log('Total leads:', data.length);
console.log('With phone:', withPhoneCount, `(${(withPhoneCount/data.length*100).toFixed(1)}%)`);
console.log('Total reviews sum:', totalReviews);
console.log('Average rating:', (ratingSum / data.length).toFixed(2));

console.log('\n--- Top 3 Highest Scored Leads ---');
console.log(data.slice(0, 3).map(d => ({
  name: d.name,
  score: d.score,
  phone: d.phoneDisplay,
  zona: d.zona,
  category: d.category,
  resumenIA: d.resumenIA
})));
