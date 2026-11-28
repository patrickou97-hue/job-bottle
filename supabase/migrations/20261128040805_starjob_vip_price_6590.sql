-- Existing orders keep their checkout price when reconciled.
alter table public.starjob_vip_orders
  alter column amount_fen set default 6590,
  drop constraint starjob_vip_orders_amount_fen_check,
  add constraint starjob_vip_orders_amount_fen_check check (amount_fen in (1999, 6590));
