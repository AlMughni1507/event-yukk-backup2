import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import { Calendar, Trash2, Edit, Eye, Star, Award, FileText, Image as ImageIcon, Download, FileSpreadsheet, Archive, RotateCcw, Clock, File, Users } from 'lucide-react';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType, WidthType, BorderStyle } from 'docx';

const EventsManagement = () => {
  const toast = useToast();
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [archivedEvents, setArchivedEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'archived'
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [categories, setCategories] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });
  const [archiveConfirm, setArchiveConfirm] = useState({ show: false, eventId: null, action: 'archive' });
  const [generateConfirm, setGenerateConfirm] = useState({ show: false, event: null });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    short_description: '',
    event_date: '',
    end_date: '',
    location: '',
    is_online: false,
    address: '',
    city: '',
    province: '',
    category_id: '',
    max_participants: '50',
    registration_fee: '0',
    registration_deadline: '',
    status: 'published',
    tags: '',
    is_free: false,
    unlimited_participants: false,
    has_certificate: false,
    image: null,
    image_aspect_ratio: '16:9'
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [generatingCertificates, setGeneratingCertificates] = useState(false);
  const [showCertificatePreview, setShowCertificatePreview] = useState(false);
  const [selectedEventForCert, setSelectedEventForCert] = useState(null);
  const [performers, setPerformers] = useState([]);
  const [performerInputs, setPerformerInputs] = useState([{ name: '', photo: null, photoPreview: null }]);
  const [participantsModal, setParticipantsModal] = useState({
    show: false,
    event: null,
    loading: false,
    participants: [],
  });

  // Fetch events on mount and when returning from edit page
  useEffect(() => {
    fetchEvents();
    fetchArchivedEvents();
    fetchCategories();
  }, [location.pathname]);

  // Also refresh when location state changes (from navigation)
  useEffect(() => {
    if (location.state?.refresh) {
      console.log('🔄 Refreshing events due to location state');
      fetchEvents();
      fetchArchivedEvents();
    }
  }, [location.state]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching events...');
      // Fetch all events without pagination limit
      const response = await api.get('/admin/events', {
        params: {
          limit: 1000, // Get all events
          page: 1
        }
      });
      console.log('📦 Raw API Response:', response.data);
      
      // Handle different response structures
      let eventsData = [];
      if (response.data.success && response.data.data) {
        eventsData = response.data.data.events || response.data.data || [];
      } else if (response.data.events) {
        eventsData = response.data.events;
      } else if (Array.isArray(response.data.data)) {
        eventsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        eventsData = response.data;
      }
      
      console.log('✅ Events fetched:', eventsData.length, eventsData);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
    } catch (error) {
      console.error('❌ Error fetching events:', error);
      console.error('Error details:', error.response?.data);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      console.log('Categories API Response:', response.data);
      const categoriesData = response.data.categories || response.data.data?.categories || response.data.data || [];
      console.log('Categories extracted:', categoriesData);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  // ============ ARCHIVED EVENTS FUNCTIONS ============

  const fetchArchivedEvents = async () => {
    try {
      console.log('🔄 Fetching archived events...');
      const response = await api.get('/history/archived');
      
      if (response.data.success) {
        const archived = response.data.data.events || [];
        console.log('✅ Archived events fetched:', archived.length);
        setArchivedEvents(archived);
      }
    } catch (error) {
      console.error('❌ Error fetching archived events:', error);
      setArchivedEvents([]);
    }
  };

  const handleManualArchive = async () => {
    try {
      toast.info('🔄 Mengarsipkan event yang sudah berakhir...');
      const response = await api.post('/history/archive-now');
      
      if (response.data.success) {
        toast.success(`✅ ${response.data.message}`);
        fetchEvents();
        fetchArchivedEvents();
      }
    } catch (error) {
      console.error('Error manual archive:', error);
      toast.error('❌ Gagal mengarsipkan event');
    }
  };

  const handleArchiveEvent = async (eventId) => {
    try {
      // Manually archive a specific event
      await api.put(`/events/${eventId}`, {
        is_active: false,
        status: 'archived'
      });
      
      toast.success('✅ Event berhasil diarsipkan');
      fetchEvents();
      fetchArchivedEvents();
      setArchiveConfirm({ show: false, eventId: null, action: 'archive' });
    } catch (error) {
      console.error('Error archiving event:', error);
      toast.error('❌ Gagal mengarsipkan event');
    }
  };

  const handleRestoreEvent = async (eventId) => {
    try {
      const response = await api.post(`/history/restore/${eventId}`);
      
      if (response.data.success) {
        toast.success('✅ Event berhasil dipulihkan');
        fetchEvents();
        fetchArchivedEvents();
        setArchiveConfirm({ show: false, eventId: null, action: 'restore' });
      }
    } catch (error) {
      console.error('Error restoring event:', error);
      toast.error('❌ Gagal memulihkan event');
    }
  };

  const openParticipantsModal = async (eventItem) => {
    setParticipantsModal({
      show: true,
      event: eventItem,
      loading: true,
      participants: [],
    });

    try {
      const response = await api.get('/admin/registrations', {
        params: {
          event_id: eventItem.id,
          limit: 500,
          page: 1,
        },
      });

      // Handle different response structures
      let registrationsData = [];
      if (response?.data) {
        registrationsData = response.data.registrations || response.data.data?.registrations || [];
      } else if (response?.registrations) {
        registrationsData = response.registrations;
      } else if (Array.isArray(response)) {
        registrationsData = response;
      }

      setParticipantsModal((prev) => ({
        ...prev,
        loading: false,
        participants: Array.isArray(registrationsData) ? registrationsData : [],
      }));
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast.error('Gagal memuat data peserta');
      setParticipantsModal((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  };

  const closeParticipantsModal = () => {
    if (participantsModal.loading) return;
    setParticipantsModal({
      show: false,
      event: null,
      loading: false,
      participants: [],
    });
  };

  // ============ EXPORT FUNCTIONS ============
  
  // Fetch detailed event report data
  const fetchEventReportData = async (eventId) => {
    try {
      // Use correct endpoints
      const registrationsRes = await api.get(`/admin/registrations`, {
        params: { event_id: eventId, limit: 1000 }
      });
      
      const registrations = registrationsRes.data?.data?.registrations || 
                           registrationsRes.data?.registrations || 
                           registrationsRes.data?.data || [];
      
      // Payments might not have data, handle gracefully
      let payments = [];
      try {
        const paymentsRes = await api.get(`/payments`, {
          params: { event_id: eventId }
        });
        payments = paymentsRes.data?.data || paymentsRes.data || [];
      } catch (paymentError) {
        console.warn('Payments endpoint not available:', paymentError.message);
      }
      
      return { registrations, payments };
    } catch (error) {
      console.error('Error fetching report data:', error);
      throw error;
    }
  };

  // Export to Excel
  const exportToExcel = async (event) => {
    try {
      toast.info('Mengambil data laporan...');
      
      const { registrations, payments } = await fetchEventReportData(event.id);
      
      // Calculate total revenue
      const totalRevenue = payments
        .filter(p => p.status === 'success' || p.status === 'confirmed')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      
      // Summary data
      const summaryData = [
        ['LAPORAN EVENT'],
        [],
        ['Nama Event', event.title],
        ['Tanggal Event', new Date(event.event_date).toLocaleDateString('id-ID')],
        ['Lokasi', event.location || '-'],
        ['Kategori', event.category_name || '-'],
        [],
        ['RINGKASAN'],
        ['Total Peserta Terdaftar', registrations.length],
        ['Total Peserta Hadir', registrations.filter(r => r.attendance_status === 'attended').length],
        ['Total Pendapatan', `Rp ${totalRevenue.toLocaleString('id-ID')}`],
        ['Harga Tiket', event.is_free ? 'GRATIS' : `Rp ${(event.price || 0).toLocaleString('id-ID')}`],
        []
      ];
      
      // Participant data
      const participantHeaders = [
        'No',
        'Nama Peserta',
        'Email',
        'No. HP',
        'Status Registrasi',
        'Status Kehadiran',
        'Tanggal Daftar',
        'Jumlah Bayar'
      ];
      
      const participantData = registrations.map((reg, index) => {
        const payment = payments.find(p => p.user_id === reg.user_id);
        return [
          index + 1,
          reg.user_name || reg.full_name || '-',
          reg.user_email || reg.email || '-',
          reg.user_phone || reg.phone || '-',
          reg.status || 'pending',
          reg.attendance_status || 'not_attended',
          new Date(reg.registration_date || reg.created_at).toLocaleDateString('id-ID'),
          payment ? `Rp ${parseFloat(payment.amount || 0).toLocaleString('id-ID')}` : '-'
        ];
      });
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Summary sheet
      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan');
      
      // Participants sheet
      const ws2 = XLSX.utils.aoa_to_sheet([participantHeaders, ...participantData]);
      XLSX.utils.book_append_sheet(wb, ws2, 'Daftar Peserta');
      
      // Generate filename
      const filename = `Laporan_${event.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Save file
      XLSX.writeFile(wb, filename);
      
      toast.success('Laporan Excel berhasil didownload!');
    } catch (error) {
      console.error('Export Excel error:', error);
      toast.error('Gagal export laporan Excel');
    }
  };

  // Export to Word
  const exportToWord = async (event) => {
    try {
      toast.info('Mengambil data laporan...');
      
      const { registrations, payments } = await fetchEventReportData(event.id);
      
      // Calculate totals
      const totalRevenue = payments
        .filter(p => p.status === 'success' || p.status === 'confirmed')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const totalAttended = registrations.filter(r => r.attendance_status === 'attended').length;
      
      // Create document
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Title
            new Paragraph({
              text: 'LAPORAN EVENT',
              heading: 'Heading1',
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            
            // Event Details
            new Paragraph({
              text: 'DETAIL EVENT',
              heading: 'Heading2',
              spacing: { before: 200, after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Nama Event: ', bold: true }),
                new TextRun(event.title)
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Tanggal: ', bold: true }),
                new TextRun(new Date(event.event_date).toLocaleDateString('id-ID'))
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Lokasi: ', bold: true }),
                new TextRun(event.location || '-')
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Kategori: ', bold: true }),
                new TextRun(event.category_name || '-')
              ],
              spacing: { after: 300 }
            }),
            
            // Summary
            new Paragraph({
              text: 'RINGKASAN',
              heading: 'Heading2',
              spacing: { before: 200, after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Total Peserta Terdaftar: ', bold: true }),
                new TextRun(registrations.length.toString())
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Total Peserta Hadir: ', bold: true }),
                new TextRun(totalAttended.toString())
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Total Pendapatan: ', bold: true }),
                new TextRun(`Rp ${totalRevenue.toLocaleString('id-ID')}`)
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Harga Tiket: ', bold: true }),
                new TextRun(event.is_free ? 'GRATIS' : `Rp ${(event.price || 0).toLocaleString('id-ID')}`)
              ],
              spacing: { after: 300 }
            }),
            
            // Participants Table
            new Paragraph({
              text: 'DAFTAR PESERTA',
              heading: 'Heading2',
              spacing: { before: 200, after: 200 }
            }),
            
            new Table({
              rows: [
                // Header
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: 'No', bold: true })] }),
                    new TableCell({ children: [new Paragraph({ text: 'Nama', bold: true })] }),
                    new TableCell({ children: [new Paragraph({ text: 'Email', bold: true })] }),
                    new TableCell({ children: [new Paragraph({ text: 'Status', bold: true })] }),
                    new TableCell({ children: [new Paragraph({ text: 'Kehadiran', bold: true })] })
                  ]
                }),
                // Data rows
                ...registrations.map((reg, index) => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph((index + 1).toString())] }),
                    new TableCell({ children: [new Paragraph(reg.user_name || reg.full_name || '-')] }),
                    new TableCell({ children: [new Paragraph(reg.user_email || reg.email || '-')] }),
                    new TableCell({ children: [new Paragraph(reg.status || 'pending')] }),
                    new TableCell({ children: [new Paragraph(reg.attendance_status || 'not_attended')] })
                  ]
                }))
              ],
              width: { size: 100, type: WidthType.PERCENTAGE }
            }),
            
            // Footer
            new Paragraph({
              text: `\nDibuat pada: ${new Date().toLocaleString('id-ID')}`,
              alignment: AlignmentType.RIGHT,
              spacing: { before: 400 }
            })
          ]
        }]
      });
      
      // Generate filename
      const filename = `Laporan_${event.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
      
      // Save file
      Packer.toBlob(doc).then(blob => {
        saveAs(blob, filename);
        toast.success('Laporan Word berhasil didownload!');
      });
      
    } catch (error) {
      console.error('Export Word error:', error);
      toast.error('Gagal export laporan Word');
    }
  };

  // Export to CSV
  const exportToCSV = async (event) => {
    try {
      toast.info('Mengambil data laporan...');
      
      const { registrations, payments } = await fetchEventReportData(event.id);
      
      // Calculate totals
      const totalRevenue = payments
        .filter(p => p.status === 'success' || p.status === 'confirmed')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const totalAttended = registrations.filter(r => r.attendance_status === 'attended').length;
      
      // Helper function to escape CSV fields
      const escapeCSV = (field) => {
        if (field === null || field === undefined) return '';
        const str = String(field);
        // If field contains comma, newline, or quote, wrap in quotes and escape quotes
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      // Build CSV content
      let csvContent = '';
      
      // Header Section
      csvContent += 'LAPORAN EVENT\n\n';
      csvContent += `Nama Event,${escapeCSV(event.title)}\n`;
      csvContent += `Tanggal Event,${escapeCSV(new Date(event.event_date).toLocaleDateString('id-ID'))}\n`;
      csvContent += `Lokasi,${escapeCSV(event.location || '-')}\n`;
      csvContent += `Kategori,${escapeCSV(event.category_name || '-')}\n\n`;
      
      // Summary Section
      csvContent += 'RINGKASAN\n';
      csvContent += `Total Peserta Terdaftar,${registrations.length}\n`;
      csvContent += `Total Peserta Hadir,${totalAttended}\n`;
      csvContent += `Total Pendapatan,Rp ${totalRevenue.toLocaleString('id-ID')}\n`;
      csvContent += `Harga Tiket,${event.is_free ? 'GRATIS' : `Rp ${(event.price || 0).toLocaleString('id-ID')}`}\n\n`;
      
      // Participant Data Header
      csvContent += 'DAFTAR PESERTA\n';
      csvContent += 'No,Nama Peserta,Email,No. HP,Status Registrasi,Status Kehadiran,Tanggal Daftar,Jumlah Bayar\n';
      
      // Participant Data Rows
      registrations.forEach((reg, index) => {
        const payment = payments.find(p => p.user_id === reg.user_id);
        const row = [
          index + 1,
          escapeCSV(reg.user_name || reg.full_name || '-'),
          escapeCSV(reg.user_email || reg.email || '-'),
          escapeCSV(reg.user_phone || reg.phone || '-'),
          escapeCSV(reg.status || 'pending'),
          escapeCSV(reg.attendance_status || 'not_attended'),
          escapeCSV(reg.created_at ? new Date(reg.created_at).toLocaleDateString('id-ID') : '-'),
          escapeCSV(payment ? `Rp ${parseFloat(payment.amount || 0).toLocaleString('id-ID')}` : 'Rp 0')
        ];
        csvContent += row.join(',') + '\n';
      });
      
      // Footer
      csvContent += `\nDibuat pada,${escapeCSV(new Date().toLocaleString('id-ID'))}\n`;
      
      // Create Blob and download
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const filename = `Laporan_${event.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      
      saveAs(blob, filename);
      toast.success('Laporan CSV berhasil didownload!');
      
    } catch (error) {
      console.error('Export CSV error:', error);
      toast.error('Gagal export laporan CSV');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file terlalu besar! Maksimal 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar!');
        return;
      }
      setFormData(prev => ({ ...prev, image: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: null }));
    setImagePreview(null);
  };

  // Performer handlers
  const addPerformerInput = () => {
    setPerformerInputs([...performerInputs, { name: '', photo: null, photoPreview: null }]);
  };

  const removePerformerInput = (index) => {
    const newInputs = performerInputs.filter((_, i) => i !== index);
    setPerformerInputs(newInputs.length > 0 ? newInputs : [{ name: '', photo: null, photoPreview: null }]);
  };

  const handlePerformerNameChange = (index, name) => {
    const newInputs = [...performerInputs];
    newInputs[index].name = name;
    setPerformerInputs(newInputs);
  };

  const handlePerformerPhotoChange = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file terlalu besar! Maksimal 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar!');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const newInputs = [...performerInputs];
        newInputs[index].photo = file;
        newInputs[index].photoPreview = reader.result;
        setPerformerInputs(newInputs);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePerformerPhoto = (index) => {
    const newInputs = [...performerInputs];
    newInputs[index].photo = null;
    newInputs[index].photoPreview = null;
    setPerformerInputs(newInputs);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Validate
      const newErrors = {};
      if (!formData.title || formData.title.trim().length < 5) newErrors.title = 'Judul minimal 5 karakter';
      if (!formData.description || formData.description.trim().length < 20) newErrors.description = 'Deskripsi minimal 20 karakter';
      if (!formData.event_date) newErrors.event_date = 'Tanggal & waktu mulai wajib diisi';
      if (!formData.category_id) newErrors.category_id = 'Kategori wajib dipilih';
      if (!formData.is_online && !formData.location) newErrors.location = 'Lokasi wajib diisi untuk event offline';
      
      // Validate end_date is not before event_date
      if (formData.end_date && formData.event_date) {
        const startDate = new Date(formData.event_date);
        const endDate = new Date(formData.end_date);
        if (endDate < startDate) {
          newErrors.end_date = 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai';
        }
      }
      
      // Validate event_date is not in the past
      if (formData.event_date) {
        const eventDate = new Date(formData.event_date);
        const now = new Date();
        if (eventDate < now) {
          newErrors.event_date = 'Tanggal event tidak boleh di masa lalu';
        }
      }
      
      if (Object.keys(newErrors).length) {
        setErrors(newErrors);
        setLoading(false);
        toast.error('Mohon perbaiki error pada form');
        
        // Scroll to top of form instead of auto-scroll to error input
        const formElement = document.getElementById('create-event-form');
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        return;
      }

      // Split datetime-local into date and time
      const startDateTime = new Date(formData.event_date);
      const eventDate = startDateTime.toISOString().split('T')[0]; // YYYY-MM-DD
      const eventTime = startDateTime.toTimeString().split(' ')[0].substring(0, 5); // HH:MM (without seconds)

      const endDate = formData.end_date ? new Date(formData.end_date).toISOString().split('T')[0] : eventDate;
      const endTime = formData.end_date ? new Date(formData.end_date).toTimeString().split(' ')[0] : eventTime;

      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('short_description', (formData.short_description || formData.description).substring(0, 200));
      submitData.append('event_date', eventDate);
      submitData.append('event_time', eventTime);
      submitData.append('end_date', endDate);
      submitData.append('end_time', endTime);
      submitData.append('location', formData.location);
      submitData.append('address', formData.address || formData.location);
      submitData.append('city', formData.city || 'Jakarta');
      submitData.append('province', formData.province || 'DKI Jakarta');
      submitData.append('category_id', parseInt(formData.category_id));
      submitData.append('max_participants', formData.unlimited_participants ? 0 : parseInt(formData.max_participants));
      submitData.append('price', parseFloat(formData.registration_fee));
      submitData.append('is_free', formData.is_free || parseFloat(formData.registration_fee) === 0);
      submitData.append('has_certificate', formData.has_certificate);
      // Derived tiers
      const priceNumber = parseFloat(formData.registration_fee) || 0;
      const premiumPrice = Math.round(priceNumber * 1.15);
      submitData.append('price_regular', priceNumber);
      submitData.append('price_premium', premiumPrice);
      submitData.append('status', formData.status || 'published');
      if (formData.registration_deadline) submitData.append('registration_deadline', formData.registration_deadline);
      if (formData.tags) submitData.append('tags', formData.tags);
      submitData.append('is_online', formData.is_online);
      submitData.append('image_aspect_ratio', formData.image_aspect_ratio || '16:9');
      
      if (formData.image) {
        submitData.append('image', formData.image);
      }

      console.log('Creating event with image...');
      const eventResponse = await api.post('/events', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const createdEventId = eventResponse.data.event?.id || eventResponse.data.data?.id || eventResponse.data.id;
      
      // Save performers if any
      const validPerformers = performerInputs.filter(p => p.name.trim() !== '');
      if (validPerformers.length > 0 && createdEventId) {
        for (let i = 0; i < validPerformers.length; i++) {
          const performer = validPerformers[i];
          const performerData = new FormData();
          performerData.append('event_id', createdEventId);
          performerData.append('name', performer.name);
          performerData.append('display_order', i);
          if (performer.photo) {
            performerData.append('photo', performer.photo);
          }
          
          try {
            await api.post('/performers', performerData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
          } catch (err) {
            console.error('Error saving performer:', err);
          }
        }
      }
      
      toast.success('Event berhasil dibuat!');
      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        short_description: '',
        event_date: '',
        end_date: '',
        location: '',
        is_online: false,
        address: '',
        city: '',
        province: '',
        category_id: '',
        max_participants: '50',
        registration_fee: '0',
        registration_deadline: '',
        status: 'published',
        tags: '',
        is_free: false,
        unlimited_participants: false,
        has_certificate: false,
        image: null,
        image_aspect_ratio: '16:9'
      });
      setImagePreview(null);
      setPerformerInputs([{ name: '', photo: null, photoPreview: null }]);
      fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error(error?.message || 'Gagal membuat event. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = (id) => {
    setDeleteConfirm({ show: true, id });
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/events/${deleteConfirm.id}`);
      toast.success('Event berhasil dihapus!');
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Gagal hapus event.');
    }
  };

  const handleToggleHighlight = async (eventId, currentHighlightStatus) => {
    try {
      const newStatus = !currentHighlightStatus;
      await api.put(`/events/${eventId}/highlight`, {
        is_highlighted: newStatus
      });
      
      toast.success(newStatus ? 
        'Event berhasil di-set sebagai Highlight Event! Event ini akan muncul di Hero Section homepage.' : 
        'Event highlight berhasil dihapus.'
      );
      fetchEvents();
    } catch (error) {
      console.error('Error toggling highlight:', error);
      toast.error('Gagal mengubah status highlight event.');
    }
  };

  const handleGenerateCertificates = (event) => {
    if (!event.has_certificate) {
      toast.warning('Event ini tidak memiliki fitur sertifikat');
      return;
    }
    setGenerateConfirm({ show: true, event });
  };

  const confirmGenerateCertificates = async () => {

    try {
      setGeneratingCertificates(true);
      const event = generateConfirm.event;
      const response = await api.post(`/events/${event.id}/generate-certificates`);
      
      toast.success(`Berhasil generate ${response.data.generated || 0} sertifikat untuk event "${event.title}"!`);
      fetchEvents();
    } catch (error) {
      console.error('Error generating certificates:', error);
      toast.error('Gagal generate sertifikat: ' + (error.response?.data?.message || error.message));
    } finally {
      setGeneratingCertificates(false);
    }
  };

  const handlePreviewCertificate = (event) => {
    setSelectedEventForCert(event);
    setShowCertificatePreview(true);
  };

  // Filter events based on active tab
  const displayEvents = activeTab === 'active' ? events : archivedEvents;
  
  const filteredEvents = displayEvents.filter(event =>
    event.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'Belum diatur';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatPrice = (price) => {
    if (!price || price === 0) return 'Gratis';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Modern Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Event Management
              </h1>
              <p className="text-gray-600">Kelola dan pantau semua event Anda dalam satu tempat</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchEvents}
                className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-6 py-4 rounded-xl font-semibold shadow-sm hover:shadow-md border-2 border-gray-200 transition-all duration-200"
                title="Refresh events list"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                className="group relative inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Buat Event Baru
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Total Events</p>
                <p className="text-3xl font-bold text-gray-900">{events.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Upcoming</p>
                <p className="text-3xl font-bold text-gray-900">{events.filter(e => new Date(e.event_date) > new Date()).length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Past Events</p>
                <p className="text-3xl font-bold text-gray-900">{events.filter(e => new Date(e.event_date) <= new Date()).length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Categories</p>
                <p className="text-3xl font-bold text-gray-900">{categories.length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs and Archive Button */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'active'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Active Events ({events.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('archived')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'archived'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4" />
                  Archived Events ({archivedEvents.length})
                </div>
              </button>
            </div>
            
            {activeTab === 'active' && (
              <button
                onClick={handleManualArchive}
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
                title="Archive events yang sudah berakhir lebih dari 1 bulan"
              >
                <Clock className="w-4 h-4" />
                Auto Archive Now
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari event berdasarkan judul..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Events List */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat data event...</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredEvents.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Event</h3>
                <p className="text-gray-600 mb-6">Mulai buat event pertama Anda dan jangkau lebih banyak peserta</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Buat Event Sekarang
                </button>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div key={event.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200 group">
                  <div className="flex justify-between items-start gap-6">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{event.title}</h3>
                          <p className="text-gray-600 line-clamp-2 leading-relaxed">{event.description}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          new Date(event.event_date) > new Date()
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {new Date(event.event_date) > new Date() ? 'Upcoming' : 'Past'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Tanggal</p>
                            <p className="text-sm font-semibold text-gray-900">{formatDate(event.event_date)}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Lokasi</p>
                            <p className="text-sm font-semibold text-gray-900 line-clamp-1">{event.location || 'TBA'}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Kapasitas</p>
                            <p className="text-sm font-semibold text-gray-900">{event.max_participants || '∞'} orang</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Harga</p>
                            <p className="text-sm font-semibold text-gray-900">{formatPrice(event.price || event.registration_fee)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {/* Edit Event Button */}
                      <Link
                        to={`/admin/events/edit/${event.id}`}
                        className="group/btn flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </Link>

                      {/* View Participants */}
                      <button
                        onClick={() => openParticipantsModal(event)}
                        className="group/btn flex items-center gap-2 bg-teal-50 hover:bg-teal-100 text-teal-600 hover:text-teal-700 px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                        title="Lihat data peserta event ini"
                      >
                        <Users className="w-4 h-4" />
                        Peserta
                        {event.approved_registrations !== undefined && (
                          <span className="ml-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
                            {event.approved_registrations}
                          </span>
                        )}
                      </button>

                      {/* Highlight Event Button */}
                      <button
                        onClick={() => handleToggleHighlight(event.id, event.is_highlighted)}
                        className={`group/btn flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                          event.is_highlighted
                            ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700 hover:text-yellow-800 border-2 border-yellow-400'
                            : 'bg-purple-50 hover:bg-purple-100 text-purple-600 hover:text-purple-700'
                        }`}
                        title={event.is_highlighted ? 'Event ini sedang di-highlight di homepage' : 'Set sebagai highlight event'}
                      >
                        <svg className="w-4 h-4" fill={event.is_highlighted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        {event.is_highlighted ? '★ Highlighted' : 'Set Highlight'}
                      </button>

                      {/* Export Report Dropdown - AVAILABLE FOR ALL EVENTS */}
                      <div className="relative group/export">
                        <button
                          className="group/btn flex items-center gap-2 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 text-blue-600 hover:text-blue-700 px-4 py-2 rounded-lg transition-all duration-200 font-medium border border-blue-200"
                          title="Download Laporan Event"
                        >
                          <Download className="w-4 h-4" />
                          Laporan
                        </button>
                        
                        {/* Dropdown Menu */}
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border-2 border-gray-100 opacity-0 invisible group-hover/export:opacity-100 group-hover/export:visible transition-all duration-200 z-10">
                          <div className="p-2 space-y-1">
                            <button
                              onClick={() => exportToExcel(event)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-green-50 rounded-lg transition-all group/item"
                            >
                              <FileSpreadsheet className="w-5 h-5 text-green-600" />
                              <div>
                                <div className="font-semibold text-gray-900 text-sm group-hover/item:text-green-600">Excel (.xlsx)</div>
                                <div className="text-xs text-gray-500">Laporan detail peserta</div>
                              </div>
                            </button>
                            
                            <button
                              onClick={() => exportToWord(event)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 rounded-lg transition-all group/item"
                            >
                              <FileText className="w-5 h-5 text-blue-600" />
                              <div>
                                <div className="font-semibold text-gray-900 text-sm group-hover/item:text-blue-600">Word (.docx)</div>
                                <div className="text-xs text-gray-500">Laporan format dokumen</div>
                              </div>
                            </button>
                            
                            <button
                              onClick={() => exportToCSV(event)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-orange-50 rounded-lg transition-all group/item"
                            >
                              <File className="w-5 h-5 text-orange-600" />
                              <div>
                                <div className="font-semibold text-gray-900 text-sm group-hover/item:text-orange-600">CSV (.csv)</div>
                                <div className="text-xs text-gray-500">Data untuk spreadsheet</div>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Certificate Buttons - Only show if event has_certificate */}
                      {event.has_certificate && (
                        <>
                          <button
                            onClick={() => handlePreviewCertificate(event)}
                            className="group/btn flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-600 hover:text-indigo-700 px-4 py-2 rounded-lg transition-all duration-200 font-medium border border-indigo-200"
                            title="Preview template sertifikat"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Preview
                          </button>
                          
                          <button
                            onClick={() => handleGenerateCertificates(event)}
                            disabled={generatingCertificates}
                            className="group/btn flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 text-green-600 hover:text-green-700 px-4 py-2 rounded-lg transition-all duration-200 font-medium border border-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Generate sertifikat untuk semua peserta yang hadir"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {generatingCertificates ? 'Generating...' : 'Generate Sertifikat'}
                          </button>
                        </>
                      )}
                      
                      {/* Archive/Restore Button - Conditional based on tab */}
                      {activeTab === 'active' ? (
                        <button
                          onClick={() => setArchiveConfirm({ show: true, eventId: event.id, action: 'archive' })}
                          className="group/btn flex items-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-600 hover:text-orange-700 px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                          title="Arsipkan event ini"
                        >
                          <Archive className="w-4 h-4" />
                          Archive
                        </button>
                      ) : (
                        <button
                          onClick={() => setArchiveConfirm({ show: true, eventId: event.id, action: 'restore' })}
                          className="group/btn flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-600 hover:text-green-700 px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                          title="Pulihkan event ini"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restore
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="group/btn flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {participantsModal.show && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6">
          <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-teal-600" />
                  Data Peserta
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {participantsModal.event?.title || 'Event'} ·{' '}
                  {participantsModal.loading
                    ? 'memuat data...'
                    : `${participantsModal.participants.length} peserta`}
                </p>
              </div>
              <button
                type="button"
                onClick={closeParticipantsModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              {participantsModal.loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <div className="mb-3 h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
                  Memuat data peserta...
                </div>
              ) : participantsModal.participants.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 py-16 text-center text-gray-500">
                  <Users className="mb-3 h-10 w-10" />
                  <p className="font-semibold text-gray-700">Belum ada peserta terdaftar</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Pendaftaran event ini belum menerima data peserta.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Peserta
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Kontak
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Daftar Pada
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {participantsModal.participants.map((participant) => (
                        <tr key={participant.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">
                              {participant.full_name ||
                                participant.user_name ||
                                'Peserta'}
                            </p>
                            {participant.institution && (
                              <p className="text-xs text-gray-500">
                                {participant.institution}
                              </p>
                            )}
                            {participant.address && (
                              <p className="text-xs text-gray-400 mt-1">
                                {participant.address}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            <div>{participant.email || participant.user_email || '-'}</div>
                            <div className="text-xs text-gray-500">
                              {participant.phone || participant.user_phone || '-'}
                            </div>
                            {(participant.city || participant.province) && (
                              <div className="text-xs text-gray-400">
                                {[participant.city, participant.province].filter(Boolean).join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                                participant.status === 'confirmed'
                                  ? 'bg-green-100 text-green-700'
                                  : participant.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : participant.status === 'cancelled'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {participant.status || 'pending'}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              Pembayaran:{' '}
                              <span className="font-semibold text-gray-700">
                                {participant.payment_status || 'pending'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {participant.created_at
                              ? new Date(participant.created_at).toLocaleString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Event Full Page Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 z-50 overflow-y-auto">
          <div className="min-h-screen">
            {/* Header with back button */}
            <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
              <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">Buat Event Baru</h2>
                      <p className="text-gray-600">Isi detail event yang akan Anda buat</p>
                    </div>
                  </div>
                  <button
                    type="submit"
                    form="create-event-form"
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        Menyimpan...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Simpan Event
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
              <form id="create-event-form" onSubmit={handleCreateEvent} className="space-y-8" noValidate>
              {/* Grid layout: Form left, Live preview right */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Judul Event *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Masukkan judul event yang menarik"
                />
                {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Deskripsi Event *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  placeholder="Deskripsikan event Anda secara detail..."
                />
                {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
              </div>

              {/* Short description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Deskripsi Singkat</label>
                <input
                  type="text"
                  name="short_description"
                  value={formData.short_description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Ringkasan 1-2 kalimat untuk kartu event"
                />
                <p className="text-xs text-gray-500 mt-1">Otomatis dipotong hingga 200 karakter saat disimpan</p>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Foto Event
                </label>
                <div className="mt-1">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-xl border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Klik untuk upload</span> atau drag and drop</p>
                        <p className="text-xs text-gray-500">PNG, JPG, JPEG (MAX. 5MB)</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Upload foto untuk menarik lebih banyak peserta</p>
                
                {/* Aspect Ratio Selector */}
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Aspect Ratio Foto Card
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image_aspect_ratio: '9:16' }))}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.image_aspect_ratio === '9:16'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className={`w-12 h-20 rounded border-2 ${
                          formData.image_aspect_ratio === '9:16' ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-gray-100'
                        }`}></div>
                        <span className={`text-sm font-medium ${
                          formData.image_aspect_ratio === '9:16' ? 'text-blue-600' : 'text-gray-700'
                        }`}>9:16 Portrait</span>
                      </div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image_aspect_ratio: '1:1' }))}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.image_aspect_ratio === '1:1'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className={`w-16 h-16 rounded border-2 ${
                          formData.image_aspect_ratio === '1:1' ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-gray-100'
                        }`}></div>
                        <span className={`text-sm font-medium ${
                          formData.image_aspect_ratio === '1:1' ? 'text-blue-600' : 'text-gray-700'
                        }`}>1:1 Square</span>
                      </div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image_aspect_ratio: '16:9' }))}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.image_aspect_ratio === '16:9'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className={`w-20 h-12 rounded border-2 ${
                          formData.image_aspect_ratio === '16:9' ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-gray-100'
                        }`}></div>
                        <span className={`text-sm font-medium ${
                          formData.image_aspect_ratio === '16:9' ? 'text-blue-600' : 'text-gray-700'
                        }`}>16:9 Landscape</span>
                      </div>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Pilih aspect ratio yang sesuai dengan desain foto event Anda
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Date & Time */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tanggal & Waktu Mulai *
                  </label>
                  <input
                    type="datetime-local"
                    name="event_date"
                    value={formData.event_date}
                    onChange={handleInputChange}
                    required
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">Event harus dimulai dari sekarang atau di masa depan</p>
                  {errors.event_date && <p className="text-sm text-red-600 mt-1">{errors.event_date}</p>}
                </div>

                {/* End Date & Time */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tanggal & Waktu Selesai (opsional)
                  </label>
                  <input
                    type="datetime-local"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    min={formData.event_date || new Date().toISOString().slice(0, 16)}
                    disabled={!formData.event_date}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {!formData.event_date 
                      ? '⚠️ Pilih tanggal mulai terlebih dahulu' 
                      : 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai'}
                  </p>
                  {errors.end_date && <p className="text-sm text-red-600 mt-1">{errors.end_date}</p>}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Kategori *
                  </label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Pilih kategori</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.category_id && <p className="text-sm text-red-600 mt-1">{errors.category_id}</p>}
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Event Online?</label>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" name="is_online" checked={formData.is_online} onChange={handleInputChange} className="w-5 h-5" />
                    <span className="text-gray-600 text-sm">Centang jika event dilaksanakan online</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                    <option value="draft">draft</option>
                    <option value="published">published</option>
                    <option value="archived">archived</option>
                  </select>
                </div>
              </div>

              {!formData.is_online && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Lokasi/Venue *</label>
                    <input type="text" name="location" value={formData.location} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900" placeholder="Nama venue atau link meeting" />
                    {errors.location && <p className="text-sm text-red-600 mt-1">{errors.location}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Alamat</label>
                    <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900" placeholder="Alamat lengkap" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Kota</label>
                    <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Provinsi</label>
                    <input type="text" name="province" value={formData.province} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Max Participants */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Maksimal Peserta *
                  </label>
                  
                  {/* Unlimited Participants Checkbox */}
                  <div className="mb-3 flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200">
                    <input 
                      type="checkbox" 
                      name="unlimited_participants" 
                      checked={formData.unlimited_participants} 
                      onChange={handleInputChange} 
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" 
                    />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-gray-900">Unlimited Participants</span>
                      <p className="text-xs text-gray-600">No limit on participant registration</p>
                    </div>
                  </div>
                  
                  {/* Max Participants Input - Hidden if unlimited */}
                  {!formData.unlimited_participants && (
                    <>
                      <input
                        type="number"
                        name="max_participants"
                        value={formData.max_participants}
                        onChange={handleInputChange}
                        required={!formData.unlimited_participants}
                        min="1"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Contoh: 100"
                      />
                      <p className="text-xs text-gray-500 mt-1">Masukkan jumlah maksimal peserta</p>
                    </>
                  )}
                  
                  {/* Show message when unlimited */}
                  {formData.unlimited_participants && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700 font-medium">✓ Peserta tidak terbatas</p>
                    </div>
                  )}
                </div>

                {/* Registration Fee */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Harga Tiket (Rp) *
                  </label>
                  
                  {/* Checkboxes */}
                  <div className="mb-4 space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors border border-green-200">
                      <input 
                        type="checkbox" 
                        name="is_free" 
                        checked={formData.is_free} 
                        onChange={handleInputChange} 
                        className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500" 
                      />
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-gray-900">Free Event</span>
                        <p className="text-xs text-gray-600">This event is free for all participants</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg hover:from-purple-100 hover:to-pink-100 transition-colors border border-purple-200">
                      <input 
                        type="checkbox" 
                        name="has_certificate" 
                        checked={formData.has_certificate} 
                        onChange={handleInputChange} 
                        className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500" 
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">Certificate Available</span>
                          <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full">NEW</span>
                        </div>
                        <p className="text-xs text-gray-600">Participants will receive a certificate upon completion</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Price Input - Hidden if free */}
                  {!formData.is_free && (
                    <>
                      <input
                        type="number"
                        name="registration_fee"
                        value={formData.registration_fee}
                        onChange={handleInputChange}
                        required={!formData.is_free}
                        min="0"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Contoh: 50000"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Masukkan harga tiket dalam Rupiah (harga normal yang akan
                        digunakan untuk semua peserta)
                      </p>
                    </>
                  )}
                  
                  {/* Show message when free */}
                  {formData.is_free && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700 font-medium">✓ Event Gratis - Tidak ada biaya pendaftaran</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Batas Pendaftaran (opsional)</label>
                  <input type="date" name="registration_deadline" value={formData.registration_deadline} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tag (pisahkan dengan koma)</label>
                  <input type="text" name="tags" value={formData.tags} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900" placeholder="tech, workshop, seminar" />
                </div>
              </div>

              {/* Line-ups / Performers Section */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span>🎤</span> Line-ups / Performers
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Tambahkan performer atau pembicara untuk event ini</p>
                  </div>
                  <button
                    type="button"
                    onClick={addPerformerInput}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Tambah Performer
                  </button>
                </div>

                <div className="space-y-4">
                  {performerInputs.map((performer, index) => (
                    <div key={index} className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
                      <div className="flex items-start gap-4">
                        {/* Photo Preview/Upload */}
                        <div className="flex-shrink-0">
                          <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-300 bg-white">
                            {performer.photoPreview ? (
                              <div className="relative w-full h-full">
                                <img 
                                  src={performer.photoPreview} 
                                  alt="Performer preview" 
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => removePerformerPhoto(index)}
                                  className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                                <svg className="w-8 h-8 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-xs text-gray-500 text-center px-1">Upload Foto</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handlePerformerPhotoChange(index, e)}
                                />
                              </label>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 text-center">Max 5MB</p>
                        </div>

                        {/* Name Input */}
                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Nama Performer {index + 1}
                          </label>
                          <input
                            type="text"
                            value={performer.name}
                            onChange={(e) => handlePerformerNameChange(index, e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Nama performer atau pembicara"
                          />
                        </div>

                        {/* Remove Button */}
                        {performerInputs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePerformerInput(index)}
                            className="flex-shrink-0 mt-7 p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                            title="Hapus performer"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {performerInputs.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-500">Belum ada performer. Klik "Tambah Performer" untuk menambahkan.</p>
                  </div>
                )}
              </div>

                </div>

                {/* Live Preview - Larger with 16:9 aspect ratio */}
                <div className="hidden lg:block">
                  <div className="sticky top-24">
                    <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-2xl p-6 shadow-xl">
                      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Preview Kartu Event
                      </h3>
                      <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
                        {/* Image with dynamic aspect ratio */}
                        <div className="w-full" style={{ aspectRatio: formData.image_aspect_ratio?.replace(':', '/') || '16/9' }}>
                          {imagePreview ? (
                            <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                              <svg className="w-16 h-16 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="text-gray-400 text-sm font-medium">Belum ada gambar</p>
                              <p className="text-gray-400 text-xs">{formData.image_aspect_ratio || '16:9'} aspect ratio</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Event Details */}
                        <div className="p-6 text-gray-900">
                          <div className="mb-3">
                            <h4 className="text-2xl font-bold mb-2 line-clamp-2">
                              {formData.title || 'Judul Event Anda'}
                            </h4>
                            <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                              {formData.short_description || formData.description || 'Deskripsi singkat event akan muncul di sini. Tulis deskripsi yang menarik untuk menarik perhatian peserta.'}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{formData.event_date ? new Date(formData.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Tanggal belum dipilih'}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xl font-bold text-blue-600">
                                {parseFloat(formData.registration_fee || 0) === 0 ? 'Gratis' : `Rp ${Number(formData.registration_fee).toLocaleString('id-ID')}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Info Text */}
                      <p className="text-xs text-blue-100 mt-3 text-center">
                        Preview ini menunjukkan bagaimana event Anda akan tampil di halaman utama
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Preview Modal - Professional Template */}
      {showCertificatePreview && selectedEventForCert && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Preview Template Sertifikat</h2>
                  <p className="text-blue-100">Template sertifikat untuk: {selectedEventForCert.title}</p>
                </div>
                <button
                  onClick={() => setShowCertificatePreview(false)}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Certificate Template */}
            <div className="p-8">
              <div 
                className="bg-white border-8 border-double border-blue-600 rounded-2xl p-12 shadow-xl"
                style={{
                  backgroundImage: `
                    linear-gradient(to bottom right, rgba(59, 130, 246, 0.03), rgba(147, 51, 234, 0.03)),
                    repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(59, 130, 246, 0.03) 10px, rgba(59, 130, 246, 0.03) 20px)
                  `
                }}
              >
                {/* Corner Ornaments */}
                <div className="relative">
                  {/* Top Left Ornament */}
                  <div className="absolute top-0 left-0 w-24 h-24">
                    <svg viewBox="0 0 100 100" className="text-blue-600 opacity-20">
                      <path d="M0,0 L100,0 L100,20 C70,20 50,40 50,70 L50,100 L30,100 C30,70 10,50 0,20 Z" fill="currentColor"/>
                    </svg>
                  </div>
                  
                  {/* Top Right Ornament */}
                  <div className="absolute top-0 right-0 w-24 h-24 rotate-90">
                    <svg viewBox="0 0 100 100" className="text-purple-600 opacity-20">
                      <path d="M0,0 L100,0 L100,20 C70,20 50,40 50,70 L50,100 L30,100 C30,70 10,50 0,20 Z" fill="currentColor"/>
                    </svg>
                  </div>
                  
                  {/* Bottom Left Ornament */}
                  <div className="absolute bottom-0 left-0 w-24 h-24 -rotate-90">
                    <svg viewBox="0 0 100 100" className="text-purple-600 opacity-20">
                      <path d="M0,0 L100,0 L100,20 C70,20 50,40 50,70 L50,100 L30,100 C30,70 10,50 0,20 Z" fill="currentColor"/>
                    </svg>
                  </div>
                  
                  {/* Bottom Right Ornament */}
                  <div className="absolute bottom-0 right-0 w-24 h-24 rotate-180">
                    <svg viewBox="0 0 100 100" className="text-blue-600 opacity-20">
                      <path d="M0,0 L100,0 L100,20 C70,20 50,40 50,70 L50,100 L30,100 C30,70 10,50 0,20 Z" fill="currentColor"/>
                    </svg>
                  </div>

                  {/* Certificate Content */}
                  <div className="text-center relative z-10">
                    {/* Logo/Emblem */}
                    <div className="mb-6 flex justify-center">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      </div>
                    </div>

                    {/* Header */}
                    <div className="mb-8">
                      <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                        CERTIFICATE
                      </h1>
                      <div className="w-48 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto mb-4"></div>
                      <p className="text-xl text-gray-700 font-semibold">OF COMPLETION</p>
                    </div>

                    {/* Awarded To */}
                    <div className="mb-8">
                      <p className="text-gray-600 text-lg mb-4">This is proudly presented to</p>
                      <h2 className="text-4xl font-bold text-gray-900 mb-2 border-b-2 border-blue-600 inline-block px-8 pb-2">
                        [PARTICIPANT NAME]
                      </h2>
                    </div>

                    {/* Event Details */}
                    <div className="mb-8 max-w-2xl mx-auto">
                      <p className="text-gray-700 text-base leading-relaxed">
                        For successfully completing and attending
                      </p>
                      <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 my-4">
                        {selectedEventForCert.title}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Held on {new Date(selectedEventForCert.event_date).toLocaleDateString('en-US', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                      {selectedEventForCert.location && (
                        <p className="text-gray-600 text-sm">
                          at {selectedEventForCert.location}
                        </p>
                      )}
                    </div>

                    {/* Footer with Signature */}
                    <div className="grid grid-cols-2 gap-12 mt-12 max-w-2xl mx-auto">
                      {/* Date */}
                      <div className="text-center">
                        <div className="border-t-2 border-gray-300 pt-2">
                          <p className="text-sm font-semibold text-gray-900">
                            {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">Date of Issue</p>
                        </div>
                      </div>

                      {/* Signature */}
                      <div className="text-center">
                        <div className="border-t-2 border-gray-300 pt-2">
                          <p className="text-sm font-semibold text-gray-900">Event Yukk Platform</p>
                          <p className="text-xs text-gray-600 mt-1">Authorized Signature</p>
                        </div>
                      </div>
                    </div>

                    {/* Certificate ID */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Certificate ID: CERT-{selectedEventForCert.id}-XXXX-XXXX
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Verify at: https://eventyukk.com/verify
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Text */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-1">Informasi Template Sertifikat</p>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• Nama peserta akan otomatis terisi saat generate</li>
                      <li>• Certificate ID unik akan digenerate untuk setiap peserta</li>
                      <li>• Template ini akan digunakan untuk semua peserta yang attend event ini</li>
                      <li>• Design profesional dengan border elegant dan ornamen sudut</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setShowCertificatePreview(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-all"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    setShowCertificatePreview(false);
                    handleGenerateCertificates(selectedEventForCert);
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  Generate Sertifikat Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, id: null })}
        onConfirm={confirmDelete}
        title="Konfirmasi Hapus Event"
        message="Apakah Anda yakin ingin menghapus event ini? Data yang sudah dihapus tidak dapat dikembalikan."
        confirmText="Ya, Hapus"
        cancelText="Batal"
        type="danger"
      />

      {/* Generate Certificates Confirmation Modal */}
      <ConfirmModal
        isOpen={generateConfirm.show}
        onClose={() => setGenerateConfirm({ show: false, event: null })}
        onConfirm={confirmGenerateCertificates}
        title="Generate Sertifikat"
        message={`Generate sertifikat untuk semua peserta yang telah attend event "${generateConfirm.event?.title}"?`}
        confirmText="Ya, Generate"
        cancelText="Batal"
        type="info"
      />

      {/* Archive/Restore Confirmation Modal */}
      <ConfirmModal
        isOpen={archiveConfirm.show}
        onClose={() => setArchiveConfirm({ show: false, eventId: null, action: 'archive' })}
        onConfirm={() => {
          if (archiveConfirm.action === 'archive') {
            handleArchiveEvent(archiveConfirm.eventId);
          } else {
            handleRestoreEvent(archiveConfirm.eventId);
          }
        }}
        title={archiveConfirm.action === 'archive' ? 'Archive Event' : 'Restore Event'}
        message={
          archiveConfirm.action === 'archive'
            ? 'Event akan diarsipkan dan tidak muncul di public listing. Data history dan certificate tetap tersimpan. Anda bisa restore kapan saja.'
            : 'Event akan dipulihkan dan kembali muncul di public listing.'
        }
        confirmText={archiveConfirm.action === 'archive' ? 'Ya, Archive' : 'Ya, Restore'}
        cancelText="Batal"
        type={archiveConfirm.action === 'archive' ? 'warning' : 'info'}
      />
    </div>
  );
};

export default EventsManagement;
