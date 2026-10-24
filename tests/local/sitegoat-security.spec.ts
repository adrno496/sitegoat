import { test, expect } from '@playwright/test';
import { interactiveV9Fixture } from '../helpers/v9';
import { navigate } from '../helpers/navigation';
test('SG-13 : ancien contexte refusé et pagehide invalide la confirmation sans recharger le document',async({page})=>{
 const {p,bytes}=interactiveV9Fixture(true);await page.goto('/');await page.getByLabel('Fichiers HTML à importer').setInputFiles({name:'security.html',mimeType:'text/html',buffer:bytes});await page.getByRole('button',{name:'Enregistrer dans ma bibliothèque',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await navigate(page,'Aujourd’hui');await page.locator('.unified-workspace').getByRole('button',{name:'Lire la dernière édition',exact:true}).click();
 let downloads=0;page.on('download',()=>downloads++);
 const f=page.frameLocator('.edition-frame'),dialog=page.getByRole('dialog',{name:'Action du document original',exact:true});
 const old=await f.locator('body').evaluate(()=>{const s=[...document.scripts].find(s=>s.textContent?.includes('journal360:reader-action:v2'))!.textContent!;return JSON.parse(s.match(/const config=(.*);\n/)![1]);});
 await page.getByRole('button',{name:'Réduire la lecture',exact:true}).click();await page.getByRole('button',{name:'Sécurisé',exact:true}).click();await page.getByRole('button',{name:'Interactif',exact:true}).click();await page.getByRole('button',{name:'Je fais confiance à ce fichier',exact:true}).click();
 await f.locator('body').evaluate((_element,{old,prompt})=>parent.postMessage({type:'journal360:reader-action:v2',hash:old.hash,revision:old.revision,session:old.session,requestId:crypto.randomUUID(),kind:'prompt',value:{id:prompt.promptId,filename:prompt.filename,content:prompt.content,sha256:prompt.sha256||null}},'*'),{old,prompt:p.promptAssets[0]});
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve())));await expect(dialog).toHaveCount(0);
 await f.locator('[data-panel="prompts"]').click();await f.locator('#promptsList button').first().click();await expect(dialog).toBeVisible();expect(downloads).toBe(0);
 await f.locator('body').evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));await expect(dialog).toHaveCount(0);
 await f.locator('#promptsList button').first().click();await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve())));await expect(dialog).toHaveCount(0);expect(downloads).toBe(0);
});
