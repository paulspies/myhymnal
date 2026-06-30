let hymnsData = null;
let currentSongIndex = -1;
let filteredSongs = [];
let touchStartX = 0;
let touchEndX = 0;
let currentSections = [];
let cachedSectionPositions = [];
let scrollRAF = null;

function init() {
    hymnsData = HYMNAL_DATA;
    filteredSongs = [...hymnsData.songs];
    // Sort by page by default
    sortByPage();
    renderSongList();
    loadPreferences();
    setupEventListeners();
    renderHomeFavorites();
}

function setupEventListeners() {
    document.getElementById('menuBtn').addEventListener('click', openMenu);
    document.getElementById('homeBtn').addEventListener('click', goHome);
    document.getElementById('closeMenuBtn').addEventListener('click', closeMenu);
    document.getElementById('overlay').addEventListener('click', closeAll);
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('closeSettingsBtn').addEventListener('click', closeSettings);
    document.getElementById('prevBtn').addEventListener('click', () => navigateToSong(-1));
    document.getElementById('nextBtn').addEventListener('click', () => navigateToSong(1));
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('sortAlpha').addEventListener('click', () => setSortMode('alpha'));
    document.getElementById('sortPage').addEventListener('click', () => setSortMode('page'));
    document.getElementById('sortFavorites').addEventListener('click', () => setSortMode('favorites'));
    document.getElementById('fontSizeSlider').addEventListener('input', handleFontSizeChange);
    document.getElementById('spacingSlider').addEventListener('input', handleSpacingChange);
    document.getElementById('showSheetMusic').addEventListener('change', handleSheetMusicToggle);
    document.getElementById('colorTheme').addEventListener('change', handleColorThemeChange);
    document.getElementById('mainContent').addEventListener('touchstart', handleTouchStart, { passive: true });
    document.getElementById('mainContent').addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('keydown', handleKeyPress);
    window.addEventListener('resize', () => {
        if (currentSections.length) {
            requestAnimationFrame(() => {
                setLyricSpacer();
                cacheSectionPositions();
                updateActiveTab();
            });
        }
    });
}

function openMenu() {
    document.getElementById('sideMenu').classList.add('open');
    document.getElementById('overlay').classList.add('active');
}



function viewAllFavorites() {
    openMenu();
    setSortMode('favorites');
}

function renderHomeFavorites() {
    const favorites = getFavorites();
    const section = document.getElementById('favoritesHomeSection');
    const list = document.getElementById('favoritesHomeList');
    
    if (favorites.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    const favoriteSongs = hymnsData.songs.filter(song => favorites.includes(song.id));
    
    // Show only first 5
    const displayCount = 5;
    const songsToShow = favoriteSongs.slice(0, displayCount);
    const hasMore = favoriteSongs.length > displayCount;
    
    list.innerHTML = songsToShow.map(song => `
        <div style="padding: 12px 15px; border-bottom: 1px solid #EEE; cursor: pointer; transition: background 0.2s;" 
             onclick="selectSongById(${song.id})"
             onmouseover="this.style.background='#F5F5F5'" 
             onmouseout="this.style.background='white'">
            <div style="font-size: 16px; color: var(--text-color); font-weight: 500;">${song.title}</div>
            ${song.page ? `<div style="font-size: 14px; color: #666; margin-top: 2px;">Page ${song.page}</div>` : ''}
        </div>
    `).join('');
    
    // Add "View All" button if there are more than 5
    if (hasMore) {
        list.innerHTML += `
            <div style="padding: 15px; text-align: center; border-top: 2px solid #EEE; background: #F9F9F9;">
                <button onclick="viewAllFavorites()" style="background: var(--primary-color); color: white; border: none; padding: 10px 20px; border-radius: 5px; font-size: 14px; cursor: pointer; font-family: Georgia, serif;">
                    View All ${favoriteSongs.length} Favorites
                </button>
            </div>
        `;
    }
}

function selectSongById(songId) {
    const index = filteredSongs.findIndex(song => song.id === songId);
    if (index !== -1) {
        selectSong(index);
    } else {
        // If not in current filtered list, switch to all songs
        filteredSongs = [...hymnsData.songs];
        const newIndex = filteredSongs.findIndex(song => song.id === songId);
        if (newIndex !== -1) {
            selectSong(newIndex);
        }
    }
}

function goHome() {
    currentSongIndex = -1;
    if (scrollRAF) { cancelAnimationFrame(scrollRAF); scrollRAF = null; }
    cachedSectionPositions = [];
    renderBookTabs([], false);
    document.querySelector('.welcome-screen').style.display = 'block';
    document.getElementById('songDisplay').style.display = 'none';
    document.getElementById('songTitle').textContent = 'Heart-Warming Songs & Hymns';
    document.getElementById('pageNumber').textContent = '';
    document.getElementById('prevBtn').style.display = 'none';
    document.getElementById('prevBtn').style.visibility = 'hidden';
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('nextBtn').style.visibility = 'hidden';
    closeMenu();
    renderHomeFavorites();
}

function closeMenu() {
    document.getElementById('sideMenu').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
}

function openSettings() {
    document.getElementById('settingsPanel').classList.add('open');
    document.getElementById('overlay').classList.add('active');
}

function closeSettings() {
    document.getElementById('settingsPanel').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
}

function closeAll() {
    closeMenu();
    closeSettings();
}

function renderSongList() {
    const songList = document.getElementById('songList');
    const favorites = getFavorites();
    songList.innerHTML = '';
    filteredSongs.forEach((song, index) => {
        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        const isFavorite = favorites.includes(song.id);
        const starIcon = isFavorite ? '★' : '☆';
        songItem.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                <div style="flex: 1; min-width: 0; cursor: pointer;" class="song-info">
                    <div class="song-item-title">${song.title}</div>
                    ${song.page ? `<div class="song-item-page">Page ${song.page}</div>` : ''}
                </div>
                <button class="star-btn" data-song-id="${song.id}" style="background: none; border: none; font-size: 28px; cursor: pointer; padding: 12px; color: #4a90b8; flex-shrink: 0; min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center;">
                    ${starIcon}
                </button>
            </div>
        `;
        songItem.querySelector('.song-info').addEventListener('click', () => selectSong(index));

        songItem.querySelector('.star-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(song.id);
            renderSongList();
        });
        songList.appendChild(songItem);
    });
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    if (query === '') {
        filteredSongs = [...hymnsData.songs];
    } else {
        filteredSongs = hymnsData.songs.filter(song => {
            if (!song || !song.title) return false;
            
            // Search by title - starts with query
            const titleMatch = song.title.toLowerCase().startsWith(query);
            
            // Search by page number - starts with query
            const pageMatch = song.page && song.page.toString().startsWith(query);
            
            return titleMatch || pageMatch;
        });
    }

    renderSongList();
}

function setSortMode(mode) {
    // Update button styles
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.style.background = '#EEE';
        btn.style.color = '#666';
        btn.classList.remove('active');
    });
    
    const activeBtn = mode === 'alpha' ? document.getElementById('sortAlpha') :
                      mode === 'page' ? document.getElementById('sortPage') :
                      document.getElementById('sortFavorites');
    activeBtn.style.background = 'var(--primary-color)';
    activeBtn.style.color = 'white';
    activeBtn.classList.add('active');
    
    // Filter and sort
    if (mode === 'favorites') {
        const favorites = getFavorites();
        filteredSongs = hymnsData.songs.filter(song => favorites.includes(song.id));
        // Sort favorites alphabetically
        filteredSongs.sort((a, b) => {
            const cleanA = a.title.replace(/['"!,.-]/g, '').trim();
            const cleanB = b.title.replace(/['"!,.-]/g, '').trim();
            return cleanA.localeCompare(cleanB);
        });
    } else if (mode === 'page') {
        filteredSongs = [...hymnsData.songs];
        sortByPage();
    } else {
        filteredSongs = [...hymnsData.songs];
        filteredSongs.sort((a, b) => {
            const cleanA = a.title.replace(/['"!,.-]/g, '').trim();
            const cleanB = b.title.replace(/['"!,.-]/g, '').trim();
            return cleanA.localeCompare(cleanB);
        });
    }
    renderSongList();
}

function sortByPage() {
    filteredSongs.sort((a, b) => {
        if (a.page === null) return 1;
        if (b.page === null) return -1;
        return a.page - b.page;
    });
}

function selectSong(index) {
    currentSongIndex = index;
    const song = filteredSongs[index];
    document.getElementById('pageNumber').textContent = song.page ? `Page ${song.page}` : '';
    document.getElementById('songTitle').textContent = song.title;
    document.querySelector('.welcome-screen').style.display = 'none';
    document.getElementById('songDisplay').style.display = 'block';
    
    // Show/hide navigation buttons (using visibility to maintain space)
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    if (index > 0) {
        prevBtn.style.display = 'flex';
        prevBtn.style.visibility = 'visible';
    } else {
        prevBtn.style.visibility = 'hidden';
    }
    if (index < filteredSongs.length - 1) {
        nextBtn.style.display = 'flex';
        nextBtn.style.visibility = 'visible';
    } else {
        nextBtn.style.visibility = 'hidden';
    }
    const lyricsContent = document.getElementById('lyricsContent');
    if (song.lyrics) {
        lyricsContent.innerHTML = formatLyrics(song.lyrics, song.chords);
        const verseNums = [...new Set([...song.lyrics.matchAll(/^(\d+)\./gm)].map(m => m[1]))];
        renderBookTabs(verseNums, /^Chorus:/m.test(song.lyrics));
    } else {
        lyricsContent.innerHTML = '<p style="text-align: center; color: #999; font-style: italic;">Lyrics not yet available for this song.</p>';
        renderBookTabs([], false);
    }
    const showSheetMusic = document.getElementById('showSheetMusic').checked;
    const sheetMusicContainer = document.getElementById('sheetMusicContainer');
    const sheetMusicContent = document.getElementById('sheetMusicContent');
    
    if (showSheetMusic && song.sheetMusic) {
        // Check if it's a PDF or image
        if (song.sheetMusic.toLowerCase().endsWith('.pdf')) {
            // Display PDF in iframe
            sheetMusicContent.innerHTML = `<iframe src="${song.sheetMusic}" style="width: 100%; height: 600px; border: 1px solid #DDD; border-radius: 5px;"></iframe>`;
        } else {
            // Display image
            sheetMusicContent.innerHTML = `<img src="${song.sheetMusic}" alt="Sheet Music" style="max-width: 100%; height: auto; border: 1px solid #DDD; border-radius: 5px;">`;
        }
        sheetMusicContainer.style.display = 'block';
    } else {
        sheetMusicContainer.style.display = 'none';
        sheetMusicContent.innerHTML = '';
    }
    closeMenu();
    document.getElementById('mainContent').scrollTop = 0;
}

function jumpToSection(id) {
    const el = document.getElementById(id);
    const container = document.querySelector('.lyrics-container');
    if (!el || !container) return;
    const fontSize = parseInt(document.getElementById('lyricsContent').style.fontSize) || 18;
    const offset = fontSize * 2;
    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    container.scrollBy({ top: elRect.top - containerRect.top - offset, behavior: 'smooth' });
}

function renderBookTabs(verseNums, hasChorus) {
    const tabsEl = document.getElementById('bookTabs');
    if (!tabsEl) return;
    currentSections = [];
    const container = document.querySelector('.lyrics-container');
    if (container) container.removeEventListener('scroll', updateActiveTab);
    if (!hasChorus && verseNums.length <= 1) {
        tabsEl.style.display = 'none';
        tabsEl.innerHTML = '';
        return;
    }
    const tabs = [];
    if (hasChorus) {
        currentSections.push('chorus');
        tabs.push(`<button class="book-tab" data-section="chorus" onclick="jumpToSection('chorus')">C</button>`);
    }
    verseNums.forEach(n => {
        currentSections.push(`v${n}`);
        tabs.push(`<button class="book-tab" data-section="v${n}" onclick="jumpToSection('v${n}')">${n}</button>`);
    });
    tabsEl.innerHTML = tabs.join('');
    tabsEl.style.display = 'flex';
    if (container) {
        container.addEventListener('scroll', updateActiveTab);
        requestAnimationFrame(() => {
            setLyricSpacer();
            cacheSectionPositions();
            updateActiveTab();
        });
    }
}

function cacheSectionPositions() {
    const container = document.querySelector('.lyrics-container');
    if (!container) { cachedSectionPositions = []; return; }
    const rect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop;
    cachedSectionPositions = currentSections
        .map(id => {
            const el = document.getElementById(id);
            if (!el) return null;
            return { id, absTop: el.getBoundingClientRect().top - rect.top + scrollTop };
        })
        .filter(Boolean)
        .sort((a, b) => a.absTop - b.absTop);
}

function updateActiveTab() {
    if (scrollRAF) return;
    scrollRAF = requestAnimationFrame(() => {
        scrollRAF = null;
        const container = document.querySelector('.lyrics-container');
        if (!container || !cachedSectionPositions.length) return;
        const threshold = container.scrollTop + 40;
        let activeId = cachedSectionPositions[0].id;
        for (const s of cachedSectionPositions) {
            if (s.absTop <= threshold) activeId = s.id;
        }
        document.querySelectorAll('.book-tab').forEach(btn => {
            btn.classList.toggle('book-tab-active', btn.getAttribute('data-section') === activeId);
        });
    });
}

function formatLyrics(lyrics, chords) {
    if (!lyrics) return '';

    // Place anchor markers before HTML conversion
    let processed = lyrics
        .replace(/^(\d+)\./gm, '\x00v$1\x00$1.')
        .replace(/^Chorus:/gm, '\x00chorus\x00Chorus:');

    let formatted = processed
        .replace(/\n/g, '<br>')
        .replace(/\x00(\w+)\x00/g, '<span id="$1"></span>')
        .replace(/Chorus:/g, '<span style="font-weight: bold; font-style: italic; color: var(--primary-color);">Chorus:</span>')
        .replace(/<br>Chorus(<br>|$)/g, '<br><span onclick="jumpToSection(\'chorus\')" style="font-style: italic; color: var(--primary-color); font-size: 0.9em; cursor: pointer; text-decoration: underline;">— Chorus —</span>$1')
        .replace(/(\d+\.)/g, '<strong>$1</strong>');

    if (chords) {
        formatted = `<div style="color: #999; font-weight: normal; margin-bottom: 12px; font-size: 13px; font-style: italic;">Chords: ${chords}</div>${formatted}`;
    }
    return formatted + '<div class="lyric-spacer"></div>';
}

function setLyricSpacer() {
    const container = document.querySelector('.lyrics-container');
    const lyricsContent = document.getElementById('lyricsContent');
    const spacer = lyricsContent ? lyricsContent.querySelector('.lyric-spacer') : null;
    if (!container || !spacer || !currentSections.length) return;

    // Temporarily zero the spacer so measurement is accurate
    spacer.style.height = '0px';

    // Find the last section anchor by actual DOM position
    const lastId = currentSections.reduce((best, id) => {
        const el = document.getElementById(id);
        const bestEl = document.getElementById(best);
        if (!el) return best;
        if (!bestEl) return id;
        return el.getBoundingClientRect().top > bestEl.getBoundingClientRect().top ? id : best;
    }, currentSections[0]);

    const lastEl = document.getElementById(lastId);
    if (!lastEl) return;

    // Content between last anchor and bottom of lyrics div (verse text below last heading)
    const contentAfterLast = lyricsContent.getBoundingClientRect().bottom - lastEl.getBoundingClientRect().top;
    // Spacer needed so last section can scroll exactly to the top
    const needed = Math.max(container.clientHeight - contentAfterLast + 20, 0);
    spacer.style.height = needed + 'px';
}

function navigateToSong(direction) {
    if (currentSongIndex === -1) return;
    const newIndex = currentSongIndex + direction;
    if (newIndex >= 0 && newIndex < filteredSongs.length) {
        selectSong(newIndex);
    }
}

function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
}

function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].screenX;
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > swipeThreshold) {
        if (currentSongIndex === -1) {
            // From welcome screen, only swipe left goes to first song
            if (diff > 0) {
                selectSong(0);
            }
        } else {
            // Normal navigation between songs
            if (diff > 0) {
                navigateToSong(1);
            } else {
                navigateToSong(-1);
            }
        }
    }
}

function handleKeyPress(e) {
    if (e.key === 'ArrowRight') {
        if (currentSongIndex === -1) {
            // From welcome screen, go to first song
            selectSong(0);
        } else {
            navigateToSong(1);
        }
    } else if (e.key === 'ArrowLeft') {
        if (currentSongIndex === -1) return; // Don't do anything on welcome
        navigateToSong(-1);
    }
}

function handleFontSizeChange(e) {
    const fontSize = e.target.value;
    document.getElementById('fontSizeValue').textContent = `${fontSize}px`;
    document.getElementById('lyricsContent').style.fontSize = `${fontSize}px`;
    savePreferences();
}

function handleSpacingChange(e) {
    const spacing = parseFloat(e.target.value);
    const labels = { 1.0: 'Compact', 1.2: 'Tight', 1.4: 'Snug', 1.6: 'Cozy', 1.8: 'Normal', 2.0: 'Relaxed', 2.2: 'Airy', 2.4: 'Open', 2.6: 'Wide' };
    document.getElementById('spacingValue').textContent = labels[spacing] || 'Normal';
    document.getElementById('lyricsContent').style.lineHeight = spacing;
    document.querySelector('.lyrics-container').style.lineHeight = spacing;
    savePreferences();
}

function handleSheetMusicToggle() {
    if (currentSongIndex !== -1) {
        const song = filteredSongs[currentSongIndex];
        selectSong(currentSongIndex); // Refresh display
    }
    savePreferences();
}


function handleColorThemeChange(e) {
    const theme = e.target.value;
    if (theme === 'brown') {
        document.body.classList.add('brown-theme');
    } else {
        document.body.classList.remove('brown-theme');
    }
    savePreferences();
}


// Favorites System
function getFavorites() {
    const saved = localStorage.getItem('hymnalFavorites');
    return saved ? JSON.parse(saved) : [];
}

function toggleFavorite(songId) {
    let favorites = getFavorites();
    const index = favorites.indexOf(songId);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(songId);
    }
    localStorage.setItem('hymnalFavorites', JSON.stringify(favorites));
    renderHomeFavorites();
}

function savePreferences() {
    const preferences = {
        fontSize: document.getElementById('fontSizeSlider').value,
        lineSpacing: document.getElementById('spacingSlider').value,
        showSheetMusic: document.getElementById('showSheetMusic').checked,
        colorTheme: document.getElementById('colorTheme').value
    };
    localStorage.setItem('hymnalPreferences', JSON.stringify(preferences));
}

function loadPreferences() {
    const saved = localStorage.getItem('hymnalPreferences');
    if (saved) {
        try {
            const preferences = JSON.parse(saved);
            if (preferences.fontSize) {
                document.getElementById('fontSizeSlider').value = preferences.fontSize;
                document.getElementById('fontSizeValue').textContent = `${preferences.fontSize}px`;
                document.getElementById('lyricsContent').style.fontSize = `${preferences.fontSize}px`;
            }
            if (preferences.lineSpacing) {
                const spacing = parseFloat(preferences.lineSpacing);
                const labels = { 1.0: 'Compact', 1.2: 'Tight', 1.4: 'Snug', 1.6: 'Cozy', 1.8: 'Normal', 2.0: 'Relaxed', 2.2: 'Airy', 2.4: 'Open', 2.6: 'Wide' };
                document.getElementById('spacingSlider').value = spacing;
                document.getElementById('spacingValue').textContent = labels[spacing] || 'Normal';
                document.getElementById('lyricsContent').style.lineHeight = spacing;
                document.querySelector('.lyrics-container').style.lineHeight = spacing;
            }
            if (preferences.showSheetMusic !== undefined) {
                document.getElementById('showSheetMusic').checked = preferences.showSheetMusic;
            }
            if (preferences.colorTheme) {
                document.getElementById('colorTheme').value = preferences.colorTheme;
                if (preferences.colorTheme === 'brown') {
                    document.body.classList.add('brown-theme');
                } else {
                    document.body.classList.remove('brown-theme');
                }
            }
        } catch (error) {
            console.error('Failed to load preferences:', error);
        }
    }
}



// Password Protection
const CORRECT_PASSWORD = "Baptist2"; // CHANGE THIS PASSWORD!

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('passwordInput');
    const eyeIcon = document.getElementById('eyeIcon');
    const eyeSlashIcon = document.getElementById('eyeSlashIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.style.display = 'block';
        eyeSlashIcon.style.display = 'none';
    } else {
        passwordInput.type = 'password';
        eyeIcon.style.display = 'none';
        eyeSlashIcon.style.display = 'block';
    }
}

function checkPassword() {
    const input = document.getElementById('passwordInput').value;
    const errorMsg = document.getElementById('errorMsg');
    
    if (input === CORRECT_PASSWORD) {
        // Correct password - hide password screen
        document.getElementById('passwordScreen').style.display = 'none';
        // Save login state for 7 days
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 7);
        localStorage.setItem('hymnalAccess', expiry.getTime());
        init();
    } else {
        // Wrong password
        errorMsg.style.display = 'block';
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordInput').focus();
    }
}

// Check if already logged in
function checkAccess() {
    const savedAccess = localStorage.getItem('hymnalAccess');
    if (savedAccess) {
        const expiryTime = parseInt(savedAccess);
        const now = new Date().getTime();
        
        if (now < expiryTime) {
            // Still valid - hide password screen and init
            document.getElementById('passwordScreen').style.display = 'none';
            init();
            return;
        } else {
            // Expired - remove from storage
            localStorage.removeItem('hymnalAccess');
        }
    }
    // If no valid access, password screen stays visible
}

// Allow Enter key to submit password
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                checkPassword();
            }
        });
        passwordInput.focus();
    }
});

// Modify the existing init check
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAccess);
} else {
    checkAccess();
}
