import { SoundManager } from './sounds.js';

const STORAGE_KEY = 'chat-notifications-enabled';

export const NotificationManager = {
  _permission: null,

  isSupported() {
    return typeof window !== 'undefined' && 'Notification' in window;
  },

  async getPermission() {
    if (!this.isSupported()) return 'unsupported';
    if (this._permission) return this._permission;
    this._permission = Notification.permission;
    return this._permission;
  },

  async requestPermission() {
    if (!this.isSupported()) return 'unsupported';
    try {
      const result = await Notification.requestPermission();
      this._permission = result;
      return result;
    } catch {
      return 'denied';
    }
  },

  isEnabled() {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  },

  setEnabled(enabled) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    }
  },

  toggle() {
    const next = !this.isEnabled();
    this.setEnabled(next);
    return next;
  },

  _getIcon() {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect width="100" height="100" rx="20" fill="#25D366"/>
        <circle cx="50" cy="45" r="20" fill="white" opacity="0.95"/>
        <path d="M35 65 Q50 80 65 65 L65 50 Q50 62 35 50 Z" fill="#25D366" opacity="0.9"/>
        <circle cx="42" cy="42" r="3" fill="#008069"/>
        <circle cx="58" cy="42" r="3" fill="#008069"/>
      </svg>
    `;
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  },

  notify({ title, body, tag = 'chat-msg', silent = false, onClick = null, timeoutMs = 6000 }) {
    if (!this.isSupported()) return;
    if (!this.isEnabled()) return;
    if (!this._permission && Notification.permission !== 'granted') return;
    if (Notification.permission !== 'granted') return;

    try {
      const notif = new Notification(title, {
        body,
        tag,
        icon: this._getIcon(),
        badge: this._getIcon(),
        silent,
        timestamp: Date.now(),
      });

      if (!silent) {
        SoundManager.playMessageReceived();
      }

      if (onClick) {
        notif.onclick = (e) => {
          e.preventDefault();
          window.focus();
          onClick(e);
          notif.close();
        };
      } else {
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }

      if (timeoutMs > 0) {
        setTimeout(() => notif.close(), timeoutMs);
      }

      return notif;
    } catch {
      return null;
    }
  },

  notifyNewMessage({ fromName, content, type = 'TEXT', onClick = null }) {
    let preview = content;
    let emoji = '💬';

    if (type === 'IMAGE') { emoji = '📷'; preview = '📷 Photo'; }
    else if (type === 'VIDEO') { emoji = '🎥'; preview = '🎥 Video'; }
    else if (type === 'VOICE_NOTE') { emoji = '🎙️'; preview = '🎙️ Voice message'; }
    else if (type === 'AUDIO') { emoji = '🎵'; preview = '🎵 Audio'; }
    else if (type === 'FILE') { emoji = '📎'; preview = '📎 File'; }
    else if (preview && preview.length > 80) {
      preview = preview.slice(0, 77) + '…';
    }

    return this.notify({
      title: `${emoji} ${fromName}`,
      body: preview || 'New message',
      tag: `chat-msg-${Date.now()}`,
      onClick,
    });
  },

  notifyIncomingCall({ callerName, type = 'VOICE', onAccept = null, onReject = null }) {
    const title = `${type === 'VIDEO' ? '📹 Video' : '📞 Voice'} Call`;
    const body = `${callerName} is calling…`;

    SoundManager.startRingtone();

    const notif = this.notify({
      title,
      body,
      tag: `chat-call-${Date.now()}`,
      silent: true,
      timeoutMs: 0,
      onClick: onAccept,
    });

    return {
      notif,
      close: () => {
        SoundManager.stopRingtone();
        if (notif) notif.close();
      },
    };
  },
};
