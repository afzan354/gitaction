// ==========================================
// PENGATURAN FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBe2ePYOuh6dR4Vwa4yhp_kYzqjdlJQzoc",
    authDomain: "donghua-app-99a90.firebaseapp.com",
    projectId: "donghua-app-99a90",
    storageBucket: "donghua-app-99a90.firebasestorage.app",
    messagingSenderId: "135224768000",
    appId: "1:135224768000:web:2c6b33ad270c5c48850ae5"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ==========================================
// VARIABEL GLOBAL APLIKASI
// ==========================================
let currentUser = null;
let isRegisterMode = false; 

const movieGrid = document.querySelector('.movie-grid');
const detailPage = document.getElementById('detail-page');
const playerPage = document.getElementById('player-page');
const authPage = document.getElementById('auth-page'); 
const tokenPage = document.getElementById('token-page'); 
const headerApp = document.querySelector('header');
const bottomNav = document.getElementById('bottom-nav');
const searchInput = document.querySelector('.search-box input');

let currentNavUrls = { prev: null, next: null };
let wakeLock = null; 
let globalEpisodes = []; 
let globalDetailUrl = ""; 
let globalWatchedEps = []; 
let globalLastServer = ""; 
let isSubscribed = false; 
let globalLastEpisodeUrl = "";
let globalWaNumber = "6281232890475"; 
let globalAnnouncement = "";

// ==========================================
// FUNGSI NOTIFIKASI (TOAST)
// ==========================================
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if(!toast) return;
    toast.innerText = message;
    toast.style.backgroundColor = isError ? '#ff4a4a' : '#4a72ff';
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// ==========================================
// 1. ALUR BARU: PANTAU STATUS LOGIN
// ==========================================
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        hideAllPages();
        initializeAppSettings(); 
    } else {
        currentUser = null;
        hideAllPages();
        authPage.style.display = 'flex';
        bottomNav.style.display = 'none';
        isRegisterMode = false;
        updateAuthUI();
    }
});

// ==========================================
// 2. ALUR BARU: BYPASS TOKEN & AMBIL SETTING
// ==========================================
async function initializeAppSettings() {
    headerApp.style.display = 'block';
    movieGrid.style.display = 'grid';
    movieGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: #4a72ff; margin-top:50px;"><i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan Aplikasi...</p>';

    try {
        const appSettings = await db.collection('settings').doc('api_config').get();
        if (appSettings.exists) {
            globalWaNumber = appSettings.data().whatsapp || "6281234567890";
            globalAnnouncement = appSettings.data().pengumuman || "";
        }
        
        // Buka kunci aplikasi langsung karena data sudah ditarik secara Native (Gratis)
        bottomNav.style.display = 'flex'; 
        fetchDonghua(); 
    } catch (error) {
        console.error("Gagal menarik pengaturan", error);
        bottomNav.style.display = 'flex'; 
        fetchDonghua(); 
    }
}

// ==========================================
// FUNGSI AUTH UI (LOGIN / REGISTER)
// ==========================================
function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    updateAuthUI();
}

function updateAuthUI() {
    const title = document.getElementById('auth-title');
    const submitBtn = document.getElementById('auth-submit-btn');
    const switchText = document.getElementById('auth-switch-text');
    const switchBtn = document.getElementById('auth-switch-btn');

    document.getElementById('auth-form').style.display = 'block';
    document.querySelector('.auth-switch').style.display = 'block';
    
    const profileMenu = document.getElementById('profile-menu');
    if (profileMenu) profileMenu.style.display = 'none';

    if (isRegisterMode) {
        title.innerText = "Daftar Akun Baru"; submitBtn.innerText = "Daftar Sekarang";
        switchText.innerText = "Sudah punya akun?"; switchBtn.innerText = "Masuk di sini";
    } else {
        title.innerText = "Masuk ke Akun"; submitBtn.innerText = "Masuk";
        switchText.innerText = "Belum punya akun?"; switchBtn.innerText = "Daftar di sini";
    }
}

function showUserProfile() {
    document.getElementById('auth-form').style.display = 'none';
    document.querySelector('.auth-switch').style.display = 'none';
    document.getElementById('auth-title').innerText = "Pengaturan Akun";
    
    document.getElementById('profile-menu').style.display = 'block';

    if (globalAnnouncement && globalAnnouncement.trim() !== "") {
        document.getElementById('announcement-box').style.display = 'block';
        document.getElementById('announcement-text').innerText = globalAnnouncement;
    } else {
        document.getElementById('announcement-box').style.display = 'none';
    }
    
    document.getElementById('auth-subtitle').innerHTML = `Halo, ${currentUser.email}<br><span style="color:#4a72ff;font-weight:bold;margin-top:5px;display:block;">Status: Native Mode (Gratis)</span>`;
}

async function handleAuth(event) {
    event.preventDefault(); 
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const submitBtn = document.getElementById('auth-submit-btn');

    submitBtn.innerText = "Memproses..."; submitBtn.disabled = true;

    try {
        if (isRegisterMode) {
            await auth.createUserWithEmailAndPassword(email, password);
            showToast("Pendaftaran berhasil!");
        } else {
            await auth.signInWithEmailAndPassword(email, password);
            showToast("Login berhasil!");
        }
    } catch (error) { showToast("Gagal: " + error.message, true); }

    submitBtn.disabled = false;
}

function logout() {
    auth.signOut().then(() => {
        showToast("Kamu telah keluar dari akun.");
        document.getElementById('auth-email').value = "";
        document.getElementById('auth-password').value = "";
    });
}

// ==========================================
// HELPER: SEMBUNYIKAN SEMUA HALAMAN
// ==========================================
function hideAllPages() {
    headerApp.style.display = 'none';
    movieGrid.style.display = 'none';
    detailPage.style.display = 'none';
    playerPage.style.display = 'none';
    authPage.style.display = 'none';
    tokenPage.style.display = 'none';
}

// ==========================================
// FUNGSI BOTTOM NAVIGATION, HISTORY & SAVED
// ==========================================
function clickBottomNav(menu) {
    const iframe = document.getElementById('video-frame');
    if (iframe && iframe.src !== "") {
        iframe.src = ""; 
        releaseWakeLock(); 
    }
    
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const activeNav = document.getElementById('nav-' + menu);
    if (activeNav) activeNav.classList.add('active');

    if (menu === 'home') {
        loadCategory('home', document.getElementById('btn-home'));
    } else if (menu === 'schedule') {
        document.querySelectorAll('.btn-category').forEach(btn => btn.classList.remove('active'));
        fetchDonghua('schedule');
    } else if (menu === 'profile') {
        hideAllPages();
        authPage.style.display = 'flex';
        showUserProfile(); 
        sessionStorage.setItem('lastPage', 'profile');
    } else if (menu === 'history') {
        loadHistoryFromFirebase();
    } else if (menu === 'saved') {
        loadSavedFromFirebase();
    }
}

async function loadHistoryFromFirebase() {
    sessionStorage.setItem('lastPage', 'history');
    hideAllPages();
    headerApp.style.display = 'block';
    movieGrid.style.display = 'grid';
    document.querySelectorAll('.btn-category').forEach(btn => btn.classList.remove('active'));

    movieGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: #888;">Memuat riwayat tontonanmu...</p>';

    try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('history').orderBy('timestamp', 'desc').get();
        if (snapshot.empty) {
            movieGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: #888;">Belum ada riwayat tontonan. Ayo nonton sekarang!</p>';
            return;
        }

        movieGrid.innerHTML = `<h3 style="grid-column: 1/-1; font-size: 14px; margin-bottom: 5px; color: #4a72ff;">Riwayat Tontonan</h3>`;
        snapshot.forEach(doc => {
            const data = doc.data();
            const cardHTML = `
                <div class="movie-card" onclick="goToDetail('${data.donghuaUrl}')">
                    <div class="movie-poster">
                        <img src="${data.image}" alt="${data.title}">
                        <div class="badge-new">Riwayat</div>
                        <div class="badge-eps" style="background: rgba(255,74,74,0.9); padding: 3px 6px; border-radius: 4px;">Terakhir: ${data.lastEpisodeText}</div>
                        <button class="btn-delete-item" onclick="deleteSingleHistory(event, '${data.donghuaUrl}')">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div class="movie-details">
                        <h3 class="title">${data.title}</h3>
                    </div>
                </div>
            `;
            movieGrid.innerHTML += cardHTML;
        });
    } catch (error) { showToast("Gagal memuat riwayat", true); }
}

async function loadSavedFromFirebase() {
    sessionStorage.setItem('lastPage', 'saved');
    hideAllPages();
    headerApp.style.display = 'block';
    movieGrid.style.display = 'grid';
    document.querySelectorAll('.btn-category').forEach(btn => btn.classList.remove('active'));

    movieGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: #888;">Memuat daftar tersimpan...</p>';

    try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('saved').orderBy('timestamp', 'desc').get();
        if (snapshot.empty) {
            movieGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: #888;">Belum ada donghua yang kamu simpan.</p>';
            return;
        }

        movieGrid.innerHTML = `<h3 style="grid-column: 1/-1; font-size: 14px; margin-bottom: 5px; color: #ff4a4a;"><i class="fa-solid fa-heart"></i> Donghua Favorit</h3>`;
        snapshot.forEach(doc => {
            const data = doc.data();
            const cardHTML = `
                <div class="movie-card" onclick="goToDetail('${data.donghuaUrl}')">
                    <div class="movie-poster">
                        <img src="${data.image}" alt="${data.title}">
                        <div class="badge-new" style="background-color: #ff4a4a;"><i class="fa-solid fa-heart"></i></div>
                    </div>
                    <div class="movie-details"><h3 class="title">${data.title}</h3></div>
                </div>
            `;
            movieGrid.innerHTML += cardHTML;
        });
    } catch (error) { showToast("Gagal memuat data tersimpan", true); }
}

// ==========================================
// FUNGSI SUBSCRIBE (TOGGLE)
// ==========================================
function updateSubscribeUI() {
    const btn = document.getElementById('btn-subscribe');
    if (!btn) return;

    if (isSubscribed) {
        btn.innerHTML = `<i class="fa-solid fa-heart"></i> Tersimpan`;
        btn.style.border = "1px solid #ff4a4a"; btn.style.color = "#ff4a4a"; 
    } else {
        btn.innerHTML = `<i class="fa-regular fa-heart"></i> Subscribe`;
        btn.style.border = "none"; btn.style.color = "white"; 
    }
}

async function toggleSubscribe() {
    const btn = document.getElementById('btn-subscribe');
    if(!btn) return;
    
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memproses...`;

    const docRef = db.collection('users').doc(currentUser.uid).collection('saved').doc(encodeURIComponent(globalDetailUrl));
    const dTitle = document.getElementById('detail-title').innerText;
    const dImage = document.getElementById('detail-image').src;

    try {
        if (isSubscribed) {
            await docRef.delete();
            isSubscribed = false;
            showToast("Dihapus dari Tersimpan!");
        } else {
            await docRef.set({
                donghuaUrl: globalDetailUrl, title: dTitle, image: dImage,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            isSubscribed = true;
            showToast("Berhasil Disimpan!");
        }
        updateSubscribeUI();
    } catch (error) {
        showToast("Terjadi kesalahan jaringan", true);
        updateSubscribeUI(); 
    }
    btn.disabled = false;
}

// ==========================================
// FUNGSI PENCARIAN & KATEGORI
// ==========================================
searchInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        const keyword = searchInput.value.trim();
        searchInput.blur(); 
        if (keyword !== '') searchDonghua(keyword);
        else clickBottomNav('home');
    }
});

async function searchDonghua(keyword) {
    sessionStorage.setItem('lastPage', 'home');
    document.querySelectorAll('.btn-category').forEach(btn => btn.classList.remove('active'));
    hideAllPages();
    headerApp.style.display = 'block';
    movieGrid.style.display = 'grid';

    try {
        movieGrid.innerHTML = `<p style="text-align:center; grid-column: 1/-1; color: #888;">Mencari "${keyword}"...</p>`;
        
        // MENGGUNAKAN NATIVE KOTLIN BRIDGE
        const jsonString = window.NativeAnichin.searchAnime(keyword);
        const resultData = JSON.parse(jsonString);
        
        if (resultData && resultData.length > 0) {
            const formattedData = resultData.map(item => ({
                title: item.title,
                url: item.url,
                image: item.poster,
                badge: item.type
            }));
            renderMovies(formattedData);
            movieGrid.insertAdjacentHTML('afterbegin', `<h3 style="grid-column: 1/-1; font-size: 14px; margin-bottom: 5px; color: #4a72ff;">Hasil pencarian: ${keyword}</h3>`);
        } else {
            movieGrid.innerHTML = `<p style="text-align:center; grid-column: 1/-1; color: #888;">Donghua "${keyword}" tidak ditemukan.</p>`;
        }
    } catch (error) { 
        movieGrid.innerHTML = `<p style="text-align:center; color:#ff4a4a; grid-column: 1/-1;">Gagal mencari data Native.</p>`; 
    }
}

function loadCategory(type, btnElement) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.getElementById('nav-home').classList.add('active');
    document.querySelectorAll('.btn-category').forEach(btn => btn.classList.remove('active'));
    
    if (btnElement) btnElement.classList.add('active');
    else {
        const btn = document.getElementById('btn-' + type);
        if (btn) btn.classList.add('active');
    }
    
    searchInput.value = '';
    fetchDonghua(type);
}

// ==========================================
// FUNGSI HOME & FETCH DATA (NATIVE KOTLIN)
// ==========================================
async function fetchDonghua(type = 'home') {
    sessionStorage.setItem('lastPage', 'home');
    sessionStorage.setItem('currentCategory', type); 

    hideAllPages();
    headerApp.style.display = 'block';
    movieGrid.style.display = 'grid';

    const cacheKey = 'cache_donghua_' + type;
    const cachedStr = sessionStorage.getItem(cacheKey);
    
    if (cachedStr) {
        const cachedData = JSON.parse(cachedStr);
        const now = Date.now();
        const limaMenit = 5 * 60 * 1000; 

        if (now - cachedData.timestamp < limaMenit) {
            if (type === 'schedule') {
                renderSchedule(cachedData.data);
            } else {
                renderMovies(cachedData.data);
            }
            return; 
        }
    }

    try {
        movieGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: #888;">Memuat data donghua...</p>';

        if (type === 'home') {
            // MENGGUNAKAN NATIVE KOTLIN BRIDGE
            const jsonString = window.NativeAnichin.getLatestUpdate(1);
            const resultData = JSON.parse(jsonString);
            
            const formattedData = resultData.map(item => ({
                title: item.title,
                url: item.url,
                image: item.poster,
                badge: item.type
            }));

            const newDataToCache = { timestamp: Date.now(), data: formattedData };
            sessionStorage.setItem(cacheKey, JSON.stringify(newDataToCache));
            renderMovies(formattedData);

        } else if (type === 'schedule') {
            movieGrid.innerHTML = `<p style="text-align:center; color:#888; grid-column: 1/-1;">Fitur Jadwal Native sedang dalam pengembangan.</p>`;
        }

    } catch (error) { 
        console.error(error);
        movieGrid.innerHTML = `<p style="text-align:center; color:#ff4a4a; grid-column: 1/-1;">Gagal memuat data dari Native Bridge.</p>`; 
    }
}

function renderMovies(movies) {
    movieGrid.innerHTML = '';
    if (!Array.isArray(movies) || movies.length === 0) {
        movieGrid.innerHTML = `<p style="text-align:center; grid-column: 1/-1; color: #ff4a4a;">Data Kosong.</p>`;
        return;
    }

    const filteredMovies = movies.filter(movie => movie.image && !movie.image.includes('placeholder.com'));
    filteredMovies.forEach(movie => {
        let title = movie.title;
        const poster = movie.image;
        const badge = movie.badge || 'New'; 
        const urlAsli = movie.url; 

        if (!title || title.trim() === '') {
            const urlParts = urlAsli.split('/').filter(part => part.length > 0);
            title = urlParts[urlParts.length - 1].replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
        }

        let episodeText = 'Ongoing'; 
        if (badge.toLowerCase() === 'completed') episodeText = 'Completed';
        const matchEps = title.match(/Episode\s*(\d+)/i);
        if (matchEps) episodeText = 'Eps ' + matchEps[1]; 

        const dummyRating = (Math.random() * (9.9 - 7.0) + 7.0).toFixed(1); 
        const dummyViews = Math.floor(Math.random() * 50) + 1 + 'k';

        const cardHTML = `
            <div class="movie-card" onclick="goToDetail('${urlAsli}')">
                <div class="movie-poster">
                    <img src="${poster}" alt="${title}">
                    <div class="badge-new">${badge}</div>
                    <div class="badge-rating"><i class="fa-solid fa-star" style="color: #ffd700;"></i> ${dummyRating}</div>
                    <div class="badge-eps">${episodeText}</div>
                </div>
                <div class="movie-details">
                    <div class="views"><i class="fa-regular fa-eye"></i> ${dummyViews} views</div>
                    <h3 class="title">${title}</h3>
                </div>
            </div>
        `;
        movieGrid.innerHTML += cardHTML;
    });
}

function renderSchedule(scheduleData) {
    movieGrid.innerHTML = `<p style="text-align:center; grid-column: 1/-1; color: #888;">Jadwal belum tersedia.</p>`;
}

// ==========================================
// FUNGSI DETAIL PAGE (NATIVE KOTLIN)
// ==========================================
async function goToDetail(targetUrl, isRestoring = false) {
    globalDetailUrl = targetUrl;
    if (!isRestoring) sessionStorage.setItem('lastPage', 'detail');
    sessionStorage.setItem('detailUrl', targetUrl);

    globalWatchedEps = [];
    globalLastServer = "";
    globalLastEpisodeUrl = ""; 
    isSubscribed = false; 
    
    const subBtn = document.getElementById('btn-subscribe');
    if (subBtn) {
        subBtn.innerHTML = `<i class="fa-regular fa-heart"></i> Subscribe`;
        subBtn.style.border = "none"; subBtn.style.color = "white";
    }

    if (currentUser) {
        try {
            const docHist = await db.collection('users').doc(currentUser.uid).collection('history').doc(encodeURIComponent(targetUrl)).get();
            if (docHist.exists) {
                globalWatchedEps = docHist.data().watchedEpisodes || [];
                globalLastServer = docHist.data().lastServer || "";
                globalLastEpisodeUrl = docHist.data().lastEpisodeUrl || ""; 
            }
            const docSub = await db.collection('users').doc(currentUser.uid).collection('saved').doc(encodeURIComponent(targetUrl)).get();
            if (docSub.exists) {
                isSubscribed = true;
                updateSubscribeUI();
            }
        } catch(e) { console.error("Gagal load firebase data", e); }
    }

    if (!isRestoring) {
        hideAllPages();
        detailPage.style.display = 'block';
        document.getElementById('detail-title').innerText = "Memuat detail...";
        
        const loadingImgSvg = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22300%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%23121215%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22%23ffffff%22%20font-family%3D%22sans-serif%22%20font-size%3D%2220%22%3ELoading...%3C%2Ftext%3E%3C%2Fsvg%3E';
        document.getElementById('detail-image').src = loadingImgSvg;
        
        document.getElementById('episode-list').innerHTML = "";
    }

    try {
        // MENGGUNAKAN NATIVE KOTLIN BRIDGE
        const jsonString = window.NativeAnichin.getDetailAndEpisodes(targetUrl);
        const detailData = JSON.parse(jsonString);

        if (detailData && detailData.title) {
            let baseTitle = detailData.title;
            const titleMatch = detailData.title.match(/^(.*?)\s*(?:Episode|Eps|Season|Subtitle)/i);
            if (titleMatch) baseTitle = titleMatch[1].trim(); 

            const mappedEpisodes = detailData.episodes.map(ep => ({
                text: ep.title,
                url: ep.url,
                date: ep.date
            }));

            let validEpisodes = mappedEpisodes.filter(eps => eps.text.toLowerCase().includes(baseTitle.toLowerCase()));
            if (validEpisodes.length === 0) validEpisodes = mappedEpisodes;

            const uniqueEps = [];
            const seenUrls = new Set();
            for (const eps of validEpisodes) {
                if (!seenUrls.has(eps.url)) { seenUrls.add(eps.url); uniqueEps.push(eps); }
            }

            globalEpisodes = uniqueEps;

            if (!isRestoring) {
                document.getElementById('detail-title').innerText = detailData.title;
                document.getElementById('detail-image').src = detailData.poster;
                document.getElementById('detail-desc').innerText = detailData.description;
                renderEpisodes(uniqueEps, 'episode-list');
            }
        }
    } catch (error) { console.error("Gagal load detail", error); }
}

function cleanEpisodeText(rawText) {
    let cleanText = rawText.replace(/(\r\n|\n|\r)/gm, " ").replace(/\s+/g, ' ').trim();
    let dateStr = "";
    const dateMatch = cleanText.match(/-\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})$/);
    if (dateMatch) dateStr = " - " + dateMatch[1]; 
    let epsNum = "";
    const epsMatch = cleanText.match(/Eps\s*(\d+)/i) || cleanText.match(/Episode\s*(\d+)/i);
    if (epsMatch) epsNum = "Episode " + epsMatch[1];
    else epsNum = cleanText.substring(0, 30) + "..."; 
    if (epsMatch) return epsNum + dateStr;
    return cleanText;
}

function renderEpisodes(episodesArray, containerId) {
    const epsContainer = document.getElementById(containerId);
    epsContainer.innerHTML = ''; 

    episodesArray.forEach(eps => {
        const finalEpsText = cleanEpisodeText(eps.text);
        const isCurrentlyWatching = sessionStorage.getItem('watchUrl') === eps.url ? 'border-left: 4px solid #4a72ff;' : '';
        const isWatchedClass = globalWatchedEps.includes(eps.url) ? 'watched' : '';

        const epsHTML = `
            <div class="eps-btn ${isWatchedClass}" style="${isCurrentlyWatching}" onclick="watchEpisode('${eps.url}')">
                <span><i class="fa-solid fa-circle-play" style="color:#4a72ff;"></i> &nbsp; ${finalEpsText}</span>
            </div>
        `;
        epsContainer.innerHTML += epsHTML;
    });
}

function goBack() {
    const savedCat = sessionStorage.getItem('currentCategory') || 'home';
    const lastP = sessionStorage.getItem('lastPage');
    if (lastP === 'history') clickBottomNav('history');
    else if (lastP === 'saved') clickBottomNav('saved');
    else loadCategory(savedCat, null); 
}

// ==========================================
// FUNGSI MENYIMPAN RIWAYAT KE FIREBASE
// ==========================================
async function saveToFirebaseHistory(epsUrl, epsTitle, serverUrl) {
    if (!currentUser) return; 

    const dTitle = document.getElementById('detail-title').innerText;
    const dImage = document.getElementById('detail-image').src;
    const docRef = db.collection('users').doc(currentUser.uid).collection('history').doc(encodeURIComponent(globalDetailUrl));

    if (!globalWatchedEps.includes(epsUrl)) globalWatchedEps.push(epsUrl);

    try {
        await docRef.set({
            donghuaUrl: globalDetailUrl, title: dTitle, image: dImage,
            lastEpisodeUrl: epsUrl, lastEpisodeText: epsTitle, lastServer: serverUrl,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            watchedEpisodes: globalWatchedEps
        }, { merge: true });
    } catch (error) { console.error("Gagal menyimpan riwayat:", error); }
}

// ==========================================
// FUNGSI PEMUTAR VIDEO (PLAYER) - NEXT STEP
// ==========================================
async function watchEpisode(epsUrl) {
    sessionStorage.setItem('lastPage', 'watch');
    sessionStorage.setItem('watchUrl', epsUrl);

    hideAllPages();
    playerPage.style.display = 'block';
    
    const epsObj = globalEpisodes.find(e => e.url === epsUrl);
    const epsTitle = epsObj ? cleanEpisodeText(epsObj.text) : "Episode Saat Ini";
    document.getElementById('player-title').innerText = "Sedang Nonton: " + epsTitle;

    const iframe = document.getElementById('video-frame');
    const serverSelect = document.getElementById('server-select');
    
    iframe.src = "";
    serverSelect.innerHTML = '<option value="">Server belum dibuat (Tahap Kotlin Berikutnya)</option>';
    document.getElementById('btn-prev').disabled = true;
    document.getElementById('btn-next').disabled = true;

    requestWakeLock();

    // WARNING: BAGIAN INI AKAN KITA ROMBAK PADA TAHAP KOTLIN EXTRACTOR!
    showToast("Fitur Server Video akan ditambahkan selanjutnya!", true);
}

function changeServer(newUrl) {
    document.getElementById('video-frame').src = newUrl;
    globalLastServer = newUrl; 
    
    if (currentUser && globalDetailUrl) {
        db.collection('users').doc(currentUser.uid).collection('history').doc(encodeURIComponent(globalDetailUrl)).update({
            lastServer: newUrl
        }).catch(err => console.log("Gagal update server", err));
    }
}

function playNextPrev(type) {
    const targetUrl = currentNavUrls[type];
    if (targetUrl) watchEpisode(targetUrl); 
}

function goBackFromPlayer() {
    releaseWakeLock();
    document.getElementById('video-frame').src = ""; 
    goToDetail(globalDetailUrl); 
}

async function requestWakeLock() {
    try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (err) {}
}

function releaseWakeLock() {
    if (wakeLock !== null) wakeLock.release().then(() => { wakeLock = null; });
}

function mulaiNonton() {
    if (globalEpisodes.length === 0) {
        showToast("Daftar episode sedang dimuat atau tidak tersedia.", true);
        return;
    }
    if (globalLastEpisodeUrl) {
        showToast("Melanjutkan dari riwayat terakhir...");
        watchEpisode(globalLastEpisodeUrl);
        return;
    }
    const episodePertama = globalEpisodes[globalEpisodes.length - 1];
    showToast("Memulai dari Episode Awal...");
    watchEpisode(episodePertama.url);
}

// ==========================================
// PENGATURAN (WA & CLEAR HISTORY) & DEVICE READY
// ==========================================
function contactAdmin() {
    const cleanNumber = globalWaNumber.replace(/\D/g,'');
    const waUrl = `https://wa.me/${cleanNumber}`;
    window.open(waUrl, '_blank');
}

async function clearHistory() {
    if (!currentUser) return;
    if (!confirm("Apakah kamu yakin ingin menghapus semua riwayat tontonan?")) return;

    try {
        const historyRef = db.collection('users').doc(currentUser.uid).collection('history');
        const snapshot = await historyRef.get();
        if (snapshot.empty) {
            showToast("Riwayat sudah kosong.");
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => { batch.delete(doc.ref); });
        await batch.commit();
        
        globalWatchedEps = []; 
        showToast("Riwayat berhasil dibersihkan!");
    } catch (error) {
        console.error("Gagal menghapus riwayat:", error);
        showToast("Gagal menghapus riwayat.", true);
    }
}

async function deleteSingleHistory(event, donghuaUrl) {
    event.stopPropagation();
    if (!confirm("Hapus donghua ini dari riwayat?")) return; 

    try {
        await db.collection('users').doc(currentUser.uid).collection('history').doc(encodeURIComponent(donghuaUrl)).delete();
        showToast("Berhasil dihapus dari riwayat!");
        loadHistoryFromFirebase();
    } catch (error) {
        showToast("Gagal menghapus riwayat.", true);
    }
}

document.addEventListener('deviceready', function() {
    const fullscreenEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
    fullscreenEvents.forEach(function(eventName) {
        document.addEventListener(eventName, function() {
            const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
            if (isFullscreen) {
                screen.orientation.lock('landscape').catch(function() { screen.orientation.unlock(); });
            } else {
                screen.orientation.lock('portrait').catch(function() {});
            }
        });
    });

    window.origOpen = window.open;
    window.open = function(url, name, features) {
        if (url && (url.includes('wa.me') || url.includes('api.whatsapp.com') || url.includes('whatsapp://'))) {
            return window.origOpen(url, '_system', features);
        }
        console.warn('Pop-up diblokir: ' + url);
        return null; 
    };

    document.addEventListener('click', function(e) {
        let target = e.target.closest('a');
        if (target) {
            let href = target.getAttribute('href');
            if (href && (href.includes('wa.me') || href.includes('api.whatsapp.com') || href.includes('whatsapp://'))) {
                e.preventDefault();
                window.open(href, '_system'); 
            } 
            else if (target.getAttribute('target') === '_blank') {
                e.preventDefault();
            }
        }
    });
}, false);