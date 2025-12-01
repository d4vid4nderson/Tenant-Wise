'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  FiTool,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiPhone,
  FiMail,
  FiX,
  FiUser,
  FiSearch,
  FiAlertTriangle,
  FiFileText,
  FiDollarSign,
  FiCalendar,
  FiCheck,
  FiClock,
  FiHome,
} from 'react-icons/fi';

interface Contractor {
  id: string;
  name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  specialty: string;
  notes: string | null;
}

interface Property {
  id: string;
  address_line1: string;
  city: string;
}

interface Invoice {
  id: string;
  contractor_id: string;
  property_id: string | null;
  invoice_number: string | null;
  description: string;
  amount: number;
  status: 'unpaid' | 'paid' | 'overdue';
  invoice_date: string;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  contractor?: { id: string; name: string; company_name: string | null } | null;
  property?: { id: string; address_line1: string; city: string } | null;
}

const SPECIALTY_OPTIONS = [
  { value: 'plumbing', label: 'Plumbing', color: 'bg-blue-100 text-blue-700' },
  { value: 'electrical', label: 'Electrical', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'hvac', label: 'HVAC', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'appliance', label: 'Appliance Repair', color: 'bg-purple-100 text-purple-700' },
  { value: 'roofing', label: 'Roofing', color: 'bg-orange-100 text-orange-700' },
  { value: 'landscaping', label: 'Landscaping', color: 'bg-green-100 text-green-700' },
  { value: 'painting', label: 'Painting', color: 'bg-pink-100 text-pink-700' },
  { value: 'cleaning', label: 'Cleaning', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'general', label: 'General/Handyman', color: 'bg-gray-100 text-gray-700' },
  { value: 'other', label: 'Other', color: 'bg-slate-100 text-slate-700' },
];

const getSpecialtyStyle = (specialty: string) => {
  const option = SPECIALTY_OPTIONS.find(o => o.value === specialty);
  return option?.color || 'bg-gray-100 text-gray-700';
};

const getSpecialtyLabel = (specialty: string) => {
  const option = SPECIALTY_OPTIONS.find(o => o.value === specialty);
  return option?.label || specialty;
};

const STATUS_COLORS = {
  unpaid: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
};

export default function ContractorsPage() {
  const [activeTab, setActiveTab] = useState<'contractors' | 'invoices'>('contractors');
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Contractor modal state
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [savingContractor, setSavingContractor] = useState(false);
  const [contractorFormData, setContractorFormData] = useState({
    name: '',
    company_name: '',
    phone: '',
    email: '',
    specialty: 'general',
    notes: '',
  });

  // Invoice modal state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [invoiceFormData, setInvoiceFormData] = useState({
    contractor_id: '',
    property_id: '',
    invoice_number: '',
    description: '',
    amount: '',
    status: 'unpaid' as 'unpaid' | 'paid' | 'overdue',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: '',
  });

  // Delete modals
  const [showDeleteContractorModal, setShowDeleteContractorModal] = useState(false);
  const [contractorToDelete, setContractorToDelete] = useState<Contractor | null>(null);
  const [showDeleteInvoiceModal, setShowDeleteInvoiceModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState('');
  const [filterInvoiceContractor, setFilterInvoiceContractor] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contractorsRes, invoicesRes, propertiesRes] = await Promise.all([
        fetch('/api/contractors'),
        fetch('/api/invoices'),
        fetch('/api/properties'),
      ]);

      const contractorsData = await contractorsRes.json();
      const invoicesData = await invoicesRes.json();
      const propertiesData = await propertiesRes.json();

      if (contractorsData.success) setContractors(contractorsData.data || []);
      if (invoicesData.success) setInvoices(invoicesData.data || []);
      if (propertiesData.success) setProperties(propertiesData.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Contractor handlers
  const openAddContractor = () => {
    setEditingContractor(null);
    setContractorFormData({
      name: '',
      company_name: '',
      phone: '',
      email: '',
      specialty: 'general',
      notes: '',
    });
    setShowContractorModal(true);
  };

  const openEditContractor = (contractor: Contractor) => {
    setEditingContractor(contractor);
    setContractorFormData({
      name: contractor.name,
      company_name: contractor.company_name || '',
      phone: contractor.phone || '',
      email: contractor.email || '',
      specialty: contractor.specialty,
      notes: contractor.notes || '',
    });
    setShowContractorModal(true);
  };

  const handleSaveContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingContractor(true);

    try {
      const url = editingContractor
        ? `/api/contractors/${editingContractor.id}`
        : '/api/contractors';
      const method = editingContractor ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractorFormData),
      });

      if (response.ok) {
        await loadData();
        setShowContractorModal(false);
      }
    } catch (error) {
      console.error('Error saving contractor:', error);
    } finally {
      setSavingContractor(false);
    }
  };

  const handleDeleteContractor = async () => {
    if (!contractorToDelete) return;

    try {
      const response = await fetch(`/api/contractors/${contractorToDelete.id}`, { method: 'DELETE' });
      if (response.ok) {
        await loadData();
        setShowDeleteContractorModal(false);
        setContractorToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting contractor:', error);
    }
  };

  // Invoice handlers
  const openAddInvoice = () => {
    setEditingInvoice(null);
    setInvoiceFormData({
      contractor_id: '',
      property_id: '',
      invoice_number: '',
      description: '',
      amount: '',
      status: 'unpaid',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      notes: '',
    });
    setShowInvoiceModal(true);
  };

  const openEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setInvoiceFormData({
      contractor_id: invoice.contractor_id,
      property_id: invoice.property_id || '',
      invoice_number: invoice.invoice_number || '',
      description: invoice.description,
      amount: invoice.amount.toString(),
      status: invoice.status,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date || '',
      notes: invoice.notes || '',
    });
    setShowInvoiceModal(true);
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInvoice(true);

    try {
      const url = editingInvoice
        ? `/api/invoices/${editingInvoice.id}`
        : '/api/invoices';
      const method = editingInvoice ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...invoiceFormData,
          amount: parseFloat(invoiceFormData.amount) || 0,
        }),
      });

      if (response.ok) {
        await loadData();
        setShowInvoiceModal(false);
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    try {
      const response = await fetch(`/api/invoices/${invoiceToDelete.id}`, { method: 'DELETE' });
      if (response.ok) {
        await loadData();
        setShowDeleteInvoiceModal(false);
        setInvoiceToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
    }
  };

  const markAsPaid = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...invoice,
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0],
        }),
      });

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
    }
  };

  // Filter contractors
  const filteredContractors = contractors.filter(c => {
    const matchesSearch = searchQuery === '' ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.company_name && c.company_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSpecialty = filterSpecialty === '' || c.specialty === filterSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesStatus = filterInvoiceStatus === '' || inv.status === filterInvoiceStatus;
    const matchesContractor = filterInvoiceContractor === '' || inv.contractor_id === filterInvoiceContractor;
    return matchesStatus && matchesContractor;
  });

  // Calculate stats
  const unpaidTotal = invoices
    .filter(i => i.status === 'unpaid' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.amount, 0);
  const paidTotal = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <div>
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 -mx-8 -mt-8 px-8 pt-8 pb-12 mb-8 rounded-b-3xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Contractors & Invoices</h1>
            <p className="text-orange-100">Manage your service providers and track payments</p>
          </div>
          <button
            onClick={activeTab === 'contractors' ? openAddContractor : openAddInvoice}
            className="flex items-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 transition-colors font-medium shadow-lg"
          >
            <FiPlus className="w-4 h-4" />
            {activeTab === 'contractors' ? 'Add Contractor' : 'Add Invoice'}
          </button>
        </div>
      </div>

      {/* Stats Cards - Compact style matching other pages */}
      <div className="grid grid-cols-4 gap-3 mb-6 -mt-6">
        <Card className="!border-orange-200">
          <CardContent className="py-2 px-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-50 rounded">
                <FiTool className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <p className="text-xl font-bold text-orange-600">{contractors.length}</p>
                <p className="text-xs text-muted-foreground">Contractors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="!border-yellow-200">
          <CardContent className="py-2 px-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-yellow-50 rounded">
                <FiClock className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <p className="text-xl font-bold text-yellow-600">${unpaidTotal.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Unpaid</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="!border-green-200">
          <CardContent className="py-2 px-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-50 rounded">
                <FiCheck className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <p className="text-xl font-bold text-green-600">${paidTotal.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="!border-blue-200">
          <CardContent className="py-2 px-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 rounded">
                <FiFileText className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <p className="text-xl font-bold text-blue-600">{invoices.length}</p>
                <p className="text-xs text-muted-foreground">Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('contractors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'contractors'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <FiTool className="w-4 h-4" />
          Contractors
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'invoices'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <FiFileText className="w-4 h-4" />
          Invoices
        </button>
      </div>

      {/* Contractors Tab */}
      {activeTab === 'contractors' && (
        <>
          {/* Search and Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search contractors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <select
                  value={filterSpecialty}
                  onChange={(e) => setFilterSpecialty(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="">All Specialties</option>
                  {SPECIALTY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Contractors List */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : filteredContractors.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiTool className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    {contractors.length === 0 ? 'No contractors yet' : 'No matching contractors'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {contractors.length === 0
                      ? 'Add your first contractor to get started'
                      : 'Try adjusting your search or filters'}
                  </p>
                  {contractors.length === 0 && (
                    <button
                      onClick={openAddContractor}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                      <FiPlus className="w-4 h-4" />
                      Add Contractor
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredContractors.map((contractor) => (
                    <div
                      key={contractor.id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FiUser className="w-6 h-6 text-orange-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-semibold text-lg">{contractor.name}</h3>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSpecialtyStyle(contractor.specialty)}`}>
                                {getSpecialtyLabel(contractor.specialty)}
                              </span>
                            </div>
                            {contractor.company_name && (
                              <p className="text-muted-foreground mb-2">{contractor.company_name}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-4">
                              {contractor.phone && (
                                <a
                                  href={`tel:${contractor.phone}`}
                                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-orange-600"
                                >
                                  <FiPhone className="w-4 h-4" />
                                  {contractor.phone}
                                </a>
                              )}
                              {contractor.email && (
                                <a
                                  href={`mailto:${contractor.email}`}
                                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-orange-600"
                                >
                                  <FiMail className="w-4 h-4" />
                                  {contractor.email}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditContractor(contractor)}
                            className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setContractorToDelete(contractor);
                              setShowDeleteContractorModal(true);
                            }}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <>
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <select
                  value={filterInvoiceStatus}
                  onChange={(e) => setFilterInvoiceStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
                <select
                  value={filterInvoiceContractor}
                  onChange={(e) => setFilterInvoiceContractor(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="">All Contractors</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Invoices List */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiFileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    {invoices.length === 0 ? 'No invoices yet' : 'No matching invoices'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {invoices.length === 0
                      ? 'Add your first invoice to start tracking payments'
                      : 'Try adjusting your filters'}
                  </p>
                  {invoices.length === 0 && (
                    <button
                      onClick={openAddInvoice}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                      <FiPlus className="w-4 h-4" />
                      Add Invoice
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[invoice.status]}`}>
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </span>
                            {invoice.invoice_number && (
                              <span className="text-sm text-muted-foreground">#{invoice.invoice_number}</span>
                            )}
                          </div>
                          <h3 className="font-semibold mb-1">{invoice.description}</h3>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FiUser className="w-3 h-3" />
                              {invoice.contractor?.name || 'Unknown'}
                            </span>
                            {invoice.property && (
                              <span className="flex items-center gap-1">
                                <FiHome className="w-3 h-3" />
                                {invoice.property.address_line1}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <FiCalendar className="w-3 h-3" />
                              {new Date(invoice.invoice_date).toLocaleDateString()}
                            </span>
                            {invoice.due_date && (
                              <span className="flex items-center gap-1">
                                Due: {new Date(invoice.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xl font-bold">${invoice.amount.toLocaleString()}</p>
                            {invoice.status === 'paid' && invoice.paid_date && (
                              <p className="text-xs text-muted-foreground">
                                Paid {new Date(invoice.paid_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {invoice.status !== 'paid' && (
                              <button
                                onClick={() => markAsPaid(invoice)}
                                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Mark as Paid"
                              >
                                <FiCheck className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => openEditInvoice(invoice)}
                              className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setInvoiceToDelete(invoice);
                                setShowDeleteInvoiceModal(true);
                              }}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Contractor Modal */}
      {showContractorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">
                {editingContractor ? 'Edit Contractor' : 'Add Contractor'}
              </h2>
              <button
                onClick={() => setShowContractorModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContractor} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={contractorFormData.name}
                  onChange={(e) => setContractorFormData({ ...contractorFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="John Smith"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Company Name</label>
                <input
                  type="text"
                  value={contractorFormData.company_name}
                  onChange={(e) => setContractorFormData({ ...contractorFormData, company_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="ABC Plumbing Co."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    value={contractorFormData.phone}
                    onChange={(e) => setContractorFormData({ ...contractorFormData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={contractorFormData.email}
                    onChange={(e) => setContractorFormData({ ...contractorFormData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Specialty *</label>
                <select
                  value={contractorFormData.specialty}
                  onChange={(e) => setContractorFormData({ ...contractorFormData, specialty: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  required
                >
                  {SPECIALTY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={contractorFormData.notes}
                  onChange={(e) => setContractorFormData({ ...contractorFormData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContractorModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingContractor}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {savingContractor ? 'Saving...' : editingContractor ? 'Update' : 'Add Contractor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">
                {editingInvoice ? 'Edit Invoice' : 'Add Invoice'}
              </h2>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Contractor *</label>
                <select
                  value={invoiceFormData.contractor_id}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, contractor_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  required
                >
                  <option value="">Select a contractor...</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company_name && `(${c.company_name})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Property (optional)</label>
                <select
                  value={invoiceFormData.property_id}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, property_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="">No property selected</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.address_line1}, {p.city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Invoice Number</label>
                  <input
                    type="text"
                    value={invoiceFormData.invoice_number}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoice_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="INV-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount *</label>
                  <div className="relative">
                    <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      value={invoiceFormData.amount}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, amount: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <input
                  type="text"
                  value={invoiceFormData.description}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="HVAC repair service"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceFormData.invoice_date}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoice_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    value={invoiceFormData.due_date}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, due_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={invoiceFormData.status}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, status: e.target.value as 'unpaid' | 'paid' | 'overdue' })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={invoiceFormData.notes}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingInvoice}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {savingInvoice ? 'Saving...' : editingInvoice ? 'Update' : 'Add Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Contractor Modal */}
      {showDeleteContractorModal && contractorToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiAlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-center mb-2">Delete Contractor</h2>
              <p className="text-center text-muted-foreground mb-6">
                Are you sure you want to delete <span className="font-medium text-foreground">{contractorToDelete.name}</span>? This will also delete all associated invoices. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteContractorModal(false);
                    setContractorToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteContractor}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Invoice Modal */}
      {showDeleteInvoiceModal && invoiceToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiAlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-center mb-2">Delete Invoice</h2>
              <p className="text-center text-muted-foreground mb-6">
                Are you sure you want to delete this invoice for <span className="font-medium text-foreground">${invoiceToDelete.amount.toLocaleString()}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteInvoiceModal(false);
                    setInvoiceToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteInvoice}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
