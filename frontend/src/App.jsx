import React, { useState, useMemo, useEffect } from 'react';
import { api, clearTokens } from './api';
import {
  ShieldCheck,
  TrendingUp,
  BookOpen,
  CheckCircle2,
  LogOut,
  Search,
  Bell,
  Eye,
  EyeOff,
  ArrowRight,
  Clock,
  AlertTriangle,
  Users,
  FileText,
  Sliders,
  Activity,
  ChevronRight,
  Check,
  X,
  MessageSquare,
  Download,
  RefreshCw,
  Lock,
  Calendar,
  Award,
  CreditCard,
  GraduationCap,
  Play
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis
} from 'recharts';

// ============================================================================
// KOMPONEN LOGO UNIVERSITAS DINAMIKA (MENGAMBIL DARI public/logo-undika.png)
// ============================================================================
function UndikaLogo({ size = 'md' }) {
  const heightClass = size === 'lg' ? 'h-12' : 'h-9';

  return (
    <div className="flex items-center select-none">
      <img
        src="/logo-undika.png"
        alt="Logo Universitas Dinamika"
        className={`${heightClass} w-auto object-contain`}
      />
    </div>
  );
}

// ============================================================================
// DATA SIMULASI SESUAI SPESIFIKASI BRD, SRS, SDD (KELOMPOK IZIN TAMPIL)
// ============================================================================
const INITIAL_STUDENT_DATA = {
  nim: '22410100042',
  nama: 'Raka Aditya',
  prodi: 'S1 Sistem Informasi',
  angkatan: 2022,
  semester: 8,
  sisaMasaStudi: 6, // semester
  skorTotal: 62,
  status: 'KUNING', // HIJAU (0-39), KUNING (40-69), MERAH (70-100)
  perubahanSkor: -4, // Turun 4 poin (membaik BRL-12)
  terakhirDipindai: '2 jam lalu',
  pilar: [
    {
      id: 'ta',
      nama: 'Progres Tugas Akhir',
      bobot: '40%',
      skor: 72,
      level: 'Risiko tinggi',
      warna: '#DC2626',
      detail: '5/8 bimbingan terverifikasi, durasi tahap Bimbingan 38 hari'
    },
    {
      id: 'akademik',
      nama: 'Akademik',
      bobot: '30%',
      skor: 48,
      level: 'Perlu perhatian',
      warna: '#F59E0B',
      detail: 'IPK 3.24 | Presensi 1 matkul 76% | TOEFL 468 (Terverifikasi)'
    },
    {
      id: 'sskm',
      nama: 'SSKM',
      bobot: '15%',
      skor: 66,
      level: 'Perlu perhatian',
      warna: '#F59E0B',
      detail: '75 / 100 poin minimum SSKM prodi (kurang 25 poin)'
    },
    {
      id: 'keuangan',
      nama: 'Keuangan',
      bobot: '15%',
      skor: 0,
      level: 'Aman',
      warna: '#10B981',
      detail: 'Status UKT/SPP: LUNAS' // BRL-14: Tanpa nominal Rupiah
    }
  ],
  milestones: [
    { id: 1, tahap: 'Proposal', status: 'SELESAI', durasi: '14 hari', keterangan: 'Judul & pembimbing disetujui' },
    { id: 2, tahap: 'Sempro', status: 'SELESAI', durasi: '21 hari', keterangan: 'Lulus seminar proposal' },
    { id: 3, tahap: 'Bimbingan', status: 'AKTIF', durasi: '38 hari', keterangan: '5 / minimal 8 sesi terverifikasi' },
    { id: 4, tahap: 'Semhas', status: 'MENUNGGU', durasi: '-', keterangan: 'Syarat: min. 8 bimbingan' },
    { id: 5, tahap: 'Sidang', status: 'MENUNGGU', durasi: '-', keterangan: 'Syarat: lulus Semhas & bebas E' },
    { id: 6, tahap: 'Yudisium', status: 'MENUNGGU', durasi: '-', keterangan: 'Syarat: Bebas Pustaka, TOEFL, SSKM' }
  ],
  bimbinganTerverifikasi: 5,
  bimbinganMinimal: 8,
  yudisiumChecklist: [
    { item: 'Bebas Nilai E pada Transkrip', terpenuhi: true, ket: '0 mata kuliah nilai E' },
    { item: 'Skor TOEFL Minimum Prodi (>= 450)', terpenuhi: true, ket: 'Skor 468 terverifikasi' },
    { item: 'Minimal 8x Bimbingan Terverifikasi', terpenuhi: false, ket: 'Baru 5 dari 8 sesi' },
    { item: 'Poin SSKM Minimum (>= 100 poin)', terpenuhi: false, ket: 'Baru 75 dari 100 poin' },
    { item: 'Bebas Pustaka Perpustakaan', terpenuhi: false, ket: 'Menunggu pasca-sidang' }
  ],
  actionPlans: [
    {
      id: 'AP-01',
      judul: 'Jadwalkan bimbingan TA',
      deskripsi: 'Hubungi dosen pembimbing sebelum 30 Mei untuk sesi ke-6',
      tag: 'Prioritas tinggi',
      tagType: 'danger',
      selesai: false
    },
    {
      id: 'AP-02',
      judul: 'Selesaikan 3 sesi bimbingan',
      deskripsi: 'Penuhi minimum 8 bimbingan terverifikasi sebagai syarat daftar Semhas/Sidang',
      tag: '14 hari',
      tagType: 'warning',
      selesai: false
    },
    {
      id: 'AP-03',
      judul: 'Perbarui skor TOEFL',
      deskripsi: 'Skor 468 sudah terverifikasi oleh pusat bahasa',
      tag: 'Selesai',
      tagType: 'success',
      selesai: true
    },
    {
      id: 'AP-04',
      judul: 'Lengkapi 25 poin SSKM',
      deskripsi: 'Ikuti kegiatan kemahasiswaan atau seminar terverifikasi prodi',
      tag: '30 hari',
      tagType: 'warning',
      selesai: false
    }
  ]
};

const INITIAL_ADVISEES = [
  {
    nim: '22410100008',
    nama: 'Alya Putri Rahma',
    initials: 'AP',
    angkatan: 2022,
    skor: 82,
    status: 'MERAH',
    pemicuUtama: 'Presensi 68% & Bimbingan macet 47 hari',
    presensi: 68,
    nilaiE: 'Riset Operasi (1 matkul perlu diulang)',
    hariTanpaBimbingan: 47,
    statusUkt: 'LUNAS',
    sskm: 85,
    hariEskalasi: 18
  },
  {
    nim: '22410100031',
    nama: 'Fajar Ramadhan',
    initials: 'FR',
    angkatan: 2022,
    skor: 76,
    status: 'MERAH',
    pemicuUtama: 'Presensi 72% & Perpanjangan TA 2 sem.',
    presensi: 72,
    nilaiE: 'Tidak ada nilai E',
    hariTanpaBimbingan: 34,
    statusUkt: 'MENUNGGAK',
    sskm: 70,
    hariEskalasi: 16
  },
  {
    nim: '23410100014',
    nama: 'Nabila Salsabila',
    initials: 'NS',
    angkatan: 2023,
    skor: 68,
    status: 'KUNING',
    pemicuUtama: 'Bimbingan macet 31 hari',
    presensi: 84,
    nilaiE: 'Tidak ada nilai E',
    hariTanpaBimbingan: 31,
    statusUkt: 'LUNAS',
    sskm: 90,
    hariEskalasi: 5
  },
  {
    nim: '21410100027',
    nama: 'Dimas Arya Nugraha',
    initials: 'DA',
    angkatan: 2021,
    skor: 59,
    status: 'KUNING',
    pemicuUtama: 'Presensi 74% & Sisa masa studi 2 sem.',
    presensi: 74,
    nilaiE: 'Tidak ada nilai E',
    hariTanpaBimbingan: 19,
    statusUkt: 'LUNAS',
    sskm: 105,
    hariEskalasi: 4
  },
  {
    nim: '22410100045',
    nama: 'Maya Kurnia',
    initials: 'MK',
    angkatan: 2022,
    skor: 55,
    status: 'KUNING',
    pemicuUtama: '1 Nilai E (Basis Data Lanjut)',
    presensi: 88,
    nilaiE: 'Basis Data Lanjut (1 matkul perlu diulang)',
    hariTanpaBimbingan: 12,
    statusUkt: 'LUNAS',
    sskm: 110,
    hariEskalasi: 2
  }
];

const KTW_TREND_DATA = [
  { semester: '2023/1', ktw: 66.5 },
  { semester: '2023/2', ktw: 69.2 },
  { semester: '2024/1', ktw: 70.1 },
  { semester: '2024/2', ktw: 73.8 },
  { semester: '2025/1', ktw: 76.2 },
  { semester: '2025/2', ktw: 78.4 }
];

const STATUS_DISTRIBUTION_DATA = [
  { name: 'Hijau (Aman)', value: 82, count: 1023, color: '#10B981' },
  { name: 'Kuning (Waspada)', value: 15, count: 187, color: '#F59E0B' },
  { name: 'Merah (Red Alert)', value: 3, count: 38, color: '#DC2626' }
];

const TA_BOTTLENECK_DATA = [
  { id: 1, tahap: 'Proposal', jumlah: 12, max: 90, ket: '12 mahasiswa tertahan' },
  { id: 2, tahap: 'Sempro', jumlah: 24, max: 90, ket: '24 mahasiswa tertahan' },
  { id: 3, tahap: 'Bimbingan macet > 30 hari', jumlah: 74, max: 90, ket: '74 mahasiswa tertahan' },
  { id: 4, tahap: 'Revisi Sidang', jumlah: 38, max: 90, ket: '38 mahasiswa tertahan' }
];

const INITIAL_AUDIT_LOGS = [
  {
    id: 'AUD-104',
    waktu: '28 Mei • 06.32',
    kategori: 'Pemindaian',
    aktivitas: 'Background scan selesai • 1.248 mahasiswa',
    kanal: 'Scheduler',
    status: 'Berhasil',
    badgeType: 'success'
  },
  {
    id: 'AUD-103',
    waktu: '28 Mei • 06.35',
    kategori: 'Notifikasi',
    aktivitas: '128 peringatan risiko dikirim (2 failover Email SMTP)',
    kanal: 'WhatsApp API',
    status: '126 terkirim',
    badgeType: 'warning'
  },
  {
    id: 'AUD-102',
    waktu: '28 Mei • 06.36',
    kategori: 'Notifikasi',
    aktivitas: '42 ringkasan mingguan dikirim ke Dosen Wali',
    kanal: 'Email API',
    status: 'Berhasil',
    badgeType: 'success'
  },
  {
    id: 'AUD-101',
    waktu: '27 Mei • 16.43',
    kategori: 'Konfigurasi',
    aktivitas: 'Parameter eskalasi M diperbarui menjadi 14 hari',
    kanal: 'ADM-001',
    status: 'Tercatat',
    badgeType: 'success'
  }
];

// ============================================================================
// KOMPONEN UTAMA APLIKASI
// ============================================================================
export default function App() {
  // Auth & RBAC State
  const [currentUser, setCurrentUser] = useState(null);
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Active Navigation Module per Role
  const [activeNav, setActiveNav] = useState('status');

  // Toast Notification State
  const [toast, setToast] = useState(null);

  // Mahasiswa States
  const [studentData, setStudentData] = useState(INITIAL_STUDENT_DATA);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(3);

  // Dosen Wali & Dosbing States
  const [advisees, setAdvisees] = useState(INITIAL_ADVISEES);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('SEMUA');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [drawerStudent, setDrawerStudent] = useState(null);
  const [counselingStudent, setCounselingStudent] = useState(null);
  const [counselingLogs, setCounselingLogs] = useState([
    {
      id: 'CNS-18',
      nim: '22410100008',
      nama: 'Alya Putri Rahma',
      tanggal: '2026-05-28',
      target: '2026-06-11',
      kendala: 'Kesulitan mengambil data lapangan dan jadwal kerja paruh waktu bentrok kuliah pagi.',
      rekomendasi: 'Wajib bimbingan TA minimal 1x/minggu dan ajukan surat izin riset ke prodi.'
    }
  ]);
  const [counselingForm, setCounselingForm] = useState({
    tanggal: '2026-05-28',
    target: '2026-06-11',
    kendala: '',
    rekomendasi: ''
  });

  // Kaprodi States
  const [escalations, setEscalations] = useState([
    {
      id: 'ESC-01',
      nim: '22410100008',
      nama: 'Alya Putri Rahma',
      hari: 18,
      pemicu: 'Bimbingan macet 47 hari • Presensi 68%',
      keterangan: 'Dosen wali belum merespons eskalasi N=3 hari',
      ditindaklanjuti: false,
      catatanKaprodi: ''
    },
    {
      id: 'ESC-02',
      nim: '22410100031',
      nama: 'Fajar Ramadhan',
      hari: 16,
      pemicu: 'Perpanjangan TA 2 semester • Tunggakan UKT',
      keterangan: 'Memerlukan surat peringatan akademik tingkat prodi',
      ditindaklanjuti: false,
      catatanKaprodi: ''
    }
  ]);
  const [escalationModalItem, setEscalationModalItem] = useState(null);
  const [escalationNote, setEscalationNote] = useState('');

  // Admin States
  const [weights, setWeights] = useState({
    ta: 40,
    akademik: 30,
    sskm: 15,
    keuangan: 15
  });
  const [thresholds, setThresholds] = useState({
    kuning: 40,
    merah: 70,
    jadwal: 'Tengah & akhir semester'
  });
  const [escalationParams, setEscalationParams] = useState({
    nDays: 3,
    mDays: 14
  });
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  const [isScanning, setIsScanning] = useState(false);
  const [ktwStats, setKtwStats] = useState({
    total: 0, hijau: 0, kuning: 0, merah: 0,
    hijauPct: 82, kuningPct: 15, merahPct: 3, rasioKtw: 0
  });

  const showToastMessage = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ============================================================================
  // HANDLERS: AUTENTIKASI (PR-01)
  // ============================================================================
  const mapBackendUser = (user) => {
    const roles = user?.roles || [];
    const name = user?.nama || user?.username || 'Pengguna';
    const initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0].toUpperCase())
      .join('') || 'EW';

    if (roles.includes('ADMIN')) {
      return {
        role: 'ADMIN',
        roleLabel: 'Administrator & Pimpinan',
        name,
        subtitle: 'Administrator Sistem',
        initials,
        raw: user,
      };
    }
    if (roles.includes('KAPRODI') || roles.includes('KOORD_TA')) {
      return {
        role: 'KAPRODI',
        roleLabel: 'Kaprodi & Koordinator TA',
        name,
        subtitle: roles.includes('KAPRODI') ? 'Kaprodi • S1 SI' : 'Koordinator TA',
        initials,
        raw: user,
      };
    }
    if (roles.includes('DOSEN_WALI') || roles.includes('DOSBING_TA')) {
      return {
        role: 'DOSEN',
        roleLabel: 'Dosen Wali & Dosbing',
        name,
        subtitle: 'DPA & Dosbing TA',
        initials,
        raw: user,
      };
    }
    return {
      role: 'MAHASISWA',
      roleLabel: 'Mahasiswa',
      name,
      subtitle: `Mahasiswa • ${user?.nim || user?.username || ''}`,
      initials,
      raw: user,
    };
  };

  useEffect(() => {
    if (!currentUser?.raw) return;
    const loadRoleData = async () => {
      try {
        if (currentUser.role === 'MAHASISWA') {
          // Fetch full risk detail (pilar, milestone, action plan, akademik)
          const risk = await api.getMyRisk();
          if (risk) {
            const mhs = risk.mahasiswa || {};
            const latestRisk = risk.latestRisk || {};
            const detail = latestRisk.detail_pemicu || {};
            const academicSummary = risk.academic || {};
            const milestone = risk.milestone || {};
            const actionPlansRaw = risk.actionPlans || [];

            // Map pilar dari skor backend
            const skorTa = parseFloat(latestRisk.skor_ta ?? 0);
            const skorAkad = parseFloat(latestRisk.skor_akademik ?? 0);
            const skorNonAkad = parseFloat(latestRisk.skor_nonakademik ?? 0);
            const skorKeu = parseFloat(latestRisk.skor_keuangan ?? 0);

            const pilar = [
              {
                id: 'ta', nama: 'Progres Tugas Akhir', bobot: '40%',
                skor: Math.round(skorTa),
                level: skorTa >= 70 ? 'Risiko tinggi' : skorTa >= 40 ? 'Perlu perhatian' : 'Aman',
                warna: skorTa >= 70 ? '#DC2626' : skorTa >= 40 ? '#F59E0B' : '#10B981',
                detail: detail.ta?.map(p => p.pesan).join(' | ') || 'Data TA terpantau'
              },
              {
                id: 'akademik', nama: 'Akademik', bobot: '30%',
                skor: Math.round(skorAkad),
                level: skorAkad >= 70 ? 'Risiko tinggi' : skorAkad >= 40 ? 'Perlu perhatian' : 'Aman',
                warna: skorAkad >= 70 ? '#DC2626' : skorAkad >= 40 ? '#F59E0B' : '#10B981',
                detail: `IPK ${academicSummary.ipk ?? '-'} | TOEFL ${academicSummary.skor_toefl ?? '-'}`
              },
              {
                id: 'sskm', nama: 'SSKM', bobot: '15%',
                skor: Math.round(skorNonAkad),
                level: skorNonAkad >= 70 ? 'Risiko tinggi' : skorNonAkad >= 40 ? 'Perlu perhatian' : 'Aman',
                warna: skorNonAkad >= 70 ? '#DC2626' : skorNonAkad >= 40 ? '#F59E0B' : '#10B981',
                detail: detail.nonAkademik?.map(p => p.pesan).join(' | ') || 'SSKM terpantau'
              },
              {
                id: 'keuangan', nama: 'Keuangan', bobot: '15%',
                skor: Math.round(skorKeu),
                level: skorKeu >= 70 ? 'Risiko tinggi' : skorKeu >= 40 ? 'Perlu perhatian' : 'Aman',
                warna: skorKeu >= 70 ? '#DC2626' : skorKeu >= 40 ? '#F59E0B' : '#10B981',
                detail: detail.keuangan?.[0]?.pesan || 'Status UKT/SPP terpantau'
              }
            ];

            // Map milestones
            const tahapOrder = ['PROPOSAL', 'SEMPRO', 'BIMBINGAN', 'SEMHAS', 'SIDANG', 'YUDISIUM'];
            const tahapLabel = { PROPOSAL: 'Proposal', SEMPRO: 'Sempro', BIMBINGAN: 'Bimbingan', SEMHAS: 'Semhas', SIDANG: 'Sidang', YUDISIUM: 'Yudisium' };
            const milestonesFromDB = (milestone.milestones || []);
            const milestones = tahapOrder.map((tahap, idx) => {
              const m = milestonesFromDB.find(x => x.tahap === tahap);
              return {
                id: idx + 1,
                tahap: tahapLabel[tahap] || tahap,
                status: m?.status === 'SELESAI' ? 'SELESAI' : m?.status === 'BERJALAN' ? 'AKTIF' : 'MENUNGGU',
                durasi: m?.tgl_mulai ? `${m.durasi_hari ?? '-'} hari` : '-',
                keterangan: m?.keterangan || '-'
              };
            });

            // Map action plans
            const actionPlans = actionPlansRaw.map((ap, idx) => ({
              id: ap.plan_id,
              judul: ap.deskripsi?.split('.')[0] || `Action Plan ${idx + 1}`,
              deskripsi: ap.deskripsi,
              tag: ap.status === 'SELESAI' ? 'Selesai' : ap.tgl_target ? ap.tgl_target : 'Segera',
              tagType: ap.status === 'SELESAI' ? 'success' : 'warning',
              selesai: ap.status === 'SELESAI'
            }));

            setStudentData(prev => ({
              ...prev,
              nim: mhs.nim || prev.nim,
              nama: mhs.nama || prev.nama,
              prodi: mhs.nama_prodi || prev.prodi,
              angkatan: mhs.angkatan || prev.angkatan,
              skorTotal: parseFloat(latestRisk.skor_total ?? prev.skorTotal),
              status: latestRisk.status || prev.status,
              terakhirDipindai: latestRisk.tgl_hitung ? new Date(latestRisk.tgl_hitung).toLocaleString('id-ID') : prev.terakhirDipindai,
              bimbinganTerverifikasi: milestone.jml_bimbingan_terverifikasi ?? prev.bimbinganTerverifikasi,
              pilar: pilar.length ? pilar : prev.pilar,
              milestones: milestones.length ? milestones : prev.milestones,
              actionPlans: actionPlans.length ? actionPlans : prev.actionPlans,
            }));
          }
        } else if (currentUser.role === 'DOSEN') {
          const adviseesRaw = await api.getAdvisees();
          const list = Array.isArray(adviseesRaw) ? adviseesRaw : [];
          if (list.length > 0) {
            setAdvisees(list.map(a => {
              const detail = a.detail_pemicu || {};
              const taPemicu = detail.ta || [];
              const pemicuUtama = taPemicu[0]?.pesan || (a.skor_ta >= 40 ? 'Progres TA berisiko' : 'Terpantau');
              return {
                nim: a.nim,
                nama: a.nama,
                initials: a.nama?.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase() || 'MH',
                angkatan: a.angkatan,
                skor: parseFloat(a.skor_total ?? 0),
                status: a.status_risiko || 'HIJAU',
                pemicuUtama,
                presensi: detail.akademik?.find(p => p.kode === 'PRESENSI_RENDAH')?.nilai ?? 90,
                nilaiE: detail.akademik?.find(p => p.kode === 'NILAI_E')?.pesan ?? 'Tidak ada nilai E',
                hariTanpaBimbingan: detail.ta?.find(p => p.kode?.includes('BIMBINGAN'))?.nilai ?? 0,
                statusUkt: detail.keuangan?.[0]?.kode === 'TUNGGAKAN_UKT' ? 'MENUNGGAK' : 'LUNAS',
                sskm: detail.nonAkademik?.find(p => p.kode === 'SSKM_BELUM_CUKUP')?.poin ?? 100,
                hariEskalasi: 0,
              };
            }));
          }
        } else if (currentUser.role === 'KAPRODI') {
          // Fetch analytics KTW + escalations
          const [analytics, escalationsRaw] = await Promise.all([
            api.getKtwAnalytics().catch(() => null),
            api.getEscalations().catch(() => []),
          ]);

          if (analytics?.prodiList?.length) {
            const prodi = analytics.prodiList[0];
            const total = parseInt(prodi.total_mahasiswa_aktif || 0);
            const hijau = parseInt(prodi.total_hijau || 0);
            const kuning = parseInt(prodi.total_kuning || 0);
            const merah = parseInt(prodi.total_merah || 0);
            const hijauPct = total ? Math.round(hijau / total * 100) : 82;
            const kuningPct = total ? Math.round(kuning / total * 100) : 15;
            const merahPct = total ? Math.round(merah / total * 100) : 3;
            setKtwStats({ total, hijau, kuning, merah, hijauPct, kuningPct, merahPct, rasioKtw: parseFloat(prodi.rasio_ktw_potensial ?? 0) });
          }

          const escList = Array.isArray(escalationsRaw) ? escalationsRaw : (escalationsRaw?.data || []);
          if (escList.length > 0) {
            setEscalations(escList.map(e => ({
              id: e.esc_id ?? e.id,
              nim: e.nim,
              nama: e.nama || '-',
              hari: e.hari_eskalasi ?? 0,
              pemicu: e.pemicu || e.keterangan || '-',
              keterangan: e.keterangan || '-',
              ditindaklanjuti: e.status_respons === 'DIRESPONS',
              catatanKaprodi: e.catatan || '',
            })));
          }
        } else if (currentUser.role === 'ADMIN') {
          // Fetch config & audit logs
          const [configRaw, auditRaw] = await Promise.all([
            api.getConfig().catch(() => []),
            api.getAuditLogs(50).catch(() => ({ data: [] })),
          ]);

          if (Array.isArray(configRaw) && configRaw.length > 0) {
            const findVal = (param) => {
              const c = configRaw.find(r => r.parameter === param);
              return c ? parseFloat(c.nilai) : null;
            };
            const bobotTa = findVal('BOBOT_TA');
            const bobotAkad = findVal('BOBOT_AKADEMIK');
            const bobotSskm = findVal('BOBOT_SSKM');
            const bobotKeu = findVal('BOBOT_KEUANGAN');
            const nHari = findVal('N_HARI');
            const mHari = findVal('M_HARI');
            if (bobotTa !== null) setWeights({ ta: bobotTa, akademik: bobotAkad ?? 30, sskm: bobotSskm ?? 15, keuangan: bobotKeu ?? 15 });
            if (nHari !== null) setEscalationParams({ nDays: nHari, mDays: mHari ?? 14 });
          }

          const auditList = auditRaw?.data || [];
          if (auditList.length > 0) {
            setAuditLogs(auditList.map(a => ({
              id: `AUD-${a.audit_id}`,
              waktu: new Date(a.waktu).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
              kategori: a.nama_tabel === 'config_rule' ? 'Konfigurasi' : a.aksi?.includes('SCAN') ? 'Pemindaian' : 'Sistem',
              aktivitas: a.aksi + (a.record_id ? ` #${a.record_id}` : ''),
              kanal: a.username || 'Sistem',
              status: 'Tercatat',
              badgeType: 'success',
            })));
          }
        }
      } catch (err) {
        console.warn('Gagal memuat data dari backend, menggunakan data simulasi:', err.message);
      }
    };
    loadRoleData();
  }, [currentUser]);

  const handleLogin = async (e, quickRole = null) => {
    if (e) e.preventDefault();
    const quickMap = {
      mahasiswa: '24410100007',
      dosen: 'doswal.bagus',
      kaprodi: 'kaprodi.si',
      admin: 'admin',
    };
    const username = quickRole ? quickMap[quickRole] || quickRole : loginInput.trim();
    const password = quickRole ? 'password123' : passwordInput || 'password123';

    if (!username) {
      setLoginError('Masukkan Username / NIM atau pilih akun demo di bawah.');
      return;
    }

    setLoginError('');
    try {
      const data = await api.login(username, password);
      const mapped = mapBackendUser(data.user);
      setCurrentUser(mapped);
      if (mapped.role === 'DOSEN') setActiveNav('matriks');
      else if (mapped.role === 'KAPRODI') setActiveNav('health');
      else if (mapped.role === 'ADMIN') setActiveNav('config');
      else setActiveNav('status');
    } catch (err) {
      setLoginError(err.message || 'Login gagal. Pastikan server backend berjalan.');
    }
  };

  const handleLogout = () => {
    clearTokens();
    setCurrentUser(null);
    setLoginInput('');
    setPasswordInput('');
    setDrawerStudent(null);
    setCounselingStudent(null);
  };

  // ============================================================================
  // HANDLERS: MAHASISWA ACTION PLAN (FR-DSH-05)
  // ============================================================================
  const toggleActionPlan = async (planId) => {
    const targetPlan = studentData.actionPlans.find((p) => p.id === planId);
    const nextSelesai = targetPlan ? !targetPlan.selesai : true;
    setStudentData((prev) => {
      const updatedPlans = prev.actionPlans.map((plan) =>
        plan.id === planId ? { ...plan, selesai: !plan.selesai } : plan
      );
      const completedCount = updatedPlans.filter((p) => p.selesai).length;
      const newScore = Math.max(35, 66 - completedCount * 4);
      const newStatus = newScore >= 70 ? 'MERAH' : newScore >= 40 ? 'KUNING' : 'HIJAU';

      return {
        ...prev,
        actionPlans: updatedPlans,
        skorTotal: newScore,
        status: newStatus
      };
    });
    if (currentUser?.raw && typeof planId === 'number') {
      try {
        await api.updateActionPlan(planId, nextSelesai ? 'SELESAI' : 'BELUM');
      } catch (err) {
        console.warn('Gagal update action plan ke backend:', err.message);
      }
    }
    showToastMessage('Status Action Plan berhasil diperbarui.');
  };

  // ============================================================================
  // HANDLERS: DOSEN WALI & KONSELING (BRL-16 APPEND-ONLY)
  // ============================================================================
  const filteredAdvisees = useMemo(() => {
    return advisees
      .filter((m) => {
        const matchSearch =
          m.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.nim.includes(searchQuery);
        const matchStatus = statusFilter === 'SEMUA' || m.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => (sortOrder === 'DESC' ? b.skor - a.skor : a.skor - b.skor));
  }, [advisees, searchQuery, statusFilter, sortOrder]);

  const handleSaveCounseling = async (e) => {
    e.preventDefault();
    if (!counselingForm.kendala.trim() || !counselingForm.rekomendasi.trim()) {
      showToastMessage('Catatan kendala dan rekomendasi wajib diisi.', 'error');
      return;
    }

    if (currentUser?.raw) {
      try {
        await api.createCounseling(counselingStudent.nim, {
          tgl_konseling: counselingForm.tanggal,
          catatan: counselingForm.kendala,
          tindak_lanjut: counselingForm.rekomendasi,
        });
      } catch (err) {
        showToastMessage(err.message || 'Gagal menyimpan catatan konseling ke backend.', 'error');
        return;
      }
    }

    const newLog = {
      id: `CNS-${18 + counselingLogs.length}`,
      nim: counselingStudent.nim,
      nama: counselingStudent.nama,
      tanggal: counselingForm.tanggal,
      target: counselingForm.target,
      kendala: counselingForm.kendala,
      rekomendasi: counselingForm.rekomendasi
    };

    setCounselingLogs([newLog, ...counselingLogs]);
    setCounselingForm({
      tanggal: '2026-05-28',
      target: '2026-06-11',
      kendala: '',
      rekomendasi: ''
    });
    setCounselingStudent(null);
    showToastMessage(`Catatan konseling ${newLog.nama} tersimpan (append-only).`);
  };

  // ============================================================================
  // HANDLERS: KAPRODI ESKALASI & EKSPOR (FR-DSH-07)
  // ============================================================================
  const handleConfirmEscalation = async (e) => {
    e.preventDefault();
    if (!escalationModalItem) return;

    if (currentUser?.raw && typeof escalationModalItem.id === 'number') {
      try {
        await api.updateEscalation(escalationModalItem.id, {
          status_respons: 'DIRESPONS',
          catatan: escalationNote || 'Pemanggilan resmi tingkat prodi dijadwalkan.',
        });
      } catch (err) {
        showToastMessage(err.message || 'Gagal memperbarui eskalasi di backend.', 'error');
        return;
      }
    }

    setEscalations((prev) =>
      prev.map((item) =>
        item.id === escalationModalItem.id
          ? { ...item, ditindaklanjuti: true, catatanKaprodi: escalationNote || 'Pemanggilan resmi tingkat prodi dijadwalkan.' }
          : item
      )
    );
    showToastMessage(`Tindak lanjut kasus ${escalationModalItem.nama} berhasil dicatat.`);
    setEscalationModalItem(null);
    setEscalationNote('');
  };

  // ============================================================================
  // HANDLERS: ADMINISTRATOR CONFIG & MANUAL SCAN (POST /scans, BRL-16)
  // ============================================================================
  const totalWeight = weights.ta + weights.akademik + weights.sskm + weights.keuangan;

  const handleSaveConfig = async () => {
    if (totalWeight !== 100) {
      showToastMessage(`Total bobot harus tepat 100% (saat ini ${totalWeight}%).`, 'error');
      return;
    }

    if (currentUser?.raw) {
      try {
        await api.updateConfig({
          BOBOT_TA: weights.ta,
          BOBOT_AKADEMIK: weights.akademik,
          BOBOT_SSKM: weights.sskm,
          BOBOT_KEUANGAN: weights.keuangan,
          N_HARI: escalationParams.nDays,
          M_HARI: escalationParams.mDays,
        });
      } catch (err) {
        showToastMessage(err.message || 'Gagal menyimpan konfigurasi ke backend.', 'error');
        return;
      }
    }

    const newAudit = {
      id: `AUD-${101 + auditLogs.length}`,
      waktu: 'Hari ini • Baru saja',
      kategori: 'Konfigurasi',
      aktivitas: `Bobot (${weights.ta}/${weights.akademik}/${weights.sskm}/${weights.keuangan}) & Eskalasi (N=${escalationParams.nDays}, M=${escalationParams.mDays}) diperbarui`,
      kanal: 'ADM-001',
      status: 'Tercatat',
      badgeType: 'success'
    };

    setAuditLogs([newAudit, ...auditLogs]);
    showToastMessage('Konfigurasi aturan disimpan & dicatat ke audit_log.');
  };

  const handleManualScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    try {
      let scannedCount = '1.248';
      if (currentUser?.raw) {
        const res = await api.triggerScan();
        if (res?.jmlMahasiswa !== undefined) scannedCount = String(res.jmlMahasiswa);
      }
      const scanAudit = {
        id: `AUD-${101 + auditLogs.length}`,
        waktu: 'Hari ini • Baru saja',
        kategori: 'Pemindaian',
        aktivitas: `Manual scan selesai • ${scannedCount} mahasiswa dipindai`,
        kanal: 'ADM-001 (Manual)',
        status: 'Berhasil',
        badgeType: 'success'
      };
      setAuditLogs([scanAudit, ...auditLogs]);
      showToastMessage('Pemindaian manual (POST /scans) selesai dijalankan.');
    } catch (err) {
      showToastMessage(err.message || 'Gagal menjalankan pemindaian manual.', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // ============================================================================
  // VIEW 1: HALAMAN LOGIN (GAMBAR 4.3 SDD)
  // ============================================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50/80 via-slate-50 to-slate-100 flex flex-col items-center justify-center p-4 font-sans text-slate-800">
        <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-100 p-8 sm:p-10">
          <div className="flex justify-center mb-6">
            <UndikaLogo size="lg" />
          </div>

          <div className="text-center mb-7">
            <p className="text-[11px] font-bold tracking-[0.2em] text-[#C8102E] uppercase mb-1.5">
              EARLY WARNING SYSTEM
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Masuk ke akun Anda
            </h1>
          </div>

          <form onSubmit={(e) => handleLogin(e)} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Username / NIM
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                  <Users className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="Contoh: mahasiswa, dosen, kaprodi, admin"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E] transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Kata sandi
                </label>
                <button
                  type="button"
                  onClick={() => showToastMessage('Hubungi Helpdesk IT BAAK Universitas Dinamika untuk reset SSO.')}
                  className="text-xs font-semibold text-[#C8102E] hover:underline"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-10 pr-14 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3.5 flex items-center text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  {showPassword ? 'Sembunyi' : 'Lihat'}
                </button>
              </div>
            </div>

            {loginError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-[#C8102E] hover:bg-[#A50D26] text-white text-sm font-semibold rounded-xl shadow-md shadow-red-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Masuk</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Akses Cepat Multi-Role RBAC untuk Simulasi Presentasi */}
          <div className="mt-7 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
              Simulasi Akses Cepat Peran (RBAC BRL-13)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleLogin(null, 'mahasiswa')}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-rose-50 hover:text-[#C8102E] border border-slate-200/80 rounded-lg transition text-left flex items-center justify-between cursor-pointer"
              >
                <span>Mahasiswa</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
              <button
                type="button"
                onClick={() => handleLogin(null, 'dosen')}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-rose-50 hover:text-[#C8102E] border border-slate-200/80 rounded-lg transition text-left flex items-center justify-between cursor-pointer"
              >
                <span>Dosen Wali</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
              <button
                type="button"
                onClick={() => handleLogin(null, 'kaprodi')}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-rose-50 hover:text-[#C8102E] border border-slate-200/80 rounded-lg transition text-left flex items-center justify-between cursor-pointer"
              >
                <span>Kaprodi</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
              <button
                type="button"
                onClick={() => handleLogin(null, 'admin')}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-rose-50 hover:text-[#C8102E] border border-slate-200/80 rounded-lg transition text-left flex items-center justify-between cursor-pointer"
              >
                <span>Admin Sistem</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Prodi S1 Sistem Informasi • Universitas Dinamika © 2026
        </p>

        {toast && (
          <div className="fixed bottom-5 right-5 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg z-50">
            {toast.message}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // KONFIGURASI MENU SIDEBAR BERDASARKAN PERAN (RBAC)
  // ============================================================================
  const navMenusByRole = {
    MAHASISWA: [
      { id: 'status', label: 'Status Risiko', icon: ShieldCheck, sectionId: 'sec-status' },
      { id: 'faktor', label: 'Faktor Risiko', icon: TrendingUp, sectionId: 'sec-faktor' },
      { id: 'milestone', label: 'Milestone TA', icon: BookOpen, sectionId: 'sec-milestone' },
      { id: 'action', label: 'Action Plan', icon: CheckCircle2, sectionId: 'sec-action' }
    ],
    DOSEN: [
      { id: 'matriks', label: 'Matriks & Tindak Lanjut', icon: Users, sectionId: 'sec-matriks' },
      { id: 'riwayat-konseling', label: 'Riwayat Konseling', icon: FileText, sectionId: 'sec-konseling' }
    ],
    KAPRODI: [
      { id: 'health', label: 'Health KTW', icon: TrendingUp, sectionId: 'sec-health' },
      { id: 'bottleneck', label: 'Bottleneck TA', icon: BookOpen, sectionId: 'sec-bottleneck' },
      { id: 'eskalasi', label: 'Antrean Eskalasi', icon: Bell, sectionId: 'sec-eskalasi' }
    ],
    ADMIN: [
      { id: 'config', label: 'Konfigurasi Aturan', icon: Sliders, sectionId: 'sec-config' },
      { id: 'audit', label: 'Health & Audit Log', icon: Activity, sectionId: 'sec-audit' }
    ]
  };

  const currentNavMenus = navMenusByRole[currentUser.role] || [];

  const handleNavClick = (menu) => {
    setActiveNav(menu.id);
    const el = document.getElementById(menu.sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const selectedMilestoneObj =
    studentData.milestones.find((m) => m.id === selectedMilestoneId) || studentData.milestones[2];

  const completedPlansCount = studentData.actionPlans.filter((p) => p.selesai).length;

  // Data Gauge Chart untuk Hero Card Mahasiswa
  const gaugeData = [{ name: 'Skor', value: studentData.skorTotal, fill: '#F59E0B' }];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col lg:flex-row font-sans text-slate-800">
      {/* ========================================================================
          SIDEBAR KIRI (KONSISTEN DENGAN PROTOTYPE FIGMA)
      ======================================================================== */}
      <aside className="w-full lg:w-[250px] bg-white border-b lg:border-b-0 lg:border-r border-slate-200/80 flex flex-col justify-between shrink-0 lg:sticky lg:top-0 lg:h-screen z-20">
        <div>
          {/* Logo Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <UndikaLogo size="md" />
            <button
              onClick={handleLogout}
              className="lg:hidden text-xs font-medium text-slate-500 hover:text-[#C8102E] flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>

          {/* Mode Akses Card */}
          <div className="p-4">
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-0.5">
                MODE AKSES
              </p>
              <p className="text-sm font-bold text-slate-800">{currentUser.roleLabel}</p>
            </div>
          </div>

          {/* Navigasi Modul Dashboard */}
          <div className="px-3 pb-4">
            <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">
              MODUL DASHBOARD
            </p>
            <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
              {currentNavMenus.map((menu) => {
                const Icon = menu.icon;
                const isActive = activeNav === menu.id;
                return (
                  <button
                    key={menu.id}
                    onClick={() => handleNavClick(menu)}
                    className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-rose-50/90 text-[#C8102E] font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {isActive && (
                      <span className="hidden lg:block absolute left-0 top-2 bottom-2 w-1 bg-[#C8102E] rounded-r-full" />
                    )}
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#C8102E]' : 'text-slate-400'}`} />
                    <span>{menu.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tombol Keluar & Switch Role */}
        <div className="hidden lg:block p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-slate-600 hover:text-[#C8102E] hover:bg-rose-50/60 rounded-xl transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================
          KONTEN UTAMA KANAN
      ======================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-white/90 backdrop-blur border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5 text-slate-400 text-sm">
            <Search className="w-4 h-4" />
            <span className="truncate">Early Warning System Kelulusan Mahasiswa</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => showToastMessage('Tidak ada notifikasi baru yang belum dibaca.')}
              className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200/70 transition cursor-pointer"
              title="Notifikasi Sistem"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#C8102E] rounded-full" />
            </button>

            <div className="flex items-center gap-3 pl-1">
              <div className="w-9 h-9 rounded-xl bg-[#B91C1C] text-white font-bold text-xs flex items-center justify-center shadow-sm">
                {currentUser.initials}
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-sm font-bold text-slate-800">{currentUser.name}</p>
                <p className="text-[11px] text-slate-400">{currentUser.subtitle}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1240px] w-full mx-auto space-y-6">
          {/* ==================================================================
              DASHBOARD 1: MAHASISWA (GAMBAR 4.4 & 4.5 SDD)
          ================================================================== */}
          {currentUser.role === 'MAHASISWA' && (
            <>
              {/* Header Judul */}
              <div id="sec-status" className="scroll-mt-24">
                <p className="text-[11px] font-bold tracking-[0.16em] text-[#C8102E] uppercase mb-1">
                  DASHBOARD MAHASISWA
                </p>
                <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
                  Status Kelulusan Saya
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Pantau risiko, progres Tugas Akhir, dan rekomendasi perbaikan dalam satu halaman.
                </p>
              </div>

              {/* Hero Card Status Risiko */}
              <div className="bg-gradient-to-r from-[#580C16] via-[#8E1322] to-[#B91C2C] rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-red-900/15 relative overflow-hidden">
                <div className="absolute -right-12 -bottom-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 relative z-10">
                  {/* Radial Gauge Score */}
                  <div className="w-32 h-32 shrink-0 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="74%"
                        outerRadius="96%"
                        barSize={10}
                        data={gaugeData}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar
                          background={{ fill: 'rgba(255,255,255,0.16)' }}
                          dataKey="value"
                          cornerRadius={10}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-3xl font-extrabold leading-none">{studentData.skorTotal}</span>
                      <span className="text-[11px] text-rose-200 mt-1">dari 100</span>
                    </div>
                  </div>

                  {/* Deskripsi Status */}
                  <div className="flex-1 text-center sm:text-left">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] mb-3">
                      <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                      {studentData.status === 'KUNING'
                        ? 'Risiko Kuning • Waspada'
                        : studentData.status === 'MERAH'
                        ? 'Red Alert • Kritis'
                        : 'Risiko Hijau • Aman'}
                    </span>

                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
                      {studentData.status === 'HIJAU'
                        ? 'Progres kelulusanmu berada di jalur aman'
                        : 'Kelulusanmu memerlukan perhatian'}
                    </h2>
                    <p className="text-sm text-rose-100/90 max-w-2xl leading-relaxed">
                      Terdapat tiga indikator aktif. Fokuskan perbaikan pada progres TA dan pemenuhan SSKM untuk menurunkan skor risiko.
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4 text-xs text-rose-200">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Dipindai {studentData.terakhirDipindai}
                      </span>
                      <span className="font-semibold text-amber-200">
                        Turun {Math.abs(studentData.perubahanSkor)} poin (Membaik)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Factor Breakdown (4 Pilar) */}
              <section id="sec-faktor" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs scroll-mt-24">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                  <div>
                    <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      RISK FACTOR BREAKDOWN
                    </p>
                    <h3 className="text-lg font-bold text-slate-900">Sumber risiko pada 4 pilar</h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Skor total {studentData.skorTotal}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {studentData.pilar.map((item) => (
                    <div
                      key={item.id}
                      className="border border-slate-200/80 rounded-2xl p-4 hover:border-slate-300 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{item.nama}</p>
                            <p className="text-[11px] text-slate-400">Bobot {item.bobot}</p>
                          </div>
                          <span className="text-2xl font-extrabold text-slate-900">{item.skor}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2.5">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(item.skor, 4)}%`,
                              backgroundColor: item.warna
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-600">{item.level}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Milestone Progress Bar (6 Tahap TA) */}
              <section id="sec-milestone" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs scroll-mt-24">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                  <div>
                    <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      MILESTONE PROGRESS
                    </p>
                    <h3 className="text-lg font-bold text-slate-900">Perjalanan Tugas Akhir</h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {studentData.bimbinganTerverifikasi} dari {studentData.bimbinganMinimal} bimbingan
                  </span>
                </div>

                {/* Stepper Horizontal */}
                <div className="overflow-x-auto pb-2">
                  <div className="min-w-[600px] relative flex items-start justify-between px-4 pt-2 pb-4">
                    {/* Garis penghubung */}
                    <div className="absolute top-7 left-10 right-10 h-[2px] bg-slate-200 z-0" />
                    <div className="absolute top-7 left-10 w-[42%] h-[2px] bg-[#C8102E] z-0" />

                    {studentData.milestones.map((m) => {
                      const isDone = m.status === 'SELESAI';
                      const isActive = m.status === 'AKTIF';
                      const isSelected = m.id === selectedMilestoneId;

                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedMilestoneId(m.id)}
                          className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none"
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition ${
                              isDone
                                ? 'bg-[#C8102E] text-white shadow-sm'
                                : isActive
                                ? 'bg-white border-2 border-[#C8102E] text-[#C8102E] ring-4 ring-rose-100'
                                : 'bg-white border border-slate-200 text-slate-400 group-hover:border-slate-300'
                            } ${isSelected ? 'scale-110' : ''}`}
                          >
                            {isDone ? <Check className="w-4 h-4 stroke-[2.5]" /> : m.id}
                          </div>
                          <span
                            className={`mt-2.5 text-xs font-bold ${
                              isDone || isActive ? 'text-slate-900' : 'text-slate-500'
                            }`}
                          >
                            {m.tahap}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5 capitalize">
                            {m.status.toLowerCase()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Detail Tahap Terpilih */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  <div className="bg-slate-50/90 border border-slate-200/70 rounded-2xl p-4">
                    <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                      TAHAP DIPILIH
                    </p>
                    <p className="text-sm font-bold text-slate-900">{selectedMilestoneObj.tahap}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedMilestoneObj.keterangan}</p>
                  </div>
                  <div className="bg-slate-50/90 border border-slate-200/70 rounded-2xl p-4">
                    <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                      DURASI PENGERJAAN
                    </p>
                    <p className="text-sm font-bold text-slate-900">{selectedMilestoneObj.durasi}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Batas peringatan macet: &gt; 30 hari</p>
                  </div>
                  <div className="bg-slate-50/90 border border-slate-200/70 rounded-2xl p-4">
                    <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                      BIMBINGAN TERVERIFIKASI
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {studentData.bimbinganTerverifikasi} / minimal {studentData.bimbinganMinimal} sesi
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Syarat wajib daftar ujian TA (BRL-05)</p>
                  </div>
                </div>
              </section>

              {/* Action Plan Perbaikan (AI Academic Advisor) & Validasi Yudisium */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section
                  id="sec-action"
                  className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs scroll-mt-24"
                >
                  <div className="flex items-center justify-between gap-2 mb-5">
                    <div>
                      <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                        AI ACADEMIC ADVISOR
                      </p>
                      <h3 className="text-lg font-bold text-slate-900">Action Plan Perbaikan</h3>
                    </div>
                    <span className="text-xs font-bold text-[#C8102E]">
                      {completedPlansCount} dari {studentData.actionPlans.length} selesai
                    </span>
                  </div>

                  <div className="space-y-3">
                    {studentData.actionPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                          plan.selesai
                            ? 'bg-emerald-50/60 border-emerald-200/80'
                            : 'bg-white border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          <button
                            type="button"
                            onClick={() => toggleActionPlan(plan.id)}
                            className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 cursor-pointer ${
                              plan.selesai
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-white border-slate-300 hover:border-[#C8102E]'
                            }`}
                          >
                            {plan.selesai && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                          <div>
                            <p
                              className={`text-sm font-bold ${
                                plan.selesai ? 'text-emerald-950' : 'text-slate-900'
                              }`}
                            >
                              {plan.judul}
                            </p>
                            <p
                              className={`text-xs mt-0.5 ${
                                plan.selesai ? 'text-emerald-700' : 'text-slate-500'
                              }`}
                            >
                              {plan.deskripsi}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                          {plan.selesai ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Selesai
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                plan.tagType === 'danger'
                                  ? 'bg-rose-50 text-[#C8102E]'
                                  : 'bg-amber-50 text-amber-800'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  plan.tagType === 'danger' ? 'bg-[#C8102E]' : 'bg-amber-500'
                                }`}
                              />
                              {plan.tag}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleActionPlan(plan.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer"
                          >
                            {plan.selesai ? 'Batalkan' : 'Update status'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Checklist Prasyarat Yudisium (FR-YUD-04) */}
                <section className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      VALIDASI YUDISIUM (FR-12)
                    </p>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Prasyarat Kelulusan</h3>

                    <div className="space-y-3">
                      {studentData.yudisiumChecklist.map((syarat, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100"
                        >
                          <div
                            className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                              syarat.terpenuhi
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {syarat.terpenuhi ? (
                              <Check className="w-3 h-3 stroke-[2.5]" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{syarat.item}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{syarat.ket}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Data disinkronkan otomatis dari SIAKAD, SIM-TA & Perpustakaan.</span>
                  </div>
                </section>
              </div>
            </>
          )}

          {/* ==================================================================
              DASHBOARD 2: DOSEN WALI & DOSBING TA (GAMBAR 4.6, 4.7, 4.8 SDD)
          ================================================================== */}
          {currentUser.role === 'DOSEN' && (
            <>
              <div id="sec-matriks" className="flex flex-wrap items-end justify-between gap-4 scroll-mt-24">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.16em] text-[#C8102E] uppercase mb-1">
                    DASHBOARD DPA & DOSBING TA
                  </p>
                  <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
                    Mahasiswa Berisiko
                  </h1>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Prioritaskan mahasiswa perwalian berstatus Kuning dan Merah berdasarkan skor risiko tertinggi.
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 text-right shadow-xs">
                  <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    {filteredAdvisees.length} MAHASISWA DITAMPILKAN
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {17 + counselingLogs.length} counseling_log
                  </p>
                </div>
              </div>

              {/* At-Risk Student Matrix Card */}
              <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                  <div>
                    <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      AT-RISK STUDENT MATRIX
                    </p>
                    <h3 className="text-lg font-bold text-slate-900">Matriks prioritas mahasiswa</h3>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-[#C8102E] border border-rose-200/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E]" />
                    {advisees.filter((a) => a.status === 'MERAH').length} Red Alert
                  </span>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama atau NIM..."
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#C8102E]"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#C8102E]"
                  >
                    <option value="SEMUA">Semua Status</option>
                    <option value="MERAH">Merah (Red Alert)</option>
                    <option value="KUNING">Kuning (Waspada)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setSortOrder(sortOrder === 'DESC' ? 'ASC' : 'DESC')}
                    className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer"
                  >
                    {sortOrder === 'DESC' ? 'Skor tertinggi' : 'Skor terendah'}
                  </button>
                </div>

                {/* Tabel Mahasiswa */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                        <th className="pb-3.5 pr-4">MAHASISWA</th>
                        <th className="pb-3.5 px-4">ANGKATAN</th>
                        <th className="pb-3.5 px-4">SKOR</th>
                        <th className="pb-3.5 px-4">STATUS</th>
                        <th className="pb-3.5 px-4">PEMICU UTAMA</th>
                        <th className="pb-3.5 pl-4 text-right">AKSI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredAdvisees.map((mhs) => (
                        <tr key={mhs.nim} className="hover:bg-slate-50/70 transition">
                          <td className="py-4 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                                {mhs.initials}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{mhs.nama}</p>
                                <p className="text-xs text-slate-400">{mhs.nim}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-slate-600">{mhs.angkatan}</td>
                          <td className="py-4 px-4">
                            <span className="font-extrabold text-[#C8102E]">{mhs.skor}</span>
                            <span className="text-xs text-slate-400"> / 100</span>
                          </td>
                          <td className="py-4 px-4">
                            {mhs.status === 'MERAH' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-[#C8102E]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E]" />
                                Merah
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Kuning
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-slate-600">{mhs.pemicuUtama}</td>
                          <td className="py-4 pl-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setDrawerStudent(mhs)}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer"
                              >
                                Detail trigger
                              </button>
                              <button
                                type="button"
                                onClick={() => setCounselingStudent(mhs)}
                                className="px-3 py-1.5 text-xs font-semibold text-[#C8102E] bg-rose-50 hover:bg-rose-100 rounded-xl transition cursor-pointer"
                              >
                                Konseling
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Riwayat Konseling Terbaru (Append-Only BRL-16) */}
              <section id="sec-konseling" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs scroll-mt-24">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      COUNSELING_LOG (APPEND-ONLY)
                    </p>
                    <h3 className="text-lg font-bold text-slate-900">Riwayat Tindak Lanjut Konseling</h3>
                  </div>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Tidak dapat dihapus (BRL-16)
                  </span>
                </div>

                <div className="space-y-3">
                  {counselingLogs.map((log) => (
                    <div key={log.id} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <p className="text-sm font-bold text-slate-900">
                          {log.nama} <span className="text-xs font-normal text-slate-500">({log.nim})</span>
                        </p>
                        <span className="text-xs font-medium text-slate-500">
                          Pertemuan: {log.tanggal} • Target Evaluasi: {log.target}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        <span className="font-semibold">Kendala:</span> {log.kendala}
                      </p>
                      <p className="text-xs text-slate-700 mt-1">
                        <span className="font-semibold text-[#C8102E]">Rekomendasi:</span> {log.rekomendasi}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ==================================================================
              DASHBOARD 3: KAPRODI & KOORDINATOR TA (GAMBAR 4.9 & 4.10 SDD)
          ================================================================== */}
          {currentUser.role === 'KAPRODI' && (
            <>
              <div id="sec-health" className="flex flex-wrap items-end justify-between gap-4 scroll-mt-24">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.16em] text-[#C8102E] uppercase mb-1">
                    EXECUTIVE DASHBOARD
                  </p>
                  <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
                    Kesehatan Kelulusan Tepat Waktu
                  </h1>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Pantau kesehatan KTW, titik kemacetan Tugas Akhir, dan kasus kritis yang memerlukan keputusan prodi.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => showToastMessage('Laporan agregat KTW berhasil diekspor ke PDF/Excel.')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Ekspor Laporan
                  </button>
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200/80 rounded-xl">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Diperbarui hari ini
                  </span>
                </div>
              </div>

              {/* 3 Kartu Analitik Utama */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Card 1: Health KTW */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">HEALTH KTW</p>
                    <h3 className="text-base font-bold text-slate-900">Kelulusan tepat waktu</h3>
                  </div>

                  <div className="my-4 flex flex-col items-center justify-center relative h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'KTW', value: 78.4 },
                            { name: 'Sisa', value: 21.6 }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={54}
                          outerRadius={68}
                          startAngle={90}
                          endAngle={-270}
                          dataKey="value"
                          stroke="none"
                        >
                          <Cell fill="#DC2626" />
                          <Cell fill="#E2E8F0" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-extrabold text-slate-900">78,4%</span>
                      <span className="text-[11px] text-slate-400">KTW Prodi</span>
                      <span className="text-[11px] font-semibold text-[#C8102E]">Target 80%</span>
                    </div>
                  </div>

                  <p className="text-xs text-center text-slate-500">
                    <span className="font-bold text-emerald-600">+4,2%</span> dibanding tahun lalu
                  </p>
                </div>

                {/* Card 2: Sebaran Status */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">SEBARAN STATUS</p>
                    <h3 className="text-base font-bold text-slate-900">1.248 mahasiswa aktif</h3>
                  </div>

                  <div className="my-4 flex items-center justify-between gap-4">
                    <div className="w-36 h-36 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={STATUS_DISTRIBUTION_DATA}
                            cx="50%"
                            cy="50%"
                            innerRadius={42}
                            outerRadius={62}
                            dataKey="value"
                            stroke="none"
                          >
                            {STATUS_DISTRIBUTION_DATA.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(val) => `${val}%`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex-1 space-y-3">
                      {STATUS_DISTRIBUTION_DATA.map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-slate-600 font-medium">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            {item.name.split(' ')[0]}
                          </span>
                          <span className="font-bold text-slate-900">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Konsolidasi otomatis dari 4 pilar EWS prodi
                  </p>
                </div>

                {/* Card 3: Tren Semester */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">TREN SEMESTER</p>
                      <h3 className="text-base font-bold text-slate-900">Performa KTW</h3>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Tren naik
                    </span>
                  </div>

                  <div className="h-44 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={KTW_TREND_DATA} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
                        <defs>
                          <linearGradient id="ktwGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#DC2626" stopOpacity={0.22} />
                            <stop offset="95%" stopColor="#DC2626" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="semester" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                        <YAxis domain={[60, 85]} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(v) => [`${v}%`, 'Rasio KTW']} />
                        <Area
                          type="monotone"
                          dataKey="ktw"
                          stroke="#DC2626"
                          strokeWidth={2.5}
                          fill="url(#ktwGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* TA Bottleneck Analytics */}
              <section id="sec-bottleneck" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs scroll-mt-24">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      TA BOTTLENECK ANALYTICS
                    </p>
                    <h3 className="text-lg font-bold text-slate-900">Pemetaan titik kemacetan utama</h3>
                  </div>
                  <span className="text-xs text-slate-400">Jumlah mahasiswa</span>
                </div>

                <div className="space-y-4">
                  {TA_BOTTLENECK_DATA.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 p-3.5 rounded-2xl border border-slate-100 hover:bg-slate-50/70 transition"
                    >
                      <div className="flex items-center gap-3 sm:w-64 shrink-0">
                        <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">
                          {item.id}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{item.tahap}</p>
                          <p className="text-[11px] text-slate-400">{item.ket}</p>
                        </div>
                      </div>

                      <div className="flex-1 flex items-center gap-4">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#DC2626] rounded-full"
                            style={{ width: `${(item.jumlah / item.max) * 100}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-sm font-extrabold text-slate-900">
                          {item.jumlah}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Escalation Queue (M = 14 hari BRL-11) */}
              <section id="sec-eskalasi" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs scroll-mt-24">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                  <div>
                    <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      ESCALATION QUEUE
                    </p>
                    <h3 className="text-lg font-bold text-slate-900">
                      Kasus Red Alert melewati M = 14 hari
                    </h3>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-[#C8102E]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E]" />
                    {escalations.filter((e) => !e.ditindaklanjuti).length} kasus kritis
                  </span>
                </div>

                <div className="space-y-3">
                  {escalations.map((esc) => (
                    <div
                      key={esc.id}
                      className="p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#C8102E] flex flex-col items-center justify-center shrink-0">
                          <span className="text-sm font-extrabold leading-none">{esc.hari}</span>
                          <span className="text-[10px] font-medium mt-0.5">hari</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{esc.nama}</p>
                          <p className="text-xs text-slate-600">{esc.pemicu}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {esc.ditindaklanjuti ? `Keputusan Prodi: ${esc.catatanKaprodi}` : esc.keterangan}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-[#C8102E]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E]" />
                          Red Alert
                        </span>

                        {esc.ditindaklanjuti ? (
                          <span className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl">
                            Ditindaklanjuti
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEscalationModalItem(esc)}
                            className="px-4 py-2 text-xs font-semibold text-white bg-[#C8102E] hover:bg-[#A50D26] rounded-xl transition cursor-pointer"
                          >
                            Tindak lanjuti
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ==================================================================
              DASHBOARD 4: ADMINISTRATOR SISTEM (GAMBAR 4.11 & 4.12 SDD)
          ================================================================== */}
          {currentUser.role === 'ADMIN' && (
            <>
              <div id="sec-config" className="flex flex-wrap items-end justify-between gap-4 scroll-mt-24">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.16em] text-[#C8102E] uppercase mb-1">
                    RULE CONFIGURATION
                  </p>
                  <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
                    Parameter Early Warning System
                  </h1>
                </div>

                <div className="flex items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold ${
                      totalWeight === 100
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-[#C8102E]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        totalWeight === 100 ? 'bg-emerald-500' : 'bg-[#C8102E]'
                      }`}
                    />
                    Total bobot {totalWeight}%
                  </span>

                  <button
                    type="button"
                    onClick={handleManualScan}
                    disabled={isScanning}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    {isScanning ? 'Memindai...' : 'Pindai Manual'}
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#C8102E] hover:bg-[#A50D26] rounded-xl transition cursor-pointer"
                  >
                    Simpan Aturan
                  </button>
                </div>
              </div>

              {/* 3 Kolom Konfigurasi Aturan */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Kolom 1: Bobot Pilar Risiko */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                  <h3 className="text-base font-bold text-slate-900">Bobot pilar risiko</h3>

                  {[
                    { key: 'ta', label: 'Progres TA' },
                    { key: 'akademik', label: 'Akademik' },
                    { key: 'sskm', label: 'SSKM' },
                    { key: 'keuangan', label: 'Keuangan' }
                  ].map((item) => (
                    <div key={item.key}>
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span className="text-slate-700">{item.label}</span>
                        <span className="text-[#C8102E]">{weights[item.key]}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={weights[item.key]}
                        onChange={(e) =>
                          setWeights({ ...weights, [item.key]: Number(e.target.value) })
                        }
                        className="w-full accent-[#C8102E] cursor-pointer"
                      />
                    </div>
                  ))}
                </div>

                {/* Kolom 2: Threshold Klasifikasi */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                  <h3 className="text-base font-bold text-slate-900">Threshold klasifikasi</h3>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="text-slate-700">Waspada / Kuning mulai</span>
                      <span className="text-[#C8102E]">{thresholds.kuning}</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="60"
                      value={thresholds.kuning}
                      onChange={(e) =>
                        setThresholds({ ...thresholds, kuning: Number(e.target.value) })
                      }
                      className="w-full accent-[#C8102E] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="text-slate-700">Red Alert mulai</span>
                      <span className="text-[#C8102E]">{thresholds.merah}</span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="90"
                      value={thresholds.merah}
                      onChange={(e) =>
                        setThresholds({ ...thresholds, merah: Number(e.target.value) })
                      }
                      className="w-full accent-[#C8102E] cursor-pointer"
                    />
                  </div>

                  <div className="pt-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Jadwal scan otomatis
                    </label>
                    <select
                      value={thresholds.jadwal}
                      onChange={(e) => setThresholds({ ...thresholds, jadwal: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#C8102E]"
                    >
                      <option>Tengah & akhir semester</option>
                      <option>Setiap bulan (tanggal 1)</option>
                      <option>Mingguan (Senin 02.00 WIB)</option>
                    </select>
                  </div>
                </div>

                {/* Kolom 3: Parameter Eskalasi */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900">Parameter eskalasi</h3>

                    <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200/80">
                      <div>
                        <p className="text-xs font-bold text-slate-800">N • Dosen Wali</p>
                        <p className="text-[11px] text-slate-400">Batas respons awal</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="14"
                          value={escalationParams.nDays}
                          onChange={(e) =>
                            setEscalationParams({ ...escalationParams, nDays: Number(e.target.value) })
                          }
                          className="w-14 px-2 py-1.5 text-center text-sm font-bold border border-slate-200 rounded-lg"
                        />
                        <span className="text-xs text-slate-500">hari</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200/80">
                      <div>
                        <p className="text-xs font-bold text-slate-800">M • Kaprodi</p>
                        <p className="text-[11px] text-slate-400">Eskalasi kasus lanjutan</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="7"
                          max="30"
                          value={escalationParams.mDays}
                          onChange={(e) =>
                            setEscalationParams({ ...escalationParams, mDays: Number(e.target.value) })
                          }
                          className="w-14 px-2 py-1.5 text-center text-sm font-bold border border-slate-200 rounded-lg"
                        />
                        <span className="text-xs text-slate-500">hari</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100 flex items-start gap-2.5 text-[11px] text-[#C8102E]">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Perubahan parameter dicatat secara append-only pada audit_log.</span>
                  </div>
                </div>
              </div>

              {/* Status Kesehatan Layanan Sistem (3 Kartu) */}
              <div id="sec-audit" className="grid grid-cols-1 md:grid-cols-3 gap-4 scroll-mt-24">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Background Scanner</p>
                      <p className="text-xs text-slate-400">Beroperasi normal</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Online
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">WhatsApp API</p>
                      <p className="text-xs text-slate-400">98,4% terkirim</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Sehat
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Email API (SMTP)</p>
                      <p className="text-xs text-slate-400">100% terkirim (Failover aktif)</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Sehat
                  </span>
                </div>
              </div>

              {/* Rekam Jejak Append-Only Audit Log (BRL-16) */}
              <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                  <div>
                    <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      SYSTEM HEALTH & AUDIT LOG
                    </p>
                    <h3 className="text-lg font-bold text-slate-900">Rekam jejak append-only</h3>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                    Tidak dapat dihapus
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                        <th className="pb-3 pr-4">WAKTU</th>
                        <th className="pb-3 px-4">KATEGORI</th>
                        <th className="pb-3 px-4">AKTIVITAS</th>
                        <th className="pb-3 px-4">KANAL / AKTOR</th>
                        <th className="pb-3 pl-4 text-right">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 pr-4 text-slate-500 whitespace-nowrap">{log.waktu}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">{log.kategori}</td>
                          <td className="py-3.5 px-4 text-slate-600">{log.aktivitas}</td>
                          <td className="py-3.5 px-4 text-slate-500">{log.kanal}</td>
                          <td className="py-3.5 pl-4 text-right">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                log.badgeType === 'warning'
                                  ? 'bg-amber-50 text-amber-800'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  log.badgeType === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                              />
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      {/* ========================================================================
          DRAWER SLIDE-OVER: DETAIL TRIGGER RISIKO (GAMBAR 4.7 SDD)
      ======================================================================== */}
      {drawerStudent && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 sm:p-7 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-start justify-between gap-3 pb-5 border-b border-slate-100">
                <div>
                  <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    DETAIL TRIGGER RISIKO
                  </p>
                  <h3 className="text-xl font-bold text-slate-900 mt-0.5">{drawerStudent.nama}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {drawerStudent.nim} • Angkatan {drawerStudent.angkatan}
                  </p>
                </div>
                <button
                  onClick={() => setDrawerStudent(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Score Summary Box */}
              <div className="my-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                {drawerStudent.status === 'MERAH' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-[#C8102E]">
                    <span className="w-2 h-2 rounded-full bg-[#C8102E]" />
                    Status Merah
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Status Kuning
                  </span>
                )}
                <div>
                  <span className="text-2xl font-extrabold text-[#C8102E]">{drawerStudent.skor}</span>
                  <span className="text-xs text-slate-400">/100</span>
                </div>
              </div>

              {/* 4 Trigger Cards */}
              <div className="space-y-3">
                <div className="p-4 rounded-2xl border border-slate-200/80 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#C8102E] flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-400">Riwayat presensi</p>
                    <p className="text-sm font-bold text-slate-900">{drawerStudent.presensi}% kehadiran</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {drawerStudent.presensi < 75
                        ? 'Di bawah batas minimum 75% (BRL-06)'
                        : 'Memenuhi batas kehadiran minimum'}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/80 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#C8102E] flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-400">Daftar nilai E</p>
                    <p className="text-sm font-bold text-slate-900">{drawerStudent.nilaiE}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/80 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-400">Log bimbingan TA</p>
                    <p className="text-sm font-bold text-slate-900">
                      {drawerStudent.hariTanpaBimbingan} hari tanpa bimbingan
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {drawerStudent.hariTanpaBimbingan > 30
                        ? 'Melewati batas macet 30 hari (BRL-05)'
                        : 'Masih dalam rentang aktif'}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/80 flex items-start gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      drawerStudent.statusUkt === 'LUNAS'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-400">Status UKT (BRL-14)</p>
                    <p className="text-sm font-bold text-slate-900">
                      {drawerStudent.statusUkt === 'LUNAS' ? 'Lunas' : 'Menunggak'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {drawerStudent.statusUkt === 'LUNAS'
                        ? 'Tidak ada kendala keuangan'
                        : 'Memblokir pendaftaran ujian/sidang (BRL-08)'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const target = drawerStudent;
                setDrawerStudent(null);
                setCounselingStudent(target);
              }}
              className="mt-6 w-full py-3.5 px-4 bg-[#C8102E] hover:bg-[#A50D26] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Catat hasil konseling</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL: FORM KONSELING AKADEMIK (GAMBAR 4.8 SDD)
      ======================================================================== */}
      {counselingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  COUNSELING FORM
                </p>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">Catat konseling akademik</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {counselingStudent.nama} • {counselingStudent.nim}
                </p>
              </div>
              <button
                onClick={() => setCounselingStudent(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCounseling} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tanggal pertemuan
                  </label>
                  <input
                    type="date"
                    value={counselingForm.tanggal}
                    onChange={(e) =>
                      setCounselingForm({ ...counselingForm, tanggal: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#C8102E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Target evaluasi
                  </label>
                  <input
                    type="date"
                    value={counselingForm.target}
                    onChange={(e) =>
                      setCounselingForm({ ...counselingForm, target: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#C8102E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Catatan kendala
                </label>
                <textarea
                  rows="3"
                  value={counselingForm.kendala}
                  onChange={(e) =>
                    setCounselingForm({ ...counselingForm, kendala: e.target.value })
                  }
                  placeholder="Tuliskan kendala utama mahasiswa..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#C8102E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Rekomendasi tindak lanjut
                </label>
                <textarea
                  rows="3"
                  value={counselingForm.rekomendasi}
                  onChange={(e) =>
                    setCounselingForm({ ...counselingForm, rekomendasi: e.target.value })
                  }
                  placeholder="Tuliskan rekomendasi hasil konseling..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#C8102E]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCounselingStudent(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#C8102E] hover:bg-[#A50D26] rounded-xl cursor-pointer"
                >
                  Simpan ke counseling_log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL: TINDAK LANJUT ESKALASI KAPRODI (PATCH /escalations/{id})
      ======================================================================== */}
      {escalationModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-7">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-[11px] font-bold tracking-wider text-[#C8102E] uppercase">
                  KEPUTUSAN ESKALASI PRODI
                </p>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  {escalationModalItem.nama}
                </h3>
                <p className="text-xs text-slate-500">{escalationModalItem.pemicu}</p>
              </div>
              <button
                onClick={() => setEscalationModalItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmEscalation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tindakan / Kebijakan Khusus Kaprodi
                </label>
                <textarea
                  rows="3"
                  value={escalationNote}
                  onChange={(e) => setEscalationNote(e.target.value)}
                  placeholder="Contoh: Pemanggilan mahasiswa & orang tua, penggantian pembimbing TA, atau dispensasi perpanjangan..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#C8102E]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEscalationModalItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#C8102E] hover:bg-[#A50D26] rounded-xl cursor-pointer"
                >
                  Simpan Keputusan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================
          TOAST NOTIFICATION
      ======================================================================== */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold text-white z-50 transition ${
            toast.type === 'error' ? 'bg-red-700' : 'bg-slate-900'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}