import { z } from "zod";
import { LocalRepository } from "../data/db";
import { now } from "../data/model";
import { canonicalJSON } from "./backup";
import { V9_DISPLAY_KEY, parseDisplayPreferences } from "./v9/preferences";
import { INTERFACE_KEY, parsePreferences } from "./interfacePreferences";
import { RECURRING_SEARCHES_KEY, parseRecurringSearches, serializeRecurringSearches } from "./v9/recurringSearchModel";
import { RECURRING_LOCK } from "./v9/recurringSearchStorage";
const schema = z.object({ format:z.literal("journal360.personal-settings"), version:z.literal(1), generatedAt:z.iso.datetime(), display:z.string().nullable(), interface:z.string().nullable(), searches:z.string().nullable(), theme:z.enum(["light","dark","system"]).nullable() }).strict();
export type SettingsBackup = z.infer<typeof schema>;
function validate(p: SettingsBackup) {
 if (p.display && canonicalJSON(parseDisplayPreferences(p.display)) !== canonicalJSON(JSON.parse(p.display))) throw Error("Réglages affichage invalides.");
 if (p.interface && canonicalJSON(parsePreferences(p.interface)) !== canonicalJSON(JSON.parse(p.interface))) throw Error("Réglages interface invalides.");
 if (p.searches) parseRecurringSearches(p.searches);
 return p;
}
export async function exportPersonalSettings(db:LocalRepository, storage:Storage=localStorage) {
 const theme=(await db.preferences.get('theme'))?.value;
 const p=validate(schema.parse({format:'journal360.personal-settings',version:1,generatedAt:now(),display:storage.getItem(V9_DISPLAY_KEY),interface:storage.getItem(INTERFACE_KEY),searches:storage.getItem(RECURRING_SEARCHES_KEY),theme:theme||null}));
 return new Blob([JSON.stringify(p,null,2)],{type:'application/json'});
}
export function inspectPersonalSettings(bytes:Uint8Array) {
 if(bytes.length>4*1024*1024)throw Error('Réglages supérieurs à 4 Mio.');
 return validate(schema.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))));
}
// One explicit action per scope avoids pretending cross-storage atomicity.
export async function restorePersonalSetting(db:LocalRepository, p:SettingsBackup, scope:'display'|'interface'|'searches'|'theme', storage:Storage=localStorage, locks:LockManager=navigator.locks) {
 validate(schema.parse(p));
 if(scope==='theme') {if(p.theme) await db.preferences.put({key:'theme',value:p.theme}); return;}
 if(!locks)throw Error('Verrou inter-onglets indisponible ; aucune restauration de réglage.');
 await locks.request(scope==='searches'?RECURRING_LOCK:'journal360.settings.write',()=>{
  const value=p[scope];if(value===null)return;
  const key=scope==='display'?V9_DISPLAY_KEY:scope==='interface'?INTERFACE_KEY:RECURRING_SEARCHES_KEY;
  if(scope==='searches') {
   const incoming=parseRecurringSearches(value),existing=storage.getItem(key)===null?[]:parseRecurringSearches(storage.getItem(key));
   for(const item of incoming) {
    const same=existing.find(s=>s.id===item.id);
    if(!same)existing.push(item);
    else if(canonicalJSON(same)!==canonicalJSON(item)) {
      // Preserve both versions with a new ID; never silently overwrite a search.
      if(!existing.some(s=>s.theme===item.theme&&s.query===item.query&&s.cadence===item.cadence&&s.lastOpenedAt===item.lastOpenedAt))existing.push({...item,id:crypto.randomUUID()});
    }
   }
   storage.setItem(key,serializeRecurringSearches(existing));window.dispatchEvent(new Event('journal360:recurring-change'));
  } else storage.setItem(key,value);
 });
}
