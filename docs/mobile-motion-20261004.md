# 手机动效与角色增强验收（2026-10-04）

## 本轮改动

在奶娃 2.0 已上线版本之上增量优化，不改数据库、登录权限、签到/补签、扣币、订单或生日到期规则。

- 新增六个独立透明背景 3D 角色：跳舞、爱心气球、雨衣、厨师、园艺、抱星星。
- 由内置图片生成工具根据现有 `features-v3.webp` 的角色身份和质感制作，原始 PNG 保留在生成目录；项目使用 `public/nailong/mobile-v4/*.webp`。
- WebP 512×512，保留 alpha；六张总计 149,272 字节。原有素材没有覆盖或删除。
- 首页和普通登录首屏优先展示跳舞奶娃；可见时六秒切换造型，可点击切换、暂停/恢复。生日周仍优先显示生日内容，改为气球角色，手机蛋糕移到侧边减少遮挡，到期仍恢复普通首页。
- 签到页头/补签反馈：厨师；钱包/准时反馈：跳舞；愿望/更新日志：气球；足迹：雨衣；成就：园艺；个人中心：抱星星。
- 小屏页头角色由旧约 90px 提升为 120px（较宽手机 138px），保留提示文案并给角色独立布局空间。
- 动作包含跳舞、浮动、左右摇摆、举碗、呼吸，以及爱心/星芒/落地影；手机不依赖 hover 或 ViewTransition。
- 手机支持页面入场、导航图标弹跳、心情呼吸与按压反馈；不劫持滚动，不触发真实业务写入。
- IntersectionObserver + 页面 visibilitychange + reduced-motion + 手动暂停决定播放；离屏、后台或减少动态效果时不轮播，清理定时器和观察器。

## 改动位置

- `components/nailong-companion.tsx`、`lib/companion-motion.ts`：造型、可见性、自动轮播和暂停。
- `app/mobile-motion.css`、根 layout：独立移动端动效层和安全布局。
- 首页、登录、生日组件、FeatureHero、HomeExplore、RewardFeedback：实际页面接入，不只是预览演示。
- `components/motion/mobile-companion-gallery.tsx`、design-preview、DesignLab：开发专用六角色验收画廊；生产入口仍关闭。
- `scripts/prepare-mobile-assets.mjs`：透明 WebP 压缩与 alpha 校验；使用项目已有 sharp，无新增依赖。
- `tests/companion-motion.test.mjs`：六素材大小、轮播循环和播放条件的全部布尔组合。
- `scripts/verify-mobile-motion.mjs`：触摸环境浏览器检查和截图。

## 验证

- lint、typecheck、build 通过；单元测试 10/10。
- 原 `verify-niwa.mjs` 的 26 组通过，包括上传、日历、确认表单、31 条登录保护路由。
- 移动端专项 15 组通过：320/390/430/768px、无 hover 自动动作、手指点击切换、暂停/恢复、六张真实素材加载、页头尺寸、自动轮播、暂停跨完整周期、运行时 reduced-motion 切换、离屏停止和登录表单保留。浏览器 errors/warnings 为空。
- 截图和结果：`.artifacts/mobile-motion-20261004/`。生成原图和本机截图不加入发布资源。
- 本地生产构建另测 390px：10 月 4 日生日页气球动效，10 月 9 日到期后的普通登录页跳舞动效，均 HTTP 200、无溢出、邮箱/密码表单保留，网页异常为空（日期仅在测试浏览器中固定，不改真实时间或业务数据）。
- 这是有触摸能力的 Chromium 模拟检查，不是真机 iOS/微信性能认证；没有使用真实账号写入生产签到、金币或订单。

## 素材提示词

内置图片生成模式，每个角色独立调用，`transparent_background=true`。
共同提示词：

> Use case: stylized-concept. Asset type: 手机情侣网站的透明背景奶龙角色插画，单独一个角色素材。Input image is an identity and rendering style reference only, not a sprite sheet target. 保持参考里奶龙的奶黄色、圆胖体型、短手短腿、大黑眼睛、柔软细腻哑光3D质感，不变成其他动物或人物。Primary request: [以下各角色要求] Composition: 一个角色居中，正面略微三分之二视角，完整身体及道具，四周至少10%透明留白，正方形，轮廓清楚，适合手机120px显示。Lighting: 柔和暖色棚拍光。Background: genuinely transparent alpha, no white or gray background, no floor, no cast shadow rectangle. Constraints: 不要拼图，不要多角色，不要文字、logo、水印。

- `dance`：喜悦的奶龙跳舞，双手张开，一只脚抬起，身体轻轻向左倾，露出开心大笑的表情；没有其他道具。
- `balloon`：奶龙一只手举着一颗桃粉色爱心气球，另一只手向观众打招呼，开心微笑，气球与绳子完整可见。
- `raincoat`：奶龙穿薄荷绿色小雨衣和小雨靴，举着奶黄色雨伞，歪头温柔微笑。没有雨滴背景。
- `chef`：奶龙戴白色柔软厨师帽，穿杏色小围裙，双手捧着有米饭和蔬菜的精致小饭碗，眨眼开心微笑。
- `gardener`：奶龙戴浅米色园艺小帽，双手抱着一盆小向日葵，露出暖暖微笑。
- `stargaze`：奶龙坐着，戴浅紫色睡帽，抱一颗金黄色小星星，眼睛有温柔的光，嘴巴轻轻微笑。

本文件是部署前验收快照；正式发布仍以 `https://jjhome.online` 的新资源核验为准。没有自动发布更新公告。
