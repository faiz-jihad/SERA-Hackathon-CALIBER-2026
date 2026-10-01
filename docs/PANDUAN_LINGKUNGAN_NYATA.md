# PANDUAN DEPLOYMENT LINGKUNGAN NYATA (PRODUCTION RUNBOOK)
## SERA — System for Equipment Reliability Assessment

Dokumen ini adalah panduan teknis operasional bagi **Plant Reliability Engineer**, **OT/IT Specialist**, dan **System Administrator** untuk menerapkan SERA pada lingkungan operasional industri riil (on-premise pabrik atau cloud VPC terisolasi).

---

## 1. Arsitektur Jaringan Industri (Purdue Model Level 3/4)

Dalam standar arsitektur otomasi industri (ISA-95 / Purdue Enterprise Reference Architecture):

```
[Level 0/1: Sensor Fisik & Transmiter]
   (Akselerometer getaran, RTD temperatur, laser offset)
               │
               ▼
[Level 2: PLC / DCS / SCADA / Edge Gateway]
   (Yokogawa / Emerson / Honeywell / Siemens / Advantech)
               │ (OPC-UA / Modbus TCP / MQTT)
               ▼
[Level 3: Manufacturing Operations & Reliability LAN]
   ┌────────────────────────────────────────────────────────┐
   │ SERA RELIABILITY WORKSTATION / DOCKER SERVER           │
   │                                                        │
   │  ┌────────────────┐     ┌──────────────┐               │
   │  │ Nginx (Port 80)│ ──> │ FastAPI (8000│               │
   │  │ Frontend SPA   │     │ Engine Aturan│               │
   │  └────────────────┘     └──────┬───────┘               │
   │                                │                       │
   │                         ┌──────▼───────┐               │
   │                         │ PostgreSQL   │               │
   │                         │ (Port 5432)  │               │
   │                         └──────────────┘               │
   └────────────────────────────────────────────────────────┘
               │ (Akses Web Browser)
               ▼
[Level 4: Business & Engineering Workstation]
   (Engineer, Teknisi, & Manager membuka dashboard via intranet)
```

### Keamanan & Air-Gapped Ready (Tanpa Internet)
- **100% Offline Functional**: Seluruh engine inferensi getaran (ISO 10816-3), dekomposisi FFT spektral, rule engine 4P & 4M, dan generator Work Order berjalan **100% lokal** tanpa ketergantungan koneksi internet eksternal.
- **Data Privacy**: Data kondisi mesin dan rahasia pabrik tidak pernah dikirim ke server luar.

---

## 2. Pilihan Deployment di Lingkungan Pabrik

### Opsi A: Menggunakan Docker Compose (Sangat Direkomendasikan)
Cocok untuk server Linux (RHEL/Ubuntu) atau Windows Server dengan Docker Engine.

1. Salin folder proyek ke server pabrik:
   ```bash
   cd /opt/sera-caliber/sera
   ```
2. Salin template konfigurasi:
   ```bash
   cp .env.example .env
   ```
3. Sesuaikan alamat IP server pada `.env` (parameter `ALLOWED_ORIGINS`).
4. Jalankan seluruh stack (Database Postgres + Backend + Nginx):
   ```bash
   docker compose up -d --build
   ```
5. Akses sistem di browser:
   - **Dashboard**: `http://<IP-SERVER>` (Port 80 atau Port 3000)
   - **API Docs**: `http://<IP-SERVER>:8000/docs`
   - **Health Endpoint**: `http://<IP-SERVER>:8000/health`

---

### Opsi B: Standalone Windows Server / Workstation (Tanpa Docker)
Cocok jika di workstation engineering pabrik tidak diizinkan memasang Docker.

1. Buka folder `sera`:
   ```cmd
   cd "D:\Sera-Hackathon CALIBER 2026\sera"
   ```
2. Jalankan skrip produksi:
   ```cmd
   start-prod.bat
   ```
3. Skrip otomatis memverifikasi dependensi Python, membangun bundle frontend Nginx/Vite yang dioptimalkan, dan menjalankan API service dengan 4 multi-workers.

---

### Opsi C: Linux Systemd Service
Untuk server Linux yang ingin SERA otomatis berjalan setiap kali server dinyalakan (*auto-start on boot*):

Buat file `/etc/systemd/system/sera-backend.service`:
```ini
[Unit]
Description=SERA Reliability Assessment Backend API
After=network.target postgresql.service

[Service]
Type=simple
User=sera
WorkingDirectory=/opt/sera/sera/backend
Environment="DATABASE_URL=postgresql://sera_user:sera_pass@localhost:5432/sera_db"
Environment="SERA_ENV=production"
ExecStart=/opt/sera/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
Aktifkan service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now sera-backend
```

---

## 3. Cara Mengalirkan Data Nyata Pabrik ke SERA

SERA menyediakan 3 kanal integrasi data nyata:

### Kanal 1: REST API Live Telemetry (IoT / SCADA Stream)
Setiap kali sensor membaca metrik baru di DCS/PLC, Edge Gateway (seperti Node-RED, Kepware IoT Gateway, atau Python collector) dapat mengirim data via HTTP POST:

- **Endpoint**: `POST http://<IP-SERVER>:8000/api/ingestion/telemetry`
- **Headers**: `Content-Type: application/json`
- **Payload JSON**:
```json
{
  "equipment_id": "BL-5702",
  "timestamp": "2026-09-30T10:00:00",
  "vibration": 11.22,
  "harmonic_2x": 5.10,
  "coupling_offset": 0.306,
  "bearing_temperature": 82.5,
  "production_rate": 38.0,
  "motor_current": 142.0
}
```

**Respon Otomatis Sistem**:
- Menyimpan fakta telemetri ke database.
- Memeriksa batas alarm & trip secara deterministik (*Zero delay*).
- Memperbarui status equipment menjadi `NORMAL`, `WARNING`, `ALARM`, atau `TRIP`.

#### Contoh Skrip Pengirim Otomatis (Python Edge Collector):
```python
import time
import requests

API_URL = "http://192.168.1.50:8000/api/ingestion/telemetry"

while True:
    # Membaca data dari PLC/Modbus/OPC-UA lokal
    telemetry = {
        "equipment_id": "BL-5702",
        "vibration": 11.22,
        "harmonic_2x": 5.10,
        "coupling_offset": 0.306,
        "bearing_temperature": 82.5
    }
    try:
        res = requests.post(API_URL, json=telemetry, timeout=3)
        print("Status:", res.json())
    except Exception as e:
        print("Error sending telemetry:", e)
    
    time.sleep(300)  # Interval 5 menit
```

---

### Kanal 2: Upload File Spreadsheet Berkala (.xlsx / .xls)
Jika tim vibration monitoring mengambil data mingguan menggunakan vibration data collector portable (misal CSI 2140 atau SKF Microlog):
1. Buka menu **Data Ingestion** (`/ingestion`) di web UI.
2. Unggah file Excel lembar hasil monitoring mingguan.
3. SERA secara otomatis memetakan kolom getaran, temperatur, offset, dan mengimpor riwayatnya tanpa perlu re-entry manual.

---

### Kanal 3: Sinkronisasi Langsung ke Database Historian (OSIsoft PI / AspenTech IP.21)
SERA dapat disambungkan langsung ke SQL staging database atau Postgres read-replica yang mengekstraksi data berkala dari OSIsoft PI Web API atau OPC HDA.

---

## 4. Monitoring Kesehatan Sistem (Healthcheck & Observability)

Untuk tim IT/OT yang menggunakan tools pemantauan jaringan pabrik (Zabbix, Nagios, PRTG, Grafana):

- **Health URL**: `http://<IP-SERVER>:8000/health`
- **Output JSON**:
```json
{
  "status": "ok",
  "database": "healthy",
  "environment": "production",
  "version": "1.0.0"
}
```

Jika database down atau kapasitas disk penuh, respon berubah menjadi `"status": "degraded"` dengan kode peringatan otomatis.

---

## 5. Ringkasan Kesiapan Produksi

| Aspek | Status | Deskripsi |
|---|---|---|
| **Containerization** | ✅ Siap | `docker-compose.yml` lengkap (PostgreSQL 16, FastAPI 4 workers, Nginx SPA). |
| **Kemandirian Jaringan** | ✅ Siap | 100% dapat berjalan offline tanpa koneksi internet (air-gapped LAN). |
| **Auto-Seeding** | ✅ Siap | Database otomatis mengisi data baseline resmi pada pertama kali dijalankan. |
| **Live Ingestion API** | ✅ Siap | Endpoint `/api/ingestion/telemetry` siap menerima data sensor SCADA/PLC. |
| **Security Headers** | ✅ Siap | Nginx dilengkapi `X-Frame-Options`, `X-Content-Type-Options`, & CORS terkontrol. |
| **Pemisahan Peran (RBAC)**| ✅ Siap | Login Lead Engineer, Maintenance Tech, Plant Manager, dan Data Engineer. |
