/**
 * i18n Module - Language toggle between Chinese (default) and original language
 */
const I18n = (() => {
  let showOriginal = false;

  const uiStrings = {
    zh: {
      logo: '创业信息雷达',
      nav_us: '北美市场',
      nav_jp: '日本市场',
      nav_fav: '我的收藏',
      lang_toggle: '显示原文',
      filter_date: '日期筛选:',
      filter_apply: '应用',
      filter_clear: '清除',
      search_placeholder: '搜索公司、产品、关键词...',
      footer_text: '创业信息雷达 - 每日更新的创业生态信息聚合平台',
      footer_note: '数据仅供参考，不构成投资建议',
      tab_all: '全部',
      tab_startups: '创业信息源',
      tab_ceo: 'CEO分享',
      tab_dtc: 'DTC品牌',
      fav_btn: '收藏',
      unfav_btn: '取消收藏',
      show_original: '原文',
      show_translated: '译文',
      source_label: '来源:',
      empty_fav: '还没有收藏任何内容',
      empty_fav_desc: '浏览北美或日本市场页面，点击星标收藏感兴趣的内容',
      empty_results: '没有找到匹配的结果',
      empty_results_desc: '试试调整筛选条件或搜索关键词',
      us_title: '北美市场',
      us_desc: '北美创业生态信息聚合 - 新兴公司、CEO分享、DTC品牌追踪',
      jp_title: '日本市场',
      jp_desc: '日本创业生态信息聚合 - 新兴公司、CEO分享、消费品牌追踪',
      fav_title: '我的收藏',
      fav_desc: '你收藏的所有信息条目',
      section_sources: '优质创业信息源',
      section_sources_desc: '高质量信息源网站推荐，帮助你发现新兴且快速发展的公司',
      section_ceo: 'CEO分享与访谈',
      section_ceo_desc: '成长期公司CEO的播客、视频、访谈、文章等深度内容',
      section_dtc: 'DTC品牌与优质服务',
      section_dtc_desc: '新兴直面消费者品牌，尤其是展现出高速增长潜力的初创品牌',
      stat_companies: '追踪公司',
      stat_sources: '信息源',
      stat_ceo: 'CEO内容',
      stat_dtc: 'DTC品牌',
    },
    en: {
      logo: 'Startup Info Radar',
      nav_us: 'US Market',
      nav_jp: 'Japan Market',
      nav_fav: 'Favorites',
      lang_toggle: 'Show Chinese',
      filter_date: 'Date Filter:',
      filter_apply: 'Apply',
      filter_clear: 'Clear',
      search_placeholder: 'Search companies, products, keywords...',
      footer_text: 'Startup Info Radar - Daily updated startup ecosystem intelligence',
      footer_note: 'For reference only, not investment advice',
      tab_all: 'All',
      tab_startups: 'Startup Sources',
      tab_ceo: 'CEO Talks',
      tab_dtc: 'DTC Brands',
      fav_btn: 'Favorite',
      unfav_btn: 'Unfavorite',
      show_original: 'Original',
      show_translated: 'Translated',
      source_label: 'Source:',
      empty_fav: 'No favorites yet',
      empty_fav_desc: 'Browse US or Japan market pages and star items you find interesting',
      empty_results: 'No matching results',
      empty_results_desc: 'Try adjusting your filters or search keywords',
      us_title: 'US Market',
      us_desc: 'US startup ecosystem intelligence - emerging companies, CEO talks, DTC brand tracking',
      jp_title: 'Japan Market',
      jp_desc: 'Japan startup ecosystem intelligence - emerging companies, CEO talks, consumer brand tracking',
      fav_title: 'Favorites',
      fav_desc: 'All your saved items',
      section_sources: 'Quality Startup Info Sources',
      section_sources_desc: 'Curated high-quality info sources to help you discover fast-growing companies',
      section_ceo: 'CEO Talks & Interviews',
      section_ceo_desc: 'Podcasts, videos, interviews, and articles from growth-stage company CEOs',
      section_dtc: 'DTC Brands & Quality Services',
      section_dtc_desc: 'Emerging direct-to-consumer brands showing high-growth potential',
      stat_companies: 'Companies',
      stat_sources: 'Sources',
      stat_ceo: 'CEO Content',
      stat_dtc: 'DTC Brands',
    }
  };

  function isShowingOriginal() {
    return showOriginal;
  }

  function toggle() {
    showOriginal = !showOriginal;
    updateUI();
    return showOriginal;
  }

  function t(key) {
    const lang = showOriginal ? 'en' : 'zh';
    return uiStrings[lang][key] || uiStrings['zh'][key] || key;
  }

  function updateUI() {
    // Update all data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });

    // Update all data-i18n-placeholder elements
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });

    // Update lang toggle button state
    const langBtn = document.getElementById('langToggle');
    if (langBtn) {
      langBtn.classList.toggle('active', showOriginal);
    }

    // Toggle original text visibility on cards
    document.querySelectorAll('.card-desc-original').forEach(el => {
      el.classList.toggle('show', showOriginal);
    });
  }

  return { isShowingOriginal, toggle, t, updateUI };
})();
