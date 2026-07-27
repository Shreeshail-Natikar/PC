import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext.jsx';

export default function ChatHeader({ partner, onClearChat, onOpenPartnerProfile, onBackToSidebar, showBackButton = false }) {
  const { partnerPresence, isTyping, startCall } = useSocket();
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const menuRef = useRef(null);

  const isOnline = partnerPresence?.isOnline ?? partner?.isOnline;
  const lastSeen = partnerPresence?.lastSeen ?? partner?.lastSeen;

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleClearConfirm() {
    try {
      setClearing(true);
      await onClearChat?.();
      setShowConfirmClear(false);
    } finally {
      setClearing(false);
    }
  }

  function handleVoiceCall() {
    if (partner) startCall(partner.id, 'VOICE', partner.name);
    setShowMenu(false);
  }

  function handleVideoCall() {
    if (partner) startCall(partner.id, 'VIDEO', partner.name);
    setShowMenu(false);
  }

  return (
    <header className="h-16 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#202c33] select-none transition-colors duration-300 relative">
      <div className="flex items-center gap-2 min-w-0">
        {showBackButton && (
          <button
            onClick={onBackToSidebar}
            title="Back to chats"
            className="p-1.5 -ml-1 text-gray-600 dark:text-gray-300 hover:text-whatsapp-teal dark:hover:text-whatsapp-green hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-full transition-all duration-200 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div
          className="relative flex-shrink-0 cursor-pointer group"
          onClick={onOpenPartnerProfile}
          title={`View ${partner?.name || 'partner'} profile`}
        >
          {partner?.avatarUrl ? (
            <img
              src={partner.avatarUrl}
              alt={partner.name}
              className="w-10 h-10 rounded-full object-cover shadow-md animate-fadeIn ring-2 ring-transparent group-hover:ring-whatsapp-green transition-all duration-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-base shadow-md animate-float ring-2 ring-transparent group-hover:ring-whatsapp-green transition-all duration-200">
              {partner?.name?.[0]?.toUpperCase() || 'P'}
            </div>
          )}
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-50 dark:border-[#202c33] ${
              isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`}
          >
            {isOnline && <span className="absolute inset-0 rounded-full bg-green-400 animate-pulseRing" />}
          </span>
        </div>

        <div
          className="min-w-0 cursor-pointer group"
          onClick={onOpenPartnerProfile}
          title={`View ${partner?.name || 'partner'} profile`}
        >
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug truncate group-hover:text-whatsapp-teal dark:group-hover:text-whatsapp-green transition-colors duration-200">
            {partner?.name || 'Chat Partner'}
          </h2>
          <p className="text-xs font-medium truncate">
            {isTyping ? (
              <span className="text-whatsapp-teal dark:text-whatsapp-green flex items-center gap-1">
                <span className="inline-flex gap-0.5 items-center">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </span>
                <span className="ml-1">typing…</span>
              </span>
            ) : isOnline ? (
              <span className="text-green-600 dark:text-whatsapp-green flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                online
              </span>
            ) : lastSeen ? (
              <span className="text-gray-500 dark:text-gray-400">
                last seen {new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">offline</span>
            )}
          </p>
        </div>
      </div>

      {partner && (
        <div className="flex items-center gap-1">
          <button
            onClick={handleVoiceCall}
            title="Start Audio Call"
            className="p-2 text-gray-600 dark:text-gray-300 hover:text-whatsapp-teal dark:hover:text-whatsapp-green hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-full transition-all duration-200 hover:scale-110"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </button>

          <button
            onClick={handleVideoCall}
            title="Start Video Call"
            className="p-2 text-gray-600 dark:text-gray-300 hover:text-whatsapp-teal dark:hover:text-whatsapp-green hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-full transition-all duration-200 hover:scale-110"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((prev) => !prev)}
              title="More options"
              className={`p-2 rounded-full transition-all duration-200 ${
                showMenu
                  ? 'bg-gray-200 dark:bg-gray-700/60 text-whatsapp-teal dark:text-whatsapp-green'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50 hover:text-whatsapp-teal dark:hover:text-whatsapp-green hover:scale-110'
              }`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.75" />
                <circle cx="12" cy="12" r="1.75" />
                <circle cx="12" cy="19" r="1.75" />
              </svg>
            </button>

            {showMenu && (
              <div className="ctx-menu absolute right-0 top-12 z-40 min-w-[200px] bg-white dark:bg-[#2a3942] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl py-1 text-sm animate-fadeIn">
                <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-700 text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500 font-semibold">
                  Actions
                </div>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleVoiceCall();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#374248] text-left text-gray-700 dark:text-gray-100"
                >
                  <svg className="w-4 h-4 text-whatsapp-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Voice call
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleVideoCall();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#374248] text-left text-gray-700 dark:text-gray-100"
                >
                  <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Video call
                </button>
                <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowConfirmClear(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-left text-red-600 dark:text-red-400"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16M10 11v6M14 11v6" />
                    </svg>
                    Clear chat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clear Chat Confirmation Modal */}
      {showConfirmClear && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => !clearing && setShowConfirmClear(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-white dark:bg-[#2a3942] rounded-2xl shadow-2xl p-6 w-full max-w-md animate-scaleIn border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-3">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Clear chat?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <span>This will <span className="font-semibold text-red-500 dark:text-red-400">remove all messages</span>, photos, videos, files, and voice notes from <strong>your</strong> chat history.</span>
                <br />
                <span className="text-xs opacity-80">{partner?.name || 'Your partner'} will still have access to their copy of the chat.</span>
                <br />
                <span className="text-xs opacity-75">This action cannot be undone on your device.</span>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setShowConfirmClear(false)}
                disabled={clearing}
                className="flex-1 rounded-xl py-3 text-sm font-semibold bg-gray-100 dark:bg-[#374248] text-gray-700 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-[#404d55] transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClearConfirm}
                disabled={clearing}
                className="flex-1 rounded-xl py-3 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition disabled:opacity-60 disabled:cursor-wait"
              >
                {clearing ? 'Clearing…' : '🗑️ Clear Chat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
