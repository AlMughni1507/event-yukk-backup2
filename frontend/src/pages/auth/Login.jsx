import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, ArrowRight, Calendar, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { authAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Simple fade animation
  const pageVariants = {
    initial: { 
      opacity: 0,
      scale: 0.98
    },
    animate: { 
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.98,
      transition: {
        duration: 0.2,
        ease: "easeIn"
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // Clear any existing auth data first
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      console.log('🔍 Login attempt for email:', email);
      
      let response;
      
      // Check if this is an admin email and use appropriate endpoint
      if (email === 'abdul.mughni845@gmail.com' || email.includes('admin')) {
        console.log('🔍 Attempting admin login...');
        response = await authAPI.adminLogin({ email, password });
      } else {
        console.log('🔍 Attempting regular user login...');
        response = await authAPI.login({ email, password });
      }
      
      console.log('🔍 Login response:', response);
      
      // Check if response has the expected structure
      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }
      
      const { user, token } = response.data;
      
      if (!user || !token) {
        throw new Error('Invalid response from server - missing user or token');
      }
      
      if (!user.role) {
        throw new Error('User data is incomplete');
      }
      
      console.log('🔍 User role:', user.role);
      
      login(user, token);
      
      if (user.role === 'admin') {
        console.log('✅ Redirecting to admin dashboard...');
        setSuccess('Admin login successful! Redirecting to dashboard...');
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 1000);
      } else {
        console.log('✅ Redirecting to home page...');
        setSuccess('Login successful! Welcome back!');
        setTimeout(() => {
          navigate('/');
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setLoading(false); // Stop loading immediately on error
      setError(error.message || 'Invalid email or password');
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await authAPI.requestPasswordReset({ email: resetEmail });

      // Backend selalu mengembalikan success, tapi tidak mengungkap apakah email terdaftar
      if (response && response.data) {
        setSuccess('Kode reset password telah dikirim ke email (jika terdaftar).');

        // Arahkan user ke halaman reset password dengan membawa email
        setShowResetModal(false);
        const emailForReset = resetEmail;
        setResetEmail('');
        navigate('/reset-password', { state: { email: emailForReset } });
      }
    } catch (error) {
      const backendMessage = error?.response?.data?.message;
      setError(backendMessage || error.message || 'Failed to send password reset email');
    } finally {
      setResetLoading(false);
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
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-pink-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`
            }}
          ></div>
        ))}
      </div>

      {/* Gradient fade overlay for smooth color transition */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-purple-900/40 to-purple-800/20"></div>

      <div className="flex min-h-screen relative z-10">
        {/* Left Side - Hero Panel */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          {/* Gradient background with fade */}
          <div className="absolute inset-0 bg-gradient-to-br from-black via-purple-900 to-purple-800"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-900/30 to-transparent"></div>
          <div className="relative z-10 flex flex-col justify-center items-start px-16 py-12 text-white w-full">
            <div className="mb-12 flex items-center space-x-3 animate-fade-in-up">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Event Yukk</h1>
            </div>

            <div className="max-w-lg">
              <h1 className="text-5xl font-bold mb-6 text-white leading-tight animate-slide-in-left">
                Welcome
              </h1>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed animate-slide-in-right">
                Sign in to join our event and explore amazing experience!!!
              </p>
            </div>

            {/* Floating Animation Elements */}
            <div className="absolute top-20 right-20 w-4 h-4 bg-white/20 rounded-full animate-bounce" style={{animationDelay: '1s'}}></div>
            <div className="absolute bottom-32 right-32 w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{animationDelay: '3s'}}></div>
            <div className="absolute top-1/2 right-16 w-3 h-3 bg-white/15 rounded-full animate-bounce" style={{animationDelay: '5s'}}></div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-12 py-12 relative">
          <button
            onClick={() => navigate('/')}
            className="absolute top-6 left-6 text-white hover:text-pink-400 transition-colors flex items-center gap-2 font-poppins"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
          
          <div className="w-full max-w-xl bg-white/10 backdrop-blur-md border border-pink-500/20 rounded-2xl p-12 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bebas font-black text-white mb-2">
                SIGN IN
              </h2>
              <p className="text-gray-300 font-poppins">Welcome back to Event Yukk</p>
            </div>

            {error && (
              <div className="p-4 rounded-lg mb-6 bg-red-50 text-red-700 border border-red-200 animate-slide-in-left">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 rounded-lg mb-6 bg-green-50 text-green-700 border border-green-200 animate-slide-in-right">
                {success}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-pink-400" />
                  <input
                    type="email"
                    placeholder="Email"
                    required
                    className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-pink-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    required
                    className="w-full pl-12 pr-12 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-pink-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    className="mr-2 rounded border-pink-500 bg-white/10 text-pink-500 focus:ring-pink-500" 
                  />
                  <span className="text-gray-300 font-poppins">Remember me</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-pink-400 hover:text-pink-300 transition-colors font-poppins font-medium"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-poppins font-bold py-4 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="text-center mt-6">
              <p className="text-gray-300 text-sm font-poppins">
                Don't have an account? <span className="text-pink-400 cursor-pointer hover:text-pink-300 transition-colors font-semibold inline-flex items-center gap-1" onClick={() => navigate('/register', { state: { from: 'login' } })}>
                  Sign up <ArrowRight className="w-4 h-4" />
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 animate-zoom-in">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-black mb-2">Reset Password</h3>
              <p className="text-gray-600">Enter your email to receive a password reset link</p>
            </div>

            <form onSubmit={handlePasswordReset}>
              <div className="mb-6">
                <input
                  type="email"
                  placeholder="Enter your email"
                  required
                  className="w-full px-4 py-4 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetEmail('');
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 bg-black hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default LoginPage;
