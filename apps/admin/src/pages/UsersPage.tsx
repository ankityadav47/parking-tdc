import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { Search, Ban, CheckCircle2, Eye, Mail } from 'lucide-react';

const ROLE_STYLE: Record<string, string> = {
  driver: 'bg-blue-50 text-blue-700 border-blue-200',
  operator: 'bg-purple-50 text-purple-700 border-purple-200',
  admin: 'bg-red-50 text-red-700 border-red-200',
};
const STATUS_STYLE: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  suspended: 'bg-red-50 text-red-600 border-red-200',
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => adminApi.getUsers({ search: search || undefined, limit: 100 }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => adminApi.updateUser(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const users = usersData?.users || [];
  
  const filtered = users.filter((u: any) => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchRole;
  });

  const toggleSuspend = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (confirm(`Are you sure you want to ${newStatus === 'suspended' ? 'suspend' : 'reactivate'} this user?`)) {
      updateMutation.mutate({ id, status: newStatus });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Management</h1>
        <p className="text-slate-500 mt-1">View, search, and manage all registered drivers and operators.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Drivers', value: users.filter((u: any) => u.role === 'driver').length, color: 'text-blue-600' },
          { label: 'Total Operators', value: users.filter((u: any) => u.role === 'operator').length, color: 'text-purple-600' },
          { label: 'Suspended', value: users.filter((u: any) => u.status === 'suspended').length, color: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p className="text-sm text-slate-500 font-medium">{s.label}</p>
            <p className={`text-4xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-4 py-2.5 outline-none"
        >
          <option value="all">All Roles</option>
          <option value="driver">Drivers</option>
          <option value="operator">Operators</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading users...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['User', 'Role', 'Joined', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 text-sm">
                          {u.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{u.fullName}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold border px-2.5 py-1 rounded-full ${ROLE_STYLE[u.role] || 'bg-slate-50 text-slate-700'}`}>
                        {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold border px-2.5 py-1 rounded-full ${STATUS_STYLE[u.status] || 'bg-slate-50 text-slate-700'}`}>
                        {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Email">
                          <Mail className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleSuspend(u.id, u.status)}
                          className={`p-1.5 rounded-lg transition-colors ${u.status === 'active' ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
                          title={u.status === 'active' ? 'Suspend' : 'Reactivate'}
                        >
                          {u.status === 'active' ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
