# 校园美食地图

多伦多大学（多大）St. George 主校区周边的美食与优惠地图，**由同学们共同维护**。

## 我们的理念 · Our Ethos

> 一张由大家写、大家验证、谁也不能偷偷改的美食地图。
>
> A food map written by everyone, verified by everyone, and quietly rewritten by no one.

### 中文

**信息属于大家，而不是某一个平台。** 哪家店好吃、哪里有学生折扣、饭团券还能不能用，这些知识本来就散落在每个同学的日常里。我们希望把它们汇集起来，又不交给某个人或某家公司独占。

我们借用了区块链最珍贵的几个想法，但没有真的上链：

- **共识，而不是权威。** 一条信息能不能上地图，不由管理员一个人说了算，而是人人都能动手：新增店家、新增或修改优惠，只要附上照片就能立刻生效；要取消一条优惠，则需要 2 位同学各自拿出照片证据来确认，避免一个人就把别人的贡献删掉。你也可以反对，同样要拿出证据。
- **历史不可篡改。** 每一次新增、修改、取消、投票，都会写进一本只能追加的公开账本。每条记录都带着上一条的哈希值，环环相扣：谁要是偷偷改了过去，链条就会断开。
- **不用信任，可以验证。** 你不需要相信我们。打开 `/ledger`，你的浏览器会自己把整条链重新算一遍；也可以把账本下载下来，用任何语言自己验证。
- **透明。** 证据照片、投票过程、谁在什么时候改了什么，全部公开。管理员也能撤销违规内容，但这个操作同样会被记进账本，所有人都看得到。

**代码也是公开的。** 整个项目的代码都放在 GitHub 上：怎么计票、怎么记账、数据库有哪些权限，每一行都可以检查。觉得哪里不对，欢迎提 issue 或 pull request；想给自己的学校做一份，也可以直接 fork 一份拿去改。项目采用 [MIT 许可证](LICENSE)，可以自由使用、修改和分发，只需保留版权声明。

我们相信：**最可靠的信息，来自开放的规则、公开的证据和每一个愿意动手核实的人。**

### English

**Knowledge belongs to the community, not to a platform.** Which places are good, where students get a discount, whether a Fantuan coupon still works: this knowledge already lives in the everyday experience of students. We want to gather it in one place without handing it to any single person or company.

We borrow the most valuable ideas from blockchains, without putting anything on an actual chain:

- **Consensus over authority.** No single admin decides what goes on the map. Anyone can add a store, or add or change a deal, and it goes live as soon as they post it with a photo. Cancelling a deal takes 2 students, each with their own photo evidence, so no single person can erase someone else's contribution. You can also object, and objections need evidence too.
- **History that can't be rewritten.** Every addition, change, cancellation and vote is written to an append-only public ledger. Each entry carries the hash of the one before it, so if anyone quietly edits the past, the chain breaks.
- **Don't trust, verify.** You don't have to take our word for it. Open `/ledger` and your own browser recomputes the whole chain. You can also download the ledger and check it yourself in any language.
- **Transparency.** Evidence photos, votes, and who changed what and when are all public. Admins can remove abusive content, but that action is recorded in the ledger too, for everyone to see.

**The code is public too.** The whole project is on GitHub: how votes are counted, how the ledger is written, what the database allows. Every line is open to inspection. If something looks wrong, open an issue or a pull request. If you want a map like this for your own school, fork it and make it yours. The project is released under the [MIT License](LICENSE): use, modify and share it freely, as long as you keep the copyright notice.

We believe **the most reliable information comes from open rules, public evidence, and everyone willing to check for themselves.**

## 怎么运作

- 任何人用邮箱登录后（不需要密码，收邮件点链接），都可以提交变更：**新店家 / 新增优惠 / 优惠变了 / 优惠取消了**。
- 每次提交和每一票都**必须附照片证据**（店内告示、菜单、收据、饭团等 App 截图）。照片公开给所有人查看。（可选）配置 Claude API key 后，照片会先经过 AI 检查：和这家店无关、或者和你的说法相反的照片会被拒绝。
- **新增店家、新增优惠、修改优惠**：附照片提交即生效。
- **取消优惠**：2 位不同的同学附照片确认（且确认多于反对）后生效；2 人反对则驳回；14 天没结果自动过期。
- 同一个人对同一提案只能投一票，同一张照片不能在同一提案里重复使用；每人每天最多提交 10 个提案、投 30 票。

## 借鉴区块链的部分

没有真的上链（手续费、钱包门槛太高，也防不了一人多号），但借用了它的核心思想：

| 区块链 | 这里 |
|---|---|
| 共识才能写入 | 取消优惠需要 2 人附证据确认，其它变更附证据即生效（`proposal_threshold`），逻辑在数据库函数 `cast_vote` 里原子执行 |
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
2. **SQL Editor**：运行 `supabase/schema.sql`（会自动创建 `evidence` 存储桶）。不需要导入任何初始数据，店家和优惠都由用户提交
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


## 许可证 · License

[MIT](LICENSE) © 2026 fsbym

地图数据 © [OpenStreetMap](https://www.openstreetmap.org/copyright) 贡献者，采用 ODbL 许可。
Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, available under the ODbL.
