import { useState } from 'react';
import api from '../services/api.js';
import { useTheme } from '../context/ThemeContext.jsx';

export default function AddContactModal({ isOpen, onClose, onContactAdded }) {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [addingId, setAddingId] = useState(null);

  if (!isOpen) return null;

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setError('Enter at least 2 characters to search.');
      return;
    }

    setError('');
    setSearching(true);
    setSearchResults([]);

    try {
      const { data } = await api.get(`/contacts/search?query=${encodeURIComponent(searchQuery)}`);
      setSearchResults(data.users || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed.');
    } finally {
      setSearching(false);
    }
  }

  async function handleAddContact(user) {
    setAddingId(user.id);
    setError('');

    try {
      const { data } = await api.post('/contacts', { contactId: user.id });
      onContactAdded?.(data.contact);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add contact.');
    } finally {
      setAddingId(null);
    }
  }

  function handleClose() {
    setSearchQuery('');
    setSearchResults([]);
    setError('');
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-[#202c33] rounded-3xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800 relative animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              Add New Contact
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 text-xl leading-none"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Search by name or email to find and add contacts
          </p>
        </div>

        {/* Search Form */}
        <div className="p-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-[#111b21] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-green text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition"
            />
            <button
              type="submit"
              disabled={searching || searchQuery.trim().length < 2}
              className="px-4 py-2.5 rounded-xl bg-whatsapp-green text-white font-semibold text-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {error && (
            <div className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl px-4 py-2.5">
              {error}
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Found {searchResults.length} user{searchResults.length !== 1 ? 's' : ''}
              </p>
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-gray-700 hover:border-whatsapp-green dark:hover:border-whatsapp-green transition-all"
                >
                  <div className="relative flex-shrink-0">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover shadow"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-whatsapp-teal flex items-center justify-center text-white font-bold text-lg shadow">
                        {user.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#111b21] ${
                        user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                      {user.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </p>
                    {user.about && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate italic">
                        {user.about}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleAddContact(user)}
                    disabled={addingId === user.id}
                    className="px-3 py-1.5 rounded-lg bg-whatsapp-green text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-50 flex-shrink-0"
                  >
                    {addingId === user.id ? 'Adding...' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && !error && (
            <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400 py-8">
              <span className="text-3xl block mb-2">🔍</span>
              No users found. Try a different search term.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
