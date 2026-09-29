# ⚙ CF-SUBS

**CF-SUBS** 是一个面向 Cloudflare Workers / Pages 的多节点、订阅聚合与订阅链接管理工具。

项目以「**聚合节点（SUB）**」和「**订阅链接（URL）**」为核心，将多个机场订阅、自建节点统一整理到可复用的聚合配置中，再通过独立的订阅链接对外提供服务。

当前版本进一步完善了可视化管理后台、订阅链接管理、客户端格式自适应、节点屏蔽、主页伪装、安全登录以及实时前端状态更新。

---

## ✨ 核心特性

### 1. 多 SUB 聚合管理

支持创建多个独立的 **聚合节点（SUB）**。

每个 SUB 可以包含：

- 机场订阅 URL
- VLESS / VMess / Trojan 等自建节点
- 多个订阅地址与多个自建节点混合使用

SUB 本身只负责保存和组织节点来源，**不会直接生成公开订阅链接**。

一个 SUB 可以被多个订阅链接使用，一个订阅链接也可以同时绑定多个 SUB。

---

### 2. 独立订阅链接管理

订阅链接与 SUB 完全分离。

创建订阅链接时，可以选择一个或多个 SUB。

支持：

- 自定义订阅链接路径
- 留空自动生成随机路径
- 类 SURL 风格的随机 6 位路径
- 修改订阅链接路径
- 修改订阅链接名称
- 修改绑定的 SUB
- 删除订阅链接
- 一个订阅链接绑定多个 SUB
- 一个 SUB 被多个订阅链接复用

例如：

```text
https://example.com/my-sub
https://example.com/ABC123
```

修改或删除后，管理后台会直接更新当前页面状态，**无需手动刷新网页**。

---

### 3. 多客户端格式自适应

系统会根据客户端 User-Agent 自动识别订阅格式。

支持：

| 订阅格式 | 参数示例 | 适用客户端 |
|------|------|------|
| **智能自适应** | `/my-sub` | 所有主流客户端 |
| **Base64** | `/my-sub?b64` | v2rayN、v2rayNG 等 |
| **Clash** | `/my-sub?clash` | Clash、Clash Meta、Mihomo 等 |
| **Sing-box** | `/my-sub?sb` | Sing-box、NekoBox 等 |
| **Surge** | `/my-sub?surge` | Surge |
| **Loon** | `/my-sub?loon` | Loon |

通常情况下，只需要把普通订阅链接直接添加到客户端即可。

---

### 4. 节点屏蔽（NOADS）

支持在后台配置需要屏蔽的关键字。

系统会在节点输出前自动过滤名称中包含指定关键字的节点。

支持：

- 英文逗号
- 空格
- 换行

例如：

```text
加入TG群
YouTube
https://t.me
```

---

### 5. SUBAPI / SUBCONFIG

系统保留订阅格式转换能力。

#### SUBAPI

用于将聚合后的通用订阅转换为 Clash、Sing-box、Surge、Loon 等客户端格式。

后台支持：

- 查看当前 SUBAPI 状态
- 修改 SUBAPI
- 连通性检测
- 自定义 SUBAPI
- 自定义配置无效时自动使用默认配置

默认 SUBAPI：

```text
SUBAPI.cmliussss.net
```

#### SUBCONFIG

用于订阅转换时的分流规则、测速分组等配置。

当前默认配置：

```text
https://raw.githubusercontent.com/hooleeas/ACL4SSR/refs/heads/master/Clash/config/China_Direct_Overseas_Proxy.ini
```

后台可以直接修改，并实时检测配置是否有效。

---

### 6. 访客订阅页面

订阅链接对应的公开页面只提供**订阅地址**相关功能。

访客页面包括：

- 智能自适应订阅地址
- Base64 订阅地址
- Clash 订阅地址
- Sing-box 订阅地址
- Surge 订阅地址
- Loon 订阅地址
- 一键复制
- 二维码

访客页面不提供管理配置入口，也不会展示后台管理功能。

---

### 7. 可视化管理后台

绑定 KV 后，可以直接通过网页后台管理整个项目。

后台支持：

- 聚合节点（SUB）管理
- 订阅链接（URL）管理
- SUBNAME
- SUBAPI
- SUBCONFIG
- 节点屏蔽（NOADS）
- 主页设置
- 安全设置
- 管理员账号密码
- 管理员入口路径

所有主要配置都可以通过可视化界面完成，不需要频繁修改代码。

---

### 8. 实时前端状态更新

创建、编辑、删除 SUB 和订阅链接后，前端会直接更新当前页面的数据。

不会因为 Cloudflare KV 的最终一致性而要求用户反复刷新网页。

例如：

```text
创建 SUB
↓
保存成功
↓
立即显示新的 SUB
```

以及：

```text
编辑订阅链接
↓
保存成功
↓
立即更新当前订阅链接
```

删除同样会立即从当前页面移除。

---

### 9. 深色模式

管理后台和订阅页面支持系统深色模式。

SUB、订阅链接、来源列表、标签以及编辑界面均针对深色模式进行了适配。

---

### 10. 主页伪装与防探测

直接访问根域名或者无效路径时，可以根据后台配置显示不同的主页内容。

支持：

- 默认 NGINX 页面
- URL 反向代理
- URL 302 重定向
- 自定义 HTML

可以使用普通网页作为项目主页，避免直接暴露订阅服务入口。

---

### 11. 管理员安全登录

管理后台使用独立的管理员登录机制。

支持：

- 用户名
- 密码
- 管理员入口路径
- Cookie 会话
- 一键退出
- 修改管理员入口路径后立即生效

管理员入口默认：

```text
/admin
```

可以在后台安全设置中修改。

---

## 📦 部署与配置

本项目支持 **Cloudflare Pages** 和 **Cloudflare Workers** 部署。

整体部署流程与之前版本基本一致。

### 方式一：Pages 部署

1. 将项目部署到 GitHub。
2. 在 Cloudflare Pages 中连接 GitHub 仓库。
3. 使用项目中的 `_worker.js` 作为 Pages Functions Worker。
4. 绑定 Cloudflare KV。
5. KV 绑定名称必须严格使用：

```text
KV
```

6. 完成部署后访问管理员入口。

### 方式二：Workers 部署

1. 创建 Cloudflare Worker。
2. 将 `_worker.js` 的完整代码复制到 Worker。
3. 部署 Worker。
4. 在 Worker 的设置中绑定 Cloudflare KV。
5. KV 绑定名称必须严格使用：

```text
KV
```

6. 部署完成后访问管理员入口。

---

## 🔐 环境变量

### 当前版本没有必填环境变量

与旧版本不同，当前版本**不再要求配置 `TOKEN` 环境变量**。

Cloudflare 的：

```text
环境变量 / Variables
```

可以保持为空。

管理员入口路径、管理员账号密码以及其他主要配置均可以在网页后台完成。

---

## 🗄️ KV 配置

项目只需要使用一个 Cloudflare KV Namespace。

### KV Binding

绑定名称必须严格填写：

```text
KV
```

例如：

```text
变量名称：KV
KV Namespace：你创建的任意 KV Namespace
```

KV Namespace 的实际名称可以自定义，但 Worker / Pages 中的 **Binding Name 必须是 `KV`**。

KV 用于保存：

- 项目配置
- SUB
- 订阅链接
- 管理员配置
- 主页设置
- 安全设置

---

## 🌐 域名设置

### Pages

可以直接使用 Cloudflare Pages 提供的：

```text
xxx.pages.dev
```

也可以在 Cloudflare Pages 的 **Custom Domains** 中绑定自己的域名。

### Workers

可以使用：

```text
xxx.workers.dev
```

也可以通过 Cloudflare 的自定义域名功能绑定自己的域名。

推荐使用自己的域名作为最终订阅域名。

---

## 🖥️ 网页后台配置

首次进入管理员后台后，可以根据需要完成以下配置。

### SUBNAME

用于设置：

- 网站名称
- 订阅名称
- 客户端订阅显示名称

例如：

```text
CF-SUBS
```

---

### SUB

**聚合节点（SUB）**。

例如：

```text
日本
美国
自建节点
机场订阅
```

一个 SUB 可以保存多个订阅地址和自建节点。

---

### URL

**订阅链接（URL）**。

例如：

```text
日本主订阅
美国订阅
全节点订阅
```

创建 URL 时选择需要绑定的 SUB。

---

### SUBAPI

订阅转换后端。

默认：

```text
SUBAPI.cmliussss.net
```

如果不需要自定义 SUBAPI，可以保持默认配置。

---

### SUBCONFIG

订阅转换规则。

默认：

```text
https://raw.githubusercontent.com/hooleeas/ACL4SSR/refs/heads/master/Clash/config/China_Direct_Overseas_Proxy.ini
```

---

### NOADS

节点屏蔽关键字。

例如：

```text
TG群
YouTube
t.me
```

---

### 主页设置

可以选择：

```text
默认 NGINX
URL 反向代理
URL302
自定义 HTML
```

用于处理根域名和无效访问路径。

---

### 安全设置

可以设置：

```text
管理员用户名
管理员密码
管理员入口路径
```

管理员入口默认：

```text
/admin
```

例如修改为：

```text
/control
```

那么后台入口就是：

```text
https://你的域名/control
```

---

## 🔗 订阅地址示例

假设你的域名：

```text
sub.example.com
```

创建了一个名为：

```text
Japan
```

的订阅链接，路径为：

```text
japan
```

那么：

### 智能自适应

```text
https://sub.example.com/japan
```

### Base64

```text
https://sub.example.com/japan?b64
```

### Clash

```text
https://sub.example.com/japan?clash
```

### Sing-box

```text
https://sub.example.com/japan?sb
```

### Surge

```text
https://sub.example.com/japan?surge
```

### Loon

```text
https://sub.example.com/japan?loon
```

---

## 🔄 数据结构

项目使用一个 KV Namespace，通过不同 Key 保存不同类型的数据。

主要结构：

```text
CONFIG.json
SUB:<id>
URL:<path>
```

其中：

```text
CONFIG.json
```

用于保存全局配置。

```text
SUB:<id>
```

用于保存聚合节点配置。

```text
URL:<path>
```

用于保存公开订阅链接配置。

这种结构允许：

```text
一个 SUB → 多个订阅链接

一个订阅链接 → 多个 SUB
```

从而实现灵活的多订阅组合。

---

## ⚠️ 注意事项

- 当前版本**没有必填环境变量**。
- Cloudflare KV Binding 名称必须为 `KV`。
- 如果需要网页后台保存 SUB、订阅链接和配置，必须正确绑定 KV。
- 修改 KV Binding 后需要重新部署，使绑定配置生效。
- 请妥善保管管理员账号密码。
- 管理员入口路径修改后，旧入口将不再作为后台入口。
- 订阅链接属于公开访问地址，请不要在订阅链接名称或节点备注中放置敏感信息。
- Cloudflare KV 存在最终一致性，后台已经针对创建、编辑、删除操作进行了前端实时状态更新，但不同 Cloudflare 节点之间的数据同步仍可能存在短暂延迟。

---

## 📌 项目定位

CF-SUBS 的核心结构可以简单理解为：

```text
                ┌─────────────┐
                │     SUB     │
                │  聚合节点配置 │
                └──────┬──────┘
                       │
              ┌────────┼────────┐
              │        │        │
              ▼        ▼        ▼
            URL A    URL B    URL C
           订阅链接  订阅链接  订阅链接
              │        │        │
              ▼        ▼        ▼
           客户端    客户端    客户端
```

**SUB 负责聚合来源。**

**URL 负责对外提供订阅地址。**

两者相互独立、灵活组合。

---

## ⭐ 支持项目

如果 CF-SUBS 对你有帮助，欢迎给项目点一个 Star。

欢迎提交 Issue、功能建议以及 Bug 反馈。
