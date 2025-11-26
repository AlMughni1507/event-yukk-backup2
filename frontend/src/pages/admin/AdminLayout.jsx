import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI } from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';
import { 
  LayoutDashboard, 
  Calendar, 
  FolderKanban, 
  Users, 
  ClipboardList, 
  TrendingUp, 
  BarChart3, 
  Award,
  FileText,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Bell,
  Settings,
  CreditCard
} from 'lucide-react';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [quickStats, setQuickStats] = useState({ events: 0, users: 0 });
  const [quickLoading, setQuickLoading] = useState(true);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-black font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not admin
  if (!user || user.role !== 'admin') {
    navigate('/');
    return null;
  }

  useEffect(() => {
    // Set active menu based on current path
    const path = location.pathname.split('/')[2] || 'dashboard';
    setActiveMenu(path);
  }, [location]);

  useEffect(() => {
    const fetchQuickStats = async () => {
      try {
        const [eventsRes, usersRes] = await Promise.all([
          adminAPI.getAllEvents({ limit: 1 }),
          adminAPI.getAllUsers({ limit: 1 })
        ]);

        // Handle different response structures
        const eventsData = eventsRes?.data || eventsRes || {};
        const usersData = usersRes?.data || usersRes || {};

        setQuickStats({
          events: eventsData.pagination?.total || eventsData.events?.length || 0,
          users: usersData.pagination?.total || usersData.users?.length || 0
        });
      } catch (error) {
        console.error('Failed to fetch quick stats:', error);
        // Set default values on error
        setQuickStats({ events: 0, users: 0 });
      } finally {
        setQuickLoading(false);
      }
    };

    fetchQuickStats();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const confirmLogout = () => {
    setShowLogoutModal(true);
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/admin/dashboard',
      description: 'Overview & Analytics'
    },
    {
      id: 'events',
      label: 'Events',
      icon: Calendar,
      path: '/admin/events',
      description: 'Manage Events'
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: FolderKanban,
      path: '/admin/categories',
      description: 'Event Categories'
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      path: '/admin/users',
      description: 'User Management'
    },
    {
      id: 'registrations',
      label: 'Registrations',
      icon: ClipboardList,
      path: '/admin/registrations',
      description: 'Event Registrations'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: TrendingUp,
      path: '/admin/analytics',
      description: 'Reports & Insights'
    },
    {
      id: 'statistics',
      label: 'Statistics',
      icon: BarChart3,
      path: '/admin/statistics',
      description: 'Bar Charts & Data'
    },
    {
      id: 'certificates',
      label: 'Certificates',
      icon: Award,
      path: '/admin/certificates',
      description: 'Certificate Management'
    },
    {
      id: 'blogs',
      label: 'Blog Management',
      icon: FileText,
      path: '/admin/blogs',
      description: 'Create & Manage Blogs'
    },
    {
      id: 'reviews',
      label: 'Reviews',
      icon: MessageSquare,
      path: '/admin/reviews',
      description: 'User Reviews Management'
    },
    {
      id: 'reports',
      label: 'Laporan & Rekap',
      icon: FileText,
      path: '/admin/reports',
      description: 'Rekap Data & Statistik'
    },
    {
      id: 'contacts',
      label: 'Contacts',
      icon: MessageSquare,
      path: '/admin/contacts',
      description: 'Contact Management'
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: CreditCard,
      path: '/admin/payments',
      description: 'Payment Management'
    }
  ];

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">

      <div className="flex relative z-10">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-72' : 'w-20'} transition-all duration-300 bg-white border-r border-gray-200 min-h-screen flex flex-col shadow-lg`}>
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className={`${sidebarOpen ? 'block' : 'hidden'} transition-all duration-300`}>
                <h1 className="text-2xl font-bold text-black">
                  Event Yukk Admin
                </h1>
                <p className="text-sm text-gray-600 mt-1">Management Dashboard</p>
              </div>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5 text-black" />
                ) : (
                  <Menu className="w-5 h-5 text-black" />
                )}
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-2 flex-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center p-3 rounded-lg transition-colors group ${
                  activeMenu === item.id
                    ? 'bg-black text-white'
                    : 'hover:bg-gray-100 text-gray-700 hover:text-black'
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 ${activeMenu === item.id ? 'text-white' : 'text-gray-600 group-hover:text-black'}`} />
                <div className={`${sidebarOpen ? 'block' : 'hidden'} transition-all duration-300`}>
                  <div className="text-left">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs opacity-70">{item.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200">
            <div className={`${sidebarOpen ? 'block' : 'hidden'} bg-gray-50 p-4 rounded-lg border border-gray-200`}>
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">
                    {user?.full_name?.charAt(0) || 'A'}
                  </span>
                </div>
                <div className="ml-3">
                  <div className="text-black font-medium">{user?.full_name || 'Admin'}</div>
                  <div className="text-gray-600 text-sm">{user?.role || 'Administrator'}</div>
                </div>
              </div>
              <button
                onClick={confirmLogout}
                className="w-full bg-black hover:bg-gray-800 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-screen">
          {/* Top Bar */}
          <header className="bg-white border-b border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-black capitalize">
                  {activeMenu.replace('-', ' ')}
                </h2>
                <p className="text-gray-600 text-sm">
                  Manage your {activeMenu}
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Quick Stats */}
                <div className="hidden md:flex items-center space-x-4">
                  <div className="bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg min-w-[120px]">
                    <div className="text-gray-500 text-xs uppercase tracking-wide">Event aktif</div>
                    <div className="text-gray-900 font-semibold text-lg">
                      {quickLoading ? '...' : quickStats.events}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg min-w-[120px]">
                    <div className="text-gray-500 text-xs uppercase tracking-wide">Total user</div>
                    <div className="text-gray-900 font-semibold text-lg">
                      {quickLoading ? '...' : quickStats.users}
                    </div>
                  </div>
                </div>

                {/* Notifications */}
                <button className="relative p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border border-gray-200">
                  <Bell className="w-6 h-6 text-black" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                </button>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-6 bg-gray-50 min-h-screen">
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Konfirmasi Logout"
        message="Apakah Anda yakin ingin keluar dari akun admin?"
        confirmText="Ya, Logout"
        cancelText="Batal"
        type="danger"
      />
    </div>
  );
};

export default AdminLayout;
