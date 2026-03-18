/**
 * Filter Module - Date filtering and search
 */
const Filter = (() => {
  let dateFrom = null;
  let dateTo = null;
  let searchQuery = '';

  function setDateRange(from, to) {
    dateFrom = from || null;
    dateTo = to || null;
  }

  function clearDateRange() {
    dateFrom = null;
    dateTo = null;
    const fromEl = document.getElementById('dateFrom');
    const toEl = document.getElementById('dateTo');
    if (fromEl) fromEl.value = '';
    if (toEl) toEl.value = '';
  }

  function setSearch(query) {
    searchQuery = (query || '').toLowerCase().trim();
  }

  function getDateRange() {
    return { from: dateFrom, to: dateTo };
  }

  function getSearch() {
    return searchQuery;
  }

  function matchesDate(itemDate) {
    if (!dateFrom && !dateTo) return true;
    if (!itemDate) return true;
    const d = new Date(itemDate);
    if (dateFrom && d < new Date(dateFrom)) return false;
    if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  }

  function matchesSearch(item) {
    if (!searchQuery) return true;
    const fields = [
      item.name, item.name_zh, item.name_en, item.name_ja,
      item.desc_zh, item.desc_en, item.desc_ja,
      item.product_zh, item.product_en,
      item.company, item.company_zh,
      item.category, item.category_zh, item.category_ja,
      item.market, item.market_zh, item.market_ja,
      item.tags ? item.tags.join(' ') : '',
      item.speaker, item.speaker_zh, item.speaker_ja,
      item.title_zh, item.title_en, item.title_ja,
      item.tagline_zh, item.tagline_en, item.tagline_ja,
    ].filter(Boolean).join(' ').toLowerCase();
    return fields.includes(searchQuery);
  }

  function applyFilters(items) {
    return items.filter(item => {
      return matchesDate(item.date) && matchesSearch(item);
    });
  }

  return { setDateRange, clearDateRange, setSearch, getDateRange, getSearch, matchesDate, matchesSearch, applyFilters };
})();
