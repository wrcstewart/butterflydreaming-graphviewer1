// voice_code.js — the curation code for the voice authoring pages.
//
// 2026-10-28. The voice endpoints WRITE TO DISK, and until today they were open
// to the internet: one unauthenticated POST to /api/voice-session from outside
// created a directory on the author's machine. They are now behind
// `curationCodeOk()`, so the two pages that use them — voice_record.html and
// voice_compare.html — have to carry the code.
//
// ONE FILE RATHER THAN TWO COPIES. The pages are used by different people at
// different times and the behaviour on a 403 has to be identical in both, or
// one of them silently stops working after a code change and the symptom is
// "the rig is broken".
//
// Kept in localStorage, per browser. Not in the URL, so it does not end up in
// a screenshot, a bookmark or a shared link.

const KEY = 'bd_voice_code';

export function getCode() {
  try { return localStorage.getItem(KEY) || ''; } catch (_) { return ''; }
}

export function setCode(code) {
  try { localStorage.setItem(KEY, String(code || '')); } catch (_) {}
}

export function clearCode() {
  try { localStorage.removeItem(KEY); } catch (_) {}
}

// Append the code to a path. Handles a path that already has a query string,
// which /api/prompts?set=tao and /api/voice-clip?session=… both do.
export function withCode(path) {
  const sep = path.includes('?') ? '&' : '?';
  return path + sep + 'code=' + encodeURIComponent(getCode());
}

// A fetch that fails LOUDLY and specifically on a missing or wrong code, so a
// caller can prompt rather than reporting "could not load" for a wrong reason.
// The thrown error carries `needsCode` so callers can branch without parsing
// a message.
export async function codedFetch(path, opts) {
  const res = await fetch(withCode(path), opts);
  if (res.status === 403) {
    clearCode();
    const err = new Error('the curation code is missing or wrong');
    err.needsCode = true;
    throw err;
  }
  return res;
}

export async function codedJson(path, opts) {
  const res = await codedFetch(path, opts);
  const d = await res.json();
  if (d && d.error) throw new Error(d.error);
  return d;
}

// Prove a code before storing it, so a typo is caught at the moment it is made
// rather than on the first Keep with a take in hand.
export async function verifyCode(code) {
  const res = await fetch('/api/prompt-sets?code=' + encodeURIComponent(code));
  if (res.status === 403) return false;
  if (!res.ok) throw new Error('server returned ' + res.status);
  setCode(code);
  return true;
}
