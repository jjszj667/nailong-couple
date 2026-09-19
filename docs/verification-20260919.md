# 每日签到与版本公告验证

先依次执行迁移 `202609190001_daily_checkin_settlement.sql`、`202609190002_release_announcements.sql`；再运行 `supabase/tests/20260919_checkin_rules.sql` 与 `supabase/tests/20260919_release_rules.sql`，应分别看到 `check-in rule assertions passed` 和 `release structure assertions passed`。旧账户从迁移当日开始计数；若迁移时已过 22:00，则从次日开始，不追溯此前日期。

## 签到（使用普通测试账号，不要用管理员账号）

1. 在 11:00–14:00 完成午间签到，在 16:00–22:00 完成晚间签到：两条 `normal`、两笔全额奖励；原有两餐完整奖励只发一次。22:00 后访问首页/签到页，`checkin_daily_results` 为 `completed`，连续缺卡 0。
2. 午间准时、晚间 22:00 后补签：两条分别为 `normal` / `makeup`，第二餐奖励为正常晚间奖励的整数一半；当日仍为 `completed`，不发两餐完整奖励。
3. 当日两餐均错过：14:00 后补午间、22:00 后补晚间。第一笔为正常餐奖励的整数一半，第二笔为 0；当日 `missed`。反过来先补晚间再补午间（用另一天）也只让第一笔获得半额。
4. 连续四天没有任何准时签到：每天 22:00 后自动结算（若启用了 pg_cron），或再次登录访问首页/签到页。`checkin_daily_results` 的 `planned_deduction` 依次为 0、3、4、5；第五天及以后始终为 5。可在数据库中只读查询：

   ```sql
   select checkin_date, status, consecutive_missed, planned_deduction, actual_deduction
   from public.checkin_daily_results where user_id = '<测试账号 UUID>'
   order by checkin_date desc limit 10;
   ```

5. 下一天任意一餐准时签到，22:00 结算后 `completed`、`consecutive_missed = 0`。下一次缺卡从第 1 天重新计数。
6. 已结算第 2、3 天后，回到签到页用“补签之前的日期”补第 2 天。该日 `status`、`consecutive_missed`、`actual_deduction` 和既有扣币流水都不变；当天首次补签仍按半额奖励。
7. 将测试余额调到 2，再进入连续缺卡第 4 天结算：`planned_deduction = 5`，`actual_deduction = 2`，余额 0；钱包只有一条 −2 流水。重复刷新首页、签到、钱包，条数和余额保持不变。
8. 同一餐重复提交/刷新时只能有一条 `checkins`；同一用户同一天只能有一条 `checkin_daily_results`，且每个扣币日最多有一笔 `missed_checkin_penalty` 流水。

历史补签只影响该日补签奖励，不回溯缺卡判定。奖励/扣币和记录都在数据库事务内。当前站点沿用“奶龙币”文案，规则中的“情侣币”指同一余额。

## 版本公告

1. 管理员在 `/admin/releases` 新建草稿；普通账号 `/releases` 不显示，首页不弹窗。
2. 发布版本 `v1`，普通账号首次进入应弹窗；普通公告点击关闭也记录已读，刷新和另一设备登录后不再弹。强制公告只能点“我知道了”。
3. 同时打开两个标签页，确认其中一个；另一页应同步关闭。重复点击确认不会出现重复已读行。
4. 发布新版本 `v2`，即使 `v1` 已读也弹出 `v2`。更新日志按 `published_at` 倒序，可展开详情。
5. 编辑已发布公告正文不会重置同版本已读状态；停用或关闭后普通用户不再看到公告或日志，管理员仍能编辑。
6. 网络断开时确认失败应保留弹窗并显示错误；恢复网络后可重试。未登录访问 `/releases` 应进入登录页。

生产环境应检查 `cron.job` 是否存在 `couple-daily-checkin-settlement`。若当前 Supabase 实例未启用 pg_cron，可在确认支持此扩展后运行 `supabase/optional/enable_daily_settlement_cron.sql`。若仍未启用，结算会在每个普通用户下一次访问首页、签到或钱包时补齐所有已结束的日期；不会重复扣币，但无法保证每天 22:05 准时入账。请确认数据库定时任务时区为 UTC。
