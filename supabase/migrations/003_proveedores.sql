-- Tabla de proveedores (referencia; puede diferir si ya la creaste en Supabase)
create table if not exists public.proveedores (
  id bigserial primary key,
  idproveedor numeric not null unique,
  nombre text not null,
  telefono numeric,
  email text,
  direccion text,
  contacto text,
  created_at timestamptz not null default now()
);

create index if not exists proveedores_nombre_idx on public.proveedores (nombre);

comment on table public.proveedores is 'Proveedores (antes hoja proveedores en Google Sheets)';
