/**
 * Components Module - Reusable UI rendering functions
 */
const Components = (() => {

  // Helper: get original text field (prefer _ja for JP items, _en for US items)
  function orig(item, field) {
    return item[field + '_ja'] || item[field + '_en'] || item[field + '_zh'] || item[field] || '';
  }

  // Helper: get Chinese text field
  function zh(item, field) {
    return item[field + '_zh'] || item[field] || '';
  }

  // Helper: get display text based on language toggle
  function localized(item, field) {
    return I18n.isShowingOriginal() ? orig(item, field) : zh(item, field);
  }

  // Helper: detect if item is from JP market
  function isJP(item) {
    return (item.id || '').startsWith('jp-');
  }

  // Helper: get card lang toggle label
  function langLabel(item) {
    return isJP(item) ? '中/日' : '中/En';
  }

  function renderStatsBar(data, market) {
    const sources = data.sources ? data.sources.length : 0;
    const ceo = data.ceo ? data.ceo.length : 0;
    const dtc = data.dtc ? data.dtc.length : 0;
    const total = sources + ceo + dtc;
    const stats = DataStore.getUpdateStats(data);

    let updateInfoHtml = '';
    if (stats.latest) {
      const now = new Date();
      const lastDate = new Date(stats.latest);
      const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
      let freshnessClass = 'fresh';
      let freshnessIcon = '🟢';
      if (diffDays > 14) {
        freshnessClass = 'stale';
        freshnessIcon = '🔴';
      } else if (diffDays > 7) {
        freshnessClass = 'aging';
        freshnessIcon = '🟡';
      }

      const daysAgoText = diffDays === 0 ? I18n.t('update_today') :
        diffDays === 1 ? I18n.t('update_yesterday') :
        `${diffDays} ${I18n.t('update_days_ago')}`;

      updateInfoHtml = `
        <div class="update-info-bar fade-in">
          <div class="update-info-item">
            <span class="update-icon">${freshnessIcon}</span>
            <span class="update-label">${I18n.t('update_last')}:</span>
            <span class="update-value ${freshnessClass}">${stats.latest} (${daysAgoText})</span>
          </div>
          <div class="update-info-item">
            <span class="update-icon">📅</span>
            <span class="update-label">${I18n.t('update_range')}:</span>
            <span class="update-value">${stats.earliest} ~ ${stats.latest}</span>
          </div>
          <div class="update-info-item">
            <span class="update-icon">🔄</span>
            <span class="update-label">${I18n.t('update_freq_label')}:</span>
            <span class="update-value">${I18n.t('update_freq_value')}</span>
          </div>
        </div>
      `;
    }

    return `
      <div class="stats-banner fade-in">
        <div class="stat-item">
          <div class="stat-number">${total}</div>
          <div class="stat-label">${I18n.t('stat_companies')}</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${sources}</div>
          <div class="stat-label">${I18n.t('stat_sources')}</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${ceo}</div>
          <div class="stat-label">${I18n.t('stat_ceo')}</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${dtc}</div>
          <div class="stat-label">${I18n.t('stat_dtc')}</div>
        </div>
      </div>
      ${updateInfoHtml}
    `;
  }

  function renderInfoSourceCard(item) {
    const id = item.id || item.name;
    const isFav = Favorites.isFavorited(id);

    return `
      <div class="info-source-card fade-in" data-id="${id}" data-type="source">
        <div class="info-source-icon">${item.icon || '🌐'}</div>
        <div class="info-source-content">
          <div class="info-source-name">
            <a href="${item.url}" target="_blank" rel="noopener">${localized(item, 'name')}</a>
          </div>
          <div class="info-source-desc">${localized(item, 'desc')}</div>
        </div>
        <button class="btn-icon source-fav-btn ${isFav ? 'favorited' : ''}" onclick="Components.toggleFav('${id}', this)" title="${isFav ? I18n.t('unfav_btn') : I18n.t('fav_btn')}">
          ${isFav ? '★' : '☆'}
        </button>
      </div>
    `;
  }

  function renderCeoCard(item) {
    const isFav = Favorites.isFavorited(item.id);
    const badgeClass = {
      'podcast': 'badge-podcast',
      'video': 'badge-video',
      'article': 'badge-article',
      'interview': 'badge-interview',
    }[item.type] || 'badge-article';

    const typeLabel = {
      'podcast': '播客 Podcast',
      'video': '视频 Video',
      'article': '文章 Article',
      'interview': '访谈 Interview',
    }[item.type] || item.type;

    return `
      <div class="card fade-in" data-id="${item.id}" data-type="ceo" data-date="${item.date || ''}">
        <div class="card-header">
          <div class="card-title-area">
            <div class="card-title">
              <span class="content-type-badge ${badgeClass}">${typeLabel}</span>
            </div>
            <div style="font-size:15px;font-weight:600;margin-top:6px;">
              ${localized(item, 'title')}
            </div>
            <div class="card-subtitle">${localized(item, 'speaker')} · ${item.company || item.company_zh || ''}</div>
          </div>
          <div class="card-actions">
            <button class="btn-icon card-lang-toggle ${I18n.isShowingOriginal() ? 'showing-original' : ''}" onclick="Components.toggleCardLang(this)" title="${I18n.t('show_original')}">${langLabel(item)}</button>
            <button class="btn-icon ${isFav ? 'favorited' : ''}" onclick="Components.toggleFav('${item.id}', this)" title="${isFav ? I18n.t('unfav_btn') : I18n.t('fav_btn')}">
              ${isFav ? '★' : '☆'}
            </button>
          </div>
        </div>
        <div class="card-body">
          <div class="card-desc">${zh(item, 'desc')}</div>
          <div class="card-desc-original ${I18n.isShowingOriginal() ? 'show' : ''}">${orig(item, 'desc')}</div>
        </div>
        <div class="card-tags">
          ${(item.tags || []).map(tag => `<span class="tag tag-ceo">${tag}</span>`).join('')}
          ${item.market_zh ? `<span class="tag tag-market">${localized(item, 'market')}</span>` : ''}
        </div>
        <div class="card-footer">
          <div class="card-source">
            ${I18n.t('source_label')} <a href="${item.source_url}" target="_blank" rel="noopener">${item.source_name || '查看原文'}</a>
          </div>
          <div class="card-date">${item.date || ''}</div>
        </div>
      </div>
    `;
  }

  function renderDtcCard(item) {
    const isFav = Favorites.isFavorited(item.id);

    return `
      <div class="card fade-in" data-id="${item.id}" data-type="dtc" data-date="${item.date || ''}">
        <div class="card-header">
          <div class="card-title-area">
            <div class="card-title">
              <a href="${item.url || '#'}" target="_blank" rel="noopener">${localized(item, 'name')}</a>
            </div>
            <div class="card-subtitle">${localized(item, 'tagline')}</div>
          </div>
          <div class="card-actions">
            <button class="btn-icon card-lang-toggle ${I18n.isShowingOriginal() ? 'showing-original' : ''}" onclick="Components.toggleCardLang(this)" title="${I18n.t('show_original')}">${langLabel(item)}</button>
            <button class="btn-icon ${isFav ? 'favorited' : ''}" onclick="Components.toggleFav('${item.id}', this)" title="${isFav ? I18n.t('unfav_btn') : I18n.t('fav_btn')}">
              ${isFav ? '★' : '☆'}
            </button>
          </div>
        </div>
        <div class="card-body">
          <div class="card-desc">${zh(item, 'desc')}</div>
          <div class="card-desc-original ${I18n.isShowingOriginal() ? 'show' : ''}">${orig(item, 'desc')}</div>
        </div>
        <div class="card-tags">
          ${item.category_zh ? `<span class="tag tag-category">${localized(item, 'category')}</span>` : ''}
          ${item.market_zh ? `<span class="tag tag-market">${localized(item, 'market')}</span>` : ''}
          ${(item.tags || []).map(tag => `<span class="tag tag-dtc">${tag}</span>`).join('')}
        </div>
        <div class="card-footer">
          <div class="card-source">
            ${item.founded ? `成立: ${item.founded}` : ''}
            ${item.funding ? ` · ${item.funding}` : ''}
            ${item.source_url ? ` · <a href="${item.source_url}" target="_blank" rel="noopener">${item.source_name || '来源'}</a>` : ''}
          </div>
          <div class="card-date">${item.date || ''}</div>
        </div>
      </div>
    `;
  }

  // Toggle individual card language
  function toggleCardLang(btn) {
    const card = btn.closest('.card') || btn.closest('.info-source-card');
    if (!card) return;
    const originals = card.querySelectorAll('.card-desc-original');
    originals.forEach(el => el.classList.toggle('show'));
    btn.classList.toggle('showing-original');
  }

  // Toggle favorite
  function toggleFav(id, btn) {
    const isFav = Favorites.toggle(id);
    btn.classList.toggle('favorited', isFav);
    btn.innerHTML = isFav ? '★' : '☆';
    btn.title = isFav ? I18n.t('unfav_btn') : I18n.t('fav_btn');
  }

  function renderEmpty(type) {
    if (type === 'favorites') {
      return `
        <div class="empty-state">
          <div class="empty-icon">⭐</div>
          <h3>${I18n.t('empty_fav')}</h3>
          <p>${I18n.t('empty_fav_desc')}</p>
        </div>
      `;
    }
    return `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>${I18n.t('empty_results')}</h3>
        <p>${I18n.t('empty_results_desc')}</p>
      </div>
    `;
  }

  return {
    renderStatsBar,
    renderInfoSourceCard,
    renderCeoCard,
    renderDtcCard,
    renderEmpty,
    toggleCardLang,
    toggleFav,
  };
})();
