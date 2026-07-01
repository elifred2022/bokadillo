-- Tabla de artículos (migración desde Google Sheets)
create table if not exists public.articulos (
  idarticulo text primary key,
  codbarra text not null default '',
  nombre text not null,
  descripcion text not null default '',
  precio numeric(12, 2) not null default 0,
  stock numeric(12, 2) not null default 0,
  categoria text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists articulos_codbarra_unique
  on public.articulos (lower(codbarra))
  where codbarra <> '';

create index if not exists articulos_nombre_idx on public.articulos (nombre);

comment on table public.articulos is 'Catálogo de productos (antes hoja articulos en Google Sheets)';
