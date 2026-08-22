# JJ的快乐小屋

一个只供两个人使用的情侣生活记录与奖励兑换小世界。`user` 账户负责签到、积累奶龙币和兑换奖励；`admin` 账户查看对方签到与照片，并管理商品、订单和奖励规则。登录、图片、钱包、流水、生活记录、兑换、审核与权限均落在 Supabase，关键资金操作由 PostgreSQL 原子函数完成。

## 已实现功能

- Supabase Auth 邮箱密码登录，不开放公开注册
- `admin` / `user` 两种角色，页面、Server Action、RLS 三层权限校验
- 普通账户支持午间 11:00–14:00、晚间 16:00–22:00 限时照片签到；管理员首页和签到页只查看对方的状态与照片
- 默认午间 +5、晚间 +5、完整两次 +5、连续 7 天 +20、连续 30 天 +100，后台可改
- 按 `Asia/Shanghai` 判断今天、月份和连续签到
- 可用余额、冻结余额和完整钱包流水
- 兑换时原子冻结余额，批准后正式支付并扣库存，拒绝或取消后原子退款
- 商品新建、编辑、删除、库存、上下架、推荐、隐藏和图片上传
- 订单待审核、等待兑现、完成、拒绝、取消全流程与状态事件
- 管理员主动发放或扣除奶龙币（强制原因、禁止负余额、同步流水）
- “我们的回忆”照片墙，整合吃饭照片与双方生活照片，支持日期、月份与分类浏览
- 首页留言、个人昵称与头像、移动端底部导航
- 普通账户底部导航为“首页、签到、商店、日历、我的”；管理员对应为“首页、她的签到、商品管理、日历、我的”
- 双方每日 7 档心情、可选标签与备注；仅 `user` 北京时间当天首次记录按后台规则奖励一次
- 管理员心情回应与一次性可选发币
- 统一情侣日历、完整 `/calendar/[date]` Day Detail、纪念日/年度重复、双人今日一句与奶龙日报
- “我们的故事”重要事件时间线、首页稳定随机回忆、兑换目标进度与纪念日模式
- 关系开始日期与“我们第 X 天”自动计算
- 愿望清单与管理员独立秘密准备状态
- 惊喜箱商品、后台准备、用户主动揭晓与轻量动画
- 基于真实签到、心情、钱包、订单、纪念日和愿望数据的情侣成就
- 地点卡片、照片、时间轴与可选经纬度足迹
- Loading、空状态、错误提示和重复提交保护

## 技术栈

- Next.js 16 App Router、React 19、TypeScript
- Tailwind CSS 4
- Supabase Auth、PostgreSQL、Storage、RLS、RPC
- Vercel

## 主要目录

```text
app/
  (main)/                 登录后的用户页面
  admin/                  管理员后台
  login/                  自定义登录页
  actions.ts              经过服务端鉴权的表单操作
components/
  admin/                  后台业务组件
  layout/                 用户与后台导航
  ui/                     卡片、按钮、状态等基础组件
lib/
  supabase/               浏览器、服务端和 Proxy 客户端
  auth.ts                 当前用户、管理员校验
  data.ts                 只在服务端使用的数据访问层
  life-data.ts            V2 生活记录数据访问层
  life.ts                 上海日期、心情与纪念日计算
supabase/migrations/      数据库、RLS、RPC、Storage 完整迁移
types/                    领域类型
public/nailong/           可集中替换的奶龙占位素材
proxy.ts                  Supabase 会话刷新
```

## 一、准备环境

需要 Node.js 20.9 或更高版本、npm，以及一个 Supabase 账号。推荐直接使用本项目锁定的依赖版本。

```bash
npm install
```

复制环境变量示例：

```powershell
Copy-Item .env.example .env.local
```

在 Supabase 项目后台打开 **Project Settings → API**，把以下两项填入 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://你的项目编号.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的-anon-key
```

本项目不需要 `SUPABASE_SERVICE_ROLE_KEY`。不要创建 `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`，也不要把 service role key 放到浏览器或提交到 Git。

## 二、创建并初始化 Supabase

1. 在 [Supabase](https://supabase.com/) 新建项目，妥善保存数据库密码。
2. 打开 **SQL Editor → New query**。
3. 全新数据库先运行 [`supabase/migrations/202608090001_initial_schema.sql`](supabase/migrations/202608090001_initial_schema.sql)。
4. 然后运行 [`supabase/migrations/202608100002_life_world_v2.sql`](supabase/migrations/202608100002_life_world_v2.sql)；它包含当前正确的签到时间窗补丁和全部 V2 增量结构。
5. 接着运行 [`supabase/migrations/202608100003_relationship_partners.sql`](supabase/migrations/202608100003_relationship_partners.sql)；它会增量加入情侣双方关联、昵称读取策略和首页聚合查询。
6. 运行 [`supabase/migrations/202608100004_couple_space.sql`](supabase/migrations/202608100004_couple_space.sql)；它会加入双人生活记录读取权限、生活照片、故事事件和新版首页聚合查询。
7. 再运行 [`supabase/migrations/202608100005_image_storage_and_trash.sql`](supabase/migrations/202608100005_image_storage_and_trash.sql)；它只增量加入回收站字段、索引、管理策略与存储提醒设置，不会清空或改写已有照片。
8. 继续按文件名顺序运行 `202608160001_lunch_checkin_window_14.sql` 和 `202608160002_checkin_makeup.sql`。
9. 运行 `202608230001_admin_observer_mode.sql`，从数据库入口禁止管理员签到和发起兑换。已经执行过的 migration 不要重复运行或修改。

也可以使用 Supabase CLI：

```bash
npx supabase login
npx supabase link --project-ref 你的项目编号
npx supabase db push
```

不要对同一个项目同时用 SQL Editor 和 `db push` 重复执行初始迁移。

### 迁移创建的数据结构

- `profiles`
- `wallet_balances`
- `wallet_transactions`
- `checkins`
- `products`
- `orders`
- `reward_claims`
- `order_events`
- `system_settings`
- `announcements`
- `admin_logs`
- `relationship_settings`
- `moods`
- `mood_responses`
- `daily_notes`
- `calendar_events`
- `wishes`
- `wish_admin_meta`
- `product_mystery_details`
- `order_mystery_details`
- `achievement_definitions`
- `user_achievements`
- `places`

### Storage

迁移会自动创建：

- `checkin-images`：私有；本人可上传和读取，管理员可读取
- `product-images`：公开读取；仅管理员可写
- `avatars`：公开读取；用户只能写自己 UUID 文件夹
- `life-images`：仅登录后的两人可读取；用户写自己的 UUID 文件夹，管理员可管理

四个 bucket 均限制为 JPG/JPEG、PNG、WebP，最大 5MB。iPhone HEIC/HEIF 会先在浏览器端转换为兼容格式，再走同一套压缩和上传校验；Storage bucket 的 MIME 类型、大小限制与读写策略不需要放开。无需在 Dashboard 手动重复创建。

## 三、Auth 与两个账号

打开 Supabase **Authentication → Providers → Email**，确保 Email Provider 已开启。因为网站只有两个人，不需要开启公开注册页面；账号由管理员在 Dashboard 手动创建。

### 创建管理员账号

1. 进入 **Authentication → Users → Add user → Create new user**。
2. 输入管理员邮箱和一个强密码；可勾选自动确认邮箱。
3. 创建后，`profiles` 与 `wallet_balances` 会由数据库触发器自动生成。
4. 在 SQL Editor 运行下面语句，把示例邮箱替换成真实管理员邮箱：

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'admin@example.com'
);
```

检查结果：

```sql
select u.email, p.nickname, p.role
from auth.users u
join public.profiles p on p.id = u.id;
```

### 创建普通用户账号

仍在 **Authentication → Users → Add user** 创建女朋友的邮箱与密码即可。新账号默认角色就是 `user`，不要在 SQL 里写真实邮箱或密码。

### 之后修改角色

只在 Supabase SQL Editor 中执行，并用实际邮箱替换示例值：

```sql
update public.profiles
set role = 'admin' -- 或 'user'
where id = (
  select id from auth.users where email = 'someone@example.com'
);
```

普通用户无法通过浏览器、DevTools 或直接调用 Supabase 客户端把自己改成管理员；数据库触发器会保留原角色。

## 四、本地启动与检查

开发模式：

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，使用刚创建的邮箱和密码登录。

提交前检查：

```bash
npm run lint
npm run typecheck
npm run build
```

生产模式本地预览：

```bash
npm run build
npm run start
```

## 五、部署到 Vercel

1. 把代码推送到 GitHub 仓库。
2. 登录 [Vercel](https://vercel.com/)，选择 **Add New → Project**，导入仓库。
3. Framework Preset 保持 Next.js，Build Command 保持 `npm run build`。
4. 在 **Settings → Environment Variables** 添加：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. 两个变量都勾选 Production；如果使用 Vercel Preview，也勾选 Preview。
6. 点击 Deploy。
7. 部署完成后，在 Supabase **Authentication → URL Configuration**：
   - `Site URL` 填 Vercel 正式域名，如 `https://example.vercel.app`
   - `Redirect URLs` 添加正式域名和需要的 Preview 域名

本项目使用邮箱密码登录且暂未实现邮件回调页；如果账号在 Dashboard 中已确认邮箱，可以直接登录。

## 六、安全与一致性说明

- 普通用户不能直接写 `wallet_balances`、`wallet_transactions`、`orders` 或 `checkins`；这些表没有客户端写策略。
- `moods` 只能通过数据库原子函数保存；奖励领取由 `reward_claims` 的三字段唯一约束保证并发幂等。
- `wish_admin_meta` 与 `product_mystery_details` 只允许管理员读取；惊喜订单详情只有揭晓后才允许订单所有者读取。
- 签到、冻结、批准、拒绝、取消、完成、管理员发币都通过 `SECURITY DEFINER` RPC，函数内部再次检查 `auth.uid()` 和角色。
- 管理员签到和兑换在页面、Server Action 与数据库触发器三层禁止，无法通过直接调用 RPC 绕过。
- 钱包行和商品行使用 `FOR UPDATE` 锁；余额、冻结额、库存有非负约束。
- 每次签到与兑换带随机请求 UUID，并有唯一约束；网络重试不会重复发币或重复建单。
- 历史订单保存商品名称与价格快照，后续商品改价不会影响旧订单。
- 所有 timestamp 保存为 UTC，业务日期明确用 `Asia/Shanghai` 转换。
- Storage 隐私边界：`checkin-images` 与 `life-images` 保持私有，通过短时签名 URL 展示；`product-images` 为公开商品素材；`avatars` 目前为公开 bucket，以兼容登录后全站头像展示。头像可能涉及个人隐私，不要上传证件或敏感照片；若以后改为私有 bucket，需要同步改造头像签名 URL，不能只切换开关。

## 七、更换奶龙素材

`public/nailong/` 里的 `nailong-3d.png` 与 `coin-3d.png` 根据项目所有者提供的形象参考，通过图像生成工具制作并抠除背景。

需要再次更换形象时，可以：

1. 保持文件名不变，直接替换目录中的 PNG；或
2. 在后台商品编辑页上传每个奖励的图片；或
3. 在个人中心上传头像。

如果换成不同文件名，请搜索 `/nailong/` 统一修改引用。请确认正式素材的版权和使用范围。

## 八、常见问题

### 登录页提示 Supabase 未连接

确认项目根目录存在 `.env.local`，变量名没有拼错，然后重启 `npm run dev`。

### 运行迁移时提示对象已存在

初始迁移已被执行过。不要重复运行；如需重建，请新建 Supabase 项目，或使用规范的后续 migration，不要在生产库手工删除表。

### 上传图片失败

确认格式为 JPG/JPEG、PNG、WebP 或 iPhone HEIC/HEIF，并确认 migration 已创建 Storage bucket 与策略。浏览器会先把 HEIC/HEIF 转为 JPEG，再自动缩放并压缩为 WebP（不支持时回退 JPEG）；最终提交到 Supabase Storage 的仍是 JPG/JPEG、PNG 或 WebP，且不能超过 5MB。

### 数据与照片备份

- Supabase 数据库与 Storage 是两部分，重要备份应同时包含两者。
- 数据库可定期在 Supabase Dashboard 导出，或使用官方 CLI 执行数据库备份；Storage 可按 bucket 下载归档。
- 建议每月一次，并在大批量清理前额外备份一次。先保留回收站 30 天，再由管理员在“后台 → 存储”手动清理。
- “孤立文件扫描”默认只试运行；只有管理员二次确认后才会删除。软删除记录仍算有效引用，不会被误判为孤立文件。

### 管理员访问 `/admin` 被送回首页

在 SQL Editor 查询 `profiles.role` 是否为 `admin`；改完角色后退出并重新登录。

### 兑换提示余额不足，但总余额看起来够

兑换只使用 `available_balance`。已经提交但尚未处理的订单会把相应金额放在 `frozen_balance`，管理员拒绝或用户在审核前取消后才会退回可用余额。

### 商品删除失败

为了保护历史订单外键，已有订单引用的商品不能删除。将商品设为“下架”或“隐藏”即可。

## 当前已知限制

- 心情中央形象暂时复用统一奶龙 placeholder，并通过表情与颜色区分 7 档；可在 `public/nailong/moods/` 后续逐档替换。
- 足迹第一版保存可选经纬度，但不接第三方地图 API。
- 奶龙日报实时聚合，不生成图片文件；结构已为以后导出卡片预留。
- 惊喜揭晓图片字段已预留，当前后台先支持文字惊喜与留言。
- JPG、PNG、WebP 已在客户端按用途自动压缩；iPhone HEIC/HEIF 会按需动态加载转换器，转成兼容格式后复用同一套压缩和 5MB 校验。
- 没有找回密码页面；两人站点可先由 Supabase Dashboard 管理账号。
- 最新 migration 执行后才能进行真实的双账号 RLS、生活照片和跨账号端到端验收。
