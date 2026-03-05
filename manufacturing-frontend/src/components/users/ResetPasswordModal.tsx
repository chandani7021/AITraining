import { useState } from 'react';
import { apiClient } from '../../api/client';
import type { EmployeeListItem } from '../../types';

async function resetPassword(userId: number, newPassword: string): Promise<void> {
  await apiClient.post(`/admin/users/${userId}/reset-password`, { new_password: newPassword });
}

export function ResetPasswordModal({
  user,
  onClose,
}: {
  user: EmployeeListItem;
  onClose: () => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(user.id, newPassword);
      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Failed to reset password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-lg font-semibold mb-1">Reset Password</h2>
        <p className="text-sm text-gray-500 mb-4 truncate">{user.email}</p>
        {success ? (
          <div className="text-center space-y-4">
            <p className="text-green-600 font-medium">Password reset successfully!</p>
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-sky-700 text-white py-2 rounded hover:bg-sky-600 text-sm"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="rp-new" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                id="rp-new"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label htmlFor="rp-confirm" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                id="rp-confirm"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-sky-700 text-white py-2 rounded text-sm hover:bg-sky-600 disabled:opacity-60"
              >
                {loading ? 'Saving…' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
