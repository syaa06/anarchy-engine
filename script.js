// --- DATABASE ENGINE CONFIG (ANARCHY v3.0) ---
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const XP_PER_CHECK = 10;
const XP_PENALTY_UNCHECK = 5;
const XP_PER_NOTE = 20;
const XP_PER_LEVEL = 100;
const MAX_LEVEL = 50;

// ==========================================
// KONEKSI REALTIME DATABASE FIREBASE CLOUD
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDTH_sjqItg-AOJUPL_vLsEB0yMbRCC6zs",
    authDomain: "anarchy-engine.firebaseapp.com",
    projectId: "anarchy-engine",
    storageBucket: "anarchy-engine.firebasestorage.app",
    messagingSenderId: "758632939258",
    appId: "1:758632939258:web:ccd1c591346d07b8145343"
};

// Inisialisasi Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const firestoreDb = firebase.firestore();
const docRef = firestoreDb.collection("user_data").doc("Syaa_dashboard");

// Struktur Data Template Awal (Jika cloud masih kosong)
let db = {
    globalXP: 0,
    currentYear: new Date().getFullYear(),
    habits: [
        "⏰ Bangun Pagi (03.00 - 04.00)",
        "🧼 Mandi Sebelum Shubuh",
        "🧎‍♂️ Qiyamul Lail (Tahajjud)",
        "🕌 Sholat Full Berjamaah",
        "📖 Ngaji",
        "☀️ Sholat Dhuha",
        "🧹 Piket Pondok",
        "💪 Workout Tipis-Tipis",
        "🗣️ Belajar Bahasa",
        "💻 Ngulik IT (Scripting/Cybersec)"
    ],
    archiveData: {},
    financeLogs: []
};

let activeMonthName = MONTH_NAMES[new Date().getMonth()];
let currentSelectedFinanceType = 'INCOME'; 
let trendChart;
let activeDayForNote = null;

// ==========================================
// SYSTEM HELPER: PENGUNCI ARSIP BULANAN
// ==========================================
function getArchiveKey() {
    return `${db.currentYear}-${activeMonthName}`;
}

// FIX LOGIKA SAVE: Gabungkan Cloud Firestore dan Cadangan LocalStorage
function saveDB() {
    // 1. Kirim ke Firebase Cloud
    docRef.set(db)
        .then(() => console.log("🔥 Cloud database berhasil disinkronkan!"))
        .catch((error) => console.error("❌ Gagal sync cloud: ", error));
        
    // 2. Simpan cadangan lokal di HP/Laptop buat jaga-jaga offline
    localStorage.setItem('anarchyDashboardEngine', JSON.stringify(db));
}

// RUN ENGINE UTAMA (DIGABUNG JADI SATU AGAR TIDAK SALING TIMPA)
window.onload = function() {
    // 1. Aktifkan event listener modal bawaan
    setupModalEvents();
    
    // 2. Konek ke database Cloud Firestore secara Realtime Listener
    docRef.onSnapshot((doc) => {
        if (doc.exists()) {
            db = doc.data();
            console.log("⚡ Data Cloud Berhasil Dimuat!");
            
            // Render ulang komponen visual sesuai data cloud terbaru
            if (typeof initHabitDashboard === 'function') initHabitDashboard();
            if (typeof initChart === 'function') {
                setTimeout(() => {
                    if (!trendChart) initChart();
                    else updateChartData();
                }, 50);
            }
            if (typeof renderFinanceDashboard === 'function') renderFinanceDashboard();

        } else {
            // Jika database cloud baru pertama kali dibuat, isi pake template default
            saveDB();
        }
    });
};

// ==========================================
// NAVIGATION CONTROLLER (PAGES ROUTING)
// ==========================================
window.switchPage = function(pageId) {
    document.querySelectorAll('.page-container').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    if (pageId === 'habit-page') {
        initHabitDashboard();
        setTimeout(() => {
            if (!trendChart) initChart();
            else updateChartData();
        }, 50);
    } else if (pageId === 'finance-page') {
        renderFinanceDashboard();
    }
}

// ==========================================
// CORE ENGINE: HABITS CONTROLLER
// ==========================================
function initHabitDashboard() {
    setupMonthSelector();
    buildHabitManagerPanel();
    setupAddHabitEvent();
    buildTrackerTable();
    updateRPGStats();
}

function setupMonthSelector() {
    const monthSelect = document.getElementById('month-select');
    document.getElementById('current-year-display').innerText = db.currentYear;
    
    monthSelect.innerHTML = "";
    MONTH_NAMES.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.innerText = m.toUpperCase();
        if (m === activeMonthName) opt.selected = true;
        monthSelect.appendChild(opt);
    });

    monthSelect.onchange = (e) => {
        activeMonthName = e.target.value;
        if (!db.archiveData[getArchiveKey()]) db.archiveData[getArchiveKey()] = {};
        buildTrackerTable();
        updateChartData();
        updateRPGStats();
    };
}

function buildHabitManagerPanel() {
    const listContainer = document.getElementById('manager-habit-list');
    if (!listContainer) return;
    listContainer.innerHTML = "";
    db.habits.forEach((habitText, idx) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${habitText}</span>
            <button class="delete-habit-btn" onclick="deleteHabit(${idx})">🗑️</button>
        `;
        listContainer.appendChild(li);
    });
}

function setupAddHabitEvent() {
    const addBtn = document.getElementById('add-habit-btn');
    if (!addBtn) return;
    
    addBtn.onclick = function() {
        const input = document.getElementById('new-habit-input');
        let txt = input.value.trim();
        if(txt === "") return;
        
        const randomEmojis = ["🔥", "⚡", "🎯", "🚀", "⚔️", "🛡️", "🔮", "🧠", "📚", "📝", "🏋️‍♂️", "💻", "🔧", "💰", "📈"];
        const hasEmoji = /\p{Emoji}/u.test(txt.charAt(0));
        
        if (!hasEmoji) {
            const randomIdx = Math.floor(Math.random() * randomEmojis.length);
            txt = `${randomEmojis[randomIdx]} ${txt}`;
        }
        
        db.habits.push(txt);
        saveDB();
        input.value = "";
        
        buildHabitManagerPanel();
        buildTrackerTable();
        updateChartData();
        updateRPGStats();
    };
}

window.deleteHabit = function(index) {
    db.habits.splice(index, 1);
    const currentArchive = db.archiveData[getArchiveKey()];
    for (let d = 1; d <= 31; d++) { if(currentArchive) delete currentArchive[`h${index}d${d}`]; }
    saveDB();
    buildHabitManagerPanel();
    buildTrackerTable();
    updateChartData();
    updateRPGStats();
};

function buildTrackerTable() {
    const headerRow = document.getElementById('table-header-row');
    const rowsContainer = document.getElementById('habit-rows-container');
    if (!headerRow || !rowsContainer) return;

    const totalDaysInMonth = new Date(db.currentYear, MONTH_NAMES.indexOf(activeMonthName) + 1, 0).getDate();

    headerRow.innerHTML = `<th class="sticky-col habit-title-th">My Quests</th>`;
    rowsContainer.innerHTML = "";

    const currentArchive = db.archiveData[getArchiveKey()];

    for (let d = 1; d <= totalDaysInMonth; d++) {
        const th = document.createElement('th');
        th.innerText = d;
        th.style.cursor = 'pointer';
        if (currentArchive && currentArchive[`note_day_${d}`]) th.classList.add('has-note');
        // Mobile Friendly Event: click biasa juga dipasang untuk jaga-jaga di layar HP
        th.addEventListener('dblclick', () => openNotesModal(d));
        headerRow.appendChild(th);
    }
    const thTotal = document.createElement('th');
    thTotal.classList.add('total-th');
    thTotal.innerText = "Total";
    headerRow.appendChild(thTotal);

    db.habits.forEach((habitName, habitIdx) => {
        const tr = document.createElement('tr');
        const tdName = document.createElement('td');
        tdName.classList.add('sticky-col');
        tdName.innerText = habitName;
        tr.appendChild(tdName);

        let completedRowCounter = 0;
        for (let d = 1; d <= totalDaysInMonth; d++) {
            const tdCheck = document.createElement('td');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.classList.add('cell-checkbox');
            checkbox.dataset.habit = habitIdx;
            checkbox.dataset.day = d;

            if (currentArchive && currentArchive[`h${habitIdx}d${d}`] === true) {
                checkbox.checked = true;
                completedRowCounter++;
            }
            checkbox.addEventListener('change', handleCheckboxChange);
            tdCheck.appendChild(checkbox);
            tr.appendChild(tdCheck);
        }
        const tdTotal = document.createElement('td');
        tdTotal.classList.add('total-td');
        tdTotal.innerText = completedRowCounter;
        tr.appendChild(tdTotal);
        rowsContainer.appendChild(tr);
    });
}

function handleCheckboxChange(e) {
    const habitIdx = e.target.dataset.habit;
    const day = e.target.dataset.day;
    if (!db.archiveData[getArchiveKey()]) db.archiveData[getArchiveKey()] = {};
    db.archiveData[getArchiveKey()][`h${habitIdx}d${day}`] = e.target.checked;
    saveDB();
    buildTrackerTable(); 
    updateChartData();
    updateRPGStats();
}

function updateRPGStats() {
    const todayDate = new Date();
    const todayDay = todayDate.getDate();
    const activeMonthIdx = MONTH_NAMES.indexOf(activeMonthName);
    const isCurrentMonthActive = (todayDate.getMonth() === activeMonthIdx && todayDate.getFullYear() === db.currentYear);

    let calculatedXP = 0;
    let todayGained = 0, todayLost = 0, todayJournalBonus = 0;

    Object.keys(db.archiveData).forEach(archiveKey => {
        const archive = db.archiveData[archiveKey];
        const isLoopTargetCurrentKey = (archiveKey === getArchiveKey() && isCurrentMonthActive);
        const loopMonthName = archiveKey.split('-')[1];
        const totalDaysInLoopMonth = new Date(db.currentYear, MONTH_NAMES.indexOf(loopMonthName) + 1, 0).getDate();

        for (let d = 1; d <= totalDaysInLoopMonth; d++) {
            db.habits.forEach((_, hIdx) => {
                if (archive[`h${hIdx}d${d}`] === true) {
                    calculatedXP += XP_PER_CHECK;
                    if (isLoopTargetCurrentKey && d === todayDay) todayGained += XP_PER_CHECK;
                } else if (archive[`h${hIdx}d${d}`] === false) {
                    const isPastDay = (!isCurrentMonthActive || d <= todayDay || MONTH_NAMES.indexOf(loopMonthName) < todayDate.getMonth());
                    if (isPastDay) {
                        calculatedXP -= XP_PENALTY_UNCHECK;
                        if (isLoopTargetCurrentKey && d === todayDay) todayLost += XP_PENALTY_UNCHECK;
                    }
                }
            });
            if (archive[`note_day_${d}`]) {
                calculatedXP += XP_PER_NOTE;
                if (isLoopTargetCurrentKey && d === todayDay) todayJournalBonus += XP_PER_NOTE;
            }
        }
    });

    if (calculatedXP < 0) calculatedXP = 0;
    db.globalXP = calculatedXP;

    let currentLevel = Math.floor(db.globalXP / XP_PER_LEVEL) + 1;
    let xpInCurrentLevel = db.globalXP % XP_PER_LEVEL;

    if (currentLevel >= MAX_LEVEL) {
        currentLevel = MAX_LEVEL;
        xpInCurrentLevel = XP_PER_LEVEL;
        document.getElementById('max-lvl-tag').style.display = 'inline';
    } else {
        document.getElementById('max-lvl-tag').style.display = 'none';
    }

    document.getElementById('rpg-level').innerText = currentLevel;
    document.getElementById('rpg-xp-bar').style.width = `${(xpInCurrentLevel / XP_PER_LEVEL) * 100}%`;
    document.getElementById('rpg-xp-text').innerText = currentLevel === MAX_LEVEL ? "MAX LEVEL" : `${xpInCurrentLevel} / ${XP_PER_LEVEL} XP`;

    const reportBox = document.getElementById('daily-report');
    if (isCurrentMonthActive) {
        reportBox.innerHTML = `📅 <strong>Today (Day ${todayDay}):</strong> +${todayGained} XP | -${todayLost} XP penalty | +${todayJournalBonus} XP Log`;
    } else {
        reportBox.innerHTML = `📅 Archival history view mode: <strong>${activeMonthName.toUpperCase()}</strong>.`;
    }
}

function calculateDailyProgress(day) {
    const currentArchive = db.archiveData[getArchiveKey()];
    if(!currentArchive || db.habits.length === 0) return 0;
    let comp = 0;
    db.habits.forEach((_, idx) => { if(currentArchive[`h${idx}d${day}`] === true) comp++; });
    return Math.round((comp / db.habits.length) * 100);
}

function initChart() {
    const canvasElement = document.getElementById('trendChart');
    if (!canvasElement) return;
    const ctx = canvasElement.getContext('2d');
    const totalDaysInMonth = new Date(db.currentYear, MONTH_NAMES.indexOf(activeMonthName) + 1, 0).getDate();
    const labelsX = Array.from({length: totalDaysInMonth}, (_, i) => i + 1);

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labelsX,
            datasets: [{
                data: labelsX.map(d => calculateDailyProgress(d)),
                borderColor: '#00bfff',
                backgroundColor: 'rgba(0, 191, 255, 0.05)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#8b949e', font: { size: 9 } } },
                y: { min: 0, max: 100, ticks: { color: '#8b949e', font: { size: 9 } }, grid: { color: '#2e303b' } }
            }
        }
    });
}

function updateChartData() {
    if (!trendChart) return;
    const totalDaysInMonth = new Date(db.currentYear, MONTH_NAMES.indexOf(activeMonthName) + 1, 0).getDate();
    const labelsX = Array.from({length: totalDaysInMonth}, (_, i) => i + 1);
    trendChart.data.labels = labelsX;
    trendChart.data.datasets[0].data = labelsX.map(d => calculateDailyProgress(d));
    trendChart.update();
}

function openNotesModal(day) {
    activeDayForNote = day;
    const modal = document.getElementById('notes-modal');
    document.getElementById('modal-title').innerText = `Adventure Log - Day ${day} ${activeMonthName}`;
    document.getElementById('modal-text').value = db.archiveData[getArchiveKey()][`note_day_${day}`] || "";
    modal.style.display = "block";
}

function setupModalEvents() {
    const modal = document.getElementById('notes-modal');
    if(!modal) return;
    document.getElementById('close-modal').onclick = () => modal.style.display = "none";
    
    document.getElementById('save-note-btn').onclick = () => {
        if (activeDayForNote !== null) {
            const txt = document.getElementById('modal-text').value.trim();
            if (txt === "") delete db.archiveData[getArchiveKey()][`note_day_${activeDayForNote}`];
            else db.archiveData[getArchiveKey()][`note_day_${activeDayForNote}`] = txt;
            saveDB();
            modal.style.display = "none";
            buildTrackerTable();
            updateRPGStats();
        }
    };
}

// ==========================================
// NEW FEATURES ENGINE: FINANCE CONTROLLER
// ==========================================
window.setFinanceType = function(type) {
    currentSelectedFinanceType = type;
    if (type === 'INCOME') {
        document.getElementById('type-income-btn').classList.add('active');
        document.getElementById('type-expense-btn').classList.remove('active');
    } else {
        document.getElementById('type-expense-btn').classList.add('active');
        document.getElementById('type-income-btn').classList.remove('active');
    }
}

window.addTransaction = function() {
    const descInput = document.getElementById('fin-desc-input');
    const amountInput = document.getElementById('fin-amount-input');
    
    const desc = descInput.value.trim();
    const amount = parseInt(amountInput.value);
    
    if (desc === "" || isNaN(amount) || amount <= 0) {
        alert("Isi deskripsi log & nominal uang dengan benar, Syah!");
        return;
    }
    
    // PENYESUAIAN REAL-TIME LOCAL TIMEZONE HP USER
    const dateNow = new Date();
    const formattedDate = `${dateNow.getDate()} ${MONTH_NAMES[dateNow.getMonth()].substring(0,3)}`;
    
    const newLog = {
        id: Date.now(),
        date: formattedDate,
        desc: desc,
        type: currentSelectedFinanceType,
        amount: amount
    };
    
    db.financeLogs.unshift(newLog); 
    saveDB();
    
    descInput.value = "";
    amountInput.value = "";
    
    renderFinanceDashboard();

    // OPTIMASI MOBILE: Layar HP auto-scroll smooth ke bawah menuju tabel log transaksi setelah klik input
    const historyWrapper = document.querySelector('.finance-history-wrapper');
    if (historyWrapper) {
        historyWrapper.scrollIntoView({ behavior: 'smooth' });
    }
}

window.deleteTransaction = function(id) {
    db.financeLogs = db.financeLogs.filter(item => item.id !== id);
    saveDB();
    renderFinanceDashboard();
}

function renderFinanceDashboard() {
    const logsContainer = document.getElementById('finance-logs-container');
    if(!logsContainer) return;
    logsContainer.innerHTML = "";
    
    let totalBalance = 0;
    
    db.financeLogs.forEach(log => {
        if (log.type === 'INCOME') totalBalance += log.amount;
        else totalBalance -= log.amount;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${log.date}</td>
            <td>${log.desc}</td>
            <td class="${log.type === 'INCOME' ? 'fin-income-row' : 'fin-expense-row'}">${log.type}</td>
            <td class="${log.type === 'INCOME' ? 'fin-income-row' : 'fin-expense-row'}">
                ${log.type === 'INCOME' ? '+' : '-'} Rp ${log.amount.toLocaleString('id-ID')}
            </td>
            <td><button class="delete-habit-btn" onclick="deleteTransaction(${log.id})">🗑️</button></td>
        `;
        logsContainer.appendChild(tr);
    });
    
    const balanceDisplay = document.getElementById('total-balance-display');
    if(balanceDisplay) {
        balanceDisplay.innerText = (totalBalance >= 0 ? '' : '-') + 'Rp ' + Math.abs(totalBalance).toLocaleString('id-ID');
        if (totalBalance < 0) balanceDisplay.style.color = "var(--punk-red)";
        else balanceDisplay.style.color = "var(--punk-gold)";
    }
}