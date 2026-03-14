import React, { useState } from 'react';
import Chord from '@tombatossals/react-chords/lib/Chord';
import guitarDb from '@tombatossals/chords-db/lib/guitar.json';
import ukuleleDb from '@tombatossals/chords-db/lib/ukulele.json';
import { ChevronLeft, ChevronRight, Guitar, Music, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChordDiagramsProps {
  chords: string[];
  highlightedChord?: string | null;
}

type Instrument = 'guitar' | 'ukulele';

export const ChordDiagrams: React.FC<ChordDiagramsProps> = ({ chords, highlightedChord }) => {
  const [instrument, setInstrument] = useState<Instrument>('guitar');
  const [isVisible, setIsVisible] = useState(false);

  // Auto-show if a chord is highlighted
  React.useEffect(() => {
    if (highlightedChord) {
      setIsVisible(true);
    }
  }, [highlightedChord]);

  if (chords.length === 0) return null;

  const db = instrument === 'guitar' ? guitarDb : ukuleleDb;
  const instrumentData = {
    strings: instrument === 'guitar' ? 6 : 4,
    fretsOnChord: 4,
    name: instrument === 'guitar' ? 'Guitar' : 'Ukulele',
    keys: [],
    tunings: {
      standard: instrument === 'guitar' ? ['E', 'A', 'D', 'G', 'B', 'E'] : ['G', 'C', 'E', 'A']
    }
  };

  const getChordData = (chordName: string) => {
    // Handle bass notes (e.g., C/G -> C)
    const baseChord = chordName.split('/')[0];
    
    // Basic normalization: C# -> Csharp, Bb -> Bflat
    let key = baseChord.charAt(0).toUpperCase();
    let suffix = baseChord.slice(1);
    
    // Handle sharps and flats
    if (suffix.startsWith('#')) {
      key += 'sharp';
      suffix = suffix.slice(1);
    } else if (suffix.startsWith('b')) {
      key += 'flat';
      suffix = suffix.slice(1);
    }

    // Map common suffixes to the ones in chords-db
    const suffixMap: Record<string, string> = {
      '': 'major',
      'm': 'minor',
      'M': 'major',
      'min': 'minor',
      'maj': 'major',
      '7': '7',
      'm7': 'm7',
      'M7': 'maj7',
      'maj7': 'maj7',
      '9': '9',
      'm9': 'm9',
      'add9': 'add9',
      'sus4': 'sus4',
      'sus2': 'sus2',
      '7sus4': '7sus4',
      'dim': 'dim',
      'dim7': 'dim7',
      'aug': 'aug',
      '6': '6',
      'm6': 'm6',
      '6/9': '69',
      '9sus4': '9sus4',
      '11': '11',
      '13': '13',
    };

    const chordKey = (db.chords as any)[key];
    if (!chordKey) return null;

    // Try exact match first
    let variation = chordKey.find((v: any) => v.suffix === suffix);
    if (variation) return variation.positions[0];

    // Try mapped suffix
    const mappedSuffix = suffixMap[suffix];
    if (mappedSuffix) {
      variation = chordKey.find((v: any) => v.suffix === mappedSuffix);
      if (variation) return variation.positions[0];
    }

    // Try minor mapping if it starts with m
    if (suffix.startsWith('m') && !suffix.startsWith('maj')) {
      const minorSuffix = 'minor' + suffix.slice(1);
      variation = chordKey.find((v: any) => v.suffix === minorSuffix);
      if (variation) return variation.positions[0];
    }

    // Try major mapping if it's empty or starts with maj
    if (suffix === '' || suffix.startsWith('maj')) {
      const majorSuffix = 'major' + (suffix.startsWith('maj') ? suffix.slice(3) : '');
      variation = chordKey.find((v: any) => v.suffix === majorSuffix);
      if (variation) return variation.positions[0];
    }

    // Last resort: try to find any variation that starts with the suffix
    variation = chordKey.find((v: any) => v.suffix.startsWith(suffix) || suffix.startsWith(v.suffix));
    if (variation) return variation.positions[0];

    return null;
  };

  return (
    <div className="mt-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => setIsVisible(!isVisible)}
          className="flex items-center gap-2 text-jumas-green font-bold text-sm hover:underline"
        >
          <Music size={16} />
          {isVisible ? 'Esconder Diagramas' : 'Mostrar Diagramas de Acordes'}
        </button>
        
        {isVisible && (
          <div className="flex bg-bg-secondary rounded-lg p-1 border border-border-color">
            <button 
              onClick={() => setInstrument('guitar')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${instrument === 'guitar' ? 'bg-jumas-green text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Violão
            </button>
            <button 
              onClick={() => setInstrument('ukulele')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${instrument === 'ukulele' ? 'bg-jumas-green text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Ukulele
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-4 p-4 bg-bg-secondary/30 rounded-2xl border border-border-color border-dashed">
              {chords.map(chordName => {
                const chordData = getChordData(chordName);
                if (!chordData) return null;

                return (
                  <div 
                    key={chordName} 
                    className={`flex flex-col items-center bg-bg-elevated p-3 rounded-xl border transition-all duration-300 ${
                      highlightedChord === chordName 
                        ? 'border-jumas-green ring-2 ring-jumas-green/20 scale-105 shadow-lg' 
                        : 'border-border-color shadow-sm hover:shadow-md'
                    }`}
                  >
                    <span className={`text-sm font-black mb-2 ${highlightedChord === chordName ? 'text-jumas-green' : 'text-text-primary'}`}>
                      {chordName}
                    </span>
                    <div className="w-24 h-32 flex items-center justify-center chord-diagram-container">
                      <Chord
                        chord={chordData}
                        instrument={instrumentData}
                        lite={false}
                      />
                    </div>
                  </div>
                );
              })}
              {chords.length > 0 && chords.every(c => !getChordData(c)) && (
                <p className="text-xs text-text-secondary italic w-full text-center py-4">
                  Diagramas não disponíveis para os acordes desta música.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`
        .chord-diagram-container svg {
          width: 100%;
          height: 100%;
        }
        .dark .chord-diagram-container svg text {
          fill: #ffffff !important;
        }
        .dark .chord-diagram-container svg circle {
          stroke: #ffffff !important;
        }
        .dark .chord-diagram-container svg path {
          stroke: #ffffff !important;
        }
        .dark .chord-diagram-container svg rect {
          stroke: #ffffff !important;
        }
      `}</style>
    </div>
  );
};
