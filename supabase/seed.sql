-- 初始店家数据（多大 St. George 校区周边）。
-- 折扣与饭团券为示例，请在 /admin 后台改成真实信息。
with r as (
  insert into public.restaurants (name, category, address, price_range, walk_minutes, rating, emoji, color, accent) values
    ('Kinton Ramen',       '日料', '51 Baldwin St, Toronto, ON',    '$15-22', 10, 4.5, '🍜', '#f1d1b1', '#de7a44'),
    ('Sushi on Bloor',     '日料', '515 Bloor St W, Toronto, ON',   '$15-30',  8, 4.3, '🍣', '#dec68f', '#c89c54'),
    ('Mother''s Dumplings','中餐', '421 Spadina Ave, Toronto, ON',  '$12-20', 12, 4.4, '🥟', '#e7c3a8', '#b77850'),
    ('Rol San',            '中餐', '323 Spadina Ave, Toronto, ON',  '$15-25', 15, 4.2, '🥢', '#d8e2bd', '#98ad6d'),
    ('Sneaky Dee''s',      '西式', '431 College St, Toronto, ON',   '$14-24', 10, 4.1, '🌮', '#c9dcae', '#7e9c62'),
    ('Seven Lives Tacos',  '西式', '72 Kensington Ave, Toronto, ON','$8-18',  14, 4.7, '🌯', '#f1d1b1', '#de7a44'),
    ('Future Bistro',      '甜点', '483 Bloor St W, Toronto, ON',   '$8-18',   8, 4.0, '🍰', '#dec68f', '#c89c54'),
    ('Pancho''s Bakery',   '甜点', '214 Augusta Ave, Toronto, ON',  '$4-12',  14, 4.6, '🥐', '#d8e2bd', '#98ad6d')
  returning id, name
)
insert into public.deals (restaurant_id, kind, title, source)
select r.id, d.kind, d.title, d.source
from r join (values
  ('Kinton Ramen',        'discount', '出示学生卡 9 折（示例）',        '店家'),
  ('Kinton Ramen',        'coupon',   '饭团券可用（示例）',             '饭团'),
  ('Sushi on Bloor',      'discount', '午市套餐学生减 $2（示例）',      '店家'),
  ('Mother''s Dumplings', 'discount', '满 $30 送小菜（示例）',          '店家'),
  ('Mother''s Dumplings', 'coupon',   '饭团券可用（示例）',             '饭团'),
  ('Rol San',             'discount', '工作日早茶 9 折（示例）',        '店家'),
  ('Sneaky Dee''s',       'discount', '学生周二特价（示例）',           '店家'),
  ('Seven Lives Tacos',   'coupon',   '饭团券可用（示例）',             '饭团'),
  ('Future Bistro',       'discount', '蛋糕第二件半价（示例）',         '店家'),
  ('Pancho''s Bakery',    'discount', '买 6 个 churros 送 1 个（示例）','店家')
) as d(name, kind, title, source) on d.name = r.name;
