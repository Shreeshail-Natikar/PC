import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../services/api.js';
import { useSocket } from '../context/SocketContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useContacts } from '../context/ContactsContext.jsx';
import ChatSidebar from '../components/ChatSidebar.jsx';
import ChatHeader from '../components/ChatHeader.jsx';
import MessageList from '../components/MessageList.jsx';
import MessageInput from '../components/MessageInput.jsx';
import CallModal from '../components/CallModal.jsx';
import MediaViewerModal from '../components/MediaViewerModal.jsx';
import ProfileModal from '../components/ProfileModal.jsx';
import AddContactModal from '../components/AddContactModal.jsx';
import { NotificationManager } from '../utils/notifications.js';
import { SoundManager } from '../utils/sounds.js';
import { BASE_TITLE } from '../constants/chat.js';
import { getConversationThreadMessages, getDisplayName } from '../utils/chat.js';

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
  const { contacts } = useContacts();

  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [viewingMedia, setViewingMedia] = useState(null);
  const [chatClearedInfo, setChatClearedInfo] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileViewingUser, setProfileViewingUser] = useState(null);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [mobileView, setMobileView] = useState('sidebar');

  const initialLoadDone = useRef(false);
  const pendingUnreadRef = useRef(0);

  const normalizeConversationMessages = useCallback((contactId, nextMessages) => {
    return getConversationThreadMessages(nextMessages, user?.id, contactId);
  }, [user?.id]);

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

  const storeConversationMessages = useCallback((contactId, nextMessages) => {
    setConversations((prev) => ({ ...prev, [contactId]: nextMessages }));
    if (activeContact?.id === contactId) {
      setMessages(nextMessages);
    }
  }, [activeContact?.id]);

  const updateConversationMessage = useCallback((contactId, messageId, updater) => {
    setConversations((prev) => {
      const prevMessages = prev[contactId] || [];
      const nextMessages = normalizeConversationMessages(contactId, prevMessages.map((msg) => (msg.id === messageId ? updater(msg) : msg)));
      if (activeContact?.id === contactId) {
        setMessages(nextMessages);
      }
      return { ...prev, [contactId]: nextMessages };
    });
  }, [activeContact?.id, normalizeConversationMessages]);

  const markAllAsReadNow = useCallback(async () => {
    try {
      await api.post('/messages/read');
      const now = new Date();
      if (activeContact) emitReadMessage(activeContact.id, now);
      const nextMessages = normalizeConversationMessages(activeContact?.id, (messages || []).map((m) =>
        m.senderId !== user?.id && m.status !== 'READ'
          ? { ...m, status: 'READ', readAt: now }
          : m
      ));
      setMessages(nextMessages);
      if (activeContact) {
        setConversations((prev) => ({ ...prev, [activeContact.id]: nextMessages }));
      }
      pendingUnreadRef.current = 0;
      setUnreadCount(0);
      setAppBadge(0);
      document.title = BASE_TITLE;
    } catch {}
  }, [activeContact, messages, normalizeConversationMessages, user?.id, emitReadMessage]);

  useEffect(() => {
    if (!contacts.length) {
      setActiveContact(null);
      setMessages([]);
      return;
    }

    const isStillSelected = activeContact && contacts.some((c) => c.user.id === activeContact.id);
    if (!isStillSelected) {
      setActiveContact(contacts[0].user);
    }
  }, [contacts, activeContact]);

  useEffect(() => {
    if (!activeContact?.id) {
      setMessages([]);
      return;
    }

    if (conversations[activeContact.id]) {
      setMessages(conversations[activeContact.id]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data: msgData } = await api.get(`/messages?receiverId=${activeContact.id}`);
        const msgs = msgData.messages || [];
        if (!cancelled) {
          const normalizedMessages = normalizeConversationMessages(activeContact.id, msgs);
          storeConversationMessages(activeContact.id, normalizedMessages);
          if (msgData.chatClearedAt) {
            setChatClearedInfo({ at: new Date(msgData.chatClearedAt) });
          } else {
            setChatClearedInfo(null);
          }

          const initialUnread = normalizedMessages.filter((m) => m.senderId !== user?.id && m.status !== 'READ').length;
          if (isTabActive()) {
            await api.post('/messages/read');
            if (activeContact) emitReadMessage(activeContact.id, new Date());
            pendingUnreadRef.current = 0;
            setUnreadCount(0);
            setAppBadge(0);
            document.title = BASE_TITLE;
          } else {
            pendingUnreadRef.current = initialUnread;
            setUnreadCount(initialUnread);
            setAppBadge(initialUnread);
            if (initialUnread > 0) {
              document.title = `(${initialUnread}) ${activeContact?.name || 'New messages'} · ${BASE_TITLE}`;
            }
          }
          initialLoadDone.current = true;
        }
      } catch (err) {
        console.error('Failed to load chat data:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeContact?.id, conversations, normalizeConversationMessages, storeConversationMessages, user?.id, emitReadMessage]);

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
      const contactId = isIncoming ? message.senderId : message.receiverId;
      if (!contactId) return;

      setConversations((prev) => {
        const prevMessages = prev[contactId] || [];
        const nextMessages = normalizeConversationMessages(contactId, [...prevMessages, message]);
        if (activeContact?.id === contactId) {
          setMessages(nextMessages);
        }
        return { ...prev, [contactId]: nextMessages };
      });
      setChatClearedInfo(null);

      if (isIncoming) {
        const tabActive = isTabActive();
        const senderName = getDisplayName(contacts.find((c) => c.user.id === contactId)?.user, 'Contact');

        if (tabActive) {
          api.post('/messages/read');
          emitReadMessage(contactId, new Date());
          SoundManager.playMessageReceived();
        } else {
          pendingUnreadRef.current += 1;
          setUnreadCount((n) => n + 1);
          const n = pendingUnreadRef.current;
          setAppBadge(n);
          document.title = `(${n}) ${senderName} · ${BASE_TITLE}`;

          NotificationManager.notifyNewMessage({
            fromName: senderName,
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
      if (!activeContact?.id) return;
      setConversations((prev) => {
        const prevMessages = prev[activeContact.id] || [];
        const nextMessages = normalizeConversationMessages(activeContact.id, prevMessages.map((msg) => ({ ...msg, status: 'READ', readAt })));
        setMessages(nextMessages);
        return { ...prev, [activeContact.id]: nextMessages };
      });
    }

    function handleReactionUpdate({ message }) {
      if (!message?.id || !activeContact?.id) return;
      updateConversationMessage(activeContact.id, message.id, () => message);
    }

    function handleEditUpdate({ message }) {
      if (!message?.id || !activeContact?.id) return;
      updateConversationMessage(activeContact.id, message.id, () => message);
    }

    function handleDeleteUpdate({ message }) {
      if (!message?.id || !activeContact?.id) return;
      updateConversationMessage(activeContact.id, message.id, () => message);
    }

    function handleProfileUpdated({ user }) {
      setActiveContact((prev) => (prev?.id === user.id ? { ...prev, ...user } : prev));
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
  }, [socket, activeContact, contacts, user, emitReadMessage, markAllAsReadNow, normalizeConversationMessages, updateConversationMessage]);

  const handleSendMessage = useCallback(
    async ({ content, type, replyToId }) => {
      try {
        const { data } = await api.post('/messages', {
          receiverId: activeContact?.id,
          content,
          type,
          replyToId,
        });

        const newMsg = data.message;
        setConversations((prev) => {
          const prevMessages = prev[activeContact?.id] || [];
          const nextMessages = normalizeConversationMessages(activeContact?.id, [...prevMessages, newMsg]);
          if (activeContact?.id) {
            setMessages(nextMessages);
          }
          return { ...prev, [activeContact?.id]: nextMessages };
        });
        setChatClearedInfo(null);

        SoundManager.playMessageSent();

        if (activeContact) {
          emitSendMessage(activeContact.id, newMsg);
        }
      } catch (err) {
        console.error('Failed to send message:', err);
        SoundManager.playError();
      }
    },
    [activeContact, emitSendMessage, normalizeConversationMessages]
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
        receiverId: activeContact?.id,
        content: null,
        type: uploadRes.type,
        mediaUrl: uploadRes.url,
        mediaMimeType: uploadRes.mimeType,
        mediaSize: uploadRes.size,
        replyToId,
      });

      const newMsg = msgRes.message;
      setConversations((prev) => {
        const prevMessages = prev[activeContact?.id] || [];
        const nextMessages = normalizeConversationMessages(activeContact?.id, [...prevMessages, newMsg]);
        if (activeContact?.id) {
          setMessages(nextMessages);
        }
        return { ...prev, [activeContact?.id]: nextMessages };
      });
      setChatClearedInfo(null);

      SoundManager.playMessageSent();

      if (activeContact) {
        emitSendMessage(activeContact.id, newMsg);
      }
    },
    [activeContact, emitSendMessage, normalizeConversationMessages]
  );

  const handleReact = useCallback(
    async (messageId, emoji) => {
      try {
        const { data } = await api.post(`/messages/${messageId}/reaction`, { emoji });
        const updatedMsg = data.message;
        if (activeContact?.id) {
          updateConversationMessage(activeContact.id, messageId, () => updatedMsg);
        }

        if (activeContact) {
          emitReaction(activeContact.id, updatedMsg);
        }
      } catch (err) {
        console.error('Failed to react to message:', err);
      }
    },
    [activeContact, emitReaction, updateConversationMessage]
  );

  const handleEdit = useCallback(
    async (messageId, newContent) => {
      try {
        const { data } = await api.put(`/messages/${messageId}`, { content: newContent });
        const updatedMsg = data.message;
        if (activeContact?.id) {
          updateConversationMessage(activeContact.id, messageId, () => updatedMsg);
        }

        if (activeContact) {
          emitEditMessage(activeContact.id, updatedMsg);
        }
      } catch (err) {
        console.error('Failed to edit message:', err);
      }
    },
    [activeContact, emitEditMessage, updateConversationMessage]
  );

  const handleDelete = useCallback(
    async (messageId) => {
      try {
        const { data } = await api.delete(`/messages/${messageId}`);
        const updatedMsg = data.message;
        if (activeContact?.id) {
          updateConversationMessage(activeContact.id, messageId, () => updatedMsg);
        }

        if (activeContact) {
          emitDeleteMessage(activeContact.id, updatedMsg);
        }
      } catch (err) {
        console.error('Failed to delete message:', err);
      }
    },
    [activeContact, emitDeleteMessage, updateConversationMessage]
  );

  const handleTypingStart = useCallback(() => {
    if (activeContact) emitTypingStart(activeContact.id);
  }, [activeContact, emitTypingStart]);

  const handleTypingStop = useCallback(() => {
    if (activeContact) emitTypingStop(activeContact.id);
  }, [activeContact, emitTypingStop]);

  const handleOpenOwnProfile = useCallback(() => {
    setProfileViewingUser(null);
    setProfileModalOpen(true);
  }, []);

  const handleOpenPartnerProfile = useCallback(() => {
    if (activeContact) {
      setProfileViewingUser(activeContact);
      setProfileModalOpen(true);
    }
  }, [activeContact]);

  const handleOpenAddContact = useCallback(() => {
    setAddContactOpen(true);
  }, []);

  const handleCloseAddContact = useCallback(() => {
    setAddContactOpen(false);
  }, []);

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
          activeContact={activeContact}
          contacts={contacts}
          lastMessage={lastMessage}
          unreadCount={unreadCount}
          onOpenOwnProfile={handleOpenOwnProfile}
          onOpenPartnerProfile={handleOpenPartnerProfile}
          onOpenAddContact={handleOpenAddContact}
          onSelectContact={setActiveContact}
          onGoToChat={handleGoToChat}
          className={isMobile ? 'absolute inset-0 z-20' : ''}
          isMobile={isMobile}
        />
      )}

      {showChat && (
        <main className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-whatsapp-chatBgDark relative ${isMobile ? 'absolute inset-0 z-10' : ''}`}>
          <ChatHeader
            partner={activeContact}
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

      <AddContactModal
        isOpen={addContactOpen}
        onClose={handleCloseAddContact}
        onContactAdded={handleCloseAddContact}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={handleCloseProfile}
        viewingUser={profileViewingUser}
        notifyUserId={activeContact?.id}
      />
    </div>
  );
}
