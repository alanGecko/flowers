let translations = {};

async function loadTranslations() {
    try {
        const response = await fetch("translations.json");
        translations = await response.json();
        const savedLang = localStorage.getItem('lang') || 'en';
        const switcherEl = document.getElementById('language-switcher');
        if (switcherEl) switcherEl.value = savedLang;
        updateLanguage(savedLang);
    } catch (error) {
        console.error("Error loading translations:", error);
        alert("Failed to load translations.");
    }
};

function updateLanguage(lang) {
    const elements = document.querySelectorAll("[data-lang]");
    elements.forEach(el => {
        const key = el.getAttribute("data-lang");
        if (translations[lang] && translations[lang][key]) {
            const value = String(translations[lang][key]).replace(/\n/g, '<br>');
            const tag = (el.tagName || '').toUpperCase();
            if (tag === 'INPUT' || tag === 'TEXTAREA') {
       
                el.placeholder = translations[lang][key];
            } else {  
                el.innerHTML = value;
            }
        }
    });

    
    try {
        localStorage.setItem('lang', lang);
    } catch (e) {
       
        console.warn('Could not persist language selection:', e);
    }
};


document.addEventListener("DOMContentLoaded", () => {
    const switcher = document.getElementById("language-switcher");

    const PAGES = ['index.html','LeLangagedesFleurs.html','hanakotoba.html'];
    const pageFetchCache = {};

    
    async function fetchPageDoc(url) {
        if (pageFetchCache[url]) return pageFetchCache[url];
        try {
            const resp = await fetch(url);
            const txt = await resp.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(txt, 'text/html');
            pageFetchCache[url] = doc;
            return doc;
        } catch (e) {
            console.warn('Failed to fetch page', url, e);
            return null;
        }
    }

    
    loadTranslations().then(() => {
        
        const noResultsEl = document.getElementById('no-results');
        const resultsDiv = document.getElementById('search-results');
        if (switcher) {
            switcher.addEventListener("change", (event) => {
                updateLanguage(event.target.value);

                if (searchBox && searchBox.value && searchBox.value.trim()) {
                    performSearch();
                }
            });
        }

        
        const searchBox = document.getElementById('search-box');
        const searchButton = document.getElementById('search-button');
        const clearButton = document.getElementById('clear-search');

        function makeResultLink(pageUrl, key, titleText, snippet) {
            const a = document.createElement('a');
            a.href = pageUrl + '#searchKey=' + encodeURIComponent(key);
            a.textContent = (titleText ? titleText + ' — ' : '') + (snippet || key);
            a.style.display = 'block';
            a.style.padding = '6px 10px';
            a.style.borderRadius = '6px';
            a.style.textDecoration = 'none';
            a.style.color = '#2c3e50';
            a.onmouseover = () => a.style.background = '#fafafa';
            a.onmouseout = () => a.style.background = 'transparent';
            return a;
        }

        async function crossPageSearch(q, lang) {
            const results = [];
            await Promise.all(PAGES.map(async (page) => {
                const doc = await fetchPageDoc(page);
                if (!doc) return;
     
                let pageTitle = (doc.querySelector('h1') && doc.querySelector('h1').textContent) || (doc.querySelector('title') && doc.querySelector('title').textContent) || page;
                
                const nodes = doc.querySelectorAll('[data-lang]');
                nodes.forEach(node => {
                    const key = node.getAttribute('data-lang');
                    let value = (translations[lang] && translations[lang][key]) ? String(translations[lang][key]) : (node.textContent || '');
                    if (value && value.toLowerCase().indexOf(q) !== -1) {
                       
                        const snippet = value.trim().replace(/\s+/g, ' ').slice(0, 120);
                        results.push({page, key, pageTitle, snippet});
                    }
                });
            }));
            return results;
        }

        function renderCrossResults(results) {
            if (!resultsDiv) return;
            resultsDiv.innerHTML = '';
            if (!results || results.length === 0) return;
            const heading = document.createElement('div');
            heading.textContent = results.length + ' result' + (results.length === 1 ? '' : 's');
            heading.style.margin = '6px 0 6px 6px';
            heading.style.fontWeight = '600';
            resultsDiv.appendChild(heading);
            results.forEach(r => {
                const a = makeResultLink(r.page, r.key, r.pageTitle, r.snippet);
                resultsDiv.appendChild(a);
            });
        }

        
        function handleHashJump() {
            const hash = window.location.hash || '';
            if (!hash) return;
            const m = hash.match(/searchKey=([^&]+)/);
            if (!m) return;
            const key = decodeURIComponent(m[1]);
            
            const el = document.querySelector('[data-lang="' + key + '"]');
            if (el) {
               
                const parentDetails = el.closest('details');
                if (parentDetails) parentDetails.open = true;
                
                el.scrollIntoView({behavior: 'smooth', block: 'center'});
               
                const highlightTarget = el.closest('.flowers') || el;
                highlightTarget.classList.add('search-highlight');
                setTimeout(() => highlightTarget.classList.remove('search-highlight'), 2500);
            }
        }

        async function performSearch() {
            const q = (searchBox && searchBox.value || '').trim().toLowerCase();
            const items = document.querySelectorAll('.content .flowers');
            
            items.forEach(it => it.style.display = '');
            if (!q) {
                if (noResultsEl) noResultsEl.style.display = 'none';
                if (resultsDiv) resultsDiv.innerHTML = '';
                return;
            }

            
            items.forEach(it => {
                const text = (it.innerText || it.textContent || '').toLowerCase();
                const match = text.indexOf(q) !== -1;
                it.style.display = match ? '' : 'none';
                if (match) {
                    const parentDetails = it.closest('details');
                    if (parentDetails) parentDetails.open = true;
                }
            });

            
            const lang = localStorage.getItem('lang') || (document.getElementById('language-switcher') && document.getElementById('language-switcher').value) || 'en';
            const crossResults = await crossPageSearch(q, lang);
            renderCrossResults(crossResults.filter(r => r.page !== location.pathname.split('/').pop()));

            
            const visible = Array.from(items).filter(i => i.style.display !== 'none');
            const anyCross = crossResults && crossResults.length > 0;
            if (noResultsEl) noResultsEl.style.display = (visible.length === 0 && !anyCross) ? '' : 'none';
        }

        if (searchButton && searchBox) {
            searchButton.addEventListener('click', performSearch);
            
            searchBox.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') performSearch();
            });
        }
        if (clearButton && searchBox) {
            clearButton.addEventListener('click', () => {
                searchBox.value = '';
                
                const items = document.querySelectorAll('.content .flowers');
                items.forEach(it => it.style.display = '');
                if (noResultsEl) noResultsEl.style.display = 'none';
                if (resultsDiv) resultsDiv.innerHTML = '';
            });
        }

        handleHashJump();

        window.addEventListener('hashchange', handleHashJump);

    }).catch(err => {
        console.warn('Translations failed to load; search still initialised where possible', err);
    });
});
function LeLangagedesFleurs() {
    window.location.href = "LeLangagedesFleurs.html";
};
function index() {
    window.location.href = "index.html";
};
function hanakotoba() {
    window.location.href = "Hanakotoba.html";
};