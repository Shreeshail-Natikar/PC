import { useState, useRef } from 'react';
import VoiceRecorder from './VoiceRecorder.jsx';

export default function MessageInput({
  onSendMessage,
  onUploadFile,
  onTypingStart,
  onTypingStop,
  replyingTo,
  onCancelReply,
}) {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);
  const typingTimerRef = useRef(null);

  const emojis = ['😀', '😂', '😍', '👍', '❤️', '🔥', '🎉', '🙏', '😎', '😅', '🙌', '✨', '💯', '🤝', '🥳', '😭'];

  function handleTextChange(e) {
    setText(e.target.value);

    onTypingStart();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onTypingStop();
    }, 2000);
  }

  function handleSendText(e) {
    e.preventDefault();
    if (!text.trim() && !replyingTo) return;
    onTypingStop();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    onSendMessage({
      content: text,
      type: 'TEXT',
      replyToId: replyingTo?.id || null,
    });

    setText('');
    setShowEmojiPicker(false);
    if (onCancelReply) onCancelReply();
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await onUploadFile(file, replyingTo?.id);
      if (onCancelReply) onCancelReply();
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSendVoiceNote(audioBlob) {
    setIsRecording(false);
    setUploading(true);
    try {
      const file = new File([audioBlob], `voicenote-${Date.now()}.webm`, {
        type: 'audio/webm',
      });
      await onUploadFile(file, replyingTo?.id, true);
      if (onCancelReply) onCancelReply();
    } catch (err) {
      console.error('Voice note upload failed:', err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-gray-100 dark:bg-[#202c33] border-t border-gray-200 dark:border-gray-800/80 p-3 select-none relative">
      {/* Reply Banner */}
      {replyingTo && (
        <div className="mb-2 p-2.5 rounded-xl bg-white dark:bg-[#111b21] border-l-4 border-whatsapp-green flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="min-w-0 pr-2">
            <span className="text-xs font-semibold text-whatsapp-green block">
              Replying to message
            </span>
            <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
              {replyingTo.content || 'Attachment'}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Emoji Picker Window */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-4 z-40 bg-white dark:bg-[#202c33] border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl p-3 grid grid-cols-8 gap-2 max-w-xs animate-fadeIn">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setText((prev) => prev + emoji);
              }}
              className="text-xl hover:scale-125 transition p-1"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
      />

      {isRecording ? (
        <VoiceRecorder
          onSend={handleSendVoiceNote}
          onCancel={() => setIsRecording(false)}
        />
      ) : (
        <form onSubmit={handleSendText} className="flex items-center gap-2">
          {/* Emoji Toggle Button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-gray-500 hover:text-whatsapp-teal dark:text-gray-400 dark:hover:text-whatsapp-green transition rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/50"
            title="Emoji"
          >
            <span className="text-xl">😀</span>
          </button>

          {/* Attachment Upload Button */}
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-whatsapp-teal dark:text-gray-400 dark:hover:text-whatsapp-green transition rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/50 disabled:opacity-50"
            title="Attach file"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          {/* Text Input Field */}
          <input
            type="text"
            placeholder={uploading ? 'Uploading media...' : 'Type a message'}
            value={text}
            onChange={handleTextChange}
            disabled={uploading}
            className="flex-1 bg-white dark:bg-[#2a3942] text-gray-900 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-whatsapp-green disabled:opacity-50 placeholder-gray-400 dark:placeholder-gray-500"
          />

          {/* Record Voice Note or Send Button */}
          {text.trim() || replyingTo ? (
            <button
              type="submit"
              disabled={uploading}
              className="w-10 h-10 rounded-full bg-whatsapp-green text-white flex items-center justify-center hover:opacity-90 transition shadow flex-shrink-0 disabled:opacity-50"
              title="Send Message"
            >
              <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsRecording(true)}
              className="p-2 text-gray-500 hover:text-whatsapp-teal dark:text-gray-400 dark:hover:text-whatsapp-green transition rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/50"
              title="Record voice note"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}
        </form>
      )}
    </div>
  );
}
