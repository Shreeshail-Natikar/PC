import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext.jsx';

export default function CallModal() {
  const {
    incomingCall,
    activeCall,
    answerCall,
    rejectCall,
    endCall,
    localStream,
    remoteStream,
    callError,
    micEnabled,
    cameraEnabled,
    toggleMic,
    toggleCamera,
  } = useSocket();

  const [callDuration, setCallDuration] = useState(0);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    if (!localVideoRef.current) return;
    if (localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true;
    } else {
      localVideoRef.current.srcObject = null;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      if (remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current.playsInline = true;
      } else {
        remoteVideoRef.current.srcObject = null;
      }
    }
    if (remoteAudioRef.current) {
      if (remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        try {
          remoteAudioRef.current.play().catch(() => {});
        } catch {}
      } else {
        remoteAudioRef.current.srcObject = null;
      }
    }
  }, [remoteStream]);

  useEffect(() => {
    let timer = null;
    if (activeCall && (activeCall.status === 'CONNECTED' || activeCall.status === 'CONNECTING')) {
      setCallDuration(0);
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeCall?.status, activeCall?.partnerId]);

  function formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  if (incomingCall && !activeCall) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-whatsapp-teal/50 to-black/80 backdrop-blur-md" />
        <div className="relative glass-strong rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center animate-scaleIn border border-white/20">
          <div className="relative w-24 h-24 mx-auto mb-5">
            <span className="absolute inset-0 rounded-full bg-whatsapp-green/40 animate-pulseRing" />
            <span className="absolute inset-0 rounded-full bg-whatsapp-green/30 animate-pulseRing" style={{ animationDelay: '0.5s' }} />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-whatsapp-teal to-whatsapp-green text-white font-bold text-3xl mx-auto flex items-center justify-center shadow-xl animate-bounceSoft">
              {incomingCall.callerName?.[0]?.toUpperCase() || 'C'}
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
            {incomingCall.callerName}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-8 flex items-center justify-center gap-2">
            <span className="inline-flex gap-0.5 items-center">
              <span className="typing-dot bg-whatsapp-green" />
              <span className="typing-dot bg-whatsapp-green" />
              <span className="typing-dot bg-whatsapp-green" />
            </span>
            <span>Incoming {incomingCall.type === 'VIDEO' ? 'Video' : 'Voice'} Call</span>
          </p>

          <div className="flex items-center justify-center gap-8">
            <button
              onClick={rejectCall}
              className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-all duration-200 hover:bg-red-600 shadow-red-500/30"
              title="Decline"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.516l2.257-1.13a1 1 0 00.502-1.21L8.228 3.684A1 1 0 007.28 3H5z" />
              </svg>
            </button>

            <button
              onClick={answerCall}
              className="w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-all duration-200 hover:bg-green-600 shadow-green-500/30 animate-bounceSoft"
              title="Accept"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeCall) {
    const isVideo = activeCall.type === 'VIDEO';
    const hasError = activeCall.status === 'ERROR' || !!callError || !!activeCall.errorMsg;
    const finalErrorMsg = callError || activeCall.errorMsg || 'Call error';
    const statusText =
      activeCall.status === 'CONNECTED'
        ? 'Connected'
        : activeCall.status === 'CONNECTING'
        ? 'Connecting…'
        : hasError
        ? 'Could not connect'
        : activeCall.isOutgoing
        ? 'Calling…'
        : 'Ringing…';

    return (
      <div className="fixed inset-0 z-50 flex items-stretch justify-center p-0 sm:p-4 animate-fadeIn">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-slate-900 to-black" />

        {/* Video background for video calls */}
        {isVideo && remoteStream && (
          <div className="absolute inset-0 z-0">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={false}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
          </div>
        )}

        {/* Error state (full screen, regardless of video) */}
        {hasError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6">
            <div className="relative mb-6">
              <span className="absolute -inset-4 rounded-full bg-red-500/10 animate-pulseRing" />
              <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-red-500 to-rose-700 text-white flex items-center justify-center shadow-2xl border-4 border-red-400/20 animate-shake">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-extrabold text-white mb-2">{statusText}</h3>
            <div className="glass-strong max-w-md w-full rounded-2xl px-5 py-4 text-left border-red-400/30 animate-slideUp max-h-[48vh] overflow-y-auto">
              <p className="text-sm text-white/95 leading-relaxed whitespace-pre-line">
                {finalErrorMsg}
              </p>
            </div>
            <p className="text-xs text-white/60 mt-4">
              Click the red <span className="font-bold text-red-400">End</span> button below to close.
            </p>
          </div>
        )}

        {/* Fallback avatar when no remote video (and no error) */}
        {(!isVideo || !remoteStream) && !hasError && (
          <div className="absolute inset-0 z-0 flex flex-col items-center justify-center">
            <div className="relative mb-6">
              <span className="absolute -inset-4 rounded-full bg-whatsapp-green/10 animate-pulseRing" />
              <div className="relative w-36 h-36 rounded-full bg-gradient-to-br from-whatsapp-teal to-emerald-600 text-white font-extrabold text-6xl flex items-center justify-center shadow-2xl border-4 border-white/10 animate-float">
                {activeCall.partnerName?.[0]?.toUpperCase() || 'P'}
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-white mb-1">{activeCall.partnerName}</h3>
            <p className="text-sm font-medium text-white/70 flex items-center gap-2">
              {activeCall.status === 'CONNECTED' || activeCall.status === 'CONNECTING' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-whatsapp-green animate-pulse" />
                  {statusText} • {formatDuration(callDuration)}
                </>
              ) : (
                <>
                  <span className="inline-flex gap-0.5 items-center">
                    <span className="typing-dot bg-whatsapp-green" />
                    <span className="typing-dot bg-whatsapp-green" />
                    <span className="typing-dot bg-whatsapp-green" />
                  </span>
                  {statusText}
                </>
              )}
            </p>
          </div>
        )}

        {/* Remote audio element (hidden) for audio + voice calls */}
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

        {/* Local video PiP */}
        {isVideo && (
          <div className="absolute top-4 right-4 z-20 w-36 h-52 sm:w-48 sm:h-64 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/15 animate-slideDown bg-black">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity ${
                cameraEnabled ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transform: 'scaleX(-1)' }}
            />
            {!cameraEnabled && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90">
                <svg className="w-8 h-8 text-gray-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-[10px] text-gray-400">Camera off</span>
              </div>
            )}
          </div>
        )}

        {/* Remote video overlay name on video mode */}
        {isVideo && remoteStream && (
          <div className="absolute top-4 left-4 z-20 glass rounded-2xl px-4 py-2 text-white shadow-glass-dark">
            <h4 className="text-sm font-bold flex items-center gap-2">{activeCall.partnerName}</h4>
            <p className="text-[11px] text-white/70">
              {activeCall.status === 'CONNECTED' ? formatDuration(callDuration) : statusText}
            </p>
          </div>
        )}

        {/* Mic status indicator (when muted) */}
        {!micEnabled && !hasError && (
          <div className="absolute top-28 right-4 z-20 rounded-full bg-red-500/90 text-white p-2 shadow-xl animate-bounceSoft">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          </div>
        )}

        {/* Control bar */}
        <div className="absolute bottom-0 sm:bottom-4 left-0 right-0 z-30 flex justify-center items-center gap-4 sm:gap-5 pb-6 pt-8 px-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent sm:bg-transparent">
          {!hasError && (
            <button
              onClick={toggleMic}
              title={micEnabled ? 'Mute mic' : 'Unmute mic'}
              disabled={!localStream}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-110 backdrop-blur-xl ${
                !localStream
                  ? 'bg-white/5 text-white/40 border border-white/10 cursor-not-allowed'
                  : micEnabled
                  ? 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                  : 'bg-red-600 text-white border border-red-400/50 shadow-red-600/30'
              }`}
            >
              {micEnabled ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              )}
            </button>
          )}

          {!hasError && isVideo && (
            <button
              onClick={toggleCamera}
              title={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
              disabled={!localStream}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-110 backdrop-blur-xl ${
                !localStream
                  ? 'bg-white/5 text-white/40 border border-white/10 cursor-not-allowed'
                  : cameraEnabled
                  ? 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                  : 'bg-red-600 text-white border border-red-400/50 shadow-red-600/30'
              }`}
            >
              {cameraEnabled ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM4.27 4.27l15.46 15.46" />
                </svg>
              )}
            </button>
          )}

          <button
            onClick={() => endCall(activeCall.partnerId)}
            title={hasError ? 'Close error' : 'End call'}
            className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-all duration-200 hover:bg-red-700 shadow-red-600/40"
          >
            {hasError ? (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.516l2.257-1.13a1 1 0 00.502-1.21L8.228 3.684A1 1 0 007.28 3H5z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
