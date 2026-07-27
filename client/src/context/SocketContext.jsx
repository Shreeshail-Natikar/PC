import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';
import { getAccessToken } from '../services/api.js';
import { SoundManager } from '../utils/sounds.js';
import { NotificationManager } from '../utils/notifications.js';
import { PeerCall, requestLocalMedia, stopMediaStream } from '../utils/webrtc.js';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [partnerPresence, setPartnerPresence] = useState({ isOnline: false, lastSeen: null });
  const [isTyping, setIsTyping] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callError, setCallError] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  const socketRef = useRef(null);
  const callNotifRef = useRef(null);
  const peerCallRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingSignalsRef = useRef([]);

  const flushPendingSignals = useCallback(async () => {
    const peer = peerCallRef.current;
    if (!peer || pendingSignalsRef.current.length === 0) return;
    const queue = [...pendingSignalsRef.current];
    pendingSignalsRef.current = [];
    for (const sig of queue) {
      try {
        await peer.handleRemoteSignal(sig);
      } catch {
      }
    }
  }, []);

  const cleanupCall = useCallback(() => {
    try {
      peerCallRef.current?.close();
    } catch {}
    peerCallRef.current = null;
    pendingSignalsRef.current = [];
    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallError(null);
    setMicEnabled(true);
    setCameraEnabled(true);
  }, []);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
      cleanupCall();
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    const s = io('/', {
      auth: { token },
      reconnection: true,
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      setConnected(true);
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    s.on('presence:update', ({ isOnline, lastSeen }) => {
      setPartnerPresence({ isOnline, lastSeen });
    });

    s.on('typing:start', () => {
      setIsTyping(true);
    });

    s.on('typing:stop', () => {
      setIsTyping(false);
    });

    s.on('call:incoming', ({ fromUserId, type, callerName }) => {
      setIncomingCall({ fromUserId, type, callerName });
      callNotifRef.current = NotificationManager.notifyIncomingCall({
        callerName,
        type,
        onAccept: () => {
          answerCall();
        },
      });
    });

    s.on('call:accepted', async () => {
      SoundManager.stopRingtone();
      if (callNotifRef.current) {
        callNotifRef.current.close();
        callNotifRef.current = null;
      }
      SoundManager.playCallConnect();
      setActiveCall((prev) => (prev ? { ...prev, status: 'CONNECTED' } : null));

      const peer = peerCallRef.current;
      if (peer) {
        await flushPendingSignals();
      }
    });

    s.on('call:rejected', () => {
      SoundManager.stopRingtone();
      if (callNotifRef.current) {
        callNotifRef.current.close();
        callNotifRef.current = null;
      }
      cleanupCall();
      setActiveCall(null);
      setIncomingCall(null);
    });

    s.on('call:ended', () => {
      SoundManager.stopRingtone();
      SoundManager.playCallEnd();
      if (callNotifRef.current) {
        callNotifRef.current.close();
        callNotifRef.current = null;
      }
      cleanupCall();
      setActiveCall(null);
      setIncomingCall(null);
    });

    s.on('call:signal', async ({ signal }) => {
      const peer = peerCallRef.current;
      if (!peer) {
        pendingSignalsRef.current.push(signal);
        return;
      }
      try {
        await peer.handleRemoteSignal(signal);
      } catch {
      }
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
      SoundManager.stopRingtone();
      if (callNotifRef.current) {
        callNotifRef.current.close();
        callNotifRef.current = null;
      }
      cleanupCall();
    };
  }, [user, cleanupCall, flushPendingSignals]);

  const emitTypingStart = useCallback((toUserId) => {
    if (socketRef.current) socketRef.current.emit('typing:start', { toUserId });
  }, []);

  const emitTypingStop = useCallback((toUserId) => {
    if (socketRef.current) socketRef.current.emit('typing:stop', { toUserId });
  }, []);

  const emitSendMessage = useCallback((toUserId, message) => {
    if (socketRef.current) socketRef.current.emit('message:send', { toUserId, message });
  }, []);

  const emitReadMessage = useCallback((toUserId, readAt) => {
    if (socketRef.current) socketRef.current.emit('message:read', { toUserId, readAt });
  }, []);

  const emitReaction = useCallback((toUserId, message) => {
    if (socketRef.current) socketRef.current.emit('message:reaction', { toUserId, message });
  }, []);

  const emitEditMessage = useCallback((toUserId, message) => {
    if (socketRef.current) socketRef.current.emit('message:edit', { toUserId, message });
  }, []);

  const emitDeleteMessage = useCallback((toUserId, message) => {
    if (socketRef.current) socketRef.current.emit('message:delete', { toUserId, message });
  }, []);

  const createPeer = useCallback(
    (stream, type, toUserId) => {
      const sendSignal = (signal) => {
        if (socketRef.current) {
          socketRef.current.emit('call:signal', { toUserId, signal });
        }
      };

      const peer = new PeerCall({
        localStream: stream,
        remoteStreamRef,
        onSignal: sendSignal,
        onRemoteStream: (stream) => {
          setRemoteStream(stream);
        },
        onConnected: () => {
          setActiveCall((prev) => (prev ? { ...prev, status: 'CONNECTED' } : prev));
        },
        onDisconnected: (state) => {
          if (state === 'failed' || state === 'disconnected') {
            setCallError('Call was disconnected.');
          }
        },
        onError: (err) => {
          setCallError(err.message || 'Call error.');
        },
      });

      peerCallRef.current = peer;
      return peer;
    },
    []
  );

  const startCall = useCallback(
    async (toUserId, type, partnerName) => {
      if (!socketRef.current) return;
      setCallError(null);

      try {
        const stream = await requestLocalMedia({
          video: type === 'VIDEO',
          audio: true,
        });
        setLocalStream(stream);
        setMicEnabled(true);
        setCameraEnabled(type === 'VIDEO');

        const peer = createPeer(stream, type, toUserId);

        setActiveCall({
          partnerId: toUserId,
          partnerName,
          type,
          status: 'RINGING',
          isOutgoing: true,
        });

        socketRef.current.emit('call:invite', {
          toUserId,
          type,
          callerName: user?.name,
        });

        SoundManager.startRingtone();

        await peer.createOffer();
        await flushPendingSignals();
      } catch (err) {
        const msg = err.message || 'Failed to start call.';
        console.error('[startCall] error:', err);
        setCallError(msg);
        SoundManager.stopRingtone();
        SoundManager.playError();
        setActiveCall((prev) =>
          prev ? { ...prev, status: 'ERROR', errorMsg: msg } : {
            partnerId: toUserId,
            partnerName,
            type,
            status: 'ERROR',
            isOutgoing: true,
            errorMsg: msg,
          }
        );
        if (socketRef.current) {
          socketRef.current.emit('call:reject', { toUserId });
        }
      }
    },
    [user, createPeer, flushPendingSignals]
  );

  const answerCall = useCallback(async () => {
    if (!incomingCall || !socketRef.current) return;
    setCallError(null);
    let accepted = false;
    const callInfo = { ...incomingCall };

    try {
      const stream = await requestLocalMedia({
        video: incomingCall.type === 'VIDEO',
        audio: true,
      });
      setLocalStream(stream);
      setMicEnabled(true);
      setCameraEnabled(incomingCall.type === 'VIDEO');

      const peer = createPeer(stream, incomingCall.type, incomingCall.fromUserId);

      setActiveCall({
        partnerId: incomingCall.fromUserId,
        partnerName: incomingCall.callerName,
        type: incomingCall.type,
        status: 'CONNECTING',
        isOutgoing: false,
      });

      setIncomingCall(null);
      SoundManager.stopRingtone();
      if (callNotifRef.current) {
        callNotifRef.current.close();
        callNotifRef.current = null;
      }

      const queued = pendingSignalsRef.current.slice();
      pendingSignalsRef.current = [];

      const offer = queued.find((s) => s.type === 'offer');
      const otherSignals = queued.filter((s) => s !== offer);

      if (!offer) {
        await new Promise((r) => setTimeout(r, 150));
        const tail = pendingSignalsRef.current.slice();
        pendingSignalsRef.current = [];
        const offer2 = tail.find((s) => s.type === 'offer');
        if (offer2) {
          await peer.handleRemoteSignal(offer2);
          for (const sig of tail.filter((s) => s !== offer2)) {
            try { await peer.handleRemoteSignal(sig); } catch {}
          }
        } else {
          for (const sig of tail) {
            try { await peer.handleRemoteSignal(sig); } catch {}
          }
        }
      } else {
        await peer.handleRemoteSignal(offer);
        for (const sig of otherSignals) {
          try { await peer.handleRemoteSignal(sig); } catch {}
        }
      }

      await peer.createAnswer();

      accepted = true;
      socketRef.current.emit('call:answer', { toUserId: callInfo.fromUserId });

      SoundManager.playCallConnect();

      await flushPendingSignals();
    } catch (err) {
      const msg = err.message || 'Failed to answer call.';
      console.error('[answerCall] error:', err);
      setCallError(msg);
      SoundManager.stopRingtone();
      SoundManager.playError();

      if (accepted) {
        if (socketRef.current) {
          socketRef.current.emit('call:end', { toUserId: callInfo.fromUserId });
        }
      } else if (socketRef.current) {
        socketRef.current.emit('call:reject', { toUserId: callInfo.fromUserId });
      }

      setActiveCall({
        partnerId: callInfo.fromUserId,
        partnerName: callInfo.callerName,
        type: callInfo.type,
        status: 'ERROR',
        isOutgoing: false,
        errorMsg: msg,
      });
      setIncomingCall(null);
      if (callNotifRef.current) {
        callNotifRef.current.close();
        callNotifRef.current = null;
      }
    }
  }, [incomingCall, createPeer, flushPendingSignals]);

  const rejectCall = useCallback(() => {
    if (incomingCall && socketRef.current) {
      socketRef.current.emit('call:reject', { toUserId: incomingCall.fromUserId });
    }
    SoundManager.stopRingtone();
    if (callNotifRef.current) {
      callNotifRef.current.close();
      callNotifRef.current = null;
    }
    cleanupCall();
    setIncomingCall(null);
  }, [incomingCall, cleanupCall]);

  const endCall = useCallback(
    (toUserId) => {
      if (socketRef.current && toUserId) {
        socketRef.current.emit('call:end', { toUserId });
      }
      SoundManager.stopRingtone();
      SoundManager.playCallEnd();
      if (callNotifRef.current) {
        callNotifRef.current.close();
        callNotifRef.current = null;
      }
      cleanupCall();
      setActiveCall(null);
      setIncomingCall(null);
    },
    [cleanupCall]
  );

  const toggleMic = useCallback(() => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicEnabled(audioTrack.enabled);
    }
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCameraEnabled(videoTrack.enabled);
    }
  }, [localStream]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        partnerPresence,
        isTyping,
        incomingCall,
        activeCall,
        localStream,
        remoteStream,
        callError,
        micEnabled,
        cameraEnabled,
        setPartnerPresence,
        emitTypingStart,
        emitTypingStop,
        emitSendMessage,
        emitReadMessage,
        emitReaction,
        emitEditMessage,
        emitDeleteMessage,
        startCall,
        answerCall,
        rejectCall,
        endCall,
        toggleMic,
        toggleCamera,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
