
        const { createApp, ref, reactive, computed, onMounted, watch } = Vue;
        
        // KONFIGURASI SUPABASE
        const SUPABASE_URL = 'https://ajpzgfbouohodcqtxhoo.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcHpnZmJvdW9ob2RjcXR4aG9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMTgzMzMsImV4cCI6MjA2OTg5NDMzM30.Om-i-MsYYB_rjMrnNsMvt3do8bHGBIRf2z7l6NLt8Vk';

        createApp({
            setup() {
                // STATE UTAMA
                // GANTI NAMA VARIABEL SUPABASE AGAR TIDAK BENTROK
                let dbClient = null; 
                
                const participants = ref([]);
                const currentParticipantId = ref('');
                const activeView = ref('dashboard');
                const selectedMonth = ref(new Date().getMonth());
                const selectedYear = ref(new Date().getFullYear());
                const isLoading = ref(false);
                const loadingMessage = ref('');
                const supabaseConnected = ref(false);

                // AUTH & ADMIN
                const isAuthenticated = ref(false);
                const adminPassword = ref('');
                const showAdminModal = ref(false);
                const adminForm = reactive({ name: '' });

                // INPUT STATE
                const newZiyadahFrom = ref(null);
                const newZiyadahTo = ref(null);
                const newTasmikJuz = ref(null);

                // COMPUTED
                const currentParticipant = computed(() => {
                    return participants.value.find(p => p.id === currentParticipantId.value) || null;
                });

                const daysInSelectedMonth = computed(() => {
                    return new Date(selectedYear.value, selectedMonth.value + 1, 0).getDate();
                });

                const dailyTaskPercentage = computed(() => {
                    if (!currentParticipant.value) return 0;
                    return calculateTaskPercentage(currentParticipant.value);
                });

                // Tambahkan di bagian COMPUTED (sekitar baris 285-295)
// Letakkan setelah computed dailyTaskPercentage

const sortedParticipants = computed(() => {
    return [...participants.value].sort((a, b) => 
        a.name.localeCompare(b.name, 'id')
    );
});

const sortedParticipantsByProgress = computed(() => {
    return [...participants.value].sort((a, b) => {
        const percentA = calculateTaskPercentage(a);
        const percentB = calculateTaskPercentage(b);
        
        // Urutkan dari tertinggi ke terendah
        if (percentB !== percentA) {
            return percentB - percentA;
        }
        
        // Jika persentase sama, urutkan berdasarkan total hafalan
        const hafalanA = calculateTotalZiyadah(a);
        const hafalanB = calculateTotalZiyadah(b);
        if (hafalanB !== hafalanA) {
            return hafalanB - hafalanA;
        }
        
        // Jika masih sama, urutkan berdasarkan jumlah juz tasmik
        return b.tasmikJuz.length - a.tasmikJuz.length;
    });
});

                // --- LOGIKA DATABASE ---
                const initSupabase = async () => {
                    try {
                        // MENGGUNAKAN WINDOW.SUPABASE UNTUK AKSES LIBRARY
                        if (typeof window.supabase !== 'undefined') {
                            dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                            
                            // Cek koneksi sederhana
                            const { data, error } = await dbClient.from('participants').select('count', { count: 'exact', head: true });
                            if (!error) {
                                supabaseConnected.value = true;
                                console.log("Supabase terkoneksi!");
                                return true;
                            }
                        }
                    } catch (e) {
                        console.log("Mode Offline / Lokal");
                    }
                    return false;
                };

                const loadData = async () => {
                    isLoading.value = true;
                    // Coba load dari Supabase dulu
                    if (supabaseConnected.value && dbClient) {
                        const { data } = await dbClient.from('participants').select('*');
                        if (data && data.length > 0) {
                            participants.value = data.map(p => ({
                                id: p.id,
                                name: p.name,
                                ziyadah: p.ziyadah || [],
                                dailyTasks: p.daily_tasks || {},
                                tasmikJuz: p.tasmik_juz || []
                            }));
                            isLoading.value = false;
                            return;
                        }
                    }

                    // Fallback ke LocalStorage
                    const local = localStorage.getItem('tahfidz_data');
                    if (local) {
                        participants.value = JSON.parse(local);
                    }
                    
                    // Restore last selection
                    const lastUser = localStorage.getItem('tahfidz_last_user');
                    if (lastUser) currentParticipantId.value = parseInt(lastUser);
                    
                    isLoading.value = false;
                };

                const saveData = async () => {
                    // Simpan ke LocalStorage
                    localStorage.setItem('tahfidz_data', JSON.stringify(participants.value));
                    localStorage.setItem('tahfidz_last_user', currentParticipantId.value);

                    // Simpan ke Supabase jika online dan ada peserta terpilih
                    if (supabaseConnected.value && dbClient && currentParticipant.value) {
                        const p = currentParticipant.value;
                        await dbClient.from('participants').upsert({
                            id: p.id,
                            name: p.name,
                            ziyadah: p.ziyadah,
                            daily_tasks: p.dailyTasks,
                            tasmik_juz: p.tasmikJuz,
                            updated_at: new Date().toISOString()
                        });
                    }
                };

                const syncData = async () => {
                    if (!supabaseConnected.value || !dbClient) return;
                    isLoading.value = true;
                    loadingMessage.value = "Sinkronisasi...";
                    for (const p of participants.value) {
                        await dbClient.from('participants').upsert({
                            id: p.id,
                            name: p.name,
                            ziyadah: p.ziyadah,
                            daily_tasks: p.dailyTasks,
                            tasmik_juz: p.tasmikJuz
                        });
                    }
                    isLoading.value = false;
                    alert("Sinkronisasi Selesai!");
                };

                // --- LOGIKA UI ---
                const calculateTotalZiyadah = (p) => {
                    if (!p || !p.ziyadah) return 0;
                    return p.ziyadah.reduce((total, item) => total + (item.to - item.from + 1), 0);
                };

const calculateTaskPercentage = (p) => {
    const now = new Date();
    let daysToCompare;

    // Cek apakah bulan/tahun yang dipilih adalah bulan berjalan
    if (selectedMonth.value === now.getMonth() && selectedYear.value === now.getFullYear()) {
        daysToCompare = now.getDate(); // Pembagi adalah tanggal hari ini
    } else {
        daysToCompare = daysInSelectedMonth.value; // Pembagi adalah total hari (untuk bulan lalu)
    }

    let completed = 0;
    for (let i = 1; i <= daysToCompare; i++) {
        const key = `${selectedYear.value}-${selectedMonth.value}-${i}`;
        if (p.dailyTasks && p.dailyTasks[key]) completed++;
    }

    if (daysToCompare === 0) return 0;
    return Math.round((completed / daysToCompare) * 100);
};

                const addZiyadah = () => {
                    if (!newZiyadahFrom.value || !newZiyadahTo.value) return;
                    currentParticipant.value.ziyadah.push({
                        from: newZiyadahFrom.value,
                        to: newZiyadahTo.value,
                        date: new Date().toISOString()
                    });
                    newZiyadahFrom.value = null; newZiyadahTo.value = null;
                    saveData();
                };

                const addTasmik = () => {
                    if (!newTasmikJuz.value) return;
                    if (!currentParticipant.value.tasmikJuz.includes(newTasmikJuz.value)) {
                        currentParticipant.value.tasmikJuz.push(newTasmikJuz.value);
                        saveData();
                    }
                    newTasmikJuz.value = null;
                };

                const toggleDailyTask = (day) => {
                    const key = `${selectedYear.value}-${selectedMonth.value}-${day}`;
                    if (!currentParticipant.value.dailyTasks) currentParticipant.value.dailyTasks = {};
                    currentParticipant.value.dailyTasks[key] = !currentParticipant.value.dailyTasks[key];
                    saveData();
                };

                const getTaskStatus = (day) => {
                    if (!currentParticipant.value?.dailyTasks) return false;
                    return currentParticipant.value.dailyTasks[`${selectedYear.value}-${selectedMonth.value}-${day}`];
                };

                // --- ADMIN LOGIC ---
                const adminLogin = () => {
                    if (adminPassword.value === 'admin123') {
                        isAuthenticated.value = true;
                    } else alert('Password Salah');
                };

                const logout = () => { isAuthenticated.value = false; activeView.value = 'dashboard'; };

                const showAddModal = () => { adminForm.name = ''; showAdminModal.value = true; };
                
                const saveParticipant = async () => {
                    if (!adminForm.name) return;
                    const newP = {
                        id: Date.now(),
                        name: adminForm.name,
                        ziyadah: [], dailyTasks: {}, tasmikJuz: []
                    };
                    participants.value.push(newP);
                    showAdminModal.value = false;
                    
                    if (supabaseConnected.value && dbClient) {
                        await dbClient.from('participants').insert([{
                            id: newP.id, name: newP.name, ziyadah: [], daily_tasks: {}, tasmik_juz: []
                        }]);
                    }
                    saveData();
                };

                const deleteParticipant = async (id) => {
                    if(!confirm('Hapus peserta ini?')) return;
                    participants.value = participants.value.filter(p => p.id !== id);
                    if (currentParticipantId.value === id) currentParticipantId.value = '';
                    
                    if (supabaseConnected.value && dbClient) {
                        await dbClient.from('participants').delete().eq('id', id);
                    }
                    saveData();
                };

                const copyReportToClipboard = () => {
    if (participants.value.length === 0) {
        alert("Data peserta kosong!");
        return;
    }
    const tglSekarang = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });


    // Header Laporan
    let reportText = "*LAPORAN PROGRESS MUROJAAH*\n";
    reportText += `Tanggal: ${tglSekarang}\n`;
    reportText += "----------------------------\n\n";

    // Mengambil data dari computed property yang sudah terurut
    sortedParticipantsByProgress.value.forEach((p, index) => {
        const percent = calculateTaskPercentage(p);
        // Format: 1. Nama Peserta (48%)
        reportText += `${index + 1}. ${p.name.padEnd(20)} *${percent}%*\n`;
    });

    // Proses menyalin ke Clipboard
    navigator.clipboard.writeText(reportText).then(() => {
        alert("Laporan berhasil disalin ke Clipboard! Silakan paste di WhatsApp.");
    }).catch(err => {
        console.error('Gagal menyalin: ', err);
        alert("Gagal menyalin laporan.");
    });
};

                onMounted(async () => {
                    await initSupabase();
                    await loadData();
                });

                return {
                    participants, currentParticipant, currentParticipantId, activeView,
                    isLoading, loadingMessage, supabaseConnected,
                    isAuthenticated, adminPassword, showAdminModal, adminForm,
                    newZiyadahFrom, newZiyadahTo, newTasmikJuz,
                    daysInSelectedMonth, dailyTaskPercentage,
                    sortedParticipants, sortedParticipantsByProgress,
                    calculateTotalZiyadah, calculateTaskPercentage,
                    adminLogin, logout, showAddModal, saveParticipant, deleteParticipant,
                    addZiyadah, addTasmik, toggleDailyTask, getTaskStatus, syncData, showAdminLogin: () => activeView.value = 'admin', copyReportToClipboard // <--- Tambahkan ini
                };
            }
        }).mount('#app');
