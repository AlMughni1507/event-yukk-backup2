import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Lock, Mail, ShieldCheck } from 'lucide-react';
import { authAPI } from '../../services/api';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = location.state?.email || '';

  const [email, setEmail] = useState(initialEmail);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const pageVariants = {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2, ease: 'easeIn' } },
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email || !resetToken || !newPassword || !confirmPassword) {
      setError('Semua field wajib diisi');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Password baru dan konfirmasi password tidak sama');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password baru minimal 6 karakter');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.resetPassword({
        email,
        resetToken,
        newPassword,
      });

      if (response && response.data && response.data.message) {
        setMessage(response.data.message);
      } else {
        setMessage('Password berhasil direset. Silakan login kembali.');
      }

      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      const backendMessage = err?.response?.data?.message;
      setError(backendMessage || err.message || 'Gagal mereset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-black relative overflow-hidden"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-purple-900/40 to-purple-800/20"></div>

      <div className="flex min-h-screen relative z-10 items-center justify-center px-4 sm:px-8">
        <button
          onClick={() => navigate('/login')}
          className="absolute top-6 left-6 text-white hover:text-pink-400 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Kembali ke Login</span>
        </button>

        <div className="w-full max-w-xl bg-white/10 backdrop-blur-md border border-pink-500/20 rounded-2xl p-8 sm:p-10 shadow-2xl">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center mr-3">
              <ShieldCheck className="w-7 h-7 text-pink-400" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Reset Password</h2>
              <p className="text-gray-300 text-sm">Masukkan kode yang dikirim ke email dan buat password baru</p>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-lg mb-4 bg-red-50 text-red-700 border border-red-200 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="p-4 rounded-lg mb-4 bg-green-50 text-green-700 border border-green-200 text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-200 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-300" />
                <input
                  type="email"
                  className="w-full pl-10 pr-3 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm"
                  placeholder="Email yang terdaftar"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-200 mb-1">Kode Reset (OTP)</label>
              <input
                type="text"
                className="w-full px-3 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm tracking-[0.4em] text-center"
                placeholder="6 digit kode"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value.replace(/[^0-9]/g, ''))}
                maxLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-200 mb-1">Password Baru</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-300" />
                <input
                  type="password"
                  className="w-full pl-10 pr-3 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm"
                  placeholder="Masukkan password baru"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-200 mb-1">Konfirmasi Password Baru</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-300" />
                <input
                  type="password"
                  className="w-full pl-10 pr-3 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm"
                  placeholder="Ulangi password baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Memproses...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
};

export default ResetPasswordPage;
