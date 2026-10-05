# ⚙ CF-SUBS

**CF-SUBS** 是一个面向 Cloudflare Workers / Pages 的多节点、订阅聚合与订阅链接管理工具。

项目以「**聚合节点（SUB）**」和「**订阅链接（URL）**」为核心，将多个机场订阅、自建节点统一整理到可复用的聚合配置中，再通过独立的订阅链接对外提供服务。

当前版本进一步完善了可视化管理后台、订阅链接管理、客户端格式自适应、节点屏蔽、主页伪装、安全登录以及实时前端状态更新。

---

## ✨ 功能一览

| 功能 | 简单说明 |
|---|---|
| 聚合节点（SUB） | 添加机场订阅或单个节点，可组合复用 |
| 订阅链接（URL） | 选择 SUB 生成公开链接，可设置名称和路径 |
| 格式转换 | 自适应、Base64、Clash、Sing-box、Surge、Loon |
| 节点屏蔽 | 填写关键词，自动排除匹配节点 |
| 网页管理 | 在后台管理订阅、转换配置和网站设置 |
| 安全与外观 | 管理员登录、主页自定义、深色模式 |

### 工作流程

```text
添加订阅 / 节点
       ↓
整理到 SUB
       ↓
选择 SUB，创建 URL
       ↓
复制链接或二维码，导入客户端
```

> 一个 SUB 可以被多个 URL 复用；一个 URL 也可以组合多个 SUB。

### 支持的订阅格式

| 格式 | 链接示例 | 常见客户端 |
|---|---|---|
| 自适应 | `/my-sub` | 自动识别格式的客户端 |
| Base64 | `/my-sub?b64` | v2rayN、v2rayNG |
| Clash | `/my-sub?clash` | Clash、Mihomo |
| Sing-box | `/my-sub?sb` | Sing-box、NekoBox |
| Surge | `/my-sub?surge` | Surge |
| Loon | `/my-sub?loon` | Loon |

一般直接使用自适应链接即可。

---

## 📦 部署与配置

### 部署流程

```text
Fork 项目 → 创建 KV → 部署项目 → 绑定 KV → 打开 /admin
```

### 选择部署方式

| Pages（连接 GitHub） | Workers（粘贴代码） |
|---|---|
| 1. Fork 本项目仓库。<br>2. 在 Cloudflare Pages 创建项目并连接 Fork 的仓库。<br>3. 构建命令留空，输出目录填写 `.`。 | 1. 在 Cloudflare Workers 创建 Worker。<br>2. 复制项目 `_worker.js` 全部内容并部署。 |

### 绑定 KV

先在 Cloudflare 创建一个 KV Namespace，再按部署方式添加绑定：

| Pages | Workers |
|---|---|
| **Settings → Functions → KV Namespace Bindings** | **Settings → Bindings → KV Namespace** |

绑定变量名填写 **`KV`**，并选择刚创建的 KV Namespace。Namespace 名称可自定义。

部署完成后，打开 `https://你的域名/admin` 进入后台。无需设置环境变量。

---

## 🌐 域名设置

| 部署方式 | 默认域名 | 自定义域名 |
|---|---|---|
| Pages | `项目名.pages.dev` | Pages → **Custom Domains** |
| Workers | `项目名.workers.dev` | Workers → **Custom Domains** |

可先用默认域名访问，之后再绑定自己的域名。

---

## 🖥️ 网页后台配置

不确定怎么设置时，先保留默认值。常用项目如下：

| 项目 | 用来做什么 | 怎么填写 |
|---|---|---|
| 站点名称（SUBNAME） | 网站和订阅显示的名称 | 例如 `CF-SUBS` |
| SUB | 存放订阅地址或单个节点 | 先建一个 SUB，再添加来源 |
| URL | 生成给客户端使用的订阅链接 | 选择要包含的 SUB |
| SUBAPI / SUBCONFIG | 转换订阅格式、应用规则 | 新手先用默认配置 |
| NOADS | 排除包含关键词的节点 | 每行一个关键词，如 `YouTube`、`t.me` |
| 更新时间 | 提示客户端多久更新一次 | 默认开启，60 分钟；可按需调整 |
| 主页设置 | 设置根域名访问时显示的内容 | 可先保留默认值 |
| 管理员安全 | 保护后台登录 | 设置自己的用户名和密码 |

**记住：SUB 放来源，URL 给客户端使用。**

---

## 🔗 订阅地址示例

假设域名为 `sub.example.com`，链接路径为 `japan`：

| 客户端格式 | 订阅地址 |
|---|---|
| 自适应 | `https://sub.example.com/japan` |
| Base64 | `https://sub.example.com/japan?b64` |
| Clash | `https://sub.example.com/japan?clash` |
| Sing-box | `https://sub.example.com/japan?sb` |
| Surge | `https://sub.example.com/japan?surge` |
| Loon | `https://sub.example.com/japan?loon` |

---

## 🔄 数据结构

项目使用一个 KV Namespace 保存配置。一般无需手动修改：

| 数据 | 用途 |
|---|---|
| `CONFIG.json` | 全局设置 |
| `SUB:<id>` | 订阅来源和节点 |
| `URL:<path>` | 对外使用的订阅链接 |

更新时间设置示例：

```json
{
  "ID": "示例ID",
  "NAME": "日本",
  "SOURCES": ["https://example.com/sub"],
  "UPDATE": 60,
  "UPDATE_ENABLE": true
}
```

`UPDATE` 单位是分钟。关闭 `UPDATE_ENABLE` 后，不会向客户端发送自动更新时间提示。

---

## ⚠️ 注意事项

| 提醒 | 说明 |
|---|---|
| KV 绑定 | 必须绑定一个 KV Namespace，变量名填写 `KV`；无需配置环境变量 |
| 修改绑定 | 修改后重新部署 |
| 管理员密码 | 请妥善保管 |
| 管理员路径 | 修改后使用新路径登录 |
| 订阅隐私 | 订阅链接可公开访问，名称和节点备注不要填写敏感信息 |
| 数据同步 | Cloudflare KV 跨区域同步可能有短暂延迟 |

---
## ⭐ 支持项目

如果 CF-SUBS 对你有帮助，欢迎给项目点一个 Star。

欢迎提交 Issue、功能建议以及 Bug 反馈。
