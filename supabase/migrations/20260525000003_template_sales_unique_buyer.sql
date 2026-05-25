-- Prevent the same buyer from purchasing the same template more than once
alter table public.dsg_template_sales
  add constraint uq_template_sale_buyer_template
  unique (template_id, buyer_id);
