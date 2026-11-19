import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { startWorkout } from './lib/workoutOps';
import { Today } from './screens/Today';
import { Train } from './screens/Train';
import { You } from './screens/You';
import { WorkoutScreen } from './screens/WorkoutScreen';
import { useSettings } from './ui';

type Tab = 'today' | 'train' | 'food' | 'you';

export function App() {
  const [tab, setTab] = useState<Tab>('today');
  const { defaultRestSec } = useSettings();
  const active = useLiveQuery(() => db.workouts.filter((w) => !w.finishedAt).first(), []);

  const tabBtn = (k: Tab, label: string, icon: string) => (
    <button className={`tab ${k === 'food' ? 'food' : ''} ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}><span style={{ fontSize: 20 }}>{icon}</span><span>{label}</span></button>
  );
  return (
    <div className="app">
      {active ? <WorkoutScreen key={active.id} workout={active} onExit={() => setTab('train')} /> : (
        <div className="screen">
          {tab === 'today' && <Today />}
          {tab === 'train' && <Train />}
          {tab === 'food' && <><h1>Food</h1><div className="empty">Pantry, food search and meal ideas are coming in the next milestone.</div></>}
          {tab === 'you' && <You />}
        </div>
      )}
      {!active && (
        <nav className="tabbar">
          {tabBtn('today', 'Today', '◐')}{tabBtn('train', 'Train', '🏋')}
          <button className="tab plus" aria-label="Quick start workout" onClick={() => startWorkout('Workout', undefined, defaultRestSec)}><b>+</b></button>
          {tabBtn('food', 'Food', '🥑')}{tabBtn('you', 'You', '◯')}
        </nav>
      )}
    </div>
  );
}
