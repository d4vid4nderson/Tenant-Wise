'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/Modal';
import { FiTool, FiPlus, FiEdit2, FiTrash2, FiPhone, FiMail, FiX, FiUser } from 'react-icons/fi';

interface Contractor {
  id: string;
  name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  specialty: string;
  notes: string | null;
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

export default function ContractorsCard() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null }>({ show: false, id: null });
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    phone: '',
    email: '',
    specialty: 'general',
    notes: '',
  });

  useEffect(() => {
    loadContractors();
  }, []);

  const loadContractors = async () => {
    try {
      const response = await fetch('/api/contractors');
      const data = await response.json();
      if (data.success) {
        setContractors(data.data || []);
      }
    } catch (error) {
      console.error('Error loading contractors:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingContractor(null);
    setFormData({
      name: '',
      company_name: '',
      phone: '',
      email: '',
      specialty: 'general',
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (contractor: Contractor) => {
    setEditingContractor(contractor);
    setFormData({
      name: contractor.name,
      company_name: contractor.company_name || '',
      phone: contractor.phone || '',
      email: contractor.email || '',
      specialty: contractor.specialty,
      notes: contractor.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingContractor
        ? `/api/contractors/${editingContractor.id}`
        : '/api/contractors';
      const method = editingContractor ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadContractors();
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error saving contractor:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm({ show: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;

    try {
      const response = await fetch(`/api/contractors/${deleteConfirm.id}`, { method: 'DELETE' });
      if (response.ok) {
        await loadContractors();
      }
    } catch (error) {
      console.error('Error deleting contractor:', error);
    } finally {
      setDeleteConfirm({ show: false, id: null });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <FiTool className="w-4 h-4 text-orange-600" />
              My Contractors
            </CardTitle>
            <button
              onClick={openAddModal}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Add contractor"
            >
              <FiPlus className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : contractors.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FiTool className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">No contractors added yet</p>
              <button
                onClick={openAddModal}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Add your first contractor
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {contractors.map((contractor) => (
                <div
                  key={contractor.id}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">{contractor.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSpecialtyStyle(contractor.specialty)}`}>
                          {getSpecialtyLabel(contractor.specialty)}
                        </span>
                      </div>
                      {contractor.company_name && (
                        <p className="text-xs text-muted-foreground truncate">{contractor.company_name}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        {contractor.phone && (
                          <a
                            href={`tel:${contractor.phone}`}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600"
                          >
                            <FiPhone className="w-3 h-3" />
                            {contractor.phone}
                          </a>
                        )}
                        {contractor.email && (
                          <a
                            href={`mailto:${contractor.email}`}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600"
                          >
                            <FiMail className="w-3 h-3" />
                            {contractor.email}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(contractor)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <FiEdit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(contractor.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingContractor ? 'Edit Contractor' : 'Add Contractor'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Smith"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Company Name</label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ABC Plumbing Co."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <div className="relative">
                    <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Specialty *</label>
                <select
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  placeholder="Additional notes about this contractor..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingContractor ? 'Update' : 'Add Contractor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, id: null })}
        onConfirm={confirmDelete}
        title="Delete Contractor"
        message="Are you sure you want to delete this contractor? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
