import { auth, db, collection, addDoc, serverTimestamp, onAuthStateChanged } from './firebase-init.js';

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

onAuthStateChanged(auth, (user) => { if (user) currentUser = user; else window.location.href = 'index.html'; });

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

if (typeSelected && typeDropdown) {
    typeSelected.addEventListener('click', () => typeDropdown.classList.toggle('open'));
    document.addEventListener('click', (e) => {
        if (!typeDropdown.contains(e.target)) typeDropdown.classList.remove('open');
    });
    typeOptions.forEach(option => {
        option.addEventListener('click', () => {
            typeOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            const val = option.getAttribute('data-value');
            const text = option.innerText;
            typeSelected.innerHTML = `${text} <span class="arrow">▼</span>`;
            typeSelected.setAttribute('data-value', val);
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
            
            if (m.genre_ids && m.genre_ids.length > 0) {
                selectedGenres = m.genre_ids.map(id => GENRE_MAP[id]).filter(Boolean).slice(0, 2).join(', ');
            } else {
                selectedGenres = '';
            }
            
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

function calculate() {
    let base = 0;
    ['script', 'actors', 'directing', 'chars', 'idea'].forEach(id => {
        const val = parseInt(document.getElementById(id).value);
        document.getElementById(`val-${id}`).textContent = val;
        base += val;
    });

    let vibe = 0;
    ['atmosphere', 'impression'].forEach(id => {
        const val = parseInt(document.getElementById(id).value);
        document.getElementById(`val-${id}`).textContent = val;
        vibe += (val * 5);
    });

    let rawScore = base + vibe;
    currentScore = Math.round(((rawScore - 15) / 85) * 100);
    if (currentScore < 0) currentScore = 0;
    scoreDisplay.textContent = currentScore;
    
    scoreDisplay.classList.remove('color-red', 'color-orange', 'color-yellow', 'color-lime', 'color-green');
    
    if (currentScore < 40) scoreDisplay.classList.add('color-red');
    else if (currentScore < 55) scoreDisplay.classList.add('color-orange');
    else if (currentScore < 70) scoreDisplay.classList.add('color-yellow');
    else if (currentScore < 85) scoreDisplay.classList.add('color-lime');
    else scoreDisplay.classList.add('color-green');
}

document.querySelectorAll('input[type="range"]').forEach(i => i.addEventListener('input', calculate));
calculate();

document.getElementById('save-btn').onclick = async () => {
    const title = titleInput.value.trim();
    if (!title || previewBox.classList.contains('hidden')) return alert('Выберите фильм из списка!');

    try {
        await addDoc(collection(db, "movies"), {
            title,
            genres: selectedGenres,
            type: document.getElementById('media-type-selected').getAttribute('data-value'),
            score: currentScore,
            poster: selectedPoster,
            authorName: currentUser.displayName,
            authorPhoto: currentUser.photoURL,
            userId: currentUser.uid,
            timestamp: serverTimestamp(),
            date: new Date().toLocaleDateString('ru-RU'),
            stats: {
                script: document.getElementById('script').value,
                actors: document.getElementById('actors').value,
                directing: document.getElementById('directing').value,
                chars: document.getElementById('chars').value,
                idea: document.getElementById('idea').value,
                atmosphere: document.getElementById('atmosphere').value,
                impression: document.getElementById('impression').value
            }
        });
        window.location.href = 'list.html';
    } catch (e) { console.error(e); alert("Ошибка Firebase"); }
};
