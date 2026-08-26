# Waffo 支付接入指南（Timeline Visualizer）

用户**免费预览和创建 MP4**，**下载和分享**需支付 **$2.59 USD**（结账时可能加收当地税）。支付由 [Waffo Pancake](https://docs.waffo.ai/) 处理。

代码已集成完毕，按以下步骤在 Waffo 与 Vercel 中配置即可上线。

---

## 阶段 1：Waffo Dashboard

1. 登录 [Waffo Merchant Dashboard](https://pancake.waffo.ai/merchant/auth/signin)
2. **创建 Store**（若还没有）
3. **创建一次性商品**：
   - 类型：One-time / Digital goods
   - 价格：**USD $2.59**
   - 记下 `PROD_xxx` 商品 ID
4. **Webhook**（Settings → Webhooks）：
   - Test URL：`https://www.timelinevisualizer.app/api/webhooks/waffo`
   - Production URL：同上（上线后使用）
   - 格式：**Raw**（需验签）
   - 订阅事件：`order.completed`
5. **合规**（通过 KYB 审核前只能 Test 模式收款）：
   - 网站首页可见定价（已更新为「免费预览 · $2.59 下载」）
   - [privacy.html](../web/privacy.html) 可访问
   - Terms of Service 页面（可用 [Waffo 模板](https://docs.waffo.ai/mor/account-reviews/tos.md)）
   - 支持邮箱与 Dashboard 一致
6. Sandbox 测试卡：`4576 7500 0000 0110`（成功）

---

## 阶段 2：Vercel 环境变量

在 Vercel Project → Settings → Environment Variables 配置：

### 前端构建（Production + Preview 按需）

| 变量 | 值 | 说明 |
|------|-----|------|
| `VITE_PAYMENT_ENABLED` | `true` | 开启下载/分享付费门禁 |

未设置或为 `false` 时，下载免费（本地开发默认）。

### 服务端 API（勿加 `VITE_` 前缀）

| 变量 | 说明 |
|------|------|
| `WAFFO_MERCHANT_ID` | `MER_xxx` |
| `WAFFO_PRIVATE_KEY` | RSA 私钥 PEM（`\n` 换行可写在引号内） |
| `WAFFO_PRODUCT_ID` | `PROD_xxx` |
| `SITE_ORIGIN` | `https://www.timelinevisualizer.app` |
| `KV_REST_API_URL` | Vercel KV / Upstash Redis URL（**生产环境推荐**） |
| `KV_REST_API_TOKEN` | 对应 Token |

可选（**仅本地/Preview，切勿用于 Production**）：

| 变量 | 说明 |
|------|------|
| `PAYMENT_BYPASS=true` | 跳过支付验证，便于无 Waffo 密钥时联调 UI |

完整列表见仓库根目录 [`.env.example`](../.env.example)。

---

## 阶段 3：Vercel KV（推荐）

Webhook 收到 `order.completed` 后，将 `sessionId` 写入 KV，前端轮询 `/api/payment/status` 解锁下载。

1. Vercel Dashboard → Storage → 创建 **KV** 或 **Upstash Redis** 集成
2. 绑定到本项目，自动注入 `KV_REST_API_URL` / `KV_REST_API_TOKEN`
3. 未配置 KV 时，API 使用**进程内内存**暂存（Serverless 冷启动会丢失，**不适合生产**）

---

## 阶段 4：部署与验证

1. 推送代码到 GitHub，Vercel 自动构建部署
2. **Test 模式**完整流程：
   - 上传 Timeline → 创建 MP4 → 点击「Unlock download · $2.59」
   - 弹窗完成 Waffo 结账 → 主页面自动解锁 → 下载 / 分享
3. Dashboard 确认 Webhook 收到 `order.completed`
4. KYB 通过后切换 **Production** 环境密钥与 Webhook

---

## API 路由

| 路径 | 方法 | 作用 |
|------|------|------|
| `/api/checkout/create` | POST | 创建 Waffo checkout session |
| `/api/payment/status` | GET | 查询 `sessionId` 是否已支付 |
| `/api/webhooks/waffo` | POST | Waffo 支付成功回调 |

---

## 本地开发

```powershell
# 终端 1：前端（支付 UI 默认关闭，除非设置 VITE_PAYMENT_ENABLED=true）
cd web
pnpm dev

# 终端 2：Vercel 本地 API（需安装 vercel CLI）
vercel dev
```

Webhook 本地调试可用 [ngrok](https://ngrok.com) 暴露 `/api/webhooks/waffo`，详见 [Waffo Webhook 文档](https://docs.waffo.ai/guides/webhooks.md)。

---

## 常见问题

**Q：用户付完钱但按钮没解锁？**  
检查 Webhook 是否 200、KV 是否已绑定、浏览器是否拦截弹窗（会改为整页跳转，返回后 `resumePaymentFromReturn` 会继续轮询）。

**Q：定价显示 $2.59 但结账金额不同？**  
Waffo 可能加收税；商品价格在 Dashboard 与 `WAFFO_PRODUCT_ID` 必须一致。

**Q：能否绕过支付直接下载？**  
视频在浏览器本地生成，技术用户可通过开发者工具获取 blob——这是客户端数字商品的常见限制；付费门禁面向绝大多数正常用户。
