/**
 * Main App - Routing, page rendering, event binding
 */
const App = (() => {
  let currentPage = 'us';
  let currentTab = 'all';
  let marketData = null;

  function init() {
    bindEvents();
    handleRoute();
    window.addEventListener('hashchange', handleRoute);
    initBackToTop();
  }

  function bindEvents() {
    // Language toggle
    document.getElementById('langToggle').addEventListener('click', () => {
      I18n.toggle();
      renderCurrentPage();
    });

    // Date filter toggle (mobile)
    document.getElementById('dateToggleBtn').addEventListener('click', () => {
      const panel = document.getElementById('dateFilterPanel');
      panel.classList.toggle('show');
      document.getElementById('dateToggleBtn').classList.toggle('active');
    });

    // Date filter apply
    document.getElementById('applyDateFilter').addEventListener('click', () => {
      const from = document.getElementById('dateFrom').value;
      const to = document.getElementById('dateTo').value;
      Filter.setDateRange(from, to);
      renderCurrentPage();
    });

    // Date filter clear
    document.getElementById('clearDateFilter').addEventListener('click', () => {
      Filter.clearDateRange();
      renderCurrentPage();
    });

    // Search
    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        Filter.setSearch(e.target.value);
        renderCurrentPage();
      }, 300);
    });
  }

  function initBackToTop() {
    const btn = document.getElementById('backToTop');
    window.addEventListener('scroll', () => {
      btn.classList.toggle('show', window.scrollY > 400);
    });
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function handleRoute() {
    const hash = window.location.hash || '#/us';
    const path = hash.replace('#/', '') || 'us';

    if (path === 'us' || path === 'jp') {
      currentPage = path;
      currentTab = 'all';
      showFilterBar(true);
      renderMarketPage(path);
    } else if (path === 'favorites') {
      currentPage = 'favorites';
      showFilterBar(true);
      renderFavoritesPage();
    } else {
      currentPage = 'us';
      showFilterBar(true);
      renderMarketPage('us');
    }

    updateNavActive();
  }

  function updateNavActive() {
    document.querySelectorAll('.nav-link').forEach(link => {
      const page = link.getAttribute('data-page');
      link.classList.toggle('active', page === currentPage);
    });
  }

  function showFilterBar(show) {
    const filterBar = document.getElementById('filterBar');
    const mainContent = document.getElementById('mainContent');
    filterBar.classList.toggle('hidden', !show);
    mainContent.classList.toggle('no-filter', !show);

    // Hide tabs on favorites page but keep search/filter
    const tabsContainer = document.getElementById('sectionTabs');
    if (currentPage === 'favorites') {
      tabsContainer.style.display = 'none';
    } else {
      tabsContainer.style.display = '';
    }
  }

  function renderTabs() {
    const tabsContainer = document.getElementById('sectionTabs');
    if (currentPage === 'favorites') {
      tabsContainer.style.display = 'none';
      return;
    }
    tabsContainer.style.display = '';
    const tabs = [
      { key: 'all', label: I18n.t('tab_all') },
      { key: 'sources', label: I18n.t('tab_startups') },
      { key: 'ceo', label: I18n.t('tab_ceo') },
      { key: 'dtc', label: I18n.t('tab_dtc') },
    ];
    tabsContainer.innerHTML = tabs.map(tab =>
      `<button class="tab-btn ${currentTab === tab.key ? 'active' : ''}" data-tab="${tab.key}">${tab.label}</button>`
    ).join('');

    tabsContainer.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTab = btn.getAttribute('data-tab');
        renderTabs();
        renderMarketContent();
      });
    });
  }

  async function renderMarketPage(market) {
    const main = document.getElementById('mainContent');
    main.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';

    marketData = await DataStore.loadMarketData(market);
    renderTabs();
    renderMarketContent();
    updateLastUpdated(marketData);
  }

  function updateLastUpdated(data) {
    const el = document.getElementById('lastUpdated');
    const date = DataStore.getLastUpdateDate(data);
    if (el && date) {
      el.textContent = `${I18n.t('last_updated')} ${date}`;
    }
  }

  function renderMarketContent() {
    const main = document.getElementById('mainContent');
    const market = currentPage;
    const isUS = market === 'us';
    const title = isUS ? I18n.t('us_title') : I18n.t('jp_title');
    const desc = isUS ? I18n.t('us_desc') : I18n.t('jp_desc');

    let html = `
      <div class="page-header fade-in">
        <h1>${title}</h1>
        <p>${desc}</p>
      </div>
      ${Components.renderStatsBar(marketData, market)}
    `;

    // Sources section (also filtered by search)
    if (currentTab === 'all' || currentTab === 'sources') {
      const filteredSources = Filter.applyFilters(marketData.sources);
      html += renderSourcesSection(filteredSources, marketData.sources.length);
    }

    // CEO section
    if (currentTab === 'all' || currentTab === 'ceo') {
      const filteredCeo = Filter.applyFilters(marketData.ceo);
      html += renderCeoSection(filteredCeo, marketData.ceo.length);
    }

    // DTC section
    if (currentTab === 'all' || currentTab === 'dtc') {
      const filteredDtc = Filter.applyFilters(marketData.dtc);
      html += renderDtcSection(filteredDtc, marketData.dtc.length);
    }

    main.innerHTML = html;
  }

  function renderSourcesSection(sources, total) {
    const countText = sources.length === total ? `(${total})` : `(${sources.length}/${total})`;
    let html = `
      <div class="section-header">
        <h2>${I18n.t('section_sources')} <span class="section-count">${countText}</span></h2>
      </div>
      <p style="color:var(--text-secondary);font-size:14px;margin-bottom:16px;">${I18n.t('section_sources_desc')}</p>
    `;
    if (sources.length === 0) {
      html += Components.renderEmpty('search');
    } else {
      html += `<div class="info-sources-grid">${sources.map(s => Components.renderInfoSourceCard(s)).join('')}</div>`;
    }
    return html;
  }

  function renderCeoSection(items, total) {
    const countText = items.length === total ? `(${total})` : `(${items.length}/${total})`;
    let html = `
      <div class="section-header">
        <h2>${I18n.t('section_ceo')} <span class="section-count">${countText}</span></h2>
      </div>
      <p style="color:var(--text-secondary);font-size:14px;margin-bottom:16px;">${I18n.t('section_ceo_desc')}</p>
    `;
    if (items.length === 0) {
      html += Components.renderEmpty('search');
    } else {
      html += `<div class="cards-grid">${items.map(item => Components.renderCeoCard(item)).join('')}</div>`;
    }
    return html;
  }

  function renderDtcSection(items, total) {
    const countText = items.length === total ? `(${total})` : `(${items.length}/${total})`;
    let html = `
      <div class="section-header">
        <h2>${I18n.t('section_dtc')} <span class="section-count">${countText}</span></h2>
      </div>
      <p style="color:var(--text-secondary);font-size:14px;margin-bottom:16px;">${I18n.t('section_dtc_desc')}</p>
    `;
    if (items.length === 0) {
      html += Components.renderEmpty('search');
    } else {
      html += `<div class="cards-grid">${items.map(item => Components.renderDtcCard(item)).join('')}</div>`;
    }
    return html;
  }

  async function renderFavoritesPage() {
    const main = document.getElementById('mainContent');
    main.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';

    const favIds = Favorites.getAll();
    if (favIds.length === 0) {
      main.innerHTML = `
        <div class="page-header fade-in">
          <h1>${I18n.t('fav_title')}</h1>
          <p>${I18n.t('fav_desc')}</p>
        </div>
        ${Components.renderEmpty('favorites')}
      `;
      return;
    }

    const allItems = await DataStore.getAllItems();
    let favItems = favIds.map(id => allItems[id]).filter(Boolean);

    // Apply search filter to favorites
    favItems = Filter.applyFilters(favItems);

    const sourceItems = favItems.filter(item => (item.id || '').includes('-src-'));
    const ceoItems = favItems.filter(item => (item.id || '').includes('-ceo-'));
    const dtcItems = favItems.filter(item => (item.id || '').includes('-dtc-'));

    let html = `
      <div class="page-header fade-in">
        <h1>${I18n.t('fav_title')} <span class="section-count">(${favItems.length})</span></h1>
        <p>${I18n.t('fav_desc')}</p>
      </div>
    `;

    if (favItems.length === 0 && favIds.length > 0) {
      html += Components.renderEmpty('search');
    }

    if (sourceItems.length > 0) {
      html += `
        <div class="fav-section">
          <h3>${I18n.t('section_sources')} (${sourceItems.length})</h3>
          <div class="info-sources-grid">${sourceItems.map(item => Components.renderInfoSourceCard(item)).join('')}</div>
        </div>
      `;
    }

    if (ceoItems.length > 0) {
      html += `
        <div class="fav-section">
          <h3>${I18n.t('section_ceo')} (${ceoItems.length})</h3>
          <div class="cards-grid">${ceoItems.map(item => Components.renderCeoCard(item)).join('')}</div>
        </div>
      `;
    }

    if (dtcItems.length > 0) {
      html += `
        <div class="fav-section">
          <h3>${I18n.t('section_dtc')} (${dtcItems.length})</h3>
          <div class="cards-grid">${dtcItems.map(item => Components.renderDtcCard(item)).join('')}</div>
        </div>
      `;
    }

    main.innerHTML = html;
  }

  function renderCurrentPage() {
    if (currentPage === 'favorites') {
      renderFavoritesPage();
    } else {
      renderTabs();
      renderMarketContent();
    }
    I18n.updateUI();
  }

  // Init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { renderCurrentPage };
})();
