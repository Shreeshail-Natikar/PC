import { useState, useRef, useEffect } from 'react';

export default function MessageBubble({
  message,
  isOwn,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onViewMedia,
}) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const longPressTimer = useRef(null);
  const bubbleRef = useRef(null);

  const quickEmojis = ['❤️', '😂', '👍', '😮', '😢', '🔥'];

  useEffect(() => {
    function handleClickOutside(e) {
      if (contextMenu && !e.target.closest('.ctx-menu')) {
        setContextMenu(null);
      }
    }
    function handleScroll() {
      setContextMenu(null);
    }
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [contextMenu]);

  function handleSaveEdit() {
    if (editContent.trim()) {
      onEdit(message.id, editContent);
      setIsEditing(false);
    }
  }

  async function handleDownloadMedia(url, defaultFilename) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = defaultFilename || url.split('/').pop() || 'media_file';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  }

  function handleContextMenu(e) {
    if (message.isDeleted) return;
    e.preventDefault();
    const rect = bubbleRef.current?.getBoundingClientRect();
    const x = e.clientX || (rect?.left + rect?.width / 2);
    const y = e.clientY || (rect?.top + rect?.height / 2);
    setContextMenu({ x, y });
    setShowActions(false);
    setShowEmojiPicker(false);
  }

  function handleTouchStart() {
    if (message.isDeleted) return;
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(30);
      const rect = bubbleRef.current?.getBoundingClientRect();
      setContextMenu({
        x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
        y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
      });
    }, 500);
  }

  function handleTouchEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleTouchMove() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function doDelete() {
    setConfirmDelete(false);
    setContextMenu(null);
    onDelete(message.id);
  }

  function actionBarToggle() {
    if (message.isDeleted) return;
    setShowActions((prev) => !prev);
    setShowEmojiPicker(false);
  }

  const mediaLabel = {
    IMAGE: '🖼️ Image',
    VIDEO: '🎬 Video',
    AUDIO: '🎵 Audio',
    VOICE_NOTE: '🎙️ Voice Note',
    FILE: '📄 File',
  }[message.type] || '📎 Attachment';

  return (
    <div
      ref={bubbleRef}
      className={`group relative flex flex-col my-1 ${
        isOwn ? 'items-end' : 'items-start'
      }`}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {/* Click-to-toggle + hover action bar */}
      <div
        className={`absolute -top-3 z-20 flex items-center gap-1 bg-white dark:bg-[#2a3942] shadow-md border border-gray-200 dark:border-gray-700/60 rounded-full px-2 py-0.5 transition-opacity duration-150 ${
          showActions ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        } ${isOwn ? 'right-2' : 'left-2'}`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowEmojiPicker(!showEmojiPicker);
          }}
          title="React"
          className="hover:scale-125 transition text-xs p-0.5"
        >
          😀
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReply(message);
            setShowActions(false);
            setShowEmojiPicker(false);
          }}
          title="Reply"
          className="text-gray-500 hover:text-whatsapp-green dark:text-gray-300 p-0.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>

        {message.mediaUrl && !message.isDeleted && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewMedia && onViewMedia({ url: message.mediaUrl, type: message.type });
              setShowActions(false);
              setShowEmojiPicker(false);
            }}
            title="View on page"
            className="text-gray-500 hover:text-sky-500 dark:text-gray-300 p-0.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        )}

        {message.mediaUrl && !message.isDeleted && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadMedia(message.mediaUrl, `${message.type.toLowerCase()}_${message.id}`);
              setShowActions(false);
              setShowEmojiPicker(false);
            }}
            title="Download file"
            className="text-gray-500 hover:text-emerald-500 dark:text-gray-300 p-0.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        )}

        {isOwn && !message.isDeleted && (
          <>
            {message.type === 'TEXT' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                  setShowActions(false);
                  setShowEmojiPicker(false);
                }}
                title="Edit message"
                className="text-gray-500 hover:text-blue-500 dark:text-gray-300 p-0.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(true);
                setShowActions(false);
                setShowEmojiPicker(false);
              }}
              title="Delete message"
              className="text-gray-500 hover:text-red-500 dark:text-gray-300 p-0.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            actionBarToggle();
          }}
          title="More options"
          className="text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 p-0.5 ml-0.5 border-l border-gray-200 dark:border-gray-700 pl-1"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <div
          className={`absolute -top-10 z-30 flex items-center gap-1.5 bg-white dark:bg-[#202c33] border border-gray-200 dark:border-gray-700 shadow-xl rounded-full px-3 py-1 animate-fadeIn ${
            isOwn ? 'right-2' : 'left-2'
          }`}
        >
          {quickEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReact(message.id, emoji);
                setShowEmojiPicker(false);
              }}
              className="hover:scale-125 transition text-base"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Right-click / Long-press Context Menu */}
      {contextMenu && !message.isDeleted && (
        <div
          className="ctx-menu fixed z-[100] min-w-[180px] bg-white dark:bg-[#2a3942] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl py-1 text-sm animate-fadeIn"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 200),
            top: Math.min(contextMenu.y, window.innerHeight - 300),
          }}
        >
          <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-700 text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500 font-semibold">
            {mediaLabel}
          </div>
          <button
            onClick={() => {
              setContextMenu(null);
              onReply(message);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#374248] text-left text-gray-700 dark:text-gray-100"
          >
            <svg className="w-4 h-4 text-whatsapp-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Reply
          </button>
          <button
            onClick={() => {
              setContextMenu(null);
              setShowEmojiPicker(true);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#374248] text-left text-gray-700 dark:text-gray-100"
          >
            <span className="text-base">😀</span>
            React with emoji
          </button>
          {message.mediaUrl && (
            <button
              onClick={() => {
                setContextMenu(null);
                onViewMedia && onViewMedia({ url: message.mediaUrl, type: message.type });
              }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#374248] text-left text-gray-700 dark:text-gray-100"
            >
              <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View
            </button>
          )}
          {message.mediaUrl && (
            <button
              onClick={() => {
                setContextMenu(null);
                handleDownloadMedia(message.mediaUrl, `${message.type.toLowerCase()}_${message.id}`);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#374248] text-left text-gray-700 dark:text-gray-100"
            >
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          )}
          {isOwn && message.type === 'TEXT' && (
            <button
              onClick={() => {
                setContextMenu(null);
                setIsEditing(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#374248] text-left text-gray-700 dark:text-gray-100"
            >
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
          {isOwn && (
            <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
              <button
                onClick={() => {
                  setContextMenu(null);
                  setConfirmDelete(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-left text-red-600 dark:text-red-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete for everyone
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fadeIn" onClick={() => setConfirmDelete(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-[#2a3942] rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-scaleIn border border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">Delete message?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {message.mediaUrl
                  ? `This ${mediaLabel.toLowerCase()} will be permanently deleted for both users.`
                  : 'This message will be permanently deleted for both users.'}
                <br />
                <span className="text-xs opacity-75">This action cannot be undone.</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-gray-100 dark:bg-[#374248] text-gray-700 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-[#404d55] transition"
              >
                Cancel
              </button>
              <button
                onClick={doDelete}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Message Container */}
      <div
        className={`relative max-w-[85%] sm:max-w-[70%] rounded-xl px-3 py-2 shadow-sm text-sm ${
          isOwn
            ? 'bg-[#d9fdd3] dark:bg-whatsapp-bubbleOut text-gray-900 dark:text-gray-100 rounded-tr-none'
            : 'bg-white dark:bg-whatsapp-bubbleIn text-gray-900 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-gray-800'
        }`}
        onClick={actionBarToggle}
      >
        {/* Reply Quote Block */}
        {message.replyTo && (
          <div className="mb-2 p-2 rounded-lg bg-black/5 dark:bg-black/20 border-l-4 border-whatsapp-teal text-xs">
            <span className="font-semibold text-whatsapp-teal dark:text-whatsapp-green block">
              {message.replyTo.senderId === message.senderId ? 'You' : 'Partner'}
            </span>
            <p className="truncate text-gray-600 dark:text-gray-300">
              {message.replyTo.content || 'Attachment'}
            </p>
          </div>
        )}

        {/* Deleted Message */}
        {message.isDeleted ? (
          <p className="italic text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <span>🚫</span> This message was deleted
          </p>
        ) : isEditing ? (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full text-xs p-1.5 rounded bg-white dark:bg-[#111b21] border border-gray-300 dark:border-gray-600 focus:outline-none"
              autoFocus
            />
            <div className="flex justify-end gap-2 text-[10px]">
              <button
                onClick={() => setIsEditing(false)}
                className="px-2 py-0.5 rounded text-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-2 py-0.5 rounded bg-whatsapp-green text-white font-medium"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Image Media */}
            {message.type === 'IMAGE' && message.mediaUrl && (
              <div className="mb-1 relative rounded-lg overflow-hidden max-w-xs group/img cursor-pointer">
                <img
                  src={message.mediaUrl}
                  alt="Attachment"
                  className="w-full h-auto object-cover max-h-72 rounded-lg hover:opacity-95 transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewMedia && onViewMedia({ url: message.mediaUrl, type: 'IMAGE' });
                  }}
                />
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-90 group-hover/img:opacity-100 transition">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadMedia(message.mediaUrl, `image_${message.id}.png`);
                    }}
                    title="Download Image"
                    className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full shadow text-xs"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  {isOwn && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(true);
                      }}
                      title="Delete Image"
                      className="p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-full shadow text-xs"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Video Media */}
            {message.type === 'VIDEO' && message.mediaUrl && (
              <div className="mb-1 relative rounded-lg overflow-hidden max-w-xs group/vid">
                <video src={message.mediaUrl} controls className="w-full rounded-lg max-h-72" onClick={(e) => e.stopPropagation()} />
                <div className="flex items-center gap-3 mt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewMedia && onViewMedia({ url: message.mediaUrl, type: 'VIDEO' });
                    }}
                    className="text-xs text-sky-500 hover:underline font-medium"
                  >
                    🔍 View on Page
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadMedia(message.mediaUrl, `video_${message.id}.mp4`);
                    }}
                    className="text-xs text-whatsapp-teal dark:text-whatsapp-green hover:underline font-medium"
                  >
                    📥 Download
                  </button>
                  {isOwn && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(true);
                      }}
                      className="text-xs text-red-500 hover:underline font-medium ml-auto"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Voice Note / Audio */}
            {(message.type === 'VOICE_NOTE' || message.type === 'AUDIO') && message.mediaUrl && (
              <div className="flex flex-col gap-1 py-1 min-w-[220px]">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎙️</span>
                  <audio src={message.mediaUrl} controls className="w-full h-8" onClick={(e) => e.stopPropagation()} />
                </div>
                <div className="self-end flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewMedia && onViewMedia({ url: message.mediaUrl, type: message.type });
                    }}
                    className="text-[11px] text-sky-500 hover:underline font-medium"
                  >
                    🔍 View
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadMedia(message.mediaUrl, `audio_${message.id}.webm`);
                    }}
                    className="text-[11px] text-whatsapp-teal dark:text-whatsapp-green hover:underline font-medium"
                  >
                    📥 Download
                  </button>
                  {isOwn && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(true);
                      }}
                      className="text-[11px] text-red-500 hover:underline font-medium"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Document / File */}
            {message.type === 'FILE' && message.mediaUrl && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/5 dark:bg-black/20 text-xs font-medium mb-1 w-full">
                <span className="text-lg">📄</span>
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewMedia && onViewMedia({ url: message.mediaUrl, type: 'FILE' });
                  }}
                >
                  <p className="truncate font-semibold text-gray-800 dark:text-gray-100 hover:underline">
                    Document File
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Click to view on page</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadMedia(message.mediaUrl, `document_${message.id}`);
                    }}
                    title="Download File"
                    className="p-1.5 rounded-full bg-whatsapp-green text-white hover:opacity-90 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  {isOwn && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(true);
                      }}
                      title="Delete File"
                      className="p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Message Text Content */}
            {message.content && (
              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {message.content}
              </p>
            )}
          </>
        )}

        {/* Bottom Metadata Bar: Timestamp + Edit Badge + Read Receipt Ticks */}
        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-gray-500 dark:text-gray-400 select-none">
          {message.isEdited && <span>(edited)</span>}
          <span>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>

          {isOwn && (
            <span className="font-bold">
              {message.status === 'READ' ? (
                <span className="text-sky-500" title="Read">✓✓</span>
              ) : message.status === 'DELIVERED' ? (
                <span title="Delivered">✓✓</span>
              ) : (
                <span title="Sent">✓</span>
              )}
            </span>
          )}
        </div>

        {/* Reaction Badges Container */}
        {message.reactions && message.reactions.length > 0 && (
          <div
            className={`absolute -bottom-2.5 flex items-center gap-0.5 bg-white dark:bg-[#202c33] border border-gray-200 dark:border-gray-700 rounded-full px-1.5 py-0.5 text-[11px] shadow-sm ${
              isOwn ? 'right-2' : 'left-2'
            }`}
          >
            {message.reactions.map((r) => (
              <span key={r.id} title={r.user?.name}>
                {r.emoji}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
