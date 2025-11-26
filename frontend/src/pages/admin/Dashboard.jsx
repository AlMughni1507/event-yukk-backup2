import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Ticket, BarChart3, FolderPlus, ClipboardList, TrendingUp, Sparkles, Activity, LayoutList } from 'lucide-react';
import { adminAPI, categoriesAPI, analyticsAPI } from '../../services/api';
import BarChart from '../../components/charts/BarChart';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalUsers: 0,
    totalRegistrations: 0,
    totalCategories: 0,
    recentEvents: [],
    recentRegistrations: []
  });
  const [chartsData, setChartsData] = useState({
    monthlyEvents: [],
    monthlyParticipants: [],
    topEvents: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchDashboardData();
    fetchChartsData();
  }, []);

  useEffect(() => {
    fetchChartsData();
  }, [selectedYear]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      
      // Fetch data with individual error handling for each API call
      let eventsRes, usersRes, registrationsRes, categoriesRes;
      let eventsError, usersError, registrationsError, categoriesError;
      
      try {
        eventsRes = await adminAPI.getAllEvents({ limit: 1000 });
      } catch (err) {
        console.error('Error fetching events:', err);
        eventsError = err.message;
        eventsRes = { data: { events: [], pagination: { total: 0 } } };
      }
      
      try {
        usersRes = await adminAPI.getAllUsers({ limit: 10000 });
      } catch (err) {
        console.error('Error fetching users:', err);
        usersError = err.message;
        usersRes = { data: { users: [], pagination: { total: 0 } } };
      }
      
      try {
        registrationsRes = await adminAPI.getAllRegistrations({ limit: 10000 });
      } catch (err) {
        console.error('Error fetching registrations:', err);
        registrationsError = err.message;
        registrationsRes = { data: { registrations: [], pagination: { total: 0 } } };
      }
      
      try {
        categoriesRes = await categoriesAPI.getAll();
      } catch (err) {
        console.error('Error fetching categories:', err);
        categoriesError = err.message;
        categoriesRes = { data: { categories: [] } };
      }

      // Extract data with proper null checks
      const eventsData = eventsRes?.data || eventsRes || {};
      const usersData = usersRes?.data || usersRes || {};
      const registrationsData = registrationsRes?.data || registrationsRes || {};
      const categoriesData = categoriesRes?.data || categoriesRes || {};
      
      const allEvents = eventsData.events || [];
      const allUsers = usersData.users || [];
      const allRegistrations = registrationsData.registrations || [];
      const allCategories = categoriesData.categories || [];
      
      // Use pagination totals for accurate counts (fallback to array length)
      const totalEvents = eventsData.pagination?.total || allEvents.length;
      const totalUsers = usersData.pagination?.total || allUsers.length;
      const totalRegistrations = registrationsData.pagination?.total || allRegistrations.length;
      const totalCategories = allCategories.length;
      
      // Calculate active events (published and upcoming)
      const activeEvents = allEvents.filter(e => 
        e.status === 'published' && 
        e.status !== 'archived' &&
        new Date(e.event_date) >= new Date()
      );

      // Sort events by date (most recent first) and take top 5 for display
      const sortedEvents = [...allEvents].sort((a, b) => 
        new Date(b.created_at || b.event_date) - new Date(a.created_at || a.event_date)
      );

      setStats({
        totalEvents,
        activeEvents: activeEvents.length,
        totalUsers,
        totalRegistrations,
        totalCategories,
        recentEvents: sortedEvents.slice(0, 5),
        recentRegistrations: allRegistrations.slice(0, 5)
      });
      
      // Set error message only if there are critical errors
      const errors = [eventsError, usersError, registrationsError, categoriesError].filter(Boolean);
      if (errors.length > 0) {
        // Only show warning for non-critical errors (like registrations)
        if (registrationsError && !eventsError && !usersError) {
          setError('Failed to get registrations');
        } else if (errors.length > 0) {
          setError(`Failed to load some data: ${errors.join(', ')}`);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      setError(error.message || 'Failed to load dashboard data');
      // Set default values on error to prevent blank page
      setStats({
        totalEvents: 0,
        activeEvents: 0,
        totalUsers: 0,
        totalRegistrations: 0,
        totalCategories: 0,
        recentEvents: [],
        recentRegistrations: []
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchChartsData = async () => {
    try {
      const [monthlyEventsRes, monthlyParticipantsRes, topEventsRes] = await Promise.all([
        analyticsAPI.getMonthlyEvents({ year: selectedYear }),
        analyticsAPI.getMonthlyParticipants({ year: selectedYear }),
        analyticsAPI.getTopEvents()
      ]);

      // Response interceptor returns { success, message, data }
      // So response.data contains { monthlyEvents: [...] }
      const monthlyEvents = monthlyEventsRes?.data?.monthlyEvents || monthlyEventsRes?.monthlyEvents || [];
      const monthlyParticipants = monthlyParticipantsRes?.data?.monthlyParticipants || monthlyParticipantsRes?.monthlyParticipants || [];
      const topEvents = topEventsRes?.data?.topEvents || topEventsRes?.topEvents || [];

      console.log('📊 Charts data loaded:', {
        monthlyEvents: monthlyEvents.length,
        monthlyParticipants: monthlyParticipants.length,
        topEvents: topEvents.length
      });

      setChartsData({
        monthlyEvents: Array.isArray(monthlyEvents) ? monthlyEvents : [],
        monthlyParticipants: Array.isArray(monthlyParticipants) ? monthlyParticipants : [],
        topEvents: Array.isArray(topEvents) ? topEvents : []
      });
    } catch (error) {
      console.error('❌ Error fetching charts data:', error);
      // Set empty arrays on error
      setChartsData({
        monthlyEvents: [],
        monthlyParticipants: [],
        topEvents: []
      });
    }
  };

  const StatCard = ({ title, value, icon: Icon, accent = 'blue' }) => {
    // Map accent to actual Tailwind classes
    const accentClasses = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      purple: 'bg-purple-50 text-purple-600',
      orange: 'bg-orange-50 text-orange-600',
      pink: 'bg-pink-50 text-pink-600'
    };
    
    return (
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
        <div className={`p-3 rounded-lg ${accentClasses[accent] || accentClasses.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Loading dashboard data...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait...</p>
        </div>
      </div>
    );
  }

  // Show error message but still render the page
  if (error) {
    console.warn('⚠️ Dashboard error:', error);
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Warning:</strong> {error}. Some data may not be available.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">Dashboard</p>
          <h1 className="text-3xl font-semibold text-gray-900">Ringkasan Aktivitas</h1>
          <p className="text-gray-600 mt-2">Monitor event, peserta, dan performa platform secara singkat.</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-sm text-gray-600">Tahun</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="text-sm font-semibold text-gray-900 bg-transparent focus:outline-none"
            >
              {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => navigate('/admin/events')}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Buat Event
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Event" value={stats.totalEvents} icon={Calendar} accent="blue" />
        <StatCard title="Event Aktif" value={stats.activeEvents} icon={Activity} accent="green" />
        <StatCard title="Total Peserta" value={stats.totalUsers} icon={Users} accent="purple" />
        <StatCard title="Registrasi" value={stats.totalRegistrations} icon={Ticket} accent="orange" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Kategori" value={stats.totalCategories} icon={FolderPlus} accent="pink" />
        <StatCard title="Event terbaru" value={stats.recentEvents.length} icon={LayoutList} accent="blue" />
        <StatCard title="Aktivitas terbaru" value={stats.recentRegistrations.length} icon={ClipboardList} accent="purple" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Performa Event</p>
              <p className="text-base font-semibold text-gray-900">Event / Bulan</p>
            </div>
          </div>
          <BarChart
            data={(chartsData.monthlyEvents || []).map(item => ({
              label: (item.month_name || '').substring(0, 3),
              value: item.total_events || 0
            }))}
            xAxisLabel="Bulan"
            yAxisLabel="Event"
            color="#2563eb"
            height={260}
          />
        </div>
        <div className="xl:col-span-1 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Daftar Hadir</p>
              <p className="text-base font-semibold text-gray-900">Peserta / Bulan</p>
            </div>
          </div>
          <BarChart
            data={(chartsData.monthlyParticipants || []).map(item => ({
              label: (item.month_name || '').substring(0, 3),
              value: item.total_participants || 0
            }))}
            xAxisLabel="Bulan"
            yAxisLabel="Peserta"
            color="#059669"
            height={260}
          />
        </div>
        <div className="xl:col-span-1 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm text-gray-500">10 Event Teratas</p>
              <p className="text-base font-semibold text-gray-900">Peserta Terbanyak</p>
            </div>
          </div>
          <BarChart
            data={(chartsData.topEvents || []).map(item => ({
              label: (item.title || '').length > 15 ? `${(item.title || '').slice(0, 12)}…` : (item.title || ''),
              value: item.participant_count || 0
            }))}
            xAxisLabel="Event"
            yAxisLabel="Peserta"
            color="#7c3aed"
            height={260}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Events */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-black">Recent Events</h3>
            <button 
              onClick={() => navigate('/admin/events')}
              className="text-blue-600 hover:text-blue-700 transition-colors font-medium"
            >
              View All →
            </button>
          </div>
          <div className="space-y-4">
            {stats.recentEvents && stats.recentEvents.length > 0 ? (
              stats.recentEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mr-4">
                    <Calendar className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-black font-medium">{event.title || 'Untitled Event'}</h4>
                    <p className="text-gray-600 text-sm">{event.event_date ? new Date(event.event_date).toLocaleDateString() : 'No date'}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    event.status === 'published' ? 'bg-green-100 text-green-700' :
                    event.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {event.status || 'unknown'}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No recent events</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-xl font-bold text-black mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => navigate('/admin/events')}
              className="p-4 bg-gray-50 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all border border-gray-200 group"
            >
              <div className="flex justify-center mb-2">
                <Calendar className="w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-black font-medium group-hover:text-blue-600 transition-colors">Create Event</div>
            </button>
            <button 
              onClick={() => navigate('/admin/users')}
              className="p-4 bg-gray-50 rounded-lg hover:bg-green-50 hover:border-green-300 transition-all border border-gray-200 group"
            >
              <div className="flex justify-center mb-2">
                <Users className="w-8 h-8 text-green-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-black font-medium group-hover:text-green-600 transition-colors">Add User</div>
            </button>
            <button 
              onClick={() => navigate('/admin/categories')}
              className="p-4 bg-gray-50 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-all border border-gray-200 group"
            >
              <div className="flex justify-center mb-2">
                <FolderPlus className="w-8 h-8 text-purple-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-black font-medium group-hover:text-purple-600 transition-colors">New Category</div>
            </button>
            <button 
              onClick={() => navigate('/admin/statistics')}
              className="p-4 bg-gray-50 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-all border border-gray-200 group"
            >
              <div className="flex justify-center mb-2">
                <BarChart3 className="w-8 h-8 text-orange-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-black font-medium group-hover:text-orange-600 transition-colors">View Reports</div>
            </button>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-xl font-bold text-black mb-6">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <div>
              <div className="text-black font-medium">Database</div>
              <div className="text-green-600 text-sm">Operational</div>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <div>
              <div className="text-black font-medium">API Services</div>
              <div className="text-green-600 text-sm">All Systems Go</div>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <div>
              <div className="text-black font-medium">Email Service</div>
              <div className="text-green-600 text-sm">Active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
