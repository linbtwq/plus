import { auth, db, collection, getDocs, query, orderBy, onAuthStateChanged, deleteDoc, doc } from './firebase-init.js';

let currentUser = null;
let loadedMovies = [];

const modal = document.getElementById('custom-modal');
const confirmBtn = document.getElementById('modal-confirm');
const cancelBtn = document.getElementById('modal-cancel');

function askConfirmation() {
    return new Promise((resolve) => {
        modal.classList.remove('hidden');
        confirmBtn.onclick = () => { modal.classList.add('hidden'); resolve(true); };
        cancelBtn.onclick = () => { modal.classList.add('hidden'); resolve(false); };
    });
}

onAuthStateChanged(auth, (user) => { 
    if (user) { currentUser = user; fetchMovies(); } 
    else { window.location.href = 'index.html'; }
});

async function fetchMovies() {
    const grid = document.getElementById('movies-grid');
    grid.innerHTML = '<p style="text-align: center; width: 100%; grid-column: 1/-1; font-family: \'Unbounded\'; color: #888;">ЗАГРУЗКА БАЗЫ ДАННЫХ...</p>';
    
    try {
        const q = query(collection(db, "movies"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        loadedMovies = [];
        snap.forEach(d => loadedMovies.push({ id: d.id, ...d.data() }));
        
        updateStats(loadedMovies);
        render(loadedMovies);
    } catch (e) { 
        console.error("Ошибка:", e);
        grid.innerHTML = '<p style="text-align: center; width: 100%; grid-column: 1/-1; color: #ff3333; font-family: \'Unbounded\';">ОШИБКА ДОСТУПА К БАЗЕ</p>'; 
    }
}

function updateStats(movies) {
    const totalEl = document.getElementById('total-movies');
    const avgEl = document.getElementById('average-score');
    if(!totalEl || !avgEl) return;

    totalEl.innerText = movies.length;
    
    if (movies.length === 0) {
        avgEl.innerText = '0';
        avgEl.className = '';
        return;
    }
    
    const totalScore = movies.reduce((sum, movie) => sum + movie.score, 0);
    const avg = Math.round(totalScore / movies.length);
    avgEl.innerText = avg;
    
    let colorClass = '';
    if (avg < 40) colorClass = 'color-red';
    else if (avg < 55) colorClass = 'color-orange';
    else if (avg < 70) colorClass = 'color-yellow';
    else if (avg < 85) colorClass = 'color-lime';
    else colorClass = 'color-green';
    
    avgEl.className = colorClass;
}

function render(moviesToRender) {
    const grid = document.getElementById('movies-grid');
    grid.innerHTML = '';
    
    if (moviesToRender.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #555; font-family: \'Unbounded\';">НИЧЕГО НЕ НАЙДЕНО</p>';
        return;
    }

    moviesToRender.forEach(m => {
        const isOwner = currentUser && m.userId === currentUser.uid;
        
        let colorClass = '';
        if (m.score < 40) colorClass = 'color-red';
        else if (m.score < 55) colorClass = 'color-orange';
        else if (m.score < 70) colorClass = 'color-yellow';
        else if (m.score < 85) colorClass = 'color-lime';
        else colorClass = 'color-green';
        
        const card = document.createElement('div');
        card.className = 'movie-card';
        
        const posterImg = m.poster ? `<img src="${m.poster}" class="card-poster">` : `<div class="card-poster no-img">БЕЗ ОБЛОЖКИ</div>`;

        card.innerHTML = `
            <div class="poster-container">
                ${posterImg}
                <div class="poster-overlay"></div>
                ${isOwner ? `<button class="delete-btn" onclick="removeMovie('${m.id}')" title="Удалить">✕</button>` : ''}
            </div>
            <div class="card-content">
                <div class="card-header">
                    <img src="${m.authorPhoto || ''}" class="card-avatar" referrerpolicy="no-referrer">
                    <span class="card-author">${m.authorName || 'Аноним'}</span>
                </div>
                
                <div class="movie-title">${m.title}</div>
                <div class="movie-genres">${m.genres || ''}</div>
                
                <div class="movie-score-wrapper">
                    <div class="movie-score ${colorClass}">${m.score}</div>
                    <div class="stats-tooltip">
                        <div class="stat-row"><span>Сценарий</span><span class="stat-val">${m.stats?.script || '?'}</span></div>
                        <div class="stat-row"><span>Актеры</span><span class="stat-val">${m.stats?.actors || '?'}</span></div>
                        <div class="stat-row"><span>Режиссура</span><span class="stat-val">${m.stats?.directing || '?'}</span></div>
                        <div class="stat-row"><span>Персонажи</span><span class="stat-val">${m.stats?.chars || '?'}</span></div>
                        <div class="stat-row"><span>Идея</span><span class="stat-val">${m.stats?.idea || '?'}</span></div>
                        <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 8px 0;"></div>
                        <div class="stat-row"><span>Вайб</span><span class="stat-val">${m.stats?.atmosphere || '?'}</span></div>
                        <div class="stat-row"><span>Впечатление</span><span class="stat-val">${m.stats?.impression || '?'}</span></div>
                    </div>
                </div>
                <div style="font-size:0.7rem; color:#555; font-family:'Unbounded'; margin-top:10px">${m.date || ''}</div>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

window.removeMovie = async (id) => {
    let confirmed = false;
    if (window.innerWidth <= 768) {
        confirmed = confirm('Точно удалить эту оценку?');
    } else {
        confirmed = await askConfirmation();
    }
    
    if (confirmed) {
        try {
            await deleteDoc(doc(db, "movies", id));
            loadedMovies = loadedMovies.filter(m => m.id !== id);
            updateStats(loadedMovies);
            render(loadedMovies);
        } catch (e) {
            console.error("Ошибка удаления:", e);
            alert("Ошибка при удалении");
        }
    }
};

const searchEl = document.getElementById('local-search');
if(searchEl) {
    searchEl.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredMovies = loadedMovies.filter(m => m.title.toLowerCase().includes(searchTerm));
        render(filteredMovies);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const dropdown = document.getElementById('custom-sort');
    const selected = document.getElementById('dropdown-selected');
    const options = document.querySelectorAll('.dropdown-item');

    if (!selected || !dropdown) return;

    selected.addEventListener('click', () => { dropdown.classList.toggle('open'); });
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) { dropdown.classList.remove('open'); }
    });

    options.forEach(option => {
        option.addEventListener('click', () => {
            options.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            selected.innerHTML = `${option.innerText} <span class="arrow">▼</span>`;
            dropdown.classList.remove('open');

            let currentMovies = [...loadedMovies];
            if(searchEl) {
                const searchTerm = searchEl.value.toLowerCase();
                currentMovies = loadedMovies.filter(m => m.title.toLowerCase().includes(searchTerm));
            }

            const sortType = option.getAttribute('data-value');
            if (sortType === 'high') currentMovies.sort((a, b) => b.score - a.score);
            else if (sortType === 'low') currentMovies.sort((a, b) => a.score - b.score);
            else if (sortType === 'new') currentMovies.sort((a, b) => {
                const timeA = a.timestamp ? a.timestamp.seconds : 0;
                const timeB = b.timestamp ? b.timestamp.seconds : 0;
                return timeB - timeA;
            });
            
            render(currentMovies);
        });
    });
});
