import React from 'react';
import net from 'node:net';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { afterAll, expect, it, vi } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { initializeApp, deleteApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, terminate, doc, getDocFromServer, setDoc, disableNetwork, enableNetwork } from 'firebase/firestore';
import { syncFocusSessions } from '../src/lib/focusSync';
import type { FocusSession } from '../src/lib/focusTimer';
const state = vi.hoisted(() => ({ db: null as any, user: null as any }));
import { useEmulatorDatabase } from './focus-firebase.emulator';
vi.mock('../src/contexts/AuthContext', () => ({ useAuth: () => ({ user: state.user, loading: false }) }));
vi.mock('../src/contexts/FocusMusicContext', () => ({ useFocusMusic: () => ({ enabled: false, playing: false }) }));
import { FocusTimerProvider, useFocusTimer } from '../src/contexts/FocusTimerContext';
const require = createRequire(`${process.env.FOCUS_RULES_TOOLS}/package.json`);
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
let env: any;
const apps: FirebaseApp[] = [];
const relays: Array<{ server: net.Server; sockets: Set<net.Socket>; online: boolean }> = [];
const byClient = new Map<object, typeof relays[number]>();
afterAll(async () => { await Promise.all(apps.map(async app => { await terminate(getFirestore(app)); await deleteApp(app); })); for (const relay of relays) { for (const socket of relay.sockets) socket.destroy(); await new Promise<void>(resolve => relay.server.close(() => resolve())); } if (env) await env.cleanup(); });
async function client(uid?: string) {
  const relay = { server: net.createServer(), sockets: new Set<net.Socket>(), online: true };
  relay.server.on('connection', socket => {
    if (!relay.online) { socket.destroy(); return; }
    const upstream = net.createConnection({ host: '127.0.0.1', port: 8087 });
    for (const peer of [socket, upstream]) {
      relay.sockets.add(peer);
      peer.on('error', () => { socket.destroy(); upstream.destroy(); });
      peer.on('close', () => relay.sockets.delete(peer));
    }
    socket.pipe(upstream); upstream.pipe(socket);
  });
  await new Promise<void>(resolve => relay.server.listen(0, '127.0.0.1', resolve));
  relays.push(relay);
  const app = initializeApp({ projectId: 'demo-neuralmastery', apiKey: 'demo-only' }, `focus-${apps.length}`);
  apps.push(app);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', (relay.server.address() as net.AddressInfo).port, uid ? { mockUserToken: { sub: uid } } : {});
  byClient.set(db, relay);
  return db;
}
function network(db: object, online: boolean) {
  const relay = byClient.get(db)!;
  relay.online = online;
  if (!online) for (const socket of relay.sockets) socket.destroy();
}
const session = (id: string, n = 0): FocusSession => ({ id, startedAt: new Date(1700000000000 + n * 60000).toISOString(), endedAt: new Date(1700000060000 + n * 60000).toISOString(), focusedSeconds: 60, plannedMinutes: 1, completed: true, section: 'learn' });
it('real provider reconnect, transactions, retry, privacy, siblings, and cap', async () => {
  if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8087') throw new Error('Local emulator required');
  env = await initializeTestEnvironment({ projectId: 'demo-neuralmastery', firestore: { host: '127.0.0.1', port: 8087, rules: readFileSync('firestore.rules', 'utf8') } });
  expect(() => net.createConnection({ host: 'firestore.googleapis.com', port: 443 })).toThrow('blocked non-loopback');
  const a = await client('focus-owner');
  const b = await client('focus-owner');
  const other = await client('other-user');
  const anon = await client();
  const inspector = await client('focus-owner');
  const ref = doc(inspector, 'progress', 'focus-owner');
  const siblings = { events: [{ id: 'xp-1', points: 17 }], completedPages: ['attention'], settings: { sound: false } };
  await assertSucceeds(setDoc(ref, { ...siblings, focusSessions: [] }));
  // Each provider has an independent storage snapshot, as in separate devices.
  async function offlineDevice(db: any, value: FocusSession, reconnect = false) {
    const warnings = vi.spyOn(console, 'warn');
    const beforeWarnings = warnings.mock.calls.length;
    localStorage.clear(); state.db = db; useEmulatorDatabase(db);
    state.user = { uid: 'focus-owner', getIdToken: async () => 'emulator-token' };
    let timer: ReturnType<typeof useFocusTimer>;
    function Probe() { timer = useFocusTimer(); return null; }
    const view = render(<FocusTimerProvider><Probe /></FocusTimerProvider>);
    await waitFor(() => expect(timer!).toBeDefined());
    await new Promise(resolve => setTimeout(resolve, 300));
    await disableNetwork(db);
    network(db, false);
    act(() => timer!.recordSession(value));
    await waitFor(() => expect(JSON.parse(localStorage.getItem('nm_focus_pending_sync') || '[]').map((s: FocusSession) => s.id)).toContain(value.id));
    await waitFor(() => expect(warnings.mock.calls.slice(beforeWarnings).some(call => String(call[0]).includes('save failed'))).toBe(true), { timeout: 45000 });
    expect(JSON.parse(localStorage.getItem('nm_focus_pending_sync') || '[]').map((s: FocusSession) => s.id)).toContain(value.id);
    expect((await getDocFromServer(ref)).data()!.focusSessions.map((s: FocusSession) => s.id)).not.toContain(value.id);
    expect(getApps().every(app => app.options.projectId === 'demo-neuralmastery')).toBe(true);
    if (reconnect) {
      network(db, true);
      await enableNetwork(db);
      act(() => window.dispatchEvent(new Event('online')));
      await waitFor(() => expect(JSON.parse(localStorage.getItem('nm_focus_pending_sync') || '[]')).toEqual([]), { timeout: 15000 });
      expect((await getDocFromServer(ref)).data()!.focusSessions.map((s: FocusSession) => s.id)).toContain(value.id);
    }
    warnings.mockRestore();
    const storage = { sessions: localStorage.getItem('nm_focus_sessions')!, pending: localStorage.getItem('nm_focus_pending_sync')! };
    view.unmount(); return storage;
  }
  const sa = await offlineDevice(a, session('device-a'));
  const sb = await offlineDevice(b, session('device-b', 1));
  // Reconnect both clients with their persisted queues; no second save.
  network(a, true); network(b, true);
  await Promise.all([enableNetwork(a), enableNetwork(b)]);
  await Promise.all([syncFocusSessions(a, 'focus-owner', JSON.parse(sa.sessions), JSON.parse(sa.pending)), syncFocusSessions(b, 'focus-owner', JSON.parse(sb.sessions), JSON.parse(sb.pending))]);
  let data = (await getDocFromServer(ref)).data()!;
  expect(data.focusSessions.map((s: FocusSession) => s.id).sort()).toEqual(['device-a', 'device-b']);
  expect(data.focusSessions.reduce((n: number, s: FocusSession) => n + s.focusedSeconds, 0)).toBe(120);
  console.log('MEASURE two offline clients -> 2 distinct sessions, 120 seconds');
  // Replay after actual rules-denied transaction, then repeat an acknowledged save.
  await expect(syncFocusSessions(other, 'focus-owner', [], [session('retry', 2)])).rejects.toMatchObject({ code: 'permission-denied' });
  await syncFocusSessions(a, 'focus-owner', [], [session('retry', 2)]);
  await syncFocusSessions(a, 'focus-owner', [], [session('retry', 2)]);
  data = (await getDocFromServer(ref)).data()!;
  expect(data.focusSessions.length).toBe(3);
  expect(data.focusSessions.reduce((n: number, s: FocusSession) => n + s.focusedSeconds, 0)).toBe(180);
  expect(Object.fromEntries(Object.entries(data).filter(([k]) => k !== 'focusSessions'))).toEqual(siblings);
  await assertFails(getDocFromServer(doc(other, 'progress', 'focus-owner')));
  await assertFails(setDoc(doc(other, 'progress', 'focus-owner'), { events: [] }));
  await assertFails(getDocFromServer(doc(anon, 'progress', 'focus-owner')));
  await assertFails(setDoc(doc(anon, 'progress', 'focus-owner'), { events: [] }));
  expect((await getDocFromServer(ref)).data()).toEqual(data);
  console.log('MEASURE denied write + 2 retries -> 3 sessions, 180 seconds; siblings unchanged; foreign/anonymous read/write denied');
  await offlineDevice(a, session('online-only', 3), true);
  console.log('MEASURE exhausted offline retries -> online event alone flushed pending session');
  // Delay only auth refresh, leaving every Firestore operation real. An older
  // save acknowledges while a newer save is still waiting for credentials.
  localStorage.clear(); state.db = a; useEmulatorDatabase(a);
  state.user = { uid: 'focus-owner', getIdToken: vi.fn().mockResolvedValue('token') };
  let raceTimer: ReturnType<typeof useFocusTimer>;
  function RaceProbe() { raceTimer = useFocusTimer(); return null; }
  const raceView = render(<FocusTimerProvider><RaceProbe /></FocusTimerProvider>);
  await waitFor(() => expect(raceTimer!.sessions.length).toBe(4));
  let releaseOld!: (token: string) => void;
  let releaseNew!: (token: string) => void;
  state.user.getIdToken.mockImplementationOnce(() => new Promise(resolve => { releaseOld = resolve; }));
  act(() => raceTimer!.recordSession(session('race-old', 4)));
  state.user.getIdToken.mockImplementationOnce(() => new Promise(resolve => { releaseNew = resolve; }));
  act(() => raceTimer!.recordSession(session('race-new', 5)));
  await act(async () => releaseOld('token'));
  await waitFor(() => expect(JSON.parse(localStorage.getItem('nm_focus_pending_sync') || '[]').map((s: FocusSession) => s.id)).toEqual(['race-new']), { timeout: 15000 });
  expect(raceTimer!.sessions.map(s => s.id)).toContain('race-new');
  await act(async () => releaseNew('token'));
  await waitFor(() => expect(JSON.parse(localStorage.getItem('nm_focus_pending_sync') || '[]')).toEqual([]), { timeout: 15000 });
  raceView.unmount();
  console.log('MEASURE older save acknowledged: newer pending session retained, then synced');
  await syncFocusSessions(a, 'focus-owner', [], Array.from({ length: 510 }, (_, i) => session(`bounded-${i}`, i + 10)));
  data = (await getDocFromServer(ref)).data()!;
  expect(data.focusSessions.length).toBe(500);
  expect(new Set(data.focusSessions.map((s: FocusSession) => s.id)).size).toBe(500);
  expect(data.focusSessions[0].id).toBe('bounded-10');
  expect(data.focusSessions.at(-1).id).toBe('bounded-509');
  expect(Object.fromEntries(Object.entries(data).filter(([k]) => k !== 'focusSessions'))).toEqual(siblings);
  console.log('MEASURE 516 candidate sessions -> newest 500 retained, bounded-10 through bounded-509');
});
