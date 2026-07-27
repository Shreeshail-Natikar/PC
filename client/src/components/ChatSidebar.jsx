import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { SoundManager } from '../utils/sounds.js';
import { NotificationManager } from '../utils/notifications.js';

export default function ChatSidebar({
  partner,
  lastMessage,
  unreadCount,
  onOpenOwnProfile,
  onOpenPartnerProfile,
  onGoToChat,
  className = '',
  isMobile = false,
}) {
  const { user, logout } = useAuth();
  const { connected, partnerPresence } = useSocket();
  const { isDark, toggleTheme } = useTheme();
  const [search, setSearch] = useState('');
  const [soundOn, setSoundOn] = useState(true);
  const [notifOn, setNotifOn] = useState(true);
  const [notifPermission, setNotifPermission] = useState('default');

  const isPartnerOnline = partnerPresence?.isOnline ?? partner?.isOnline;

  useEffect(() => {
    setSoundOn(SoundManager.isEnabled());
    setNotifOn(NotificationManager.isEnabled());
    NotificationManager.getPermission().then(setNotifPermission);
  }, []);

  const showPartner =
    !search ||
    partner?.name?.toLowerCase().includes(search.toLowerCase()) ||
    partner?.email?.toLowerCase().includes(search.toLowerCase());

  async function handleToggleNotifications() {
    if (NotificationManager.isSupported()) {
      const perm = await NotificationManager.getPermission();
      if (perm !== 'granted') {
        const result = await NotificationManager.requestPermission();
        setNotifPermission(result);
        if (result === 'granted') {
          const next = NotificationManager.toggle();
          setNotifOn(next);
        }
      } else {
        const next = NotificationManager.toggle();
        setNotifOn(next);
      }
    }
  }

  function handleToggleSound() {
    const next = SoundManager.toggle();
    setSoundOn(next);
    if (next) {
      SoundManager.playMessageSent();
    }
  }

  return (
    <aside className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-whatsapp-panelLight dark:bg-whatsapp-panel animate-fadeIn ${className}`}>
      {/* Top Sidebar Header */}
      <div className="h-16 px-4 flex items-center justify-between bg-gray-100 dark:bg-[#202c33] border-b border-gray-200/60 dark:border-gray-800/60">
        <div
          onClick={onOpenOwnProfile}
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition group"
          title="View / Edit my profile"
        >
          <div className="relative">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover shadow-md ring-2 ring-transparent group-hover:ring-whatsapp-green transition-all"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-whatsapp-teal flex items-center justify-center text-white font-semibold text-base shadow-md ring-2 ring-transparent group-hover:ring-whatsapp-green transition-all animate-float">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#202c33] ${
                connected ? 'bg-green-500' : 'bg-red-500'
              }`}
              title={connected ? 'Connected' : 'Disconnected'}
            >
              {connected && <span className="absolute inset-0 rounded-full bg-green-400 animate-pulseRing" />}
            </span>
          </div>
          <div>
            <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-100 leading-tight group-hover:text-whatsapp-teal dark:group-hover:text-whatsapp-green transition-colors">
              {user?.name}
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              {connected ? 'Online' : 'Reconnecting…'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            title={soundOn ? 'Mute sounds' : 'Unmute sounds'}
            className="p-2 text-gray-500 hover:text-whatsapp-teal dark:text-gray-400 dark:hover:text-whatsapp-green transition rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/50"
          >
            {soundOn ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>

          {/* Notification Toggle */}
          <button
            onClick={handleToggleNotifications}
            title={
              notifPermission === 'denied'
                ? 'Notifications blocked in browser'
                : notifOn
                ? 'Disable notifications'
                : 'Enable notifications'
            }
            disabled={notifPermission === 'denied'}
            className={`p-2 transition rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/50 ${
              notifPermission === 'denied'
                ? 'text-red-400 opacity-50 cursor-not-allowed'
                : notifOn
                ? 'text-gray-500 hover:text-whatsapp-teal dark:text-gray-400 dark:hover:text-whatsapp-green'
                : 'text-gray-400'
            }`}
          >
            {notifOn ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 11a6 6 0 00-10.89-3.472M7.757 7.757A5.99 5.99 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h14M4.27 4.27l15.46 15.46M15 17v1a3 3 0 11-6 0v-1" />
              </svg>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 text-gray-500 hover:text-whatsapp-teal dark:text-gray-400 dark:hover:text-whatsapp-green transition rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/50"
          >
            {isDark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Profile Settings */}
          <button
            onClick={onOpenOwnProfile}
            title="My Profile Settings"
            className="p-2 text-gray-500 hover:text-whatsapp-teal dark:text-gray-400 dark:hover:text-whatsapp-green transition rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            title="Logout"
            className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2 bg-whatsapp-panelLight dark:bg-whatsapp-panel border-b border-gray-100 dark:border-gray-800/60">
        <div className="relative flex items-center group">
          <svg className="w-4 h-4 absolute left-3 text-gray-400 group-focus-within:text-whatsapp-teal dark:group-focus-within:text-whatsapp-green transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search or start new chat"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-white dark:bg-[#202c33] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-whatsapp-green/50 focus:bg-white dark:focus:bg-[#2a3942] border border-transparent focus:border-whatsapp-green/30 transition-all"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {!partner ? (
          <div className="p-6 text-center text-xs text-gray-400 animate-fadeIn">
            <div className="animate-bounceSoft text-3xl mb-2">⏳</div>
            Waiting for partner to register...
          </div>
        ) : showPartner ? (
          <div
            onClick={() => {
              if (isMobile && onGoToChat) {
                onGoToChat();
              } else {
                onOpenPartnerProfile?.();
              }
            }}
            className="flex items-center gap-3 p-3 cursor-pointer bg-gray-50 dark:bg-[#2a3942] hover:bg-gray-100 dark:hover:bg-[#202c33] transition-all duration-200 border-b border-gray-100 dark:border-gray-800/40 animate-slideUp group"
            title={isMobile ? `Open chat with ${partner.name}` : `View ${partner.name} profile`}
          >
            <div className="relative flex-shrink-0">
              {partner.avatarUrl ? (
                <img
                  src={partner.avatarUrl}
                  alt={partner.name}
                  className="w-12 h-12 rounded-full object-cover shadow-md ring-2 ring-transparent group-hover:ring-whatsapp-green/50 transition-all"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-md animate-float ring-2 ring-transparent group-hover:ring-whatsapp-green/50 transition-all">
                  {partner.name?.[0]?.toUpperCase() || 'P'}
                </div>
              )}
              <span
                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-whatsapp-panelLight dark:border-whatsapp-panel ${
                  isPartnerOnline ? 'bg-green-500' : 'bg-gray-400'
                }`}
              >
                {isPartnerOnline && <span className="absolute inset-0 rounded-full bg-green-400 animate-pulseRing" />}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-whatsapp-teal dark:group-hover:text-whatsapp-green transition-colors">
                  {partner.name}
                </h3>
                {lastMessage && (
                  <span className="text-[11px] text-gray-400 font-medium">
                    {new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <p className="truncate pr-2">
                  {lastMessage
                    ? lastMessage.isDeleted
                      ? '🚫 This message was deleted'
                      : lastMessage.type === 'IMAGE'
                      ? '📷 Photo'
                      : lastMessage.type === 'VOICE_NOTE'
                      ? '🎙️ Voice note'
                      : lastMessage.type === 'VIDEO'
                      ? '🎥 Video'
                      : lastMessage.content || 'Attachment'
                    : partner.about || 'Available'}
                </p>
                {unreadCount > 0 && (
                  <span className="bg-whatsapp-green text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 animate-bounceSoft">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-gray-400">No chats found</div>
        )}
      </div>
    </aside>
  );
}
