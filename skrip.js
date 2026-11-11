const { createApp, ref, reactive, computed, onMounted } = Vue;

// KONFIGURASI SUPABASE
const SUPABASE_URL = 'https://ajpzgfbouohodcqtxhoo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcHpnZmJvdW9ob2RjcXR4aG9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMTgzMzMsImV4cCI6MjA2OTg5NDMzM30.Om-i-MsYYB_rjMrnNsMvt3do8bHGBIRf2z7l6NLt8Vk';

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

createApp({
    setup() {
        let dbClient = null;

        const participants = ref([]);
        const currentParticipantId = ref('');
        const activeView = ref('dashboard');
        const selectedMonth = ref(new Date().getMonth());
        const selectedYear = ref(new Date().getFullYear());
        const isLoading = ref(false);
        const loadingMessage = ref('');
        const supabaseConnected = ref(false);

        const isAuthenticated = ref(false);
        const adminPassword = ref('');
        const showAdminModal = ref(false);
        const adminForm = reactive({ name: '' });

        const newZiyadahFrom = ref(null);
        const newZiyadahTo = ref(null);
        const newTasmikJuz = ref(null);

        // Modal edit riwayat
        const editForm = reactive({ open: false, type: '', index: -1, from: null, to: null, juz: null });

        // Toast
        const toastMsg = ref('');
        let toastTimer = null;
        const toast = (msg) => {
            toastMsg.value = msg;
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => toastMsg.value = '', 2200);
        };

        // ---------- COMPUTED ----------
        const currentParticipant = computed(() =>
            participants.value.find(p => p.id === currentParticipantId.value) || null);

        const daysInSelectedMonth = computed(() =>
            new Date(selectedYear.value, selectedMonth.value + 1, 0).getDate());

        const yearOptions = computed(() => {
            const y = new Date().getFullYear();
            return [y - 2, y - 1, y, y + 1];
        });

        const calculateTaskPercentage = (p) => {
            const now = new Date();
            const isCurrent = selectedMonth.value === now.getMonth() && selectedYear.value === now.getFullYear();
            const isFuture = new Date(selectedYear.value, selectedMonth.value, 1) > now;
            if (isFuture) return 0;
            const days = isCurrent ? now.getDate() : daysInSelectedMonth.value;
            let done = 0;
            for (let i = 1; i <= days; i++) {
                if (p.dailyTasks && p.dailyTasks[`${selectedYear.value}-${selectedMonth.value}-${i}`]) done++;
            }
            return days ? Math.round((done / days) * 100) : 0;
        };

        const calculateTotalZiyadah = (p) =>
            (p?.ziyadah || []).reduce((t, it) => t + (it.to - it.from + 1), 0);

        const dailyTaskPercentage = computed(() =>
            currentParticipant.value ? calculateTaskPercentage(currentParticipant.value) : 0);

        const sortedParticipants = computed(() =>
            [...participants.value].sort((a, b) => a.name.localeCompare(b.name, 'id')));

        const sortedParticipantsByProgress = computed(() =>
            [...participants.value].sort((a, b) =>
                calculateTaskPercentage(b) - calculateTaskPercentage(a) ||
                calculateTotalZiyadah(b) - calculateTotalZiyadah(a) ||
                b.tasmikJuz.length - a.tasmikJuz.length));

        // Riwayat: terbaru di atas, tetap simpan index asli untuk edit/hapus
        const ziyadahList = computed(() =>
            (currentParticipant.value?.ziyadah || []).map((z, i) => ({ ...z, i })).reverse());

        const tasmikList = computed(() =>
            [...(currentParticipant.value?.tasmikJuz || [])]
                .map((juz, i) => ({ juz, i }))
                .sort((a, b) => a.juz - b.juz));

        // ---------- DATABASE ----------
        const initSupabase = async () => {
            try {
                if (typeof window.supabase !== 'undefined') {
                    dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                    const { error } = await dbClient.from('participants').select('count', { count: 'exact', head: true });
                    if (!error) { supabaseConnected.value = true; return true; }
                }
            } catch (e) { console.log('Mode Offline / Lokal'); }
            return false;
        };

        const loadData = async () => {
            isLoading.value = true;
            let loaded = false;
            if (supabaseConnected.value && dbClient) {
                const { data } = await dbClient.from('participants').select('*');
                if (data && data.length > 0) {
                    participants.value = data.map(p => ({
                        id: p.id, name: p.name,
                        ziyadah: p.ziyadah || [],
                        dailyTasks: p.daily_tasks || {},
                        tasmikJuz: p.tasmik_juz || []
                    }));
                    loaded = true;
                }
            }
            if (!loaded) {
                const local = localStorage.getItem('tahfidz_data');
                if (local) participants.value = JSON.parse(local);
            }
            // Restore peserta terakhir (sekarang juga berlaku saat online)
            const lastUser = localStorage.getItem('tahfidz_last_user');
            if (lastUser && participants.value.some(p => p.id === parseInt(lastUser))) {
                currentParticipantId.value = parseInt(lastUser);
            }
            isLoading.value = false;
        };

        const saveData = async () => {
            localStorage.setItem('tahfidz_data', JSON.stringify(participants.value));
            localStorage.setItem('tahfidz_last_user', currentParticipantId.value);
            if (supabaseConnected.value && dbClient && currentParticipant.value) {
                const p = currentParticipant.value;
                try {
                    const { error } = await dbClient.from('participants').upsert({
                        id: p.id, name: p.name, ziyadah: p.ziyadah,
                        daily_tasks: p.dailyTasks, tasmik_juz: p.tasmikJuz,
                        updated_at: new Date().toISOString()
                    });
                    if (error) throw error;
                } catch (e) {
                    toast('Tersimpan di HP, belum masuk server');
                }
            }
        };

        const syncData = async () => {
            if (!supabaseConnected.value || !dbClient) return;
            isLoading.value = true;
            loadingMessage.value = 'Sinkronisasi...';
            for (const p of participants.value) {
                await dbClient.from('participants').upsert({
                    id: p.id, name: p.name, ziyadah: p.ziyadah,
                    daily_tasks: p.dailyTasks, tasmik_juz: p.tasmikJuz
                });
            }
            isLoading.value = false;
            toast('Sinkronisasi selesai');
        };

        // ---------- CHECKLIST HARIAN ----------
        const dayKey = (day) => `${selectedYear.value}-${selectedMonth.value}-${day}`;
        const isFutureDay = (day) => new Date(selectedYear.value, selectedMonth.value, day) > new Date();
        const isToday = (day) => {
            const n = new Date();
            return n.getDate() === day && n.getMonth() === selectedMonth.value && n.getFullYear() === selectedYear.value;
        };
        const getTaskStatus = (day) => !!currentParticipant.value?.dailyTasks?.[dayKey(day)];
        const toggleDailyTask = (day) => {
            if (isFutureDay(day)) return;
            const p = currentParticipant.value;
            if (!p.dailyTasks) p.dailyTasks = {};
            p.dailyTasks[dayKey(day)] = !p.dailyTasks[dayKey(day)];
            saveData();
        };

        // ---------- ZIYADAH ----------
        const validPage = (n) => Number.isInteger(n) && n >= 1 && n <= 604;

        const addZiyadah = () => {
            const from = newZiyadahFrom.value, to = newZiyadahTo.value;
            if (!validPage(from) || !validPage(to)) return toast('Halaman harus 1–604');
            if (from > to) return toast('"Dari" tidak boleh lebih besar dari "Sampai"');
            currentParticipant.value.ziyadah.push({ from, to, date: new Date().toISOString() });
            newZiyadahFrom.value = null; newZiyadahTo.value = null;
            saveData();
            toast('Ziyadah disimpan');
        };

        // ---------- TASMIK ----------
        const addTasmik = () => {
            const juz = newTasmikJuz.value;
            if (!Number.isInteger(juz) || juz < 1 || juz > 30) return toast('Juz harus 1–30');
            if (currentParticipant.value.tasmikJuz.includes(juz)) return toast(`Juz ${juz} sudah tercatat`);
            currentParticipant.value.tasmikJuz.push(juz);
            newTasmikJuz.value = null;
            saveData();
            toast('Tasmik disimpan');
        };

        // ---------- EDIT / HAPUS RIWAYAT ----------
        const openEdit = (type, index) => {
            const p = currentParticipant.value;
            Object.assign(editForm, { open: true, type, index, from: null, to: null, juz: null });
            if (type === 'ziyadah') {
                editForm.from = p.ziyadah[index].from;
                editForm.to = p.ziyadah[index].to;
            } else {
                editForm.juz = p.tasmikJuz[index];
            }
        };

        const saveEdit = () => {
            const p = currentParticipant.value;
            if (editForm.type === 'ziyadah') {
                if (!validPage(editForm.from) || !validPage(editForm.to)) return toast('Halaman harus 1–604');
                if (editForm.from > editForm.to) return toast('"Dari" tidak boleh lebih besar dari "Sampai"');
                p.ziyadah[editForm.index].from = editForm.from;
                p.ziyadah[editForm.index].to = editForm.to;
            } else {
                const juz = editForm.juz;
                if (!Number.isInteger(juz) || juz < 1 || juz > 30) return toast('Juz harus 1–30');
                if (p.tasmikJuz.some((j, i) => j === juz && i !== editForm.index)) return toast(`Juz ${juz} sudah tercatat`);
                p.tasmikJuz[editForm.index] = juz;
            }
            editForm.open = false;
            saveData();
            toast('Perubahan disimpan');
        };

        const deleteEdit = () => {
            if (!confirm('Hapus catatan ini?')) return;
            const p = currentParticipant.value;
            (editForm.type === 'ziyadah' ? p.ziyadah : p.tasmikJuz).splice(editForm.index, 1);
            editForm.open = false;
            saveData();
            toast('Catatan dihapus');
        };

        const formatDate = (iso) => iso
            ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
            : '';

        // ---------- ADMIN ----------
        const adminLogin = () => {
            if (adminPassword.value === 'admin123') isAuthenticated.value = true;
            else toast('Password salah');
        };
        const logout = () => { isAuthenticated.value = false; adminPassword.value = ''; activeView.value = 'dashboard'; };
        const showAddModal = () => { adminForm.name = ''; showAdminModal.value = true; };

        const saveParticipant = async () => {
            const name = adminForm.name.trim();
            if (!name) return;
            if (participants.value.some(p => p.name.toLowerCase() === name.toLowerCase())) return toast('Nama sudah ada');
            const newP = { id: Date.now(), name, ziyadah: [], dailyTasks: {}, tasmikJuz: [] };
            participants.value.push(newP);
            showAdminModal.value = false;
            if (supabaseConnected.value && dbClient) {
                await dbClient.from('participants').insert([{ id: newP.id, name, ziyadah: [], daily_tasks: {}, tasmik_juz: [] }]);
            }
            saveData();
        };

        const deleteParticipant = async (id) => {
            if (!confirm('Hapus peserta ini?')) return;
            participants.value = participants.value.filter(p => p.id !== id);
            if (currentParticipantId.value === id) currentParticipantId.value = '';
            if (supabaseConnected.value && dbClient) await dbClient.from('participants').delete().eq('id', id);
            saveData();
        };

        // ---------- LAPORAN WA ----------
        const copyReportToClipboard = () => {
            if (!participants.value.length) return toast('Data peserta kosong');
            const tgl = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            let text = `*LAPORAN MUROJAAH ${MONTHS[selectedMonth.value].toUpperCase()} ${selectedYear.value}*\n${tgl}\n\n`;
            sortedParticipantsByProgress.value.forEach((p, i) => {
                text += `${i + 1}. ${p.name} — *${calculateTaskPercentage(p)}%*\n`;
            });
            navigator.clipboard.writeText(text)
                .then(() => toast('Laporan tersalin, paste di WhatsApp'))
                .catch(() => toast('Gagal menyalin laporan'));
        };

        onMounted(async () => { await initSupabase(); await loadData(); });

        return {
            participants, currentParticipant, currentParticipantId, activeView,
            selectedMonth, selectedYear, monthNames: MONTHS, yearOptions,
            isLoading, loadingMessage, supabaseConnected, toastMsg,
            isAuthenticated, adminPassword, showAdminModal, adminForm,
            newZiyadahFrom, newZiyadahTo, newTasmikJuz, editForm,
            daysInSelectedMonth, dailyTaskPercentage,
            sortedParticipants, sortedParticipantsByProgress, ziyadahList, tasmikList,
            calculateTotalZiyadah, calculateTaskPercentage,
            isFutureDay, isToday, getTaskStatus, toggleDailyTask,
            addZiyadah, addTasmik, openEdit, saveEdit, deleteEdit, formatDate,
            adminLogin, logout, showAddModal, saveParticipant, deleteParticipant,
            syncData, copyReportToClipboard
        };
    }
}).mount('#app');