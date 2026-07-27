export function getDisplayName(userData, fallback = 'Contact') {
  return userData?.name || userData?.email || fallback;
}

export function getInitials(name, fallback = 'C') {
  const value = typeof name === 'string' ? name.trim() : '';
  if (!value) return fallback;
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || fallback;
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export function organizeMessagesByThread(messages = [], currentUserId) {
  const groupedThreads = new Map();

  for (const message of messages) {
    const peerId = currentUserId && message.senderId !== currentUserId
      ? message.senderId
      : message.receiverId;
    const threadId = currentUserId ? `${currentUserId}:${peerId}` : `${message.senderId}:${message.receiverId}`;

    if (!groupedThreads.has(threadId)) {
      groupedThreads.set(threadId, []);
    }

    groupedThreads.get(threadId).push({
      ...message,
      isMine: message.senderId === currentUserId,
      isRead: message.status === 'READ',
    });
  }

  return Array.from(groupedThreads.entries())
    .map(([threadId, threadMessages]) => ({
      threadId,
      messages: [...threadMessages].sort((left, right) => {
        const leftTime = Date.parse(left.createdAt || 0);
        const rightTime = Date.parse(right.createdAt || 0);
        return leftTime - rightTime;
      }),
    }))
    .sort((left, right) => {
      const leftTime = Date.parse(left.messages[0]?.createdAt || 0);
      const rightTime = Date.parse(right.messages[0]?.createdAt || 0);
      return leftTime - rightTime;
    });
}

export function getConversationThreadMessages(messages = [], currentUserId, peerId) {
  if (!currentUserId || !peerId) return [];

  const thread = organizeMessagesByThread(messages, currentUserId).find(
    (item) => item.threadId === `${currentUserId}:${peerId}`
  );

  return thread?.messages ?? [];
}

export function formatMessagePreview(message, fallback = 'Available') {
  if (!message) return fallback;
  if (message.isDeleted) return '🚫 This message was deleted';
  if (message.type === 'IMAGE') return '📷 Photo';
  if (message.type === 'VOICE_NOTE') return '🎙️ Voice note';
  if (message.type === 'VIDEO') return '🎥 Video';
  return message.content || 'Attachment';
}

export function formatConversationTimestamp(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
