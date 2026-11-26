// Not React state: clicks fired in the same tick all see the same render's state.
export function createSubmitLock() {
  let busy = false;
  return {
    acquire() {
      if (busy) return false;
      busy = true;
      return true;
    },
    release() {
      busy = false;
    },
  };
}
