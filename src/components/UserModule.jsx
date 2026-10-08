import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  ShieldCheck,
  User as UserIcon,
  RefreshCw,
  AlertCircle,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import { userService } from '../services/api';
import { INDIAN_STATES } from '../utils/states';
import Pagination from './Pagination';
import DeleteConfirmModal from './DeleteConfirmModal';

export default function UserModule({ companyState }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    role: 'USER',
    fullAddress: '',
    state: companyState || 'Gujarat',
    city: '',
    gstNumber: '',
    contactNumber: '',
    email: ''
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await userService.getAll(roleFilter, search);
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [roleFilter, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, search]);

  const totalItems = users.length;
  const paginatedUsers = users.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openAddModal = (defaultRole = 'USER') => {
    setEditingUser(null);
    setFormData({
      name: '',
      role: defaultRole,
      fullAddress: '',
      state: companyState || 'Gujarat',
      city: '',
      gstNumber: '',
      contactNumber: '',
      email: ''
    });
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    const existingGst = user.gstNumber || user.gstin || (user.pincode && user.pincode.length > 6 ? user.pincode : '') || '';
    setFormData({
      name: user.name || '',
      role: user.role || 'USER',
      fullAddress: user.fullAddress || '',
      state: user.state || companyState || 'Gujarat',
      city: user.city || '',
      gstNumber: existingGst,
      contactNumber: user.contactNumber || '',
      email: user.email || ''
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.state.trim()) {
      setError('State is required for GST determination');
      return;
    }
    if (!formData.contactNumber.trim()) {
      setError('Contact number is required');
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        role: formData.role || 'USER',
        fullAddress: formData.fullAddress || '',
        state: formData.state.trim(),
        city: formData.city || '',
        gstNumber: formData.gstNumber || '',
        pincode: formData.gstNumber || '', // Compatibility with servers storing GST in pincode column
        area: '',
        contactNumber: formData.contactNumber.trim(),
        email: formData.email || '',
        status: editingUser ? (editingUser.status || 'ACTIVE') : 'ACTIVE'
      };

      if (editingUser) {
        await userService.update(editingUser.id, payload);
      } else {
        await userService.create(payload);
      }
      setModalOpen(false);
      await fetchUsers();
    } catch (err) {
      console.error('Error saving user:', err);
      setError(err.response?.data?.message || err.message || 'Error saving user');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.role === 'ADMIN') {
      alert('Admin user cannot be deleted. Role ADMIN is protected.');
      setDeleteTarget(null);
      return;
    }
    try {
      setDeleting(true);
      await userService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Role Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Role tabs */}
        <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-xl w-full lg:w-auto overflow-x-auto">
          <button
            onClick={() => setRoleFilter('')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${roleFilter === ''
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            All Roles
          </button>
          <button
            onClick={() => setRoleFilter('USER')}
            className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${roleFilter === 'USER'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>USER (Clients)</span>
          </button>
          <button
            onClick={() => setRoleFilter('ADMIN')}
            className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${roleFilter === 'ADMIN'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ADMIN (Staff)</span>
          </button>
        </div>

        {/* Right side: Search & Add Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, state, GSTIN, city, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs transition-all"
            />
          </div>

          <button
            onClick={() => openAddModal('USER')}
            className="w-full sm:w-auto h-10 flex items-center justify-center space-x-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-sm transition-all whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">Client Name</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">State & GST Number</th>
                <th className="py-3.5 px-4">City</th>
                <th className="py-3.5 px-4">Full Address</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Loading users list...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    No users found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user, idx) => {
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 text-xs font-mono">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{user.name}</div>
                        <div className="mt-0.5">
                          {user.role === 'ADMIN' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <ShieldCheck className="w-3 h-3" />
                              <span>ADMIN</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <UserIcon className="w-3 h-3" />
                              <span>USER</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs space-y-1">
                        <div className="flex items-center space-x-1.5 text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{user.contactNumber || '—'}</span>
                        </div>
                        {user.email && (
                          <div className="flex items-center space-x-1.5 text-slate-500">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{user.email}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900 flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{user.state}</span>
                        </div>
                        {(() => {
                          const gst = user.gstNumber || user.gstin || (user.pincode && user.pincode.length > 6 ? user.pincode : '');
                          return gst ? (
                            <div className="mt-1 text-[11px] font-mono text-slate-700">
                              <span className="text-slate-400 font-normal">GSTIN: </span>
                              <span className="font-semibold text-slate-900">{gst}</span>
                            </div>
                          ) : (
                            <div className="mt-1 text-slate-400 text-xs font-mono">—</div>
                          );
                        })()}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-700">
                        <div className="font-medium text-slate-800">{user.city || '—'}</div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate" title={user.fullAddress}>
                        {user.fullAddress || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {user.role === 'ADMIN' ? (
                            <button
                              disabled
                              className="p-1.5 text-slate-300 rounded-lg cursor-not-allowed opacity-50"
                              title="Admin users cannot be deleted"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setDeleteTarget({ id: user.id, name: user.name, role: user.role })}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>

      {/* Add / Edit User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 transform transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingUser ? 'Edit Client Details' : 'Add Client'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name /Company Name*
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    State *
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-sm bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all shadow-2xs"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* State and City */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Surat"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    GST Number (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 24AAACN1234F1Z8"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-sm uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all shadow-2xs font-mono"
                  />
                </div>
              </div>

              {/* Contact Number & Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Contact Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98250 00000"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="client@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Full Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Address
                </label>
                <textarea
                  rows="2"
                  placeholder="Plot/Shop no, Street, Landmark..."
                  value={formData.fullAddress}
                  onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all shadow-2xs"
                />
              </div>


              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  {editingUser ? 'Update' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Delete User"
        itemType="user"
        itemName={deleteTarget?.name}
        message="Are you sure you want to delete this user? The status will be set to INACTIVE and removed from active client lists."
        confirmText="Mark Inactive"
      />
    </div>
  );
}
