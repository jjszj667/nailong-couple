# 奶龙情侣点单站

一个只供两个人使用的情侣陪伴与奖励兑换网站。普通用户通过每天上传午饭、晚饭照片签到获得“奶龙币”，再用奶龙币申请兑换管理员上架的约会、陪伴与小礼物奖励。它不是前端演示：登录、图片、钱包、流水、兑换、审核与权限均落在 Supabase，关键资金操作由 PostgreSQL 原子函数完成。

## 已实现功能

- Supabase Auth 邮箱密码登录，不开放公开注册
- `admin` / `user` 两种角色，页面、Server Action、RLS 三层权限校验
- 午饭与晚饭照片签到；同一用户、日期、餐次只能成功一次
- 默认午饭 +5、晚饭 +5、完整两餐 +5、连续 7 天 +20、连续 30 天 +100，后台可改
- 按 `Asia/Shanghai` 判断今天、月份和连续签到
- 可用余额、冻结余额和完整钱包流水
- 兑换时原子冻结余额，批准后正式支付并扣库存，拒绝或取消后原子退款
- 商品新建、编辑、删除、库存、上下架、推荐、隐藏和图片上传
- 订单待审核、等待兑现、完成、拒绝、取消全流程与状态事件
- 管理员主动发放或扣除奶龙币（强制原因、禁止负余额、同步流水）
- 吃饭照片墙、日期筛选、午晚饭标签和图片放大
- 首页留言、个人昵称与头像、移动端底部导航
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
3. 复制 [`supabase/migrations/202608090001_initial_schema.sql`](supabase/migrations/202608090001_initial_schema.sql) 的全部内容并运行一次。
4. 迁移会创建表、枚举、外键、索引、约束、触发器、RLS、策略、原子 RPC、默认商品、默认规则和三个 Storage bucket。

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

### Storage

迁移会自动创建：

- `checkin-images`：私有；本人可上传和读取，管理员可读取
- `product-images`：公开读取；仅管理员可写
- `avatars`：公开读取；用户只能写自己 UUID 文件夹

三者均限制为 JPG/JPEG、PNG、WebP，最大 5MB。无需在 Dashboard 手动重复创建。

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
- 签到、冻结、批准、拒绝、取消、完成、管理员发币都通过 `SECURITY DEFINER` RPC，函数内部再次检查 `auth.uid()` 和角色。
- 钱包行和商品行使用 `FOR UPDATE` 锁；余额、冻结额、库存有非负约束。
- 每次签到与兑换带随机请求 UUID，并有唯一约束；网络重试不会重复发币或重复建单。
- 历史订单保存商品名称与价格快照，后续商品改价不会影响旧订单。
- 所有 timestamp 保存为 UTC，业务日期明确用 `Asia/Shanghai` 转换。

## 七、更换奶龙素材

`public/nailong/` 里的 `nailong-placeholder.svg` 与 `coin.svg` 是项目自制的抽象占位素材，不是从网络下载的官方素材。

取得正式图片授权后，可以：

1. 保持文件名不变，直接替换目录中的 SVG；或
2. 在后台商品编辑页上传每个奖励的图片；或
3. 在个人中心上传头像。

如果换成不同文件名，请搜索 `/nailong/` 统一修改引用。请确认正式素材的版权和使用范围。

## 八、常见问题

### 登录页提示 Supabase 未连接

确认项目根目录存在 `.env.local`，变量名没有拼错，然后重启 `npm run dev`。

### 运行迁移时提示对象已存在

初始迁移已被执行过。不要重复运行；如需重建，请新建 Supabase 项目，或使用规范的后续 migration，不要在生产库手工删除表。

### 上传图片失败

确认文件小于 5MB、格式为 JPG/JPEG、PNG 或 WebP，并确认初始 migration 已创建 Storage bucket 与策略。

### 管理员访问 `/admin` 被送回首页

在 SQL Editor 查询 `profiles.role` 是否为 `admin`；改完角色后退出并重新登录。

### 兑换提示余额不足，但总余额看起来够

兑换只使用 `available_balance`。已经提交但尚未处理的订单会把相应金额放在 `frozen_balance`，管理员拒绝或用户在审核前取消后才会退回可用余额。

### 商品删除失败

为了保护历史订单外键，已有订单引用的商品不能删除。将商品设为“下架”或“隐藏”即可。

## 当前已知限制

- 第一版只实现午饭和晚饭，不包含早餐、运动、心情、抽奖、成就等预留功能。
- 照片墙采用稳定的时间流与日期筛选，暂未做完整月历视图。
- 没有自动图片压缩；客户端和 Storage 都限制 5MB。
- 没有找回密码页面；两人站点可先由 Supabase Dashboard 管理账号，之后再按需接入邮件回调。
- 只有接入真实 Supabase 项目后，才能进行端到端登录、上传和并发数据库验收；无凭据时可完成静态编译检查。
