/**
 * Data Module - Load and manage data from JSON files
 */
const DataStore = (() => {
  const cache = {};

  async function loadJSON(path) {
    if (cache[path]) return cache[path];
    try {
      const res = await fetch(path);
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

  // Get all items across both markets for favorites lookup
  async function getAllItems() {
    const [us, jp] = await Promise.all([
      loadMarketData('us'),
      loadMarketData('jp'),
    ]);
    const allItems = {};
    [...us.ceo, ...us.dtc, ...jp.ceo, ...jp.dtc].forEach(item => {
      allItems[item.id] = item;
    });
    return allItems;
  }

  return { loadMarketData, getAllItems };
})();
