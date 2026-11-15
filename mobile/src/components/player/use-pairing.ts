import { useEffect, useState } from 'react';

import { claimPairing, createPairing } from '@/lib/player-api';
import { pairingOutcome } from '@/lib/pairing-rules';

const POLL_MS = 4000;

/** Requests a code and polls it until paired; renews it on expiry. The claim_secret never leaves memory. */
export function usePairing(onPaired: (token: string) => void) {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const start = async () => {
      const pairing = await createPairing();
      if (!active) return;
      if (!pairing) {
        setCode(null);
        timer = setTimeout(start, POLL_MS);
        return;
      }
      setCode(pairing.code);

      const poll = async () => {
        const outcome = pairingOutcome(await claimPairing(pairing.claim_secret), pairing.expires_at, Date.now());
        if (!active) return;
        if (outcome.kind === 'paired') return onPaired(outcome.token);
        timer = setTimeout(outcome.kind === 'renew' ? start : poll, POLL_MS);
      };
      timer = setTimeout(poll, POLL_MS);
    };
    void start();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [onPaired]);

  return code;
}
