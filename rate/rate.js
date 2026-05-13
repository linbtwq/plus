import { auth, db, collection, addDoc, serverTimestamp, onAuthStateChanged } from '../firebase-init.js';

const TMDB_API_KEY = '4ff5ea09116c72aed9a95dd1b65183c4';
let currentUser = null;
let currentScore = 0;
let selectedPoster = ''; 
let selectedGenres = ''; 

const GENRE_MAP = {
    28: "Боевик", 12: "Приключения", 16: "Мультфильм", 35: "Комедия", 80: "Криминал",
    99: "Документальный", 18: "Драма", 10751: "Семейный", 14: "Фэнтези", 36: "История",
    27: "Ужасы", 10402: "Музыка", 9648: "Детектив", 10749: "Мелодрама", 878: "Фантастика",
    10770: "ТВ фильм", 53: "Триллер", 10752: "Военный", 37: "Вестерн",
    10759: "Боевик/Прикл.", 10762: "Детский", 10763: "Новости", 10764: "Реалити",
    10765: "Фантастика/Фэнтези", 10766: "Мыльная опера", 10767: "Ток-шоу", 10768: "Война/Политика"
};

onAuthStateChanged(auth, (user) => { if (user) currentUser = user; else window.location.href = '../index.html'; });

const searchWrapper = document.getElementById('search-wrapper');
const titleInput = document.getElementById('movie-title');
const suggestionsBox = document.getElementById('suggestions');
const scoreDisplay = document.getElementById('final-score');

const previewBox = document.getElementById('movie-preview');
const previewPoster = document.getElementById('preview-poster');
const previewTitle = document.getElementById('preview-title');
const previewGenres = document.getElementById('preview-genres');
const clearBtn = document.getElementById('clear-preview');

const typeDropdown = document.getElementById('media-type-dropdown');
const typeSelected = document.getElementById('media-type-selected');
const typeOptions = document.querySelectorAll('#media-type-options .dropdown-item');

const duoCheckbox = document.getElementById('is-duo-checkbox');
const user2Col = document.getElementById('user2-col');
const user1Title = document.getElementById('user1-title');
const slidersWrapper = document.querySelector('.sliders-wrapper');

/* duo */
duoCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
        user2Col.classList.remove('hidden');
        user1Title.classList.remove('hidden');
        slidersWrapper.style.gridTemplateColumns = '1fr 1fr';
    } else {
        user2Col.classList.add('hidden');
        user1Title.classList.add('hidden');
        slidersWrapper.style.gridTemplateColumns = '1fr';
    }
    calculate();
});

if (typeSelected && typeDropdown) {
    typeSelected.addEventListener('click', () => typeDropdown.classList.toggle('open'));
    document.addEventListener('click', (e) => {
        if (!typeDropdown.contains(e.target)) typeDropdown.classList.remove('open');
    });
    typeOptions.forEach(option => {
        option.addEventListener('click', () => {
            typeOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            typeSelected.innerHTML = `${option.innerText} <span class="arrow">▼</span>`;
            typeSelected.setAttribute('data-value', option.getAttribute('data-value'));
            typeDropdown.classList.remove('open');
        });
    });
}

let searchTimer;
titleInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const query = e.target.value.trim();
    if (query.length < 2) { suggestionsBox.style.display = 'none'; return; }

    searchTimer = setTimeout(async () => {
        try {
            const resp = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=ru-RU`);
            const data = await resp.json();
            const filtered = data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
            showSuggestions(filtered.slice(0, 5));
        } catch (err) { console.error("Ошибка API:", err); }
    }, 500);
});


function showSuggestions(movies) {
    if (movies.length === 0) { suggestionsBox.style.display = 'none'; return; }
    suggestionsBox.innerHTML = '';
    suggestionsBox.style.display = 'block';

    movies.forEach(m => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        const title = m.title || m.name;
        const posterUrl = m.poster_path ? `https://image.tmdb.org/t/p/w92${m.poster_path}` : 'https://via.placeholder.com/92x138?text=No+Img';
        div.innerHTML = `<img src="${posterUrl}" class="suggestion-img"><div style="font-family:'Unbounded';font-size:0.8rem">${title}</div>`;
        
        div.addEventListener('click', () => {
            titleInput.value = title;
            selectedPoster = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '';
            selectedGenres = m.genre_ids && m.genre_ids.length > 0 ? m.genre_ids.map(id => GENRE_MAP[id]).filter(Boolean).slice(0, 2).join(', ') : '';
            
            previewPoster.src = m.poster_path ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : 'https://via.placeholder.com/60x90?text=No+Img';
            previewTitle.textContent = title;
            previewGenres.textContent = selectedGenres || 'Жанр не указан';
            
            previewBox.classList.remove('hidden');
            searchWrapper.style.display = 'none';
            suggestionsBox.style.display = 'none';
        });
        suggestionsBox.appendChild(div);
    });
}

clearBtn.addEventListener('click', () => {
    titleInput.value = '';
    selectedPoster = '';
    selectedGenres = '';
    previewBox.classList.add('hidden');
    searchWrapper.style.display = 'block';
    titleInput.focus();
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) suggestionsBox.style.display = 'none';
});

const getRounded = (id) => Math.round(parseFloat(document.getElementById(id).value));

function getScore(playerSuffix) {
    let base = 0;
    ['script', 'actors', 'directing', 'chars', 'idea'].forEach(id => {
        const val = getRounded(`${id}-${playerSuffix}`);
        document.getElementById(`val-${id}-${playerSuffix}`).textContent = val;
        base += val;
    });

    let vibe = 0;
    ['atmosphere', 'impression'].forEach(id => {
        const val = getRounded(`${id}-${playerSuffix}`);
        document.getElementById(`val-${id}-${playerSuffix}`).textContent = val;
        vibe += (val * 5);
    });

    let rawScore = base + vibe;
    let score = Math.round(((rawScore - 15) / 85) * 100);
    return score < 0 ? 0 : score;
}

function calculate() {
    const score1 = getScore('1');
    let finalScore = score1;

    if (duoCheckbox.checked) {
        const score2 = getScore('2');
        finalScore = Math.round((score1 + score2) / 2);
    }

    if (currentScore !== finalScore) {
        scoreDisplay.classList.remove('pulse');
        void scoreDisplay.offsetWidth;
        scoreDisplay.classList.add('pulse');
    }

    currentScore = finalScore;
    scoreDisplay.textContent = currentScore;
    
    scoreDisplay.classList.remove('color-red', 'color-orange', 'color-yellow', 'color-lime', 'color-green', 'color-gold');
    
    if (currentScore < 40) scoreDisplay.classList.add('color-red');
    else if (currentScore < 55) scoreDisplay.classList.add('color-orange');
    else if (currentScore < 70) scoreDisplay.classList.add('color-yellow');
    else if (currentScore < 85) scoreDisplay.classList.add('color-lime');
    else if (currentScore < 100) scoreDisplay.classList.add('color-green');
    else scoreDisplay.classList.add('color-gold');
}

document.querySelectorAll('input[type="range"]').forEach(i => i.addEventListener('input', calculate));
calculate();

document.getElementById('save-btn').onclick = async () => {
    const title = titleInput.value.trim();
    if (!title || previewBox.classList.contains('hidden')) return alert('Выберите фильм из списка!');

    const isDuo = duoCheckbox.checked;

    const finalStats = {
        script: isDuo ? `${getRounded('script-1')}/${getRounded('script-2')}` : getRounded('script-1'),
        actors: isDuo ? `${getRounded('actors-1')}/${getRounded('actors-2')}` : getRounded('actors-1'),
        directing: isDuo ? `${getRounded('directing-1')}/${getRounded('directing-2')}` : getRounded('directing-1'),
        chars: isDuo ? `${getRounded('chars-1')}/${getRounded('chars-2')}` : getRounded('chars-1'),
        idea: isDuo ? `${getRounded('idea-1')}/${getRounded('idea-2')}` : getRounded('idea-1'),
        atmosphere: isDuo ? `${getRounded('atmosphere-1')}/${getRounded('atmosphere-2')}` : getRounded('atmosphere-1'),
        impression: isDuo ? `${getRounded('impression-1')}/${getRounded('impression-2')}` : getRounded('impression-1')
    };

    try {
        await addDoc(collection(db, "movies"), {
            title,
            genres: selectedGenres,
            type: document.getElementById('media-type-selected').getAttribute('data-value'),
            score: currentScore,
            isDuo: isDuo,
            poster: selectedPoster,
            authorName: currentUser.displayName,
            authorPhoto: currentUser.photoURL,
            userId: currentUser.uid,
            timestamp: serverTimestamp(),
            date: new Date().toLocaleDateString('ru-RU'),
            stats: finalStats
        });
        window.location.href = 'list.html';
    } catch (e) { console.error(e); alert("Ошибка Firebase"); }
};
