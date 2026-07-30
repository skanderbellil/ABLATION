import type { Prediction, Prereg } from '../types';

/**
 * Canonical JSON for the prereg block: fixed key order, predictions sorted by
 * metric id. The fingerprint must be reproducible from the stored block, so
 * nothing about this serialisation may depend on insertion order.
 */
export function canonicalPrereg(block: {
  predictions: Record<string, Prediction>;
  effectSize: string;
  falsifier: string;
  committedAt: string;
}): string {
  const predictions: Record<string, Prediction> = {};
  for (const k of Object.keys(block.predictions).sort()) {
    predictions[k] = block.predictions[k];
  }
  return JSON.stringify({
    predictions,
    effectSize: block.effectSize,
    falsifier: block.falsifier,
    committedAt: block.committedAt,
  });
}

export async function fingerprintPrereg(block: {
  predictions: Record<string, Prediction>;
  effectSize: string;
  falsifier: string;
  committedAt: string;
}): Promise<string> {
  const data = new TextEncoder().encode(canonicalPrereg(block));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 8);
}

/** Re-hash a stored prereg and check it against its recorded fingerprint. */
export async function verifyPrereg(prereg: Prereg): Promise<boolean> {
  const fp = await fingerprintPrereg({
    predictions: prereg.predictions,
    effectSize: prereg.effectSize,
    falsifier: prereg.falsifier,
    committedAt: prereg.committedAt,
  });
  return fp === prereg.fingerprint;
}
