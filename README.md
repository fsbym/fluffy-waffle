# 校园美食地图

用 Next.js + Supabase 搭建的多伦多大学（多大）St. George 主校区周边美食与优惠地图。

## 功能

- 按分类、店名、地址或优惠内容搜索附近餐厅，可只看「有优惠」的店
- 显示学生折扣、饭团券等优惠，支持有效期，过期自动隐藏
- 每家店都可一键在 Google Maps 中打开
- 同学可以提交新优惠，管理员审核后上线
- `/admin` 管理后台：增删改店家和优惠、标记「今天确认过」、审核提交

## 架构

- **前端**：`src/app/page.tsx`（地图与列表）、`src/app/admin/page.tsx`（管理后台），通过 `/api/*` 读写数据
- **后端**：`src/app/api/*` 路由，使用 Supabase secret key 在服务器端访问数据库
- **数据库**：Supabase（免费版 PostgreSQL），表结构见 `supabase/schema.sql`
  - `restaurants` 店家、`deals` 优惠（带有效期和上次确认日期）、`submissions` 用户提交
  - 所有表都开启 RLS 且没有公开策略，浏览器无法绕过后端直接改数据

## 第一次设置

1. 在 [supabase.com](https://supabase.com) 免费注册并新建一个项目
2. 打开项目的 **SQL Editor**，依次运行 `supabase/schema.sql` 和 `supabase/seed.sql`
3. 复制 `.env.example` 为 `.env.local`，填入：
   - `SUPABASE_URL`：Project Settings → Data API → Project URL
   - `SUPABASE_SECRET_KEY`：Project Settings → API Keys → Secret key
   - `ADMIN_PASSWORD`：自己设一个管理后台密码
4. 启动：

```bash
npm install
npm run dev
```

打开 http://localhost:3000 查看地图，http://localhost:3000/admin 进入管理后台。

部署到 Vercel 时，在项目的 Environment Variables 中填入同样的三个变量。

> 初始数据里的折扣和饭团券是示例，请在管理后台改成真实信息。
