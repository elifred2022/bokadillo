-- Tabla de compras (referencia; puede diferir si ya la creaste en Supabase)
create table if not exists public.compras (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  proveedor text not null default '',
  articulo jsonb not null default '[]'::jsonb,
  total numeric(12, 2) not null default 0,
  factura numeric
);

create index if not exists compras_created_at_idx on public.compras (created_at desc);
create index if not exists compras_proveedor_idx on public.compras (proveedor);

comment on table public.compras is 'Compras (antes hoja compras en Google Sheets)';
comment on column public.compras.id is 'ID de compra expuesto en la app como idcompra';
comment on column public.compras.articulo is 'Array JSON de artículos comprados';
comment on column public.compras.created_at is 'Fecha de la compra (en la app: fecha)';
