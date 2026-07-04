# 惠选AI

面向中文用户的 AI 模型比价、优惠发现与产品导航网站，展示品牌为“惠选AI”。

项目将从现有的 AI 产品导航页逐步升级为数据驱动的 AI 消费决策平台：统一展示模型 API
价格、订阅套餐、免费额度、限时优惠、能力参数和官方来源，帮助用户比较短期优惠与长期真实成本。

> 当前仓库已采用 Astro 和结构化数据生成新版页面。模型价格、产品导航、分类详情与搜索页均读取统一数据源；迁移前 HTML 暂时保留在仓库根目录用于对照。

## 产品定位

网站不只回答“有哪些 AI 产品”，还要回答：

- 哪个模型在特定使用量下成本更低？
- API 价格、会员订阅和免费额度分别是多少？
- 当前有哪些真实有效的优惠？
- 优惠结束后，长期使用成本是多少？
- 价格和优惠来自哪里，最后一次核实是什么时候？
- 不同价格背后的能力、上下文窗口和适用场景有何差异？

目标用户包括个人用户、开发者、小团队和需要控制 AI 成本的企业用户。

## 产品原则

1. **官方来源优先**：价格和优惠尽量引用厂商官网、官方公告或官方账号。
2. **价格口径统一**：API、订阅、图像、音频和视频价格分开比较，不制造错误排名。
3. **更新时间透明**：每条价格和优惠都显示来源、采集时间与人工核实时间。
4. **先审核后发布**：自动化负责发现变化，不直接把未经确认的信息发布到线上。
5. **展示真实成本**：同时显示优惠期价格、恢复原价后的费用和长期折算成本。
6. **商业关系透明**：推广链接、返佣链接和赞助内容必须明确标注。
7. **保留导航价值**：现有 AI 产品导航继续作为产品发现入口，不因比价改版而移除。

## 核心功能

### 1. 模型价格库

- 国内、国外厂商分类
- API 输入、输出、缓存输入和批处理价格
- 上下文窗口、最大输出、模态与工具调用能力
- 免费额度、速率限制和适用地区
- 美元与人民币换算
- 官方价格来源及更新时间

### 2. 模型对比

- 选择多个模型并排比较
- 按厂商、地区、模态、能力和价格筛选
- 按统一单位排序
- 提供“低成本”“长上下文”“代码”“多模态”等场景视图
- 区分价格最低与综合推荐，避免只按单一价格下结论

### 3. 费用计算器

- 输入请求次数、输入 Tokens、输出 Tokens 和缓存比例
- 估算单次、每日和每月费用
- 同时展示美元和人民币结果
- 自动应用符合条件的免费额度或优惠
- 对比首期费用、优惠期费用和恢复原价后的长期费用

### 4. 优惠情报

- 限时折扣、赠送额度、免费试用、教育优惠、创业扶持和年度套餐
- 展示活动时间、适用人群、地区限制、领取条件与优惠码
- 状态包括待开始、进行中、即将结束、已结束和待核实
- 首页展示精选优惠，完整内容进入优惠专区
- 允许用户反馈优惠失效，但反馈需要审核

### 5. 产品导航

- 保留现有通用模型、Agent、自动化、搜索、编程和多模态产品分类
- 首页每个分类展示 6 项，其余进入分类详情页
- 支持独立搜索结果页
- 定期检查失效链接并发现新产品候选

### 6. 更新记录

- 新增模型与产品
- 模型涨价、降价和计费方式变更
- 新增、修改和结束的优惠
- 每项变更保留日期、来源和简要说明

## 信息架构

计划中的主要页面：

| 页面 | 路径建议 | 主要内容 |
| --- | --- | --- |
| 首页 | `/` | 精选比价、热门优惠、场景推荐和产品导航 |
| 订阅套餐 | `/plans/` | 面向普通用户比较免费方案、个人月费、年付折算和使用额度 |
| 模型价格 | `/models/` | 可筛选、排序的标准化价格表 |
| 模型对比 | `/compare/` | 多模型并排比较 |
| 费用计算器 | `/calculator/` | 根据使用量估算成本 |
| 优惠专区 | `/deals/` | 当前优惠、即将结束和历史优惠 |
| 模型详情 | `/models/[slug]/` | 价格、能力、来源和价格历史 |
| 产品分类 | `/directory/[category]/` | 分类导航列表 |
| 搜索 | `/search/` | 集中展示搜索结果 |
| 更新记录 | `/updates/` | 价格与优惠变更记录 |
| 数据说明 | `/methodology/` | 价格口径、汇率和推荐规则 |
| 隐私说明 | `/privacy/` | 本地关注数据、第三方链接和投稿的数据边界 |

## 数据口径

### API 价格

- 文本模型统一换算为“每百万 Tokens”。
- 输入、输出、缓存输入和批处理分别存储。
- 图片、音频和视频模型使用各自单位，不与文本 Token 价格直接排名。
- 厂商未公开或需要商务询价的价格标记为 `contact_sales`，不填写猜测值。

### 订阅价格

- 首页与套餐页优先展示“每月多少钱、额度怎么给、适合谁”，API Token 单价放在开发者入口。
- 月付、年付、首月优惠和连续订阅分别存储。
- 标明税费是否包含、地区限制和套餐权益。
- 年付套餐同时展示总价与月均价格。
- 厂商未承诺固定 Token 数时，按官方口径标记为动态额度，不推算或虚构具体数量。
- 套餐页按国外产品与国内产品分区；美元和人民币保留原币种，不混合生成最低价排名。

### 汇率

- 原始价格始终保留原币种。
- 人民币价格仅作为估算值，页面显示汇率来源和更新时间。
- 历史记录保留当时原始价格，不因汇率变化改写厂商历史定价。

### 优惠

优惠记录至少包含：

```json
{
  "id": "provider-product-2026-summer",
  "providerId": "provider",
  "productId": "product",
  "title": "活动标题",
  "type": "discount",
  "status": "active",
  "originalPrice": 20,
  "dealPrice": 10,
  "currency": "USD",
  "startsAt": "2026-06-01T00:00:00Z",
  "endsAt": "2026-06-30T23:59:59Z",
  "eligibility": "仅限新用户",
  "sourceUrl": "https://example.com/official-deal",
  "discoveredAt": "2026-06-02T08:00:00Z",
  "verifiedAt": "2026-06-02T10:00:00Z"
}
```

优惠过期后从活动列表撤下，但保留在历史记录中。

## 推荐与优惠评分

推荐不能由厂商付费决定。第一版采用透明的规则评分，并允许编辑人工调整：

| 因素 | 建议权重 |
| --- | ---: |
| 优惠力度 | 35% |
| 厂商与产品可信度 | 20% |
| 适用范围 | 15% |
| 有效期限 | 10% |
| 领取难度 | 10% |
| 来源可信度 | 10% |

评分只用于排序辅助。页面需要同时展示限制条件，避免用“最高优惠”掩盖新用户、地区或最低消费限制。

## 技术选型

### 前端与构建

- **Astro**：静态站点生成、页面路由、组件化和良好的 SEO。
- **TypeScript**：约束价格、套餐、优惠和产品数据结构。
- **原生 CSS + CSS 变量**：迁移并延续现有视觉风格，不引入重量级 UI 框架。
- **Zod**：构建时校验内容数据，阻止缺少来源或价格单位的数据进入生产页面。
- **Chart.js**：仅用于价格历史等确实需要图表的页面，并按需加载。

选择 Astro 的原因是本项目以内容和结构化数据展示为主，不需要将整个网站变成客户端单页应用。大部分页面可以预先生成，加载快、部署简单，也便于搜索引擎收录。

### 数据存储

第一阶段使用仓库内的 JSON 数据：

```text
src/data/
├── providers.json
├── models.json
├── prices.json
├── plans.json
├── deals.json
└── exchange-rates.json
```

数据由 TypeScript 类型和 Zod Schema 共同校验。价格变化采用追加历史记录的方式保存，不覆盖旧数据。

暂不在第一阶段引入数据库。出现以下需求时，再迁移到 PostgreSQL：

- 用户注册、收藏或订阅提醒
- 多人在线审核与权限管理
- 大量历史价格查询
- 用户投稿和审核队列明显增长
- 需要对外提供 API

### 自动化脚本

- **Node.js 20+**
- 使用原生 `fetch` 获取官方页面、RSS 和开放 API
- 页面结构复杂时使用 **Playwright** 进行受控采集
- GitHub Actions 定时执行发现、校验和构建任务
- 自动化只生成候选数据、Issue 或 Pull Request，不直接发布
- 价格与套餐监测器直接从 `prices.json`、`plans.json` 聚合官方来源，
  每日对比页面快照，只把发生变化、访问异常和长期未人工复核的记录交给人工审核

### 部署

首选流程：

```text
提交数据或代码
  -> GitHub Actions 校验与构建
  -> 人工审核
  -> 合并到 main
  -> Cloudflare Pages 自动构建
  -> Cloudflare CDN 提供静态文件与 HTTPS
```

生产环境首选 Cloudflare Pages，并通过 GitHub 集成监听 `main` 分支。构建命令为 `npm run build`，
输出目录为 `dist`。Pull Request 使用 Pages 预览部署，合并到 `main` 后才更新正式网站。
构建产物是纯静态文件，后续仍可迁移到境外 VPS、GitHub Pages 或对象存储 CDN。

当前生产地址：`https://huixuanai.com`

## 数据更新流程

```text
官方价格页 / 官方博客 / RSS / GitHub Release
                    |
                    v
              定时发现脚本
                    |
                    v
        页面变化与优惠候选报告
                    |
                    v
             人工核实官方来源
                    |
                    v
          修改结构化数据并提交 PR
                    |
                    v
          Schema 校验、测试与构建
                    |
                    v
                合并发布
```

建议频率：

- 优惠与价格页面：每天检查 1 次
- 价格与套餐监测报告：每天查看变化项，首次运行只建立基线
- 即将到期优惠：每天更新状态
- 产品发现：每周运行 1 次
- 全站链接检查：每周运行 1 次
- 人工复核主流厂商价格：每月至少 1 次

页面变化不等于价格变化。自动脚本应保存变化摘要和来源链接，由人工判断是否值得更新。

统一价格与套餐监测命令：

```bash
npm run monitor:market
```

该命令自动覆盖 `prices.json` 和 `plans.json` 中全部不重复的官方来源页面。报告写入
`reports/market-monitor-YYYY-MM-DD.md`，快照写入
`reports/market-snapshots.json`。GitHub Actions 使用缓存保存跨天快照，并上传报告附件；
这两个本地生成文件不提交到仓库。首次运行显示“首次建立快照”，从第二次运行开始报告
真实页面变化。审核人员只需要打开报告中的变化项，不需要逐个访问全部厂商。

## 质量与可信度要求

- 每条价格必须包含币种、计价单位、适用模型、来源和核实时间。
- 每条优惠必须包含官方来源、开始时间、结束时间或“结束时间未知”。
- 不允许将第三方转述作为唯一的高可信来源。
- 401、403 和 429 不直接判定为链接失效，应进入人工检查。
- 国内模型只收录无需登录即可核实具体价格的官方页面；登录后可见或仅商务询价的模型暂不进入公开比价表。
- 404 和 410 连续出现后再标记失效，减少临时故障造成的误报。
- 所有推荐、推广和返佣关系必须清楚标注。
- 构建失败时不得部署旧数据与新页面混合的版本。
- 面向普通用户的文案应优先使用通俗语言；必须保留的专业术语采用“通俗说法（专业术语）”格式，并在首次出现处简短解释。
- 价格字段优先写明实际含义，例如“发送内容”“生成内容”“重复内容优惠价”，不能只显示“输入”“输出”“缓存”等行业简称。

## 开发路线图

### Phase 0：现有导航站

- [x] 国内外 AI 产品分类导航
- [x] 首页分类摘要与分类详情页
- [x] 独立搜索结果页
- [x] 链接检查脚本
- [x] 新 AI 产品候选发现脚本
- [x] 将重复的 HTML 数据迁移为统一数据源

### Phase 1：模型比价 MVP（已完成）

- [x] 初始化 Astro 与 TypeScript
- [x] 迁移现有视觉样式
- [x] 迁移现有导航数据
- [x] 建立 provider、model 和 price Schema
- [x] 建立 plan Schema
- [x] 实现个人订阅套餐对比页
- [x] 将个人套餐设为首页主要价格入口，API 价格作为开发者入口
- [x] 收录 47 个主流模型
- [x] 收录 19 个国内模型，其中 17 个采用人民币 API 价格
- [x] 实现基础价格表和价格排序
- [x] 实现筛选和模型详情页
- [x] 实现基础费用计算器
- [x] 展示官方来源与更新时间

### Phase 2：优惠发现（已完成）

- [x] 建立 deal Schema 和优惠专区
- [x] 建立首批官方活动监测源
- [x] 自动识别页面变更、临近结束和过期候选
- [x] 生成人工审核报告
- [x] 实现优惠状态、到期撤下与历史记录
- [x] 在费用计算器中识别并应用可计算的有效优惠

### Phase 3：价格历史与推荐（已完成）

- [x] 保存价格变更历史
- [x] 展示价格趋势图和变更日志
- [x] 建立场景化推荐与透明评分
- [x] 增加汇率定时更新
- [x] 增加用户失效反馈入口

### Phase 4：用户服务（已完成）

- [x] 提供 Atom 订阅与可选 Webhook 优惠提醒
- [x] 提供优惠与价格更新 JSON 订阅源
- [x] 在浏览器本地关注模型和设置价格阈值
- [x] 使用 GitHub Issues 建立用户投稿与审核队列
- [x] 根据实际规模评估 PostgreSQL 与服务端 API

### Phase 4 服务端评估

当前仍不引入 PostgreSQL。关注列表和阈值保存在用户浏览器，投稿进入 GitHub Issues，
公开订阅通过静态 JSON Feed 提供，因此无需维护用户账号或存储个人信息。

出现以下任一需求时，再引入服务端 API 与 PostgreSQL：

- 跨设备同步关注列表和提醒设置
- 邮件、Webhook 或消息渠道主动推送
- 用户登录、退订、频率控制和通知偏好
- 大量用户投稿、多人审核和权限管理
- 需要保存通知发送记录、失败重试和审计日志

服务端上线前必须补充隐私政策、退订机制、发送频率限制和敏感信息保护。

### 通知配置

公开订阅源：

```text
/feeds/deals.xml
/feeds/updates.xml
/feeds/deals.json
/feeds/updates.json
```

如需在优惠页面变化、活动临期或监测异常时接收 Webhook，在 GitHub 仓库
`Settings -> Secrets and variables -> Actions` 中添加：

```text
DEAL_WEBHOOK_URL=https://example.com/your-webhook
```

Webhook 必须使用 HTTPS。每日巡检只发送监测摘要和报告摘录，不发送 Cookie、账号或密钥。
未配置该 Secret 时，工作流会跳过通知并继续生成审核报告。

## 当前项目结构

```text
.
├── src/
│   ├── components/
│   │   └── PriceTable.astro
│   ├── data/
│   │   ├── directory-categories.json
│   │   ├── directory-items.json
│   │   ├── deal-sources.json
│   │   ├── deals.json
│   │   ├── exchange-rates.json
│   │   ├── models.json
│   │   ├── plans.json
│   │   ├── price-history.json
│   │   ├── prices.json
│   │   └── providers.json
│   ├── layouts/
│   ├── lib/
│   ├── pages/
│   │   ├── calculator/
│   │   ├── deals/
│   │   ├── directory/
│   │   ├── models/
│   │   │   ├── [slug].astro
│   │   │   └── index.astro
│   │   ├── recommendations/
│   │   ├── submit/
│   │   ├── updates/
│   │   ├── watchlist/
│   │   ├── search.astro
│   │   └── index.astro
│   └── styles/
├── index.html
├── section.html
├── search.html
├── tools/
│   ├── check-links.mjs
│   ├── discover-ai.mjs
│   ├── discover-deals.mjs
│   ├── seed-price-history.mjs
│   └── update-exchange-rate.mjs
├── reports/
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── README.md
```

仓库根目录的三个 HTML 文件属于迁移前版本，新版运行时不再依赖它们，后续确认无需回退后移除。

## 本地开发

需要 Node.js 20 或更高版本：

```bash
npm install
npm run dev
```

浏览器访问：

```text
http://localhost:4321/
```

构建和预览生产版本：

```bash
npm run build
npm run preview
```

## 自动化命令

需要 Node.js 20 或更高版本，并确保命令在项目根目录执行：

```bash
cd /Users/zengjun/Desktop/sites_hub
npm run check:links
npm run discover:ai
npm run discover:deals
npm run notify:deals
npm run seed:price-history
npm run update:rates
npm run migrate:directory
```

生成的报告：

```text
reports/link-check.md
reports/link-check.json
reports/new-ai-candidates.md
reports/new-ai-candidates.json
reports/new-ai-shortlist.md
reports/new-ai-shortlist.json
reports/ai-deals-YYYY-MM-DD.md
reports/deal-snapshots.json
```

可选环境变量：

| 变量 | 用途 |
| --- | --- |
| `LINK_CHECK_TIMEOUT_MS` | 链接检查超时时间 |
| `LINK_CHECK_CONCURRENCY` | 链接检查并发数 |
| `AI_DISCOVERY_TIMEOUT_MS` | 候选发现请求超时时间 |
| `AI_DISCOVERY_CONCURRENCY` | 候选发现并发数 |
| `AI_DISCOVERY_LIMIT` | 每个来源最多采集数量 |
| `AI_DISCOVERY_DAYS` | 候选时间范围 |
| `DEAL_DISCOVERY_TIMEOUT_MS` | 官方优惠页面请求超时时间 |

`npm run discover:deals` 会读取 `deal-sources.json`，比较官方页面指纹并生成审核报告。它只提示页面变化、临近结束和已过期记录，不会自动修改 `deals.json` 或发布未经审核的优惠。

价格核实后先更新 `prices.json` 与 `verifiedAt`，再运行 `npm run seed:price-history`。脚本会追加快照并判断上涨、下降、混合调整或复核无变化，不覆盖历史。`npm run update:rates` 从欧洲央行官方 API 获取 EUR/USD 与 EUR/CNY，并折算 USD/CNY 参考汇率。

`npm run migrate:directory` 只用于迁移期：它从旧版 `index.html` 解析导航卡片并重新生成
`directory-categories.json` 和 `directory-items.json`。完成旧页面下线后，新产品应直接维护结构化数据，不再运行迁移命令覆盖数据。

## 贡献与数据修正

提交价格或优惠更新时，需要同时提供：

1. 厂商、产品或模型名称
2. 原始币种和计价单位
3. 官方来源链接
4. 页面显示的生效时间或活动期限
5. 核实日期
6. 地区、新老用户、支付方式等限制

缺少官方来源或无法核实的内容进入候选区，不直接发布。

## 版权

Copyright © 倚栏听雨。网站收录的产品名称、商标和服务标识归各自权利人所有。
