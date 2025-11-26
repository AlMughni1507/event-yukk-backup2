# 📧 Setup Gmail SMTP untuk Email OTP

## ⚠️ Masalah: "Invalid login: 535-5.7.8 Username and Password not accepted"

Error ini terjadi karena Gmail tidak menerima password biasa untuk aplikasi pihak ketiga. Anda **HARUS** menggunakan **App Password** (bukan password Gmail biasa).

---

## ✅ Solusi: Buat Gmail App Password

### Langkah 1: Aktifkan 2-Step Verification

1. Buka: https://myaccount.google.com/security
2. Scroll ke bagian **"2-Step Verification"**
3. Klik **"Get started"** atau **"Turn on"**
4. Ikuti instruksi untuk setup 2-Step Verification
   - Biasanya pakai nomor HP untuk verifikasi

### Langkah 2: Buat App Password

1. Setelah 2-Step Verification aktif, buka: https://myaccount.google.com/apppasswords
2. Jika diminta, login lagi
3. Di bagian **"Select app"**, pilih: **"Mail"**
4. Di bagian **"Select device"**, pilih: **"Other (Custom name)"**
5. Ketik nama: **"Event Yukk"** (atau nama apapun)
6. Klik **"Generate"**
7. Google akan menampilkan **16 karakter password** (contoh: `abcd efgh ijkl mnop`)
8. **COPY password tersebut** (tanpa spasi!)

### Langkah 3: Update config.env

Buka file `server/config.env` dan update:

```env
SMTP_USER=abdul.mughni845@gmail.com
SMTP_PASS=abcdefghijklmnop    # ← Paste App Password di sini (NO SPACES!)
```

**PENTING:**
- ✅ Gunakan App Password (16 karakter)
- ❌ JANGAN gunakan password Gmail biasa
- ❌ JANGAN ada spasi di password
- ✅ Pastikan 2-Step Verification sudah aktif

### Langkah 4: Test Email

Jalankan script test:

```bash
cd server
node test-email-smtp.js
```

Jika berhasil, Anda akan menerima email test di inbox.

---

## 🔍 Troubleshooting

### Masih error "Invalid login"?

1. **Cek apakah 2-Step Verification aktif:**
   - https://myaccount.google.com/security
   - Pastikan "2-Step Verification" status: **ON**

2. **Cek App Password:**
   - Pastikan tidak ada spasi di `SMTP_PASS`
   - Pastikan menggunakan App Password, bukan password biasa
   - Coba buat App Password baru

3. **Cek config.env:**
   ```env
   SMTP_USER=your-email@gmail.com    # Email Gmail Anda
   SMTP_PASS=your-16-char-app-password # App Password (no spaces!)
   ```

4. **Restart server:**
   ```bash
   # Stop server (Ctrl+C)
   # Start lagi
   cd server
   npm run dev
   ```

### Email tidak masuk?

1. Cek **Spam/Junk folder**
2. Cek apakah email tujuan benar
3. Cek log server untuk error message
4. Pastikan App Password masih valid (tidak dihapus di Google Account)

---

## 📝 Catatan

- App Password hanya bisa dibuat jika **2-Step Verification aktif**
- Satu App Password bisa digunakan untuk beberapa aplikasi
- Jika App Password dihapus, buat yang baru
- App Password berbeda dengan password Gmail biasa

---

## 🆘 Butuh Bantuan?

Jika masih error setelah mengikuti langkah di atas:

1. Cek log error di terminal
2. Pastikan semua langkah sudah dilakukan
3. Coba buat App Password baru
4. Pastikan email `SMTP_USER` benar


