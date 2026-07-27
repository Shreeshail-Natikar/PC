import { useEffect } from 'react';

export default function MediaViewerModal({ media, onClose }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    if (media) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [media, onClose]);

  if (!media) return null;

  const { url, type, filename } = media;

  async function handleDownload() {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || url.split('/').pop() || 'file';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  }

  const isPDF = url.toLowerCase().endsWith('.pdf') || type === 'PDF';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md animate-fadeIn text-white select-none">
      {/* Top Header Bar */}
      <div className="h-16 px-6 flex items-center justify-between bg-black/50 border-b border-gray-800">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl">
            {type === 'IMAGE' ? '🖼️' : type === 'VIDEO' ? '🎥' : isPDF ? '📄' : '📁'}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate max-w-md">
              {filename || url.split('/').pop() || 'Media Preview'}
            </h3>
            <p className="text-[11px] text-gray-400">Viewing on page</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-whatsapp-green text-white text-xs font-semibold hover:opacity-90 transition shadow"
            title="Download File"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition rounded-full hover:bg-white/10 text-xl"
            title="Close viewer (Esc)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
        {type === 'IMAGE' && (
          <img
            src={url}
            alt="Full size media"
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-zoomIn"
          />
        )}

        {type === 'VIDEO' && (
          <video
            src={url}
            controls
            autoPlay
            className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
          />
        )}

        {(type === 'VOICE_NOTE' || type === 'AUDIO') && (
          <div className="bg-[#202c33] p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full border border-gray-700">
            <span className="text-5xl animate-pulse">🎙️</span>
            <p className="text-sm font-medium text-gray-200">Audio Preview</p>
            <audio src={url} controls autoPlay className="w-full" />
          </div>
        )}

        {(type === 'FILE' || isPDF) && (
          <div className="w-full h-full max-w-5xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-800 flex flex-col">
            <iframe
              src={url}
              title="Document Preview"
              className="w-full flex-1 border-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
