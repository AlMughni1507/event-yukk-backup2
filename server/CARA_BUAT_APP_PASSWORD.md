# 🔑 Cara Buat App Password Gmail

## ✅ Status Anda Sekarang

Dari screenshot, **2-Step Verification sudah aktif** dengan:
- ✅ Nomor telepon: 0812-8829-5138
- ✅ Dialog Google (2 perangkat)
- ✅ Kode cadangan (10 kode tersedia)

**Tapi App Password belum dibuat!**

---

## 🎯 Langkah Membuat App Password

### **Cara 1: Langsung ke Halaman App Passwords**

1. **Buka link ini langsung:**
   ```
   https://myaccount.google.com/apppasswords
   ```

2. Jika diminta login, login dengan akun `abdul.mughni845@gmail.com`

3. Di halaman App Passwords, Anda akan melihat:
   - Dropdown "Pilih aplikasi" → pilih **"Mail"**
   - Dropdown "Pilih perangkat" → pilih **"Other (Custom name)"**
   - Ketik nama: **"Event Yukk"**
   - Klik **"Generate"** (Buat)

4. Google akan menampilkan **password 16 karakter** (contoh: `abcd efgh ijkl mnop`)

5. **COPY password tersebut** (tanpa spasi!)

6. Paste ke `server/config.env`:
   ```env
   SMTP_PASS=abcdefghijklmnop    # ← Paste di sini (NO SPACES!)
   ```

---

### **Cara 2: Dari Halaman 2-Step Verification**

1. Di halaman 2-Step Verification yang Anda buka sekarang
2. **Scroll ke bawah** atau cari link **"Kata sandi aplikasi"** atau **"App Passwords"**
3. Klik link tersebut
4. Ikuti langkah yang sama seperti Cara 1

---

## ⚠️ Catatan Penting

- **App Password berbeda** dari:
  - Password Gmail biasa ❌
  - Kode OTP 2-Step Verification ❌
  - Kode cadangan ❌

- **App Password khusus** untuk aplikasi seperti server Node.js ini ✅

- Password hanya muncul **sekali**, jadi **copy dulu** sebelum tutup halaman!

---

## 🧪 Setelah Update config.env

1. **Restart server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Test kirim email:**
   ```bash
   node test-otp-email.js
   ```

3. Jika berhasil, akan muncul:
   ```
   ✅ SUCCESS! OTP email sent successfully!
   📬 Check your inbox at: abdul.mughni845@gmail.com
   ```

---

## 🆘 Masih Tidak Bisa?

Jika link `https://myaccount.google.com/apppasswords` tidak bisa diakses atau tidak muncul opsi App Password:

1. Pastikan **2-Step Verification benar-benar aktif** (sudah ✅)
2. Coba akses dari browser lain atau mode incognito
3. Atau gunakan **Brevo** sebagai alternatif (lebih mudah, tidak perlu App Password)

---

## 📞 Link Penting

- **App Passwords:** https://myaccount.google.com/apppasswords
- **2-Step Verification:** https://myaccount.google.com/security
- **Security Settings:** https://myaccount.google.com/security



