/**
 * Copy text to the clipboard.
 *
 * `navigator.clipboard` is SECURE-CONTEXT ONLY — it's undefined on a plain-HTTP
 * origin (e.g. the on-prem http://10.1.2.136:8080 deployment), where the copy
 * buttons would otherwise silently do nothing. Fall back to the legacy
 * execCommand path, which still works there.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
