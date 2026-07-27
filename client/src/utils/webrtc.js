const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

function _callingHints() {
  const isSecure = typeof window !== 'undefined' && window.isSecureContext;
  const isLocalhost = typeof location !== 'undefined' &&
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '::1');
  const isHttps = typeof location !== 'undefined' && location.protocol === 'https:';
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
  const isMobile = /android|iphone|ipad|ipod|mobile/.test(ua);
  const isIOS = /iphone|ipad|ipod/.test(ua);

  const parts = [];
  if (!isSecure) {
    parts.push('⚠️ You are on an INSECURE page (HTTP, not HTTPS/localhost). Browser security BLOCKS camera/mic on HTTP.');
  }
  if (isLocalhost) {
    parts.push('✅ localhost:5173 will work — just click "Allow" in the permission popup.');
  } else if (isHttps) {
    parts.push('✅ HTTPS detected — calls should work. Tap "Allow" when the browser prompts for mic/camera.');
  } else if (isMobile) {
    parts.push(isIOS
      ? '📱 iPhone/iPad: Only Safari supports calls over HTTP on LAN. Chrome on iOS = Safari under the hood, but you MUST use https:// OR be on localhost (not possible on iOS LAN). Use Option 2 (ngrok HTTPS tunnel).'
      : '📱 Android: Chrome on Android BLOCKS mic/cam on plain HTTP LAN IPs. Open https:// (ngrok/localtunnel) instead — that\'s the ONLY way to make calls work on mobile.');
  } else {
    parts.push(
      '💻 Desktop Chrome: Open chrome://flags/#unsafely-treat-insecure-origin-as-secure → Enable → paste ' +
      (typeof location !== 'undefined' ? location.origin : '') +
      ' → Relaunch.'
    );
  }
  return parts.join('\n');
}

export async function requestLocalMedia({ video = false, audio = true } = {}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    const hints = _callingHints();
    const base = !window.isSecureContext
      ? 'Camera & microphone are blocked on insecure (HTTP) pages. This is a browser security rule — there is no code workaround.'
      : 'getUserMedia (camera/microphone API) is not available in this browser or WebView.';
    throw new Error(`${base}\n\nHow to make calls work:\n${hints}`);
  }

  const constraints = {
    audio: audio
      ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      : false,
    video: video
      ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        }
      : false,
  };

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      throw new Error(
        `Permission denied for ${video ? 'camera and ' : ''}microphone. Enable them in your browser settings.`
      );
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      throw new Error(
        `${video ? 'Camera or ' : ''}Microphone not found. Please connect a ${video ? 'camera and ' : ''}mic.`
      );
    }
    if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      throw new Error(
        `${video ? 'Camera or ' : ''}Microphone is already in use by another app. Please close it and try again.`
      );
    }
    throw err;
  }
}

export function stopMediaStream(stream) {
  if (!stream) return;
  stream.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch {}
  });
}

export class PeerCall {
  constructor({ localStream, remoteStreamRef, onSignal, onRemoteStream, onConnected, onDisconnected, onError }) {
    this.localStream = localStream;
    this.onSignal = onSignal;
    this.onRemoteStream = onRemoteStream;
    this.onConnected = onConnected;
    this.onDisconnected = onDisconnected;
    this.onError = onError;
    this.remoteStream = new MediaStream();

    this.peerConn = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
    });

    this._bindEvents(remoteStreamRef);
  }

  _bindEvents(remoteStreamRef) {
    const pc = this.peerConn;

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream);
      });
    }

    pc.onicecandidate = (e) => {
      if (e.candidate && this.onSignal) {
        this.onSignal({ type: 'ice-candidate', candidate: e.candidate });
      }
    };

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete' && this.onSignal) {
        this.onSignal({ type: 'ice-gathering-complete', description: pc.localDescription });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected' || state === 'completed') {
        this.onConnected?.();
      }
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        this.onDisconnected?.(state);
      }
    };

    pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach((track) => {
        if (!this.remoteStream.getTrackById(track.id)) {
          this.remoteStream.addTrack(track);
        }
      });
      this.onRemoteStream?.(this.remoteStream);
      if (remoteStreamRef && 'current' in remoteStreamRef) {
        remoteStreamRef.current = this.remoteStream;
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' && this.onError) {
        this.onError(new Error('ICE connection failed. Please try again.'));
      }
    };
  }

  async createOffer() {
    const offer = await this.peerConn.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
      voiceActivityDetection: true,
    });
    await this.peerConn.setLocalDescription(offer);
    if (this.onSignal) this.onSignal({ type: 'offer', description: offer });
    return offer;
  }

  async handleRemoteDescription(description) {
    await this.peerConn.setRemoteDescription(new RTCSessionDescription(description));
  }

  async createAnswer() {
    const answer = await this.peerConn.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.peerConn.setLocalDescription(answer);
    if (this.onSignal) this.onSignal({ type: 'answer', description: answer });
    return answer;
  }

  async addIceCandidate(candidate) {
    if (!candidate) return;
    await this.peerConn.addIceCandidate(new RTCIceCandidate(candidate));
  }

  async handleRemoteSignal(signal) {
    if (!signal) return;
    switch (signal.type) {
      case 'offer':
      case 'answer':
        await this.handleRemoteDescription(signal.description);
        break;
      case 'ice-candidate':
        await this.addIceCandidate(signal.candidate);
        break;
      case 'ice-gathering-complete':
        if (!this.peerConn.remoteDescription && signal.description) {
          await this.handleRemoteDescription(signal.description);
        }
        break;
      default:
        break;
    }
  }

  close() {
    try {
      this.peerConn.close();
    } catch {}
    stopMediaStream(this.localStream);
    stopMediaStream(this.remoteStream);
  }
}
