-- Orbit — 示範資料 (idempotent-ish: 先清空再灌入)
-- 在 Supabase SQL Editor 執行。示範帳號 demo@orbit.test / demo1234
begin;

truncate subscription_payments, subscriptions, notification_quota, notification_settings,
         payment_providers, line_bot_configs, waitlist, orders, customer_tags, tags,
         customers, item_resources, items, resources, staff, users, orgs
restart identity cascade;

with new_org as (
  insert into orgs (slug, name, contact_email, contact_phone, description, address, address_hint,
                    is_payment_enabled, require_order_approval, remittance_info, order_expiry_minutes,
                    allow_customer_pick_staff, plan, plan_display_name)
  values ('midao', '示範商家', 'demo@orbit.test', '0912345678',
          '提供美容、瑜伽與手作課程的複合式空間。', '台北市中正區府中路 1 號', '府中站 1 號出口，步行約 5 分鐘',
          true, true, '玉山銀行 808 帳號 1234-5678-9012', 1440, true, 'MULTI', '團隊版')
  returning id
),
new_user as (
  insert into users (email, password_hash, name, phone, is_verified)
  values ('demo@orbit.test', crypt('demo1234', gen_salt('bf')), '示範商家管理者', '0912345678', true)
  returning id
)
insert into staff (user_id, org_id, role)
select new_user.id, new_org.id, 'OWNER' from new_user, new_org;

insert into resources (org_id, name, type, capacity, staff_email, staff_status, monthly_commission)
select o.id, v.* from orgs o, (values
  ('美容床 A','EQUIPMENT',1,null,null,0),
  ('設計師小美','STAFF',1,'mei@orbit.test','ACTIVE',12400),
  ('陶藝教室','EQUIPMENT',8,null,null,0),
  ('美容師 Amy','STAFF',1,'amy@orbit.test','PENDING',5600)
) as v(name,type,capacity,staff_email,staff_status,commission) where o.slug='midao';

insert into items (org_id, name, mode, price, deposit, duration_minutes, capacity, is_published, sort_order)
select o.id, v.* from orgs o, (values
  ('臉部保養 60 分鐘','SERVICE',1800,300,60,1,true,1),
  ('美甲全套','SERVICE',1500,0,90,2,true,2),
  ('瑜伽課 10 堂套票','PACKAGE',8000,0,60,null,true,3),
  ('手作陶藝揪團體驗','COURSE',2400,500,120,6,true,4),
  ('深層舒壓按摩','SERVICE',2200,400,90,1,false,5)
) as v(name,mode,price,deposit,dur,cap,pub,ord) where o.slug='midao';

insert into tags (org_id, name)
select o.id, v.name from orgs o, (values ('VIP'),('回頭客'),('新客戶')) as v(name) where o.slug='midao';

insert into customers (org_id, name, phone, email, birthday, note, total_spent, is_blacklisted)
select o.id, v.name, v.phone, v.email, v.bday::date, v.note, v.spent, v.black
from orgs o, (values
  ('王小明','0912-345-678','wang@example.com','1990-05-12','偏好安靜環境',5400,false),
  ('陳雅婷','0922-111-222','chen.yating@example.com','1995-11-03','',12800,false),
  ('李大華','0933-444-555','lee@example.com',null,'需開發票',800,false),
  ('張美玲','0955-666-777','chang@example.com','1988-02-20','',0,true)
) as v(name,phone,email,bday,note,spent,black) where o.slug='midao';

insert into item_resources (item_id, resource_id)
select i.id, r.id from items i join resources r on r.org_id=i.org_id
where (i.name='臉部保養 60 分鐘' and r.name='美容床 A')
   or (i.name='美甲全套' and r.name='設計師小美')
   or (i.name='手作陶藝揪團體驗' and r.name='陶藝教室')
   or (i.name='深層舒壓按摩' and r.name='美容床 A');

insert into customer_tags (customer_id, tag_id)
select c.id, t.id from customers c join tags t on t.org_id=c.org_id
where (c.name='王小明' and t.name='VIP')
   or (c.name='陳雅婷' and t.name in ('VIP','回頭客'))
   or (c.name='張美玲' and t.name='回頭客');

insert into orders (org_id, item_id, customer_id, amount, status, payment_status, remittance_last5, booking_at, note, created_at)
select o.id, i.id, c.id, v.amount, v.status, v.pay, v.last5, v.bat::timestamptz, v.note, v.cat::timestamptz
from orgs o
join (values
  ('臉部保養 60 分鐘','王小明',1800,'CONFIRMED','PAID','','2026-08-05 14:00+08','客人指定小美服務，會提早 10 分鐘到','2026-08-01 10:22+08'),
  ('美甲全套','陳雅婷',1500,'PENDING','UNPAID','78901','2026-08-06 11:00+08','','2026-08-02 09:05+08'),
  ('手作陶藝揪團體驗','李大華',800,'UNPAID','UNPAID','32456','2026-08-07 19:00+08','揪團 3 人','2026-08-03 14:41+08'),
  ('臉部保養 60 分鐘','張美玲',1800,'CANCELLED','REFUNDED','','2026-07-28 16:00+08','臨時取消','2026-07-20 11:00+08')
) as v(item_name,cust_name,amount,status,pay,last5,bat,note,cat) on true
join items i on i.org_id=o.id and i.name=v.item_name
join customers c on c.org_id=o.id and c.name=v.cust_name
where o.slug='midao';

insert into waitlist (org_id, item_id, start_at, capacity, waiting_count, notified_count)
select o.id, i.id, v.sat::timestamptz, v.cap, v.waiting, v.notified
from orgs o
join (values
  ('手作陶藝揪團體驗','2026-08-14 19:00+08',6,3,1),
  ('臉部保養 60 分鐘','2026-08-09 15:00+08',1,2,0)
) as v(item_name,sat,cap,waiting,notified) on true
join items i on i.org_id=o.id and i.name=v.item_name where o.slug='midao';

insert into line_bot_configs (org_id) select id from orgs where slug='midao';
insert into payment_providers (org_id, provider)
select id, p from orgs, (values ('ecpay'),('jkopay')) as v(p) where slug='midao';

insert into notification_settings (org_id, event_type, channel, is_enabled, offset_minutes, subject_template, body_template)
select id, 'BOOKING_REMINDER','EMAIL',true,60,
  '【{{商家名稱}}】預約提醒：{{服務名稱}}',
  E'親愛的 {{客戶名稱}}，您好：\n\n提醒您預約的「{{服務名稱}}」將於 {{預約時間}} 開始，記得準時前來。\n\n期待與您相見！\n— {{商家名稱}}'
from orgs where slug='midao';

insert into notification_quota (org_id, non_sms_used, non_sms_total, sms_used, sms_total, top_up, reset_at)
select id,312,1000,48,100,0,'2026-09-01' from orgs where slug='midao';

insert into subscriptions (org_id, plan, plan_display_name, period_end, ai_credits_used, ai_credits_total)
select id,'MULTI','團隊版','2026-09-01',6200000,15000000 from orgs where slug='midao';

insert into subscription_payments (org_id, paid_at, plan, cycle, amount, status)
select o.id, v.d::date,'團隊版','月繳',790,'PAID'
from orgs o, (values ('2026-08-01'),('2026-07-01')) as v(d) where o.slug='midao';

commit;
