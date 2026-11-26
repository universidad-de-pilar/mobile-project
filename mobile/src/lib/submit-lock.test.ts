import { createSubmitLock } from '@/lib/submit-lock';

describe('createSubmitLock', () => {
  it('solo deja pasar a la primera llamada hasta liberar', () => {
    const lock = createSubmitLock();
    expect([lock.acquire(), lock.acquire(), lock.acquire()]).toEqual([true, false, false]);
    lock.release();
    expect(lock.acquire()).toBe(true);
  });
});
