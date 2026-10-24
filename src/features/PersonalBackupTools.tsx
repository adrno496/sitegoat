import { useRef, useState } from "react";
import { db } from "../data/db";
import { futureDb } from "./future/db";
import { exportFutureBackup } from "./future/backup";
import { exportPersonalSettings, inspectPersonalSettings, restorePersonalSetting, type SettingsBackup } from "./personalSettingsBackup";
import { download } from "./backup";
export function PersonalBackupTools() {
 const [status,setStatus]=useState(''),[busy,setBusy]=useState(false),[preview,setPreview]=useState<SettingsBackup>();
 const input=useRef<HTMLInputElement>(null);
 async function save(scope:'future'|'settings') {setBusy(true);try{download(scope==='future'?await exportFutureBackup(futureDb):await exportPersonalSettings(db),scope==='future'?'journal360-future.zip':'journal360-settings.json');setStatus('Fichier préparé. Conservez les trois espaces hors du navigateur.');}catch(e){setStatus(String(e));}finally{setBusy(false);}}
 return <section className="quiet-panel"><h3>Assistant de sauvegarde personnelle : trois espaces</h3>
 <ol><li>Journaux, originaux, notes, lectures et favoris : bouton ci-dessus ou segments ci-dessous.</li><li>Le Futur, ses notes et versions : <button className="text-button" disabled={busy} onClick={()=>void save('future')}>Sauvegarder Le Futur ici</button></li><li>Affichage, interface, thème et recherches : <button className="text-button" disabled={busy} onClick={()=>void save('settings')}>Sauvegarder les réglages et recherches</button></li></ol>
 <p>Sessions, tokens, réglages cloud et permissions interactives exclus. Les trois espaces se restaurent séparément. Aucune restauration globale atomique n’est annoncée. Testez chaque fichier sur un profil vierge avant tout usage réel.</p>
 <button className="secondary" disabled={busy} onClick={()=>input.current?.click()}>Inspecter des réglages et recherches</button>
 <input ref={input} hidden type="file" accept=".json" aria-label="Réglages personnels à restaurer" onChange={e=>void(async()=>{const f=e.target.files?.[0];e.target.value='';setPreview(undefined);if(!f)return;try{setPreview(inspectPersonalSettings(new Uint8Array(await f.arrayBuffer())));setStatus('Aperçu validé : choisissez explicitement chaque espace. Affichage/interface/thème remplacent leurs réglages locaux ; recherches fusionnées, conflits conservés en copies. Rechargez après restauration des réglages.');}catch(e){setStatus(String(e));}})()} />
 {preview&&<div>{(['display','interface','searches','theme'] as const).map((scope,n)=><button key={scope} className="secondary" disabled={busy||preview[scope]===null} onClick={()=>void(async()=>{setBusy(true);try{await restorePersonalSetting(db,preview,scope);setStatus(`Espace ${['affichage','interface','recherches','thème'][n]} restauré. Les autres espaces restent à choisir.`);}catch(e){setStatus(String(e));}finally{setBusy(false);}})()}>Confirmer : {['affichage','interface','recherches','thème'][n]}</button>)}<button onClick={()=>setPreview(undefined)}>Fermer l’aperçu</button></div>}
 <p role="status">{status}</p></section>;
}
