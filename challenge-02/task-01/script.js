import { countries } from './data.js';

const searchInput = document.querySelector('#search');
const suggestions = document.querySelector('#suggestions');
let selectedIndex = -1;

function normalize(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .toLowerCase()
    .trim();
}

// Normalize the dataset once instead of repeating it after every key press.
const searchableCountries = countries.map(country => ({
  ...country,
  searchName: normalize(country.name),
}));

function searchCountries(text) {
  const query = normalize(text);
  if (!query) return [];

  return searchableCountries
    .filter(country => country.searchName.includes(query))
    .sort((first, second) => {
      const firstStarts = first.searchName.startsWith(query);
      const secondStarts = second.searchName.startsWith(query);
      return secondStarts - firstStarts;
    })
    .slice(0, 8);
}

function chooseCountry(name) {
  searchInput.value = name;
  suggestions.replaceChildren();
  searchInput.setAttribute('aria-expanded', 'false');
  selectedIndex = -1;
}

function showSuggestions() {
  const matches = searchCountries(searchInput.value);
  suggestions.replaceChildren();
  selectedIndex = -1;

  if (!searchInput.value.trim()) {
    searchInput.setAttribute('aria-expanded', 'false');
    return;
  }

  if (matches.length === 0) {
    const item = document.createElement('li');
    item.textContent = 'No countries found';
    item.className = 'no-results';
    suggestions.append(item);
  } else {
    for (const country of matches) {
      const item = document.createElement('li');
      item.textContent = country.name;
      item.setAttribute('role', 'option');
      item.addEventListener('click', () => chooseCountry(country.name));
      suggestions.append(item);
    }
  }

  searchInput.setAttribute('aria-expanded', 'true');
}

function moveSelection(direction) {
  const items = [...suggestions.querySelectorAll('[role="option"]')];
  if (items.length === 0) return;

  selectedIndex = (selectedIndex + direction + items.length) % items.length;
  items.forEach((item, index) => item.classList.toggle('active', index === selectedIndex));
  items[selectedIndex].scrollIntoView({ block: 'nearest' });
}

searchInput.addEventListener('input', showSuggestions);

searchInput.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    moveSelection(1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    moveSelection(-1);
  } else if (event.key === 'Enter' && selectedIndex >= 0) {
    event.preventDefault();
    chooseCountry(suggestions.querySelectorAll('[role="option"]')[selectedIndex].textContent);
  } else if (event.key === 'Escape') {
    chooseCountry(searchInput.value);
  }
});

document.addEventListener('click', event => {
  if (!event.target.closest('.search-box')) chooseCountry(searchInput.value);
});
