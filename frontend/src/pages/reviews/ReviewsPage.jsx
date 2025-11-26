import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import Footer from '../../components/Footer';
import { Star, Send, ArrowLeft, Sparkles, TrendingUp, Award, MessageSquare, Quote } from 'lucide-react';
import { reviewsAPI, registrationsAPI, eventReviewsAPI } from '../../services/api';

const ReviewsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const toast = useToast();
  
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [mode, setMode] = useState('platform'); // 'platform' | 'event'
  const [userEvents, setUserEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  
  const [formData, setFormData] = useState({
    rating: 5,
    comment: '',
    full_name: user?.full_name || ''
  });

  // Inisialisasi mode & event dari navigation state (misal dari EventDetail)
  useEffect(() => {
    if (location.state) {
      const { mode: initialMode, eventId } = location.state;
      if (initialMode === 'event') {
        setMode('event');
        if (eventId) {
          setSelectedEventId(String(eventId));
        }
      }
    }
  }, [location.state]);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      toast.warning('Anda harus login terlebih dahulu untuk memberikan ulasan');
      navigate('/login');
      return;
    }

    fetchReviews();
    fetchUserEvents();
  }, [isLoading, isAuthenticated, user]);

  // Update form data when user changes
  useEffect(() => {
    if (user && !existingReview) {
      setFormData(prev => ({
        ...prev,
        full_name: user.full_name || prev.full_name || ''
      }));
    }
  }, [user, existingReview]);

  const fetchUserEvents = async () => {
    try {
      setEventsLoading(true);
      const response = await registrationsAPI.myRegistrations({ status: '' });
      const regs = response?.registrations || response?.data?.registrations || [];
      // Filter hanya event yang status registrasinya sudah approved/confirmed/attended
      const eligible = regs.filter((r) =>
        ['approved', 'confirmed', 'attended'].includes(r.status)
      );
      setUserEvents(eligible);
    } catch (error) {
      console.error('Error fetching user events for reviews:', error);
      setUserEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await reviewsAPI.getAll();
      
      // Backend returns: { success: true, data: { reviews: [...], pagination: {...} }, message: '...' }
      // API interceptor returns: response.data which is { reviews: [...], pagination: {...} }
      const allReviews = response?.reviews || response?.data?.reviews || (Array.isArray(response) ? response : []);
      setReviews(Array.isArray(allReviews) ? allReviews : []);
      
      // Check if user already has a review
      if (user && allReviews.length > 0) {
        const userReview = allReviews.find(r => r.user_id === user.id);
        if (userReview) {
          setExistingReview(userReview);
          setFormData({
            rating: userReview.rating,
            comment: userReview.comment,
            full_name: userReview.full_name || user.full_name || ''
          });
        } else {
          setExistingReview(null);
        }
      } else if (user && allReviews.length === 0) {
        setExistingReview(null);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
      setExistingReview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.full_name || formData.full_name.trim().length === 0) {
      toast.error('Nama lengkap wajib diisi!');
      return;
    }
    
    if (formData.comment.trim().length < 10) {
      toast.error('Ulasan minimal 10 karakter');
      return;
    }

    if (!user || !user.id) {
      toast.error('Anda harus login untuk memberikan ulasan');
      navigate('/login');
      return;
    }

    // Mode ulasan event: user harus memilih event terlebih dahulu
    if (mode === 'event') {
      if (!selectedEventId) {
        toast.error('Silakan pilih event yang ingin Anda ulas');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'platform') {
        const payload = {
          rating: formData.rating,
          comment: formData.comment.trim(),
          full_name: formData.full_name.trim(),
          user_id: user.id
        };

        let response;
        if (existingReview) {
          // Update existing review
          response = await reviewsAPI.update(existingReview.id, payload);
          toast.success('Ulasan berhasil diperbarui! Terima kasih atas feedback Anda');
          setExistingReview(null); // Reset to allow refresh
        } else {
          // Create new review
          response = await reviewsAPI.create(payload);
          toast.success('Ulasan berhasil dikirim! Ulasan akan tampil setelah disetujui admin.');
        }
        
        // Reset form
        setFormData({
          rating: 5,
          comment: '',
          full_name: user?.full_name || ''
        });
        
        // Refresh reviews after a short delay to ensure backend has processed
        setTimeout(async () => {
          await fetchReviews();
        }, 500);
        setIsEditing(false);
      } else {
        // Mode ulasan event: kirim ke eventReviewsAPI
        const payload = {
          rating: formData.rating,
          comment: formData.comment.trim(),
        };

        await eventReviewsAPI.submit(selectedEventId, payload);
        toast.success('Ulasan event berhasil disimpan!');

        // Reset form tapi tetap biarkan event terpilih
        setFormData({
          rating: 5,
          comment: '',
          full_name: user?.full_name || ''
        });
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      const raw = error?.data || error;
      const errorMessage = raw?.message || raw?.error || raw?.msg || 'Gagal mengirim ulasan. Silakan coba lagi';
      
      // Check if user already submitted a platform review
      if (mode === 'platform' && (errorMessage.toLowerCase().includes('already') || errorMessage.toLowerCase().includes('sudah'))) {
        toast.error('Anda sudah pernah memberikan ulasan. Silakan edit ulasan yang sudah ada.');
        await fetchReviews();
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-5 h-5 ${
              i < rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    percentage: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header with Animated Background */}
      <section className="relative bg-gradient-to-br from-purple-600 via-pink-600 to-rose-600 py-20 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-300/15 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
          
          {/* Floating particles */}
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white/20 animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${3 + Math.random() * 5}px`,
                height: `${3 + Math.random() * 5}px`,
                animation: `float ${4 + Math.random() * 3}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            ></div>
          ))}
          
          {/* Rotating gradient orbs */}
          {[...Array(4)].map((_, i) => (
            <div
              key={`orb-${i}`}
              className="absolute rounded-full blur-3xl animate-rotate"
              style={{
                left: `${20 + i * 20}%`,
                top: `${20 + i * 15}%`,
                width: `${150 + i * 80}px`,
                height: `${150 + i * 80}px`,
                background: `radial-gradient(circle, rgba(147,51,234,${0.2 + i * 0.1}), rgba(236,72,153,${0.15 + i * 0.05}))`,
                animation: `rotate ${20 + i * 10}s linear infinite`,
                animationDelay: `${i * 3}s`
              }}
            ></div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 mb-8 text-white/90 hover:text-white transition-all hover:gap-3 duration-300 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-poppins font-semibold">Kembali ke Home</span>
          </button>
          
          <div className="text-center mb-12">
            <div className="inline-block mb-4">
              <span className="bg-white/20 backdrop-blur-sm text-white px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                YOUR VOICE MATTERS
              </span>
            </div>
            <h1 className="font-bebas text-6xl md:text-8xl font-black mb-6 text-white drop-shadow-2xl">
              SHARE YOUR EXPERIENCE
            </h1>
            <p className="font-poppins text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Your feedback helps us create better events for everyone. Share your story!
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="text-center">
                <Award className="w-10 h-10 text-yellow-300 mx-auto mb-3" />
                <div className="text-4xl font-bebas font-black text-white mb-1">{avgRating}</div>
                <p className="text-white/80 font-poppins font-semibold">Average Rating</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="text-center">
                <MessageSquare className="w-10 h-10 text-blue-300 mx-auto mb-3" />
                <div className="text-4xl font-bebas font-black text-white mb-1">{reviews.length}</div>
                <p className="text-white/80 font-poppins font-semibold">Total Reviews</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="text-center">
                <TrendingUp className="w-10 h-10 text-green-300 mx-auto mb-3" />
                <div className="text-4xl font-bebas font-black text-white mb-1">98%</div>
                <p className="text-white/80 font-poppins font-semibold">Satisfaction</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Form */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <h2 className="font-bebas text-3xl text-gray-900">Tulis Ulasan Anda</h2>
                <div className="inline-flex rounded-full bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => setMode('platform')}
                    className={`px-4 py-1.5 text-sm font-poppins rounded-full transition-all ${
                      mode === 'platform'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-white'
                    }`}
                  >
                    Ulasan Platform
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('event')}
                    className={`px-4 py-1.5 text-sm font-poppins rounded-full transition-all ${
                      mode === 'event'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-white'
                    }`}
                  >
                    Ulasan Event
                  </button>
                </div>
              </div>
              
              {/* Existing Review Notice */}
              {existingReview && (
                <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-blue-900">Anda sudah memberikan ulasan</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Anda dapat mengedit ulasan Anda di bawah ini. Perubahan akan langsung tersimpan.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {mode === 'event' && (
                <div className="mb-6 p-4 bg-purple-50 border-l-4 border-purple-500 rounded-lg">
                  <p className="text-sm text-purple-900 font-poppins font-semibold mb-2">
                    Ulasan Event yang Pernah Anda Ikuti
                  </p>
                  <p className="text-xs text-purple-800 font-poppins mb-3">
                    Pilih event yang pernah Anda ikuti, kemudian berikan rating dan komentar.
                  </p>
                  <div className="mt-2">
                    <label className="block text-xs font-poppins font-semibold text-gray-700 mb-1">
                      Pilih Event
                    </label>
                    <select
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-poppins text-sm bg-white"
                      value={selectedEventId}
                      onChange={(e) => setSelectedEventId(e.target.value)}
                      disabled={eventsLoading || userEvents.length === 0}
                    >
                      <option value="">
                        {eventsLoading
                          ? 'Memuat event...'
                          : userEvents.length === 0
                          ? 'Belum ada event yang bisa diulas'
                          : 'Pilih event yang ingin Anda ulas'}
                      </option>
                      {userEvents.map((reg) => (
                        <option key={reg.id} value={reg.event_id}>
                          {reg.event_title || `Event #${reg.event_id}`} - {reg.status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block font-poppins font-semibold text-gray-700 mb-2">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-poppins"
                    required
                  />
                </div>

                {/* Rating */}
                <div>
                  <label className="block font-poppins font-semibold text-gray-700 mb-2">
                    Rating
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({ ...formData, rating: star })}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-10 h-10 ${
                            star <= formData.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-2 font-poppins">
                    {formData.rating === 5 && '⭐ Luar Biasa!'}
                    {formData.rating === 4 && '😊 Bagus'}
                    {formData.rating === 3 && '👍 Cukup Baik'}
                    {formData.rating === 2 && '😐 Perlu Perbaikan'}
                    {formData.rating === 1 && '😞 Kurang Memuaskan'}
                  </p>
                </div>

                {/* Comment */}
                <div>
                  <label className="block font-poppins font-semibold text-gray-700 mb-2">
                    Ulasan Anda
                  </label>
                  <textarea
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    rows="6"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-poppins resize-none"
                    placeholder="Ceritakan pengalaman Anda menggunakan Event Yukk..."
                    required
                    minLength="10"
                  />
                  <p className="text-sm text-gray-500 mt-1 font-poppins">
                    Minimal 10 karakter ({formData.comment.length}/10)
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-poppins font-bold py-4 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Mengirim...</span>
                    </>
                  ) : existingReview ? (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Perbarui Ulasan</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Kirim Ulasan</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Recent Reviews & Rating Distribution */}
            <div>
              <div className="mb-8">
                <h2 className="font-bebas text-3xl text-gray-900 mb-6 flex items-center gap-2">
                  <MessageSquare className="w-7 h-7 text-purple-600" />
                  RATING BREAKDOWN
                </h2>
                
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                  {ratingDistribution.map(({ star, count, percentage }) => (
                    <div key={star} className="flex items-center gap-4 mb-3 last:mb-0">
                      <div className="flex items-center gap-1 w-20">
                        <span className="font-bold text-gray-900">{star}</span>
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="font-semibold text-gray-700 w-12 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <h2 className="font-bebas text-3xl text-gray-900 mb-6">ULASAN TERBARU</h2>
              
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 border border-gray-200 animate-pulse">
                      <div className="flex items-center mb-4">
                        <div className="w-14 h-14 bg-gray-200 rounded-full mr-4"></div>
                        <div className="flex-1">
                          <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-16 text-center border border-gray-200">
                  <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Star className="w-10 h-10 text-yellow-400" />
                  </div>
                  <h3 className="font-bebas text-2xl text-gray-900 mb-2">BELUM ADA ULASAN</h3>
                  <p className="font-poppins text-gray-600">Jadilah yang pertama memberikan ulasan!</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                  {reviews.slice(0, 20).map((review, index) => {
                    const gradients = [
                      'from-purple-500 to-pink-500',
                      'from-blue-500 to-cyan-500',
                      'from-pink-500 to-rose-500',
                      'from-green-500 to-emerald-500',
                      'from-orange-500 to-amber-500',
                    ];
                    return (
                      <div key={review.id} className="group bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="relative">
                            <img
                              src={`https://i.pravatar.cc/150?u=${review.user_id || review.id}`}
                              alt={review.full_name}
                              className="w-14 h-14 rounded-full border-2 border-gray-200 group-hover:border-purple-300 transition-colors"
                            />
                            <div className={`absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r ${gradients[index % gradients.length]} rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg`}>
                              {review.rating}
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-poppins font-bold text-lg text-gray-900 mb-1">
                              {review.full_name || review.user_name}
                            </h4>
                            <div className="flex items-center gap-3">
                              {renderStars(review.rating)}
                              <span className="text-sm text-gray-500">
                                {new Date(review.created_at).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="relative">
                          <Quote className="absolute -top-2 -left-2 w-8 h-8 text-purple-200" />
                          <p className="font-poppins text-gray-700 leading-relaxed pl-6 italic">
                            "{review.comment}"
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Custom Scrollbar Styles & Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Poppins:wght@300;400;600;700;900&display=swap');
        
        .font-bebas { font-family: 'Bebas Neue', cursive; }
        .font-poppins { font-family: 'Poppins', sans-serif; }
        
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) translateX(0px); 
            opacity: 0.8;
          }
          25% { 
            transform: translateY(-15px) translateX(5px); 
            opacity: 1;
          }
          50% { 
            transform: translateY(-25px) translateX(-5px); 
            opacity: 0.9;
          }
          75% { 
            transform: translateY(-10px) translateX(3px); 
            opacity: 1;
          }
        }
        
        @keyframes rotate {
          0% { 
            transform: rotate(0deg) scale(1); 
            opacity: 0.3;
          }
          50% { 
            transform: rotate(180deg) scale(1.1); 
            opacity: 0.5;
          }
          100% { 
            transform: rotate(360deg) scale(1); 
            opacity: 0.3;
          }
        }
        
        @keyframes pulse {
          0%, 100% { 
            opacity: 0.4;
            transform: scale(1);
          }
          50% { 
            opacity: 0.6;
            transform: scale(1.05);
          }
        }
        
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #9333ea, #ec4899);
          border-radius: 10px;
          transition: background 0.3s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #7e22ce, #db2777);
        }
        
        /* Enhanced animations for header elements */
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        
        .animate-rotate {
          animation: rotate 20s linear infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default ReviewsPage;
