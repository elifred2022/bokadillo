-- Tabla de clientes (referencia; puede diferir si ya la creaste en Supabase)
create table if not exists public.clientes (
  id bigserial primary key,
  idcliente numeric not null unique,
  nombre text not null,
  telefono numeric,
  email text unique,
  direccion text,
  fecha date not null default current_date,
  clave text,
  created_at timestamptz not null default now()
);

create index if not exists clientes_nombre_idx on public.clientes (nombre);
create index if not exists clientes_email_idx on public.clientes (lower(email)) where email is not null;

comment on table public.clientes is 'Clientes y usuarios con login (antes hoja clientes en Google Sheets)';
comment on column public.clientes.fecha is 'Fecha de alta; en la app se expone como fechaCreacion';
comment on column public.clientes.clave is 'Hash bcrypt para login de usuarios registrados';
