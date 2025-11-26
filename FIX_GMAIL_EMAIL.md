# 🔧 Fix Gmail Email - Step by Step

## ❌ Masalah Saat Ini

Error: `535-5.7.8 Username and Password not accepted`

Ini berarti App Password Gmail tidak valid atau belum dibuat dengan benar.

---

## ✅ Solusi: Buat Gmail App Password Baru

### **LANGKAH 1: Aktifkan 2-Step Verification**

1. Buka browser, login ke Gmail
2. Buka: **https://myaccount.google.com/security**
3. Scroll ke bagian **"How you sign in to Google"**
4. Cari **"2-Step Verification"**
5. Klik **"Get started"** atau **"Turn on"**
6. Ikuti instruksi:
   - Masukkan password Gmail
   - Pilih metode verifikasi (biasanya nomor HP)
   - Masukkan kode verifikasi yang dikirim
   - Klik **"Turn on"**

✅ **Pastikan status "2-Step Verification" menjadi ON**

---

### **LANGKAH 2: Buat App Password**

1. Buka: **https://myaccount.google.com/apppasswords**
   - Jika diminta login, login dengan akun Gmail Anda
   
2. Jika muncul pesan "App passwords aren't available for your account":
   - Pastikan 2-Step Verification sudah **ON** (kembali ke Langkah 1)
   - Tunggu beberapa menit setelah mengaktifkan 2-Step Verification

3. Di halaman App Passwords:
   - **"Select app"**: Pilih **"Mail"**
   - **"Select device"**: Pilih **"Other (Custom name)"**
   - Ketik nama: **"Event Yukk"** (atau nama apapun)
   - Klik **"Generate"**

4. Google akan menampilkan **16 karakter password**:
   ```
   Contoh: abcd efgh ijkl mnop
   ```
   
5. **COPY password tersebut** (bisa dengan spasi atau tanpa spasi, nanti kita hapus spasi)

---

### **LANGKAH 3: Update config.env**

1. Buka file: `server/config.env`

2. Cari baris:
   ```env
   SMTP_PASS=vagkgkjjhtibwlbx
   ```

3. Ganti dengan App Password baru yang baru saja dibuat:
   ```env
   SMTP_PASS=abcdefghijklmnop
   ```
   
   **PENTING:**
   - ✅ Hapus semua spasi dari password
   - ✅ Pastikan panjangnya 16 karakter
   - ✅ Jangan ada spasi di awal atau akhir

4. Simpan file (`Ctrl+S`)

---

### **LANGKAH 4: Restart Server**

1. Di terminal yang menjalankan server, tekan **`Ctrl+C`** untuk stop
2. Start lagi:
   ```bash
   cd server
   npm run dev
   ```

3. Cek log di terminal, harusnya muncul:
   ```
   📧 EmailService Configuration:
      Brevo API : ❌ Not configured
      SMTP      : ✅ Configured
      Sender    : Event Yukk Platform <abdul.mughni845@gmail.com>
   📧 SMTP transporter initialized
   ```

---

### **LANGKAH 5: Test Email**

Jalankan script test:

```bash
cd server
node test-email-smtp.js
```

Atau test dengan register user baru di frontend.

---

## 🔍 Troubleshooting

### Masih error "Invalid login"?

**Cek 1: Apakah 2-Step Verification aktif?**
- Buka: https://myaccount.google.com/security
- Pastikan "2-Step Verification" status: **ON** (hijau)
- Jika OFF, aktifkan dulu (Langkah 1)

**Cek 2: Apakah App Password benar?**
- Pastikan panjangnya 16 karakter (tanpa spasi)
- Pastikan tidak ada typo
- Coba buat App Password baru lagi

**Cek 3: Apakah config.env sudah diupdate?**
- Buka `server/config.env`
- Pastikan `SMTP_PASS` berisi 16 karakter (tanpa spasi)
- Pastikan tidak ada tanda kutip (`"` atau `'`)

**Cek 4: Apakah server sudah di-restart?**
- Stop server (`Ctrl+C`)
- Start lagi (`npm run dev`)

---

### App Password tidak muncul di Google?

Jika di https://myaccount.google.com/apppasswords muncul pesan:
> "App passwords aren't available for your account"

**Solusi:**
1. Pastikan 2-Step Verification sudah **ON**
2. Tunggu 5-10 menit setelah mengaktifkan 2-Step Verification
3. Refresh halaman App Passwords
4. Jika masih tidak muncul, coba logout dan login lagi ke Google Account

---

### Email tidak masuk setelah berhasil?

1. **Cek Spam/Junk folder** di Gmail
2. **Cek email tujuan** - pastikan email yang didaftarkan benar
3. **Cek log server** - pastikan tidak ada error
4. **Tunggu 1-2 menit** - email kadang delay

---

## 📝 Checklist

Sebelum test, pastikan semua sudah dicek:

- [ ] 2-Step Verification **ON** di Google Account
- [ ] App Password sudah dibuat (16 karakter)
- [ ] `SMTP_PASS` di `config.env` sudah diupdate (tanpa spasi)
- [ ] Server sudah di-restart
- [ ] Log server menunjukkan "SMTP transporter initialized"

---

## 🆘 Masih Error?

Jika setelah mengikuti semua langkah masih error:

1. **Cek log error** di terminal - copy error message lengkap
2. **Cek apakah email Gmail aktif** - coba login ke Gmail di browser
3. **Coba buat App Password baru** - hapus yang lama, buat yang baru
4. **Pastikan tidak ada firewall** yang block SMTP port 587

---

## 💡 Alternatif: Gunakan Brevo (Lebih Mudah)

Jika Gmail masih bermasalah, bisa pakai **Brevo** (gratis untuk development):

1. Daftar di: https://www.brevo.com/
2. Verifikasi email
3. Buat API Key di dashboard
4. Update `server/config.env`:
   ```env
   BREVO_API_KEY=your-api-key-here
   BREVO_SENDER_EMAIL=your-verified-email@domain.com
   BREVO_SENDER_NAME=Event Yukk Platform
   ```
5. Restart server

Brevo lebih mudah karena tidak perlu setup App Password.

