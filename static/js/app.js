document.addEventListener('DOMContentLoaded', () => {
    // State
    let allNotes = [];
    let selectedNoteIds = new Set();
    let activeCategory = 'ALL';
    let searchQuery = '';
    let sortOrder = 'newest';
    let activeNoteForModal = null;
    let activeTemplateStyle = 'quick';

    // Theme Toggle Elements
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    const themeLabel = document.getElementById('themeLabel');

    // DOM Elements
    const refreshBtn = document.getElementById('refreshBtn');
    const statusText = document.getElementById('statusText');
    const lastUpdated = document.getElementById('lastUpdated');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const categoryPills = document.getElementById('categoryPills');
    const sortSelect = document.getElementById('sortSelect');
    const notesGrid = document.getElementById('notesGrid');
    const emptyState = document.getElementById('emptyState');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const visibleCount = document.getElementById('visibleCount');
    const selectedCount = document.getElementById('selectedCount');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const batchTweetBtn = document.getElementById('batchTweetBtn');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const deselectAllBtn = document.getElementById('deselectAllBtn');

    // Theme Initialization
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
        if (themeIcon) themeIcon.textContent = '☀️';
        if (themeLabel) themeLabel.textContent = 'Light';
    } else {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
        if (themeIcon) themeIcon.textContent = '🌙';
        if (themeLabel) themeLabel.textContent = 'Dark';
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isLight = document.body.classList.contains('light-theme');
            if (isLight) {
                document.body.classList.remove('light-theme');
                document.body.classList.add('dark-theme');
                themeIcon.textContent = '🌙';
                themeLabel.textContent = 'Dark';
                localStorage.setItem('theme', 'dark');
                showToast('Switched to Dark Mode', 'info');
            } else {
                document.body.classList.remove('dark-theme');
                document.body.classList.add('light-theme');
                themeIcon.textContent = '☀️';
                themeLabel.textContent = 'Light';
                localStorage.setItem('theme', 'light');
                showToast('Switched to Light Mode', 'info');
            }
        });
    }

    // Category Count Elements
    const countAll = document.getElementById('countAll');
    const countFeature = document.getElementById('countFeature');
    const countChange = document.getElementById('countChange');
    const countDeprecated = document.getElementById('countDeprecated');

    // Modal Elements
    const tweetModal = document.getElementById('tweetModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const tweetTextarea = document.getElementById('tweetTextarea');
    const charCounter = document.getElementById('charCounter');
    const charProgress = document.getElementById('charProgress');
    const modalCategoryBadge = document.getElementById('modalCategoryBadge');
    const modalDateTitle = document.getElementById('modalDateTitle');
    const modalPreviewText = document.getElementById('modalPreviewText');
    const copyTweetBtn = document.getElementById('copyTweetBtn');
    const postTweetBtn = document.getElementById('postTweetBtn');

    // Initialize
    fetchNotes(false);

    // Event Listeners
    refreshBtn.addEventListener('click', () => fetchNotes(true));

    // Export CSV Handler
    exportCsvBtn.addEventListener('click', () => {
        const notesToExport = selectedNoteIds.size > 0 
            ? allNotes.filter(n => selectedNoteIds.has(n.id))
            : getFilteredNotes();
        
        if (notesToExport.length === 0) {
            showToast('No notes available to export', 'error');
            return;
        }
        
        let csvContent = 'Date,Category,Summary,Link\n';
        notesToExport.forEach(n => {
            const safeDate = `"${(n.date_title || '').replace(/"/g, '""')}"`;
            const safeCat = `"${(n.category || '').replace(/"/g, '""')}"`;
            const safeText = `"${(n.plain_text || '').replace(/"/g, '""')}"`;
            const safeLink = `"${(n.link || '').replace(/"/g, '""')}"`;
            csvContent += `${safeDate},${safeCat},${safeText},${safeLink}\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `bigquery_release_notes_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`Exported ${notesToExport.length} release note(s) to CSV!`, 'success');
    });

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.hidden = !searchQuery;
        renderNotes();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.hidden = true;
        renderNotes();
    });

    categoryPills.addEventListener('click', (e) => {
        const btn = e.target.closest('.pill');
        if (!btn) return;
        
        categoryPills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.dataset.category;
        renderNotes();
    });

    sortSelect.addEventListener('change', (e) => {
        sortOrder = e.target.value;
        renderNotes();
    });

    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.hidden = true;
        activeCategory = 'ALL';
        categoryPills.querySelectorAll('.pill').forEach(p => {
            p.classList.toggle('active', p.dataset.category === 'ALL');
        });
        renderNotes();
    });

    selectAllBtn.addEventListener('click', () => {
        getFilteredNotes().forEach(note => selectedNoteIds.add(note.id));
        updateSelectedUI();
        renderNotes();
    });

    deselectAllBtn.addEventListener('click', () => {
        selectedNoteIds.clear();
        updateSelectedUI();
        renderNotes();
    });

    batchTweetBtn.addEventListener('click', () => {
        if (selectedNoteIds.size === 0) return;
        const selectedNotes = allNotes.filter(n => selectedNoteIds.has(n.id));
        openTweetModal(selectedNotes);
    });

    // Fetch API
    async function fetchNotes(forceRefresh = false) {
        refreshBtn.classList.add('loading');
        statusText.textContent = forceRefresh ? 'Refreshing...' : 'Loading...';

        try {
            const url = forceRefresh ? '/api/release-notes?refresh=true' : '/api/release-notes';
            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'success' || data.status === 'warning') {
                allNotes = data.notes || [];
                lastUpdated.textContent = `Updated: ${data.last_updated || 'Just now'}`;
                statusText.textContent = `Live Feed (${data.count} updates)`;
                
                updateCategoryCounts();
                renderNotes();
                
                if (forceRefresh) {
                    showToast('Release notes successfully refreshed!', 'success');
                }
            } else {
                showToast(data.message || 'Error loading release notes', 'error');
                statusText.textContent = 'Feed Error';
            }
        } catch (err) {
            console.error('Fetch error:', err);
            showToast('Network error fetching release notes feed', 'error');
            statusText.textContent = 'Connection Error';
        } finally {
            refreshBtn.classList.remove('loading');
        }
    }

    function updateCategoryCounts() {
        const counts = { ALL: allNotes.length, Feature: 0, Change: 0, Deprecated: 0 };
        allNotes.forEach(n => {
            if (counts[n.category] !== undefined) {
                counts[n.category]++;
            }
        });
        countAll.textContent = counts.ALL;
        countFeature.textContent = counts.Feature;
        countChange.textContent = counts.Change;
        countDeprecated.textContent = counts.Deprecated;
    }

    function getFilteredNotes() {
        return allNotes.filter(note => {
            const matchesCat = activeCategory === 'ALL' || note.category === activeCategory;
            const matchesSearch = !searchQuery || 
                note.date_title.toLowerCase().includes(searchQuery) ||
                note.category.toLowerCase().includes(searchQuery) ||
                note.plain_text.toLowerCase().includes(searchQuery);
            return matchesCat && matchesSearch;
        }).sort((a, b) => {
            return sortOrder === 'newest' ? b.id.localeCompare(a.id, undefined, {numeric: true}) : a.id.localeCompare(b.id, undefined, {numeric: true});
        });
    }

    function renderNotes() {
        const filtered = getFilteredNotes();
        visibleCount.textContent = filtered.length;

        if (filtered.length === 0) {
            notesGrid.innerHTML = '';
            emptyState.hidden = false;
            return;
        }

        emptyState.hidden = true;

        notesGrid.innerHTML = filtered.map(note => {
            const isSelected = selectedNoteIds.has(note.id);
            return `
                <div class="note-card ${isSelected ? 'selected' : ''}" data-id="${note.id}">
                    <div class="card-top">
                        <span class="badge-tag ${note.category}">${note.category}</span>
                        <div class="card-meta">
                            <span class="date-label">${note.date_title}</span>
                            <input type="checkbox" class="select-checkbox" ${isSelected ? 'checked' : ''} data-id="${note.id}" title="Select for Tweet Digest">
                        </div>
                    </div>
                    <div class="card-body">
                        ${note.content_html}
                    </div>
                    <div class="card-actions">
                        <button class="btn-card-action btn-card-tweet" data-action="tweet" data-id="${note.id}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            <span>Tweet</span>
                        </button>
                        <button class="btn-card-action" data-action="copy-text" data-id="${note.id}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            </svg>
                            <span>Copy Text</span>
                        </button>
                        <button class="btn-card-action" data-action="copy" data-link="${note.link}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>Copy Link</span>
                        </button>
                        <a href="${note.link}" target="_blank" rel="noopener noreferrer" class="btn-card-action" style="text-decoration: none;">
                            <span>Docs</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </a>
                    </div>
                </div>
            `;
        }).join('');

        // Delegate event listeners for cards
        notesGrid.querySelectorAll('.note-card').forEach(card => {
            const id = card.dataset.id;
            
            // Checkbox toggle
            const checkbox = card.querySelector('.select-checkbox');
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                if (e.target.checked) {
                    selectedNoteIds.add(id);
                    card.classList.add('selected');
                } else {
                    selectedNoteIds.delete(id);
                    card.classList.remove('selected');
                }
                updateSelectedUI();
            });

            // Action Buttons
            card.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    const note = allNotes.find(n => n.id === id);
                    
                    if (action === 'tweet') {
                        openTweetModal(note);
                    } else if (action === 'copy-text') {
                        if (note) {
                            const fullCopyText = `${note.date_title} [${note.category}]: ${note.plain_text}\nLink: ${note.link}`;
                            copyToClipboard(fullCopyText);
                            showToast('Release note text copied to clipboard!', 'success');
                        }
                    } else if (action === 'copy') {
                        const link = btn.dataset.link;
                        copyToClipboard(link);
                        showToast('Direct link copied to clipboard!', 'info');
                    }
                });
            });
        });
    }

    function updateSelectedUI() {
        const count = selectedNoteIds.size;
        selectedCount.textContent = count;
        batchTweetBtn.disabled = count === 0;
    }

    // Modal Logic
    function openTweetModal(target) {
        if (Array.isArray(target)) {
            // Batch Digest Tweet
            activeNoteForModal = target;
            modalCategoryBadge.textContent = 'Digest';
            modalDateTitle.textContent = `${target.length} Updates Selected`;
            modalPreviewText.textContent = target.map(n => `• [${n.category}] ${n.date_title}: ${n.plain_text.substring(0, 80)}...`).join('\n');
            generateTweetText('digest', target);
        } else {
            // Single Note Tweet
            activeNoteForModal = target;
            modalCategoryBadge.textContent = target.category;
            modalDateTitle.textContent = target.date_title;
            modalPreviewText.textContent = target.plain_text;
            generateTweetText(activeTemplateStyle, target);
        }

        tweetModal.classList.add('active');
        updateCharCount();
    }

    function generateTweetText(style, noteOrNotes) {
        if (Array.isArray(noteOrNotes)) {
            const listText = noteOrNotes.slice(0, 3).map(n => `🔹 ${n.category}: ${n.plain_text.substring(0, 60)}...`).join('\n');
            tweetTextarea.value = `📊 Google Cloud BigQuery Updates Digest:\n\n${listText}\n\n🔗 ${noteOrNotes[0].link}\n#BigQuery #GoogleCloud #DataEngineering`;
            return;
        }

        const note = noteOrNotes;
        const snippet = note.plain_text.length > 140 ? note.plain_text.substring(0, 140) + '...' : note.plain_text;

        switch (style) {
            case 'launch':
                tweetTextarea.value = `🚀 BigQuery Launch (${note.date_title}):\n\n${snippet}\n\n🔗 Learn more: ${note.link}\n#GoogleCloud #BigQuery #CloudData`;
                break;
            case 'insight':
                tweetTextarea.value = `💡 Useful BigQuery ${note.category}:\n${snippet}\n\n📌 Check details: ${note.link}\n#DataAnalytics #BigQuery`;
                break;
            case 'thread':
                tweetTextarea.value = `🧵 New in BigQuery (${note.date_title}):\n\n${snippet}\n\nFull release notes 👇\n🔗 ${note.link}\n#BigQuery #DataEngineering`;
                break;
            case 'quick':
            default:
                tweetTextarea.value = `⚡ BigQuery ${note.category} (${note.date_title}):\n${snippet}\n\n🔗 ${note.link}\n#BigQuery #GoogleCloud`;
                break;
        }

        updateCharCount();
    }

    // Template style switcher
    document.querySelectorAll('.btn-template').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-template').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTemplateStyle = btn.dataset.style;
            if (activeNoteForModal) {
                generateTweetText(activeTemplateStyle, activeNoteForModal);
            }
        });
    });

    // Hashtags click
    document.querySelectorAll('.btn-tag').forEach(tagBtn => {
        tagBtn.addEventListener('click', () => {
            const tag = tagBtn.dataset.tag;
            if (!tweetTextarea.value.includes(tag)) {
                tweetTextarea.value = tweetTextarea.value.trim() + ' ' + tag;
                updateCharCount();
            }
        });
    });

    tweetTextarea.addEventListener('input', updateCharCount);

    function updateCharCount() {
        const len = tweetTextarea.value.length;
        const remaining = 280 - len;
        charCounter.textContent = remaining;

        charCounter.classList.toggle('warning', remaining <= 30 && remaining > 0);
        charCounter.classList.toggle('danger', remaining <= 0);

        // Circular ring progress (r=10 => circumference ~62.83)
        const circumference = 2 * Math.PI * 10;
        const progress = Math.min(len / 280, 1);
        const offset = circumference - (progress * circumference);
        charProgress.style.strokeDasharray = `${circumference} ${circumference}`;
        charProgress.style.strokeDashoffset = offset;
        charProgress.style.stroke = remaining <= 0 ? '#ef4444' : (remaining <= 30 ? '#f59e0b' : '#4285F4');
    }

    closeModalBtn.addEventListener('click', () => tweetModal.classList.remove('active'));
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) tweetModal.classList.remove('active');
    });

    copyTweetBtn.addEventListener('click', () => {
        copyToClipboard(tweetTextarea.value);
        showToast('Tweet text copied to clipboard!', 'success');
    });

    postTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(intentUrl, '_blank', 'noopener,noreferrer');
        showToast('Opening X / Twitter intent composer...', 'info');
        tweetModal.classList.remove('active');
    });

    // Toast Utility
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span>${type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️')}</span>
            <span>${message}</span>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    function copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text);
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    }
});
