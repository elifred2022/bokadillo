-- Path de la foto en el bucket foto_articulo_venta
alter table public.articulos
  add column if not exists img_path text;

comment on column public.articulos.img_path is
  'Path del objeto en el bucket Storage foto_articulo_venta';
