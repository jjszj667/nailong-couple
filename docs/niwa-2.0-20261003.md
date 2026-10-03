# 奶娃 2.0 视觉与交互升级验收

日期：2026-10-03。现有 Next.js 16.3 / React 19.2 / Tailwind 4 / Supabase 项目的增量升级，没有初始化新项目。

## 审查发现

- 原色系偏灰，功能卡片与背景层级弱；已有奶娃动作与七种心情素材可以复用。
- 页面反馈多为相同入场与普通 hover，缺少统一节奏、共享元素和奖励过程。
- 不同弹窗风格分散，确认操作使用浏览器 confirm；移动端焦点和关闭过程不连贯。
- 少数页面仍有纯文字或 Emoji 空状态；日历与日报补签文案曾固定显示 +1，和实际流水可能不一致。
- 窄屏心情需要保留原有横向滑动与小屏堆叠，不能为动画挤压文字。

审查涉及前后台路由、共享组件、静态素材、Server Actions、认证、签到/钱包 RPC 调用及现有数据库权限。数据库与数据读取层保留；没有声称在线执行过全部数据库回归。

## 系统与改动位置

| 模块 | 文件 / 作用 |
| --- | --- |
| 色彩与表现系统 | `app/niwa.css`：品牌黄、奶白、杏橙、玫瑰、薄荷、清爽日历；Surface/Text/Border/Success/Warning/Error；卡片/按钮/背景/导航/移动弹层 |
| 动效基线 | `lib/motion.ts`：160/320/560/900ms，45ms 错峰、统一进入与弹性缓动；CSS 使用相同参数 |
| 页面动态环境 | `components/motion/environment.tsx`：路由场景、两层缓慢光晕、轻微鼠标视差、心情色过渡 |
| 入场与滚动 | `components/page-motion.tsx`：IntersectionObserver、首次入场分层、视口外暂停人物；MutationObserver 支持后续载入内容 |
| 页面/共享转场 | `components/motion/route-transition.tsx`、前后台 template、桌面/手机导航：React ViewTransition，前进/返回、移动选中背景 |
| 数字反馈 | `components/motion/animated-number.tsx`、`components/ui/coin.tsx`：首次可见计数、数值变动增减、尺寸占位避免数字动画挤动布局 |
| 首页滚动叙事 | `components/motion/life-story.tsx`：桌面 sticky 奶娃 + 三段自然滚动叙事；手机普通纵向内容，不劫持滚动。置于核心模块之后 |
| 签到反馈 | `components/motion/reward-feedback.tsx`、`components/ui/flash.tsx`、签到页面及 `app/actions.ts`：RPC 成功后传递奖励总额/回执，仅展示，不修改余额；准时与补签不同反馈 |
| 心情 | `components/mood-selector.tsx`：保留七种心情、方向键/Home/End、八标签限制；弹性、光晕与环境色联动 |
| 日历 | `components/motion/calendar-motion.tsx`、`components/calendar-toolbar.tsx`、日历及日期页面：月份方向转场、指示环、手机横滑、年月选择器与纪念日弹层、日期共享元素 |
| 纪念日/故事 | `components/anniversary-moment.tsx`、故事/日期页面：经过天数、特别日子主题与小型庆祝，原时间线与编辑功能保留 |
| 商店 | 商店列表/详情、`SharedVisual`、`ConfirmSubmitButton`：卡片错峰、商品图片共享过渡、兑换确认；仍是申请冻结、管理员审批，不改成即时消费 |
| 我的/钱包/订单/相册/愿望/足迹/成就/日报/更新日志 | 共享 FeatureHero、Card、Coin、EmptyState 和 PageMotion 全站覆盖；部分列表补齐空状态 |
| 后台 | 管理端 template、共享卡片/导航/加载；签到、商品、订单、愿望、足迹、成就、惊喜箱、公告、版本、钱包列表补齐或升级空状态 |
| 通用弹窗 | `components/ui/animated-dialog.tsx`、确认按钮、更新公告、日历工具栏：原生 dialog 的焦点陷阱/背景 inert，统一关闭动画；普通公告关闭仍写入数据库已读，强制公告仍不允许遮罩/Escape关闭 |
| 上传 | 单图/多图 picker 增加处理中/就绪反馈，保留原压缩、类型校验、文件字段与服务端上传 |
| 原创配套 | `components/ui/niwa-motif.tsx`：SVG 金币、爱心/星芒/轨道，与现有人物/照片组合；没有新增来源不明图片或用 Emoji 替代新设计 |
| 验收入口 | `app/design-preview/page.tsx`、`components/motion/design-lab.tsx`：仅开发模式的组件夹具，不含真实用户数据、不执行数据库写入；生产返回 404 |

未新增生产或开发 npm 依赖，没有替换 React/Next 版本。使用项目当前 Next 本地文档明确支持的 React Canary ViewTransition；不支持的浏览器保留正常导航和普通组件入场。

数据库：没有新表、迁移、RLS 或余额规则改动。认证与数据层无修改。Server Action 唯一改动是把签到 RPC 已返回的奖励总额和已有 request_id 加入成功跳转，供反馈展示；URL 不是可信余额来源，不参与任何金币写入。

## 性能与可访问性

- 视差每帧最多一次 rAF，只在精细指针下启用；触摸用 Press / 月份横滑 / 底部弹层，垂直滚动照常。
- 滚动入场使用 IntersectionObserver，无高频 scroll 布局计算；人物离开视口暂停，后台标签页暂停环境。
- 两层小光晕、少量 SVG 金币；不引入视频/WebGL/大型粒子。主要使用 transform/opacity；原素材保留。
- 指示环在日期没有变化时不重新读布局。数字动画只展示服务端值；金额结束精确到权威值。
- reduced-motion 取消飞币、3D 与大位移，保留状态文字与操作；原生弹窗支持焦点、Escape 和键盘。
- 保留原生日 7 日期限和自动恢复机制，不延长或重写生日规则。

## 验证结果

- `npm run lint`：通过，0 ESLint warning。
- `npm run typecheck`：通过。
- `npm test`：7/7，覆盖准时/补签有效性、半额与零额、缺卡扣币上限与余额不足、生日边界、数字精确终值、路由场景和动效层级。Node 的旧模块类型提示不是网页 Console 错误。
- `npm run build`：通过，前后台全部路由生成。
- `git diff --check`：通过。
- `scripts/verify-niwa.mjs`：26 个组通过。Edge Chromium 320/390/768/1440px，无全页横向溢出；导航适配、七种心情/键盘/标签上限、年月弹层/Escape、月份横滑/选择器同步、准时与补签不同反馈、确认取消/提交、单图/多图压缩、reduced-motion。
- 31 条未登录受保护路由自动检查：仍跳转登录；登录表单保留邮箱/密码校验与自动填充属性。
- 本地生产服务：`/login` 200、`/design-preview` 404，网页无 Console 错误。开发夹具不得暴露在生产。
- 截图和结构化结果保存在 `.artifacts/niwa-20261003/`（已忽略，避免把本机验收产物带入发布）。

实际发现并修复：Hero 装饰造成 320px 横向溢出；日历切月后 Picker 旧值；确认表单在弹窗关闭前触发校验；补签固定 +1 文案；故事开始当天 0 值可能被直接渲染。

重复运行：先 `npm run dev`，再设 `NIWA_PLAYWRIGHT_PATH` 为环境已有 Playwright 模块路径，执行 `node scripts/verify-niwa.mjs`。默认检查 `http://127.0.0.1:3000`，可用 `NIWA_TEST_URL` 指定本地开发服务。脚本不登录、不改生产数据。

## 不能混淆的验收边界

组件验收与登录保护通过，不等于真实账户完整 E2E：未用真实用户执行签到/补签/扣币/兑换/订单审批/纪念日保存/公告已读和跨设备持久化；没有为测试写入或清理生产数据。这些仍需在登录测试账户后回归。

没有认证真机稳定 60fps，没有对 Safari/iOS 进行真机验收；横滑自动用例验证 PointerEvent 和月份同步，不等于真实手势性能证明。较旧浏览器的共享元素动效会自然降级。

本报告是部署前验收快照，不代表线上已升级；用户随后授权上线。正式发布使用 EdgeOne 新项目 `makers-muqmitm4txtc`，不是旧项目，结果以正式域名资源核验及发布记录为准。本次上线不会自动发布版本公告。
