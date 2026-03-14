import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, Info, AlertCircle, ChevronDown, Hash, Play } from 'lucide-react';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const TUNING_DATA = [
  { note: 'E2', name: 'Mi', freq: 82.41, string: 6 },
  { note: 'A2', name: 'Lá', freq: 110.00, string: 5 },
  { note: 'D3', name: 'Ré', freq: 146.83, string: 4 },
  { note: 'G3', name: 'Sol', freq: 196.00, string: 3 },
  { note: 'B3', name: 'Si', freq: 246.94, string: 2 },
  { note: 'E4', name: 'Mi', freq: 329.63, string: 1 },
];

export const Tuner: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [pitch, setPitch] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [cents, setCents] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedString, setSelectedString] = useState<number | null>(null);
  const [mode, setMode] = useState<'chromatic' | 'string-by-string'>('string-by-string');

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      setIsListening(true);
      setError(null);
      updatePitch();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  };

  const stopListening = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsListening(false);
    setPitch(null);
    setNote(null);
    setCents(0);
  };

  const updatePitch = () => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.fftSize;
    const buffer = new Float32Array(bufferLength);
    analyserRef.current.getFloatTimeDomainData(buffer);
    
    const autoCorrelatePitch = autoCorrelate(buffer, audioContextRef.current!.sampleRate);
    
    if (autoCorrelatePitch !== -1) {
      setPitch(autoCorrelatePitch);
      const { noteName, centsOff } = getNoteFromFrequency(autoCorrelatePitch);
      setNote(noteName);
      setCents(centsOff);
    }
    
    animationFrameRef.current = requestAnimationFrame(updatePitch);
  };

  const autoCorrelate = (buffer: Float32Array, sampleRate: number) => {
    let size = buffer.length;
    let rms = 0;
    for (let i = 0; i < size; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / size);
    if (rms < 0.01) return -1;

    let r1 = 0, r2 = size - 1, thres = 0.2;
    for (let i = 0; i < size / 2; i++) {
      if (Math.abs(buffer[i]) < thres) {
        r1 = i;
        break;
      }
    }
    for (let i = 1; i < size / 2; i++) {
      if (Math.abs(buffer[size - i]) < thres) {
        r2 = size - i;
        break;
      }
    }

    const buf = buffer.slice(r1, r2);
    size = buf.length;

    const c = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size - i; j++) {
        c[i] = c[i] + buf[j] * buf[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < size; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    let T0 = maxpos;

    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
  };

  const getNoteFromFrequency = (frequency: number) => {
    const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    const roundedNoteNum = Math.round(noteNum) + 69;
    const noteName = NOTES[roundedNoteNum % 12];
    const centsOff = Math.floor(1200 * (Math.log(frequency / (440 * Math.pow(2, (roundedNoteNum - 69) / 12))) / Math.log(2)));
    return { noteName, centsOff };
  };

  useEffect(() => {
    return () => stopListening();
  }, []);

  const getTunerColor = () => {
    if (!isListening || note === null) return 'text-white/20';
    if (Math.abs(cents) < 5) return 'text-jumas-green';
    if (Math.abs(cents) < 15) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white overflow-hidden relative font-sans">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#1a1a1a]/50 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full transition-colors ${isListening ? 'bg-jumas-green/20 text-jumas-green' : 'bg-white/5 text-white/40'}`}>
            <Mic size={20} />
          </div>
          <button 
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all"
            onClick={() => !isListening ? startListening() : stopListening()}
          >
            <span className="font-bold text-sm">Violão e Guitarra</span>
            <ChevronDown size={16} className="text-white/40" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          {/* Buttons removed */}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden">
        {/* Strings Visualization */}
        <div className="absolute inset-0 flex justify-center gap-8 md:gap-12 px-4">
          {TUNING_DATA.map((s, idx) => (
            <div 
              key={idx} 
              className={`w-[1px] h-full bg-gradient-to-b from-white/5 via-white/10 to-transparent relative transition-all duration-500 ${selectedString === s.string ? 'bg-jumas-green/40 w-[2px]' : ''}`}
            >
              {selectedString === s.string && (
                <motion.div 
                  layoutId="string-glow"
                  className="absolute inset-0 bg-jumas-green/20 blur-sm"
                />
              )}
            </div>
          ))}
        </div>

        {/* Status Text */}
        <div className="relative z-10 text-center mb-24">
          <AnimatePresence mode="wait">
            {isListening && note ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className={`text-8xl font-black tracking-tighter transition-colors duration-200 ${getTunerColor()}`}>
                  {note}
                </div>
                <div className="text-sm font-bold text-white/40 uppercase tracking-[0.2em]">
                  {pitch?.toFixed(1)} Hz
                </div>
              </motion.div>
            ) : (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-lg md:text-xl text-white/60 font-medium"
              >
                Escolha uma corda para afinar
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Tuning Meter (Bottom part of central area) */}
        <div className="absolute bottom-32 left-0 right-0 flex flex-col items-center gap-4 px-6">
          <div className="w-full max-w-md h-12 relative flex items-center justify-center">
            {/* Meter Scale */}
            <div className="absolute inset-0 flex justify-between items-end px-2">
              {[...Array(21)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-0.5 rounded-full transition-all ${
                    i === 10 ? 'h-8 bg-white/40' : i % 5 === 0 ? 'h-5 bg-white/20' : 'h-3 bg-white/10'
                  }`} 
                />
              ))}
            </div>
            
            {/* Needle */}
            {isListening && note && (
              <motion.div 
                animate={{ x: `${(cents / 50) * 100}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute bottom-0 w-1 h-10 bg-jumas-green shadow-[0_0_15px_rgba(34,197,94,0.5)] z-20 rounded-full"
              />
            )}
          </div>
        </div>

        {/* String Buttons */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 md:gap-6 px-4 z-20">
          {TUNING_DATA.map((s) => (
            <div key={s.string} className="flex flex-col items-center gap-3">
              <button
                onClick={() => {
                  setSelectedString(s.string);
                  if (!isListening) startListening();
                }}
                className={`relative w-12 h-16 md:w-14 md:h-20 flex items-center justify-center transition-all duration-300 group ${
                  selectedString === s.string ? 'scale-110' : 'hover:scale-105'
                }`}
              >
                {/* Teardrop Shape */}
                <div className={`absolute inset-0 rounded-full rounded-tl-none rotate-45 border-2 transition-all duration-300 ${
                  selectedString === s.string 
                    ? 'bg-jumas-green/20 border-jumas-green shadow-[0_0_20px_rgba(34,197,94,0.3)]' 
                    : 'bg-white/5 border-white/10 group-hover:border-white/30'
                }`} />
                
                <div className="relative z-10 flex flex-col items-center">
                  <span className={`text-sm md:text-base font-black transition-colors ${selectedString === s.string ? 'text-jumas-green' : 'text-white/60'}`}>
                    {s.note[0]}<sub className="text-[10px]">{s.note[1]}</sub>
                  </span>
                </div>
              </button>
              <span className={`text-xs font-bold transition-colors ${selectedString === s.string ? 'text-jumas-green' : 'text-white/40'}`}>
                {s.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-[#1a1a1a] border-t border-white/5 px-4 py-3 flex items-center justify-around z-30">
        <button 
          onClick={() => setMode('chromatic')}
          className={`flex flex-col items-center gap-1 transition-all ${mode === 'chromatic' ? 'text-jumas-green' : 'text-white/40 hover:text-white/60'}`}
        >
          <Hash size={20} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Cromático</span>
        </button>
        <button 
          onClick={() => setMode('string-by-string')}
          className={`flex flex-col items-center gap-1 transition-all relative ${mode === 'string-by-string' ? 'text-jumas-green' : 'text-white/40 hover:text-white/60'}`}
        >
          <div className="flex gap-0.5">
            <div className="w-0.5 h-4 bg-current rounded-full" />
            <div className="w-0.5 h-4 bg-current rounded-full" />
            <div className="w-0.5 h-4 bg-current rounded-full" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">Corda a corda</span>
          {mode === 'string-by-string' && (
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 flex gap-0.5">
              <div className="w-1 h-1 bg-jumas-green rounded-full" />
              <div className="w-1 h-1 bg-jumas-green rounded-full" />
              <div className="w-1 h-1 bg-jumas-green rounded-full" />
            </div>
          )}
        </button>
      </div>

      {error && (
        <div className="absolute top-24 left-4 right-4 z-50 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-sm font-medium backdrop-blur-md">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
    </div>
  );
};

