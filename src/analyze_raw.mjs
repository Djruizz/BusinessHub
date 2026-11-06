import fs from 'fs';
import path from 'path';

const file = 'C:/Users/Personal/Desktop/Proyectos/BusinessHub/data/discovered_raw.json';
const data = JSON.parse(fs.readFileSync(file, 'utf-8'));

console.log('Total places:', data.length);
const withPhone = data.filter(d => d.feedPhone);
const withWeb = data.filter(d => d.feedWebsite);
const withRating = data.filter(d => d.rating !== null);

console.log('With phone in feed:', withPhone.length);
console.log('With website in feed:', withWeb.length);
console.log('With rating in feed:', withRating.length);

// Breakdown by search zone
const zones = {};
data.forEach(d => {
  zones[d.searchZone] = (zones[d.searchZone] || 0) + 1;
});
console.log('Breakdown by searchZone:', zones);
