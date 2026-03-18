/**
 * Data Module - Load and manage data from JSON files
 */
const DataStore = (() => {
  const cache = {};

  async function loadJSON(path) {
    if (cache[path]) return cache[path];
    try {
      const res = await fetch(path, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      cache[path] = data;
      return data;
    } catch (e) {
      console.error(`Failed to load ${path}:`, e);
      return [];
    }
  }

  async function loadMarketData(market) {
    const prefix = `data/${market}`;
    const [sources, ceo, dtc] = await Promise.all([
      loadJSON(`${prefix}/sources.json`),
      loadJSON(`${prefix}/ceo.json`),
      loadJSON(`${prefix}/dtc.json`),
    ]);
    return { sources, ceo, dtc };
  }

  // Get all items across both markets for favorites lookup (includes sources)
  async function getAllItems() {
    const [us, jp] = await Promise.all([
      loadMarketData('us'),
      loadMarketData('jp'),
    ]);
    const allItems = {};
    [...us.sources, ...us.ceo, ...us.dtc, ...jp.sources, ...jp.ceo, ...jp.dtc].forEach(item => {
      const id = item.id || item.name;
      allItems[id] = item;
    });
    return allItems;
  }

  // Get last update date from all data
  function getLastUpdateDate(marketData) {
    let latest = '';
    [...(marketData.ceo || []), ...(marketData.dtc || [])].forEach(item => {
      if (item.date && item.date > latest) latest = item.date;
    });
    return latest;
  }

  // Get update stats: latest date, earliest date, items with dates count
  function getUpdateStats(marketData) {
    let latest = '';
    let earliest = '9999-99-99';
    let datedCount = 0;
    const allItems = [...(marketData.ceo || []), ...(marketData.dtc || [])];
    allItems.forEach(item => {
      if (item.date) {
        datedCount++;
        if (item.date > latest) latest = item.date;
        if (item.date < earliest) earliest = item.date;
      }
    });
    if (!latest) earliest = '';
    return { latest, earliest, datedCount, totalItems: allItems.length };
  }

  return { loadMarketData, getAllItems, getLastUpdateDate, getUpdateStats };
})();
