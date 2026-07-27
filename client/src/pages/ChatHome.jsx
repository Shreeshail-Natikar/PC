import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../services/api.js';
import { useSocket } from '../context/SocketContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import ChatSidebar from '../components/ChatSidebar.jsx';
import ChatHeader from '../components/ChatHeader.jsx';
import MessageList from '../components/MessageList.jsx';
import MessageInput from '../components/MessageInput.jsx';
import CallModal from '../components/CallModal.jsx';
import MediaViewerModal from '../components/MediaViewerModal.jsx';
import ProfileModal from '../components/ProfileModal.jsx';
import { NotificationManager } from '../utils/notifications.js';
import { SoundManager } from '../utils/sounds.js';

const BASE_TITLE = 'Private Chat';

function isTabActive() {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible' && document.hasFocus();
}

async function setAppBadge(count) {
  try {
    if ('setAppBadge' in navigator) {
      if (count > 0) await navigator.setAppBadge(count);
      else await navigator.clearAppBadge();
    }
  } catch {}
}

export default function ChatHome() {
  const { socket, emitTypingStart, emitTypingStop, emitSendMessage, emitReadMessage, emitReaction, emitEditMessage, emitDeleteMessage } = useSocket();
  const { user } = useAuth();

  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [viewingMedia, setViewingMedia] = useState(null);
  const [chatClearedInfo, setChatClearedInfo] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileViewingUser, setProfileViewingUser] = useState(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [mobileView, setMobileView] = useState('sidebar');

  const initialLoadDone = useRef(false);
  const pendingUnreadRef = useRef(0);

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showSidebar = !isMobile || mobileView === 'sidebar';
  const showChat = !isMobile || mobileView === 'chat';

  useEffect(() => {
    if (NotificationManager.isSupported()) {
      NotificationManager.getPermission().then((perm) => {
        if (perm === 'default') {
          setTimeout(() => NotificationManager.requestPermission(), 1500);
        }
      });
    }
  }, []);

  const markAllAsReadNow = useCallback(async () => {
    try {
      await api.post('/messages/read');
      const now = new Date();
      if (partner) emitReadMessage(partner.id, now);
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId !== user?.id && m.status !== 'READ'
            ? { ...m, status: 'READ', readAt: now }
            : m
        )
      );
      pendingUnreadRef.current = 0;
      setUnreadCount(0);
      setAppBadge(0);
      document.title = BASE_TITLE;
    } catch {}
  }, [partner, user?.id, emitReadMessage]);

  useEffect(() => {
    (async () => {
      try {
        const { data: partnerData } = await api.get('/users/partner');
        setPartner(partnerData.partner);

        const { data: msgData } = await api.get('/messages');
        const msgs = msgData.messages || [];
        setMessages(msgs);

        if (msgData.chatClearedAt) {
          setChatClearedInfo({ at: new Date(msgData.chatClearedAt) });
        } else {
          setChatClearedInfo(null);
        }

        const initialUnread = msgs.filter(
          (m) => m.senderId !== user?.id && m.status !== 'READ'
        ).length;

        if (isTabActive()) {
          await api.post('/messages/read');
          if (partnerData.partner) emitReadMessage(partnerData.partner.id, new Date());
          pendingUnreadRef.current = 0;
          setUnreadCount(0);
          setAppBadge(0);
          document.title = BASE_TITLE;
        } else {
          pendingUnreadRef.current = initialUnread;
          setUnreadCount(initialUnread);
          setAppBadge(initialUnread);
          if (initialUnread > 0) {
            document.title = `(${initialUnread}) ${partnerData.partner?.name || 'New messages'} · ${BASE_TITLE}`;
          }
        }
        initialLoadDone.current = true;
      } catch (err) {
        console.error('Failed to load chat data:', err);
      }
    })();
  }, [user?.id, emitReadMessage]);

  useEffect(() => {
    function onVisibilityOrFocus() {
      if (initialLoadDone.current && isTabActive() && pendingUnreadRef.current > 0) {
        markAllAsReadNow();
      }
    }
    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener('focus', onVisibilityOrFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener('focus', onVisibilityOrFocus);
    };
  }, [markAllAsReadNow]);

  useEffect(() => {
    if (!socket) return;

    function handleNewMessage({ message }) {
      const isIncoming = message.senderId !== user?.id;
      setMessages((prev) => [...prev, message]);
      setChatClearedInfo(null);

      if (isIncoming) {
        const tabActive = isTabActive();

        if (tabActive) {
          api.post('/messages/read');
          if (partner) emitReadMessage(partner.id, new Date());
          SoundManager.playMessageReceived();
        } else {
          pendingUnreadRef.current += 1;
          setUnreadCount((n) => n + 1);
          const n = pendingUnreadRef.current;
          setAppBadge(n);
          document.title = `(${n}) ${partner?.name || 'New message'} · ${BASE_TITLE}`;

          NotificationManager.notifyNewMessage({
            fromName: partner?.name || 'Partner',
            content: message.content,
            type: message.type,
            onClick: () => {
              window.focus();
            },
          });
        }
      }
    }

    function handleReadUpdate({ readAt }) {
      setMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          status: 'READ',
          readAt,
        }))
      );
    }

    function handleReactionUpdate({ message }) {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? message : m))
      );
    }

    function handleEditUpdate({ message }) {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? message : m))
      );
    }

    function handleDeleteUpdate({ message }) {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? message : m))
      );
    }

    function handleProfileUpdated({ user }) {
      setPartner((prev) => (prev ? { ...prev, ...user } : user));
    }

    socket.on('message:new', handleNewMessage);
    socket.on('message:read_update', handleReadUpdate);
    socket.on('message:reaction_update', handleReactionUpdate);
    socket.on('message:edit_update', handleEditUpdate);
    socket.on('message:delete_update', handleDeleteUpdate);
    socket.on('profile:updated', handleProfileUpdated);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:read_update', handleReadUpdate);
      socket.off('message:reaction_update', handleReactionUpdate);
      socket.off('message:edit_update', handleEditUpdate);
      socket.off('message:delete_update', handleDeleteUpdate);
      socket.off('profile:updated', handleProfileUpdated);
    };
  }, [socket, partner, user, emitReadMessage, markAllAsReadNow]);

  const handleSendMessage = useCallback(
    async ({ content, type, replyToId }) => {
      try {
        const { data } = await api.post('/messages', {
          receiverId: partner?.id,
          content,
          type,
          replyToId,
        });

        const newMsg = data.message;
        setMessages((prev) => [...prev, newMsg]);
        setChatClearedInfo(null);

        SoundManager.playMessageSent();

        if (partner) {
          emitSendMessage(partner.id, newMsg);
        }
      } catch (err) {
        console.error('Failed to send message:', err);
        SoundManager.playError();
      }
    },
    [partner, emitSendMessage]
  );

  const handleUploadFile = useCallback(
    async (file, replyToId, isVoiceNote = false) => {
      const formData = new FormData();
      formData.append('file', file);
      if (isVoiceNote) formData.append('isVoiceNote', 'true');

      const { data: uploadRes } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { data: msgRes } = await api.post('/messages', {
        receiverId: partner?.id,
        content: null,
        type: uploadRes.type,
        mediaUrl: uploadRes.url,
        mediaMimeType: uploadRes.mimeType,
        mediaSize: uploadRes.size,
        replyToId,
      });

      const newMsg = msgRes.message;
      setMessages((prev) => [...prev, newMsg]);
      setChatClearedInfo(null);

      SoundManager.playMessageSent();

      if (partner) {
        emitSendMessage(partner.id, newMsg);
      }
    },
    [partner, emitSendMessage]
  );

  const handleReact = useCallback(
    async (messageId, emoji) => {
      try {
        const { data } = await api.post(`/messages/${messageId}/reaction`, { emoji });
        const updatedMsg = data.message;
        setMessages((prev) => prev.map((m) => (m.id === messageId ? updatedMsg : m)));

        if (partner) {
          emitReaction(partner.id, updatedMsg);
        }
      } catch (err) {
        console.error('Failed to react to message:', err);
      }
    },
    [partner, emitReaction]
  );

  const handleEdit = useCallback(
    async (messageId, newContent) => {
      try {
        const { data } = await api.put(`/messages/${messageId}`, { content: newContent });
        const updatedMsg = data.message;
        setMessages((prev) => prev.map((m) => (m.id === messageId ? updatedMsg : m)));

        if (partner) {
          emitEditMessage(partner.id, updatedMsg);
        }
      } catch (err) {
        console.error('Failed to edit message:', err);
      }
    },
    [partner, emitEditMessage]
  );

  const handleDelete = useCallback(
    async (messageId) => {
      try {
        const { data } = await api.delete(`/messages/${messageId}`);
        const updatedMsg = data.message;
        setMessages((prev) => prev.map((m) => (m.id === messageId ? updatedMsg : m)));

        if (partner) {
          emitDeleteMessage(partner.id, updatedMsg);
        }
      } catch (err) {
        console.error('Failed to delete message:', err);
      }
    },
    [partner, emitDeleteMessage]
  );

  const handleTypingStart = useCallback(() => {
    if (partner) emitTypingStart(partner.id);
  }, [partner, emitTypingStart]);

  const handleTypingStop = useCallback(() => {
    if (partner) emitTypingStop(partner.id);
  }, [partner, emitTypingStop]);

  const handleOpenOwnProfile = useCallback(() => {
    setProfileViewingUser(null);
    setProfileModalOpen(true);
  }, []);

  const handleOpenPartnerProfile = useCallback(() => {
    if (partner) {
      setProfileViewingUser(partner);
      setProfileModalOpen(true);
    }
  }, [partner]);

  const handleCloseProfile = useCallback(() => {
    setProfileModalOpen(false);
    setProfileViewingUser(null);
  }, []);

  const handleGoToChat = useCallback(() => {
    if (isMobile) setMobileView('chat');
  }, [isMobile]);

  const handleBackToSidebar = useCallback(() => {
    if (isMobile) setMobileView('sidebar');
  }, [isMobile]);

  const handleClearChat = useCallback(
    async () => {
      try {
        const { data } = await api.delete('/messages/clear');
        setMessages([]);
        setChatClearedInfo({ at: new Date(data.clearedAt) });
        SoundManager.playMessageSent();
      } catch (err) {
        console.error('Failed to clear chat:', err);
        SoundManager.playError();
        throw err;
      }
    },
    []
  );

  const lastMessage = messages[messages.length - 1] || null;

  return (
    <div className="h-screen h-[100dvh] h-[100svh] flex overflow-hidden bg-whatsapp-panelLight dark:bg-[#111b21]">
      {showSidebar && (
        <ChatSidebar
          partner={partner}
          lastMessage={lastMessage}
          unreadCount={unreadCount}
          onOpenOwnProfile={handleOpenOwnProfile}
          onOpenPartnerProfile={handleOpenPartnerProfile}
          onGoToChat={handleGoToChat}
          className={isMobile ? 'absolute inset-0 z-20' : ''}
          isMobile={isMobile}
        />
      )}

      {showChat && (
        <main className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-whatsapp-chatBgDark relative ${isMobile ? 'absolute inset-0 z-10' : ''}`}>
          <ChatHeader
            partner={partner}
            onClearChat={handleClearChat}
            onOpenPartnerProfile={handleOpenPartnerProfile}
            onBackToSidebar={handleBackToSidebar}
            showBackButton={isMobile}
          />

          <MessageList
            messages={messages}
            onReply={(msg) => setReplyingTo(msg)}
            onReact={handleReact}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewMedia={(media) => setViewingMedia(media)}
            chatClearedInfo={chatClearedInfo}
          />

          <MessageInput
            onSendMessage={handleSendMessage}
            onUploadFile={handleUploadFile}
            onTypingStart={handleTypingStart}
            onTypingStop={handleTypingStop}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
          />
        </main>
      )}

      <CallModal />

      <MediaViewerModal
        media={viewingMedia}
        onClose={() => setViewingMedia(null)}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={handleCloseProfile}
        viewingUser={profileViewingUser}
        notifyUserId={partner?.id}
      />
    </div>
  );
}
