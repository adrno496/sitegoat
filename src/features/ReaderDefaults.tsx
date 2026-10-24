import { useState } from "react";
export const READER_DEFAULT_KEY = "journal360.reader-default.v1";
export function readReaderDefault() {
 try {const value=localStorage.getItem(READER_DEFAULT_KEY);return value==='interactive'||value==='safe'?value:'ask';}catch{return 'ask';}
}
export function ReaderDefaults() {
 const [mode,setMode]=useState(readReaderDefault),[error,setError]=useState('');
 return <section className="quiet-panel"><h3>Confiance des nouveaux fichiers HTML</h3><p>Le mode interactif exécute les scripts du document dans un cadre isolé. Un script peut tenter de naviguer ce cadre et provoquer une requête réseau. Le mode sûr n’exécute pas les scripts. Les choix déjà mémorisés pour une édition restent prioritaires.</p>
 <label>Mode des fichiers sans choix mémorisé<select value={mode} onChange={e=>{const value=e.target.value;try{localStorage.setItem(READER_DEFAULT_KEY,value);setMode(readReaderDefault());setError('');}catch{setError('Réglage non enregistré : le choix sera redemandé.');}}}><option value="ask">Demander à la première ouverture</option><option value="safe">Toujours commencer en mode sûr</option><option value="interactive">Mode interactif par choix explicite</option></select></label>{error&&<p role="alert">{error}</p>}</section>;
}
