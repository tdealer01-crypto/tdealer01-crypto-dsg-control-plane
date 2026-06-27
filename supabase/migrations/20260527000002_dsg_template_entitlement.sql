-- Template Marketplace entitlement guard
-- Blocks paid template use until the actor is the seller or has a CLEARED purchase.

create index if not exists dsg_template_sales_buyer_template_status_idx
  on public.dsg_template_sales(buyer_id, template_id, status, created_at desc);

create or replace function can_use_template(
  p_actor_id uuid,
  p_template_id uuid
) returns table(
  allowed boolean,
  reason text,
  sale_status text,
  price_satang integer
)
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_template record;
  v_sale record;
begin
  select t.id, t.seller_id, t.price_satang, t.sharing_mode
    into v_template
  from public.dsg_templates as t
  where t.id = p_template_id
  limit 1;

  if not found then
    return query select false, 'TEMPLATE_NOT_FOUND'::text, null::text, null::integer;
    return;
  end if;

  if v_template.seller_id = p_actor_id then
    return query select true, 'SELLER_OWNER'::text, null::text, v_template.price_satang::integer;
    return;
  end if;

  if coalesce(v_template.sharing_mode, 'public') <> 'public' then
    return query select false, 'TEMPLATE_NOT_PUBLIC'::text, null::text, v_template.price_satang::integer;
    return;
  end if;

  if coalesce(v_template.price_satang, 0) <= 0 then
    return query select true, 'FREE_TEMPLATE'::text, null::text, v_template.price_satang::integer;
    return;
  end if;

  select s.status
    into v_sale
  from public.dsg_template_sales as s
  where s.template_id = p_template_id
    and s.buyer_id = p_actor_id
  order by s.created_at desc
  limit 1;

  if not found then
    return query select false, 'PAYMENT_REQUIRED'::text, null::text, v_template.price_satang::integer;
    return;
  end if;

  if v_sale.status = 'CLEARED' then
    return query select true, 'PURCHASE_CLEARED'::text, v_sale.status::text, v_template.price_satang::integer;
    return;
  end if;

  if v_sale.status = 'PENDING' then
    return query select false, 'PURCHASE_PENDING'::text, v_sale.status::text, v_template.price_satang::integer;
    return;
  end if;

  if v_sale.status = 'REFUNDED' then
    return query select false, 'PURCHASE_REFUNDED'::text, v_sale.status::text, v_template.price_satang::integer;
    return;
  end if;

  return query select false, 'PURCHASE_NOT_CLEARED'::text, v_sale.status::text, v_template.price_satang::integer;
end;
$$;