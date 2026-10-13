-- Migration exécutée et vérifiée dans le dashboard Supabase le 13 octobre 2026 :
-- Storage et Auth uniquement, aucune table applicative contenant des données privées.
-- Le serveur valide auth.getUser(), force uid/UUID.zip et signe le transfert.
-- Le client authentifié ne peut pas lire/écrire directement ce bucket.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('journal360-backups','journal360-backups',false,52428800,array['application/zip'])
on conflict (id) do update set public=false,file_size_limit=52428800,allowed_mime_types=array['application/zip'];
-- Politiques restrictives, isolées à ce bucket, sans toucher les autres buckets.
do $$ begin
 if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='journal360_server_only') then
  create policy journal360_server_only on storage.objects as restrictive for all to anon,authenticated
  using (bucket_id <> 'journal360-backups') with check (bucket_id <> 'journal360-backups');
 end if;
end $$;
-- Le rôle serveur contourne la RLS ; sa clé doit rester strictement côté serveur.
