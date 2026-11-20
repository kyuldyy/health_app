import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { r0, sumLog, todayStr } from '../lib/macros';
import { startWorkout } from '../lib/workoutOps';
import { CalorieRing, Icon, useSettings } from '../ui';
import { MacroRows } from './Food';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function Today({ goTo }: { goTo: (t: 'train' | 'food') => void }) {
  const { defaultRestSec, targets } = useSettings();
  const t = targets!;
  const food = useLiveQuery(() => db.log.where('date').equals(todayStr()).toArray(), []) ?? [];
  const templates = useLiveQuery(() => db.templates.toArray(), []) ?? [];
  const recent = useLiveQuery(() => db.workouts.orderBy('startedAt').reverse().filter((w) => !!w.finishedAt).limit(30).toArray(), []) ?? [];
  const recipes = useLiveQuery(() => db.recipes.toArray(), []) ?? [];

  // next template: the one after the most recently trained one
  const lastName = recent[0]?.name;
  const idx = templates.findIndex((x) => x.name === lastName);
  const next = templates.length ? templates[(idx + 1) % templates.length] : undefined;

  const now = new Date();
  const monday = new Date(now); monday.setHours(0, 0, 0, 0); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const trainedDays = new Set(recent.filter((w) => w.startedAt >= monday.getTime()).map((w) => (new Date(w.startedAt).getDay() + 6) % 7));
  const eaten = sumLog(food);
  const doneToday = recent.find((w) => todayStr(new Date(w.startedAt)) === todayStr());

  return (
    <>
      <div className="eyebrow">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
      <h1>Today</h1>

      <div className="card">
        <div className="eyebrow">Workout</div>
        {doneToday ? (
          <><div className="big" style={{ fontSize: 30 }}>{doneToday.name}</div><div className="muted small">Done today · {doneToday.exercises.length} {doneToday.exercises.length === 1 ? "exercise" : "exercises"}</div></>
        ) : next ? (
          <>
            <div className="big" style={{ fontSize: 30 }}>{next.name}</div>
            <div className="muted small" style={{ margin: '2px 0 12px' }}>{next.exercises.length} exercises · about {Math.round(next.exercises.reduce((a, e) => a + e.sets, 0) * 2.8)} min</div>
            <button className="btn primary block" onClick={() => startWorkout(next.name, next, defaultRestSec)}>Start workout</button>
          </>
        ) : (
          <><div className="muted small" style={{ margin: '4px 0 12px' }}>Nothing planned yet.</div><button className="btn primary block" onClick={() => startWorkout('Workout', undefined, defaultRestSec)}>Start workout</button></>
        )}
      </div>

      <button className="card row" style={{ width: '100%', textAlign: 'left', gap: 16 }} onClick={() => goTo('food')}>
        <CalorieRing eaten={eaten.kcal} target={t.kcal} />
        <div className="grow"><MacroRows eaten={eaten} targets={t} compact /></div>
      </button>

      <h2>Dinner idea</h2>
      <button className="card row" style={{ width: '100%', textAlign: 'left' }} onClick={() => goTo('food')}>
        <div className="grow">
          <b>{recipes[0]?.name ?? 'Get meal ideas from your pantry'}</b>
          <div className="muted small">{recipes[0] ? `${recipes[0].ingredients.length} ingredients · saved meal` : `${r0(t.kcal - eaten.kcal)} kcal and ${r0(t.protein - eaten.protein)} g protein left today`}</div>
        </div>
        <Icon name="chevron" size={18} />
      </button>

      <div className="sect"><h2>This week</h2><span className="muted small" style={{ marginTop: 14 }}>{trainedDays.size} sessions</span></div>
      <div className="wk">{DAYS.map((d, i) => <div key={i}><i className={trainedDays.has(i) ? 'on' : ''} />{d}</div>)}</div>
    </>
  );
}
