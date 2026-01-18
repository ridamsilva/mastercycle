
import React, { useState, useEffect, useRef } from 'react';

const ALARM_SOUNDS = {
  beep: { name: 'Padrão (Beep)', url: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' },
  digital: { name: 'Digital (Relógio)', url: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg' },
  bell: { name: 'Sino (Clássico)', url: 'https://actions.google.com/sounds/v1/clocks/alarm_clock_ringing_short.ogg' },
  zen: { name: 'Zen (Gongo)', url: 'https://actions.google.com/sounds/v1/clocks/bell_tower_chime.ogg' },
  nature: { name: 'Natureza (Pássaros)', url: 'https://actions.google.com/sounds/v1/animals/bird_chirp_short.ogg' },
};

const PomodoroTimer: React.FC = () => {
  const [workTime, setWorkTime] = useState(60);
  const [shortBreak, setShortBreak] = useState(10);
  const [longBreak, setLongBreak] = useState(30);
  const [selectedSound, setSelectedSound] = useState<keyof typeof ALARM_SOUNDS>('beep');
  
  const [mode, setMode] = useState<'work' | 'short' | 'long'>('work');
  const [timeLeft, setTimeLeft] = useState(workTime * 60);
  const [isActive, setIsActive] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      const audio = new Audio(ALARM_SOUNDS[selectedSound].url);
      audio.play().catch(() => {});
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, selectedSound]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    updateTimeLeft(mode);
  };

  const updateTimeLeft = (newMode: 'work' | 'short' | 'long') => {
    setMode(newMode);
    if (newMode === 'work') setTimeLeft(workTime * 60);
    else if (newMode === 'short') setTimeLeft(shortBreak * 60);
    else setTimeLeft(longBreak * 60);
  };

  useEffect(() => {
    if (!isActive) {
      updateTimeLeft(mode);
    }
  }, [workTime, shortBreak, longBreak]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = () => {
    const total = (mode === 'work' ? workTime : mode === 'short' ? shortBreak : longBreak) * 60;
    return ((total - timeLeft) / total) * 100;
  };

  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
          Foco Pomodoro
        </h3>
        <button 
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className={`p-1.5 rounded-lg transition-all ${isSettingsOpen ? 'bg-blue-50 dark:bg-blue-900/30 text-brand-blue' : 'text-slate-400 hover:text-brand-blue'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {isSettingsOpen && (
        <div className="space-y-4 mb-4 animate-in slide-in-from-top-2 fade-in duration-300 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-tighter">Foco</label>
              <input 
                type="number" 
                value={workTime} 
                onChange={(e) => setWorkTime(Math.max(1, Number(e.target.value)))}
                className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-md text-[10px] font-bold focus:border-brand-blue focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-tighter">Curta</label>
              <input 
                type="number" 
                value={shortBreak} 
                onChange={(e) => setShortBreak(Math.max(1, Number(e.target.value)))}
                className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-md text-[10px] font-bold focus:border-brand-blue focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-tighter">Longa</label>
              <input 
                type="number" 
                value={longBreak} 
                onChange={(e) => setLongBreak(Math.max(1, Number(e.target.value)))}
                className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-md text-[10px] font-bold focus:border-brand-blue focus:outline-none"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-tighter">Som de Alerta</label>
            <select 
              value={selectedSound} 
              onChange={(e) => {
                const sound = e.target.value as keyof typeof ALARM_SOUNDS;
                setSelectedSound(sound);
                new Audio(ALARM_SOUNDS[sound].url).play().catch(() => {});
              }}
              className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-md text-[10px] font-bold focus:border-brand-blue focus:outline-none"
            >
              {Object.entries(ALARM_SOUNDS).map(([key, { name }]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="flex gap-1.5 mb-6">
        <button 
          onClick={() => updateTimeLeft('work')}
          className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${mode === 'work' ? 'bg-brand-blue text-white shadow-md dark:shadow-none' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
        >
          Foco
        </button>
        <button 
          onClick={() => updateTimeLeft('short')}
          className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${mode === 'short' ? 'bg-brand-blue text-white shadow-md dark:shadow-none' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
        >
          Pausa 1
        </button>
        <button 
          onClick={() => updateTimeLeft('long')}
          className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${mode === 'long' ? 'bg-brand-blue text-white shadow-md dark:shadow-none' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
        >
          Pausa 2
        </button>
      </div>

      <div className="relative flex flex-col items-center justify-center mb-6">
        <svg className="w-40 h-40 -rotate-90">
          <circle 
            cx="80" cy="80" r={radius} 
            className="stroke-slate-100 dark:stroke-slate-800" 
            strokeWidth="8" fill="transparent" 
          />
          <circle 
            cx="80" cy="80" r={radius} 
            className="stroke-brand-blue transition-all duration-700 ease-out" 
            strokeWidth="8" fill="transparent" 
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (circumference * progress()) / 100}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter tabular-nums">
            {formatTime(timeLeft)}
          </span>
          <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${mode === 'work' ? 'text-brand-blue' : 'text-brand-orange'}`}>
            {mode === 'work' ? 'Concentração' : 'Descanso'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button 
          onClick={toggleTimer}
          className={`w-full py-3.5 text-xs font-black uppercase rounded-xl transition-all active:scale-[0.98] ${
            isActive 
              ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-900/30' 
              : 'bg-brand-blue text-white shadow-lg shadow-blue-100 dark:shadow-none hover:bg-brand-darkBlue'
          }`}
        >
          {isActive ? 'Pausar' : 'Iniciar Foco'}
        </button>
        
        <button 
          onClick={resetTimer}
          className="w-full py-2 text-[9px] font-bold uppercase text-slate-400 dark:text-slate-600 hover:text-brand-orange transition-all"
        >
          Reiniciar Ciclo
        </button>
      </div>
    </div>
  );
};

export default PomodoroTimer;