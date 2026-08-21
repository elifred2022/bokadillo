-- Políticas del bucket foto_articulo_venta
-- Ejecutar en Supabase: SQL Editor

update storage.buckets
set public = true
where id = 'foto_articulo_venta';

drop policy if exists "foto_articulo_venta_select_public" on storage.objects;
create policy "foto_articulo_venta_select_public"
on storage.objects
for select
to public
using (bucket_id = 'foto_articulo_venta');

drop policy if exists "foto_articulo_venta_insert_public" on storage.objects;
create policy "foto_articulo_venta_insert_public"
on storage.objects
for insert
to public
with check (bucket_id = 'foto_articulo_venta');

drop policy if exists "foto_articulo_venta_update_public" on storage.objects;
create policy "foto_articulo_venta_update_public"
on storage.objects
for update
to public
using (bucket_id = 'foto_articulo_venta')
with check (bucket_id = 'foto_articulo_venta');

drop policy if exists "foto_articulo_venta_delete_public" on storage.objects;
create policy "foto_articulo_venta_delete_public"
on storage.objects
for delete
to public
using (bucket_id = 'foto_articulo_venta');
