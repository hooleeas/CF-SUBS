/**
 * CF-SUBS
 * 独立的 Cloudflare Workers 多订阅聚合项目
 *
 * 只绑定一个 KV Namespace：
 *   env.KV
 *
 * 核心概念：
 *   1. SUBS：聚合节点。可以创建多个，名称不能重复。
 *      每个 SUBS 可以包含多个订阅 URL / 单节点。
 *      SUBS 本身不会生成公开订阅链接。
 *
 *   2. TOKEN：访客订阅链接。可以自定义或随机生成。
 *      每个 TOKEN 必须命名且名称不能重复。
 *      一个 TOKEN 可以绑定多个 SUBS。
 *      一个 SUBS 也可以被多个 TOKEN 使用。
 *
 * KV 数据：
 *   CONFIG.json
 *   SUBS:<id>
 *   TOKEN:<token>
 *
 * 部署：
 *   wrangler.toml 中只需要绑定：
 *   [[kv_namespaces]]
 *   binding = "KV"
 *   id = "你的KV ID"
 */

const DEFAULT_CONFIG = {
    subName: "CF-SUBS",
    subApi: "",
    subConfig: "",
    noAds: "",
    user: "",
    pass: "",
    fakeMode: "",
    fakeUrl: "",
    fakeUrl302: "",
    fakeCode: ""
};

const DEFAULT_SUB_API = "SUBAPI.cmliussss.net";
const DEFAULT_SUB_CONFIG =
    "https://raw.githubusercontent.com/hooleeas/ACL4SSR/refs/heads/master/Clash/config/DIRECT_CHINA_AUTO_PING.ini";
const DEFAULT_SUB_PROTOCOL = "https";

const SUBS_PREFIX = "SUBS:";
const TOKEN_PREFIX = "TOKEN:";
const CONFIG_KEY = "CONFIG.json";

const TOKEN_CHARS =
    "ABCDEFGHJKMNPQRSTWXYZabcdefghijkmnpqrstwxyz2345678";

const jsonHeaders = {
    "Content-Type": "application/json;charset=UTF-8",
    "Cache-Control": "no-store"
};

const htmlHeaders = {
    "Content-Type": "text/html;charset=UTF-8",
    "Cache-Control": "no-store"
};

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const userAgentHeader = request.headers.get("User-Agent") || "";
        const userAgent = userAgentHeader.toLowerCase();

        if (request.method === "OPTIONS") {
            return new Response("", {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                }
            });
        }

        if (!env.KV) {
            return new Response(
                "CF-SUBS 未绑定名为 KV 的 Cloudflare KV Namespace。",
                { status: 500 }
            );
        }

        let config = await loadConfig(env);

        // 退出管理员
        if (url.pathname === "/admin/logout") {
            return new Response("", {
                status: 302,
                headers: {
                    "Location": "/admin",
                    "Set-Cookie":
                        "CF_SUBS_ADMIN=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax"
                }
            });
        }

        // 管理后台
        if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
            return await handleAdmin(request, env, config);
        }

        // API：管理员前端使用
        if (url.pathname.startsWith("/api/")) {
            if (!(await requireAdmin(request, env, config))) {
                return json({ error: "未登录" }, 401);
            }
            return await handleAdminApi(request, env, config);
        }

        // TOKEN 订阅：
        // /abc123
        // /abc123?clash
        // /abc123?singbox
        // /abc123?surge
        // 兼容 /?token=abc123
        let token = url.searchParams.get("token") || "";
        if (!token && url.pathname !== "/") {
            token = decodeURIComponent(url.pathname.slice(1)).trim();
        }

        if (token && !["admin", "api"].includes(token.toLowerCase())) {
            const tokenData = await getToken(env, token);
            if (tokenData) {
                return await handleSubscription(
                    request,
                    env,
                    config,
                    token,
                    tokenData,
                    userAgent,
                    userAgentHeader
                );
            }
        }

        // 根目录：主页 / 防嗅探页面
        if (url.pathname === "/") {
            return await renderHome(request, env, config);
        }

        return Response.redirect(url.origin + "/", 302);
    }
};

/* =========================================================
 * 配置
 * ======================================================= */

async function loadConfig(env) {
    let config = { ...DEFAULT_CONFIG };

    try {
        const raw = await env.KV.get(CONFIG_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            config = { ...config, ...parsed };
        }
    } catch (_) {}

    return config;
}

async function saveConfig(env, config) {
    await env.KV.put(CONFIG_KEY, JSON.stringify(config));
}

/* =========================================================
 * SUBS
 * ======================================================= */

function subKey(id) {
    return SUBS_PREFIX + id;
}

function tokenKey(token) {
    return TOKEN_PREFIX + token;
}

async function getSub(env, id) {
    if (!id) return null;
    try {
        return await env.KV.get(subKey(id), "json");
    } catch (_) {
        return null;
    }
}

async function getToken(env, token) {
    if (!token) return null;
    try {
        return await env.KV.get(tokenKey(token), "json");
    } catch (_) {
        return null;
    }
}

async function listSubs(env) {
    const result = [];
    let cursor;

    do {
        const page = await env.KV.list({
            prefix: SUBS_PREFIX,
            ...(cursor ? { cursor } : {})
        });

        for (const item of page.keys) {
            const data = await getSub(env, item.name.slice(SUBS_PREFIX.length));
            if (data) result.push(data);
        }

        cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);

    result.sort((a, b) =>
        String(a.name).localeCompare(String(b.name), "zh-CN")
    );

    return result;
}

async function listTokens(env) {
    const result = [];
    let cursor;

    do {
        const page = await env.KV.list({
            prefix: TOKEN_PREFIX,
            ...(cursor ? { cursor } : {})
        });

        for (const item of page.keys) {
            const token = item.name.slice(TOKEN_PREFIX.length);
            const data = await getToken(env, token);
            if (data) result.push(data);
        }

        cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);

    result.sort((a, b) =>
        String(a.name).localeCompare(String(b.name), "zh-CN")
    );

    return result;
}

function normalizeName(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeToken(value) {
    return String(value || "").trim();
}

function validName(name) {
    return name.length >= 1 && name.length <= 80;
}

function validCustomToken(token) {
    return (
        token.length >= 3 &&
        token.length <= 80 &&
        /^[A-Za-z0-9_-]+$/.test(token) &&
        !["admin", "api", "login", "logout", "favicon.ico"].includes(
            token.toLowerCase()
        )
    );
}

async function isSubNameUsed(env, name, exceptId = "") {
    const subs = await listSubs(env);
    return subs.some(
        s =>
            s.id !== exceptId &&
            String(s.name).toLowerCase() === name.toLowerCase()
    );
}

async function isTokenNameUsed(env, name, exceptToken = "") {
    const tokens = await listTokens(env);
    return tokens.some(
        t =>
            t.token !== exceptToken &&
            String(t.name).toLowerCase() === name.toLowerCase()
    );
}

async function randomToken(env, length = 8) {
    for (let attempt = 0; attempt < 20; attempt++) {
        let value = "";
        const bytes = crypto.getRandomValues(new Uint8Array(length));

        for (let i = 0; i < length; i++) {
            value += TOKEN_CHARS[bytes[i] % TOKEN_CHARS.length];
        }

        if (!(await getToken(env, value))) return value;
    }

    throw new Error("无法生成唯一随机 TOKEN，请稍后重试");
}

async function randomId(length = 10) {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    let result = "";

    for (const b of bytes) {
        result += TOKEN_CHARS[b % TOKEN_CHARS.length];
    }

    return result;
}

function cleanSources(input) {
    if (Array.isArray(input)) {
        return input
            .flatMap(item => String(item || "").split(/\r?\n/))
            .map(x => x.trim())
            .filter(Boolean);
    }

    return String(input || "")
        .split(/\r?\n/)
        .map(x => x.trim())
        .filter(Boolean);
}

function validateSources(sources) {
    for (const source of sources) {
        if (/^https?:\/\//i.test(source)) continue;

        // 非 URL 允许作为单节点内容。
        // CF-SUB 原本也支持把自建节点与订阅 URL 混合。
        if (source.length > 20000) {
            return "单条节点内容过长";
        }
    }

    return "";
}

/* =========================================================
 * TOKEN 聚合
 * ======================================================= */

async function buildTokenSources(env, tokenData) {
    const subIds = Array.isArray(tokenData.subs) ? tokenData.subs : [];
    const allSources = [];

    for (const id of subIds) {
        const sub = await getSub(env, id);
        if (!sub || sub.enabled === false) continue;

        const sources = Array.isArray(sub.sources) ? sub.sources : [];
        allSources.push(...sources);
    }

    return [...new Set(allSources.map(x => String(x).trim()).filter(Boolean))];
}

/* =========================================================
 * 管理 API
 * ======================================================= */

async function handleAdminApi(request, env, config) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
        if (request.method === "GET" && path === "/api/state") {
            const [subs, tokens] = await Promise.all([
                listSubs(env),
                listTokens(env)
            ]);

            return json({
                config: {
                    subName: config.subName,
                    subApi: config.subApi,
                    subConfig: config.subConfig,
                    noAds: config.noAds,
                    fakeMode: config.fakeMode,
                    fakeUrl: config.fakeUrl,
                    fakeUrl302: config.fakeUrl302,
                    fakeCode: config.fakeCode
                },
                subs,
                tokens
            });
        }

        if (request.method === "POST" && path === "/api/config") {
            const body = await readJson(request);

            const next = {
                ...config,
                subName: normalizeName(body.subName) || "CF-SUBS",
                subApi: String(body.subApi || "").trim(),
                subConfig: String(body.subConfig || "").trim(),
                noAds: String(body.noAds || "").trim(),
                fakeMode: String(body.fakeMode || ""),
                fakeUrl: String(body.fakeUrl || "").trim(),
                fakeUrl302: String(body.fakeUrl302 || "").trim(),
                fakeCode: String(body.fakeCode || "")
            };

            await saveConfig(env, next);
            return json({ ok: true });
        }

        // 创建 SUBS
        if (request.method === "POST" && path === "/api/subs") {
            const body = await readJson(request);
            const name = normalizeName(body.name);
            const sources = cleanSources(body.sources);

            if (!validName(name)) {
                return json({ error: "SUBS 名称不能为空，且不能超过 80 个字符" }, 400);
            }

            if (await isSubNameUsed(env, name)) {
                return json({ error: "SUBS 名称已存在，不能重名" }, 409);
            }

            if (!sources.length) {
                return json({ error: "至少添加一个订阅地址或单节点" }, 400);
            }

            const sourceError = validateSources(sources);
            if (sourceError) return json({ error: sourceError }, 400);

            const id = await randomId(10);

            const data = {
                id,
                name,
                enabled: body.enabled !== false,
                sources,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await env.KV.put(subKey(id), JSON.stringify(data));

            return json({ ok: true, sub: data });
        }

        // 编辑 SUBS
        if (
            request.method === "PUT" &&
            path.startsWith("/api/subs/")
        ) {
            const id = decodeURIComponent(path.slice("/api/subs/".length));
            const old = await getSub(env, id);

            if (!old) return json({ error: "SUBS 不存在" }, 404);

            const body = await readJson(request);
            const name = normalizeName(body.name);
            const sources = cleanSources(body.sources);

            if (!validName(name)) {
                return json({ error: "SUBS 名称不能为空，且不能超过 80 个字符" }, 400);
            }

            if (await isSubNameUsed(env, name, id)) {
                return json({ error: "SUBS 名称已存在，不能重名" }, 409);
            }

            if (!sources.length) {
                return json({ error: "至少添加一个订阅地址或单节点" }, 400);
            }

            const sourceError = validateSources(sources);
            if (sourceError) return json({ error: sourceError }, 400);

            const data = {
                ...old,
                name,
                sources,
                enabled: body.enabled !== false,
                updatedAt: new Date().toISOString()
            };

            await env.KV.put(subKey(id), JSON.stringify(data));

            return json({ ok: true, sub: data });
        }

        // 删除 SUBS
        if (
            request.method === "DELETE" &&
            path.startsWith("/api/subs/")
        ) {
            const id = decodeURIComponent(path.slice("/api/subs/".length));
            const old = await getSub(env, id);

            if (!old) return json({ error: "SUBS 不存在" }, 404);

            await env.KV.delete(subKey(id));

            // 从所有 TOKEN 中移除已经删除的 SUBS
            const tokens = await listTokens(env);

            for (const token of tokens) {
                if (Array.isArray(token.subs) && token.subs.includes(id)) {
                    token.subs = token.subs.filter(x => x !== id);
                    token.updatedAt = new Date().toISOString();
                    await env.KV.put(
                        tokenKey(token.token),
                        JSON.stringify(token)
                    );
                }
            }

            return json({ ok: true });
        }

        // 创建 TOKEN
        if (request.method === "POST" && path === "/api/tokens") {
            const body = await readJson(request);

            const name = normalizeName(body.name);
            const mode = body.mode === "custom" ? "custom" : "random";
            let token = normalizeToken(body.token);
            const subs = Array.isArray(body.subs)
                ? [...new Set(body.subs.map(String))]
                : [];

            if (!validName(name)) {
                return json({ error: "链接名称不能为空，且不能超过 80 个字符" }, 400);
            }

            if (await isTokenNameUsed(env, name)) {
                return json({ error: "链接名称已存在，不能重名" }, 409);
            }

            if (mode === "custom") {
                if (!validCustomToken(token)) {
                    return json({
                        error:
                            "自定义 TOKEN 只能使用 3-80 位字母、数字、下划线和短横线"
                    }, 400);
                }

                if (await getToken(env, token)) {
                    return json({ error: "TOKEN 已存在，请使用其他 TOKEN" }, 409);
                }
            } else {
                token = await randomToken(env);
            }

            const existingSubs = [];
            for (const id of subs) {
                if (await getSub(env, id)) existingSubs.push(id);
            }

            const data = {
                token,
                name,
                subs: [...new Set(existingSubs)],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await env.KV.put(tokenKey(token), JSON.stringify(data));

            return json({
                ok: true,
                token: data
            });
        }

        // 编辑 TOKEN
        if (
            request.method === "PUT" &&
            path.startsWith("/api/tokens/")
        ) {
            const token = decodeURIComponent(
                path.slice("/api/tokens/".length)
            );

            const old = await getToken(env, token);

            if (!old) return json({ error: "TOKEN 不存在" }, 404);

            const body = await readJson(request);
            const name = normalizeName(body.name);

            if (!validName(name)) {
                return json({ error: "链接名称不能为空，且不能超过 80 个字符" }, 400);
            }

            if (await isTokenNameUsed(env, name, token)) {
                return json({ error: "链接名称已存在，不能重名" }, 409);
            }

            const selected = Array.isArray(body.subs)
                ? [...new Set(body.subs.map(String))]
                : [];

            const existingSubs = [];
            for (const id of selected) {
                if (await getSub(env, id)) existingSubs.push(id);
            }

            const data = {
                ...old,
                name,
                subs: existingSubs,
                updatedAt: new Date().toISOString()
            };

            await env.KV.put(tokenKey(token), JSON.stringify(data));

            return json({ ok: true, token: data });
        }

        // 删除 TOKEN
        if (
            request.method === "DELETE" &&
            path.startsWith("/api/tokens/")
        ) {
            const token = decodeURIComponent(
                path.slice("/api/tokens/".length)
            );

            if (!(await getToken(env, token))) {
                return json({ error: "TOKEN 不存在" }, 404);
            }

            await env.KV.delete(tokenKey(token));

            return json({ ok: true });
        }

        return json({ error: "API 不存在" }, 404);
    } catch (error) {
        return json(
            { error: error instanceof Error ? error.message : String(error) },
            500
        );
    }
}

/* =========================================================
 * 订阅请求
 * ======================================================= */

async function handleSubscription(
    request,
    env,
    config,
    token,
    tokenData,
    userAgent,
    userAgentHeader
) {
    const sources = await buildTokenSources(env, tokenData);

    if (!sources.length) {
        return new Response(
            "该订阅链接没有绑定任何可用的 SUBS。",
            {
                status: 404,
                headers: {
                    "Content-Type": "text/plain;charset=UTF-8",
                    "Cache-Control": "no-store"
                }
            }
        );
    }

    let target = detectTarget(request, userAgent);
    let extraUA = "v2rayn";

    if (request.url.includes("?clash") || request.url.includes("?clash=")) {
        target = "clash";
        extraUA = "clash";
    } else if (
        request.url.includes("?singbox") ||
        request.url.includes("?sb")
    ) {
        target = "singbox";
        extraUA = "singbox";
    } else if (request.url.includes("?surge")) {
        target = "surge";
        extraUA = "surge";
    } else if (request.url.includes("?quanx")) {
        target = "quanx";
        extraUA = "Quantumult%20X";
    } else if (request.url.includes("?loon")) {
        target = "loon";
        extraUA = "Loon";
    } else if (
        request.url.includes("?b64") ||
        request.url.includes("?base64")
    ) {
        target = "base64";
    }

    const fetched = await getSUB(
        sources,
        request,
        extraUA,
        userAgentHeader
    );

    let rawNodes = fetched[0].join("\n");
    let converterSources = fetched[1];

    let effectiveApi = parseApi(config.subApi);
    let effectiveConfig =
        String(config.subConfig || "").trim() || DEFAULT_SUB_CONFIG;

    // base64 / mixed 输出与原 CF-SUB 逻辑保持一致：
    // 如果来源本身是标准订阅格式，则优先让 SUBAPI 做一次 mixed 转换。
    if (
        target === "base64" &&
        converterSources &&
        converterSources.includes("://")
    ) {
        try {
            const mixedUrl = buildSubUrl(
                effectiveApi.host,
                effectiveConfig,
                "mixed",
                converterSources,
                effectiveApi.protocol
            );

            const res = await fetch(mixedUrl, {
                headers: { "User-Agent": "v2rayn/CF-SUBS" }
            });

            if (res.ok) {
                const mixedText = await res.text();
                rawNodes += "\n" + decodeBase64Safe(mixedText);
            }
        } catch (_) {}
    }

    // WARP 可通过全局配置保留扩展能力。
    // 这里不依赖第二个 KV，若未来需要可以直接把 WARP 放进 CONFIG.json。
    if (config.warp) {
        const warp = cleanSources(config.warp);
        rawNodes += "\n" + warp.join("\n");
        converterSources +=
            (converterSources ? "|" : "") + warp.join("|");
    }

    let result = applyNoAdsAndUnique(rawNodes, config.noAds);
    const base64Data = encodeBase64(result);

    const headers = {
        "Content-Type": "text/plain; charset=utf-8",
        "Profile-Update-Interval": "6",
        "Profile-web-page-url":
            request.url.includes("?")
                ? request.url.split("?")[0]
                : request.url,
        "Cache-Control": "no-store"
    };

    if (target === "base64") {
        return new Response(base64Data, { headers });
    }

    if (!converterSources || !converterSources.includes("://")) {
        return new Response(base64Data, { headers });
    }

    try {
        const finalUrl = buildSubUrl(
            effectiveApi.host,
            effectiveConfig,
            target,
            converterSources,
            effectiveApi.protocol
        );

        const response = await fetch(finalUrl, {
            headers: {
                "User-Agent": userAgentHeader || "v2rayn/CF-SUBS"
            }
        });

        if (!response.ok) throw new Error("SUBAPI 请求失败");

        let content = await response.text();

        if (target === "clash") {
            content = clashFix(content);
        }

        if (!userAgent.includes("mozilla")) {
            headers["Content-Disposition"] =
                `attachment; filename*=utf-8''${encodeURIComponent(
                    tokenData.name || config.subName
                )}`;
        }

        return new Response(content, { headers });
    } catch (_) {
        // SUBAPI 失败时退回 base64，而不是返回空订阅。
        return new Response(base64Data, { headers });
    }
}

function detectTarget(request, userAgent) {
    const url = new URL(request.url);

    if (
        userAgent.includes("subconverter") ||
        request.headers.get("subconverter-request") ||
        request.headers.get("subconverter-version")
    ) {
        return "base64";
    }

    if (
        userAgent.includes("sing-box") ||
        userAgent.includes("singbox") ||
        userAgent.includes("nekobox")
    ) {
        return "singbox";
    }

    if (userAgent.includes("surge")) return "surge";
    if (userAgent.includes("quantumult")) return "quanx";
    if (userAgent.includes("loon")) return "loon";

    if (
        userAgent.includes("clash") ||
        userAgent.includes("mihomo") ||
        userAgent.includes("meta")
    ) {
        return "clash";
    }

    if (url.searchParams.has("singbox") || url.searchParams.has("sb")) {
        return "singbox";
    }

    if (url.searchParams.has("surge")) return "surge";
    if (url.searchParams.has("quanx")) return "quanx";
    if (url.searchParams.has("loon")) return "loon";
    if (url.searchParams.has("clash")) return "clash";

    return "base64";
}

function parseApi(value) {
    let input = String(value || "").trim();

    if (!input) {
        return {
            host: DEFAULT_SUB_API,
            protocol: DEFAULT_SUB_PROTOCOL
        };
    }

    if (!/^https?:\/\//i.test(input)) {
        input = "https://" + input;
    }

    try {
        const parsed = new URL(input);

        return {
            host: parsed.host + parsed.pathname.replace(/\/$/, ""),
            protocol: parsed.protocol.slice(0, -1)
        };
    } catch (_) {
        return {
            host: DEFAULT_SUB_API,
            protocol: DEFAULT_SUB_PROTOCOL
        };
    }
}

function buildSubUrl(api, config, target, urlToConvert, protocol) {
    let base =
        `${protocol}://${api}/sub` +
        `?target=${encodeURIComponent(target)}` +
        `&url=${encodeURIComponent(urlToConvert)}` +
        `&insert=false` +
        `&config=${encodeURIComponent(config)}` +
        `&emoji=true` +
        `&list=false` +
        `&tfo=false` +
        `&scv=true` +
        `&fdn=false` +
        `&sort=false`;

    if (target === "surge") {
        base += "&ver=4&new_name=true";
    } else if (target === "quanx") {
        base += "&udp=true";
    } else if (
        target === "clash" ||
        target === "singbox" ||
        target === "mixed"
    ) {
        base += "&new_name=true";
    }

    return base;
}

/* =========================================================
 * 多订阅获取：沿用 CF-SUB 的聚合思路
 * ======================================================= */

async function getSUB(apiList, request, extraUA, userAgentHeader) {
    if (!apiList || !apiList.length) return [[], ""];

    apiList = [...new Set(apiList)];

    const results = await Promise.allSettled(
        apiList.map(url =>
            getUrl(request, url, extraUA, userAgentHeader).then(res =>
                res.ok ? res.text() : Promise.reject(res)
            )
        )
    );

    let nodes = "";
    let converterUrls = "";

    for (let i = 0; i < results.length; i++) {
        const response = results[i];
        const sourceUrl = apiList[i];

        if (response.status !== "fulfilled") {
            continue;
        }

        const content = String(response.value || "").trim();

        if (!content) continue;

        // 已经是 Clash / sing-box 等结构化订阅
        if (
            content.includes("proxies:") ||
            (content.includes('"outbounds"') &&
                content.includes('"inbounds"'))
        ) {
            converterUrls +=
                (converterUrls ? "|" : "") + sourceUrl;
            continue;
        }

        // 普通 URI 节点
        if (content.includes("://")) {
            nodes += content + "\n";
            continue;
        }

        // Base64 订阅
        if (isValidBase64(content)) {
            try {
                const decoded = base64Decode(content);

                if (decoded.includes("://")) {
                    nodes += decoded + "\n";
                } else {
                    converterUrls +=
                        (converterUrls ? "|" : "") + sourceUrl;
                }
            } catch (_) {
                converterUrls +=
                    (converterUrls ? "|" : "") + sourceUrl;
            }
        }
    }

    return [cleanSources(nodes), converterUrls];
}

async function getUrl(request, targetUrl, extraUA, userAgentHeader) {
    const headers = new Headers(request.headers);

    headers.set(
        "User-Agent",
        `v2rayN/6.45 cmliu/CF-SUBS ${extraUA}(${userAgentHeader || ""})`
    );

    return fetch(
        new Request(targetUrl, {
            method: "GET",
            headers,
            redirect: "follow"
        })
    );
}

function applyNoAdsAndUnique(text, noAds) {
    let lines = String(text || "").split(/\r?\n/);

    const keywords = String(noAds || "")
        .split(/[, \r\n]+/)
        .map(x => x.trim().toLowerCase())
        .filter(Boolean);

    if (keywords.length) {
        lines = lines.filter(line => {
            const lower = line.toLowerCase();
            return !keywords.some(keyword => lower.includes(keyword));
        });
    }

    return [...new Set(lines.map(x => x.trim()).filter(Boolean))].join("\n");
}

function clashFix(content) {
    if (
        content.includes("wireguard") &&
        !content.includes("remote-dns-resolve")
    ) {
        const lines = content.includes("\r\n")
            ? content.split("\r\n")
            : content.split("\n");

        return lines
            .map(line =>
                line.includes("type: wireguard")
                    ? line.replace(
                          /, mtu: 1280, udp: true/g,
                          ", mtu: 1280, remote-dns-resolve: true, udp: true"
                      )
                    : line
            )
            .join("\n");
    }

    return content;
}

/* =========================================================
 * Base64 / Hash
 * ======================================================= */

function isValidBase64(str) {
    const value = String(str || "").replace(/\s/g, "");
    return (
        value.length > 0 &&
        value.length % 4 === 0 &&
        /^[A-Za-z0-9+/]+={0,2}$/.test(value)
    );
}

function base64Decode(str) {
    const binary = atob(String(str).replace(/\s/g, ""));
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return new TextDecoder().decode(bytes);
}

function decodeBase64Safe(str) {
    try {
        return base64Decode(str);
    } catch (_) {
        return String(str || "");
    }
}

function encodeBase64(text) {
    const bytes = new TextEncoder().encode(String(text || ""));
    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary);
}

async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

/* =========================================================
 * 管理员认证
 * ======================================================= */

function getCookie(request, name) {
    const raw = request.headers.get("Cookie") || "";

    for (const item of raw.split(";")) {
        const part = item.trim();
        const index = part.indexOf("=");

        if (index === -1) continue;

        if (part.slice(0, index) === name) {
            return decodeURIComponent(part.slice(index + 1));
        }
    }

    return "";
}

async function adminSession(config) {
    if (!config.user || !config.pass) return "";
    return sha256(
        `${config.user}:${config.pass}:CF-SUBS-ADMIN`
    );
}

async function requireAdmin(request, env, config) {
    if (!config.user || !config.pass) return true;

    const session = await adminSession(config);
    const cookie = getCookie(request, "CF_SUBS_ADMIN");

    return !!session && cookie === session;
}

async function handleAdmin(request, env, config) {
    const url = new URL(request.url);

    if (config.user && config.pass) {
        if (!(await requireAdmin(request, env, config))) {
            if (request.method === "POST" && url.pathname === "/admin/login") {
                return await adminLogin(request, config);
            }

            return new Response(renderLoginPage(config), {
                headers: htmlHeaders
            });
        }
    }

    return new Response(
        await renderAdminPage(request, env, config),
        { headers: htmlHeaders }
    );
}

async function adminLogin(request, config) {
    let body;

    try {
        body = await request.formData();
    } catch (_) {
        return new Response(renderLoginPage(config, "登录请求无效"), {
            status: 400,
            headers: htmlHeaders
        });
    }

    const user = String(body.get("username") || "");
    const pass = String(body.get("password") || "");

    if (user !== config.user || pass !== config.pass) {
        return new Response(
            renderLoginPage(config, "用户名或密码错误"),
            {
                status: 401,
                headers: htmlHeaders
            }
        );
    }

    const session = await adminSession(config);

    return new Response("", {
        status: 302,
        headers: {
            Location: "/admin",
            "Set-Cookie":
                `CF_SUBS_ADMIN=${encodeURIComponent(session)}; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax`
        }
    });
}

/* =========================================================
 * 页面
 * ======================================================= */

async function renderHome(request, env, config) {
    const mode = String(config.fakeMode || "");

    if (mode === "1" && config.fakeUrl) {
        try {
            return await proxyHome(config.fakeUrl, request, config.subName);
        } catch (_) {}
    }

    if (mode === "2" && config.fakeUrl302) {
        return Response.redirect(config.fakeUrl302, 302);
    }

    if (mode === "3" && config.fakeCode) {
        return new Response(
            injectTitle(config.fakeCode, config.subName),
            { headers: { "Content-Type": "text/html;charset=UTF-8" } }
        );
    }

    return new Response(
        `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHTML(config.subName)}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
margin:40px;color:#222}
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>${escapeHTML(config.subName)} is running.</p>
</body>
</html>`,
        { headers: htmlHeaders }
    );
}

async function proxyHome(baseUrl, request, title) {
    const base = new URL(baseUrl);
    const current = new URL(request.url);

    let path = current.pathname;

    if (path === "/") path = "";

    const target = new URL(
        base.origin +
            (base.pathname.replace(/\/$/, "") || "") +
            path +
            current.search
    );

    const response = await fetch(target, {
        headers: request.headers,
        redirect: "follow"
    });

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
        return new Response(response.body, response);
    }

    return new Response(
        injectTitle(await response.text(), title),
        {
            status: response.status,
            statusText: response.statusText,
            headers: new Headers(response.headers)
        }
    );
}

function injectTitle(html, title) {
    const safeTitle = `<title>${escapeHTML(title)}</title>`;

    if (/<title\b[^>]*>[\s\S]*?<\/title>/i.test(html)) {
        return html.replace(
            /<title\b[^>]*>[\s\S]*?<\/title>/i,
            safeTitle
        );
    }

    if (/<head\b[^>]*>/i.test(html)) {
        return html.replace(
            /<head\b[^>]*>/i,
            match => match + safeTitle
        );
    }

    return safeTitle + html;
}

function renderLoginPage(config, error = "") {
    return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHTML(config.subName)} - 登录</title>
${commonCSS()}
</head>
<body>
<main class="page small">
<section class="panel">
<h1>${escapeHTML(config.subName)}</h1>
<p class="muted">管理员控制台</p>
<form method="POST" action="/admin/login">
<label>用户名</label>
<input name="username" required autofocus>
<label>密码</label>
<input name="password" type="password" required>
<button type="submit">登录</button>
${error ? `<div class="error">${escapeHTML(error)}</div>` : ""}
</form>
</section>
</main>
</body>
</html>`;
}

async function renderAdminPage(request, env, config) {
    const [subs, tokens] = await Promise.all([
        listSubs(env),
        listTokens(env)
    ]);

    return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHTML(config.subName)} 管理后台</title>
${commonCSS()}
</head>
<body>
<div id="toast" class="toast"></div>

<div id="subModal" class="modal">
<div class="modal-box">
<h2 id="subModalTitle">创建聚合节点</h2>

<label>名称</label>
<input id="subName">

<label>订阅地址 / 单节点</label>
<textarea id="subSources" style="min-height:180px"
placeholder="一行一个订阅地址或节点"></textarea>

<label class="check">
<input id="subEnabled" type="checkbox" checked>
启用此聚合节点
</label>

<div class="actions">
<button class="secondary" onclick="closeModal('subModal')">取消</button>
<button onclick="saveSub()">保存</button>
</div>
</div>
</div>

<div id="tokenModal" class="modal">
<div class="modal-box">
<h2 id="tokenModalTitle">创建访客订阅链接</h2>

<label>名称</label>
<input id="tokenName" placeholder="例如：我的主订阅">

<label>Token</label>
<div class="row">
<select id="tokenMode" onchange="switchTokenMode()">
<option value="random">随机生成</option>
<option value="custom">自定义</option>
</select>
<input id="tokenValue" placeholder="自定义 TOKEN">
</div>

<div class="note">
随机 TOKEN 会生成类似 SURL 的随机后缀；自定义 TOKEN 只能使用字母、数字、下划线和短横线。
</div>

<label>可使用的聚合节点</label>
<div id="tokenSubs" class="checks"></div>

<div class="actions">
<button class="secondary" onclick="closeModal('tokenModal')">取消</button>
<button onclick="saveToken()">保存</button>
</div>
</div>
</div>

<div id="settingsModal" class="modal">
<div class="modal-box">
<h2>全局设置</h2>

<label>项目名称</label>
<input id="cfgSubName" value="${escapeHTML(config.subName)}">

<label>SUBAPI</label>
<input id="cfgSubApi" value="${escapeHTML(config.subApi)}"
placeholder="[默认值]">

<label>SUBCONFIG</label>
<textarea id="cfgSubConfig" style="min-height:90px"
placeholder="[默认值]">${escapeHTML(config.subConfig)}</textarea>

<label>NOADS</label>
<textarea id="cfgNoAds" style="min-height:90px"
placeholder="使用逗号、空格或换行分隔">${escapeHTML(config.noAds)}</textarea>

<label>主页模式</label>
<select id="cfgFakeMode">
<option value="" ${config.fakeMode === "" ? "selected" : ""}>默认 NGINX</option>
<option value="1" ${config.fakeMode === "1" ? "selected" : ""}>URL 反向代理</option>
<option value="2" ${config.fakeMode === "2" ? "selected" : ""}>URL 302</option>
<option value="3" ${config.fakeMode === "3" ? "selected" : ""}>自定义 HTML</option>
</select>

<label>主页 URL</label>
<input id="cfgFakeUrl" value="${escapeHTML(config.fakeUrl)}">

<label>主页 URL302</label>
<input id="cfgFakeUrl302" value="${escapeHTML(config.fakeUrl302)}">

<label>自定义 HTML</label>
<textarea id="cfgFakeCode" style="min-height:150px">${escapeHTML(config.fakeCode)}</textarea>

<div class="actions">
<button class="secondary" onclick="closeModal('settingsModal')">取消</button>
<button onclick="saveConfig()">保存设置</button>
</div>
</div>
</div>

<main class="page">
<header class="header">
<div>
<h1>${escapeHTML(config.subName)}</h1>
<p class="muted">多订阅聚合控制台</p>
</div>
<div class="actions">
<button class="secondary" onclick="openSettings()">设置</button>
<a class="button secondary" href="/admin/logout">退出</a>
</div>
</header>

<section class="panel">
<div class="section-head">
<div>
<h2>SUBS · 聚合节点</h2>
<p class="note">
SUBS 是聚合节点配置，不会直接创建公开订阅链接。
一个 SUBS 可以包含多个订阅地址或单节点。
</p>
</div>
<button onclick="openSubCreate()">＋ 创建聚合节点</button>
</div>

<div id="subsList"></div>
</section>

<section class="panel">
<div class="section-head">
<div>
<h2>访客订阅链接</h2>
<p class="note">
创建 TOKEN 后选择它可以使用的 SUBS。一个 TOKEN 可以使用多个 SUBS。
</p>
</div>
<button onclick="openTokenCreate()">＋ 创建链接</button>
</div>

<div id="tokensList"></div>
</section>
</main>

<script>
const initialSubs = ${JSON.stringify(subs)};
const initialTokens = ${JSON.stringify(tokens)};
let subs = initialSubs;
let tokens = initialTokens;

let editingSubId = "";
let editingToken = "";

function $(id){return document.getElementById(id);}

function toast(msg){
  const el=$("toast");
  el.textContent=msg;
  el.style.display="block";
  clearTimeout(window.__toast);
  window.__toast=setTimeout(()=>el.style.display="none",2200);
}

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function openModal(id){$(id).style.display="flex";}
function closeModal(id){$(id).style.display="none";}

function renderSubs(){
  const box=$("subsList");

  if(!subs.length){
    box.innerHTML='<div class="empty">暂无聚合节点，点击“创建聚合节点”开始。</div>';
    return;
  }

  box.innerHTML=subs.map(s=>\`
    <div class="item">
      <div class="item-main">
        <div class="item-title">\${esc(s.name)}</div>
        <div class="note">\${s.sources.length} 个来源 · \${s.enabled === false ? "已禁用" : "已启用"}</div>
      </div>
      <div class="actions">
        <button class="secondary" onclick="editSub('\${esc(s.id)}')">编辑</button>
        <button class="danger" onclick="deleteSub('\${esc(s.id)}')">删除</button>
      </div>
    </div>
  \`).join("");
}

function renderTokens(){
  const box=$("tokensList");

  if(!tokens.length){
    box.innerHTML='<div class="empty">暂无访客订阅链接，点击“创建链接”开始。</div>';
    return;
  }

  box.innerHTML=tokens.map(t=>{
    const url=location.origin+"/"+encodeURIComponent(t.token);
    const names=(t.subs||[]).map(id=>{
      const s=subs.find(x=>x.id===id);
      return s ? s.name : "已删除";
    });

    return \`
      <div class="item">
        <div class="item-main">
          <div class="item-title">\${esc(t.name)}</div>
          <a class="url" href="\${esc(url)}" target="_blank">\${esc(url)}</a>
          <div class="note">聚合节点：\${esc(names.join(" · ") || "未选择")}</div>
        </div>
        <div class="actions">
          <button class="secondary" onclick="copyText('\${esc(url)}')">复制</button>
          <button class="secondary" onclick="editToken('\${esc(t.token)}')">编辑</button>
          <button class="danger" onclick="deleteToken('\${esc(t.token)}')">删除</button>
        </div>
      </div>
    \`;
  }).join("");
}

function renderTokenSubs(selected=[]){
  const box=$("tokenSubs");

  if(!subs.length){
    box.innerHTML='<div class="empty">暂无 SUBS，请先创建聚合节点。</div>';
    return;
  }

  box.innerHTML=subs.map(s=>\`
    <label class="check">
      <input type="checkbox" value="\${esc(s.id)}"
        \${selected.includes(s.id) ? "checked" : ""}>
      <span>\${esc(s.name)}</span>
    </label>
  \`).join("");
}

function openSubCreate(){
  editingSubId="";
  $("subModalTitle").textContent="创建聚合节点";
  $("subName").value="";
  $("subSources").value="";
  $("subEnabled").checked=true;
  openModal("subModal");
}

function editSub(id){
  const s=subs.find(x=>x.id===id);
  if(!s)return;

  editingSubId=id;
  $("subModalTitle").textContent="编辑聚合节点";
  $("subName").value=s.name;
  $("subSources").value=s.sources.join("\\n");
  $("subEnabled").checked=s.enabled !== false;
  openModal("subModal");
}

async function saveSub(){
  const payload={
    name:$("subName").value.trim(),
    sources:$("subSources").value,
    enabled:$("subEnabled").checked
  };

  if(!payload.name)return toast("请输入 SUBS 名称");
  if(!payload.sources.trim())return toast("至少添加一个订阅地址或单节点");

  const res=await fetch(
    editingSubId ? "/api/subs/"+encodeURIComponent(editingSubId) : "/api/subs",
    {
      method:editingSubId ? "PUT":"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    }
  );

  const data=await res.json();

  if(!res.ok)return toast(data.error || "保存失败");

  if(editingSubId){
    subs=subs.map(x=>x.id===editingSubId?data.sub:x);
  }else{
    subs.push(data.sub);
  }

  closeModal("subModal");
  renderSubs();
  renderTokens();
  toast("保存成功");
}

async function deleteSub(id){
  const s=subs.find(x=>x.id===id);
  if(!s)return;

  if(!confirm("确定删除“"+s.name+"”吗？\\n已绑定它的 TOKEN 会自动解除该绑定。"))return;

  const res=await fetch("/api/subs/"+encodeURIComponent(id),{method:"DELETE"});
  const data=await res.json();

  if(!res.ok)return toast(data.error || "删除失败");

  subs=subs.filter(x=>x.id!==id);
  tokens=tokens.map(t=>({...t,subs:(t.subs||[]).filter(x=>x!==id)}));

  renderSubs();
  renderTokens();
  toast("已删除");
}

function switchTokenMode(){
  $("tokenValue").disabled=$("tokenMode").value!=="custom";
  if($("tokenMode").value!=="custom")$("tokenValue").value="";
}

function openTokenCreate(){
  editingToken="";
  $("tokenModalTitle").textContent="创建访客订阅链接";
  $("tokenName").value="";
  $("tokenMode").value="random";
  $("tokenValue").value="";
  switchTokenMode();
  renderTokenSubs([]);
  openModal("tokenModal");
}

function editToken(token){
  const t=tokens.find(x=>x.token===token);
  if(!t)return;

  editingToken=token;
  $("tokenModalTitle").textContent="编辑访客订阅链接";
  $("tokenName").value=t.name;
  $("tokenMode").value="custom";
  $("tokenValue").value=t.token;
  $("tokenValue").disabled=true;
  renderTokenSubs(t.subs||[]);
  openModal("tokenModal");
}

function selectedSubIds(){
  return [...document.querySelectorAll("#tokenSubs input[type=checkbox]:checked")]
    .map(x=>x.value);
}

async function saveToken(){
  const name=$("tokenName").value.trim();
  const mode=$("tokenMode").value;
  const token=$("tokenValue").value.trim();
  const selected=selectedSubIds();

  if(!name)return toast("请输入链接名称");

  if(!selected.length){
    return toast("至少选择一个聚合节点");
  }

  const payload={name,mode,token,subs:selected};

  const res=await fetch(
    editingToken
      ? "/api/tokens/"+encodeURIComponent(editingToken)
      : "/api/tokens",
    {
      method:editingToken ? "PUT":"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    }
  );

  const data=await res.json();

  if(!res.ok)return toast(data.error || "保存失败");

  if(editingToken){
    tokens=tokens.map(x=>x.token===editingToken?data.token:x);
  }else{
    tokens.push(data.token);
  }

  closeModal("tokenModal");
  renderTokens();
  toast("保存成功");
}

async function deleteToken(token){
  const t=tokens.find(x=>x.token===token);
  if(!t)return;

  if(!confirm("确定删除“"+t.name+"”吗？"))return;

  const res=await fetch(
    "/api/tokens/"+encodeURIComponent(token),
    {method:"DELETE"}
  );

  const data=await res.json();

  if(!res.ok)return toast(data.error || "删除失败");

  tokens=tokens.filter(x=>x.token!==token);
  renderTokens();
  toast("已删除");
}

async function copyText(text){
  try{
    await navigator.clipboard.writeText(text);
    toast("已复制");
  }catch(e){
    prompt("复制链接：",text);
  }
}

function openSettings(){
  openModal("settingsModal");
}

async function saveConfig(){
  const payload={
    subName:$("cfgSubName").value.trim(),
    subApi:$("cfgSubApi").value.trim(),
    subConfig:$("cfgSubConfig").value.trim(),
    noAds:$("cfgNoAds").value.trim(),
    fakeMode:$("cfgFakeMode").value,
    fakeUrl:$("cfgFakeUrl").value.trim(),
    fakeUrl302:$("cfgFakeUrl302").value.trim(),
    fakeCode:$("cfgFakeCode").value
  };

  const res=await fetch("/api/config",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(payload)
  });

  const data=await res.json();

  if(!res.ok)return toast(data.error || "保存失败");

  closeModal("settingsModal");
  toast("设置已保存，刷新后生效");
  setTimeout(()=>location.reload(),700);
}

renderSubs();
renderTokens();
switchTokenMode();
</script>
</body>
</html>`;
}

function commonCSS() {
    return `<style>
*{box-sizing:border-box}
body{
 margin:0;
 background:#f5f7fa;
 color:#202124;
 font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
 font-size:14px;
 line-height:1.5;
}
.page{
 width:100%;
 max-width:900px;
 margin:0 auto;
 padding:22px 14px 40px;
}
.page.small{max-width:440px;margin-top:10vh}
.header{
 display:flex;
 justify-content:space-between;
 align-items:flex-start;
 gap:14px;
 flex-wrap:wrap;
 margin-bottom:14px;
}
h1{margin:0;font-size:28px;line-height:1.2}
h2{margin:0 0 8px;font-size:17px}
.panel{
 background:rgba(255,255,255,.88);
 border:1px solid rgba(229,229,223,.8);
 border-radius:18px;
 padding:18px;
 margin-bottom:14px;
 box-shadow:0 4px 20px rgba(0,0,0,.05);
}
.section-head{
 display:flex;
 justify-content:space-between;
 align-items:flex-start;
 gap:12px;
 flex-wrap:wrap;
}
.note,.muted{
 color:#777;
 font-size:13px;
}
label{
 display:block;
 margin-top:14px;
 margin-bottom:6px;
 font-weight:600;
}
input,textarea,select{
 width:100%;
 border:1px solid #d5d8dc;
 border-radius:10px;
 padding:10px 12px;
 font:inherit;
 background:#fff;
 color:#202124;
}
input,select{height:42px}
textarea{min-height:100px;resize:vertical}
input:focus,textarea:focus,select:focus{
 outline:none;
 border-color:#3b82f6;
 box-shadow:0 0 0 3px rgba(59,130,246,.1)
}
button,.button{
 display:inline-flex;
 align-items:center;
 justify-content:center;
 min-height:40px;
 padding:8px 16px;
 border-radius:10px;
 border:1px solid #343a40;
 background:#2f3338;
 color:#fff;
 font:inherit;
 font-weight:600;
 cursor:pointer;
 text-decoration:none;
}
button:hover,.button:hover{filter:brightness(.94)}
button.secondary,.button.secondary{
 background:#fff;
 color:#222;
 border-color:#c8c8c0;
}
button.danger{background:#dc3545;border-color:#dc3545}
.actions{
 display:flex;
 gap:8px;
 flex-wrap:wrap;
 align-items:center;
}
.row{
 display:grid;
 grid-template-columns:150px 1fr;
 gap:8px;
}
.item{
 display:flex;
 justify-content:space-between;
 align-items:center;
 gap:14px;
 padding:14px 0;
 border-bottom:1px solid #e8e8e8;
}
.item:last-child{border-bottom:0}
.item-main{min-width:0;flex:1}
.item-title{font-weight:700;font-size:15px;margin-bottom:4px}
.url{
 display:block;
 color:#2563eb;
 overflow-wrap:anywhere;
 text-decoration:none;
 margin-bottom:4px;
}
.check{
 display:flex;
 align-items:center;
 gap:8px;
 font-weight:500;
}
.check input{
 width:18px;
 height:18px;
 margin:0;
}
.checks{
 display:grid;
 gap:8px;
 max-height:240px;
 overflow:auto;
 padding:10px;
 border:1px solid #ddd;
 border-radius:10px;
 background:rgba(0,0,0,.02);
}
.empty{
 padding:28px 10px;
 text-align:center;
 color:#888;
}
.error{color:#b00020;margin-top:12px}
.toast{
 display:none;
 position:fixed;
 z-index:9999;
 left:50%;
 top:50%;
 transform:translate(-50%,-50%);
 background:rgba(0,0,0,.86);
 color:#fff;
 padding:12px 20px;
 border-radius:12px;
}
.modal{
 display:none;
 position:fixed;
 inset:0;
 z-index:1000;
 background:rgba(0,0,0,.4);
 backdrop-filter:blur(8px);
 overflow:auto;
 align-items:center;
 justify-content:center;
 padding:20px;
}
.modal-box{
 width:100%;
 max-width:560px;
 background:#fff;
 border-radius:20px;
 padding:22px;
 box-shadow:0 15px 50px rgba(0,0,0,.25);
}
@media(max-width:600px){
 .row{grid-template-columns:1fr}
 .item{align-items:flex-start;flex-direction:column}
 .item .actions{width:100%}
 .item .actions button{flex:1}
}
@media(prefers-color-scheme:dark){
 body{background:#121212;color:#e6e6e6}
 .panel,.modal-box{background:#1e1e1e;border-color:rgba(255,255,255,.1)}
 input,textarea,select{background:#151515;color:#fff;border-color:#444}
 input:focus,textarea:focus,select:focus{background:#000}
 .item{border-color:rgba(255,255,255,.1)}
 .muted,.note{color:#aaa}
 button.secondary,.button.secondary{background:#3a414a;color:#fff;border-color:#69717c}
 .checks{border-color:#444;background:rgba(255,255,255,.03)}
 .modal{background:rgba(0,0,0,.58)}
 .url{color:#64b5f6}
}
</style>`;
}

/* =========================================================
 * 工具
 * ======================================================= */

async function readJson(request) {
    const text = await request.text();

    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch (_) {
        throw new Error("请求数据不是有效 JSON");
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: jsonHeaders
    });
}

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));
}
