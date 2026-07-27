import { useState, useRef, useEffect } from 'react';

export default function VoiceRecorder({ onSend, onCancel }) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopTimer();
    };
  }, []);

  function startTimer() {
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        if (audioBlob.size > 0) {
          onSend(audioBlob, duration);
        }
      };

      mediaRecorder.start();
      setRecording(true);
      startTimer();
    } catch (err) {
      console.error('Microphone permission denied:', err);
      alert('Could not access microphone.');
      onCancel();
    }
  }

  function handleStopAndSend() {
    stopTimer();
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
    }
  }

  function handleCancelRecording() {
    stopTimer();
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.onstop = null; // suppress sending callback
      mediaRecorderRef.current.stop();
    }
    onCancel();
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  return (
    <div className="flex items-center gap-3 flex-1 bg-red-50 dark:bg-red-950/40 px-4 py-2 rounded-xl border border-red-200 dark:border-red-800 animate-fadeIn">
      <button
        type="button"
        onClick={handleCancelRecording}
        className="text-red-500 hover:text-red-700 p-1"
        title="Cancel recording"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      <div className="flex items-center gap-2 flex-1">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
        <span className="text-xs font-semibold text-red-600 dark:text-red-400">
          Recording Voice Note... ({formatTime(duration)})
        </span>
      </div>

      <button
        type="button"
        onClick={handleStopAndSend}
        className="w-8 h-8 rounded-full bg-whatsapp-green text-white flex items-center justify-center hover:scale-105 transition shadow"
        title="Send voice note"
      >
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  );
}
