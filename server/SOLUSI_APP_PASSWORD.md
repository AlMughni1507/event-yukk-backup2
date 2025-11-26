# 🔧 Solusi Error 535 - App Password Tidak Valid

## ❌ Masalah

Error: `535-5.7.8 Username and Password not accepted`

Ini berarti **App Password yang digunakan tidak valid**.

---

## ✅ Solusi: Buat App Password Baru

### Langkah 1: Pastikan Login dengan Account yang Benar

1. Buka: https://myaccount.google.com
2. **Pastikan login sebagai:** `al.mughni845@gmail.com`
3. Bukan `abdul.mughni845@gmail.com` atau account lain!

### Langkah 2: Hapus App Password Lama (Jika Ada)

1. Buka: https://myaccount.google.com/apppasswords
2. Jika ada App Password lama dengan nama "Event Yukk", **hapus dulu**
3. Klik ikon sampah/delete di sebelah App Password tersebut

### Langkah 3: Buat App Password Baru

1. Di halaman App Passwords, klik **"Pilih aplikasi"** → pilih **"Mail"**
2. Klik **"Pilih perangkat"** → pilih **"Other (Custom name)"**
3. Ketik nama: **"Event Yukk"**
4. Klik **"Generate"** atau **"Buat"**

### Langkah 4: Copy App Password dengan Hati-Hati

1. Google akan menampilkan password 16 karakter (contoh: `abcd efgh ijkl mnop`)
2. **COPY dengan teliti** - jangan sampai ada typo!
3. **Hapus semua spasi** saat paste ke config.env

### Langkah 5: Update config.env

1. Buka: `server/config.env`
2. Cari baris: `SMTP_PASS=ntsubmikawdpmvny`
3. Ganti dengan App Password baru (tanpa spasi):

```env
SMTP_PASS=abcdefghijklmnop    # ← Paste App Password baru di sini
```

**Contoh:**
- Jika Google kasih: `abcd efgh ijkl mnop`
- Tulis di config.env: `SMTP_PASS=abcdefghijklmnop` (tanpa spasi!)

### Langkah 6: Restart Server

**PENTING:** Server HARUS di-restart setelah update config.env!

1. Stop server (tekan `Ctrl+C` di terminal)
2. Start lagi:
   ```bash
   cd server
   npm run dev
   ```

### Langkah 7: Test Email

```bash
cd server
node test-smtp-connection.js
```

Jika berhasil, akan muncul:
```
✅ SMTP connection verified successfully!
✅ Email sent successfully!
📬 Check your inbox at: al.mughni845@gmail.com
```

---

## ⚠️ Checklist

Sebelum test lagi, pastikan:

- [ ] Login sebagai `al.mughni845@gmail.com` (bukan account lain)
- [ ] 2-Step Verification sudah aktif
- [ ] App Password dibuat untuk account `al.mughni845@gmail.com`
- [ ] App Password di-copy dengan benar (tidak ada typo)
- [ ] Tidak ada spasi di SMTP_PASS di config.env
- [ ] Server sudah di-restart setelah update config.env
- [ ] SMTP_USER di config.env = `al.mughni845@gmail.com`

---

## 🆘 Masih Error?

Jika masih error setelah semua langkah di atas:

### Opsi 1: Coba Account Gmail Lain

Jika ada Gmail lain yang 2-Step Verification-nya sudah aktif, coba pakai account itu.

### Opsi 2: Gunakan Brevo (Lebih Mudah!)

Brevo tidak perlu App Password dan lebih mudah setup:

1. Daftar gratis: https://www.brevo.com/
2. Verifikasi email Anda
3. Buat API Key di dashboard
4. Update `server/config.env`:

```env
BREVO_API_KEY=your-api-key-here
BREVO_SENDER_EMAIL=your-verified-email@domain.com
BREVO_SENDER_NAME=Event Yukk Platform
```

5. Restart server

Brevo lebih reliable dan tidak perlu ribet dengan App Password!

---

## 📞 Link Penting

- **App Passwords:** https://myaccount.google.com/apppasswords
- **2-Step Verification:** https://myaccount.google.com/security
- **Security Settings:** https://myaccount.google.com/security



