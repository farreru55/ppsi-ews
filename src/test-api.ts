import http from 'http';
import { createApp } from './app';
import { env } from './config/environment';
import { pool, query } from './config/database';
import { generateHmacSignature } from './utils/hmac.util';
import { EscalationService } from './modules/escalations/escalation.service';

const app = createApp();
const PORT = 5566; // Test port

const request = async (options: {
  method: string;
  path: string;
  token?: string;
  apiKey?: string;
  hmacSignature?: string;
  body?: any;
}): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> => {
  return new Promise((resolve, reject) => {
    const payload = options.body ? JSON.stringify(options.body) : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload).toString();
    }
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }
    if (options.apiKey) {
      headers['X-API-Key'] = options.apiKey;
    }
    if (options.hmacSignature) {
      headers['X-EWS-Signature'] = options.hmacSignature;
    }

    const req = http.request(
      {
        host: '127.0.0.1',
        port: PORT,
        method: options.method,
        path: options.path,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode || 500, body: parsed, headers: res.headers });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
};

const runAllTests = async () => {
  console.log('================================================================');
  console.log('  MEMULAI VERIFIKASI PENGUJIAN OTOMATIS BACKEND EWS REST API    ');
  console.log('================================================================\n');

  const server = app.listen(PORT);
  let passed = 0;
  let failed = 0;

  const assert = (desc: string, condition: boolean, extra?: string) => {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc} ${extra ? `-> ${extra}` : ''}`);
      failed++;
    }
  };

  try {
    // 1. Health Check
    const health = await request({ method: 'GET', path: '/health' });
    assert('1. Health check /health mengembalikan 200 UP', health.status === 200 && health.body.data.status === 'UP');

    // 2. Autentikasi Pengguna
    const loginMhs = await request({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { username: '26410105001', password: 'password123' },
    });
    assert('2a. Login Mahasiswa berhasil (200) & menerima JWT', loginMhs.status === 200 && !!loginMhs.body.data.accessToken);
    const mhsToken = loginMhs.body.data?.accessToken;
    const mhsRefreshToken = loginMhs.body.data?.refreshToken;

    const loginDoswal = await request({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { username: 'doswal.bagus', password: 'password123' },
    });
    assert('2b. Login Dosen Wali berhasil (200)', loginDoswal.status === 200);
    const doswalToken = loginDoswal.body.data?.accessToken;

    const loginKaprodi = await request({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { username: 'kaprodi.si', password: 'password123' },
    });
    assert('2c. Login Kaprodi berhasil (200)', loginKaprodi.status === 200);
    const kaprodiToken = loginKaprodi.body.data?.accessToken;

    const loginAdmin = await request({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { username: 'admin', password: 'password123' },
    });
    assert('2d. Login Admin berhasil (200)', loginAdmin.status === 200);
    const adminToken = loginAdmin.body.data?.accessToken;

    // 2e. Login gagal dan Rate Limit Lock 15 menit
    const wrongLogin = await request({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { username: '24410100017', password: 'wrong_password' },
    });
    assert('2e. Password salah ditolak 401', wrongLogin.status === 401);

    // 2f. Refresh Token
    const refreshRes = await request({
      method: 'POST',
      path: '/api/v1/auth/refresh',
      body: { refreshToken: mhsRefreshToken },
    });
    assert('2f. Refresh token berhasil menghasilkan access token baru', refreshRes.status === 200 && !!refreshRes.body.data.accessToken);

    // 2g. Auth Me
    const meRes = await request({
      method: 'GET',
      path: '/api/v1/auth/me',
      token: mhsToken,
    });
    assert('2g. GET /auth/me mengembalikan profil mahasiswa login', meRes.status === 200 && meRes.body.data.nim === '26410105001');

    // 3. Mahasiswa Personal Risk
    const meRiskRes = await request({
      method: 'GET',
      path: '/api/v1/students/me/risk',
      token: mhsToken,
    });
    assert(
      '3. Mahasiswa me/risk mengembalikan status risiko pribadi (HIJAU)',
      meRiskRes.status === 200 && meRiskRes.body.data.latestRisk?.status === 'HIJAU'
    );

    // 4. Penegakan Hak Akses & Scoping RBAC (BRL-13)
    const mhsAccessOther = await request({
      method: 'GET',
      path: '/api/v1/students/24410100007/risk',
      token: mhsToken,
    });
    assert('4a. Mahasiswa mengakses data mahasiswa lain ditolak 403 (BRL-13)', mhsAccessOther.status === 403);

    const doswalAdvisees = await request({
      method: 'GET',
      path: '/api/v1/advisees',
      token: doswalToken,
    });
    assert('4b. Dosen Wali mengambil daftar advisees berhasil (200)', doswalAdvisees.status === 200 && Array.isArray(doswalAdvisees.body.data));

    const doswalOwnAdvisee = await request({
      method: 'GET',
      path: '/api/v1/students/24410100007/risk',
      token: doswalToken,
    });
    assert('4c. Dosen Wali mengakses data mahasiswa bimbingannya diizinkan (200)', doswalOwnAdvisee.status === 200);

    const doswalOtherAdvisee = await request({
      method: 'GET',
      path: '/api/v1/students/24410100016/risk', // Bimbingan doswal.diana
      token: doswalToken,
    });
    assert('4d. Dosen Wali mengakses mahasiswa non-bimbingan ditolak 403 (BRL-13)', doswalOtherAdvisee.status === 403);

    // 5. Verifikasi Business Rules Risk Engine
    // 5a. BRL-04: Override Red Alert
    const redStudent = await request({
      method: 'GET',
      path: '/api/v1/students/24410100007/risk',
      token: adminToken,
    });
    assert(
      '5a. BRL-04 Override Red Alert (TA >= 2 sem & SSKM < ambang -> MERAH)',
      redStudent.body.data.latestRisk.status === 'MERAH' && redStudent.body.data.latestRisk.override_red === true
    );

    // 5b. BRL-09: Sisa masa studi <= 2 semester minimal Kuning
    const farrelRisk = await request({
      method: 'GET',
      path: '/api/v1/students/24410100016/risk',
      token: adminToken,
    });
    assert('5b. BRL-09 Sisa masa studi <= 2 semester minimal KUNING', farrelRisk.body.data.latestRisk.status === 'KUNING');

    // 5c. BRL-08: Tunggakan UKT memblokir sidang minimal Kuning
    const rafiRisk = await request({
      method: 'GET',
      path: '/api/v1/students/24410100017/risk',
      token: adminToken,
    });
    assert('5c. BRL-08 Tunggakan memblokir pendaftaran minimal KUNING', rafiRisk.body.data.latestRisk.status === 'KUNING');

    // 5d. BRL-14: Privasi Keuangan tanpa nominal Rupiah
    const financeData = redStudent.body.data.finance;
    assert(
      '5d. BRL-14 Respon status keuangan hanya memuat LUNAS/MENUNGGAK tanpa nominal rupiah',
      (financeData.status === 'LUNAS' || financeData.status === 'MENUNGGAK') && !('nominal' in financeData) && !('jumlah' in financeData)
    );

    // 6. Milestone TA & Bimbingan
    const milestoneRes = await request({
      method: 'GET',
      path: '/api/v1/students/24410100007/milestones',
      token: doswalToken,
    });
    assert(
      '6. Pelacakan milestone TA & deteksi bimbingan (syarat min 8)',
      milestoneRes.status === 200 && milestoneRes.body.data.bimbingan.syaratMinimal === 8
    );

    // 7. Pencatatan Konseling (Append-Only)
    const counselingRes = await request({
      method: 'POST',
      path: '/api/v1/students/24410100007/counseling',
      token: doswalToken,
      body: {
        tglKonseling: '2026-11-25',
        catatan: 'Mahasiswa terkendala bab 3 dan butuh asistensi penulisan skripsi.',
        tindakLanjut: 'Dijadwalkan bimbingan mingguan intensif tiap hari Selasa.',
      },
    });
    assert('7a. Pencatatan hasil konseling dosen berhasil (201 Created)', counselingRes.status === 201);

    // 7b. Verifikasi Trigger Append-Only BRL-16 pada counseling_log
    const konselingId = counselingRes.body.data?.konseling_id;
    let deleteTriggerBlocked = false;
    try {
      await query(`DELETE FROM counseling_log WHERE konseling_id = $1`, [konselingId]);
    } catch (err: any) {
      if (err.message && err.message.includes('Operasi DELETE tidak diizinkan pada tabel append-only ini')) {
        deleteTriggerBlocked = true;
      }
    }
    assert('7b. Trigger PostgreSQL memblokir DELETE pada counseling_log (BRL-16)', deleteTriggerBlocked);

    // 8. Action Plan
    const createPlanRes = await query(
      `INSERT INTO action_plan (risk_id, sumber, deskripsi, status, tgl_dibuat)
       VALUES (${redStudent.body.data.latestRisk.risk_id}, 'DOSEN', 'Selesaikan draf Bab 3 sebelum 10 Desember', 'BELUM', NOW())
       RETURNING plan_id`
    );
    const planId = createPlanRes.rows[0].plan_id;

    const patchPlanRes = await request({
      method: 'PATCH',
      path: `/api/v1/action-plans/${planId}`,
      token: mhsToken,
      body: { status: 'PROSES' },
    });
    assert('8. Pembaruan status action plan menjadi PROSES berhasil (200)', patchPlanRes.status === 200 && patchPlanRes.body.data.status === 'PROSES');

    // 9. Eskalasi Berjenjang (BRL-11)
    await query(`
      INSERT INTO escalation_log (risk_id, tingkat, nidn_tujuan, waktu_eskalasi, status_respons)
      VALUES (${redStudent.body.data.latestRisk.risk_id}, 'KAPRODI', '0701018001', NOW(), 'BELUM')
      RETURNING esc_id
    `);

    const escalationsRes = await request({
      method: 'GET',
      path: '/api/v1/escalations',
      token: kaprodiToken,
    });
    assert('9a. Kaprodi mengambil antrean eskalasi berhasil (200)', escalationsRes.status === 200 && escalationsRes.body.data.length > 0);

    const firstEscId = escalationsRes.body.data[0].esc_id;
    const patchEscRes = await request({
      method: 'PATCH',
      path: `/api/v1/escalations/${firstEscId}`,
      token: kaprodiToken,
      body: {
        statusRespons: 'DIRESPONS',
        catatanTindakLanjut: 'Kaprodi telah memanggil mahasiswa dan memberikan dispensasi perpanjangan semester terakhir.',
      },
    });
    assert('9b. Kaprodi menindaklanjuti eskalasi (status DIRESPONS) berhasil (200)', patchEscRes.status === 200);

    // 10. Analitik KTW & Ekspor
    const ktwRes = await request({
      method: 'GET',
      path: '/api/v1/analytics/ktw',
      token: kaprodiToken,
    });
    assert(
      '10a. Analitik KTW prodi berhasil diambil (rasio KTW potensial terhitung)',
      ktwRes.status === 200 && Array.isArray(ktwRes.body.data.prodiList)
    );

    const exportRes = await request({
      method: 'GET',
      path: '/api/v1/reports/export?format=pdf',
      token: kaprodiToken,
    });
    assert('10b. Ekspor laporan eksekutif PDF berhasil (200)', exportRes.status === 200 && exportRes.body.data.format === 'pdf');

    // 11. Konfigurasi Rule (Admin)
    const configRes = await request({
      method: 'GET',
      path: '/api/v1/config',
      token: adminToken,
    });
    assert('11a. Admin membaca konfigurasi parameter bobot & threshold (200)', configRes.status === 200 && configRes.body.data.length >= 15);

    const updateConfigRes = await request({
      method: 'PUT',
      path: '/api/v1/config',
      token: adminToken,
      body: {
        parameter: 'BOBOT_TA',
        nilai: 40.0,
      },
    });
    assert('11b. Admin memperbarui konfigurasi parameter berhasil (200)', updateConfigRes.status === 200);

    // 12. Trigger Manual Scan (Admin)
    const scanTriggerRes = await request({
      method: 'POST',
      path: '/api/v1/scans',
      token: adminToken,
      body: { jenis: 'ULANG' },
    });
    assert('12. Admin memicu pemindaian manual batch scan (202 Accepted)', scanTriggerRes.status === 202);

    // 13. Audit Log (Admin)
    const auditRes = await request({
      method: 'GET',
      path: '/api/v1/audit-logs?limit=10',
      token: adminToken,
    });
    assert('13. Admin membaca Audit Log append-only dengan paginasi (200)', auditRes.status === 200 && auditRes.body.data.length > 0);

    // 14. Integrasi Smart University
    const aggregateRes = await request({
      method: 'GET',
      path: '/api/v1/integration/analytics/aggregate',
      apiKey: env.INTEGRATION_API_KEY,
    });
    assert('14a. GET /integration/analytics/aggregate dengan API Key berhasil (200)', aggregateRes.status === 200);

    const atRiskCoursesRes = await request({
      method: 'GET',
      path: '/api/v1/integration/students/at-risk-courses',
      apiKey: env.INTEGRATION_API_KEY,
    });
    assert('14b. GET /integration/students/at-risk-courses untuk Smart Scheduling berhasil (200)', atRiskCoursesRes.status === 200);

    // 14c. Webhook AI Advisor dengan HMAC
    const webhookPayload = {
      riskId: Number(redStudent.body.data.latestRisk.risk_id),
      deskripsi: 'Saran AI Advisor: Ikuti klinik bimbingan skripsi mingguan dan tuntaskan sisa 30 poin SSKM.',
      tglTarget: '2026-12-15',
    };
    const signature = generateHmacSignature(JSON.stringify(webhookPayload));

    const aiWebhookRes = await request({
      method: 'POST',
      path: '/api/v1/integration/webhooks/ai-advisor',
      body: webhookPayload,
      hmacSignature: signature,
    });
    assert(
      '14c. Webhook inbound AI Advisor dengan signature HMAC-SHA256 valid diterima (200)',
      aiWebhookRes.status === 200,
      `Status: ${aiWebhookRes.status}, Body: ${JSON.stringify(aiWebhookRes.body)}`
    );

    const invalidWebhookRes = await request({
      method: 'POST',
      path: '/api/v1/integration/webhooks/ai-advisor',
      body: webhookPayload,
      hmacSignature: 'invalid_signature_hash_123',
    });
    assert('14d. Webhook inbound AI Advisor dengan signature HMAC tidak valid ditolak (401)', invalidWebhookRes.status === 401);

  } catch (testErr) {
    console.error('Fatal test error:', testErr);
    failed++;
  } finally {
    server.close();
    await pool.end();
  }

  console.log('\n================================================================');
  console.log(`  HASIL PENGUJIAN: ${passed} BERHASIL, ${failed} GAGAL`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
};

runAllTests();
