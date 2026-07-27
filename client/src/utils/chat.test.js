import test from 'node:test';
import assert from 'node:assert/strict';
import { organizeMessagesByThread } from './chat.js';

test('organizes messages into per-thread lists and preserves chronological order', () => {
  const messages = [
    { id: 'm-1', senderId: 2, receiverId: 1, createdAt: '2024-01-01T00:03:00.000Z', content: 'later' },
    { id: 'm-2', senderId: 1, receiverId: 2, createdAt: '2024-01-01T00:01:00.000Z', content: 'first' },
    { id: 'm-3', senderId: 3, receiverId: 1, createdAt: '2024-01-01T00:04:00.000Z', content: 'other thread' },
    { id: 'm-4', senderId: 1, receiverId: 3, createdAt: '2024-01-01T00:02:00.000Z', content: 'reply' },
  ];

  const threads = organizeMessagesByThread(messages, 1);

  assert.equal(threads.length, 2);
  assert.deepEqual(threads[0].threadId, '1:2');
  assert.deepEqual(threads[1].threadId, '1:3');
  assert.deepEqual(
    threads[0].messages.map((message) => message.id),
    ['m-2', 'm-1']
  );
  assert.deepEqual(
    threads[1].messages.map((message) => message.id),
    ['m-4', 'm-3']
  );
  assert.equal(threads[0].messages[0].isMine, true);
  assert.equal(threads[0].messages[1].isMine, false);
});
