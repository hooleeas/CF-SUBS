/**
 * CF-SUB
 * 基于 CF-SUB 核心能力扩展的多 SUB / 多订阅链接 URL 管理版
 *
 * 核心原则：
 * 1. 只使用一个 Cloudflare KV Binding：KV
 * 2. 保留 CF-SUB 的核心订阅获取、聚合、去重、NOADS、SUBAPI、格式识别、
 *    WARP、主页伪装、管理员登录、二维码、API/CONFIG 状态检测等能力。
 * 3. SUB 是“聚合节点配置”，不是公开订阅链接。
 * 4. URL 才是公开订阅入口。
 *
 * KV：
 *   CONFIG.json
 *   SUB:<id>
 *   URL:<url>
 *
 * Pages / Workers 环境变量仍兼容原 CF-SUB：
 *   USER
 *   PASS
 *   URL
 *   URL302
 *   CODE
 *   SUBUPTIME
 *   WARP
 *   LINK
 *   LINKSUB
 */

let mytoken = 'auto';
let FileName = 'CF-SUBS';
let SUBUpdateTime = 6;
let total = 99;
let timestamp = 4102329600000;

let MainData = `
https://cfxr.eu.org/getSub
`;

let urls = [];

// ================= 全局默认配置 =================
const defaultSubConverter = "SUBAPI.cmliussss.net";
const defaultSubConfig = "https://raw.githubusercontent.com/hooleeas/ACL4SSR/refs/heads/master/Clash/config/China_Direct_Overseas_Proxy.ini";
const defaultSubProtocol = "https";
// ================================================

let subConverter = defaultSubConverter;
let subConfig = defaultSubConfig;
let subProtocol = defaultSubProtocol;
let config_noAds = '';

// ================= 主页配置 =================
let fakeMode = '';
let fakeUrl = '';
let fakeUrl302 = '';
let fakeCode = '';
// ==============================================

const SUB_PREFIX = 'SUB:';
const URL_PREFIX = 'URL:';
const ID_CHARS = 'ABCDEFGHJKMNPQRSTWXYZabcdefghijkmnpqrstwxyz2345678';
const DEFAULT_ADMIN_PATH = 'admin';

export default {
    async fetch(request, env) {
        try {
            return await handleRequest(request, env);
        } catch (error) {
            console.error('CF-SUBS request error:', error);
            return new Response('CF-SUBS Worker Error: ' + (error?.message || String(error)), {
                status: 500,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Cache-Control': 'no-store'
                }
            });
        }
    }
};

async function handleRequest(request, env) {
        const userAgentHeader = request.headers.get('User-Agent') || '';
        const userAgent = userAgentHeader.toLowerCase();
        const url = new URL(request.url);
        const queryToken = url.searchParams.get('token') || '';
        // SUBAPI 转换内部请求：记录原始订阅 URL，确保转换时只使用该 URL 绑定的 SUB
        const conversionSourceToken = url.searchParams.get('sourceToken') || '';

        // 每次请求重新从环境变量读取，保持 CF-SUB 原有变量行为
        // 不再使用 TOKEN 环境变量；旧 /auto 入口继续由内部默认值兼容。
        let adminUser = env.USER || '';
        let adminPass = env.PASS || '';
        let adminPath = DEFAULT_ADMIN_PATH;

        fakeUrl = env.URL || '';
        fakeUrl302 = env.URL302 || '';
        fakeCode = env.CODE || '';

        // 读取 KV 配置
        if (env.KV) {
            try {
                const kvConfigStr = await env.KV.get('CONFIG.json');
                if (kvConfigStr) {
                    const kvConfig = JSON.parse(kvConfigStr);

                    FileName = kvConfig.subName || 'CF-SUBS';

                    subConverter = kvConfig.subApi || '';
                    subConfig = kvConfig.subConfig || '';
                    config_noAds = kvConfig.noAds || '';

                    // 原 CF-SUB 配置仍然兼容
                    adminUser = kvConfig.user || adminUser;
                    adminPass = kvConfig.pass || adminPass;
                    adminPath = normalizeAdminPath(kvConfig.adminPath) || DEFAULT_ADMIN_PATH;

                    fakeMode = kvConfig.fakeMode !== undefined ? kvConfig.fakeMode : '';
                    fakeUrl = kvConfig.fakeUrl !== undefined ? kvConfig.fakeUrl : fakeUrl;
                    fakeUrl302 = kvConfig.fakeUrl302 !== undefined ? kvConfig.fakeUrl302 : fakeUrl302;
                    fakeCode = kvConfig.fakeCode !== undefined ? kvConfig.fakeCode : fakeCode;
                }
            } catch (e) {
                console.error('解析 KV 配置失败', e);
            }
        }

        const customSubApi = String(subConverter || '').trim();
        const customSubConfig = String(subConfig || '').trim();
        const hasCustomApi = !!customSubApi;
        const hasCustomConfig = !!customSubConfig;

        subConverter = customSubApi;
        subConfig = customSubConfig;
        subProtocol = defaultSubProtocol;

        if (subConverter.includes('http://')) {
            subConverter = subConverter.split('//')[1];
            subProtocol = 'http';
        } else if (subConverter.includes('https://')) {
            subConverter = subConverter.split('//')[1] || subConverter;
        }

        const effectiveSubConverter = hasCustomApi ? subConverter : defaultSubConverter;
        const effectiveSubProtocol = hasCustomApi ? subProtocol : defaultSubProtocol;
        const effectiveSubConfig = hasCustomConfig ? subConfig : defaultSubConfig;

        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        const timeTemp = Math.ceil(currentDate.getTime() / 1000);
        const fakeToken = await MD5MD5(`${mytoken}${timeTemp}`);

        let UD = Math.floor(((timestamp - Date.now()) / timestamp * total * 1099511627776) / 2);
        total = total * 1099511627776;
        let expire = Math.floor(timestamp / 1000);
        SUBUpdateTime = env.SUBUPTIME || SUBUpdateTime;

        const isProxyClientUA = [
            'clash', 'meta', 'mihomo', 'sing-box', 'singbox', 'surge',
            'quantumult', 'loon', 'nekobox', 'v2rayn', 'v2rayng',
            'shadowrocket', 'subconverter'
        ].some(keyword => userAgent.includes(keyword));

        // 退出登录：直接跳回主页，不显示 logout 中间页面
        if (url.searchParams.has('logout') || url.pathname === `/${adminPath}/logout`) {
            return new Response(null, {
                status: 302,
                headers: {
                    'Location': '/',
                    'Cache-Control': 'no-store',
                    'Set-Cookie': 'CF_SUB_ADMIN=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax'
                }
            });
        }

        // ==================== 管理后台 ====================
        if (url.pathname === `/${adminPath}`) {
            if (isAdminLoginEnabled(adminUser, adminPass)) {
                const isLoggedIn = await isAdminLoggedIn(request, mytoken, adminUser, adminPass);
                if (!isLoggedIn) {
                    if (request.method === 'POST') {
                        return await handleAdminLogin(request, url, mytoken, adminUser, adminPass);
                    }
                    return new Response(renderLoginPage(url), {
                        headers: {
                            'Content-Type': 'text/html;charset=utf-8',
                            'Cache-Control': 'no-store'
                        }
                    });
                }
            }

            return await handleAdmin(request, env, {
                adminUser,
                adminPass,
                effectiveSubConverter,
                effectiveSubConfig,
                effectiveSubProtocol,
                hasCustomApi,
                hasCustomConfig,
                adminPath
            });
        }

        // ==================== 解析公开 URL ====================
        // 新版 URL：
        //   /abc123
        //   /abc123?clash
        //   /?token=abc123
        //
        // 兼容旧 CF-SUB：
        //   /auto
        //   /?token=auto
        let publicToken = queryToken;

        if (!publicToken && url.pathname !== '/') {
            publicToken = decodeURIComponent(url.pathname.slice(1));
        }

        let tokenData = null;

        if (env.KV && publicToken) {
            tokenData = await getToken(env, publicToken);
        }

        const legacyAdminPath =
            publicToken === mytoken ||
            publicToken.toLowerCase() === String(mytoken).toLowerCase();

        const isFakeTokenRequest =
            publicToken === fakeToken ||
            url.pathname === '/' + fakeToken;

        // 新 URL / auto / fakeToken 都属于有效入口
        const validPublicEntry =
            !!tokenData || legacyAdminPath || isFakeTokenRequest;

        // ==================== 无效路径 / 主页 ====================
        if (!validPublicEntry && url.pathname !== '/') {
            return Response.redirect(url.origin + '/', 302);
        }

        if (!validPublicEntry && url.pathname === '/') {
            if (fakeMode === '1' && fakeUrl) {
                try {
                    return await proxyURL(fakeUrl, url, FileName);
                } catch (e) {}
            } else if (fakeMode === '2' && fakeUrl302) {
                return Response.redirect(fakeUrl302, 302);
            } else if (fakeMode === '3' && fakeCode && fakeCode.trim() !== '') {
                let html = fakeCode;
                const title = `<title>${escapeHTML(FileName)}</title>`;
                if (/<title\b[^>]*>[\s\S]*?<\/title>/i.test(html)) {
                    html = html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, title);
                } else if (/<head\b[^>]*>/i.test(html)) {
                    html = html.replace(/<head\b[^>]*>/i, match => match + title);
                } else {
                    html = title + html;
                }
                return new Response(html, {
                    headers: { 'Content-Type': 'text/html; charset=UTF-8' }
                });
            }

            return new Response(await nginx(FileName), {
                headers: { 'Content-Type': 'text/html; charset=UTF-8' }
            });
        }

        // ==================== 获取当前入口的来源 ====================
        let selectedSources = [];

        if (tokenData) {
            // 新架构：URL -> 多个 SUB -> 多个来源
            selectedSources = await getSourcesForToken(env, tokenData);
        } else {
            // 兼容旧 CF-SUB：
            // auto = 所有 SUBS；fake = 所有 SUBS
            if (isFakeTokenRequest && conversionSourceToken) {
                const sourceTokenData = await getToken(env, conversionSourceToken);
                if (sourceTokenData) {
                    selectedSources = await getSourcesForToken(env, sourceTokenData);
                } else {
                    selectedSources = await getAllManagedSources(env);
                }
            } else if (legacyAdminPath || isFakeTokenRequest) {
                selectedSources = await getAllManagedSources(env);
            } else if (legacyGuestPath) {
                // 如果没有 SUBS，则使用旧 LINK.txt / LINK 环境变量。
                selectedSources = await getLegacySources(env);
                if (!selectedSources.length) {
                    selectedSources = await getAllManagedSources(env);
                }
            }
        }

        // ==================== 浏览器 UI ====================
        if (
            userAgent.includes('mozilla') &&
            !url.search &&
            !isProxyClientUA
        ) {
            const status = await getBackendStatus(
                effectiveSubConverter,
                effectiveSubConfig,
                effectiveSubProtocol,
                hasCustomApi,
                hasCustomConfig
            );

            // 新 URL：订阅页面
            if (tokenData) {
                return new Response(
                    renderGuestPage(
                        url,
                        tokenData.url,
                        tokenData.name
                    ),
                    { headers: { 'Content-Type': 'text/html;charset=utf-8' } }
                );
            }

            // auto / mytoken：管理员后台仍支持旧入口，但新项目推荐 /admin
            if (legacyAdminPath) {
                if (isAdminLoginEnabled(adminUser, adminPass)) {
                    const isLoggedIn = await isAdminLoggedIn(request, mytoken, adminUser, adminPass);
                    if (!isLoggedIn) {
                        if (request.method === 'POST') {
                            return await handleAdminLogin(request, url, mytoken, adminUser, adminPass);
                        }
                        return new Response(renderLoginPage(url), {
                            headers: {
                                'Content-Type': 'text/html;charset=utf-8',
                                'Cache-Control': 'no-store'
                            }
                        });
                    }
                }

                return await handleAdmin(request, env, {
                    adminUser,
                    adminPass,
                    effectiveSubConverter,
                    effectiveSubConfig,
                    effectiveSubProtocol,
                    hasCustomApi,
                    hasCustomConfig
                });
            }
        }

        // ==================== 原 CF-SUB 核心订阅处理 ====================
        return await generateSubscription(
            request,
            env,
            selectedSources,
            {
                mytoken,
                fakeToken,
                effectiveSubConverter,
                effectiveSubConfig,
                effectiveSubProtocol,
                userAgent,
                userAgentHeader,
                config_noAds,
                FileName,
                UD,
                expire
            },
            publicToken
        );
}

/* =========================================================
 * 配置 / 后台状态
 * ======================================================= */

async function getBackendStatus(api, config, protocol, hasCustomApi, hasCustomConfig) {
    let customApiOk = false;
    let customApiVersion = '';
    let defaultApiOk = false;
    let defaultApiVersion = '';
    let customConfigOk = false;
    let defaultConfigOk = false;

    async function probeApi(targetApi, targetProtocol) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 1200);
            const res = await fetch(`${targetProtocol}://${targetApi}/version`, {
                signal: controller.signal
            });
            clearTimeout(timeout);
            if (res.ok) {
                return {
                    ok: true,
                    version: (await res.text()).trim().substring(0, 30)
                };
            }
        } catch (e) {}
        return { ok: false };
    }

    async function probeConfig(configUrl) {
        if (!configUrl) return false;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 1200);
            const res = await fetch(configUrl, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeout);
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    if (hasCustomApi) {
        const res = await probeApi(api, protocol);
        customApiOk = res.ok;
        customApiVersion = res.version || '';
        if (!customApiOk) {
            const resDef = await probeApi(defaultSubConverter, defaultSubProtocol);
            defaultApiOk = resDef.ok;
            defaultApiVersion = resDef.version || '';
        }
    } else {
        const resDef = await probeApi(defaultSubConverter, defaultSubProtocol);
        defaultApiOk = resDef.ok;
        defaultApiVersion = resDef.version || '';
    }

    if (hasCustomConfig) {
        customConfigOk = await probeConfig(config);
        if (!customConfigOk) defaultConfigOk = await probeConfig(defaultSubConfig);
    } else {
        defaultConfigOk = await probeConfig(defaultSubConfig);
    }

    let adminApiHtml = '';
    let guestApiHtml = '';
    let finalApiUrl = '';
    let adminApiCss = '';
    let guestApiCss = '';

    if (hasCustomApi && customApiOk) {
        adminApiHtml = `✅SUBAPI状态正常 (${escapeHTML(customApiVersion)})`;
        guestApiHtml = adminApiHtml;
        finalApiUrl = `${protocol}://${api}`;
        adminApiCss = 'status-ok';
        guestApiCss = 'status-ok';
    } else if (hasCustomApi && !customApiOk && defaultApiOk) {
        adminApiHtml = `⚠️SUBAPI无效 已切换为默认配置 ✅默认值可用`;
        guestApiHtml = `✅SUBAPI状态正常 (${escapeHTML(defaultApiVersion)})`;
        finalApiUrl = `${defaultSubProtocol}://${defaultSubConverter}`;
        adminApiCss = 'status-warn';
        guestApiCss = 'status-ok';
    } else if (!hasCustomApi && defaultApiOk) {
        adminApiHtml = `⚠️SUBAPI为空 已切换为默认配置 ✅默认值可用`;
        guestApiHtml = `✅SUBAPI状态正常 (${escapeHTML(defaultApiVersion)})`;
        finalApiUrl = `${defaultSubProtocol}://${defaultSubConverter}`;
        adminApiCss = 'status-warn';
        guestApiCss = 'status-ok';
    } else {
        adminApiHtml = '❌SUBAPI无效待维护';
        guestApiHtml = adminApiHtml;
        finalApiUrl = `${defaultSubProtocol}://${defaultSubConverter}`;
        adminApiCss = 'status-error';
        guestApiCss = 'status-error';
    }

    let adminConfigHtml = '';
    let guestConfigHtml = '';
    let finalConfigUrl = '';
    let adminConfigCss = '';
    let guestConfigCss = '';

    if (hasCustomConfig && customConfigOk) {
        adminConfigHtml = '✅SUBCONFIG状态正常';
        guestConfigHtml = adminConfigHtml;
        finalConfigUrl = config;
        adminConfigCss = 'status-ok';
        guestConfigCss = 'status-ok';
    } else if (hasCustomConfig && !customConfigOk && defaultConfigOk) {
        adminConfigHtml = '⚠️SUBCONFIG无效 已切换为默认配置 ✅默认值可用';
        guestConfigHtml = '✅SUBCONFIG状态正常';
        finalConfigUrl = defaultSubConfig;
        adminConfigCss = 'status-warn';
        guestConfigCss = 'status-ok';
    } else if (!hasCustomConfig && defaultConfigOk) {
        adminConfigHtml = '⚠️SUBCONFIG为空 已切换为默认配置 ✅默认值可用';
        guestConfigHtml = '✅SUBCONFIG状态正常';
        finalConfigUrl = defaultSubConfig;
        adminConfigCss = 'status-warn';
        guestConfigCss = 'status-ok';
    } else {
        adminConfigHtml = '❌SUBCONFIG无效待维护';
        guestConfigHtml = adminConfigHtml;
        finalConfigUrl = defaultSubConfig;
        adminConfigCss = 'status-error';
        guestConfigCss = 'status-error';
    }

    return {
        adminApiHtml,
        guestApiHtml,
        finalApiUrl,
        adminApiCss,
        guestApiCss,
        adminConfigHtml,
        guestConfigHtml,
        finalConfigUrl,
        adminConfigCss,
        guestConfigCss
    };
}

/* =========================================================
 * SUB / URL 数据
 * ======================================================= */

function makeSubId() {
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    let value = '';
    for (const b of bytes) value += ID_CHARS[b % ID_CHARS.length];
    return value;
}

async function makeRandomToken(env, length = 6) {
    for (let n = 0; n < 30; n++) {
        const bytes = crypto.getRandomValues(new Uint8Array(length));
        let token = '';
        for (const b of bytes) token += ID_CHARS[b % ID_CHARS.length];

        if (
            !['admin', 'api', 'login', 'logout', 'favicon.ico'].includes(token.toLowerCase()) &&
            !(await getToken(env, token))
        ) {
            return token;
        }
    }
    throw new Error('随机 URL 生成失败，请重试');
}

async function getSub(env, id) {
    if (!env.KV || !id) return null;
    try {
        return await env.KV.get(`${SUB_PREFIX}${id}`, 'json');
    } catch (e) {
        return null;
    }
}

async function getToken(env, token) {
    if (!env.KV || !token) return null;
    try {
        return await env.KV.get(`${URL_PREFIX}${token}`, 'json');
    } catch (e) {
        return null;
    }
}

async function listSubs(env) {
    if (!env.KV) return [];
    const result = [];
    let cursor;

    do {
        const page = await env.KV.list({
            prefix: SUB_PREFIX,
            ...(cursor ? { cursor } : {})
        });

        const values = await Promise.all(page.keys.map(item =>
            getSub(env, item.name.slice(SUB_PREFIX.length))
        ));
        for (const data of values) {
            if (data) result.push(data);
        }

        cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);

    result.sort((a, b) => {
        const ao = Number.isFinite(Number(a.order)) ? Number(a.order) : (Date.parse(a.createdAt || '') || 0);
        const bo = Number.isFinite(Number(b.order)) ? Number(b.order) : (Date.parse(b.createdAt || '') || 0);
        if (ao !== bo) return ao - bo;
        return String(a.name).localeCompare(String(b.name), 'zh-CN');
    });
    return result;
}

async function listTokens(env) {
    if (!env.KV) return [];
    const result = [];
    let cursor;

    do {
        const page = await env.KV.list({
            prefix: URL_PREFIX,
            ...(cursor ? { cursor } : {})
        });

        const values = await Promise.all(page.keys.map(item =>
            getToken(env, item.name.slice(URL_PREFIX.length))
        ));
        for (const data of values) {
            if (data) result.push(data);
        }

        cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);

    result.sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh-CN'));
    return result;
}

function normalizeAdminPath(value) {
    let path = String(value || '').trim();
    if (!path) return DEFAULT_ADMIN_PATH;
    path = path.replace(/^[/]+/, '').replace(/[/]+$/, '');
    if (!/^[A-Za-z0-9_-]{2,60}$/.test(path)) return '';
    return path;
}

function normalizeName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeToken(value) {
    return String(value || '').trim();
}

function validName(name) {
    return name.length >= 1 && name.length <= 80;
}

function validCustomToken(token) {
    const lower = token.toLowerCase();
    const reserved = new Set([
        'admin', 'api', 'login', 'logout', 'favicon.ico', 'auto',
        String(mytoken || '').toLowerCase(),
    ]);

    return (
        token.length >= 3 &&
        token.length <= 80 &&
        /^[A-Za-z0-9_-]+$/.test(token) &&
        !reserved.has(lower)
    );
}

async function isSubNameUsed(env, name, exceptId = '') {
    const subs = await listSubs(env);
    return subs.some(s =>
        s.id !== exceptId &&
        String(s.name).toLowerCase() === String(name).toLowerCase()
    );
}

async function isTokenNameUsed(env, name, exceptToken = '') {
    const tokens = await listTokens(env);
    return tokens.some(t =>
        t.url !== exceptToken &&
        String(t.name).toLowerCase() === String(name).toLowerCase()
    );
}

function cleanSourceList(input) {
    if (Array.isArray(input)) {
        return input
            .flatMap(x => String(x || '').split(/\r?\n/))
            .map(x => x.trim())
            .filter(Boolean);
    }

    return String(input || '')
        .split(/\r?\n/)
        .map(x => x.trim())
        .filter(Boolean);
}

async function getSourcesForToken(env, tokenData) {
    const result = [];
    const ids = Array.isArray(tokenData.subs) ? tokenData.subs : [];

    for (const id of ids) {
        const sub = await getSub(env, id);
        if (!sub) continue;

        if (Array.isArray(sub.sources)) result.push(...sub.sources);
    }

    return [...new Set(result.map(x => String(x).trim()).filter(Boolean))];
}

async function getAllManagedSources(env) {
    const result = [];
    const subs = await listSubs(env);

    for (const sub of subs) {
        if (!sub) continue;
        if (Array.isArray(sub.sources)) result.push(...sub.sources);
    }

    // 如果没有创建 SUBS，则兼容旧 CF-SUB 数据
    if (!result.length) {
        return await getLegacySources(env);
    }

    return [...new Set(result.map(x => String(x).trim()).filter(Boolean))];
}

async function getLegacySources(env) {
    let data = '';
    let legacyUrls = [];

    if (env.KV) {
        await 迁移地址列表(env, 'LINK.txt');
        data = await env.KV.get('LINK.txt') || '';
    }

    if (!data) data = env.LINK || MainData || '';

    if (env.LINKSUB) {
        legacyUrls = await ADD(env.LINKSUB);
    }

    const all = await ADD(`${data}\n${legacyUrls.join('\n')}`);
    return [...new Set(all.map(x => String(x).trim()).filter(Boolean))];
}

async function handleAdmin(request, env, runtime) {
    if (!env.KV) {
        return new Response(
            '未绑定名为 KV 的 Cloudflare KV Namespace。',
            { status: 500 }
        );
    }

    // 管理后台 POST：统一处理配置 / SUB / URL
    if (request.method === 'POST') {
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('application/x-www-form-urlencoded')) {
            return new Response('不支持的数据格式', { status: 400 });
        }

        try {
            const data = await request.json();

            if (data.type === 'config') {
                const old = await getConfig(env);

                const next = {
                    subName: normalizeName(data.settings?.subName) || 'CF-SUBS',
                    subApi: String(data.settings?.subApi || '').trim(),
                    subConfig: String(data.settings?.subConfig || '').trim(),
                    noAds: String(data.settings?.noAds || '').trim(),

                    // 保留旧配置
                    user: String(data.settings?.user || old.user || ''),
                    pass: data.settings?.pass
                        ? String(data.settings.pass)
                        : String(old.pass || ''),
                    adminPath: normalizeAdminPath(data.settings?.adminPath || old.adminPath) || DEFAULT_ADMIN_PATH,

                    fakeMode: String(data.settings?.fakeMode ?? old.fakeMode ?? ''),
                    fakeUrl: String(data.settings?.fakeUrl ?? old.fakeUrl ?? ''),
                    fakeUrl302: String(data.settings?.fakeUrl302 ?? old.fakeUrl302 ?? ''),
                    fakeCode: String(data.settings?.fakeCode ?? old.fakeCode ?? '')
                };

                await env.KV.put('CONFIG.json', JSON.stringify(next));
                return jsonResponse({ ok: true, adminPath: next.adminPath });
            }

            if (data.type === 'sub_create') {
                const name = normalizeName(data.name);
                const sources = cleanSourceList(data.sources);

                if (!validName(name)) return new Response('SUBS 名称不能为空且不能超过 80 个字符', { status: 400 });
                if (await isSubNameUsed(env, name)) return new Response('SUBS 名称已存在，不能重名', { status: 409 });
                if (!sources.length) return new Response('至少添加一个订阅地址或单节点', { status: 400 });

                const id = makeSubId();
                const item = {
                    id,
                    name,
                    enabled: true,
                    order: Date.now(),
                    sources,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                await env.KV.put(`${SUB_PREFIX}${id}`, JSON.stringify(item));
                return jsonResponse({ ok: true, sub: item });
            }

            if (data.type === 'sub_update') {
                const id = String(data.id || '');
                const old = await getSub(env, id);
                if (!old) return new Response('SUBS 不存在', { status: 404 });

                const name = normalizeName(data.name);
                const sources = cleanSourceList(data.sources);

                if (!validName(name)) return new Response('SUBS 名称不能为空且不能超过 80 个字符', { status: 400 });
                if (await isSubNameUsed(env, name, id)) return new Response('SUBS 名称已存在，不能重名', { status: 409 });
                if (!sources.length) return new Response('至少添加一个订阅地址或单节点', { status: 400 });

                const item = {
                    ...old,
                    name,
                    sources,
                    enabled: true,
                    order: Number.isFinite(Number(old.order)) ? Number(old.order) : Date.now(),
                    updatedAt: new Date().toISOString()
                };

                await env.KV.put(`${SUB_PREFIX}${id}`, JSON.stringify(item));
                return jsonResponse({ ok: true, sub: item });
            }

            if (data.type === 'sub_reorder') {
                const ids = Array.isArray(data.ids)
                    ? [...new Set(data.ids.map(String).filter(Boolean))]
                    : [];

                if (!ids.length) return new Response('排序数据不能为空', { status: 400 });

                const subs = await listSubs(env);
                const byId = new Map(subs.map(item => [String(item.id), item]));
                if (ids.length !== subs.length || ids.some(id => !byId.has(id))) {
                    return new Response('聚合节点排序数据不完整', { status: 400 });
                }

                const now = Date.now();
                await Promise.all(ids.map((id, index) => {
                    const item = byId.get(id);
                    item.order = index;
                    item.updatedAt = new Date(now + index).toISOString();
                    return env.KV.put(`${SUB_PREFIX}${id}`, JSON.stringify(item));
                }));

                return jsonResponse({ ok: true, ids });
            }

            if (data.type === 'sub_delete') {
                const id = String(data.id || '');
                if (!(await getSub(env, id))) return new Response('SUBS 不存在', { status: 404 });

                await env.KV.delete(`${SUB_PREFIX}${id}`);

                // 删除 SUB 后，自动从所有 URL 的绑定列表移除
                const tokens = await listTokens(env);
                const affected = tokens.filter(item => Array.isArray(item.subs) && item.subs.includes(id));
                await Promise.all(affected.map(item => {
                    item.subs = item.subs.filter(x => x !== id);
                    item.updatedAt = new Date().toISOString();
                    return env.KV.put(`${URL_PREFIX}${item.url}`, JSON.stringify(item));
                }));

                return jsonResponse({ ok: true });
            }

            if (data.type === 'url_create') {
                const name = normalizeName(data.name);
                const mode = data.mode === 'custom' ? 'custom' : 'random';
                let token = normalizeToken(data.url || data.token);
                const selected = Array.isArray(data.subs)
                    ? [...new Set(data.subs.map(String))]
                    : [];

                if (!validName(name)) return new Response('链接名称不能为空且不能超过 80 个字符', { status: 400 });
                if (await isTokenNameUsed(env, name)) return new Response('链接名称已存在，不能重名', { status: 409 });

                if (mode === 'custom') {
                    if (!validCustomToken(token)) {
                        return new Response('自定义 URL 只能使用 3-80 位字母、数字、下划线和短横线', { status: 400 });
                    }
                    if (await getToken(env, token)) {
                        return new Response('URL 已存在，请使用其他 URL', { status: 409 });
                    }
                } else {
                    token = await makeRandomToken(env, 6);
                }

                const validSubs = [];
                for (const id of selected) {
                    if (await getSub(env, id)) validSubs.push(id);
                }

                if (!validSubs.length) {
                    return new Response('至少选择一个聚合节点', { status: 400 });
                }

                const item = {
                    url: token,
                    name,
                    subs: validSubs,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                await env.KV.put(`${URL_PREFIX}${token}`, JSON.stringify(item));
                return jsonResponse({ ok: true, url: item });
            }

            if (data.type === 'url_update') {
                const oldToken = normalizeToken(data.oldUrl || data.oldToken || data.url || data.token);
                const newToken = normalizeToken(data.newUrl || data.newToken || data.url || data.token);
                const old = await getToken(env, oldToken);
                if (!old) return new Response('URL 不存在', { status: 404 });

                const name = normalizeName(data.name);
                const selected = Array.isArray(data.subs)
                    ? [...new Set(data.subs.map(String))]
                    : [];

                if (!validName(name)) return new Response('链接名称不能为空且不能超过 80 个字符', { status: 400 });
                if (!validCustomToken(newToken)) {
                    return new Response('URL 只能使用 3-80 位字母、数字、下划线和短横线', { status: 400 });
                }
                if (await isTokenNameUsed(env, name, oldToken)) return new Response('链接名称已存在，不能重名', { status: 409 });

                if (newToken !== oldToken && await getToken(env, newToken)) {
                    return new Response('新的 URL 已存在，请使用其他 URL', { status: 409 });
                }

                const validSubs = [];
                for (const id of selected) {
                    if (await getSub(env, id)) validSubs.push(id);
                }

                if (!validSubs.length) return new Response('至少选择一个聚合节点', { status: 400 });

                const item = {
                    ...old,
                    url: newToken,
                    name,
                    subs: validSubs,
                    updatedAt: new Date().toISOString()
                };

                // URL 本身发生变化时，迁移 KV Key，确保旧地址立即失效、新地址立即生效。
                if (newToken !== oldToken) {
                    await env.KV.put(`${URL_PREFIX}${newToken}`, JSON.stringify(item));
                    await env.KV.delete(`${URL_PREFIX}${oldToken}`);
                } else {
                    await env.KV.put(`${URL_PREFIX}${oldToken}`, JSON.stringify(item));
                }

                return jsonResponse({ ok: true, url: item, oldUrl: oldToken });
            }

            if (data.type === 'url_delete') {
                const token = normalizeToken(data.url || data.token);
                if (!(await getToken(env, token))) return new Response('URL 不存在', { status: 404 });

                await env.KV.delete(`${URL_PREFIX}${token}`);
                return jsonResponse({ ok: true });
            }

            return new Response('不支持的数据类型', { status: 400 });
        } catch (e) {
            return new Response(`服务器错误: ${e.message}`, { status: 500 });
        }
    }

    const [subs, tokens, settings] = await Promise.all([
        listSubs(env),
        listTokens(env),
        getConfig(env)
    ]);

    const status = await getBackendStatus(
        runtime.effectiveSubConverter,
        runtime.effectiveSubConfig,
        runtime.effectiveSubProtocol,
        runtime.hasCustomApi,
        runtime.hasCustomConfig
    );

    return new Response(
        renderAdminPage(
            new URL(request.url),
            env,
            subs,
            tokens,
            settings,
            status
        ),
        {
            headers: {
                'Content-Type': 'text/html;charset=utf-8',
                'Cache-Control': 'no-store'
            }
