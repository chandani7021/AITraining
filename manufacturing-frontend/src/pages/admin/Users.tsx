import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Layout } from '../../components/Layout';
import { ResetPasswordModal } from '../../components/users/ResetPasswordModal';
import type { EmployeeListItem } from '../../types';

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

async function fetchUsers(): Promise<EmployeeListItem[]> {
  const { data } = await apiClient.get('/admin/users');
  return data;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminUsers() {
  const [selectedUser, setSelectedUser] = useState<EmployeeListItem | null>(null);

  const { data: users, isLoading, isError } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchUsers,
  });

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">User Management</h1>

        {isLoading && <p className="text-gray-500">Loading users…</p>}
        {isError && (
          <p className="text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
            Failed to load users.
          </p>
        )}

        {users && users.length === 0 && (
          <p className="text-gray-500">No users found.</p>
        )}

        {users && users.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${
                          u.role === 'admin'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedUser(u)}
                        className="text-sm text-sky-700 hover:text-sky-900 font-medium"
                      >
                        Reset Password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser && (
        <ResetPasswordModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </Layout>
  );
}
