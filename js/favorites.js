/**
 * Favorites Module - localStorage-based favorites management
 */
const Favorites = (() => {
  const STORAGE_KEY = 'startup_radar_favorites';

  function getAll() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function save(favs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
  }

  function isFavorited(id) {
    return getAll().includes(id);
  }

  function toggle(id) {
    const favs = getAll();
    const index = favs.indexOf(id);
    if (index === -1) {
      favs.push(id);
    } else {
      favs.splice(index, 1);
    }
    save(favs);
    return index === -1; // returns true if now favorited
  }

  function count() {
    return getAll().length;
  }

  return { getAll, isFavorited, toggle, count };
})();
