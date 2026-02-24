import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../api/client';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cpError, setCpError] = useState('');
  const [cpSuccess, setCpSuccess] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function openChangePassword() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setCpError('');
    setCpSuccess(false);
    setShowChangePassword(true);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setCpError('');
    if (newPassword.length < 6) {
      setCpError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setCpError('Passwords do not match.');
      return;
    }
    setCpLoading(true);
    try {
      await apiClient.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCpSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Failed to change password.';
      setCpError(msg);
    } finally {
      setCpLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-sky-700 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold tracking-tight">
            SOP Training
          </Link>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <span className="text-sm opacity-80 hidden sm:inline">
                  {user.email} &middot; <span className="capitalize">{user.role}</span>
                </span>
                {user.role === 'admin' && (
                  <Link
                    to="/admin/users"
                    className="text-sm opacity-80 hover:opacity-100 hidden sm:inline"
                  >
                    Employees
                  </Link>
                )}
                {/* biome-ignore lint/a11y/useButtonType: <explanation> */}
                <button
                  onClick={openChangePassword}
                  className="text-sm bg-sky-600 hover:bg-sky-500 px-3 py-1.5 rounded"
                >
                  Change Password
                </button>
                {/* biome-ignore lint/a11y/useButtonType: <explanation> */}
                <button
                  onClick={handleLogout}
                  className="text-sm bg-sky-600 hover:bg-sky-500 px-3 py-1.5 rounded"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">{children}</main>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">Change Password</h2>
            {cpSuccess ? (
              <div className="text-center space-y-4">
                <p className="text-green-600 font-medium">Password updated successfully!</p>
                <button
                  type="button"
                  onClick={() => setShowChangePassword(false)}
                  className="w-full bg-sky-700 text-white py-2 rounded hover:bg-sky-600"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label htmlFor="cp-current" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input
                    id="cp-current"
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label htmlFor="cp-new" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    id="cp-new"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label htmlFor="cp-confirm" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    id="cp-confirm"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                {cpError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                    {cpError}
                  </p>
                )}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowChangePassword(false)}
                    className="flex-1 border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={cpLoading}
                    className="flex-1 bg-sky-700 text-white py-2 rounded text-sm hover:bg-sky-600 disabled:opacity-60"
                  >
                    {cpLoading ? 'Saving…' : 'Update Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
