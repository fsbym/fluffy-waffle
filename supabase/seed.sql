-- 让账本把这批初始数据记成 seed 写入的
select set_config('app.actor', 'seed', false);

-- 初始店家数据（多大 St. George 校区周边）。
-- 不预置任何优惠：优惠由同学们附照片提交。评分和价位是估计值，可以在 /admin 后台修改。
insert into public.restaurants (name, category, address, price_range, lat, lng, walk_minutes, rating, emoji, color, accent)
select name, category, address, price_range, lat, lng, public.walk_minutes_from_campus(lat, lng), rating, emoji, color, accent
from (values
  -- 坐标来自 OpenStreetMap（Nominatim）
  ('Kinton Ramen',       '日料', '668 Bloor St W, Toronto, ON',   '$15-22', 43.664153, -79.416314, 4.5, '🍜', '#f1d1b1', '#de7a44'),
  ('Sushi on Bloor',     '日料', '525 Bloor St W, Toronto, ON',   '$15-30', 43.665424, -79.409178, 4.3, '🍣', '#dec68f', '#c89c54'),
  ('Mother''s Dumplings','中餐', '421 Spadina Ave, Toronto, ON',  '$12-20', 43.657120, -79.399434, 4.4, '🥟', '#e7c3a8', '#b77850'),
  ('Rol San',            '中餐', '388 Spadina Ave, Toronto, ON',  '$15-25', 43.655441, -79.399342, 4.2, '🥢', '#d8e2bd', '#98ad6d'),
  ('Sneaky Dee''s',      '西式', '431 College St, Toronto, ON',   '$14-24', 43.656246, -79.407432, 4.1, '🌮', '#c9dcae', '#7e9c62'),
  ('Seven Lives Tacos',  '西式', 'Kensington Ave, Toronto, ON',   '$8-18',  43.654547, -79.400772, 4.7, '🌯', '#f1d1b1', '#de7a44'),
  ('Future Bistro',      '甜点', '483 Bloor St W, Toronto, ON',   '$8-18',  43.665750, -79.407622, 4.0, '🍰', '#dec68f', '#c89c54')
) as v(name, category, address, price_range, lat, lng, rating, emoji, color, accent);
