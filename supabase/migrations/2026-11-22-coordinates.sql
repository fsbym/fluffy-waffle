-- 一次性迁移：给已经上线的数据库补上坐标，并修正初始数据中有误的地址。
-- 先运行最新的 schema.sql（会新增 lat/lng 列和函数），再运行本文件。可以重复运行。
select set_config('app.actor', 'migration', false);

update public.restaurants r set address = v.address, lat = v.lat, lng = v.lng,
  walk_minutes = public.walk_minutes_from_campus(v.lat, v.lng)
from (values
  ('Kinton Ramen',       '668 Bloor St W, Toronto, ON',  43.664153, -79.416314),
  ('Sushi on Bloor',     '525 Bloor St W, Toronto, ON',  43.665424, -79.409178),
  ('Mother''s Dumplings','421 Spadina Ave, Toronto, ON', 43.657120, -79.399434),
  ('Rol San',            '388 Spadina Ave, Toronto, ON', 43.655441, -79.399342),
  ('Sneaky Dee''s',      '431 College St, Toronto, ON',  43.656246, -79.407432),
  ('Seven Lives Tacos',  'Kensington Ave, Toronto, ON',  43.654547, -79.400772),
  ('Future Bistro',      '483 Bloor St W, Toronto, ON',  43.665750, -79.407622),
  ('Pancho''s Bakery',   '214 Augusta Ave, Toronto, ON', 43.654730, -79.402350)
) as v(name, address, lat, lng)
where r.name = v.name
  and (r.lat is distinct from v.lat or r.lng is distinct from v.lng or r.address is distinct from v.address);
