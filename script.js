document.addEventListener('DOMContentLoaded', function() {
    
    // =================================================================
    // PENGATURAN & VARIABEL GLOBAL
    // =================================================================
    
    const DATABASE_URL = 'https://script.google.com/macros/s/AKfycbwPXAa8Df1VcHSPOcjCZOwRt_94H3QX86OdJfvTEl0d0RJfVOjyn1HYc601HRJL5Ulc/exec';
    let SEMUA_TOPIK = {};
    let topikAktif = null;
    let user = { nama: null, sekolah: null };
    let progress = {};

    // Variabel khusus untuk sesi kuis
    let soalKuisSaatIni = [];
    let jawabanPengguna = {};
    let indeksSoalSekarang = 0;

    // =================================================================
    // ELEMEN DOM
    // =================================================================
    const getEl = (id) => document.getElementById(id);

    const confirmationModal = getEl('confirmation-modal'),
          welcomeScreen = getEl('welcome-screen'),
          nameForm = getEl('name-form'),
          appWrapper = getEl('app-wrapper'),
          welcomeMessage = getEl('welcome-message'),
          schoolMessage = getEl('school-message'),
          allPages = document.querySelectorAll('.page'),
          navigationButtons = document.querySelectorAll('.menu-item, .btn-kembali'),
          btnConfirmYes = getEl('btn-confirm-yes'),
          btnConfirmNo = getEl('btn-confirm-no'),
          btnExit = getEl('btn-exit'),
          btnPetunjuk = getEl('btn-petunjuk'),
          btnMateriMenu = getEl('btn-materi-menu'),
          btnVideoMenu = getEl('btn-video-menu'),
          btnLatihanMenu = getEl('btn-latihan-menu'),
          btnMateriSelesai = getEl('btn-materi-selesai'),
          btnVideoSelesai = getEl('btn-video-selesai'),
          materiListContainer = getEl('materi-list'),
          detailContentContainer = getEl('detail-content'),
          detailGambarContainer = getEl('detail-gambar-container'),
          tujuanContent = getEl('tujuan-content'),
          quizContainer = getEl('quiz-container'),
          hasilContentContainer = getEl('hasil-content'),
          btnPrevSoal = getEl('btn-prev-soal'),
          btnNextSoal = getEl('btn-next-soal'),
          btnSubmitQuiz = getEl('btn-submit-quiz');

    // =================================================================
    // FUNGSI INTI & DATA LOADING
    // =================================================================
    async function loadDatabaseAndInit() {
        try {
            welcomeMessage.textContent = 'Memuat data... ⏳';
            const response = await fetch(DATABASE_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            SEMUA_TOPIK = await response.json();
            initUserSession();
        } catch (error) {
            console.error("Gagal memuat database:", error);
            welcomeMessage.textContent = 'Gagal memuat data. Periksa link atau koneksi internet.';
            welcomeScreen.classList.add('hidden');
            confirmationModal.classList.add('hidden');
        }
    }
    
    // =================================================================
    // FUNGSI LOGGING, PROGRES, & SESI PENGGUNA
    // =================================================================
    async function logAction(type, details) { if (!user.nama) return; const payload = { type, nama: user.nama, sekolah: user.sekolah, ...details }; try { await fetch(DATABASE_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch (error) { console.error('Gagal mengirim log:', error); } }
    function saveProgress() { localStorage.setItem('userProgress', JSON.stringify(progress)); }
    function loadProgress() { const savedProgress = localStorage.getItem('userProgress'); progress = savedProgress ? JSON.parse(savedProgress) : {}; }
    function updateActionMenuUI() { if (!topikAktif) return; const topikProgress = progress[topikAktif] || {}; topikProgress.materi ? btnMateriMenu.classList.add('completed') : btnMateriMenu.classList.remove('completed'); topikProgress.video ? btnVideoMenu.classList.add('completed') : btnVideoMenu.classList.remove('completed'); topikProgress.latihan ? btnLatihanMenu.classList.add('completed') : btnLatihanMenu.classList.remove('completed'); const isLatihanUnlocked = topikProgress.materi && topikProgress.video; btnLatihanMenu.disabled = !isLatihanUnlocked; btnLatihanMenu.title = isLatihanUnlocked ? "Klik untuk memulai latihan" : "Selesaikan Materi dan Video untuk membuka latihan"; }
    function startApp(userData) { user = userData; loadProgress(); welcomeMessage.textContent = `Selamat belajar, ${user.nama}!`; schoolMessage.textContent = user.sekolah; appWrapper.classList.remove('hidden'); confirmationModal.classList.add('hidden'); welcomeScreen.classList.add('hidden'); renderPilihanTopik(); logAction('log', { aktivitas: 'Memulai Sesi Belajar' }); }
    function resetAndStartOver() { logAction('log', { aktivitas: 'Keluar dari Sesi' }); localStorage.removeItem('userData'); localStorage.removeItem('userProgress'); setTimeout(() => { location.reload(); }, 300); }
    function initUserSession() { const savedUser = localStorage.getItem('userData'); if (savedUser) { const userData = JSON.parse(savedUser); getEl("confirmation-name").textContent = userData.nama; getEl("confirmation-school").textContent = userData.sekolah; confirmationModal.classList.remove('hidden'); } else { welcomeScreen.classList.remove('hidden'); } }

    // =================================================================
    // FUNGSI RENDER KONTEN
    // =================================================================
    function renderPilihanTopik() {
        const berandaMenu = document.querySelector("#beranda .beranda-menu");
        berandaMenu.innerHTML = "";
        for (const topikId in SEMUA_TOPIK) {
            const topik = SEMUA_TOPIK[topikId];
            const tombolTopik = document.createElement("button");
            tombolTopik.className = "topic-button";
            tombolTopik.innerHTML = `<i class='bx bxs-chevron-right-circle'></i><span>${topik.judul}</span>`;
            tombolTopik.addEventListener("click", () => {
                topikAktif = topikId;
                getEl("judul-topik").textContent = topik.judul;

                if (tujuanContent) {
                    const tujuanTeks = topik.tujuan_pembelajaran;
                    if (tujuanTeks && tujuanTeks.includes('|')) {
                        const poinArray = tujuanTeks.split('|').map(poin => `<li>${poin.trim()}</li>`);
                        tujuanContent.innerHTML = `<ol>${poinArray.join('')}</ol>`;
                    } else if (tujuanTeks) {
                        tujuanContent.innerHTML = `<p>${tujuanTeks}</p>`;
                    } else {
                        tujuanContent.innerHTML = "<p>Tujuan pembelajaran untuk topik ini belum tersedia.</p>";
                    }
                }

                const videoPlayer = getEl('video-player');
                if (videoPlayer) { videoPlayer.src = topik.video_embed_url || ""; }

                updateActionMenuUI();
                navigateTo("menu-tindakan");
                logAction("log", { aktivitas: `Memilih Topik: ${topik.judul}` });
            });
            berandaMenu.appendChild(tombolTopik);
        }
    }

    function renderMateri() {
        if (!topikAktif) return;
        const dataMateri = SEMUA_TOPIK[topikAktif].materi;
        materiListContainer.innerHTML = "";
        dataMateri.forEach(item => {
            const card = document.createElement("div");
            card.className = "card";
            card.innerHTML = `
                <div class="arab">${item.arab || ''}</div>
                <div class="card-info">
                    <h3>${item.nama}</h3>
                    <p>${item.arti}</p>
                </div>
            `;
            card.addEventListener("click", () => { showDetail(item.id); navigateTo("detail-materi"); });
            materiListContainer.appendChild(card);
        });
    }

    function showDetail(id) {
        const item = SEMUA_TOPIK[topikAktif].materi.find(data => data.id == id);
        if (item.gambar_url) {
            detailGambarContainer.innerHTML = `<img src="${item.gambar_url}" alt="${item.nama}">`;
        } else {
            detailGambarContainer.innerHTML = '';
        }
        detailContentContainer.innerHTML = `<p class="arab">${item.arab || ""}</p><h3>${item.nama}</h3><h4>"${item.arti}"</h4><p>${item.penjelasan}</p>`;
    }

    function renderQuiz() {
        if (!topikAktif || !SEMUA_TOPIK[topikAktif] || !SEMUA_TOPIK[topikAktif].kuis || SEMUA_TOPIK[topikAktif].kuis.length === 0) {
            quizContainer.innerHTML = "<p>Soal latihan untuk topik ini belum tersedia.</p>";
            getEl('quiz-navigator').innerHTML = '';
            btnPrevSoal.style.visibility = 'hidden';
            btnNextSoal.style.visibility = 'hidden';
            btnSubmitQuiz.style.display = 'none';
            return;
        }
        btnSubmitQuiz.style.display = 'block';
        soalKuisSaatIni = shuffle([...SEMUA_TOPIK[topikAktif].kuis]);
        jawabanPengguna = {};
        indeksSoalSekarang = 0;
        quizContainer.innerHTML = '';
        soalKuisSaatIni.forEach((soal, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'quiz-question';
            questionDiv.id = `soal-container-${index}`;
            questionDiv.dataset.soalId = soal.id;
            questionDiv.dataset.soalTipe = soal.tipe;
            let questionHTML = soal.gambar_url ? `<img src="${soal.gambar_url}" alt="Gambar soal ${index + 1}">` : '';
            questionHTML += `<p><strong>${index + 1}. ${soal.pertanyaan}</strong></p>`;
            if (soal.tipe === 'menjodohkan') questionHTML += renderSoalMenjodohkan(soal, index);
            else if (soal.tipe === 'pilihan_ganda_kompleks') questionHTML += renderSoalPGKompleks(soal);
            else questionHTML += renderSoalPGBiasa(soal);
            questionDiv.innerHTML = questionHTML;
            quizContainer.appendChild(questionDiv);
        });
        renderNavigasiSoal();
        tampilkanSoal(0);
        inisialisasiDragAndDrop();
        tambahkanListenerJawaban();
    }
    
    // ... Sisa fungsi render kuis tidak berubah (renderNavigasiSoal, tampilkanSoal, renderSoalPGBiasa, dll.)
    function renderNavigasiSoal(){const e=getEl("nav-numbers-container");e.innerHTML="",soalKuisSaatIni.forEach((t,o)=>{const n=document.createElement("button");n.className="nav-number",n.id=`nav-num-${o}`,n.textContent=o+1,n.addEventListener("click",()=>tampilkanSoal(o)),e.appendChild(n)})}function tampilkanSoal(e){document.querySelectorAll(".quiz-question").forEach(e=>e.classList.remove("current-question")),getEl(`soal-container-${e}`)?.classList.add("current-question"),document.querySelectorAll(".nav-number").forEach(e=>e.classList.remove("current")),getEl(`nav-num-${e}`)?.classList.add("current"),indeksSoalSekarang=e,btnPrevSoal.style.visibility=0===e?"hidden":"visible",btnNextSoal.style.visibility=e===soalKuisSaatIni.length-1?"hidden":"visible"}function renderSoalPGBiasa(e){const t=shuffle([...e.pilihan]);return`<div class="quiz-options">${t.map(t=>`<label><input type="radio" name="soal_${e.id}" value="${t}" required> ${t}</label>`).join("")}</div>`}function renderSoalPGKompleks(e){const t=shuffle([...e.pilihan]);return`<div class="quiz-options">${t.map(t=>`<label><input type="checkbox" name="soal_${e.id}" value="${t}"> ${t}</label>`).join("")}</div>`}function renderSoalMenjodohkan(e,t){const o=e.pilihan,n=shuffle([...e.jawaban]);let i=`<option value="">-- Pilih Jawaban --</option>${n.map(e=>`<option value="${e}">${e}</option>`).join("")}`;return`<div class="matching-container-dnd"><div class="matching-column">${o.map(e=>`<div class="matching-item-static">${e}</div>`).join("")}</div><div class="matching-column drop-area" id="drop-area-${t}">${o.map((e,t)=>`<div class="drop-zone" data-index="${t}"></div>`).join("")}</div><div class="matching-column drag-area" id="drag-area-${t}">${n.map(e=>`<div class="matching-item-draggable" data-value="${e}">${e}</div>`).join("")}</div></div>`}
    
    // =================================================================
    // FUNGSI INTI INTERAKSI KUIS
    // =================================================================
    function inisialisasiDragAndDrop(){soalKuisSaatIni.forEach((e,t)=>{if("menjodohkan"===e.tipe){const o=getEl(`drag-area-${t}`),n=document.querySelectorAll(`#drop-area-${t} .drop-zone`);o&&new Sortable(o,{group:`soal-${t}`,animation:150}),n.forEach(s=>{new Sortable(s,{group:`soal-${t}`,animation:150,onAdd:function(s){s.target.children.length>1&&o.appendChild(s.item),simpanJawaban(e.id,t)},onRemove:()=>simpanJawaban(e.id,t)})})}})}
    function tambahkanListenerJawaban(){quizContainer.addEventListener("change",e=>{if(e.target.matches('input[type="radio"], input[type="checkbox"]')){const t=e.target.closest(".quiz-question");if(t){const o=soalKuisSaatIni.findIndex(e=>e.id==t.dataset.soalId);simpanJawaban(t.dataset.soalId,o)}}})}
    function simpanJawaban(e,t){const o=getEl(`soal-container-${t}`);if(!o)return;const n=o.dataset.soalTipe;if(o.querySelectorAll(".quiz-options label").forEach(e=>e.classList.remove("selected")),"menjodohkan"===n){const t=getEl(`drop-area-${t}`);jawabanPengguna[e]=Array.from(t.querySelectorAll(".drop-zone")).map(e=>{const t=e.querySelector(".matching-item-draggable");return t?t.dataset.value:""})}else if("pilihan_ganda_kompleks"===n){const t=o.querySelectorAll("input:checked");jawabanPengguna[e]=Array.from(t).map(e=>(e.parentElement.classList.add("selected"),e.value))}else{const t=o.querySelector("input:checked");t?(t.parentElement.classList.add("selected"),jawabanPengguna[e]=t.value):jawabanPengguna[e]=void 0}const i=getEl(`nav-num-${t}`),a=jawabanPengguna[e];i&&(a&&a.length>0&&!(1===a.length&&!a[0])?i.classList.add("answered"):i.classList.remove("answered"))}

    // =================================================================
    // FUNGSI BANTUAN & EVENT LISTENERS
    // =================================================================
    function shuffle(e){let t,o,n=e.length;for(;n;)o=Math.floor(Math.random()*n--),t=e[n],e[n]=e[o],e[o]=t;return e}
    function navigateTo(e){const t=getEl(e);allPages.forEach(e=>e.classList.remove("active")),t&&t.classList.add("active")}
    const addSafeListener=(e,t,o)=>{e?e.addEventListener(t,o):console.warn(`Elemen tidak ditemukan untuk event listener: ${e?.id||"tanpa id"}`)};
    addSafeListener(btnConfirmYes,"click",()=>startApp(JSON.parse(localStorage.getItem("userData"))));
    addSafeListener(btnConfirmNo,"click",resetAndStartOver);
    addSafeListener(btnExit,"click",resetAndStartOver);
    addSafeListener(btnPetunjuk,"click",()=>navigateTo("petunjuk"));
    addSafeListener(nameForm,"submit",e=>{e.preventDefault();const t={nama:getEl("nama-input").value.trim(),sekolah:getEl("sekolah-input").value.trim()};if(t.nama&&t.sekolah){localStorage.setItem("userData",JSON.stringify(t));startApp(t)}});
    navigationButtons.forEach(e=>{addSafeListener(e,"click",function(){if("btn-latihan-menu"===this.id&&this.disabled)return void alert("Selesaikan Materi dan Video terlebih dahulu untuk membuka latihan.");const t=this.dataset.target;navigateTo(t),"latihan"===t&&renderQuiz(),"materi"===t&&renderMateri()})});
    addSafeListener(btnMateriSelesai,"click",()=>{progress[topikAktif]||(progress[topikAktif]={}),progress[topikAktif].materi=!0,saveProgress(),logAction("log",{aktivitas:`Selesai Materi: ${SEMUA_TOPIK[topikAktif].judul}`}),alert("Progres materi disimpan!"),updateActionMenuUI(),navigateTo("menu-tindakan")});
    addSafeListener(btnVideoSelesai,"click",()=>{progress[topikAktif]||(progress[topikAktif]={}),progress[topikAktif].video=!0,saveProgress(),logAction("log",{aktivitas:`Selesai Video: ${SEMUA_TOPIK[topikAktif].judul}`}),alert("Progres video disimpan!"),updateActionMenuUI(),navigateTo("menu-tindakan")});
    addSafeListener(btnNextSoal,"click",()=>{indeksSoalSekarang<soalKuisSaatIni.length-1&&tampilkanSoal(indeksSoalSekarang+1)});
    addSafeListener(btnPrevSoal,"click",()=>{indeksSoalSekarang>0&&tampilkanSoal(indeksSoalSekarang-1)});
    addSafeListener(btnSubmitQuiz,"click",e=>{e.preventDefault();const t=Object.values(jawabanPengguna).filter(e=>e&&e.length>0&&!(1===e.length&&!e[0])).length;if(t<soalKuisSaatIni.length&&!confirm("Beberapa soal belum dijawab. Yakin ingin mengumpulkan?"))return;let o=0;soalKuisSaatIni.forEach(e=>{const t=jawabanPengguna[e.id];if(t){if("pilihan_ganda_kompleks"===e.tipe||"menjodohkan"===e.tipe){if(JSON.stringify([...e.jawaban].sort())===JSON.stringify([...t].sort()))o++}else if(t===e.jawaban)o++}});const n=soalKuisSaatIni.length,i=n>0?o/n*100:0;hasilContentContainer.innerHTML=`<p>Alhamdulillah, ${user.nama}!</p><p>Kamu menjawab <strong>${o}</strong> dari <strong>${n}</strong> soal dengan benar.</p><h2>Nilai Kamu: ${i.toFixed(0)}</h2>`,logAction("skor",{topik:SEMUA_TOPIK[topikAktif].judul,skor:i.toFixed(0),jawabanBenar:o,totalSoal:n}),progress[topikAktif]||(progress[topikAktif]={}),progress[topikAktif].latihan=!0,saveProgress(),navigateTo("hasil-latihan")});
    
    // =================================================================
    // INISIALISASI APLIKASI
    // =================================================================
    loadDatabaseAndInit();
});