-- Add stripe_checkout_session_id to track Stripe sessions
alter table public.dsg_template_sales
  add column if not exists stripe_checkout_session_id text;

-- RPC: insert initial sale record (PENDING or CLEARED for free templates)
create or replace function record_template_sale(
  p_sale_id                    uuid,
  p_template_id                uuid,
  p_seller_id                  uuid,
  p_buyer_id                   uuid,
  p_price_satang               int,
  p_commission_rate_bps        int,
  p_platform_fee_satang        int,
  p_creator_payout_satang      int,
  p_status                     text,
  p_stripe_checkout_session_id text default null
) returns void
  language plpgsql
  security definer
as $$
begin
  insert into public.dsg_template_sales (
    sale_id,
    template_id,
    seller_id,
    buyer_id,
    price_satang,
    commission_rate_bps,
    platform_fee_satang,
    creator_payout_satang,
    status,
    stripe_checkout_session_id
  ) values (
    p_sale_id,
    p_template_id,
    p_seller_id,
    p_buyer_id,
    p_price_satang,
    p_commission_rate_bps,
    p_platform_fee_satang,
    p_creator_payout_satang,
    p_status,
    p_stripe_checkout_session_id
  );
end;
$$;

-- RPC: mark sale as CLEARED after Stripe payment confirmed
create or replace function clear_template_sale(
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id   text
) returns void
  language plpgsql
  security definer
as $$
begin
  update public.dsg_template_sales
  set status                   = 'CLEARED',
      stripe_payment_intent_id = p_stripe_payment_intent_id
  where stripe_checkout_session_id = p_stripe_checkout_session_id
    and status = 'PENDING';
end;
$$;
