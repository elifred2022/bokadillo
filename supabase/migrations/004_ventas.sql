-- Tabla de ventas (referencia; puede diferir si ya la creaste en Supabase)
create table if not exists public.ventas (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  cliente text not null default '',
  nombre jsonb not null default '[]'::jsonb,
  cantidad numeric(12, 2) not null default 0,
  precio numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  entregado text default 'pendiente',
  idcliente numeric references public.clientes(idcliente)
);

create index if not exists ventas_created_at_idx on public.ventas (created_at desc);
create index if not exists ventas_idcliente_idx on public.ventas (idcliente);

comment on table public.ventas is 'Ventas (antes hoja ventas en Google Sheets)';
comment on column public.ventas.id is 'ID de venta expuesto en la app como idventa';
comment on column public.ventas.nombre is 'Array JSON de artículos vendidos';
comment on column public.ventas.created_at is 'Fecha de la venta (en la app: fecha)';
