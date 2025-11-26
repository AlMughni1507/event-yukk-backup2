import React, { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { adminAPI } from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';
import { CreditCard, Search, Filter, Eye, RefreshCw, Download, CheckCircle, XCircle, Clock, AlertCircle, Calendar, DollarSign, User, Mail, Phone } from 'lucide-react';

const PaymentsManagement = () => {
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [refundConfirm, setRefundConfirm] = useState({ show: false, id: null });
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [stats, setStats] = useState({ success: 0, pending: 0 });

  const [filters, setFilters] = useState({
    search: '',
    status: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };

      const response = await adminAPI.getAllPayments(params);
      const data = response?.data || response;
      
      setPayments(data.payments || []);
      setTotalRevenue(data.totalRevenue || 0);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0
      }));

      const successCount = data.payments.filter(p => p.status === 'success').length;
      const pendingCount = data.payments.filter(p => p.status === 'pending').length;
      setStats({ success: successCount, pending: pendingCount });

    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Gagal memuat data pembayaran');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [filters, pagination.page]);

  const handleViewDetail = async (payment) => {
    try {
      const response = await adminAPI.getPaymentById(payment.id);
      const data = response?.data || response;
      setSelectedPayment(data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching payment detail:', error);
      toast.error('Gagal memuat detail pembayaran');
    }
  };

  const handleRefund = (id) => {
    setRefundConfirm({ show: true, id });
  };

  const confirmRefund = async () => {
    try {
      await adminAPI.refundPayment(refundConfirm.id);
      toast.success('Pembayaran berhasil di-refund dan registrasi telah dihapus.');
      fetchPayments();
      setRefundConfirm({ show: false, id: null });
    } catch (error) {
      console.error('Error refunding payment:', error);
      toast.error('Gagal melakukan refund pembayaran.');
    }
  };

  const handleVerifyPayment = async (orderId) => {
    setVerifying(true);
    try {
      const response = await adminAPI.verifyPayment(orderId);
      const data = response?.data || response;
      toast.success(`Pembayaran berhasil diverifikasi. Status: ${data.status}`);
      fetchPayments();
      // Update selected payment if modal is open
      if (selectedPayment && selectedPayment.order_id === orderId) {
        setSelectedPayment(prev => ({ ...prev, status: data.status }));
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      if (error.response?.status === 404) {
        toast.error('Transaksi tidak ditemukan di Midtrans. Pembayaran ditandai sebagai gagal.');
        fetchPayments(); // Refresh to show updated status
        if (selectedPayment && selectedPayment.order_id === orderId) {
          setSelectedPayment(prev => ({ ...prev, status: 'failed' }));
        }
      } else {
        toast.error('Gagal memverifikasi pembayaran.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      success: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Berhasil' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'Menunggu' },
      failed: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Gagal' },
      refunded: { bg: 'bg-gray-100', text: 'text-gray-700', icon: RefreshCw, label: 'Refunded' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', icon: XCircle, label: 'Dibatalkan' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 ${config.bg} ${config.text} px-3 py-1 rounded-full text-xs font-semibold`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  const exportPayments = () => {
    const headers = ['Order ID', 'Event', 'Participant Name', 'Email', 'Phone', 'Registration Status', 'Payment Status', 'Amount', 'Payment Date'];
    const rows = payments.map(p => [
      p.order_id,
      p.event_title || '-',
      p.participant_name || '-',
      p.participant_email || '-',
      p.participant_phone || '-',
      p.registration_status || '-',
      p.status,
      `Rp ${parseFloat(p.amount || 0).toLocaleString('id-ID')}`,
      p.payment_date ? new Date(p.payment_date).toLocaleString('id-ID') : '-'
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Data pembayaran berhasil diekspor');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black">Payment Management</h1>
          <p className="text-gray-600 mt-1">Kelola semua pembayaran event</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPayments} className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors"><Download className="w-4 h-4" />Export CSV</button>
          <button onClick={fetchPayments} disabled={loading} className="inline-flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4"><div className="flex items-center justify-between"><div><p className="text-gray-600 text-sm">Total Payments</p><p className="text-2xl font-bold text-black mt-1">{pagination.total}</p></div><CreditCard className="w-8 h-8 text-gray-400" /></div></div>
        <div className="bg-white border border-gray-200 rounded-lg p-4"><div className="flex items-center justify-between"><div><p className="text-gray-600 text-sm">Berhasil</p><p className="text-2xl font-bold text-green-600 mt-1">{stats.success}</p></div><CheckCircle className="w-8 h-8 text-green-400" /></div></div>
        <div className="bg-white border border-gray-200 rounded-lg p-4"><div className="flex items-center justify-between"><div><p className="text-gray-600 text-sm">Menunggu</p><p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p></div><Clock className="w-8 h-8 text-yellow-400" /></div></div>
        <div className="bg-white border border-gray-200 rounded-lg p-4"><div className="flex items-center justify-between"><div><p className="text-gray-600 text-sm">Total Revenue</p><p className="text-2xl font-bold text-black mt-1">Rp {totalRevenue.toLocaleString('id-ID')}</p></div><DollarSign className="w-8 h-8 text-green-400" /></div></div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2"><Search className="w-4 h-4 inline mr-1" />Search</label>
            <input type="text" placeholder="Cari order ID, nama, email, event..." value={filters.search} onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2"><Filter className="w-4 h-4 inline mr-1" />Status</label>
            <select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent">
              <option value="">Semua Status</option>
              <option value="success">Berhasil</option>
              <option value="pending">Menunggu</option>
              <option value="failed">Gagal</option>
              <option value="refunded">Refunded</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => setFilters({ search: '', status: '' })} className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">Reset Filter</button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="text-center"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="text-black">Memuat data pembayaran...</p></div></div>
        ) : payments.length === 0 ? (
          <div className="flex items-center justify-center h-64"><div className="text-center"><CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" /><p className="text-gray-600">Tidak ada data pembayaran</p></div></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-black">Order ID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-black">Event</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-black">Participant</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-black">Registration Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-black">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-black">Payment Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-black">Payment Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4"><code className="text-xs font-mono text-gray-900">{payment.order_id}</code></td>
                      <td className="px-6 py-4"><div className="text-sm font-medium text-black">{payment.event_title || '-'}</div></td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-black">{payment.participant_name || '-'}</div>
                          <div className="text-gray-600 text-sm">{payment.participant_email || '-'}</div>
                          <div className="text-gray-600 text-sm">{payment.participant_phone || '-'}</div>
                          {payment.participant_address && (
                            <div className="text-xs text-gray-400 mt-1">{payment.participant_address}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          payment.registration_status === 'approved' ? 'bg-green-100 text-green-700' :
                          payment.registration_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          payment.registration_status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {payment.registration_status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4"><div className="text-sm font-semibold text-black">Rp {parseFloat(payment.amount || 0).toLocaleString('id-ID')}</div></td>
                      <td className="px-6 py-4">{getStatusBadge(payment.status)}</td>
                      <td className="px-6 py-4">{payment.payment_date ? new Date(payment.payment_date).toLocaleString('id-ID') : '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleViewDetail(payment)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="View Details"><Eye className="w-4 h-4 text-gray-600" /></button>
                          {payment.status === 'pending' && (
                            <button onClick={() => handleVerifyPayment(payment.order_id)} disabled={verifying} className="p-2 hover:bg-yellow-100 rounded-lg transition-colors disabled:opacity-50" title="Verify Payment"><RefreshCw className={`w-4 h-4 text-yellow-600 ${verifying ? 'animate-spin' : ''}`} /></button>
                          )}
                          {payment.status === 'success' && (
                            <button onClick={() => handleRefund(payment.id)} className="p-2 hover:bg-red-100 rounded-lg transition-colors" title="Refund Payment"><DollarSign className="w-4 h-4 text-red-600" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Menampilkan {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                  <button onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page >= pagination.totalPages} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={refundConfirm.show}
        onClose={() => setRefundConfirm({ show: false, id: null })}
        onConfirm={confirmRefund}
        title="Konfirmasi Refund"
        message="Apakah Anda yakin ingin me-refund pembayaran ini? Registrasi terkait akan dihapus secara permanen."
        confirmText="Ya, Refund"
        cancelText="Batal"
        type="danger"
      />

      {showDetailModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-black">Payment Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-6">
                            {/* Payment Info */}
              <div>
                <h3 className="text-lg font-semibold text-black mb-4">Payment Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Order ID</label>
                    <p className="text-sm font-mono font-semibold text-black">{selectedPayment.order_id}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Payment Status</label>
                    <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Registration Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        selectedPayment.registration_status === 'approved' ? 'bg-green-100 text-green-700' :
                        selectedPayment.registration_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        selectedPayment.registration_status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {selectedPayment.registration_status || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Amount</label>
                    <p className="text-lg font-bold text-black">
                      Rp {parseFloat(selectedPayment.amount || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Payment Method</label>
                    <p className="text-sm font-semibold text-black">{selectedPayment.payment_method || 'midtrans'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Created At</label>
                    <p className="text-sm text-black">
                      {new Date(selectedPayment.created_at).toLocaleString('id-ID')}
                    </p>
                  </div>
                  {selectedPayment.payment_date && (
                    <div>
                      <label className="text-sm text-gray-600">Payment Date</label>
                      <p className="text-sm text-black">
                        {new Date(selectedPayment.payment_date).toLocaleString('id-ID')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Event Info */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-semibold text-black mb-4">Event Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Event Title</label>
                    <p className="text-sm font-semibold text-black">{selectedPayment.event_title || '-'}</p>
                  </div>
                  {selectedPayment.event_date && (
                    <div>
                      <label className="text-sm text-gray-600">Event Date</label>
                      <p className="text-sm text-black">
                        {new Date(selectedPayment.event_date).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Participant Info */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-semibold text-black mb-4">Participant Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Full Name
                    </label>
                    <p className="text-sm font-semibold text-black">{selectedPayment.participant_name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      Email
                    </label>
                    <p className="text-sm text-black">{selectedPayment.participant_email || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {selectedPayment.status === 'pending' && (
                <div className="border-t border-gray-200 pt-4">
                  <button
                    onClick={() => handleVerifyPayment(selectedPayment.order_id)}
                    disabled={verifying}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
                    {verifying ? 'Memverifikasi...' : 'Verify Payment from Midtrans'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsManagement;

