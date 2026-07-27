import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import api from '../services/api.js';

export default function ProfileModal({ isOpen, onClose, viewingUser, notifyUserId }) {
  const { user, updateUser } = useAuth();
  const { socket } = useSocket();

  const isOwnProfile = !viewingUser || viewingUser.id === user?.id;
  const profileUser = isOwnProfile ? user : viewingUser;

  const [name, setName] = useState(profileUser?.name || '');
  const [about, setAbout] = useState(profileUser?.about || 'Hey there! I am using Private Chat.');
  const [avatarUrl, setAvatarUrl] = useState(profileUser?.avatarUrl || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && profileUser) {
      setName(profileUser?.name || '');
      setAbout(profileUser?.about || 'Hey there! I am using Private Chat.');
      setAvatarUrl(profileUser?.avatarUrl || '');
      setSuccessMsg('');
    }
  }, [isOpen, profileUser?.id, profileUser?.name, profileUser?.about, profileUser?.avatarUrl]);

  if (!isOpen) return null;

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setAvatarUrl(data.url);
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      alert('Avatar upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      const { data } = await api.put('/users/profile', {
        name,
        about,
        avatarUrl,
      });

      updateUser(data.user);

      if (socket && notifyUserId) {
        socket.emit('profile:update', { toUserId: notifyUserId, user: data.user });
      }

      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  const initials = (profileUser?.name || 'U').slice(0, 1).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#202c33] rounded-3xl shadow-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 relative animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 text-xl leading-none"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className={`text-xl font-bold mb-6 text-center ${isOwnProfile ? 'text-whatsapp-teal dark:text-whatsapp-green' : 'text-gray-800 dark:text-white'}`}>
          {isOwnProfile ? 'Profile Settings' : `${profileUser?.name || 'Partner'}`}
        </h2>

        <div className="flex flex-col items-center mb-6">
          <div
            className={`relative ${isOwnProfile ? 'group cursor-pointer' : ''}`}
            onClick={() => isOwnProfile && fileInputRef.current?.click()}
            title={isOwnProfile ? 'Click to change profile picture' : ''}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={profileUser?.name || 'Profile'}
                className={`w-28 h-28 rounded-full object-cover shadow-xl border-4 ${isOwnProfile ? 'border-whatsapp-green' : 'border-whatsapp-teal/50 dark:border-whatsapp-green/50'} animate-fadeIn`}
              />
            ) : (
              <div className={`w-28 h-28 rounded-full ${isOwnProfile ? 'bg-whatsapp-teal' : 'bg-emerald-600'} text-white font-bold text-4xl flex items-center justify-center shadow-xl border-4 ${isOwnProfile ? 'border-whatsapp-green' : 'border-whatsapp-teal/50 dark:border-whatsapp-green/50'} animate-float`}>
                {initials}
              </div>
            )}

            {isOwnProfile && (
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-xs font-semibold">
                {uploading ? 'Uploading…' : 'Change Pic 📷'}
              </div>
            )}
          </div>

          {isOwnProfile && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
              <p className="text-[11px] text-gray-400 mt-2">Click avatar to upload profile picture</p>
            </>
          )}

          {!isOwnProfile && (
            <div className="mt-2 flex flex-col items-center gap-0.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                Viewing partner profile
              </span>
              <p className="text-[10px] text-gray-400 mt-1 italic">
                (Ask partner if you want this info changed)
              </p>
            </div>
          )}
        </div>

        {isOwnProfile ? (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Your Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#111b21] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-green text-gray-900 dark:text-white transition"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                About / Status
              </label>
              <input
                type="text"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#111b21] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-green text-gray-900 dark:text-white transition"
                placeholder="Hey there! I am using Private Chat."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                readOnly
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-[#182229] px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
              <p className="text-[10px] text-gray-400 mt-1">Email cannot be changed</p>
            </div>

            {successMsg && (
              <p className="text-xs text-green-500 font-semibold text-center py-1 bg-green-50 dark:bg-green-900/20 rounded-lg">
                ✅ {successMsg}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a3942] rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="px-6 py-2.5 text-xs font-semibold rounded-xl bg-whatsapp-green text-white hover:opacity-90 transition disabled:opacity-50 shadow-md shadow-whatsapp-green/20"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
                👤 Name
              </label>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111b21] px-4 py-3 text-sm">
                <span className="font-semibold text-gray-800 dark:text-white">
                  {profileUser?.name || '—'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
                💬 About
              </label>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111b21] px-4 py-3 text-sm">
                <span className="text-gray-700 dark:text-gray-200 italic">
                  “{profileUser?.about || 'Hey there! I am using Private Chat.'}”
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
                📧 Email
              </label>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111b21] px-4 py-3 text-sm">
                <span className="text-gray-700 dark:text-gray-200 break-all">
                  {profileUser?.email || '—'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center mt-6">
              <button
                onClick={onClose}
                className="px-8 py-2.5 text-xs font-semibold rounded-xl bg-whatsapp-teal/20 dark:bg-whatsapp-green/20 text-whatsapp-teal dark:text-whatsapp-green hover:bg-whatsapp-teal/30 dark:hover:bg-whatsapp-green/30 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
