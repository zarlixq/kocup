// Çerez onayı — sunucu ve istemci ortak sabitleri (cookie-consent.tsx, conversions.ts, root layout).

export const CONSENT_COOKIE = "kocup_cerez"

/** <head> içinde, boyamadan önce: tercih çerezi varsa html[data-cerez] (sunucuda render edilen bant gizlenir). */
export const COOKIE_PRECHECK_SCRIPT = `try{var m=document.cookie.match(/(?:^|; )${CONSENT_COOKIE}=(kabul|red)/);if(m)document.documentElement.setAttribute("data-cerez",m[1])}catch(e){}`
