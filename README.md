# 校园美食地图

多伦多大学（多大）St. George 主校区周边的美食与优惠地图，**由同学们共同维护**。

## 怎么运作

- 任何人用邮箱登录后（不需要密码，收邮件点链接），都可以提交变更：**新店家 / 新增优惠 / 优惠变了 / 优惠取消了**。
- 每次提交和每一票都**必须附照片证据**（店内告示、菜单、收据、饭团等 App 截图）。照片公开给所有人查看。（可选）配置 Claude API key 后，照片会先经过 AI 检查：和这家店无关、或者和你的说法相反的照片会被拒绝。
- **3 位不同的同学附照片确认**（且确认多于反对）后，变更自动生效；3 人反对则驳回；14 天没结果自动过期。
- 同一个人对同一提案只能投一票，同一张照片不能在同一提案里重复使用；每人每天最多提交 10 个提案、投 30 票。

## 借鉴区块链的部分

没有真的上链（手续费、钱包门槛太高，也防不了一人多号），但借用了它的核心思想：

| 区块链 | 这里 |
|---|---|
| 共识才能写入 | 3 人附证据确认才生效，逻辑在数据库函数 `cast_vote` 里原子执行 |
| 不可篡改的账本 | 店家、优惠、提案、投票的每次变化都由触发器写入 `ledger` 表；只能追加，每条带上一条的哈希 |
| 公开可验证 | `/ledger` 页面在浏览器里重新计算整条哈希链；也可以下载 JSON 自己验证：`hash = sha256(prev_hash + "\n" + body)` |

## 架构

- **前端**（Next.js）：`src/app/page.tsx` 地图与列表，`proposal-dialog.tsx` 提交，`proposals-panel.tsx` 投票，`ledger/page.tsx` 公开账本，`admin/page.tsx` 管理后台
- **后端**：`src/app/api/*`，用 Supabase secret key 访问数据库，用 Claude API 检查照片（`src/lib/evidence.ts`）
- **地图**：OpenStreetMap + Leaflet（`src/app/map-view.tsx`），免费、无需 API key。新店家的地址由后端通过 OpenStreetMap 的 Nominatim 自动转成坐标（`src/lib/geocode.ts`），步行时间按到 King's College Circle 的距离估算
- **数据库**：Supabase（免费版 PostgreSQL + Auth + Storage），结构见 `supabase/schema.sql`
  - 所有表开启 RLS 且没有公开策略，数据库函数也收回了公开执行权限，浏览器无法绕过后端
  - 证据照片放在私有的 `evidence` 存储桶里，通过后端生成的临时链接查看

## 数据库迁移

已经建好的数据库升级时，先运行最新的 `supabase/schema.sql`（可重复运行），再运行 `supabase/migrations/` 里尚未运行过的文件。

## 第一次设置

1. 在 [supabase.com](https://supabase.com) 免费新建项目
2. **SQL Editor**：依次运行 `supabase/schema.sql`、`supabase/seed.sql`（会自动创建 `evidence` 存储桶）
3. **Authentication → URL Configuration**：把 Site URL 设为你的网址（本地开发是 `http://localhost:3000`），登录邮件里的链接会跳回这里
4. （可选）在 [console.anthropic.com](https://console.anthropic.com) 创建 API key，开启照片的 AI 检查
5. 复制 `.env.example` 为 `.env.local` 并填好
6. 启动：

```bash
npm install
npm run dev
```

- 地图：http://localhost:3000
- 公开账本：http://localhost:3000/ledger
- 管理后台：http://localhost:3000/admin

部署到 Vercel 时，把 `.env.example` 里的变量填进项目的 Environment Variables，并把 Supabase 的 Site URL 改成正式网址。

> 初始数据里的折扣和饭团券是示例，上线后请同学们用提案改成真实信息。
