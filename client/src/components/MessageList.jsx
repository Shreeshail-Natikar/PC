import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function MessageList({
  messages,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onViewMedia,
  chatClearedInfo,
}) {
  const { user } = useAuth();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatClearedInfo]);

  const chatClearedAt = chatClearedInfo?.at;

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 chat-bg-light dark:chat-bg-dark bg-opacity-90 relative transition-colors duration-300">
      <div className="relative z-10 max-w-4xl mx-auto flex flex-col justify-end min-h-full">
        {messages.length === 0 && !chatClearedInfo ? (
          <div className="my-auto text-center p-6 glass-card max-w-xs mx-auto animate-scaleIn">
            <span className="text-3xl block mb-2 animate-bounceSoft">🔒</span>
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              End-to-End Encrypted Private Chat
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              Send a message to start chatting!
            </p>
          </div>
        ) : (
          <>
            {chatClearedInfo && (
              <div className="flex justify-center my-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100/90 dark:bg-yellow-900/30 border border-yellow-300/60 dark:border-yellow-700/40 text-yellow-900 dark:text-yellow-200 text-[11px] shadow-md animate-fadeIn max-w-[90%]">
                  <span className="text-base">🗑️</span>
                  <div className="flex flex-col leading-tight">
                    <span className="font-semibold">
                      You cleared this chat
                    </span>
                    <span className="opacity-75 text-[10px]">
                      {chatClearedAt &&
                        new Date(chatClearedAt).toLocaleString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          month: 'short',
                          day: 'numeric',
                        })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={msg.id}
                style={{ animationDelay: `${Math.min(idx * 20, 200)}ms` }}
                className="animate-slideUp"
              >
                <MessageBubble
                  message={msg}
                  isOwn={msg.senderId === user?.id}
                  onReply={onReply}
                  onReact={onReact}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onViewMedia={onViewMedia}
                />
              </div>
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
