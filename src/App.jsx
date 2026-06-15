import React, { useState, useMemo, useEffect } from 'react';
import { BarChart3, PlusCircle, ClipboardList, Check, Home, PieChart, Info, Download, Calendar, Database, Loader2, Link as LinkIcon, Settings, Activity } from 'lucide-react';

// ==========================================
// 🔗 KONFIGURASI GOOGLE SHEETS API
// ==========================================
// Ganti URL di bawah ini dengan URL Web App Google Apps Script Anda yang terbaru
const GOOGLE_SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzfrhjeyM-WFrRt_fsilxn7SOyFg8QhWQd70XxKzrCSaZ8x-RIL6Cyut0KHjnxDk8Am/exec"; 

const REGIMES = [
  "Hak Cipta",
  "Merek",
  "Paten",
  "Desain Industri",
  "DTLST",
  "Rahasia Dagang",
  "Indikasi Geografis"
];

const EMOJIS = {
  "Hak Cipta": "📝",
  "Merek": "🏷️",
  "Paten": "⚙️",
  "Desain Industri": "🎨",
  "DTLST": "🔌",
  "Rahasia Dagang": "🔒",
  "Indikasi Geografis": "🗺️"
};

const COLORS = {
  "Hak Cipta": "#3b82f6",
  "Merek": "#ef4444",
  "Paten": "#10b981",
  "Desain Industri": "#f59e0b",
  "DTLST": "#8b5cf6",
  "Rahasia Dagang": "#64748b",
  "Indikasi Geografis": "#ec4899"
};

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];

// Data Mock Fallback
const generateInitialData = () => {
  const data = [];
  [2024, 2025, 2026].forEach(year => {
    for (let month = 0; month < 12; month++) {
      REGIMES.forEach(regime => {
        const base = regime === 'Hak Cipta' ? 120 : regime === 'Merek' ? 80 : regime === 'Paten' ? 15 : 10;
        const amount = Math.floor(Math.random() * (base / 2)) + Math.floor(base * 0.8);
        data.push({
          id: Math.random().toString(36).substr(2, 9),
          regime,
          amount,
          date: `${year}-${String(month + 1).padStart(2, '0')}-15`,
          timestamp: new Date(year, month, 15).toISOString()
        });
      });
    }
  });
  return data;
};

const getTicks = (max) => {
  let step = 50;
  if (max > 300) step = 100;
  if (max > 1000) step = 200;
  const top = Math.ceil(Math.max(max, 1) / step) * step;
  const ticks = [];
  for (let i = top; i >= 0; i -= step) {
    ticks.push(i);
  }
  return { top, ticks };
};

// ==========================================
// 🛠 FUNGSI JSONP UNTUK BYPASS CORS IFRAME
// ==========================================
const fetchWithJSONP = (url) => {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_cb_' + Math.round(100000 * Math.random());
    const script = document.createElement('script');
    
    // Timer jika request timeout (10 detik)
    const timeout = setTimeout(() => {
      delete window[callbackName];
      document.body.removeChild(script);
      reject(new Error('Koneksi timeout. Pastikan URL Apps Script benar.'));
    }, 10000);

    // Fungsi yang akan dipanggil oleh Google Apps Script
    window[callbackName] = function(data) {
      clearTimeout(timeout);
      delete window[callbackName];
      document.body.removeChild(script);
      resolve(data);
    };

    script.src = `${url}${url.includes('?') ? '&' : '?'}callback=${callbackName}`;
    script.onerror = () => {
      clearTimeout(timeout);
      delete window[callbackName];
      document.body.removeChild(script);
      reject(new Error('Gagal memuat script JSONP. Periksa koneksi internet.'));
    };
    
    document.body.appendChild(script);
  });
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUsingMock, setIsUsingMock] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [debugLogs, setDebugLogs] = useState([]);

  const addDebugLog = (msg) => {
    setDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString('id-ID')}] ${msg}`]);
  };

  // Ambil Data dari Google Sheets menggunakan JSONP
  useEffect(() => {
    const fetchSheetData = async () => {
      if (!GOOGLE_SHEET_WEB_APP_URL) {
        setRecords(generateInitialData());
        setIsUsingMock(true);
        setLoading(false);
        return;
      }

      try {
        // Menggunakan JSONP Bypass (tambahkan ?action=read)
        const data = await fetchWithJSONP(`${GOOGLE_SHEET_WEB_APP_URL}?action=read`);
        
        const formattedData = data.map(item => ({
          ...item,
          amount: parseInt(item.amount) || 0
        }));
        
        setRecords(formattedData);
        setIsUsingMock(false);
      } catch (error) {
        console.warn("Gagal mengambil data via JSONP.", error.message);
        showNotification('Gagal mengambil data dari Google Sheets. Memuat data simulasi...', 'error');
        setRecords(generateInitialData());
        setIsUsingMock(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSheetData();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  // State Dashboard
  const [dashboardYear, setDashboardYear] = useState(2026);
  const [inputRegime, setInputRegime] = useState(REGIMES[0]);
  const [inputAmount, setInputAmount] = useState('');
  
  // State Grafik
  const [trendRegime, setTrendRegime] = useState('Merek');
  const [trendYear, setTrendYear] = useState(2026);
  const [comp1Regime, setComp1Regime] = useState('Merek'); 
  const [comp1Year, setComp1Year] = useState(2026);
  const [comp2Regime, setComp2Regime] = useState('Hak Cipta'); 
  const [comp2Year, setComp2Year] = useState(2026);

  // Export State
  const [exportMonth, setExportMonth] = useState('all'); 
  const [exportYear, setExportYear] = useState(2026);
  const [copySuccess, setCopySuccess] = useState(false);

  // --- PERHITUNGAN DASHBOARD ---
  const dashboardRecords = useMemo(() => {
    return records.filter(r => new Date(r.date).getFullYear() === dashboardYear);
  }, [records, dashboardYear]);

  const totalDasboardTahunIni = useMemo(() => {
    return dashboardRecords.reduce((sum, record) => sum + record.amount, 0);
  }, [dashboardRecords]);

  // --- GRAFIK TREN ---
  const trendData = useMemo(() => {
    return MONTHS.map((monthStr, idx) => {
      const monthData = records.filter(r => 
        r.regime === trendRegime && 
        new Date(r.date).getFullYear() === trendYear &&
        new Date(r.date).getMonth() === idx
      );
      const total = monthData.reduce((sum, r) => sum + r.amount, 0);
      return { month: monthStr, shortMonth: SHORT_MONTHS[idx], total, color: COLORS[trendRegime] };
    });
  }, [records, trendRegime, trendYear]);

  const trendMax = Math.max(...trendData.map(d => d.total), 0);
  const trendTicksData = getTicks(trendMax);

  // --- GRAFIK KOMPARASI ---
  const compData = useMemo(() => {
    return MONTHS.map((monthStr, idx) => {
      const data1 = records.filter(r => r.regime === comp1Regime && new Date(r.date).getFullYear() === comp1Year && new Date(r.date).getMonth() === idx);
      const data2 = records.filter(r => r.regime === comp2Regime && new Date(r.date).getFullYear() === comp2Year && new Date(r.date).getMonth() === idx);
      
      const total1 = data1.reduce((sum, r) => sum + r.amount, 0);
      const total2 = data2.reduce((sum, r) => sum + r.amount, 0);
      
      return { 
        month: monthStr, shortMonth: SHORT_MONTHS[idx], 
        val1: total1, val2: total2 
      };
    });
  }, [records, comp1Regime, comp1Year, comp2Regime, comp2Year]);

  const compMax = Math.max(...compData.map(d => Math.max(d.val1, d.val2)), 0);
  const compTicksData = getTicks(compMax);

  // --- HANDLERS ---
  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!inputAmount || isNaN(inputAmount) || inputAmount <= 0) return;

    const today = new Date();
    const newRecord = {
      id: Math.random().toString(36).substr(2, 9),
      regime: inputRegime,
      amount: parseInt(inputAmount),
      date: today.toISOString().split('T')[0],
      timestamp: today.toISOString()
    };

    // Tambahkan ke State Lokal langsung
    setRecords([...records, newRecord]);
    setInputAmount('');

    if (isUsingMock || !GOOGLE_SHEET_WEB_APP_URL) {
      showNotification('Data disimpan ke penyimpanan sementara (Simulasi).');
      return;
    }

    // Kirim data ke Google Sheets menggunakan JSONP (GET parameters)
    try {
      const insertUrl = `${GOOGLE_SHEET_WEB_APP_URL}?action=insert&id=${newRecord.id}&regime=${encodeURIComponent(newRecord.regime)}&amount=${newRecord.amount}&date=${newRecord.date}&timestamp=${encodeURIComponent(newRecord.timestamp)}`;
      
      await fetchWithJSONP(insertUrl);
      showNotification('Data berhasil disimpan ke Google Sheets secara real-time!');
    } catch (error) {
      console.warn("Gagal mengirim ke sheets via JSONP: ", error);
      showNotification('Gagal menyimpan data ke internet.', 'error');
    }
  };

  const handleExport = () => {
    const isAllMonths = exportMonth === 'all';
    
    const exportData = records.filter(r => {
      const d = new Date(r.date);
      return (isAllMonths ? true : d.getMonth() === parseInt(exportMonth)) && d.getFullYear() === exportYear;
    });

    const rekap = {};
    REGIMES.forEach(r => rekap[r] = 0);
    exportData.forEach(r => {
      rekap[r.regime] += r.amount;
    });

    const totalPeriode = exportData.reduce((sum, r) => sum + r.amount, 0);
    const now = new Date();
    const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    const formattedTime = `${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}.${String(now.getSeconds()).padStart(2, '0')}`;
    
    const periodeLabel = isAllMonths ? `Tahun ${exportYear}` : `${MONTHS[exportMonth]} ${exportYear}`;
    const rincianLabel = isAllMonths ? "Rincian Tahun Ini:" : "Rincian Bulan Ini:";
    const totalLabel = isAllMonths ? `Total Permohonan Tahun ${exportYear}:` : `Total Permohonan Bulan ${MONTHS[exportMonth]}:`;

    const reportText = `Laporan Rekapitulasi Data KI 📊
Kantor Wilayah Kementerian Hukum Jawa Barat

Periode Input: ${periodeLabel}

${rincianLabel}
${REGIMES.map(r => `${EMOJIS[r]} ${r}: ${rekap[r]}`).join('\n')}

${totalLabel} ${totalPeriode} dokumen

Diperbarui pada: ${formattedDate}, ${formattedTime} WIB
#KementerianHukum #LayananHukumMakinMudah #KanwilKemenkumKepri`;

    const textArea = document.createElement("textarea");
    textArea.value = reportText;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      console.warn('Failed to copy', err);
      showNotification('Gagal menyalin teks laporan.', 'error');
    }
    document.body.removeChild(textArea);
  };

  // --- FUNGSI UJI KONEKSI (DEBUG) ---
  const testConnection = async () => {
    setDebugLogs([]);
    addDebugLog("Memulai diagnostik koneksi ke Google Sheets (Metode JSONP)...");
    addDebugLog(`URL Endpoint: ${GOOGLE_SHEET_WEB_APP_URL}`);
    
    if (!GOOGLE_SHEET_WEB_APP_URL) {
      addDebugLog("ERROR: URL belum diisi di kode.");
      return;
    }

    try {
      addDebugLog("Langkah 1: Menyuntikkan script JSONP untuk menembus iFrame Sandbox...");
      const data = await fetchWithJSONP(`${GOOGLE_SHEET_WEB_APP_URL}?action=read`);
      
      addDebugLog(`Langkah 2: SCRIPT BERHASIL DIEKSEKUSI. Tembok CORS berhasil dilewati!`);
      addDebugLog(`Langkah 3: Menganalisa data... Ditemukan ${data.length} baris data dari spreadsheet.`);
      
      if (data.length > 0) {
         addDebugLog(`Contoh data sheet pertama: ${JSON.stringify(data[0])}`);
      }
      
      addDebugLog(`KESIMPULAN: Koneksi sukses 100%. Aplikasi sekarang terhubung langsung dengan Google Sheets Anda.`);

    } catch (error) {
      addDebugLog(`ERROR KONEKSI: ${error.message}`);
      addDebugLog("PENYEBAB: Fungsi Apps Script (Langkah 1) belum diperbarui atau Anda lupa melakukan Deploy versi Baru.");
      addDebugLog("SOLUSI: Pastikan kode 'doGet' pada Google Apps Script sudah diganti persis seperti instruksi terbaru, lalu lakukan 'Deployment Baru'.");
    }
  };

  // --- KOMPONEN GRAFIK ---
  const AxisBarChart = ({ data, ticksData }) => {
    return (
      <div className="flex flex-col h-72 w-full pt-4">
        <div className="flex flex-1 relative">
          <div className="w-10 flex flex-col justify-between items-end pr-2 text-[10px] sm:text-xs text-gray-500 pb-6 font-medium">
            {ticksData.ticks.map(tick => (
              <span key={`ytick-${tick}`} className="leading-none">{tick}</span>
            ))}
          </div>
          <div className="flex-1 relative border-b border-l border-gray-300 pb-6">
            {ticksData.ticks.map(tick => {
              const bottomPercent = ticksData.top > 0 ? (tick / ticksData.top) * 100 : 0;
              return (
                <div key={`grid-${tick}`} className="absolute w-full border-t border-gray-200 z-0" style={{ bottom: `${bottomPercent}%`, left: 0 }}></div>
              );
            })}
            <div className="absolute inset-0 bottom-6 flex items-end justify-around z-10 px-1">
              {data.map((item, idx) => {
                const heightPercent = ticksData.top > 0 ? (item.total / ticksData.top) * 100 : 0;
                return (
                  <div key={`bar-${idx}`} className="flex flex-col items-center flex-1 h-full justify-end group">
                    <div className="w-4/5 max-w-[2rem] rounded-t-sm transition-all duration-500 ease-in-out relative hover:opacity-80" style={{ height: `${heightPercent}%`, backgroundColor: item.color }}>
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded shadow-md whitespace-nowrap z-20 transition-opacity">
                        {item.total}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex pl-10">
          {data.map((item, idx) => (
            <div key={`xtick-${idx}`} className="flex-1 text-center text-[9px] sm:text-[11px] text-gray-600 font-medium truncate pt-2">{item.shortMonth}</div>
          ))}
        </div>
      </div>
    );
  };

  const GroupedAxisBarChart = ({ data, ticksData, color1, color2 }) => {
    return (
      <div className="flex flex-col h-72 w-full pt-4">
        <div className="flex flex-1 relative">
          <div className="w-10 flex flex-col justify-between items-end pr-2 text-[10px] sm:text-xs text-gray-500 pb-6 font-medium">
            {ticksData.ticks.map(tick => (
              <span key={`gytick-${tick}`} className="leading-none">{tick}</span>
            ))}
          </div>
          <div className="flex-1 relative border-b border-l border-gray-300 pb-6">
            {ticksData.ticks.map(tick => {
              const bottomPercent = ticksData.top > 0 ? (tick / ticksData.top) * 100 : 0;
              return (
                <div key={`ggrid-${tick}`} className="absolute w-full border-t border-gray-200 z-0" style={{ bottom: `${bottomPercent}%`, left: 0 }}></div>
              );
            })}
            <div className="absolute inset-0 bottom-6 flex items-end justify-around z-10">
              {data.map((item, idx) => {
                const h1 = ticksData.top > 0 ? (item.val1 / ticksData.top) * 100 : 0;
                const h2 = ticksData.top > 0 ? (item.val2 / ticksData.top) * 100 : 0;
                return (
                  <div key={`gbar-${idx}`} className="flex items-end justify-center flex-1 h-full px-[2px] group space-x-[1px]">
                    <div className="w-1/2 max-w-[1.2rem] rounded-t-[2px] transition-all duration-500 relative" style={{ height: `${h1}%`, backgroundColor: color1 }}>
                       <div className="opacity-0 group-hover:opacity-100 absolute -top-8 -left-2 bg-gray-800 text-white text-[10px] py-1 px-1.5 rounded z-20 whitespace-nowrap">P1: {item.val1}</div>
                    </div>
                    <div className="w-1/2 max-w-[1.2rem] rounded-t-[2px] transition-all duration-500 relative" style={{ height: `${h2}%`, backgroundColor: color2 }}>
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 -right-2 bg-gray-800 text-white text-[10px] py-1 px-1.5 rounded z-20 whitespace-nowrap">P2: {item.val2}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex pl-10">
          {data.map((item, idx) => (
            <div key={`gxtick-${idx}`} className="flex-1 text-center text-[9px] sm:text-[11px] text-gray-600 font-medium truncate pt-2">{item.shortMonth}</div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans relative">
      {/* Notifikasi */}
      {notification.show && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-xl text-white font-semibold flex items-center transition-all ${notification.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          <Database className="w-5 h-5 mr-3" />
          {notification.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-2 rounded-full">
              <PieChart className="w-8 h-8 text-blue-700" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Dashboard Monitoring KI Jabar</h1>
              <p className="text-blue-100 text-sm md:text-base">Kantor Wilayah Kementerian Hukum Jawa Barat</p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigasi */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto pb-1">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center px-3 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <Home className="w-5 h-5 mr-2" />
              Dashboard & Grafik
            </button>
            <button 
              onClick={() => setActiveTab('input')}
              className={`flex items-center px-3 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'input' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Input Data
            </button>
            <button 
              onClick={() => setActiveTab('laporan')}
              className={`flex items-center px-3 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'laporan' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <ClipboardList className="w-5 h-5 mr-2" />
              Ekspor Laporan
            </button>
            <button 
              onClick={() => setActiveTab('debug')}
              className={`flex items-center px-3 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'debug' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <Activity className="w-5 h-5 mr-2" />
              Debug Koneksi
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Menyinkronkan data...</p>
          </div>
        ) : (
          <>
            {/* Warning Jika Belum Terkoneksi Google Sheet atau Error CORS */}
            {isUsingMock && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between text-sm shadow-sm mb-6">
                <div className="flex items-center mb-3 sm:mb-0">
                  <LinkIcon className="w-6 h-6 mr-3 text-amber-500" />
                  <div>
                    <h3 className="font-bold">Aplikasi Menggunakan Data Simulasi Sementara</h3>
                    <p>Karena keamanan iFrame, Anda wajib memperbarui kode Apps Script Anda dengan kode yang diberikan oleh AI di jendela percakapan. Buka tab <b>Debug Koneksi</b> untuk tes ulang.</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="text-gray-700 font-semibold text-lg flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600"/> Ringkasan Total Data KI
                  </h2>
                  <div className="flex items-center">
                    <label className="text-sm text-gray-500 mr-3 font-medium hidden sm:block">Tampilkan Tahun:</label>
                    <select 
                      value={dashboardYear} 
                      onChange={(e) => setDashboardYear(parseInt(e.target.value))}
                      className="border-gray-300 bg-gray-50 rounded-lg text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border font-semibold"
                    >
                      <option value={2026}>2026</option>
                      <option value={2025}>2025</option>
                      <option value={2024}>2024</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-5 border border-blue-200 flex flex-col justify-between">
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">Total KI ({dashboardYear})</p>
                    <div className="flex justify-between items-end">
                      <p className="text-3xl font-bold text-blue-900">{totalDasboardTahunIni}</p>
                      <PieChart className="w-6 h-6 text-blue-500 opacity-80" />
                    </div>
                  </div>
                  
                  {REGIMES.map(regime => (
                    <div key={`kpi-${regime}`} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-medium text-gray-500 truncate mr-2" title={regime}>{regime}</p>
                        <span className="text-lg">{EMOJIS[regime]}</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardRecords.filter(r => r.regime === regime).reduce((a, b) => a + b.amount, 0)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pt-4">
                  {/* Grafik Tren */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-gray-800 flex items-center">
                        <BarChart3 className="text-gray-400 w-5 h-5 mr-2" /> Tren Permohonan
                      </h2>
                    </div>
                    
                    <div className="flex space-x-3 mb-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div className="flex-1">
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Rezim</label>
                        <select 
                          value={trendRegime} onChange={(e) => setTrendRegime(e.target.value)}
                          className="w-full border-gray-300 rounded text-sm p-1.5 border shadow-sm"
                        >
                          {REGIMES.map(r => <option key={`tr-${r}`} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Tahun</label>
                        <select 
                          value={trendYear} onChange={(e) => setTrendYear(parseInt(e.target.value))}
                          className="w-full border-gray-300 rounded text-sm p-1.5 border shadow-sm"
                        >
                          <option value={2026}>2026</option>
                          <option value={2025}>2025</option>
                          <option value={2024}>2024</option>
                        </select>
                      </div>
                    </div>

                    <AxisBarChart data={trendData} ticksData={trendTicksData} />
                  </div>

                  {/* Grafik Komparasi */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                       <PieChart className="text-gray-400 w-5 h-5 mr-2" /> Perbandingan Parameter
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 shadow-sm">
                        <div className="flex items-center mb-2">
                          <span className="w-3 h-3 rounded-sm bg-blue-500 mr-2"></span>
                          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Parameter 1</p>
                        </div>
                        <div className="space-y-2">
                          <select 
                            value={comp1Regime} onChange={(e) => setComp1Regime(e.target.value)}
                            className="w-full border-blue-200 rounded text-xs p-1.5 border bg-white focus:ring-blue-500"
                          >
                            {REGIMES.map(r => <option key={`c1r-${r}`} value={r}>{r}</option>)}
                          </select>
                          <select 
                            value={comp1Year} onChange={(e) => setComp1Year(parseInt(e.target.value))}
                            className="w-full border-blue-200 rounded text-xs p-1.5 border bg-white focus:ring-blue-500"
                          >
                            <option value={2026}>2026</option>
                            <option value={2025}>2025</option>
                            <option value={2024}>2024</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100 shadow-sm">
                        <div className="flex items-center mb-2">
                          <span className="w-3 h-3 rounded-sm bg-amber-500 mr-2"></span>
                          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Parameter 2</p>
                        </div>
                        <div className="space-y-2">
                          <select 
                            value={comp2Regime} onChange={(e) => setComp2Regime(e.target.value)}
                            className="w-full border-amber-200 rounded text-xs p-1.5 border bg-white focus:ring-amber-500"
                          >
                            {REGIMES.map(r => <option key={`c2r-${r}`} value={r}>{r}</option>)}
                          </select>
                          <select 
                            value={comp2Year} onChange={(e) => setComp2Year(parseInt(e.target.value))}
                            className="w-full border-amber-200 rounded text-xs p-1.5 border bg-white focus:ring-amber-500"
                          >
                            <option value={2026}>2026</option>
                            <option value={2025}>2025</option>
                            <option value={2024}>2024</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <GroupedAxisBarChart 
                      data={compData} 
                      ticksData={compTicksData} 
                      color1="#3b82f6" 
                      color2="#f59e0b" 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: INPUT */}
            {activeTab === 'input' && (
              <div className="max-w-xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 border border-gray-100">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Input Data KI Harian</h2>
                    <p className="text-gray-500 text-sm mt-1">Sistem akan secara otomatis mencatat waktu (timestamp) hari ini dan mengirimnya ke Google Sheets.</p>
                  </div>

                  <form onSubmit={handleAddRecord} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Rezim Kekayaan Intelektual</label>
                      <select 
                        value={inputRegime}
                        onChange={(e) => setInputRegime(e.target.value)}
                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border bg-gray-50"
                      >
                        {REGIMES.map(r => (
                          <option key={r} value={r}>{EMOJIS[r]} {r}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Permohonan (Dokumen)</label>
                      <input 
                        type="number" 
                        min="1"
                        required
                        value={inputAmount}
                        onChange={(e) => setInputAmount(e.target.value)}
                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border bg-gray-50"
                        placeholder="Contoh: 15"
                      />
                    </div>

                    <div className="pt-2">
                      <button 
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-200 ease-in-out flex justify-center items-center"
                      >
                        <PlusCircle className="w-5 h-5 mr-2" /> Simpan Data ke Google Sheets
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TAB: LAPORAN */}
            {activeTab === 'laporan' && (
              <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 border border-gray-100">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Buat Laporan Rekapitulasi</h2>
                    <p className="text-gray-500 text-sm mt-1">Pilih periode untuk mengekspor rekapitulasi ke format teks yang siap disalin.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bulan</label>
                      <select 
                        value={exportMonth} 
                        onChange={(e) => setExportMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border font-medium"
                      >
                        <option value="all" className="font-bold">-- Semua Bulan (Rekap 1 Tahun) --</option>
                        {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
                      <select 
                        value={exportYear} 
                        onChange={(e) => setExportYear(parseInt(e.target.value))}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                      >
                        <option value={2026}>2026</option>
                        <option value={2025}>2025</option>
                        <option value={2024}>2024</option>
                      </select>
                    </div>
                  </div>

                  {/* Preview Laporan */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 relative font-mono text-sm">
                    <p className="font-bold">Laporan Rekapitulasi Data KI 📊</p>
                    <p>Kantor Wilayah Kementerian Hukum Jawa Barat</p>
                    <br />
                    <p>Periode Input: {exportMonth === 'all' ? `Tahun ${exportYear}` : `${MONTHS[exportMonth]} ${exportYear}`}</p>
                    <br />
                    <p>{exportMonth === 'all' ? 'Rincian Tahun Ini:' : 'Rincian Bulan Ini:'}</p>
                    {REGIMES.map(r => {
                      const sum = records.filter(rec => {
                        const d = new Date(rec.date);
                        return rec.regime === r && 
                               (exportMonth === 'all' ? true : d.getMonth() === exportMonth) && 
                               d.getFullYear() === exportYear;
                      }).reduce((a, b) => a + b.amount, 0);
                      return <p key={r}>{EMOJIS[r]} {r}: {sum}</p>;
                    })}
                    <br />
                    <p>
                      {exportMonth === 'all' 
                        ? `Total Permohonan Tahun ${exportYear}:` 
                        : `Total Permohonan Bulan ${MONTHS[exportMonth]}:`
                      } {records.filter(rec => {
                      const d = new Date(rec.date);
                      return (exportMonth === 'all' ? true : d.getMonth() === exportMonth) && d.getFullYear() === exportYear;
                    }).reduce((a, b) => a + b.amount, 0)} dokumen</p>
                    
                    <br />
                    <p>Diperbarui pada: {new Date().toLocaleDateString('id-ID')}, {new Date().toLocaleTimeString('id-ID')} WIB</p>
                    <p>#KementerianHukum #LayananHukumMakinMudah #KanwilKemenkumKepri</p>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button 
                      onClick={handleExport}
                      className={`flex items-center py-3 px-6 rounded-lg shadow-md transition font-semibold text-white ${copySuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      {copySuccess ? (
                        <><Check className="w-5 h-5 mr-2" /> Berhasil Disalin!</>
                      ) : (
                        <><Download className="w-5 h-5 mr-2" /> Ekspor & Salin ke Clipboard</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: DEBUG (PENGATURAN KONEKSI) */}
            {activeTab === 'debug' && (
              <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 border border-gray-100">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <Activity className="w-6 h-6 mr-2 text-red-600" /> Terminal Diagnostik (JSONP)
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Sistem telah diubah ke mode injeksi script (JSONP) yang kebal terhadap blokiran CORS iFrame.</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-6 font-mono text-sm break-all">
                    <span className="font-bold text-gray-700">Target URL API: </span><br/>
                    <span className="text-blue-600">{GOOGLE_SHEET_WEB_APP_URL || "Belum diatur"}</span>
                  </div>

                  <button 
                    onClick={testConnection}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg shadow-sm transition mb-6 flex justify-center items-center w-full sm:w-auto"
                  >
                    Mulai Uji Koneksi JSONP
                  </button>

                  <div className="bg-gray-900 rounded-xl p-5 min-h-[300px] text-green-400 font-mono text-sm overflow-y-auto">
                    <p className="text-gray-400 mb-4 opacity-70">Terminal Debugging...</p>
                    {debugLogs.map((log, index) => (
                      <p key={index} className="mb-2 leading-relaxed break-words">{log}</p>
                    ))}
                    {debugLogs.length === 0 && <p className="opacity-50 text-gray-500">Menunggu perintah uji koneksi dijalankan.</p>}
                  </div>

                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                    <p className="font-bold mb-1">Status Keamanan Saat Ini:</p>
                    <p>Fungsi `fetch` telah dicabut dan diganti sepenuhnya dengan injeksi `&lt;script&gt;`. Pengalihan dari Google seharusnya tidak lagi dicegat oleh iFrame ini. <b>Harap pastikan Anda telah memperbarui kode di Google Apps Script dan mendeploy ulang sebelum menekan tes uji koneksi.</b></p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
