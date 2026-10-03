var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// _worker.js
var APP_ID = "SUB-UI";
var FILENAME = "SUB";
var SITELOGO = "";
var DEFAULT_UPDATE_MINUTES = 60;
var INTERNAL_TOKEN_SEED = "CF-SUBS-INTERNAL";
var SUB_PREFIX = "SUB:";
var URL_PREFIX = "URL:";
var CONFIG_SECTION_PREFIX = "CONFIG:SECTION:";
var SUBAPIS_KEY = "SUBAPIS";
var SUBCONFIGS_KEY = "SUBCONFIGS";
var CONFIG_SECTIONS = {
  site: ["subName", "adminPath", "siteLogo"],
  security: ["user", "pass"],
  subapi: ["subApis", "defaultSubApiId"],
  subconfig: ["subConfigs", "defaultSubConfigId"]
};
var CONFIG_VERSION = 2;
class ConfigStorageError extends Error {}
var ID_CHARS = "ABCDEFGHJKMNPQRSTWXYZ2345678";
var DEFAULT_ADMIN_PATH = "admin";
function normalizeUpdateEnabled(value) {
  return value !== false && value !== 0 && value !== "false" && value !== "0";
}
var WORKER_DEFAULT = {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      const configUnavailable = error instanceof ConfigStorageError;
      console.error(configUnavailable ? "SUB-UI configuration unavailable" : "SUB-UI request failed", error.message);
      return new Response("SUB-UI Worker Error", {
        status: configUnavailable ? 503 : 500,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          ...(configUnavailable ? { "Retry-After": "5" } : {})
        }
      });
    }
  }
};
var CF_SUBS_CLIENT_SCRIPT = String.raw`
(function(){
'use strict';
function $(id){return document.getElementById(id)}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
function toast(message,isError){
 var el=$('ccToast');
 if(!el){
  var style=document.createElement('style');
  style.textContent='.cc-toast{position:fixed;left:50%;bottom:min(14vh,120px);z-index:100000;display:flex;align-items:center;gap:10px;max-width:min(520px,calc(100vw - 32px));padding:12px 18px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(25,31,36,.96);color:#fff;font-size:14px;font-weight:650;line-height:1.45;box-shadow:0 12px 36px rgba(0,0,0,.28);pointer-events:none;opacity:0;transform:translate(-50%,12px);transition:opacity .18s ease,transform .18s ease}.cc-toast.visible{opacity:1;transform:translate(-50%,0)}.cc-toast-icon{display:grid;width:22px;height:22px;flex:0 0 22px;place-items:center;border-radius:50%;background:#2e9b61;color:#fff;font-size:14px}.cc-toast.error .cc-toast-icon{background:#d93025}';
  document.head.appendChild(style);
  el=document.createElement('div');el.id='ccToast';el.className='cc-toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
  el.innerHTML='<span class="cc-toast-icon" aria-hidden="true"></span><span class="cc-toast-message"></span>';
  document.body.appendChild(el)
 }
 el.classList.toggle('error',Boolean(isError));
 el.querySelector('.cc-toast-icon').textContent=isError?'!':'✓';
 el.querySelector('.cc-toast-message').textContent=String(message||'');
 el.classList.add('visible');clearTimeout(window.__cfToastTimer);
 window.__cfToastTimer=setTimeout(function(){el.classList.remove('visible')},2200)
}
window.CC=toast;
function alertCC(message){toast(message,true)}
// Centralize modal visibility and background scroll locking so every page restores its exact scroll position.
var CFSubsModal=(function(){
 var openModals=new Set(),savedBodyStyles=null,savedScrollX=0,savedScrollY=0;
 function resolve(target){return typeof target==='string'?$(target):target}
 function lockPageScroll(){
  if(savedBodyStyles)return;
  var body=document.body;savedScrollX=window.scrollX;savedScrollY=window.scrollY;
  savedBodyStyles={position:body.style.position,top:body.style.top,left:body.style.left,width:body.style.width,overflow:body.style.overflow};
  body.style.position='fixed';body.style.top=(-savedScrollY)+'px';body.style.left=(-savedScrollX)+'px';body.style.width='100%';body.style.overflow='hidden';
 }
 function unlockPageScroll(){
  if(!savedBodyStyles)return;
  var body=document.body;body.style.position=savedBodyStyles.position;body.style.top=savedBodyStyles.top;body.style.left=savedBodyStyles.left;body.style.width=savedBodyStyles.width;body.style.overflow=savedBodyStyles.overflow;
  window.scrollTo(savedScrollX,savedScrollY);savedBodyStyles=null;
 }
 function open(target,options){
  var modal=resolve(target);if(!modal)return;
  options=options||{};
  if(!openModals.has(modal)){if(!openModals.size)lockPageScroll();openModals.add(modal)}
  if(options.className)modal.classList.add(options.className);else modal.style.display=options.display||'flex';
  if(options.ariaHidden!==undefined)modal.setAttribute('aria-hidden',String(options.ariaHidden));
 }
 function close(target,options){
  var modal=resolve(target);if(!modal)return;
  options=options||{};
  if(options.className)modal.classList.remove(options.className);else modal.style.display='none';
  if(options.ariaHidden!==undefined)modal.setAttribute('aria-hidden',String(options.ariaHidden));
  openModals.delete(modal);if(!openModals.size)unlockPageScroll();
 }
 document.addEventListener('keydown',function(event){if(event.key==='Escape'&&openModals.size){var modals=Array.from(openModals);close(modals[modals.length-1])}});
 return{open:open,close:close};
})();
window.CFSubsModal=CFSubsModal;
function openModal(id){CFSubsModal.open(id)}
function closeModal(id){CFSubsModal.close(id)}
var CFSubsUI=(function(){
 function setStatus(target,state,message){
  var container=typeof target==='string'?$(target):target;if(!container)return;
  var status=document.createElement('div');
  status.className='ui-status-item';status.dataset.state=state;status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent=message;
  container.replaceChildren(status);
 }
 function setLink(target,value,available){
  var link=typeof target==='string'?$(target):target;if(!link)return;
  if(value)link.textContent=value;
  if(available===false||!value){link.removeAttribute('href');link.removeAttribute('target');link.style.pointerEvents='none';link.style.cursor='default';return}
  link.href=value;link.target='_blank';link.style.pointerEvents='auto';link.style.cursor='pointer';
 }
 function setExpanded(button,content,expanded){
  if(!button||!content)return;
  button.setAttribute('aria-expanded',String(expanded));content.hidden=!expanded;
  var hint=button.querySelector('.ui-expand-hint,.provider-toggle-hint,.advanced-toggle-hint');
  if(hint)hint.textContent=expanded?'\u70B9\u51FB\u6536\u8D77':'\u70B9\u51FB\u5C55\u5F00';
 }
 function bindExpandToggles(root){
  (root||document).querySelectorAll('[data-ui-expand-toggle],[data-provider-toggle],#advancedFeaturesToggle').forEach(function(button){
   button.addEventListener('click',function(){
    var content=$(button.getAttribute('aria-controls'));if(!content)return;
    setExpanded(button,content,button.getAttribute('aria-expanded')!=='true');
   });
  });
 }
 function bindSelectChange(select,handler){
  if(select)select.addEventListener('change',function(){handler(select.value,select)});
 }
 function normalizeControls(root){
  var scope=root||document;
  scope.querySelectorAll('button,.button').forEach(function(button){
   button.classList.add('ui-button');
   if(button.matches('[data-provider-toggle],#advancedFeaturesToggle,.aggregate-result-close'))button.classList.add('ui-button-neutral','ui-expand-toggle');
   else button.classList.add(button.classList.contains('secondary')?'ui-button-secondary':button.classList.contains('danger')||/[Dd]estroy/.test(button.className)?'ui-button-danger':'ui-button-primary');
  });
  scope.querySelectorAll('select').forEach(function(select){select.classList.add('ui-select')});
  scope.querySelectorAll('input[type="checkbox"],input[type="radio"]').forEach(function(input){input.classList.add('ui-choice-control')});
  scope.querySelectorAll('.link-url,.current-config-link,.aggregate-result-url,.generated-link-url,.guest-link-url').forEach(function(link){link.classList.add('ui-link-box')});
  scope.querySelectorAll('[data-provider-toggle],#advancedFeaturesToggle').forEach(function(button){button.classList.add('ui-expand-toggle')});
 }
 function setButtonBusy(button,busy,label){
  if(!button)return;
  if(busy){
   if(!button.disabled)button.dataset.uiIdleText=button.textContent;
   button.disabled=true;if(label)button.textContent=label;
   return;
  }
  button.disabled=false;
  if(button.dataset.uiIdleText!==undefined){button.textContent=button.dataset.uiIdleText;delete button.dataset.uiIdleText}
 }
 function checkAvailability(kind,value){
  var api=kind==='api',query=api?'/api/status?api='+encodeURIComponent(value):'/api/status?config='+encodeURIComponent(value);
  return fetch(query,{cache:'no-store',headers:{Accept:'application/json'}}).then(function(response){
   return response.json().then(function(data){var info=api?data.api:data.config;return{ok:Boolean(response.ok&&data.ok&&info&&info.ok),info:info,data:data}})
  });
 }
 return{setStatus:setStatus,setLink:setLink,setExpanded:setExpanded,bindExpandToggles:bindExpandToggles,bindSelectChange:bindSelectChange,normalizeControls:normalizeControls,setButtonBusy:setButtonBusy,checkAvailability:checkAvailability,notify:toast};
})();
window.CFSubsUI=CFSubsUI;

/* ---------- SUB-UI public homepage ---------- */
var PUBLIC_STATE={apiId:'',configId:'',apiCustom:false,configCustom:false,apiUrl:'',configUrl:''};
var GENERATED_LINKS_KEY='SUB_UI_GENERATED_LINKS_V1';
var CURRENT_DESTROY_KEY='';
function generatedLinks(){
 try{var data=JSON.parse(localStorage.getItem(GENERATED_LINKS_KEY)||'[]');return Array.isArray(data)?data:[]}
 catch(e){return []}
}
function saveGeneratedLinks(list){
 try{localStorage.setItem(GENERATED_LINKS_KEY,JSON.stringify(list))}catch(e){}
}
function tokenFromSubscriptionUrl(value){
 try{var u=new URL(String(value||''),location.origin);var token=decodeURIComponent(String(u.pathname||'').replace(/^\/+|\/+$/g,''));return token||''}
 catch(e){return ''}
}
function rememberGeneratedLink(value){
 var url=String(value||'').trim(),token=tokenFromSubscriptionUrl(url);if(!url||!token)return;
 var list=generatedLinks().filter(function(x){return x&&String(x.token||'')!==token});
 list.unshift({token:token,url:url,createdAt:new Date().toISOString()});
 saveGeneratedLinks(list);renderGeneratedLinks();
}
function forgetGeneratedLink(token){
 token=String(token||'').trim();if(!token)return;
 saveGeneratedLinks(generatedLinks().filter(function(x){return !x||String(x.token||'')!==token}));
 renderGeneratedLinks();
}
function aggregateNotice(message,isError){toast(message,isError)}
function renderGeneratedLinks(){
 var wrap=$('generatedLinksPanel'),listEl=$('generatedLinksList');if(!wrap||!listEl)return;
 var list=generatedLinks();
 if(!list.length){wrap.style.display='none';listEl.innerHTML='';return}
 wrap.style.display='block';
 listEl.innerHTML=list.map(function(item){
   var token=String(item&&item.token||'').trim(),url=String(item&&item.url||'').trim();
   if(!token||!url)return '';
   return '<div class="generated-link-row" data-token="'+esc(token)+'"><a class="generated-link-url" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" title="打开订阅链接">'+esc(url)+'</a><button type="button" class="button generated-link-destroy" data-destroy-token="'+esc(token)+'">销毁</button></div>';
 }).join('');
 CFSubsUI.normalizeControls(listEl);
 listEl.querySelectorAll('[data-destroy-token]').forEach(function(button){button.addEventListener('click',function(){destroyGeneratedLink(String(button.dataset.destroyToken||''),button,false)})});
}
function syncGeneratedLinks(){
 var list=generatedLinks();if(!list.length)return Promise.resolve();
 var tokens=list.map(function(item){return String(item&&item.token||'').trim()}).filter(Boolean);
 if(!tokens.length)return Promise.resolve();
 return fetch('/api/generated-links/check',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify({tokens:tokens})})
 .then(function(r){return r.json().then(function(d){return {r:r,d:d}})})
 .then(function(x){
   if(!x.r.ok||!x.d.ok)return;
   var valid={};(Array.isArray(x.d.tokens)?x.d.tokens:[]).forEach(function(token){valid[String(token||'').trim()]=true});
   var next=list.filter(function(item){return valid[String(item&&item.token||'').trim()]});
   if(next.length!==list.length){saveGeneratedLinks(next);renderGeneratedLinks()}
 })
 .catch(function(){});
}
function resetAggregateResult(){var q=$('aggregateResultQr');if(q){q.innerHTML='';q.style.display='block'}var b=$('copyDirect');if(b){b.textContent='复制';b.disabled=false}var d=$('destroyDirect');if(d){CFSubsUI.setButtonBusy(d,false);d.textContent='销毁'}}
function closeAggregateResult(){closeModal('aggregateResultModal');resetAggregateResult()}
function destroyGeneratedLink(token,button,fromModal,key,skipConfirm){
 token=String(token||'').trim();if(!token)return;
 key=String(key||'');
 if(!skipConfirm&&!confirm('销毁后链接将立即失效且无法恢复，确定要销毁吗？'))return;
 CFSubsUI.setButtonBusy(button,true,'销毁中…');
 fetch('/api/destroy',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify({token:token,key:key})})
 .then(function(r){return r.json().then(function(d){return {r:r,d:d}})})
 .then(function(x){
   if(!x.r.ok||!x.d.ok){
     if(x.d&&x.d.requireKey&&!key){
       var entered=prompt('该链接设置了销毁密钥，请输入密钥：');
       if(entered===null){CFSubsUI.setButtonBusy(button,false);return}
       destroyGeneratedLink(token,button,fromModal,entered,true);
       return;
     }
     throw new Error(x.d.error||'销毁失败');
   }
   forgetGeneratedLink(token);
   if(fromModal)closeAggregateResult();
   aggregateNotice('链接已销毁，该链接已失效');
 })
 .catch(function(err){
   CFSubsUI.setButtonBusy(button,false);
   aggregateNotice(err.message||'销毁失败',true);
 });
}
function currentValue(kind){
 var api=kind==='api',picker=$(api?'apiPicker':'configPicker');
 if(!picker)return '';
 if(picker.value==='__custom')return api?PUBLIC_STATE.apiUrl:PUBLIC_STATE.configUrl;
 return String(picker.value||'');
}
function currentId(kind){
 var api=kind==='api',picker=$(api?'apiPicker':'configPicker');
 if(!picker)return '';
 var o=picker.options[picker.selectedIndex];return o&&o.dataset?String(o.dataset.id||''):'';
}
function updateCurrent(kind){
 var api=kind==='api',picker=$(api?'apiPicker':'configPicker'),current=$(api?'apiCurrent':'configCurrent'),edit=$(api?'editApiCustom':'editConfigCustom');
 if(!picker||!current)return;
 var custom=picker.value==='__custom',value=currentValue(kind);CFSubsUI.setLink(current,value||('暂无'+(api?'订阅转换后端':'订阅转换规则')+'，请编辑'),Boolean(value));if(!api){current.style.height='42px';var contentHeight=current.scrollHeight;if(contentHeight>52)current.style.height=contentHeight+'px'}
 if(edit){edit.style.display=custom?'inline-flex':'none';edit.hidden=!custom}
 if(!api){current.style.height='auto';current.style.height=Math.max(42,Math.min(260,current.scrollHeight))+'px'}
}
function statusText(kind,info,ok){
 if(ok){if(kind==='api'){var version=String((info&&info.version)||'').trim();return '✅ SUBAPI状态正常'+(version?' ('+esc(version)+')':'')}return '✅ SUBCONFIG状态正常'}
 return kind==='api'?'❌ SUBAPI状态异常':'❌ SUBCONFIG状态异常'
}
var statusTimers={};
function scheduleStatus(kind,delay){
 if(statusTimers[kind])window.clearTimeout(statusTimers[kind]);
 statusTimers[kind]=window.setTimeout(function(){statusTimers[kind]=null;checkStatus(kind,false)},delay);
}
function checkStatus(kind,showLoading){
 var api=kind==='api',value=currentValue(kind),id=api?'apiStatus':'configStatus';
 if(api&&!value){var ver=$('apiVersion');if(ver)ver.textContent='未选择 SUBAPI'}
 if(!value){if(statusTimers[kind])window.clearTimeout(statusTimers[kind]);statusTimers[kind]=null;CFSubsUI.setStatus(id,'error',statusText(kind,null,false));return}
 if(showLoading)CFSubsUI.setStatus(id,'pending','⏳ 状态检测中');
 CFSubsUI.checkAvailability(kind,value).then(function(result){
  if(currentValue(kind)!==value)return;
  var info=result.info,ok=result.ok;
  if(api){var ver=$('apiVersion');if(ver)ver.textContent=ok&&info&&info.version?String(info.version).trim():'无法获取版本'}
  CFSubsUI.setLink(api?'apiCurrent':'configCurrent',value,ok);
  CFSubsUI.setStatus(id,ok?'success':'error',statusText(kind,info,ok));
  if(ok){if(statusTimers[kind])window.clearTimeout(statusTimers[kind]);statusTimers[kind]=null}
  else scheduleStatus(kind,10000)
 }).catch(function(){
  if(currentValue(kind)!==value)return;
  if(api){var ver=$('apiVersion');if(ver)ver.textContent='无法获取版本'}
  CFSubsUI.setLink(api?'apiCurrent':'configCurrent',value,false);
  CFSubsUI.setStatus(id,'error',api?'❌ SUBAPI检测失败':'❌ SUBCONFIG检测失败');scheduleStatus(kind,10000)
 });
}
function onPickerChange(kind){
 var api=kind==='api',picker=$(api?'apiPicker':'configPicker');if(!picker)return;
 if(picker.value==='__custom'){var input=$(api?'customApiInput':'customConfigInput');if(input)input.value=api?PUBLIC_STATE.apiUrl:PUBLIC_STATE.configUrl; var modal=$(api?'customApiModal':'customConfigModal');if(modal)openModal(modal);if(input)setTimeout(function(){input.focus()},0);updateCurrent(kind);return}
 if(api){PUBLIC_STATE.apiId=currentId('api');PUBLIC_STATE.apiCustom=false;PUBLIC_STATE.apiUrl=''}else{PUBLIC_STATE.configId=currentId('config');PUBLIC_STATE.configCustom=false;PUBLIC_STATE.configUrl=''}
 updateCurrent(kind);checkStatus(kind,true)
}
function openCustom(kind){var api=kind==='api',input=$(api?'customApiInput':'customConfigInput'),modal=$(api?'customApiModal':'customConfigModal');if(input)input.value=api?PUBLIC_STATE.apiUrl:PUBLIC_STATE.configUrl;if(modal)openModal(modal);if(input)setTimeout(function(){input.focus()},0)}
function cancelCustom(kind){
 var api=kind==='api',picker=$(api?'apiPicker':'configPicker');
 if(api){PUBLIC_STATE.apiCustom=false;PUBLIC_STATE.apiUrl=''}else{PUBLIC_STATE.configCustom=false;PUBLIC_STATE.configUrl=''}
 var defaultId=picker&&picker.dataset?picker.dataset.defaultId:'';var option=null;if(picker){for(var i=0;i<picker.options.length;i++){if(String(picker.options[i].dataset.id||'')===String(defaultId)){option=picker.options[i];break}}if(!option&&picker.options.length)option=picker.options[0];}
 if(option){picker.value=option.value;if(api)PUBLIC_STATE.apiId=String(option.dataset.id||'');else PUBLIC_STATE.configId=String(option.dataset.id||'')}
 var modal=$(api?'customApiModal':'customConfigModal');if(modal)closeModal(modal);updateCurrent(kind);checkStatus(kind,true)
}
function saveCustom(kind){
 var api=kind==='api',input=$(api?'customApiInput':'customConfigInput'),value=input?input.value.trim():'';if(api&&!/^https?:\/\//i.test(value))value='https://'+value;if(!/^https?:\/\//i.test(value)){alertCC('URL 必须以 http:// 或 https:// 开头');return}
 if(api){PUBLIC_STATE.apiUrl=value;PUBLIC_STATE.apiCustom=true;PUBLIC_STATE.apiId='';$('apiPicker').value='__custom'}else{PUBLIC_STATE.configUrl=value;PUBLIC_STATE.configCustom=true;PUBLIC_STATE.configId='';$('configPicker').value='__custom'}
 var modal=$(api?'customApiModal':'customConfigModal');if(modal)closeModal(modal);updateCurrent(kind);checkStatus(kind,true)
}
function randomLinkPath(){
 try{if(crypto&&crypto.randomUUID)return crypto.randomUUID()}catch(e){}
 return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)})
}
function focusUnlessMobile(input){if(input&&!(window.matchMedia&&window.matchMedia('(max-width: 600px)').matches))input.focus()}
function initPublic(){
 if(window.__CF_SUBS_PUBLIC_READY)return;window.__CF_SUBS_PUBLIC_READY=true;
 var ap=$('apiPicker'),cp=$('configPicker');
 var noAdsInput=$('noAds'),noAdsCount=$('noAdsCount');
 function updateNoAdsCount(){if(noAdsCount)noAdsCount.textContent='\u5C4F\u853D\u89C4\u5219\u6570 '+(noAdsInput?noAdsInput.value.split(/\r?\n/).filter(function(line){return line.trim()}).length:0)}
 if(noAdsInput)noAdsInput.addEventListener('input',updateNoAdsCount);
 updateNoAdsCount();
 CFSubsUI.bindExpandToggles();
 var randomPath=$('randomLinkPath'),pathInput=$('linkPath');if(randomPath&&pathInput)randomPath.addEventListener('click',function(){pathInput.value=randomLinkPath();focusUnlessMobile(pathInput)});
 if(ap){PUBLIC_STATE.apiId=currentId('api');CFSubsUI.bindSelectChange(ap,function(){onPickerChange('api')})}
 if(cp){PUBLIC_STATE.configId=currentId('config');CFSubsUI.bindSelectChange(cp,function(){onPickerChange('config')})}
 var e=$('editApiCustom');if(e)e.addEventListener('click',function(){openCustom('api')});e=$('editConfigCustom');if(e)e.addEventListener('click',function(){openCustom('config')});
 e=$('cancelApiCustom');if(e)e.addEventListener('click',function(){cancelCustom('api')});e=$('cancelConfigCustom');if(e)e.addEventListener('click',function(){cancelCustom('config')});
 e=$('saveApiCustom');if(e)e.addEventListener('click',function(){saveCustom('api')});e=$('saveConfigCustom');if(e)e.addEventListener('click',function(){saveCustom('config')});
 updateCurrent('api');updateCurrent('config');checkStatus('api',true);checkStatus('config',true);renderGeneratedLinks();
 window.addEventListener('focus',syncGeneratedLinks);
 document.addEventListener('visibilitychange',function(){if(!document.hidden)syncGeneratedLinks()});
 function renderAggregateQr(value){var q=$('aggregateResultQr');if(!q||!value)return;var draw=function(){if(!window.QRCode)return false;q.innerHTML='';q.style.display='block';try{new QRCode(q,{text:value,width:220,height:220,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.Q});return true}catch(err){q.innerHTML='';return false}};if(draw())return;var src='https://cdn.jsdelivr.net/npm/@keeex/qrcodejs-kx@1.0.2/qrcode.min.js';var script=document.querySelector('script[src="'+src+'"]');if(!script){script=document.createElement('script');script.src=src;script.onload=function(){draw()};document.head.appendChild(script)}else{var timer=window.setInterval(function(){if(draw())window.clearInterval(timer)},100);window.setTimeout(function(){window.clearInterval(timer)},5000)}}
 e=$('copyDirect');if(e)e.addEventListener('click',function(){var a=$('direct'),v=a?a.textContent.trim():'';var done=function(){e.textContent='已复制';aggregateNotice('已复制');window.setTimeout(function(){if(e)e.textContent='复制'},1600)};var fail=function(){aggregateNotice('复制失败，请手动复制',true)};if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(v).then(done).catch(fail);else{var ta=document.createElement('textarea');ta.value=v;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}catch(err){fail()}ta.remove()}});e=$('destroyDirect');if(e)e.addEventListener('click',function(){var token=tokenFromSubscriptionUrl(($('direct')||{}).href||'');var key=String(CURRENT_DESTROY_KEY||'');destroyGeneratedLink(token,e,true,key,false)});e=$('aggregateResultClose');if(e)e.addEventListener('click',closeAggregateResult);var rm=$('aggregateResultModal');if(rm){rm.addEventListener('click',function(ev){if(ev.target===rm)closeAggregateResult()});document.addEventListener('keydown',function(ev){if(ev.key==='Escape')closeAggregateResult()})}
 e=$('generate');if(e)e.addEventListener('click',function(){
  var sources=$('sources')?$('sources').value.trim():'',a=$('apiPicker'),c=$('configPicker');if(!a||!c)return;
  var apiCustom=a.value==='__custom',configCustom=c.value==='__custom',apiValue=currentValue('api'),configValue=currentValue('config');
  if(!sources)return alertCC('请输入订阅链接');if(!apiValue)return alertCC('请选择订阅转换后端');if(!configValue)return alertCC('请选择订阅转换规则');
  var pathInput=$('linkPath'),path=pathInput?pathInput.value.trim():'';if(!path){path=randomLinkPath();if(pathInput)pathInput.value=path}if(path.length<3)return alertCC('自定义链接路径至少需要 3 个字符');var updateInput=$('recommendedUpdateMinutes'),updateMinutes=Number(updateInput?updateInput.value:DEFAULT_UPDATE_MINUTES);if(!Number.isSafeInteger(updateMinutes)||updateMinutes<0||updateMinutes>525600)return alertCC('推荐更新时间必须是 0 到 525600 之间的整数分钟');var destroyKey=($('destroyKey')?$('destroyKey').value:'').trim();CURRENT_DESTROY_KEY=destroyKey;var body={path:path,sources:sources,apiIds:apiCustom?[]:[currentId('api')],apiCustom:apiCustom,apiUrl:apiCustom?apiValue:'',configIds:configCustom?[]:[currentId('config')],configCustom:configCustom,configUrl:configCustom?configValue:'',name:($('linkName')?$('linkName').value:'').trim(),noAds:($('noAds')?$('noAds').value:'').trim(),update:updateMinutes,updateEnable:$('recommendedUpdateEnable')?$('recommendedUpdateEnable').checked:true,destroyKey:destroyKey};
  var button=$('generate');CFSubsUI.setButtonBusy(button,true,'生成聚合订阅链接');
  fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify(body)}).then(function(r){return r.json().then(function(d){return {r:r,d:d}})}).then(function(x){if(!x.r.ok||!x.d.ok)throw new Error(x.d.error||'生成失败');rememberGeneratedLink(x.d.subscription_url);$('direct').textContent=x.d.subscription_url;$('direct').href=x.d.subscription_url;var resultModal=$('aggregateResultModal');if(resultModal){openModal(resultModal);var copyButton=$('copyDirect');if(copyButton)copyButton.textContent='复制';var destroyButton=$('destroyDirect');if(destroyButton){destroyButton.textContent='销毁';destroyButton.disabled=false}renderAggregateQr(x.d.subscription_url)}}).catch(function(err){alertCC(err.message||'生成失败')}).finally(function(){CFSubsUI.setButtonBusy(button,false)})
 })
}

/* ---------- SUB-UI admin ---------- */
var modalState=null;
function showProvider(type,id,name,url){modalState={type:type,id:id||''};var t=$('modalTitle');if(t)t.textContent=(id?'编辑 ':'添加 ')+(type==='subapi'?'订阅转换后端':'订阅转换规则');if($('modalName'))$('modalName').value=name||'';if($('modalUrl'))$('modalUrl').value=url||'';openModal('providerModal')}
function hideProvider(){closeModal('providerModal');modalState=null}
function post(data){return fetch('/api/admin',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify(data)}).then(function(r){return r.text().then(function(t){var d=null;try{d=t?JSON.parse(t):null}catch(e){}if(!d)throw new Error('服务器返回无效数据（HTTP '+r.status+'）');if(!r.ok||d.ok===false)throw new Error(d.error||('操作失败（HTTP '+r.status+'）'));return d})})}
function setDefaultProvider(type,id){post({type:type+'_default',id:id}).then(function(){toast('默认配置已更新')}).catch(function(e){alertCC(e.message||'设置默认配置失败')})}
function renderProviderSection(type,items,defaultId){
 var list=document.querySelector('.provider-list[data-provider-type="'+type+'"]');if(!list)return;
 var section=list.closest('.provider-section'),select=section.querySelector('.default-provider-select'),count=section.querySelector('.provider-count');
 if(select){select.replaceChildren();if(items.length){items.forEach(function(item){var option=document.createElement('option');option.value=item.id;option.textContent=item.name;select.appendChild(option)});select.value=defaultId||items[0].id}else{var emptyOption=document.createElement('option');emptyOption.value='';emptyOption.textContent='暂无配置';select.appendChild(emptyOption)}}
 if(count)count.textContent='配置数 '+items.length;
 list.replaceChildren();
 if(!items.length){var empty=document.createElement('div');empty.className='empty';empty.textContent=type==='subapi'?'暂无订阅转换后端，请手动添加。':'暂无订阅转换规则，请手动添加。';list.appendChild(empty)}
 items.forEach(function(item){
  var row=document.createElement('div');row.className='link-item provider-item';row.draggable=true;row.dataset.providerId=item.id;
  var handle=document.createElement('div');handle.className='drag-handle';handle.title='拖动排序';handle.setAttribute('aria-label','拖动排序');handle.textContent='⠿';row.appendChild(handle);
  var main=document.createElement('div');main.className='provider-main';var name=document.createElement('div');name.className='link-label';name.textContent=item.name;var link=document.createElement('a');link.className='provider-url link-url';link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=item.url;main.append(name,link);row.appendChild(main);
  var actions=document.createElement('div');actions.className='actions admin-row-actions';
  [['edit','secondary','编辑'],['delete','danger','删除']].forEach(function(entry){var button=document.createElement('button');button.type='button';button.className=entry[1];button.dataset.providerAction=entry[0];button.dataset.providerType=type;button.dataset.providerId=item.id;if(entry[0]==='edit'){button.dataset.providerName=item.name;button.dataset.providerUrl=item.url}button.textContent=entry[2];actions.appendChild(button)});
  row.appendChild(actions);list.appendChild(row)
 });
 CFSubsUI.normalizeControls(section);window['__cfsubs_order_'+type]=items.map(function(item){return item.id}).join(',');initProviderDrag(section)
}
function updateProviderSection(type,result){renderProviderSection(type,result.items||[],result.defaultId||'')}
function restoreProviderSection(type){return fetch('/api/ui-config',{cache:'no-store'}).then(function(response){if(!response.ok)throw new Error('恢复原排序失败（HTTP '+response.status+'）');return response.json()}).then(function(config){if(!config.ok)throw new Error(config.error||'恢复原排序失败');var isApi=type==='subapi',items=isApi?config.subApis:config.subConfigs;if(!Array.isArray(items))throw new Error('服务器返回的配置列表无效');updateProviderSection(type,{items:items,defaultId:isApi?config.defaultSubApiId:config.defaultSubConfigId})})}
function deleteProvider(type,id){if(!confirm('确定删除这个项目？'))return;post({type:type+'_delete',id:id}).then(function(result){updateProviderSection(type,result);toast('已删除')}).catch(function(e){alertCC(e.message||'删除失败')})}
function saveProvider(){if(!modalState)return;var name=$('modalName')?$('modalName').value.trim():'',url=$('modalUrl')?$('modalUrl').value.trim():'';if(!name)return alertCC('请输入备注');if(modalState.type==='subapi'&&!/^https?:\/\//i.test(url))url='https://'+url;if(!/^https?:\/\//i.test(url))return alertCC('URL 必须以 http:// 或 https:// 开头');var b=$('modalSave'),type=modalState.type,editing=Boolean(modalState.id);CFSubsUI.setButtonBusy(b,true,'保存中...');post({type:type+'_'+(editing?'update':'create'),id:modalState.id,name:name,url:url}).then(function(result){hideProvider();updateProviderSection(type,result);toast(editing?'已保存':'已添加')}).catch(function(e){alertCC(e.message||'保存失败')}).finally(function(){CFSubsUI.setButtonBusy(b,false)})}
function saveSecurity(){var user=$('securityUser')?$('securityUser').value.trim():'',pass=$('securityPass')?$('securityPass').value:'',pass2=$('securityPass2')?$('securityPass2').value:'';if(!user)return alertCC('管理员账号不能为空');if(pass!==pass2)return alertCC('两次输入的密码不一致');var b=$('saveSecurity');CFSubsUI.setButtonBusy(b,true,'保存中...');post({type:'security',user:user,pass:pass}).then(function(){closeModal('securityModal');toast('安全设置已保存');setTimeout(function(){location.reload()},700)}).catch(function(e){alertCC(e.message||'保存失败')}).finally(function(){CFSubsUI.setButtonBusy(b,false)})}
function updateSiteIdentity(name,logo){var title=name+' · 管理后台',display=document.querySelector('.site-title-display'),icon=document.querySelector('link[rel="icon"]');if(display)display.textContent=name;document.title=title;var href=String(logo||'').trim();if(!href){var initial=Array.from(title.trim())[0]||'S',svg='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2f6f54"/><text x="32" y="33" fill="#fff" font-family="Arial,sans-serif" font-size="38" font-weight="700" text-anchor="middle" dominant-baseline="central">'+initial.replace(/[&<>\"']/g,'')+'</text></svg>';href='data:image/svg+xml,'+encodeURIComponent(svg)}if(!icon){icon=document.createElement('link');icon.rel='icon';document.head.appendChild(icon)}icon.href=href}
function saveSiteSettings(){var name=$('siteName')?$('siteName').value.trim()||'SUB':'SUB',path=$('sitePath')?$('sitePath').value.trim():'',logo=$('siteLogo')?$('siteLogo').value.trim():'';if(!/^[A-Za-z0-9_-]{2,60}$/.test(path))return alertCC('管理员路径只能使用 2-60 个字母、数字、下划线或短横线');if(logo&&!/^https?:\/\//i.test(logo))return alertCC('站点标签栏 Logo 必须是 http:// 或 https:// URL');var b=$('saveSite'),currentPath=document.querySelector('.admin-shell').dataset.adminPath;CFSubsUI.setButtonBusy(b,true,'保存中...');post({type:'site_settings',subName:name,adminPath:path,siteLogo:logo}).then(function(d){closeModal('siteModal');toast('站点设置已保存');if(d.adminPath!==currentPath){location.href='/'+d.adminPath;return}updateSiteIdentity(d.subName,d.siteLogo)}).catch(function(e){alertCC(e.message||'保存失败')}).finally(function(){CFSubsUI.setButtonBusy(b,false)})}
function saveProviderOrder(type,items){var order=items.map(function(el){return el.dataset.providerId}).filter(Boolean);if(!order.length)return Promise.resolve();return post({type:type+'_reorder',order:order})}
function initProviderDrag(root){
 (root||document).querySelectorAll('.provider-list').forEach(function(list){
  var dragged=null,touchDragging=false,touchMoved=false;
  function clearDrag(){if(dragged)dragged.classList.remove('dragging');list.querySelectorAll('.provider-item').forEach(function(x){x.classList.remove('drag-over')});dragged=null;touchDragging=false;touchMoved=false}
  function saveOrder(){
   var type=list.dataset.providerType,all=Array.from(list.querySelectorAll('.provider-item')),order=all.map(function(x){return x.dataset.providerId}).filter(Boolean),changed=order.join(','),key='__cfsubs_order_'+type,old=window[key]||'';
   if(!order.length||changed===old)return;
   window[key]=changed;list.classList.add('saving-order');
   saveProviderOrder(type,all).then(function(result){updateProviderSection(type,result);toast('排序已保存')}).catch(function(err){alertCC(err.message||'排序保存失败');restoreProviderSection(type).catch(function(refreshError){alertCC(refreshError.message||'恢复原排序失败',true)})}).finally(function(){list.classList.remove('saving-order')})
  }
  list.querySelectorAll('.provider-item[draggable="true"]').forEach(function(item){
   item.addEventListener('dragstart',function(e){dragged=item;item.classList.add('dragging');if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',item.dataset.providerId||'')}});
   item.addEventListener('dragend',function(){saveOrder();clearDrag()});
   item.addEventListener('dragover',function(e){e.preventDefault();if(!dragged||dragged===item)return;var r=item.getBoundingClientRect();var before=e.clientY<r.top+r.height/2;list.insertBefore(dragged,before?item:item.nextSibling);list.querySelectorAll('.provider-item').forEach(function(x){x.classList.remove('drag-over')});item.classList.add('drag-over')});
   item.addEventListener('drop',function(e){e.preventDefault();if(!dragged)return;item.classList.remove('drag-over');saveOrder()});
   var handle=item.querySelector('.drag-handle');
   if(handle){
    handle.addEventListener('touchstart',function(e){if(!e.touches||!e.touches[0])return;dragged=item;touchDragging=true;touchMoved=false;item.classList.add('dragging')},{passive:true});
    handle.addEventListener('touchmove',function(e){if(!touchDragging||!dragged||!e.touches[0])return;touchMoved=true;if(e.cancelable)e.preventDefault();var y=e.touches[0].clientY;var target=null;list.querySelectorAll('.provider-item').forEach(function(x){if(x===dragged)return;var r=x.getBoundingClientRect();if(y>=r.top&&y<=r.bottom)target=x});if(target){var r=target.getBoundingClientRect();var before=y<r.top+r.height/2;list.insertBefore(dragged,before?target:target.nextSibling);list.querySelectorAll('.provider-item').forEach(function(x){x.classList.remove('drag-over')});target.classList.add('drag-over')}},{passive:false});
    handle.addEventListener('touchend',function(){if(!touchDragging)return;list.querySelectorAll('.provider-item').forEach(function(x){x.classList.remove('drag-over')});if(touchMoved)saveOrder();clearDrag()});
    handle.addEventListener('touchcancel',function(){clearDrag()});
   }
  });
 });
}
function initAdmin(){
 if(window.__CF_SUBS_ADMIN_READY)return;window.__CF_SUBS_ADMIN_READY=true;
 document.querySelectorAll('[data-open-modal]').forEach(function(b){b.addEventListener('click',function(){openModal(b.dataset.openModal)})});
 document.querySelectorAll('[data-close-modal]').forEach(function(b){b.addEventListener('click',function(){closeModal(b.dataset.closeModal)})});
 CFSubsUI.bindExpandToggles();
 var adminShell=document.querySelector('.admin-shell');if(adminShell)adminShell.addEventListener('click',function(event){var b=event.target.closest('[data-provider-action]');if(!b)return;var action=b.dataset.providerAction,type=b.dataset.providerType||'',id=b.dataset.providerId||'';if(action==='add')showProvider(type,'','','');else if(action==='edit')showProvider(type,id,b.dataset.providerName||'',b.dataset.providerUrl||'');else if(action==='delete')deleteProvider(type,id)});
 var e=$('providerCancel');if(e)e.addEventListener('click',hideProvider);e=$('modalSave');if(e)e.addEventListener('click',saveProvider);e=$('saveSecurity');if(e)e.addEventListener('click',saveSecurity);e=$('saveSite');if(e)e.addEventListener('click',saveSiteSettings);
 document.querySelectorAll('.default-provider-select').forEach(function(select){CFSubsUI.bindSelectChange(select,function(value){setDefaultProvider(select.dataset.type,value)})});
 initProviderDrag();
 document.querySelectorAll('.modal-overlay').forEach(function(m){m.addEventListener('click',function(e){if(e.target===m)closeModal(m)})});
}

function boot(){
 CFSubsUI.normalizeControls(document);
 if($('apiPicker')||$('generate'))initPublic();
 if(document.querySelector('[data-provider-action]')||$('saveSecurity')||$('saveSite'))initAdmin();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
`;
async function handleRequest(request, env) {
  const url = getCanonicalRequestUrl(request);
  const queryToken = url.searchParams.get("token") || "";
  const userAgent = (request.headers.get("User-Agent") || "").toLowerCase();
  let adminUser = "";
  let adminPass = "";
  let adminPath = DEFAULT_ADMIN_PATH;
  SITELOGO = "";
  if (env.KV) {
    const kvConfig = await getConfig(env);
    FILENAME = kvConfig.subName || "SUB";
    adminUser = kvConfig.user || adminUser;
    adminPass = kvConfig.pass || adminPass;
    adminPath = normalizeAdminPath(kvConfig.adminPath) || DEFAULT_ADMIN_PATH;
    SITELOGO = String(kvConfig.siteLogo || "");
  }
  if (url.searchParams.has("logout") || url.pathname === `/${adminPath}/logout`) {
    return new Response(null, {
      status: 302,
      headers: {
        "Location": "/",
        "Cache-Control": "no-store",
        "Set-Cookie": "CF_SUB_ADMIN=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax"
      }
    });
  }
  if (url.pathname === "/__cfsubs.js" && request.method === "GET") {
    return new Response(CF_SUBS_CLIENT_SCRIPT, {
      headers: {
        "Content-Type": "application/javascript; charset=UTF-8",
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    });
  }
  if (url.pathname === "/api/ui-config" && request.method === "GET") {
    const cfg = await getConfig(env);
    return jsonResponse({
      ok: true,
      subApis: normalizeProviderList(cfg.subApis),
      subConfigs: normalizeProviderList(cfg.subConfigs),
      defaultSubApiId: String(cfg.defaultSubApiId || ""),
      defaultSubConfigId: String(cfg.defaultSubConfigId || "")
    });
  }
  if (url.pathname === "/api/status" && request.method === "GET") {
    const api = String(url.searchParams.get("api") || "").trim();
    const config = String(url.searchParams.get("config") || "").trim();
    if (!api && !config) return jsonResponse({ ok: false, error: "\u7F3A\u5C11 SUBAPI \u6216 SUBCONFIG" }, 400);
    return jsonResponse({ ok: true, ...await probeBackend(api, config) });
  }
  if (url.pathname === "/api/generate" && request.method === "POST") {
    return await handlePublicGenerate(request, env, url);
  }
  if (url.pathname === "/api/destroy" && request.method === "POST") {
    return await handlePublicDestroy(request, env);
  }
  if (url.pathname === "/api/update-generated-link" && request.method === "POST") {
    return await handlePublicUpdate(request, env);
  }
  if (url.pathname === "/api/verify-generated-link-edit" && request.method === "POST") {
    return await handlePublicEditAccess(request, env);
  }
  if (url.pathname === "/api/generated-links/check" && request.method === "POST") {
    try {
      const data = await request.json();
      const input = Array.isArray(data?.tokens) ? data.tokens : [];
      const tokens = [...new Set(input.map((x) => String(x || "").trim()).filter((x) => /^[A-Za-z0-9]+$/.test(x) && x.length <= 128))].slice(0, 100);
      const existing = [];
      for (const token of tokens) {
        if (await getToken(env, token)) existing.push(token);
      }
      return jsonResponse({ ok: true, tokens: existing });
    } catch (e) {
      return jsonResponse({ ok: false, error: e?.message || String(e) }, 400);
    }
  }
  if (url.pathname === "/api/admin" && request.method === "POST") {
    if (isAdminLoginEnabled(adminUser, adminPass)) {
      const isLoggedIn = await isAdminLoggedIn(request, APP_ID, adminUser, adminPass);
      if (!isLoggedIn) return jsonResponse({ ok: false, error: "\u672A\u767B\u5F55\u6216\u767B\u5F55\u5DF2\u8FC7\u671F" }, 401);
    }
    return await handleAdmin(request, env, {
      adminUser,
      adminPass,
      adminPath,
      mytoken: APP_ID,
      url
    });
  }
  if (url.pathname === `/${adminPath}/URLS`) {
    if (isAdminLoginEnabled(adminUser, adminPass)) {
      const isLoggedIn = await isAdminLoggedIn(request, APP_ID, adminUser, adminPass);
      if (!isLoggedIn) {
        return new Response(renderLoginPage(url), {
          headers: {
            "Content-Type": "text/html;charset=utf-8",
            "Cache-Control": "no-store"
          }
        });
      }
    }
    if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405 });
    const items = await listJsonManagerItems(env, "", url.origin);
    const managerConfig = await getConfig(env);
    return new Response(renderGeneratedLinksManagerPage(items, adminPath, managerConfig), {
      headers: {
        "Content-Type": "text/html;charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }
  if (url.pathname === `/${adminPath}/json`) {
    if (isAdminLoginEnabled(adminUser, adminPass)) {
      const isLoggedIn = await isAdminLoggedIn(request, APP_ID, adminUser, adminPass);
      if (!isLoggedIn) {
        return new Response(renderLoginPage(url), {
          headers: {
            "Content-Type": "text/html;charset=utf-8",
            "Cache-Control": "no-store"
          }
        });
      }
    }
    if (request.method === "POST") return await handleAdmin(request, env, { adminPath });
    if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405 });
    const entries = await listKVEntries(env);
    return new Response(renderJsonManagerPage(entries, adminPath, Boolean(adminUser || adminPass)), {
      headers: {
        "Content-Type": "text/html;charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }
  if (url.pathname === `/${adminPath}`) {
    if (isAdminLoginEnabled(adminUser, adminPass)) {
      const isLoggedIn = await isAdminLoggedIn(request, APP_ID, adminUser, adminPass);
      if (!isLoggedIn) {
        if (request.method === "POST") {
          return await handleAdminLogin(request, url, APP_ID, adminUser, adminPass);
        }
        return new Response(renderLoginPage(url), {
          headers: {
            "Content-Type": "text/html;charset=utf-8",
            "Cache-Control": "no-store"
          }
        });
      }
    }
    return await handleAdmin(request, env, {
      adminUser,
      adminPass,
      adminPath
    });
  }
  const currentDate = /* @__PURE__ */ new Date();
  currentDate.setHours(0, 0, 0, 0);
  const fakeToken = await MD5MD5(`${INTERNAL_TOKEN_SEED}${Math.ceil(currentDate.getTime() / 1e3)}`);
  let publicToken = queryToken;
  if (!publicToken && url.pathname !== "/") {
    try {
      publicToken = decodeURIComponent(url.pathname.slice(1));
    } catch {
      return Response.redirect(url.origin + "/", 302);
    }
  }
  const isFakeTokenRequest = publicToken === fakeToken || url.pathname === `/${fakeToken}`;
  if (isFakeTokenRequest && url.searchParams.has("sourceToken")) {
    const sourceToken = url.searchParams.get("sourceToken") || "";
    const sourceData = await getToken(env, sourceToken);
    if (!sourceData) return new Response("内部订阅来源不存在。", { status: 404 });
    const sourceResult = await collectSubscriptionSources(
      sourceData.sources || [],
      request,
      "v2rayn",
      request.headers.get("User-Agent") || ""
    );
    return new Response(
      encodeBase64(filterSubscriptionNodes(sourceResult.nodes, sourceData.noAds).join("\n")),
      { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } }
    );
  }
  if (publicToken && !isFakeTokenRequest) {
    const tokenData = await getToken(env, publicToken);
    if (tokenData) {
      const isProxyClientUA = [
        "clash", "meta", "mihomo", "sing-box", "singbox", "surge",
        "quantumult", "loon", "nekobox", "v2rayn", "v2rayng",
        "shadowrocket", "subconverter"
      ].some((keyword) => userAgent.includes(keyword));
      if (request.method === "GET" && !url.search && userAgent.includes("mozilla") && !isProxyClientUA) {
        const guestConfig = await getConfig(env);
        const guestPage = renderCFSubsGuestPage(url, tokenData.url, Boolean(tokenData.destroyKeyHash), SITELOGO, tokenData.name);
        return new Response(guestPage.replace("</body>", `${renderGuestEditFeature(tokenData, guestConfig)}</body>`), {
          headers: {
            "Content-Type": "text/html; charset=UTF-8",
            "Cache-Control": "no-store"
          }
        });
      }
      return await generateSubscription(request, env, url, tokenData, publicToken, userAgent, fakeToken);
    }
  }
  if (url.pathname !== "/" || queryToken) return Response.redirect(url.origin + "/", 302);
  const page = await renderSubUIHome(request, url, env);
  return new Response(page, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "no-store"
    }
  });
}
__name(handleRequest, "handleRequest");
function getCanonicalRequestUrl(request) {
  const url = new URL(request.url);
  let forwardedScheme = "";
  const cfVisitor = request.headers.get("cf-visitor");
  if (cfVisitor) {
    try {
      forwardedScheme = JSON.parse(cfVisitor).scheme;
    } catch {
      forwardedScheme = "";
    }
  }
  if (forwardedScheme !== "http" && forwardedScheme !== "https") {
    forwardedScheme = (request.headers.get("x-forwarded-proto") || "").split(",")[0].trim().toLowerCase();
  }
  if (forwardedScheme === "http" || forwardedScheme === "https") {
    url.protocol = `${forwardedScheme}:`;
  } else if (
    url.protocol === "http:" &&
    url.hostname !== "localhost" &&
    !url.hostname.endsWith(".localhost") &&
    !url.hostname.endsWith(".local") &&
    !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(url.hostname) &&
    !url.hostname.startsWith("[")
  ) {
    url.protocol = "https:";
  }
  return url;
}
__name(getCanonicalRequestUrl, "getCanonicalRequestUrl");
async function generateSubscription(request, env, requestUrl, tokenData, token, userAgent, fakeToken) {
  const isSubConverterRequest = request.headers.has("subconverter-request") ||
    request.headers.has("subconverter-version") || userAgent.includes("subconverter");
  let target = "base64";
  if (!(userAgent.includes("null") || isSubConverterRequest || userAgent.includes("nekobox") || userAgent.includes("cf-sub"))) {
    if (userAgent.includes("sing-box") || userAgent.includes("singbox")) target = "singbox";
    else if (userAgent.includes("surge")) target = "surge";
    else if (userAgent.includes("quantumult")) target = "quanx";
    else if (userAgent.includes("loon")) target = "loon";
    else if (userAgent.includes("clash") || userAgent.includes("meta") || userAgent.includes("mihomo")) target = "clash";
  }
  if (requestUrl.searchParams.has("b64") || requestUrl.searchParams.has("base64")) target = "base64";
  else if (requestUrl.searchParams.has("clash")) target = "clash";
  else if (requestUrl.searchParams.has("sb") || requestUrl.searchParams.has("singbox")) target = "singbox";
  else if (requestUrl.searchParams.has("surge")) target = "surge";
  else if (requestUrl.searchParams.has("quanx")) target = "quanx";
  else if (requestUrl.searchParams.has("loon")) target = "loon";

  const sources = cleanSourceList(tokenData.sources || []);
  const headers = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "Profile-web-page-url": `${requestUrl.origin}${requestUrl.pathname}`
  };
  if (normalizeUpdateEnabled(tokenData.updateEnable)) {
    const minutes = Number(tokenData.update ?? DEFAULT_UPDATE_MINUTES);
    headers["Profile-Update-Interval"] = String((Number.isSafeInteger(minutes) && minutes >= 0 ? minutes : DEFAULT_UPDATE_MINUTES) * 60);
  }
  if (!sources.length) return new Response("此订阅链接没有启用的聚合来源。", { status: 404, headers });

  const sourceData = await collectSubscriptionSources(
    sources,
    request,
    subscriptionUserAgent(target),
    subscriptionUserAgent("base64")
  );
  if (!sourceData.nodes.length && !sourceData.structuredUrls.length) {
    return new Response("订阅源均无法读取，请检查来源地址后重试。", { status: 502, headers });
  }
  const rawResult = filterSubscriptionNodes(sourceData.nodes, tokenData.noAds).join("\n");
  if (target === "base64") {
    let result = rawResult;
    if (sourceData.structuredUrls.length) {
      try {
        const converted = await fetchConvertedSubscription(
          await getSubscriptionRuntime(env, tokenData, fakeToken),
          "mixed",
          sourceData.structuredUrls.join("|"),
          request.headers.get("User-Agent") || ""
        );
        result = filterSubscriptionNodes(
          [...sourceData.nodes, ...splitSubscriptionLines(converted)],
          tokenData.noAds
        ).join("\n");
      } catch (error) {
        console.error("Base64 subscription conversion failed:", error);
        return new Response(`Base64 订阅生成失败：${getSubscriptionErrorMessage(error)}`, { status: 502, headers });
      }
    }
    return new Response(encodeBase64(result), { headers });
  }

  try {
    const runtime = await getSubscriptionRuntime(env, tokenData, fakeToken);
    const sourceToken = requestUrl.searchParams.get("sourceToken") || token;
    const internalFeed = new URL(`/${encodeURIComponent(runtime.fakeToken)}`, requestUrl.origin);
    internalFeed.searchParams.set("token", runtime.fakeToken);
    if (sourceToken) internalFeed.searchParams.set("sourceToken", sourceToken);
    const converterInput = [internalFeed.href, ...sourceData.structuredUrls].join("|");
    let content = await fetchConvertedSubscription(runtime, target, converterInput, subscriptionUserAgent(target));
    if (target === "clash") content = clashFix(content);
    if (!userAgent.includes("mozilla")) {
      headers["Content-Disposition"] = `attachment; filename*=utf-8''${encodeURIComponent(FILENAME)}`;
    }
    return new Response(content, { headers });
  } catch (error) {
    console.error(`Subscription conversion failed (${target}):`, error);
    return new Response(`订阅格式转换失败（${target}）：${getSubscriptionErrorMessage(error)}`, { status: 502, headers });
  }
}
__name(generateSubscription, "generateSubscription");
async function getSubscriptionRuntime(env, tokenData, fakeToken) {
  const config = await getConfig(env);
  const resolveUrl = (reference, providers) => {
    const first = Array.isArray(reference) ? reference[0] : reference;
    const id = String(first?.ID || first?.id || "").trim().toUpperCase();
    return String(first?.URL || first?.url || providers.find((provider) => provider.id === id)?.url || "").trim();
  };
  const apiUrl = resolveUrl(tokenData.subApi, normalizeProviderList(config.subApis));
  const configUrl = resolveUrl(tokenData.subConfig, normalizeProviderList(config.subConfigs));
  if (!apiUrl) throw new Error("此订阅链接未配置有效的 SUBAPI");
  if (!configUrl) throw new Error("此订阅链接未配置有效的 SUBCONFIG");
  const protocol = /^http:\/\//i.test(apiUrl) ? "http" : "https";
  const api = apiUrl.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  return {
    effectiveSubConverter: api,
    effectiveSubConfig: configUrl,
    effectiveSubProtocol: protocol,
    fakeToken
  };
}
__name(getSubscriptionRuntime, "getSubscriptionRuntime");
async function fetchConvertedSubscription(runtime, target, sourceUrl, userAgent) {
  const converterUrl = buildSubUrl(
    runtime.effectiveSubConverter,
    runtime.effectiveSubConfig,
    target,
    sourceUrl,
    runtime.effectiveSubProtocol
  );
  const response = await fetchWithTimeout(converterUrl, { headers: { "User-Agent": userAgent } }, 15e3);
  if (!response.ok) {
    const errorBody = (await response.text()).replace(/https?:\/\/\S+/gi, "[url]").replace(/\s+/g, " ").slice(0, 240);
    throw new Error(`SUBAPI 返回 HTTP ${response.status}${errorBody ? `: ${errorBody}` : ""}`);
  }
  const body = await response.text();
  if (target === "mixed") {
    if (isValidBase64(body.trim())) return base64Decode(body.trim());
    if (body.includes("://")) return body;
    throw new Error("SUBAPI mixed 响应不是有效的 Base64 或节点列表");
  }
  return body;
}
__name(fetchConvertedSubscription, "fetchConvertedSubscription");
function buildSubUrl(api, config, target, sourceUrl, protocol) {
  let url = `${protocol}://${api}/sub?target=${target}&url=${encodeURIComponent(sourceUrl)}&insert=false&config=${encodeURIComponent(config)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false`;
  if (target === "surge") url += "&ver=4&new_name=true";
  else if (target === "quanx") url += "&udp=true";
  else if (target === "clash" || target === "singbox" || target === "mixed") url += "&new_name=true";
  return url;
}
__name(buildSubUrl, "buildSubUrl");
function subscriptionUserAgent(target) {
  return ({ base64: "v2rayn", clash: "clash", singbox: "singbox", surge: "surge", quanx: "Quantumult%20X", loon: "Loon" })[target] || "v2rayn";
}
__name(subscriptionUserAgent, "subscriptionUserAgent");
function splitSubscriptionLines(value) {
  return String(value || "").replace(/[ "'|\r\n]+/g, "\n").split(/\n+/).filter(Boolean);
}
__name(splitSubscriptionLines, "splitSubscriptionLines");
function getSubscriptionErrorMessage(error) {
  return error instanceof Error ? error.message : String(error || "未知错误");
}
__name(getSubscriptionErrorMessage, "getSubscriptionErrorMessage");
async function collectSubscriptionSources(sourceList, request, additionalUserAgent, userAgentHeader) {
  const inlineSources = sourceList.filter((source) => !/^https?:\/\//i.test(source));
  const remoteSources = sourceList.filter((source) => /^https?:\/\//i.test(source));
  const nodes = inlineSources.flatMap((source) => splitSubscriptionLines(source));
  const structuredUrls = [];
  const results = await Promise.allSettled(remoteSources.map(async (source) => {
    const response = await getSubscriptionSource(request, source, additionalUserAgent, userAgentHeader);
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`来源返回 HTTP ${response.status}`);
    }
    return { source, content: (await response.text()).replace(/^\uFEFF/, "").trim() };
  }));
  for (let index = 0; index < results.length; index++) {
    const result = results[index];
    if (result.status === "rejected") {
      let origin = "invalid subscription URL";
      try { origin = new URL(remoteSources[index]).origin; } catch {}
      console.warn("Subscription source request failed:", origin, result.reason);
      continue;
    }
    const { source, content } = result.value;
    if (!content) continue;
    if (isStructuredSubscription(content)) {
      structuredUrls.push(source);
      continue;
    }
    let decoded = content;
    if (!content.includes("://") && isValidBase64(content)) {
      try { decoded = base64Decode(content.replace(/\s/g, "")); } catch (error) {
        console.warn("Subscription source Base64 decode failed:", source, error);
        continue;
      }
    }
    if (decoded.includes("://")) nodes.push(...splitSubscriptionLines(decoded).filter((line) => line.includes("://")));
    else console.warn("Subscription source format not recognized:", source);
  }
  return { nodes: [...new Set(nodes)], structuredUrls: [...new Set(structuredUrls)] };
}
__name(collectSubscriptionSources, "collectSubscriptionSources");
function isStructuredSubscription(content) {
  return /(?:^|\n)\s*proxies\s*:/i.test(content) ||
    /"(?:outbounds|inbounds)"\s*:/.test(content) ||
    /(?:^|\n)\s*proxy-providers\s*:/i.test(content);
}
__name(isStructuredSubscription, "isStructuredSubscription");
function filterSubscriptionNodes(nodes, noAds) {
  const keywords = String(noAds || "").split(/[, \r\n]+/).map((keyword) => keyword.trim().toLowerCase()).filter(Boolean);
  return [...new Set(nodes.filter((line) => {
    const lowerLine = line.toLowerCase();
    return !keywords.some((keyword) => lowerLine.includes(keyword));
  }))];
}
__name(filterSubscriptionNodes, "filterSubscriptionNodes");
async function getSubscriptionSource(request, targetUrl, additionalUserAgent, userAgentHeader) {
  let currentUrl = parsePublicHttpUrl(targetUrl);
  let method = request.method;
  const headers = new Headers({
    "User-Agent": `v2rayN/6.45 cmliu/CF-SUB ${additionalUserAgent}(${userAgentHeader})`,
    "Accept": "text/plain, application/json, */*"
  });
  const contentType = request.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);
  for (let redirectCount = 0; redirectCount <= 5; redirectCount++) {
    const outboundRequest = new Request(currentUrl.href, {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? null : request.clone().body,
      redirect: "manual"
    });
    const response = await fetchWithTimeout(outboundRequest, {}, 10e3);
    const location = response.headers.get("Location");
    if (![301, 302, 303, 307, 308].includes(response.status) || !location) return response;
    if (redirectCount === 5) {
      await response.body?.cancel();
      throw new Error("订阅源重定向次数超过限制");
    }
    currentUrl = parsePublicHttpUrl(new URL(location, currentUrl).href);
    if (response.status === 303 || ([301, 302].includes(response.status) && method === "POST")) method = "GET";
    await response.body?.cancel();
  }
  throw new Error("订阅源重定向次数超过限制");
}
__name(getSubscriptionSource, "getSubscriptionSource");
function parsePublicHttpUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("订阅源 URL 无效"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || isBlockedOutboundHostname(url.hostname)) {
    throw new Error("订阅源 URL 不允许访问");
  }
  return url;
}
__name(parsePublicHttpUrl, "parsePublicHttpUrl");
function isBlockedOutboundHostname(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const bareHost = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
      host.endsWith(".internal") || host.endsWith(".home") || host.endsWith(".lan") ||
      host.endsWith(".test") || host.endsWith(".invalid") || host.endsWith(".example") ||
      host.endsWith(".arpa") || host === "metadata.google" || host === "metadata.google.internal" ||
      host === "metadata.azure.internal" || host === "instance-data.ec2.internal") return true;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(bareHost)) {
    const [first, second, third] = bareHost.split(".").map(Number);
    return first === 0 || first === 10 || first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && (second === 0 || second === 2 || second === 168)) ||
      (first === 192 && second === 88 && third === 99) ||
      (first === 198 && (second === 18 || second === 19 || (second === 51 && third === 100))) ||
      (first === 203 && second === 0 && third === 113) || first >= 224;
  }
  if (bareHost.includes(":")) {
    const ipv6 = bareHost.toLowerCase();
    return ipv6 === "::" || ipv6 === "::1" || ipv6.startsWith("fc") || ipv6.startsWith("fd") ||
      /^fe[89ab]/.test(ipv6) || ipv6.startsWith("ff") || ipv6.startsWith("2001:db8:") || ipv6.startsWith("::ffff:");
  }
  return false;
}
__name(isBlockedOutboundHostname, "isBlockedOutboundHostname");
function isValidBase64(value) {
  const normalized = String(value || "").replace(/\s/g, "");
  return normalized.length >= 4 && normalized.length % 4 !== 1 && /^[A-Za-z0-9+/_-]+={0,2}$/.test(normalized);
}
__name(isValidBase64, "isValidBase64");
function encodeBase64(value) {
  const bytes = new TextEncoder().encode(String(value || ""));
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
__name(encodeBase64, "encodeBase64");
function base64Decode(value) {
  let normalized = String(value || "").replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
  normalized += "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(normalized);
  return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}
__name(base64Decode, "base64Decode");
function clashFix(content) {
  if (!content.includes("wireguard") || content.includes("remote-dns-resolve")) return content;
  return content.replace(/type: wireguard[^\r\n]*/g, (line) => line.replace(/, mtu: 1280, udp: true/g, ", mtu: 1280, remote-dns-resolve: true, udp: true"));
}
__name(clashFix, "clashFix");
async function fetchWithTimeout(resource, options = {}, timeoutMs = 3e3) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
__name(fetchWithTimeout, "fetchWithTimeout");
async function probeBackend(apiUrl, configUrl) {
  const rawApi = String(apiUrl || "").trim();
  const protocol = /^http:\/\//i.test(rawApi) ? "http" : "https";
  const host = rawApi.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const api = host ? `${protocol}://${host}` : "";
  let apiOk = false, apiVersion = "";
  if (api) {
    try {
      const res = await fetchWithTimeout(
        `${api}/version`,
        { headers: { "User-Agent": "SUB-UI/Status" } },
        8e3
      );
      if (res.ok) {
        apiOk = true;
        apiVersion = (await res.text()).trim().slice(0, 80);
      }
    } catch (e) {
    }
  }
  let configOk = false;
  const config = String(configUrl || "").trim();
  if (config) {
    try {
      const res = await fetchWithTimeout(
        config,
        { headers: { "User-Agent": "SUB-UI/Status" } },
        8e3
      );
      configOk = res.ok;
    } catch (e) {
    }
  }
  return {
    api: { ok: apiOk, url: api, version: apiVersion },
    config: { ok: configOk, url: config },
    available: (api ? apiOk : true) && (config ? configOk : true)
  };
}
__name(probeBackend, "probeBackend");
function makeSubId() {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let value = "";
  for (const b of bytes) value += ID_CHARS[b % ID_CHARS.length];
  return value;
}
__name(makeSubId, "makeSubId");
async function getSub(env, id) {
  if (!env.KV || !id) return null;
  try {
    return await env.KV.get(`${SUB_PREFIX}${id}`, "json");
  } catch (e) {
    return null;
  }
}
__name(getSub, "getSub");
function upperCaseObject(value) {
  if (Array.isArray(value)) return value.map(upperCaseObject);
  if (!value || typeof value !== "object") return value;
  const result = {};
  for (const [key, item] of Object.entries(value)) result[key.toUpperCase()] = upperCaseObject(item);
  return result;
}
__name(upperCaseObject, "upperCaseObject");
function normalizeConfigData(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const normalized = upperCaseObject(value);
  const map = {
    SUBNAME: "subName",
    SUBAPIS: "subApis",
    SUBCONFIGS: "subConfigs",
    DEFAULTSUBAPIID: "defaultSubApiId",
    DEFAULT_SUBAPI_ID: "defaultSubApiId",
    DEFAULTSUBCONFIGID: "defaultSubConfigId",
    DEFAULT_SUBCONFIG_ID: "defaultSubConfigId",
    USER: "user",
    PASS: "pass",
    ADMINPATH: "adminPath",
    SITELOGO: "siteLogo"
  };
  for (const [key, internal] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(normalized, key)) {
      normalized[internal] = normalized[key];
      delete normalized[key];
    }
  }
  return normalized;
}
__name(normalizeConfigData, "normalizeConfigData");
function normalizeTokenData(value) {
  if (!value || typeof value !== "object") return null;
  const map = { URL: "url", PATH: "path", SUBSCRIPTIONURL: "subscriptionUrl", NAME: "name", SOURCES: "sources", SUBAPIID: "subApiId", SUBCONFIGID: "subConfigId", CUSTOMSUBAPI: "customSubApi", CUSTOMSUBCONFIG: "customSubConfig", SUBAPIIDS: "subApiIds", SUBCONFIGIDS: "subConfigIds", SUBAPI: "subApi", SUBAPINAME: "subApiName", SUBCONFIG: "subConfig", SUBCONFIGNAME: "subConfigName", BACKEND: "backend", BACKENDS: "backends", NOADS: "noAds", TARGET: "target", UPDATE: "update", UPDATE_ENABLE: "updateEnable", UPDATEENABLE: "updateEnable", CREATEDAT: "createdAt", UPDATEDAT: "updatedAt", TYPE: "type", DESTROYKEYHASH: "destroyKeyHash" };
  const output = { ...value };
  for (const [key, internal] of Object.entries(map)) if (Object.prototype.hasOwnProperty.call(value, key)) output[internal] = value[key];
  if (Array.isArray(output.subApiIds)) output.subApiIds = output.subApiIds.map((id) => String(id).toUpperCase());
  if (Array.isArray(output.subConfigIds)) output.subConfigIds = output.subConfigIds.map((id) => String(id).toUpperCase());
  const normalizeProviderReferences = (items) => items.map((item) => {
    const id = String(item?.ID || item?.id || "").trim().toUpperCase();
    if (id) return { ID: id };
    const url = String(item?.URL || item?.url || "").trim();
    return url ? { URL: url } : null;
  }).filter(Boolean);
  if (Array.isArray(output.subApi)) output.subApi = normalizeProviderReferences(output.subApi);
  if (Array.isArray(output.subConfig)) output.subConfig = normalizeProviderReferences(output.subConfig);
  if (output.BACKEND && typeof output.BACKEND === "object") output.backend = { api: output.BACKEND.API, config: output.BACKEND.CONFIG, protocol: output.BACKEND.PROTOCOL };
  if (Array.isArray(output.BACKENDS)) output.backends = output.BACKENDS.map((x) => ({ api: x.API, config: x.CONFIG, protocol: x.PROTOCOL }));
  return output;
}
__name(normalizeTokenData, "normalizeTokenData");
function getTokenProviderReferences(stored, field) {
  const normalized = normalizeTokenData(stored);
  const normalizedField = field === "SUBAPI" ? "subApi" : "subConfig";
  let refs = Array.isArray(stored[field]) ? stored[field] : stored[field] ? [stored[field]] : Array.isArray(normalized?.[normalizedField]) ? normalized[normalizedField] : [];
  if (refs.length || !normalized) return refs;
  const idField = field === "SUBAPI" ? "subApiId" : "subConfigId";
  const idsField = field === "SUBAPI" ? "subApiIds" : "subConfigIds";
  const customField = field === "SUBAPI" ? "customSubApi" : "customSubConfig";
  const backendField = field === "SUBAPI" ? "api" : "config";
  refs = [
    ...(Array.isArray(normalized[idsField]) ? normalized[idsField] : []),
    normalized[idField]
  ].filter(Boolean).map((id) => ({ ID: id }));
  if (normalized[customField]) refs.push({ URL: normalized[customField] });
  if (normalized.backend?.[backendField]) refs.push({ URL: normalized.backend[backendField] });
  if (Array.isArray(normalized.backends)) refs.push(...normalized.backends.map((backend) => backend?.[backendField]).filter(Boolean).map((url) => ({ URL: url })));
  return refs;
}
__name(getTokenProviderReferences, "getTokenProviderReferences");
function tokenProviderValueMatches(stored, field, searchValue, providersById = new Map()) {
  const value = String(searchValue || "").trim();
  const idQuery = value.toUpperCase();
  const hostOnly = !/^https?:\/\//i.test(value) && !/[/?#]/.test(value);
  let queryUrl = "";
  if (hostOnly) {
    try {
      queryUrl = new URL(`https://${value}`).hostname.toLowerCase();
    } catch {
      return false;
    }
  } else {
    try {
      const parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) return false;
      queryUrl = parsed.href.replace(/\/$/, "");
    } catch {
      return false;
    }
  }
  return getTokenProviderReferences(stored, field).some((reference) => {
    const id = String(reference?.ID || reference?.id || "").trim().toUpperCase();
    if (id && id === idQuery) return true;
    const url = String(reference?.URL || reference?.url || providersById.get(id) || "").trim();
    if (!url) return false;
    try {
      const parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
      if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) return false;
      return hostOnly ? parsed.hostname.toLowerCase() === queryUrl : parsed.href.replace(/\/$/, "") === queryUrl;
    } catch {
      return false;
    }
  });
}
__name(tokenProviderValueMatches, "tokenProviderValueMatches");
async function getToken(env, token) {
  if (!env.KV || !token) return null;
  let raw;
  try {
    raw = await env.KV.get(`${URL_PREFIX}${token}`);
  } catch (e) {
    return null;
  }
  if (!raw) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const normalized = upperCaseObject(parsed);
  delete normalized.PATH;
  delete normalized.SUBSCRIPTIONURL;
  for (const key of ["SUBAPIIDS", "SUBCONFIGIDS"]) {
    if (Array.isArray(normalized[key])) normalized[key] = normalized[key].map((id) => String(id).toUpperCase());
  }
  const normalizedRaw = JSON.stringify(normalized);
  if (normalizedRaw !== raw) await env.KV.put(`${URL_PREFIX}${token}`, normalizedRaw);
  const tokenData = normalizeTokenData(normalized);
  if (Array.isArray(tokenData?.sources)) tokenData.sources = await decryptSourceList(env, tokenData.sources);
  return tokenData;
}
__name(getToken, "getToken");
async function listSubs(env) {
  if (!env.KV) return [];
  const result = [];
  let cursor;
  do {
    const page = await env.KV.list({
      prefix: SUB_PREFIX,
      ...cursor ? { cursor } : {}
    });
    const values = await Promise.all(page.keys.map(
      (item) => getSub(env, item.name.slice(SUB_PREFIX.length))
    ));
    for (const data of values) {
      if (data) result.push(data);
    }
    cursor = page.list_complete ? void 0 : page.cursor;
  } while (cursor);
  result.sort((a, b) => String(a.name).localeCompare(String(b.name), "zh-CN"));
  return result;
}
__name(listSubs, "listSubs");
function normalizeAdminPath(value) {
  let path = String(value || "").trim();
  if (!path) return DEFAULT_ADMIN_PATH;
  path = path.replace(/^[/]+/, "").replace(/[/]+$/, "");
  if (!/^[A-Za-z0-9_-]{2,60}$/.test(path)) return "";
  return path;
}
__name(normalizeAdminPath, "normalizeAdminPath");
function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}
__name(normalizeName, "normalizeName");
function normalizeToken(value) {
  return String(value || "").trim();
}
__name(normalizeToken, "normalizeToken");
function validName(name) {
  return name.length >= 1 && name.length <= 80;
}
__name(validName, "validName");
function cleanSourceList(input) {
  if (Array.isArray(input)) {
    return input.flatMap((x) => String(x || "").split(/\r?\n/)).map((x) => x.trim()).filter(Boolean);
  }
  return String(input || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
}
__name(cleanSourceList, "cleanSourceList");
var SOURCE_CIPHERTEXT_PREFIX = "enc:v1:";
var SOURCE_CIPHERTEXT_PREFIX_V2 = "enc:v2:";
var SOURCE_KEYRING_PREFIX = "__CF_SUBS_INTERNAL__:SOURCE_KEY:v1:";
var SOURCE_KEYRING_ACTIVE_KEY = "__CF_SUBS_INTERNAL__:SOURCE_KEY_ACTIVE:v1";
var SOURCE_ENCRYPTION_KDF_SALT = new TextEncoder().encode("SUB-UI:SOURCES:v1");
var SOURCE_ENCRYPTION_KDF_INFO = new TextEncoder().encode("SUB-UI SOURCES AES-GCM key");
function encodeSourceBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(encodeSourceBase64Url, "encodeSourceBase64Url");
function decodeSourceBase64Url(value) {
  const base64 = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
__name(decodeSourceBase64Url, "decodeSourceBase64Url");
async function importSourceKey(rawKey) {
  return crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
__name(importSourceKey, "importSourceKey");
async function getLegacySourceEncryptionKey(env) {
  const secret = String(env.SOURCE_ENCRYPTION_KEY || "");
  if (!secret) throw new Error("旧版加密订阅源需要原 SOURCE_ENCRYPTION_KEY，当前环境未配置");
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: SOURCE_ENCRYPTION_KDF_SALT, info: SOURCE_ENCRYPTION_KDF_INFO },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
__name(getLegacySourceEncryptionKey, "getLegacySourceEncryptionKey");
async function getSourceEncryptionKey(env) {
  if (!env.KV) throw new Error("未绑定 KV，无法初始化订阅源加密密钥");
  let activeId;
  try {
    activeId = await env.KV.get(SOURCE_KEYRING_ACTIVE_KEY);
  } catch {
    throw new Error("无法读取持久化订阅源加密密钥");
  }
  if (activeId) {
    if (!/^[A-Za-z0-9_-]{22}$/.test(activeId)) throw new Error("持久化订阅源加密密钥索引无效");
    let storedKey;
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        storedKey = await env.KV.get(`${SOURCE_KEYRING_PREFIX}${activeId}`);
        if (storedKey) break;
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
      }
    } catch {
      throw new Error("无法读取持久化订阅源加密密钥");
    }
    if (!storedKey) throw new Error("持久化订阅源加密密钥记录不存在");
    let rawKey;
    try {
      rawKey = decodeSourceBase64Url(storedKey);
      if (rawKey.length !== 32) throw new Error("invalid key size");
      return { id: activeId, key: await importSourceKey(rawKey) };
    } catch {
      throw new Error("持久化订阅源加密密钥记录无效");
    }
  }
  const id = encodeSourceBase64Url(crypto.getRandomValues(new Uint8Array(16)));
  const rawKey = crypto.getRandomValues(new Uint8Array(32));
  try {
    await env.KV.put(`${SOURCE_KEYRING_PREFIX}${id}`, encodeSourceBase64Url(rawKey));
    await env.KV.put(SOURCE_KEYRING_ACTIVE_KEY, id);
  } catch {
    throw new Error("无法持久化订阅源加密密钥");
  }
  return { id, key: await importSourceKey(rawKey) };
}
__name(getSourceEncryptionKey, "getSourceEncryptionKey");
async function getSourceEncryptionKeyById(env, id) {
  if (!/^[A-Za-z0-9_-]{22}$/.test(id)) throw new Error("加密订阅源密钥标识无效");
  let storedKey;
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      storedKey = await env.KV.get(`${SOURCE_KEYRING_PREFIX}${id}`);
      if (storedKey) break;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
    }
  } catch {
    throw new Error("无法读取持久化订阅源加密密钥");
  }
  if (!storedKey) throw new Error("加密订阅源对应的持久化密钥不存在");
  try {
    const rawKey = decodeSourceBase64Url(storedKey);
    if (rawKey.length !== 32) throw new Error("invalid key size");
    return importSourceKey(rawKey);
  } catch {
    throw new Error("加密订阅源对应的持久化密钥无效");
  }
}
__name(getSourceEncryptionKeyById, "getSourceEncryptionKeyById");
function isSourceCiphertext(value) {
  return /^enc:v\d+:/.test(value);
}
__name(isSourceCiphertext, "isSourceCiphertext");
async function encryptSourceList(env, sources) {
  const values = cleanSourceList(sources);
  const hasPlaintext = values.some((source) => !isSourceCiphertext(source));
  if (!hasPlaintext) return values;
  const { id, key } = await getSourceEncryptionKey(env);
  const encoder = new TextEncoder();
  return Promise.all(values.map(async (source) => {
    if (isSourceCiphertext(source)) return source;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const additionalData = encoder.encode(`SUB-UI:SOURCES:v2:${id}`);
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData }, key, encoder.encode(source));
    return `${SOURCE_CIPHERTEXT_PREFIX_V2}${id}:${encodeSourceBase64Url(iv)}:${encodeSourceBase64Url(new Uint8Array(ciphertext))}`;
  }));
}
__name(encryptSourceList, "encryptSourceList");
async function decryptSourceList(env, sources) {
  const values = cleanSourceList(sources);
  const encrypted = values.filter(isSourceCiphertext);
  if (!encrypted.length) return values;
  const decoder = new TextDecoder();
  return Promise.all(values.map(async (source) => {
    if (!isSourceCiphertext(source)) return source;
    const parts = source.split(":");
    if (parts[0] === "enc" && parts[1] === "v2") {
      const [, , id, ivValue, ciphertextValue, ...extra] = parts;
      if (!id || !ivValue || !ciphertextValue || extra.length) throw new Error("加密订阅源格式无效");
      const iv = decodeSourceBase64Url(ivValue);
      if (iv.length !== 12) throw new Error("加密订阅源 IV 无效");
      const key = await getSourceEncryptionKeyById(env, id);
      try {
        const plaintext = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(`SUB-UI:SOURCES:v2:${id}`) },
          key,
          decodeSourceBase64Url(ciphertextValue)
        );
        return decoder.decode(plaintext);
      } catch {
        throw new Error("订阅源解密失败，请检查加密数据完整性");
      }
    }
    if (parts[0] !== "enc" || parts[1] !== "v1") throw new Error("加密订阅源版本不受支持");
    const [, , ivValue, ciphertextValue, ...extra] = parts;
    if (!ivValue || !ciphertextValue || extra.length) throw new Error("加密订阅源格式无效");
    const iv = decodeSourceBase64Url(ivValue);
    if (iv.length !== 12) throw new Error("加密订阅源 IV 无效");
    const key = await getLegacySourceEncryptionKey(env);
    try {
      const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        decodeSourceBase64Url(ciphertextValue)
      );
      return decoder.decode(plaintext);
    } catch {
      throw new Error("旧版加密订阅源解密失败，请检查历史 SOURCE_ENCRYPTION_KEY");
    }
  }));
}
__name(decryptSourceList, "decryptSourceList");
async function handleAdmin(request, env, runtime) {
  if (!env.KV) {
    return new Response(
      "\u672A\u7ED1\u5B9A\u540D\u4E3A KV \u7684 Cloudflare KV Namespace\u3002",
      { status: 500 }
    );
  }
  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      return new Response("\u4E0D\u652F\u6301\u7684\u6570\u636E\u683C\u5F0F", { status: 400 });
    }
    try {
      const data = await request.json();
      if (data.type === "factory_reset") {
        const config = await getConfig(env);
        const expectedUser = String(config.user || "");
        const expectedPass = String(config.pass || "");
        const suppliedUser = typeof data.username === "string" ? data.username : "";
        const suppliedPass = typeof data.password === "string" ? data.password : "";
        if (!expectedUser && !expectedPass) {
          if (suppliedUser || suppliedPass) return jsonResponse({ ok: false, error: "当前未设置管理员凭据，请清空用户名和密码后重试" }, 400);
        } else if (!expectedUser || !expectedPass) {
          return jsonResponse({ ok: false, error: "管理员用户名和密码必须同时设置；请先修正后台安全设置" }, 403);
        } else if (!suppliedUser || !suppliedPass || suppliedUser !== expectedUser || suppliedPass !== expectedPass) {
          return jsonResponse({ ok: false, error: "管理员用户名或密码错误" }, 403);
        }
        const keys = [];
        let cursor;
        do {
          const page = await env.KV.list(cursor ? { cursor } : {});
          keys.push(...page.keys.map(({ name }) => name));
          cursor = page.list_complete ? void 0 : page.cursor;
        } while (cursor);
        let deleted = 0;
        try {
          for (const key of keys) {
            await env.KV.delete(key);
            deleted++;
          }
        } catch (error) {
          console.error("Factory reset stopped after partial KV deletion");
          return jsonResponse({ ok: false, error: `恢复出厂设置未能完成，已删除 ${deleted} 项 KV 数据` }, 500);
        }
        return jsonResponse({ ok: true, deleted });
      }
      if (data.type === "import_all_json") {
        const payload = data.payload;
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
          return jsonResponse({ ok: false, error: "\u5BFC\u5165\u5185\u5BB9\u5FC5\u987B\u662F\u4E00\u4E2A JSON \u5BF9\u8C61" }, 400);
        }
        const entries = Object.entries(payload);
        const encoder = new TextEncoder();
        const normalizedEntries = [];
        for (const [key, value] of entries) {
          if (!key || encoder.encode(key).length > 512) {
            return jsonResponse({ ok: false, error: "\u5BFC\u5165\u6587\u4EF6\u4E2D\u5305\u542B\u65E0\u6548\u6216\u8FC7\u957F\u7684 KV \u952E" }, 400);
          }
          if (key.startsWith("__CF_SUBS_INTERNAL__:")) {
            return jsonResponse({ ok: false, error: "\u5907\u4EFD\u4E0D\u80FD\u8BFB\u5199 SUB-UI \u5185\u90E8\u52A0\u5BC6\u5BC6\u94A5\u6570\u636E" }, 400);
          }
          let text;
          if (typeof value === "string") {
            text = value;
            try {
              text = JSON.stringify(upperCaseObject(JSON.parse(value)));
            } catch {
            }
          } else {
            text = JSON.stringify(upperCaseObject(value));
          }
          if (key.startsWith(URL_PREFIX)) {
            let importedUrl;
            try {
              importedUrl = upperCaseObject(JSON.parse(text));
            } catch {
            }
            if (Array.isArray(importedUrl?.SOURCES)) {
              importedUrl.SOURCES = await encryptSourceList(env, importedUrl.SOURCES);
              text = JSON.stringify(importedUrl);
            }
          }
          if (encoder.encode(text).length > 25 * 1024 * 1024) {
            return jsonResponse({ ok: false, error: `KV \u503C\u8D85\u8FC7\u5927\u5C0F\u9650\u5236: ${key}` }, 400);
          }
          normalizedEntries.push([key, text]);
        }
        const importKeys = new Set(normalizedEntries.map(([key]) => key));
        const importedSections = new Map();
        const importedProviderConfigs = new Map();
        for (const [key, value] of normalizedEntries) {
          if (key === SUBAPIS_KEY || key === SUBCONFIGS_KEY) {
            const type = key === SUBAPIS_KEY ? "subapi" : "subconfig";
            importedProviderConfigs.set(type, parseProviderConfig(value, type));
            continue;
          }
          if (!key.startsWith(CONFIG_SECTION_PREFIX)) continue;
          const section = key.slice(CONFIG_SECTION_PREFIX.length).toLowerCase();
          const fields = CONFIG_SECTIONS[section];
          if (!fields) return jsonResponse({ ok: false, error: `不支持的配置分组：${key}` }, 400);
          let sectionData;
          try {
            sectionData = JSON.parse(value);
            if (!sectionData || typeof sectionData !== "object" || Array.isArray(sectionData)) throw new Error("invalid shape");
          } catch {
            return jsonResponse({ ok: false, error: `配置分组数据无效：${key}` }, 400);
          }
          importedSections.set(section, { fields, data: normalizeConfigData(sectionData) });
        }
        const writesConfig = importKeys.has("CONFIG.JSON") || [...importedSections.keys()].some((section) => section === "site" || section === "security");
        if (writesConfig) {
          const configEntry = normalizedEntries.find(([key]) => key === "CONFIG.JSON");
          let importedConfig;
          if (configEntry) {
            try {
              importedConfig = JSON.parse(configEntry[1]);
              if (!importedConfig || typeof importedConfig !== "object" || Array.isArray(importedConfig)) throw new Error("invalid shape");
            } catch {
              return jsonResponse({ ok: false, error: "CONFIG.JSON 格式无效，无法导入" }, 400);
            }
            importedConfig = normalizeConfigData(importedConfig);
            if (Array.isArray(importedConfig.subApis) && !importedProviderConfigs.has("subapi")) {
              importedProviderConfigs.set("subapi", {
                subApis: normalizeProviderList(importedConfig.subApis),
                defaultSubApiId: String(importedConfig.defaultSubApiId || "").toUpperCase()
              });
            }
            if (Array.isArray(importedConfig.subConfigs) && !importedProviderConfigs.has("subconfig")) {
              importedProviderConfigs.set("subconfig", {
                subConfigs: normalizeProviderList(importedConfig.subConfigs),
                defaultSubConfigId: String(importedConfig.defaultSubConfigId || "").toUpperCase()
              });
            }
          } else {
            importedConfig = await getConfig(env);
          }
          for (const { fields, data: sectionData } of importedSections.values()) {
            if (fields.some((field) => field === "subApis" || field === "subConfigs")) continue;
            for (const field of fields) {
              if (Object.prototype.hasOwnProperty.call(sectionData, field)) importedConfig[field] = sectionData[field];
            }
          }
          importedConfig.configVersion = CONFIG_VERSION;
          const canonicalConfig = JSON.stringify(serializeBaseConfig(importedConfig));
          if (configEntry) normalizedEntries.splice(normalizedEntries.indexOf(configEntry), 1, ["CONFIG.JSON", canonicalConfig]);
          else normalizedEntries.push(["CONFIG.JSON", canonicalConfig]);
        }
        for (const [section, { data: sectionData }] of importedSections) {
          const type = section === "subapi" ? "subapi" : section === "subconfig" ? "subconfig" : "";
          const key = type === "subapi" ? SUBAPIS_KEY : SUBCONFIGS_KEY;
          if (type && !importKeys.has(key)) importedProviderConfigs.set(type, parseProviderConfig(JSON.stringify(sectionData), type));
        }
        for (const [type, providerConfig] of importedProviderConfigs) {
          const key = type === "subapi" ? SUBAPIS_KEY : SUBCONFIGS_KEY;
          const entryIndex = normalizedEntries.findIndex(([entryKey]) => entryKey === key);
          const value = serializeProviderConfig(providerConfig, type);
          if (entryIndex >= 0) normalizedEntries[entryIndex] = [key, value];
          else normalizedEntries.push([key, value]);
        }
        for (let index = normalizedEntries.length - 1; index >= 0; index--) {
          if (normalizedEntries[index][0].startsWith(CONFIG_SECTION_PREFIX)) normalizedEntries.splice(index, 1);
        }
        let imported = 0;
        try {
          for (const [key, value] of normalizedEntries) {
            await env.KV.put(key, value);
            imported++;
          }
          await Promise.all(Object.keys(CONFIG_SECTIONS).map((section) => env.KV.delete(`${CONFIG_SECTION_PREFIX}${section.toUpperCase()}`)));
        } catch (error) {
          console.error("KV backup import failed after partial restore:", error);
          return jsonResponse({ ok: false, error: `\u5BFC\u5165\u5931\u8D25\uFF0C\u5DF2\u5BFC\u5165 ${imported} \u9879\uFF1A${error?.message || String(error)}` }, 500);
        }
        return jsonResponse({ ok: true, count: imported });
      }
      if (data.type === "json_list") {
        const query = String(data.query || "").trim().slice(0, 500);
        const items = await listJsonManagerItems(env, query, runtime.url?.origin || "");
        return jsonResponse({ ok: true, count: items.length, items });
      }
      if (data.type === "url_bulk_delete") {
        if (!Array.isArray(data.tokens)) return jsonResponse({ ok: false, error: "请选择要销毁的聚合订阅链接" }, 400);
        const tokens = [...new Set(data.tokens.map((value) => normalizeToken(value)).filter(Boolean))];
        if (!tokens.length || tokens.length > 500) return jsonResponse({ ok: false, error: "批量销毁需选择 1 到 500 条有效链接" }, 400);
        let deleted = 0;
        for (const token of tokens) {
          if (!await env.KV.get(`${URL_PREFIX}${token}`)) continue;
          await env.KV.delete(`${URL_PREFIX}${token}`);
          deleted++;
        }
        return jsonResponse({ ok: true, deleted });
      }
      if (data.type === "url_search_provider") {
        const field = String(data.field || "").trim().toUpperCase();
        const value = String(data.value || "").trim();
        if (!["SUBAPI", "SUBCONFIG", "ANY"].includes(field)) return jsonResponse({ ok: false, error: "搜索字段只支持 SUBAPI、SUBCONFIG 或全部字段" }, 400);
        if (!value || value.length > 2e3) return jsonResponse({ ok: false, error: "请输入有效的字段值进行搜索" }, 400);
        const matches = await findGeneratedLinksByProvider(env, field, value);
        return jsonResponse({ ok: true, count: matches.length });
      }
      if (data.type === "url_search_provider_delete") {
        const field = String(data.field || "").trim().toUpperCase();
        const value = String(data.value || "").trim();
        if (field !== "ANY") return jsonResponse({ ok: false, error: "搜索销毁必须同时匹配 SUBAPI 或 SUBCONFIG" }, 400);
        if (!value || value.length > 2e3) return jsonResponse({ ok: false, error: "请输入有效的字段值进行搜索" }, 400);
        const matches = await findGeneratedLinksByProvider(env, field, value);
        for (const match of matches) await env.KV.delete(match.key);
        return jsonResponse({ ok: true, deleted: matches.length, tokens: matches.map((match) => match.key.slice(URL_PREFIX.length)) });
      }
      if (data.type === "url_bulk_update") {
        const field = String(data.field || "").trim().toUpperCase();
        if (!["SUBAPI", "SUBCONFIG"].includes(field)) return jsonResponse({ ok: false, error: "批量替换只支持 SUBAPI 或 SUBCONFIG" }, 400);
        const oldValue = String(data.oldValue ?? "").trim();
        const newValue = String(data.newValue ?? "").trim();
        if (!oldValue || !newValue) return jsonResponse({ ok: false, error: "请输入要查找的旧值和替换后的新值" }, 400);
        let oldProviderUrl = "";
        let newProviderUrl = "";
        let newProviderHostOnly = false;
        if (field === "SUBAPI" || field === "SUBCONFIG") {
          const normalizeProviderUrl = (value) => {
            const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
            let parsed;
            try {
              parsed = new URL(candidate);
            } catch {
              return "";
            }
            return ["http:", "https:"].includes(parsed.protocol) && parsed.hostname ? parsed.href.replace(/\/$/, "") : "";
          };
          newProviderHostOnly = !/^https?:\/\//i.test(newValue) && !/[/?#]/.test(newValue);
          oldProviderUrl = normalizeProviderUrl(oldValue);
          newProviderUrl = normalizeProviderUrl(newValue);
          if (!oldProviderUrl || !newProviderUrl) return jsonResponse({ ok: false, error: "转换配置的旧值和新值必须是有效的 http:// 或 https:// 地址" }, 400);
        }
        const providerConfig = await getConfig(env);
        const providersById = providerConfig
          ? new Map(normalizeProviderList(field === "SUBAPI" ? providerConfig.subApis : providerConfig.subConfigs).map((provider) => [provider.id, provider.url]))
          : new Map();
        let updated = 0;
        let matched = 0;
        let cursor;
        do {
          const page = await env.KV.list({ prefix: URL_PREFIX, ...cursor ? { cursor } : {} });
          for (const entry of page.keys) {
            const token = normalizeToken(entry.name.slice(URL_PREFIX.length));
            if (!token) continue;
            const key = entry.name;
            const raw = await env.KV.get(key);
            if (!raw) continue;
            let stored;
            try {
              stored = upperCaseObject(JSON.parse(raw));
            } catch {
              return jsonResponse({ ok: false, error: `聚合订阅链接数据无效：${token}；已更新 ${updated} 条` }, 500);
            }
            let changed = false;
            const refs = getTokenProviderReferences(stored, field);
            if (refs.length) {
              const replacement = refs.map((reference) => {
                if (!tokenProviderValueMatches({ [field]: [reference] }, field, oldValue, providersById)) return reference;
                matched++;
                changed = true;
                const id = String(reference?.ID || reference?.id || "").trim().toUpperCase();
                const url = String(reference?.URL || reference?.url || providersById.get(id) || "").trim();
                if (newProviderHostOnly && url) {
                  const candidate = /^https?:\/\//i.test(url) ? url : `https://${url}`;
                  const replacedUrl = new URL(candidate);
                  replacedUrl.hostname = new URL(newProviderUrl).hostname;
                  return { URL: replacedUrl.href };
                }
                return { URL: newProviderUrl };
              });
              stored[field] = replacement;
              const legacyFields = field === "SUBAPI"
                ? ["SUBAPIID", "SUBAPIIDS", "CUSTOMSUBAPI", "SUBAPINAME", "BACKEND", "BACKENDS"]
                : ["SUBCONFIGID", "SUBCONFIGIDS", "CUSTOMSUBCONFIG", "SUBCONFIGNAME"];
              for (const keyName of legacyFields) delete stored[keyName];
            }
            if (changed) {
              delete stored.NAME;
              stored.UPDATEDAT = new Date().toISOString();
              await env.KV.put(key, JSON.stringify(stored));
              updated++;
            }
          }
          cursor = page.list_complete ? void 0 : page.cursor;
        } while (cursor);
        return jsonResponse({ ok: true, matched, updated });
      }
      if (data.type === "url_update_providers") {
        const token = normalizeToken(data.token);
        if (!token) return jsonResponse({ ok: false, error: "聚合订阅链接标识无效" }, 400);
        const key = `${URL_PREFIX}${token}`;
        const raw = await env.KV.get(key);
        if (!raw) return jsonResponse({ ok: false, error: "链接不存在或已被销毁" }, 404);
        let stored;
        try {
          stored = upperCaseObject(JSON.parse(raw));
        } catch {
          return jsonResponse({ ok: false, error: "聚合链接数据无效" }, 500);
        }
        const config = await getConfig(env);
        const resolveProvider = (field, providers, custom, idValue, urlValue) => {
          if (custom) {
            let providerUrl = String(urlValue || "").trim();
            if (field === "SUBAPI" && !/^https?:\/\//i.test(providerUrl)) providerUrl = `https://${providerUrl}`;
            if (!/^https?:\/\/\S+$/i.test(providerUrl)) throw new Error(`自定义 ${field} 必须是有效的 http:// 或 https:// URL`);
            return { URL: providerUrl };
          }
          const id = String(idValue || "").trim().toUpperCase();
          if (!providers.some((provider) => provider.id === id)) throw new Error(`请选择有效的 ${field}`);
          return { ID: id };
        };
        let apiReference;
        let configReference;
        try {
          apiReference = resolveProvider("SUBAPI", normalizeProviderList(config.subApis), Boolean(data.apiCustom), data.apiId, data.apiUrl);
          configReference = resolveProvider("SUBCONFIG", normalizeProviderList(config.subConfigs), Boolean(data.configCustom), data.configId, data.configUrl);
        } catch (error) {
          return jsonResponse({ ok: false, error: error.message }, 400);
        }
        for (const field of ["SUBAPI", "SUBCONFIG"]) {
          const legacyFields = field === "SUBAPI"
            ? ["SUBAPIID", "SUBAPIIDS", "CUSTOMSUBAPI", "SUBAPINAME", "BACKEND", "BACKENDS"]
            : ["SUBCONFIGID", "SUBCONFIGIDS", "CUSTOMSUBCONFIG", "SUBCONFIGNAME"];
          for (const legacyField of legacyFields) delete stored[legacyField];
        }
        stored.SUBAPI = [apiReference];
        stored.SUBCONFIG = [configReference];
        stored.UPDATEDAT = new Date().toISOString();
        await env.KV.put(key, JSON.stringify(stored));
        return jsonResponse({ ok: true, updatedAt: stored.UPDATEDAT });
      }
      if (data.type === "url_verify_edit_key") {
        const token = normalizeToken(data.token);
        if (!token) return jsonResponse({ ok: false, error: "聚合订阅链接标识无效" }, 400);
        const raw = await env.KV.get(`${URL_PREFIX}${token}`);
        if (!raw) return jsonResponse({ ok: false, error: "链接不存在或已被销毁" }, 404);
        let stored;
        try {
          stored = upperCaseObject(JSON.parse(raw));
        } catch {
          return jsonResponse({ ok: false, error: "聚合链接数据无效" }, 500);
        }
        const tokenData = normalizeTokenData(stored);
        return jsonResponse({ ok: true, tokenData: { SUBAPI: tokenData.subApi, SUBCONFIG: tokenData.subConfig } });
      }
      if (data.type === "json_delete") {
        const token = normalizeToken(data.token);
        if (!token) return jsonResponse({ ok: false, error: "\u7F3A\u5C11 Token" }, 400);
        const raw = await env.KV.get(`${URL_PREFIX}${token}`);
        if (!raw) return jsonResponse({ ok: false, error: "\u94FE\u63A5\u4E0D\u5B58\u5728\u6216\u5DF2\u7ECF\u88AB\u5220\u9664" }, 404);
        await env.KV.delete(`${URL_PREFIX}${token}`);
        return jsonResponse({ ok: true, token });
      }
      if (data.type === "json_delete_keyword") {
        const keyword = String(data.keyword || "").trim().slice(0, 500);
        if (!keyword) return jsonResponse({ ok: false, error: "\u8BF7\u8F93\u5165 JSON \u5173\u952E\u5B57" }, 400);
        const items = await listJsonManagerItems(env, keyword);
        let deleted = 0;
        for (const item of items) {
          await env.KV.delete(`${URL_PREFIX}${item.token}`);
          deleted++;
        }
        return jsonResponse({ ok: true, deleted, keyword });
      }
      if (data.type === "json_delete_all") {
        const items = await listJsonManagerItems(env, "");
        for (const item of items) await env.KV.delete(`${URL_PREFIX}${item.token}`);
        return jsonResponse({ ok: true, deleted: items.length });
      }
      if (data.type === "config") {
        const old = await getConfig(env);
        const next = {
          ...old,
          subName: normalizeName(data.settings?.subName ?? old.subName) || "SUB",
          subApis: normalizeProviderList(data.settings?.subApis ?? old.subApis),
          subConfigs: normalizeProviderList(data.settings?.subConfigs ?? old.subConfigs),
          defaultSubApiId: String(data.settings?.defaultSubApiId ?? old.defaultSubApiId ?? "").toUpperCase(),
          defaultSubConfigId: String(data.settings?.defaultSubConfigId ?? old.defaultSubConfigId ?? "").toUpperCase(),
          user: String(data.settings?.user ?? old.user ?? ""),
          pass: data.settings?.pass ? String(data.settings.pass) : String(old.pass || ""),
          adminPath: normalizeAdminPath(data.settings?.adminPath ?? old.adminPath) || DEFAULT_ADMIN_PATH,
          siteLogo: String(data.settings?.siteLogo ?? old.siteLogo ?? "")
        };
        await putConfig(env, next);
        return jsonResponse({ ok: true, adminPath: next.adminPath });
      }
      if (data.type === "security") {
        const old = await getConfig(env), user = String(data.user || "").trim();
        if (!user) return jsonResponse({ ok: false, error: "\u7BA1\u7406\u5458\u8D26\u53F7\u4E0D\u80FD\u4E3A\u7A7A" }, 400);
        await putBaseConfig(env, { ...old, user, pass: data.pass ? String(data.pass) : String(old.pass || "") });
        return jsonResponse({ ok: true });
      }
      if (data.type === "admin_path") {
        const old = await getConfig(env);
        const adminPath = normalizeAdminPath(data.adminPath);
        if (!adminPath) return jsonResponse({ ok: false, error: "\u7BA1\u7406\u5458\u8DEF\u5F84\u65E0\u6548" }, 400);
        await putBaseConfig(env, { ...old, adminPath });
        return jsonResponse({ ok: true, adminPath });
      }
      if (data.type === "site_name") {
        const old = await getConfig(env);
        const subName = normalizeName(data.subName) || "SUB";
        await putBaseConfig(env, { ...old, subName });
        return jsonResponse({ ok: true, subName });
      }
      if (data.type === "site_settings") {
        const old = await getConfig(env);
        const subName = normalizeName(data.subName) || "SUB";
        const adminPath = normalizeAdminPath(data.adminPath) || DEFAULT_ADMIN_PATH;
        const siteLogo = String(data.siteLogo || "").trim();
        if (siteLogo && !/^https?:\/\//i.test(siteLogo)) return jsonResponse({ ok: false, error: "\u7AD9\u70B9\u6807\u7B7E\u680F Logo \u5FC5\u987B\u662F http:// \u6216 https:// URL" }, 400);
        await putBaseConfig(env, { ...old, subName, adminPath, siteLogo });
        return jsonResponse({ ok: true, subName, adminPath, siteLogo });
      }
      if (["subapi_create", "subapi_update", "subapi_delete", "subapi_default", "subapi_reorder", "subconfig_create", "subconfig_update", "subconfig_delete", "subconfig_default", "subconfig_reorder"].includes(data.type)) {
        const cfg = await getConfig(env);
        const isApi = data.type.startsWith("subapi_");
        const key = isApi ? "subApis" : "subConfigs";
        const defaultKey = isApi ? "defaultSubApiId" : "defaultSubConfigId";
        const list = normalizeProviderList(cfg[key]);
        const action = data.type.split("_")[1];
        const id = String(data.id || "").trim().toUpperCase();
        if (action === "reorder") {
          const order = Array.isArray(data.order) ? data.order.map((x) => String(x || "").trim().toUpperCase()).filter(Boolean) : [];
          if (order.length !== list.length || new Set(order).size !== list.length || order.some((x) => !list.some((item) => item.id === x))) {
            return jsonResponse({ ok: false, error: "\u6392\u5E8F\u6570\u636E\u65E0\u6548" }, 400);
          }
          const map = new Map(list.map((item) => [item.id, item]));
          cfg[key] = order.map((x) => map.get(x));
          await putProviderConfig(env, isApi ? "subapi" : "subconfig", cfg);
          return jsonResponse({ ok: true, items: normalizeProviderList(cfg[key]), defaultId: String(cfg[defaultKey] || "") });
        }
        if (action === "default") {
          if (!list.some((x) => x.id === id)) return jsonResponse({ ok: false, error: "\u9879\u76EE\u4E0D\u5B58\u5728" }, 404);
          cfg[defaultKey] = id;
          await putProviderConfig(env, isApi ? "subapi" : "subconfig", cfg);
          return jsonResponse({ ok: true, items: normalizeProviderList(cfg[key]), defaultId: String(cfg[defaultKey] || "") });
        }
        if (action === "delete") {
          if (!list.some((x) => x.id === id)) return jsonResponse({ ok: false, error: "\u9879\u76EE\u4E0D\u5B58\u5728" }, 404);
          cfg[key] = list.filter((x) => x.id !== id);
          if (String(cfg[defaultKey] || "") === id) cfg[defaultKey] = cfg[key][0]?.id || "";
        } else {
          const name = normalizeName(data.name);
          let value = String(data.url || "").trim();
          if (isApi && !/^https?:\/\//i.test(value)) value = "https://" + value;
          if (!validName(name)) return jsonResponse({ ok: false, error: "\u5907\u6CE8\u4E0D\u80FD\u4E3A\u7A7A\u4E14\u4E0D\u80FD\u8D85\u8FC7 80 \u4E2A\u5B57\u7B26" }, 400);
          if (!/^https?:\/\//i.test(value)) return jsonResponse({ ok: false, error: "URL \u5FC5\u987B\u4EE5 http:// \u6216 https:// \u5F00\u5934" }, 400);
          const itemId = id || makeSubId(), item = { id: itemId, name, url: value };
          if (action === "create") list.push(item);
          else {
            const index = list.findIndex((x) => x.id === id);
            if (index < 0) return jsonResponse({ ok: false, error: "\u9879\u76EE\u4E0D\u5B58\u5728" }, 404);
            list[index] = { ...list[index], ...item, id };
          }
          if (!String(cfg[defaultKey] || "") && list.length) cfg[defaultKey] = list[0].id;
          cfg[key] = list;
        }
        await putProviderConfig(env, isApi ? "subapi" : "subconfig", cfg);
        return jsonResponse({ ok: true, items: normalizeProviderList(cfg[key]), defaultId: String(cfg[defaultKey] || "") });
      }
      return new Response("\u4E0D\u652F\u6301\u7684\u6570\u636E\u7C7B\u578B", { status: 400 });
    } catch (e) {
      return jsonResponse({
        ok: false,
        error: e?.message || String(e) || "\u670D\u52A1\u5668\u5185\u90E8\u9519\u8BEF"
      }, 500);
    }
  }
  const settings = await getConfig(env);
  return new Response(
    await renderAdminPage(
      new URL(request.url),
      env,
      settings
    ),
    {
      headers: {
        "Content-Type": "text/html;charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}
__name(handleAdmin, "handleAdmin");
async function getConfig(env) {
  const defaults = {
    subName: "SUB",
    subApis: [],
    subConfigs: [],
    defaultSubApiId: "",
    defaultSubConfigId: "",
    user: "",
    pass: "",
    adminPath: DEFAULT_ADMIN_PATH,
    siteLogo: ""
  };
  if (!env.KV) return defaults;
  let raw;
  try {
    raw = await env.KV.get("CONFIG.JSON");
  } catch (error) {
    throw new ConfigStorageError("无法读取 CONFIG.JSON", { cause: error });
  }
  let stored = {};
  if (raw) {
    try {
      stored = JSON.parse(raw);
      if (!stored || typeof stored !== "object" || Array.isArray(stored)) throw new Error("invalid shape");
    } catch (error) {
      throw new ConfigStorageError("CONFIG.JSON 格式无效", { cause: error });
    }
  }
  const parsed = { ...defaults, ...normalizeConfigData(stored) };
  const migrationNeeded = Number(stored.CONFIGVERSION || 0) < CONFIG_VERSION;
  const legacySections = new Map();
  if (migrationNeeded) {
    const sectionValues = await Promise.all(Object.entries(CONFIG_SECTIONS).map(async ([section, fields]) => {
      const key = `${CONFIG_SECTION_PREFIX}${section.toUpperCase()}`;
      let sectionRaw;
      try {
        sectionRaw = await env.KV.get(key);
      } catch (error) {
        throw new ConfigStorageError(`无法读取配置分组：${section}`, { cause: error });
      }
      if (!sectionRaw) return null;
      let sectionData;
      try {
        const sectionValue = JSON.parse(sectionRaw);
        if (!sectionValue || typeof sectionValue !== "object" || Array.isArray(sectionValue)) throw new Error("invalid shape");
        sectionData = normalizeConfigData(sectionValue);
      } catch (error) {
        throw new ConfigStorageError(`配置分组数据无效：${section}`, { cause: error });
      }
      return { key, section, fields, sectionData };
    }));
    for (const value of sectionValues) {
      if (!value) continue;
      legacySections.set(value.section, value.key);
      if (value.section !== "subapi" && value.section !== "subconfig") {
        for (const field of value.fields) {
          if (Object.prototype.hasOwnProperty.call(value.sectionData, field)) parsed[field] = value.sectionData[field];
        }
      }
    }
  }
  let apiRaw;
  let configRaw;
  try {
    [apiRaw, configRaw] = await Promise.all([env.KV.get(SUBAPIS_KEY), env.KV.get(SUBCONFIGS_KEY)]);
  } catch (error) {
    throw new ConfigStorageError("无法读取 SUBAPIS / SUBCONFIGS", { cause: error });
  }
  let apiConfig = apiRaw ? parseProviderConfig(apiRaw, "subapi") : null;
  let subConfig = configRaw ? parseProviderConfig(configRaw, "subconfig") : null;
  const legacyApi = legacySections.has("subapi") ? await readLegacyProviderConfig(env, "subapi") : null;
  const legacySubConfig = legacySections.has("subconfig") ? await readLegacyProviderConfig(env, "subconfig") : null;
  if (!apiConfig) apiConfig = legacyApi || { subApis: normalizeProviderList(parsed.subApis), defaultSubApiId: String(parsed.defaultSubApiId || "").toUpperCase() };
  if (!subConfig) subConfig = legacySubConfig || { subConfigs: normalizeProviderList(parsed.subConfigs), defaultSubConfigId: String(parsed.defaultSubConfigId || "").toUpperCase() };
  parsed.subApis = apiConfig.subApis;
  parsed.defaultSubApiId = apiConfig.defaultSubApiId;
  parsed.subConfigs = subConfig.subConfigs;
  parsed.defaultSubConfigId = subConfig.defaultSubConfigId;
  if (parsed.subName === "SUB-UI") parsed.subName = "SUB";
  const subApis = normalizeProviderList(parsed.subApis);
  const subConfigs = normalizeProviderList(parsed.subConfigs);
  const defaultSubApiId = String(parsed.defaultSubApiId || "").toUpperCase();
  const defaultSubConfigId = String(parsed.defaultSubConfigId || "").toUpperCase();
  const normalizedStored = upperCaseObject(stored);
  for (const key of ["FAKEMODE", "FAKEURL", "FAKEURL302", "FAKECODE", "NOADS", "SUBAPI", "SUBCONFIG"]) delete normalizedStored[key];
  parsed.subApis = subApis;
  parsed.subConfigs = subConfigs;
  parsed.defaultSubApiId = defaultSubApiId;
  parsed.defaultSubConfigId = defaultSubConfigId;
  const configExists = Boolean(raw) || legacySections.size > 0 || Boolean(apiRaw) || Boolean(configRaw);
  const canonicalBase = serializeBaseConfig(parsed, normalizedStored);
  const canonicalStored = configExists ? { ...canonicalBase, CONFIGVERSION: CONFIG_VERSION } : canonicalBase;
  const changed = configExists && JSON.stringify(JSON.parse(raw || "{}")) !== JSON.stringify(canonicalStored);
  const serializedApis = serializeProviderConfig({ subApis, defaultSubApiId }, "subapi");
  const serializedConfigs = serializeProviderConfig({ subConfigs, defaultSubConfigId }, "subconfig");
  const migrateApi = apiRaw ? apiRaw !== serializedApis : Boolean(stored.SUBAPIS) || legacySections.has("subapi");
  const migrateConfig = configRaw ? configRaw !== serializedConfigs : Boolean(stored.SUBCONFIGS) || legacySections.has("subconfig");
  if (changed || migrateApi || migrateConfig) {
    try {
      if (migrateApi) await env.KV.put(SUBAPIS_KEY, serializedApis);
      if (migrateConfig) await env.KV.put(SUBCONFIGS_KEY, serializedConfigs);
      if (changed) await env.KV.put("CONFIG.JSON", JSON.stringify(canonicalStored));
      for (const key of legacySections.values()) await env.KV.delete(key);
    } catch (error) {
      throw new ConfigStorageError("无法迁移旧版配置存储", { cause: error });
    }
  }
  return parsed;
}
__name(getConfig, "getConfig");
async function putConfig(env, value) {
  await putBaseConfig(env, value);
  await putProviderConfig(env, "subapi", value);
  await putProviderConfig(env, "subconfig", value);
}
__name(putConfig, "putConfig");
async function putBaseConfig(env, value) {
  await env.KV.put("CONFIG.JSON", JSON.stringify(serializeBaseConfig(value)));
}
__name(putBaseConfig, "putBaseConfig");
async function putProviderConfig(env, type, value) {
  if (type === "subapi") {
    await env.KV.put(SUBAPIS_KEY, serializeProviderConfig({ subApis: value.subApis, defaultSubApiId: value.defaultSubApiId }, type));
    return;
  }
  if (type === "subconfig") {
    await env.KV.put(SUBCONFIGS_KEY, serializeProviderConfig({ subConfigs: value.subConfigs, defaultSubConfigId: value.defaultSubConfigId }, type));
    return;
  }
  throw new Error(`未知配置类型：${type}`);
}
__name(putProviderConfig, "putProviderConfig");
function serializeBaseConfig(value, original = {}) {
  const normalized = { ...original, ...normalizeConfigData(value) };
  for (const key of ["SUBAPIS", "SUBCONFIGS", "DEFAULTSUBAPIID", "DEFAULTSUBCONFIGID", "CONFIGVERSION"]) delete normalized[key];
  delete normalized.subApis;
  delete normalized.subConfigs;
  delete normalized.defaultSubApiId;
  delete normalized.defaultSubConfigId;
  return { ...upperCaseObject(normalized), CONFIGVERSION: CONFIG_VERSION };
}
__name(serializeBaseConfig, "serializeBaseConfig");
function parseProviderConfig(raw, type) {
  let value;
  try {
    value = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid shape");
    value = normalizeConfigData(value);
    const isApi = type === "subapi";
    const items = value[isApi ? "subApis" : "subConfigs"];
    if (!Array.isArray(items)) throw new Error("provider list missing");
    return {
      [isApi ? "subApis" : "subConfigs"]: normalizeProviderList(items),
      [isApi ? "defaultSubApiId" : "defaultSubConfigId"]: String(value[isApi ? "defaultSubApiId" : "defaultSubConfigId"] || "").toUpperCase()
    };
  } catch (error) {
    throw new ConfigStorageError(`${type === "subapi" ? "SUBAPIS" : "SUBCONFIGS"} KV 数据无效`, { cause: error });
  }
}
__name(parseProviderConfig, "parseProviderConfig");
async function readLegacyProviderConfig(env, type) {
  const key = `${CONFIG_SECTION_PREFIX}${type.toUpperCase()}`;
  let raw;
  try {
    raw = await env.KV.get(key);
  } catch (error) {
    throw new ConfigStorageError(`无法读取旧配置分组：${type}`, { cause: error });
  }
  return raw ? parseProviderConfig(raw, type) : null;
}
__name(readLegacyProviderConfig, "readLegacyProviderConfig");
function serializeProviderConfig(value, type) {
  const isApi = type === "subapi";
  const serialized = upperCaseObject({
    [isApi ? "subApis" : "subConfigs"]: normalizeProviderList(value[isApi ? "subApis" : "subConfigs"]),
    [isApi ? "defaultSubApiId" : "defaultSubConfigId"]: String(value[isApi ? "defaultSubApiId" : "defaultSubConfigId"] || "").toUpperCase()
  });
  const defaultKey = isApi ? "DEFAULTSUBAPIID" : "DEFAULTSUBCONFIGID";
  serialized[isApi ? "DEFAULT_SUBAPI_ID" : "DEFAULT_SUBCONFIG_ID"] = serialized[defaultKey];
  delete serialized[defaultKey];
  return JSON.stringify(serialized);
}
__name(serializeProviderConfig, "serializeProviderConfig");
function normalizeProviderList(input) {
  if (!Array.isArray(input)) return [];
  return input.map((x) => ({
    id: String(x?.id || x?.ID || makeSubId()).toUpperCase(),
    name: normalizeName(x?.name || x?.NAME || "\u672A\u547D\u540D"),
    url: String(x?.url || x?.URL || "").trim(),
    ...x?.providerType || x?.PROVIDERTYPE ? { providerType: String(x.providerType || x.PROVIDERTYPE) } : {}
  })).filter((x) => x.url);
}
__name(normalizeProviderList, "normalizeProviderList");
function buildPublicPreferencesCookie(value) {
  const encoded = encodeURIComponent(JSON.stringify(value));
  if (encoded.length > 3600) return "";
  return `CF_SUB_PREFS=${encoded}; Max-Age=2592000; Path=/; SameSite=Lax; Secure`;
}
__name(buildPublicPreferencesCookie, "buildPublicPreferencesCookie");
async function handlePublicGenerate(request, env, requestUrl) {
  if (!env.KV) return jsonResponse({ ok: false, error: "\u672A\u7ED1\u5B9A KV" }, 500);
  try {
    const data = await request.json();
    const sources = cleanSourceList(data.sources || "");
    if (!sources.length) return jsonResponse({ ok: false, error: "\u8BF7\u8F93\u5165\u81F3\u5C11\u4E00\u4E2A\u8BA2\u9605\u94FE\u63A5" }, 400);
    if (sources.length > 100) return jsonResponse({ ok: false, error: "\u8BA2\u9605\u94FE\u63A5\u6700\u591A 100 \u6761" }, 400);
    const updateMinutes = Number(data.update ?? DEFAULT_UPDATE_MINUTES);
    if (!Number.isSafeInteger(updateMinutes) || updateMinutes < 0 || updateMinutes > 525600) return jsonResponse({ ok: false, error: "\u63A8\u8350\u66F4\u65B0\u65F6\u95F4\u5FC5\u987B\u662F 0 \u5230 525600 \u4E4B\u95F4\u7684\u6574\u6570\u5206\u949F" }, 400);
    const updateEnable = normalizeUpdateEnabled(data.updateEnable);
    const destroyKey = String(data.destroyKey || "").trim().slice(0, 256);
    const cfg = await getConfig(env);
    const apis = normalizeProviderList(cfg.subApis);
    const configs = normalizeProviderList(cfg.subConfigs);
    const apiIds = Array.isArray(data.apiIds) ? [...new Set(data.apiIds.map((x) => String(x).trim().toUpperCase()).filter(Boolean))] : [];
    const configIds = Array.isArray(data.configIds) ? [...new Set(data.configIds.map((x) => String(x).trim().toUpperCase()).filter(Boolean))] : [];
    if (apiIds.length > 1 || configIds.length > 1) return jsonResponse({ ok: false, error: "\u6BCF\u4E2A\u805A\u5408\u8BA2\u9605\u94FE\u63A5\u53EA\u80FD\u9009\u62E9\u4E00\u4E2A\u8F6C\u6362\u540E\u7AEF\u548C\u4E00\u4E2A\u8F6C\u6362\u89C4\u5219" }, 400);
    const apiCustom = Boolean(data.apiCustom);
    const configCustom = Boolean(data.configCustom);
    let apiUrl = String(data.apiUrl || "").trim();
    const configUrl = String(data.configUrl || "").trim();
    const selectedApis = apiIds.map((id) => apis.find((x) => x.id === id)).filter(Boolean);
    const selectedConfigs = configIds.map((id) => configs.find((x) => x.id === id)).filter(Boolean);
    if (!selectedApis.length && !apiCustom) return jsonResponse({ ok: false, error: "\u8BF7\u9009\u62E9\u81F3\u5C11\u4E00\u4E2A\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF" }, 400);
    if (!selectedConfigs.length && !configCustom) return jsonResponse({ ok: false, error: "\u8BF7\u9009\u62E9\u81F3\u5C11\u4E00\u4E2A\u8BA2\u9605\u8F6C\u6362\u89C4\u5219" }, 400);
    if (apiCustom && !/^https?:\/\//i.test(apiUrl)) apiUrl = "https://" + apiUrl;
    if (apiCustom && !/^https?:\/\//i.test(apiUrl)) return jsonResponse({ ok: false, error: "\u81EA\u5B9A\u4E49\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF\u5FC5\u987B\u4EE5 http:// \u6216 https:// \u5F00\u5934" }, 400);
    if (configCustom && !/^https?:\/\//i.test(configUrl)) return jsonResponse({ ok: false, error: "\u81EA\u5B9A\u4E49\u8BA2\u9605\u8F6C\u6362\u89C4\u5219\u5FC5\u987B\u4EE5 http:// \u6216 https:// \u5F00\u5934" }, 400);
    const apiEntries = [...selectedApis.map((x) => ({ id: x.id, url: x.url, name: x.name })), ...apiCustom ? [{ id: "", url: apiUrl, name: "\u81EA\u5B9A\u4E49" }] : []];
    const configEntries = [...selectedConfigs.map((x) => ({ id: x.id, url: x.url, name: x.name })), ...configCustom ? [{ id: "", url: configUrl, name: "\u81EA\u5B9A\u4E49" }] : []];
    const backends = [];
    for (const api of apiEntries) {
      const rawApi = String(api.url || "").trim();
      const protocol = /^http:\/\//i.test(rawApi) ? "http" : "https";
      const host = rawApi.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
      if (!host) continue;
      for (const config of configEntries) {
        const rawConfig = String(config.url || "").trim();
        if (!/^https?:\/\//i.test(rawConfig)) continue;
        backends.push({ api: host, config: rawConfig, protocol });
      }
    }
    if (!backends.length) return jsonResponse({ ok: false, error: "\u6CA1\u6709\u6709\u6548\u7684\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF\u4E0E\u89C4\u5219\u7EC4\u5408" }, 400);
    const name = String(data.name || "").trim().slice(0, 80);
    const noAds = String(data.noAds || "").trim().slice(0, 5e3);
    const token = String(data.path || "").trim() || crypto.randomUUID();
    if (token.length < 3 || token.length > 128 || !/^[-A-Za-z0-9_]+$/.test(token)) return jsonResponse({ ok: false, error: "\u94FE\u63A5\u8DEF\u5F84\u53EA\u80FD\u4F7F\u7528\u5B57\u6BCD\u3001\u6570\u5B57\u3001\u77ED\u6A2A\u7EBF\u6216\u4E0B\u5212\u7EBF\uFF0C\u4E14\u957F\u5EA6\u81F3\u5C11\u4E3A 3 \u4E2A\u5B57\u7B26" }, 400);
    if (["admin", "api", "login", "logout", "favicon"].includes(token.toLowerCase())) return jsonResponse({ ok: false, error: "\u8BE5\u94FE\u63A5\u8DEF\u5F84\u4E0D\u53EF\u4F7F\u7528" }, 400);
    let existingToken;
    try {
      existingToken = await env.KV.get(`${URL_PREFIX}${token}`);
    } catch (error) {
      console.error("Generated link path collision check failed:", error);
      return jsonResponse(
        { ok: false, error: "\u65E0\u6CD5\u786E\u8BA4\u94FE\u63A5\u8DEF\u5F84\u662F\u5426\u5DF2\u5B58\u5728\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5" },
        503,
        { "Retry-After": "5" }
      );
    }
    if (existingToken !== null) return jsonResponse({ ok: false, error: "\u8BE5\u94FE\u63A5\u8DEF\u5F84\u5DF2\u5B58\u5728\uFF0C\u8BF7\u66F4\u6362\u4E00\u4E2A" }, 409);
    const destroyKeyHash = destroyKey ? await sha256Hex(`${token}:${destroyKey}`) : "";
    const item = {
      url: token,
      sources,
      ...apiCustom ? { subApi: [{ url: apiUrl }] } : selectedApis[0] ? { subApi: [{ id: selectedApis[0].id }] } : {},
      ...configCustom ? { subConfig: [{ url: configUrl }] } : selectedConfigs[0] ? { subConfig: [{ id: selectedConfigs[0].id }] } : {},
      ...name ? { name } : {},
      noAds,
      update: updateMinutes,
      updateEnable,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      destroyKeyHash
    };
    const storedItem = Object.fromEntries(
      Object.entries(upperCaseObject(item)).flatMap(([key, value]) => {
        if (key === "UPDATE") return [[key, value], ["UPDATE_ENABLE", updateEnable]];
        if (key === "UPDATEENABLE") return [];
        return [[key, value]];
      })
    );
    storedItem.SOURCES = await encryptSourceList(env, sources);
    await env.KV.put(`${URL_PREFIX}${token}`, JSON.stringify(storedItem));
    const prefs = {
      apiIds: selectedApis.map((x) => x.id),
      apiCustom,
      apiUrl: apiCustom ? apiUrl : "",
      configIds: selectedConfigs.map((x) => x.id),
      configCustom,
      configUrl: configCustom ? configUrl : "",
      name,
      noAds
    };
    const cookie = buildPublicPreferencesCookie(prefs);
    const headers = cookie ? { "Set-Cookie": cookie } : {};
    const subscriptionUrl = `${requestUrl.origin}/${encodeURIComponent(token)}`;
    const responseItem = { ...storedItem };
    delete responseItem.DESTROYKEYHASH;
    return jsonResponse({ ok: true, url: responseItem, subscription_url: subscriptionUrl }, 200, headers);
  } catch (e) {
    return jsonResponse({ ok: false, error: e?.message || String(e) }, 500);
  }
}
__name(handlePublicGenerate, "handlePublicGenerate");
async function handlePublicDestroy(request, env) {
  if (!env.KV) return jsonResponse({ ok: false, error: "\u672A\u7ED1\u5B9A KV" }, 500);
  try {
    const data = await request.json();
    let token = String(data.token || "").trim();
    const suppliedKey = String(data.key || "").trim().slice(0, 256);
    if (!token) {
      const rawUrl = String(data.url || "").trim();
      if (rawUrl) {
        try {
          token = decodeURIComponent(new URL(rawUrl).pathname.replace(/^\/+/, ""));
        } catch (e) {
        }
      }
    }
    token = String(token || "").trim().replace(/^\/+|\/+$/g, "");
    if (!token) return jsonResponse({ ok: false, error: "\u7F3A\u5C11\u8BA2\u9605\u94FE\u63A5\u6807\u8BC6" }, 400);
    if (!/^[-A-Za-z0-9_]+$/.test(token) || token.length > 128) return jsonResponse({ ok: false, error: "\u8BA2\u9605\u94FE\u63A5\u6807\u8BC6\u65E0\u6548" }, 400);
    const raw = await env.KV.get(`${URL_PREFIX}${token}`);
    if (!raw) return jsonResponse({ ok: false, error: "\u94FE\u63A5\u4E0D\u5B58\u5728\u6216\u5DF2\u7ECF\u88AB\u9500\u6BC1" }, 404);
    let item = null;
    try {
      item = JSON.parse(raw);
    } catch (e) {
      item = null;
    }
    item = normalizeTokenData(item);
    const storedHash = String(item?.destroyKeyHash || "");
    if (storedHash) {
      if (!suppliedKey) return jsonResponse({ ok: false, error: "\u9700\u8981\u63D0\u4F9B\u9500\u6BC1\u5BC6\u94A5", requireKey: true }, 403);
      const suppliedHash = await sha256Hex(`${token}:${suppliedKey}`);
      if (suppliedHash !== storedHash) return jsonResponse({ ok: false, error: "\u9500\u6BC1\u5BC6\u94A5\u9519\u8BEF", requireKey: true }, 403);
    }
    await env.KV.delete(`${URL_PREFIX}${token}`);
    return jsonResponse({ ok: true, token });
  } catch (e) {
    return jsonResponse({ ok: false, error: e?.message || String(e) }, 500);
  }
}
__name(handlePublicDestroy, "handlePublicDestroy");
async function handlePublicEditAccess(request, env) {
  if (!env.KV) return jsonResponse({ ok: false, error: "\u672A\u7ED1\u5B9A KV" }, 500);
  try {
    const data = await request.json();
    const token = String(data.token || "").trim().replace(/^\/+|\/+$/g, "");
    const suppliedKey = String(data.key || "").trim().slice(0, 256);
    if (!token || !/^[-A-Za-z0-9_]+$/.test(token) || token.length > 128) return jsonResponse({ ok: false, error: "\u8BA2\u9605\u94FE\u63A5\u6807\u8BC6\u65E0\u6548" }, 400);
    const raw = await env.KV.get(`${URL_PREFIX}${token}`);
    if (!raw) return jsonResponse({ ok: false, error: "\u94FE\u63A5\u4E0D\u5B58\u5728\u6216\u5DF2\u88AB\u9500\u6BC1" }, 404);
    let stored;
    try {
      stored = upperCaseObject(JSON.parse(raw));
    } catch {
      return jsonResponse({ ok: false, error: "\u805A\u5408\u94FE\u63A5\u6570\u636E\u65E0\u6548" }, 500);
    }
    const tokenData = normalizeTokenData(stored);
    const storedHash = String(tokenData?.destroyKeyHash || "");
    if (storedHash) {
      if (!suppliedKey) return jsonResponse({ ok: false, error: "\u8BF7\u8F93\u5165\u7F16\u8F91\u5BC6\u94A5" }, 403);
      if (await sha256Hex(`${token}:${suppliedKey}`) !== storedHash) return jsonResponse({ ok: false, error: "\u7F16\u8F91\u5BC6\u94A5\u9519\u8BEF" }, 403);
    }
    return jsonResponse({
      ok: true,
      tokenData: {
      SOURCES: await decryptSourceList(env, tokenData.sources || []),
        NAME: tokenData.name,
        SUBAPI: tokenData.subApi,
        SUBCONFIG: tokenData.subConfig,
        CUSTOMSUBAPI: tokenData.customSubApi,
        CUSTOMSUBCONFIG: tokenData.customSubConfig,
        NOADS: tokenData.noAds,
        UPDATE: tokenData.update,
        UPDATE_ENABLE: tokenData.updateEnable
      }
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error?.message || String(error) }, 500);
  }
}
__name(handlePublicEditAccess, "handlePublicEditAccess");
async function handlePublicUpdate(request, env) {
  if (!env.KV) return jsonResponse({ ok: false, error: "\u672A\u7ED1\u5B9A KV" }, 500);
  try {
    const data = await request.json();
    const token = String(data.token || "").trim().replace(/^\/+|\/+$/g, "");
    const suppliedKey = String(data.key || "").trim().slice(0, 256);
    if (!token || !/^[-A-Za-z0-9_]+$/.test(token) || token.length > 128) return jsonResponse({ ok: false, error: "\u8BA2\u9605\u94FE\u63A5\u6807\u8BC6\u65E0\u6548" }, 400);
    const raw = await env.KV.get(`${URL_PREFIX}${token}`);
    if (!raw) return jsonResponse({ ok: false, error: "\u94FE\u63A5\u4E0D\u5B58\u5728\u6216\u5DF2\u88AB\u9500\u6BC1" }, 404);
    let original;
    try {
      original = JSON.parse(raw);
    } catch {
      return jsonResponse({ ok: false, error: "\u805A\u5408\u94FE\u63A5\u6570\u636E\u65E0\u6548" }, 500);
    }
    const tokenData = normalizeTokenData(original);
    const storedHash = String(tokenData?.destroyKeyHash || "");
    if (storedHash) {
      if (!suppliedKey) return jsonResponse({ ok: false, error: "\u8BF7\u8F93\u5165\u7F16\u8F91\u5BC6\u94A5" }, 400);
      if (await sha256Hex(`${token}:${suppliedKey}`) !== storedHash) return jsonResponse({ ok: false, error: "\u7F16\u8F91\u5BC6\u94A5\u9519\u8BEF" }, 403);
    }

    const sources = cleanSourceList(data.sources || "");
    if (!sources.length) return jsonResponse({ ok: false, error: "\u8BF7\u8F93\u5165\u81F3\u5C11\u4E00\u4E2A\u8BA2\u9605\u94FE\u63A5" }, 400);
    if (sources.length > 100) return jsonResponse({ ok: false, error: "\u8BA2\u9605\u94FE\u63A5\u6700\u591A 100 \u6761" }, 400);
    const updateMinutes = Number(data.update);
    if (!Number.isSafeInteger(updateMinutes) || updateMinutes < 0 || updateMinutes > 525600) return jsonResponse({ ok: false, error: "\u63A8\u8350\u66F4\u65B0\u65F6\u95F4\u5FC5\u987B\u662F 0 \u5230 525600 \u4E4B\u95F4\u7684\u6574\u6570\u5206\u949F" }, 400);

    const cfg = await getConfig(env);
    const apiCustom = Boolean(data.apiCustom);
    const configCustom = Boolean(data.configCustom);
    let apiReference;
    let configReference;
    if (apiCustom) {
      let apiUrl = String(data.apiUrl || "").trim();
      if (!/^https?:\/\//i.test(apiUrl)) apiUrl = "https://" + apiUrl;
      if (!/^https?:\/\/\S+$/i.test(apiUrl)) return jsonResponse({ ok: false, error: "\u81EA\u5B9A\u4E49 SUBAPI \u5FC5\u987B\u662F\u6709\u6548\u7684 http:// \u6216 https:// URL" }, 400);
      apiReference = { URL: apiUrl };
    } else {
      const apiId = String(data.apiId || "").trim().toUpperCase();
      if (!normalizeProviderList(cfg.subApis).some((provider) => provider.id === apiId)) return jsonResponse({ ok: false, error: "\u8BF7\u9009\u62E9\u6709\u6548\u7684 SUBAPI" }, 400);
      apiReference = { ID: apiId };
    }
    if (configCustom) {
      const configUrl = String(data.configUrl || "").trim();
      if (!/^https?:\/\/\S+$/i.test(configUrl)) return jsonResponse({ ok: false, error: "\u81EA\u5B9A\u4E49 SUBCONFIG \u5FC5\u987B\u662F\u6709\u6548\u7684 http:// \u6216 https:// URL" }, 400);
      configReference = { URL: configUrl };
    } else {
      const configId = String(data.configId || "").trim().toUpperCase();
      if (!normalizeProviderList(cfg.subConfigs).some((provider) => provider.id === configId)) return jsonResponse({ ok: false, error: "\u8BF7\u9009\u62E9\u6709\u6548\u7684 SUBCONFIG" }, 400);
      configReference = { ID: configId };
    }

    const stored = upperCaseObject(original);
    for (const key of ["NAME", "SUBAPIID", "SUBAPIIDS", "CUSTOMSUBAPI", "SUBAPINAME", "SUBCONFIGID", "SUBCONFIGIDS", "CUSTOMSUBCONFIG", "SUBCONFIGNAME", "BACKEND", "BACKENDS"]) delete stored[key];
    stored.SOURCES = await encryptSourceList(env, sources);
    stored.SUBAPI = [apiReference];
    stored.SUBCONFIG = [configReference];
    const name = String(data.name || "").trim().slice(0, 80);
    if (name) stored.NAME = name;
    else delete stored.NAME;
    stored.NOADS = String(data.noAds || "").trim().slice(0, 5e3);
    stored.UPDATE = updateMinutes;
    stored.UPDATE_ENABLE = normalizeUpdateEnabled(data.updateEnable);
    delete stored.UPDATEENABLE;
    stored.UPDATEDAT = (/* @__PURE__ */ new Date()).toISOString();
    await env.KV.put(`${URL_PREFIX}${token}`, JSON.stringify(stored));
    return jsonResponse({ ok: true, updatedAt: stored.UPDATEDAT });
  } catch (e) {
    return jsonResponse({ ok: false, error: e?.message || String(e) }, 500);
  }
}
__name(handlePublicUpdate, "handlePublicUpdate");
async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(String(input));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
function md5Hex(input) {
  const data = new TextEncoder().encode(String(input));
  const bitLen = data.length * 8;
  const len = ((data.length + 8 >> 6) + 1) * 64;
  const bytes = new Uint8Array(len);
  bytes.set(data);
  bytes[data.length] = 128;
  const view = new DataView(bytes.buffer);
  view.setUint32(len - 8, bitLen >>> 0, true);
  view.setUint32(len - 4, Math.floor(bitLen / 4294967296), true);
  let a0 = 1732584193;
  let b0 = 4023233417;
  let c0 = 2562383102;
  let d0 = 271733878;
  const s = [
    7,
    12,
    17,
    22,
    7,
    12,
    17,
    22,
    7,
    12,
    17,
    22,
    7,
    12,
    17,
    22,
    5,
    9,
    14,
    20,
    5,
    9,
    14,
    20,
    5,
    9,
    14,
    20,
    5,
    9,
    14,
    20,
    4,
    11,
    16,
    23,
    4,
    11,
    16,
    23,
    4,
    11,
    16,
    23,
    4,
    11,
    16,
    23,
    6,
    10,
    15,
    21,
    6,
    10,
    15,
    21,
    6,
    10,
    15,
    21,
    6,
    10,
    15,
    21
  ];
  const K = new Uint32Array(64);
  for (let i = 0; i < 64; i++) {
    K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
  }
  const leftRotate = /* @__PURE__ */ __name((x, amount) => (x << amount | x >>> 32 - amount) >>> 0, "leftRotate");
  for (let offset = 0; offset < bytes.length; offset += 64) {
    const M = new Uint32Array(16);
    for (let i = 0; i < 16; i++) M[i] = view.getUint32(offset + i * 4, true);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) {
        F = B & C | ~B & D;
        g = i;
      } else if (i < 32) {
        F = D & B | ~D & C;
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = 7 * i % 16;
      }
      F = F + A + K[i] + M[g] >>> 0;
      A = D;
      D = C;
      C = B;
      B = B + leftRotate(F, s[i]) >>> 0;
    }
    a0 = a0 + A >>> 0;
    b0 = b0 + B >>> 0;
    c0 = c0 + C >>> 0;
    d0 = d0 + D >>> 0;
  }
  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, a0, true);
  outView.setUint32(4, b0, true);
  outView.setUint32(8, c0, true);
  outView.setUint32(12, d0, true);
  return Array.from(out, (b) => b.toString(16).padStart(2, "0")).join("");
}
__name(md5Hex, "md5Hex");
async function MD5MD5(text) {
  const firstHex = md5Hex(text);
  return md5Hex(firstHex.slice(7, 27));
}
__name(MD5MD5, "MD5MD5");
function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const cookies = cookie.split(";").map((item) => item.trim());
  for (const item of cookies) {
    const index = item.indexOf("=");
    if (index === -1) continue;
    if (item.slice(0, index) === name) return decodeURIComponent(item.slice(index + 1));
  }
  return "";
}
__name(getCookie, "getCookie");
function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}
__name(jsonResponse, "jsonResponse");
function escapeHTML(text = "") {
  return String(text).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
__name(escapeHTML, "escapeHTML");
async function getAdminSessionValue(user, pass, token) {
  if (!user || !pass) return "";
  return await MD5MD5(`${user}:${pass}:${token}:admin-login`);
}
__name(getAdminSessionValue, "getAdminSessionValue");
function isAdminLoginEnabled(user, pass) {
  return !!(user && pass);
}
__name(isAdminLoginEnabled, "isAdminLoginEnabled");
async function isAdminLoggedIn(request, token, user, pass) {
  const session = await getAdminSessionValue(user, pass, token);
  return session ? getCookie(request, "CF_SUB_ADMIN") === session : false;
}
__name(isAdminLoggedIn, "isAdminLoggedIn");
function buildAdminCookie(value, url) {
  const secure = url.protocol === "https:" ? "; Secure" : "";
  return `CF_SUB_ADMIN=${encodeURIComponent(value)}; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax${secure}`;
}
__name(buildAdminCookie, "buildAdminCookie");
async function handleAdminLogin(request, url, token, user, pass) {
  let inputUser = "";
  let inputPass = "";
  try {
    const form = await request.formData();
    inputUser = String(form.get("username") || "");
    inputPass = String(form.get("password") || "");
  } catch (e) {
    return new Response(renderLoginPage(url, "\u767B\u5F55\u8BF7\u6C42\u683C\u5F0F\u4E0D\u6B63\u786E"), { status: 400, headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-store" } });
  }
  if (inputUser === user && inputPass === pass) {
    const session = await getAdminSessionValue(user, pass, token);
    return new Response("", { status: 302, headers: { "Location": url.pathname, "Set-Cookie": buildAdminCookie(session, url), "Cache-Control": "no-store" } });
  }
  return new Response(renderLoginPage(url, "\u7528\u6237\u540D\u6216\u5BC6\u7801\u9519\u8BEF"), { status: 401, headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-store" } });
}
__name(handleAdminLogin, "handleAdminLogin");
function getToolStyles() {
  return `
        * { box-sizing: border-box; }
        :root { --ui-primary-bg: #2f3338; --ui-primary-fg: #fff; --ui-primary-border: #343a40; --ui-primary-hover: #1f2327; --ui-secondary-bg: #fff; --ui-secondary-fg: #222; --ui-secondary-border: #c8c8c0; --ui-danger-bg: #dc3545; --ui-danger-fg: #fff; --ui-danger-border: #dc3545; --ui-link: #1f4b99; --ui-focus: #3b82f6; --ui-choice: #1677ff; }
        body { margin: 0; background: radial-gradient(circle at 0% 0%, rgba(222,246,235,.78), transparent 38%), linear-gradient(135deg, #f7faf8 0%, #eef7f2 52%, #e3f2e9 100%); color: #202124; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.5; min-height: 100vh; transition: background 0.3s, color 0.3s; background-attachment: fixed; }
        .page { width: 100%; max-width: 760px; margin: 0 auto; padding: 18px 14px 28px; }
        .page.app-shell { max-width: 1100px; margin: 24px auto 40px; padding: 0 28px 34px; border: 1px solid rgba(255,255,255,.72); border-radius: 28px; background: linear-gradient(135deg, rgba(255,255,255,.82) 0%, rgba(246,252,248,.76) 48%, rgba(225,244,233,.82) 100%); box-shadow: 0 18px 55px rgba(50,90,70,.10); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); overflow: hidden; }
        .header { margin-bottom: 14px; }
        .title { margin: 0; font-size: 28px; font-weight: 700; line-height: 1.2; color: #1a1a1a; transition: color 0.3s; }
        .subtitle { margin-top: 8px; color: #666; font-size: 13px; }
        .panel { background: rgba(255, 255, 255, 0.85); border: 1px solid rgba(229, 229, 223, 0.8); border-radius: 20px; padding: 16px; margin-top: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); transition: background 0.3s, border-color 0.3s; }
        .section-title { margin: 0 0 10px; font-size: 15px; font-weight: 700; }
        .section-note { margin: 4px 0 10px; color: #888; font-size: 12px; }
        .link-list { display: grid; gap: 10px; }
        .link-item { border: 1px solid rgba(229, 229, 223, 0.6); border-radius: 12px; padding: 12px; background: rgba(255, 255, 255, 0.5); transition: background 0.3s, border-color 0.3s; }
        .link-label { font-weight: 600; margin-bottom: 8px; color: #1a1a1a; transition: color 0.3s; }
        .link-url { display: block; width: 100%; word-wrap: break-word; overflow-wrap: break-word; word-break: break-all; white-space: normal; padding: 10px; border: 1px solid rgba(229, 229, 223, 0.8); border-radius: 8px; background: rgba(250, 250, 250, 0.7); color: #1f4b99; text-decoration: none; transition: all 0.3s ease; }
        .link-url:hover { background: rgba(31, 75, 153, 0.05); border-color: #1f4b99; }
        .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
        button, .button { min-height: 36px; padding: 8px 16px; border: 1px solid #343a40; border-radius: 10px; background: #2f3338; color: #fff; font-size: 14px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; }
        button:hover, .button:hover { background: #1f2327; box-shadow: 0 4px 12px rgba(34, 34, 34, 0.15); }
        button.secondary { background: #fff; color: #222; border-color: #c8c8c0; }
        button.secondary:hover { background: #f1f3f5; }
        button.danger, .button.danger { background: #dc3545; border-color: #dc3545; }
        button.danger:hover, .button.danger:hover { background: #c82333; box-shadow: 0 4px 12px rgba(220, 53, 69, 0.2); }
        button:disabled { opacity: 0.65; cursor: default; }
        button.ui-button-primary, .button.ui-button-primary { background: var(--ui-primary-bg) !important; color: var(--ui-primary-fg) !important; border-color: var(--ui-primary-border) !important; }
        button.ui-button-secondary, .button.ui-button-secondary { background: var(--ui-secondary-bg) !important; color: var(--ui-secondary-fg) !important; border-color: var(--ui-secondary-border) !important; }
        button.ui-button-danger, .button.ui-button-danger { background: var(--ui-danger-bg) !important; color: var(--ui-danger-fg) !important; border-color: var(--ui-danger-border) !important; }
        button.ui-button-primary:not(:disabled):hover, .button.ui-button-primary:not(:disabled):hover { background: var(--ui-primary-hover) !important; }
        button.ui-button-secondary:not(:disabled):hover, .button.ui-button-secondary:not(:disabled):hover { background: #f1f3f5 !important; }
        button.ui-button-danger:not(:disabled):hover, .button.ui-button-danger:not(:disabled):hover { background: #c82333 !important; }
        button.ui-select, select.ui-select { transition: background-color .18s ease, color .18s ease, border-color .18s ease, box-shadow .18s ease; }
        select.ui-select:focus { outline: none; border-color: var(--ui-focus); box-shadow: 0 0 0 3px rgba(59,130,246,.16); }
        .ui-choice-control { accent-color: var(--ui-choice); }
        a.ui-link-box { color: var(--ui-link); transition: background-color .18s ease, color .18s ease, border-color .18s ease, box-shadow .18s ease; }
        a.ui-link-box:hover { border-color: var(--ui-link); box-shadow: 0 0 0 2px rgba(31,75,153,.1); }
        .ui-link-box:focus-visible { outline: none; border-color: var(--ui-focus); box-shadow: 0 0 0 3px rgba(59,130,246,.16); }
        .ui-expand-toggle { transition: background-color .18s ease, color .18s ease, border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
        .ui-expand-toggle:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(59,130,246,.2); }
        .ui-status-item { display: block; padding: 8px 10px; border: 1px solid transparent; border-radius: 9px; font-weight: 650; overflow-wrap: anywhere; }
        .ui-status-item[data-state="success"] { background: rgba(76,175,80,.12); border-color: rgba(76,175,80,.25); color: #2e7d32; }
        .ui-status-item[data-state="pending"] { background: rgba(255,152,0,.1); border-color: rgba(255,152,0,.2); color: #f57c00; }
        .ui-status-item[data-state="error"] { background: rgba(244,67,54,.1); border-color: rgba(244,67,54,.22); color: #c62828; }
        .field { margin-top: 12px; }
        .path-row { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 10px; margin-top: 12px; }
        label { display: block; margin-bottom: 6px; font-weight: 600; color: #1a1a1a; transition: color 0.3s; }
        input, textarea, select { width: 100%; border: 1px solid rgba(207, 207, 200, 0.6); border-radius: 10px; background: rgba(255, 255, 255, 0.8); color: #202124; font-size: 14px; padding: 10px; transition: all 0.3s ease; word-wrap: break-word; word-break: break-all; white-space: pre-wrap; }
        input:focus, textarea:focus, select:focus { outline: none; border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        input, select { height: 42px; white-space: normal; }
        textarea { min-height: 200px; line-height: 1.5; resize: vertical; }
        .error { color: #b00020; margin-top: 10px; }
        .muted { color: #666; font-size: 13px; margin-left: 8px; transition: color 0.3s; }

        #current-qrcode { display: none; margin-top: 12px; padding: 12px; border: 1px solid rgba(229, 229, 223, 0.6); border-radius: 12px; background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); width: fit-content; max-width: 100%; }
        .hidden { display: none !important; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: none; justify-content: center; align-items: center; z-index: 1000; overflow-y: auto; }
        .modal-content { background: rgba(255, 255, 255, 0.95); border-radius: 20px; padding: 24px; width: 90%; max-width: 480px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); border: 1px solid rgba(255, 255, 255, 0.5); transition: background 0.3s, border-color 0.3s; margin: 20px auto; }
        .modal-overlay, .custom-modal-overlay, .guest-destroy-modal, .json-view-overlay { overscroll-behavior: contain; }
        .modal-overlay > .modal-content, .custom-modal-overlay > .custom-modal, .custom-modal-overlay > .aggregate-result-modal, .guest-destroy-modal > .guest-destroy-dialog, .json-view-overlay > .json-view-modal { max-height: calc(100vh - 40px); overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
        @media (prefers-color-scheme: dark) {
            :root { --ui-primary-bg: #111827; --ui-primary-fg: #fff; --ui-primary-border: #4b5563; --ui-primary-hover: #525b67; --ui-secondary-bg: #303943; --ui-secondary-fg: #f3f4f6; --ui-secondary-border: #66717c; --ui-danger-bg: #b8323f; --ui-danger-fg: #fff; --ui-danger-border: #d24b58; --ui-link: #64b5f6; --ui-choice: #60a5fa; }
            body { background: radial-gradient(circle at 0% 28%, rgba(0,188,212,.12), transparent 24%), radial-gradient(circle at 100% 100%, rgba(0,120,70,.20), transparent 34%), linear-gradient(180deg,#000 0%,#020807 58%,#00140b 100%); background-attachment: fixed; color: #e0e0e0; }
            .page.app-shell { background: linear-gradient(135deg, rgba(1,5,6,.98) 0%, rgba(2,10,10,.96) 48%, rgba(0,54,35,.92) 100%); border-color: rgba(255,255,255,.13); box-shadow: 0 22px 75px rgba(0,0,0,.55); }
            .title { color: #f5f5f5; }
            .subtitle, .section-note, .muted { color: #aaa; }
            .panel { background: rgba(30, 30, 30, 0.75); border-color: rgba(255, 255, 255, 0.1); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
            .link-item { background: rgba(40, 40, 40, 0.5); border-color: rgba(255, 255, 255, 0.1); }
            .link-label, label { color: #ddd; }
            .link-url { background: rgba(0, 0, 0, 0.3); color: #64b5f6; border-color: rgba(255,255,255,0.1); }
            .link-url:hover { background: rgba(100, 181, 246, 0.1); border-color: #64b5f6; }
            input, textarea, select { background: rgba(20, 20, 20, 0.8); color: #fff; border-color: rgba(255,255,255,0.2); }
            input:focus, textarea:focus, select:focus { background: #000; border-color: #3b82f6; }
            button, .button { background: #111827; color: #fff; border-color: #4b5563; box-shadow: 0 2px 8px rgba(0,0,0,0.35); }
            button:hover, .button:hover { background: #525b67; border-color: #858f9b; box-shadow: 0 4px 14px rgba(0,0,0,0.4); }
            button.secondary, .button.secondary { background: #303943; color: #f3f4f6; border-color: #66717c; }
            button.secondary:hover, .button.secondary:hover { background: #46515d; color: #fff; border-color: #8c99a6; }
            button.danger { background: #b8323f; color: #fff; border-color: #d24b58; }
            button.danger:hover { background: #d13e4d; border-color: #e16a75; }
            .ui-status-item[data-state="success"] { background: rgba(129,199,132,.1); color: #81c784; border-color: rgba(129,199,132,.2); }
            .ui-status-item[data-state="pending"] { background: rgba(255,183,77,.1); color: #ffb74d; border-color: rgba(255,183,77,.2); }
            .ui-status-item[data-state="error"] { background: rgba(229,115,115,.1); color: #e57373; border-color: rgba(229,115,115,.2); }
            .modal-content { background: rgba(30, 30, 30, 0.95); border-color: rgba(255, 255, 255, 0.1); }
            #current-qrcode { background: rgba(255, 255, 255, 0.9); }
        }
        button:not(:disabled), .button:not(:disabled) { transform-origin: center; transition: background-color .18s ease, color .18s ease, border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
        button:not(:disabled):hover, .button:not(:disabled):hover { transform: scale(1.025); }
        button:not(:disabled):active, .button:not(:disabled):active { transform: scale(.95); }
        button.secondary:not(:disabled):hover, .button.secondary:not(:disabled):hover { background: #243b31; border-color: #243b31; color: #fff; box-shadow: 0 5px 14px rgba(22, 101, 52, .2); }
        button:not(.secondary):not(.danger):not([class*="destroy"]):not(:disabled):hover,
        .button:not(.secondary):not(.danger):not([class*="destroy"]):not(:disabled):hover { background: #e6f4ea; border-color: #73b88a; color: #174b2b; box-shadow: 0 5px 16px rgba(22, 101, 52, .18); }
        button.danger:not(:disabled):hover, .button.danger:not(:disabled):hover,
        button[class*="destroy"]:not(:disabled):hover, .button[class*="destroy"]:not(:disabled):hover { background: #fff !important; border-color: #b42318 !important; color: #b42318 !important; filter: none !important; transform: scale(1.045) !important; box-shadow: 0 0 0 4px rgba(180, 35, 24, .16), 0 8px 20px rgba(127, 29, 29, .2) !important; }
        button.danger:not(:disabled):active, .button.danger:not(:disabled):active,
        button[class*="destroy"]:not(:disabled):active, .button[class*="destroy"]:not(:disabled):active { background: #8f1111 !important; border-color: #8f1111 !important; color: #fff !important; transform: scale(.88) !important; box-shadow: inset 0 3px 8px rgba(0, 0, 0, .28) !important; }
        button:disabled, .button:disabled { transform: none; }
        select:not(:disabled):hover:not(:focus) { background: #e6f4ea; border-color: #73b88a; box-shadow: 0 0 0 3px rgba(22, 101, 52, .12), 0 4px 12px rgba(22, 101, 52, .1); transform: translateY(-1px); }
        @media (prefers-color-scheme: dark) {
            button.secondary:not(:disabled):hover, .button.secondary:not(:disabled):hover { background: #a7f3d0; border-color: #86efac; color: #10251a; box-shadow: 0 0 0 3px rgba(167,243,208,.18), 0 6px 18px rgba(0,0,0,.45); transform:scale(1.045); }
            button:not(.secondary):not(.danger):not([class*="destroy"]):not(:disabled):hover,
            .button:not(.secondary):not(.danger):not([class*="destroy"]):not(:disabled):hover { background: #22c55e; border-color: #86efac; color: #10251a; box-shadow: 0 5px 18px rgba(0, 0, 0, .35); }
            select:not(:disabled):hover:not(:focus) { background: #244b34; border-color: #86efac; color: #eaffef; box-shadow: 0 0 0 3px rgba(74, 222, 128, .18), 0 5px 16px rgba(0, 0, 0, .35); }
            button.danger:not(:disabled):hover, .button.danger:not(:disabled):hover,
            button[class*="destroy"]:not(:disabled):hover, .button[class*="destroy"]:not(:disabled):hover { background: #ffd6d6 !important; border-color: #ff9b9b !important; color: #7f1d1d !important; box-shadow: 0 0 0 4px rgba(255, 130, 130, .22), 0 8px 22px rgba(0, 0, 0, .45) !important; }
            button.danger:not(:disabled):active, .button.danger:not(:disabled):active,
            button[class*="destroy"]:not(:disabled):active, .button[class*="destroy"]:not(:disabled):active { background: #8f1111 !important; border-color: #ff9b9b !important; color: #fff !important; }
            button.ui-button-primary, .button.ui-button-primary { background: #111827 !important; color: #fff !important; border-color: #4b5563 !important; }
            button.ui-button-secondary, .button.ui-button-secondary { background: #303943 !important; color: #f3f4f6 !important; border-color: #66717c !important; }
            button.ui-button-danger, .button.ui-button-danger { background: #b8323f !important; color: #fff !important; border-color: #d24b58 !important; }
            button.ui-button-primary:not(:disabled):hover, .button.ui-button-primary:not(:disabled):hover { background: #525b67 !important; border-color: #858f9b !important; }
            button.ui-button-secondary:not(:disabled):hover, .button.ui-button-secondary:not(:disabled):hover { background: #a7f3d0 !important; border-color: #86efac !important; color: #10251a !important; }
            button.ui-button-danger:not(:disabled):hover, .button.ui-button-danger:not(:disabled):hover { background: #ffd6d6 !important; border-color: #ff9b9b !important; color: #7f1d1d !important; }
        }
        @media (prefers-reduced-motion: reduce) {
            button:not(:disabled), .button:not(:disabled) { transition: none; }
        }
    `;
}
__name(getToolStyles, "getToolStyles");
function renderFavicon(title, logo = "") {
  const iconUrl = String(logo || "").trim();
  if (iconUrl) return `<link rel="icon" href="${escapeHTML(iconUrl)}"><link rel="apple-touch-icon" href="${escapeHTML(iconUrl)}">`;
  const initial = Array.from(String(title || "").trim())[0] || "S";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2f6f54"/><text x="32" y="33" fill="#fff" font-family="Arial,sans-serif" font-size="38" font-weight="700" text-anchor="middle" dominant-baseline="central">${escapeHTML(initial)}</text></svg>`;
  return `<link rel="icon" type="image/svg+xml" href="${escapeHTML(`data:image/svg+xml,${encodeURIComponent(svg)}`)}">`;
}
__name(renderFavicon, "renderFavicon");
function renderLoginPage(url, error = "") {
  const title = `${FILENAME}\u7BA1\u7406\u9762\u677F`;
  return `<!DOCTYPE html>
<html>
<head>
<title>${escapeHTML(title)}</title>${renderFavicon(title, SITELOGO)}
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${getToolStyles()}
.login-btn { display: block; width: 100%; max-width: 280px; min-height: 44px; margin: 28px auto 6px; background: #2f3338; border: 1px solid #343a40; border-radius: 12px; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
.login-btn:hover { background: #1f2327; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25); }
@media (prefers-color-scheme: dark) { .login-btn { background: #3f4650; border-color: #69717c; } .login-btn:hover { background: #525b67; border-color: #858f9b; } }
.error { text-align: center; margin-top: 15px; color: #c62828; }
</style>
</head>
<body style="display:flex; justify-content:center; align-items:center; min-height:100vh; margin:0;">
<main class="page app-shell" style="width:100%; max-width:420px; padding:20px; margin:0;">
<section class="panel" style="padding:30px 24px; text-align:center;">
<h1 class="title" style="margin-bottom:10px;">${escapeHTML(FILENAME)}</h1>
<div class="subtitle" style="margin-bottom:24px;">\u8BF7\u767B\u5F55\u7BA1\u7406\u5458\u63A7\u5236\u53F0</div>
<form method="POST" action="${escapeHTML(url.pathname)}" style="text-align:left;">
<div class="field"><label>\u7528\u6237\u540D</label><input name="username" type="text" required autofocus></div>
<div class="field"><label>\u5BC6\u7801</label><input name="password" type="password" required></div>
<button type="submit" class="login-btn">\u767B\u5F55</button>
${error ? `<div class="error">${escapeHTML(error)}</div>` : ""}
</form>
</section>
</main>
</body>
</html>`;
}
__name(renderLoginPage, "renderLoginPage");
function getSubscriptionLinks(url, token) {
  const base = `${url.origin}/${token}`;
  return [
    ["\u81EA\u9002\u5E94\u8BA2\u9605\u5730\u5740", base],
    ["Base64\u8BA2\u9605\u5730\u5740", `${base}?b64`],
    ["Clash\u8BA2\u9605\u5730\u5740", `${base}?clash`],
    ["Sing-box\u8BA2\u9605\u5730\u5740", `${base}?sb`],
    ["Surge\u8BA2\u9605\u5730\u5740", `${base}?surge`],
    ["Loon\u8BA2\u9605\u5730\u5740", `${base}?loon`]
  ];
}
__name(getSubscriptionLinks, "getSubscriptionLinks");
function renderCFSubsGuestPage(url, guest, destroyKeyRequired = false, siteLogo = "", name = "") {
  const links = getSubscriptionLinks(url, guest);
  const title = `${String(name || "").trim() ? `${String(name).trim()} ` : ""}\u805A\u5408\u8BA2\u9605`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(title)}</title>${renderFavicon(title, siteLogo)}
<style>
${getToolStyles()}
.guest-shell{max-width:1100px;padding-top:0!important}.guest-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin:0 -28px 18px;padding:28px;border-bottom:1px solid rgba(120,130,140,.18)}.guest-header-main{min-width:0}.guest-header .title{font-size:26px}.guest-header .subtitle{margin-top:8px}.guest-head-destroy{flex:0 0 auto;min-height:36px;padding:7px 12px;background:#d93025;border-color:#d93025;color:#fff}.guest-head-destroy:hover{background:#b91c1c;border-color:#b91c1c;color:#fff}.guest-link-list{display:grid;gap:10px}.guest-link-item{position:relative;padding:12px;border:1px solid rgba(148,163,184,.22);border-radius:14px;background:linear-gradient(135deg,rgba(255,255,255,.9) 0%,rgba(248,251,250,.75) 52%,rgba(232,245,236,.82) 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 10px 24px rgba(15,23,42,.05);transition:border-color .25s ease,box-shadow .25s ease,background .25s ease}.guest-link-item:hover{border-color:rgba(59,130,246,.34);box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 12px 28px rgba(15,23,42,.08)}.guest-link-head{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:30px;margin-bottom:14px}.guest-link-label{font-weight:700;word-break:break-word;padding-right:90px}.guest-link-url{display:block;width:100%;box-sizing:border-box;padding:10px 12px;margin-top:14px;border:1px solid rgba(148,163,184,.28);border-radius:10px;background:rgba(250,250,250,.72);color:#1f4b99;text-decoration:none;word-break:break-all;overflow-wrap:anywhere;box-shadow:inset 0 1px 0 rgba(255,255,255,.65);transition:all .25s ease}.guest-link-url:hover{background:rgba(31,75,153,.04);border-color:rgba(31,75,153,.35);box-shadow:0 0 0 3px rgba(59,130,246,.08),inset 0 1px 0 rgba(255,255,255,.75)}.guest-actions{position:absolute;top:12px;right:12px;display:flex;gap:8px}.guest-copy-btn,.guest-hide-btn{min-width:56px;width:auto;height:30px;min-height:30px;padding:0 10px}.guest-hide-btn{display:none}.guest-qrcode{display:none;background:#fff;border-radius:12px;padding:12px;margin:14px auto 0;width:max-content;max-width:100%;box-shadow:0 8px 24px rgba(0,0,0,.08)}.guest-destroy-modal{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.44);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}.guest-destroy-dialog{width:min(440px,100%);padding:22px;border-radius:18px;background:rgba(255,255,255,.97);border:1px solid rgba(229,229,223,.9);box-shadow:0 20px 60px rgba(0,0,0,.24)}.guest-destroy-dialog h2{margin:0;font-size:18px}.guest-destroy-dialog p{margin:8px 0 14px;color:#777;font-size:13px;line-height:1.6}.guest-destroy-input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid rgba(120,130,140,.35);border-radius:10px;font:inherit}.guest-destroy-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.guest-destroy-confirm{background:#d93025;border-color:#d93025;color:#fff}.guest-destroy-confirm:hover{background:#b91c1c;border-color:#b91c1c;color:#fff}
@media(max-width:640px){.page.app-shell.guest-shell{width:calc(100% - 28px);margin:14px 14px 28px;padding:0 14px 24px;border-radius:22px}.guest-header{margin:0 -14px 16px;padding:22px 14px 20px}.guest-header .title{font-size:22px}.guest-header .subtitle{font-size:12px}.guest-head-destroy{min-height:34px;padding:6px 9px;font-size:12px}.guest-link-item{padding:10px}.guest-link-url{margin-top:10px}.guest-destroy-dialog{padding:18px}}
@media(prefers-color-scheme:dark){.guest-link-item{background:linear-gradient(135deg,rgba(10,16,19,.9) 0%,rgba(12,20,18,.78) 52%,rgba(8,16,13,.88) 100%);border-color:rgba(255,255,255,.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 10px 24px rgba(0,0,0,.22)}.guest-link-item:hover{border-color:rgba(96,165,250,.32);box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 14px 32px rgba(0,0,0,.28)}.guest-link-url{background:rgba(2,6,8,.82);border-color:rgba(255,255,255,.12);color:#64b5f6;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}.guest-link-url:hover{background:rgba(100,181,246,.08);border-color:#64b5f6;box-shadow:0 0 0 3px rgba(96,165,250,.1),inset 0 1px 0 rgba(255,255,255,.04)}.guest-destroy-dialog{background:rgba(30,30,30,.97);border-color:rgba(255,255,255,.1)}.guest-destroy-dialog p{color:#9aa7b5}.guest-destroy-input{background:rgba(0,0,0,.35);border-color:rgba(255,255,255,.12);color:#f3f6f7}}
</style><script src="https://cdn.jsdelivr.net/npm/@keeex/qrcodejs-kx@1.0.2/qrcode.min.js"></script></head><body><main class="page app-shell guest-shell" data-token="${escapeHTML(String(guest || ""))}" data-key-required="${destroyKeyRequired ? "true" : "false"}"><header class="header guest-header"><div class="guest-header-main"><h1 class="title">${String(name || "").trim() ? `${escapeHTML(String(name).trim())} ` : ""}聚合订阅链接</h1><div class="subtitle">复制订阅链接可同时生成二维码</div></div><button type="button" class="button guest-head-destroy">\u9500\u6BC1\u672C\u94FE\u63A5</button></header><div class="guest-link-list">${links.map(([label,value])=>`<div class="guest-link-item"><div class="guest-link-head"><div class="guest-link-label">${escapeHTML(label)}</div></div><a class="guest-link-url" href="${escapeHTML(value)}" target="_blank" rel="noopener">${escapeHTML(value)}</a><div class="guest-actions"><button type="button" class="button guest-copy-btn" data-url="${escapeHTML(value)}">复制</button><button type="button" class="button secondary guest-hide-btn">隐藏</button></div><div class="guest-qrcode"></div></div>`).join('')}</div></main><div class="guest-destroy-modal" id="guestDestroyModal"><div class="guest-destroy-dialog"><h2>\u9500\u6BC1\u672C\u94FE\u63A5</h2><p>\u9500\u6BC1\u540E\u6B64\u805A\u5408\u8BA2\u9605\u94FE\u63A5\u5C06\u7ACB\u5373\u5931\u6548\u4E14\u65E0\u6CD5\u6062\u590D\u3002\u8BF7\u8F93\u5165\u672C\u94FE\u63A5\u7684\u9500\u6BC1\u5BC6\u94A5\u3002</p><input id="guestDestroyKey" class="guest-destroy-input" type="password" autocomplete="current-password" placeholder="\u8BF7\u8F93\u5165\u9500\u6BC1\u5BC6\u94A5"><div class="guest-destroy-actions"><button type="button" class="button secondary" id="guestDestroyCancel">\u53D6\u6D88</button><button type="button" class="button guest-destroy-confirm" id="guestDestroyConfirm">\u786E\u8BA4\u9500\u6BC1</button></div></div></div><script src="/__cfsubs.js" defer><\/script><script>
function guestToast(message,isError){window.CC(message,isError)}function showGuestQr(b){const i=b.closest('.guest-link-item'),q=i.querySelector('.guest-qrcode'),c=i.querySelector('.guest-copy-btn'),h=i.querySelector('.guest-hide-btn');document.querySelectorAll('.guest-qrcode').forEach(x=>{x.style.display='none';x.innerHTML=''});document.querySelectorAll('.guest-copy-btn').forEach(x=>x.style.display='inline-flex');document.querySelectorAll('.guest-hide-btn').forEach(x=>x.style.display='none');q.innerHTML='';q.style.display='block';c.style.display='none';h.style.display='inline-flex';if(window.QRCode)new QRCode(q,{text:b.dataset.url,width:220,height:220,colorDark:'#000',colorLight:'#fff',correctLevel:QRCode.CorrectLevel.Q})}function hideGuestQr(b){const i=b.closest('.guest-link-item');i.querySelector('.guest-qrcode').style.display='none';i.querySelector('.guest-qrcode').innerHTML='';i.querySelector('.guest-copy-btn').style.display='inline-flex';b.style.display='none'}document.querySelectorAll('.guest-copy-btn').forEach(b=>b.addEventListener('click',()=>{const v=b.dataset.url||'';const done=()=>{guestToast('已复制到剪贴板');showGuestQr(b)};if(navigator.clipboard)navigator.clipboard.writeText(v).then(done).catch(()=>guestToast('复制失败，请手动复制',true));else{const t=document.createElement('textarea');t.value=v;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();done()}}));document.querySelectorAll('.guest-hide-btn').forEach(b=>b.addEventListener('click',()=>hideGuestQr(b)));
const destroyButton=document.querySelector('.guest-head-destroy'),destroyModal=document.getElementById('guestDestroyModal'),destroyKeyInput=document.getElementById('guestDestroyKey'),destroyToken=document.querySelector('.guest-shell').dataset.token;function closeDestroyModal(){window.CFSubsModal.close(destroyModal);destroyKeyInput.value=''}async function destroyCurrentLink(key){window.CFSubsUI.setButtonBusy(destroyButton,true,'销毁中…');try{const response=await fetch('/api/destroy',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify({token:destroyToken,key:key})});const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||'销毁失败');closeDestroyModal();guestToast('链接已销毁，该链接已失效');setTimeout(()=>{location.href='/'},900)}catch(error){window.CFSubsUI.setButtonBusy(destroyButton,false);guestToast(error.message||'销毁失败',true)}}destroyButton.addEventListener('click',()=>{if(document.querySelector('.guest-shell').dataset.keyRequired==='true'){window.CFSubsModal.open(destroyModal);destroyKeyInput.focus();return}if(confirm('销毁后此聚合订阅链接将立即失效且无法恢复，确定要销毁吗？'))destroyCurrentLink('')});document.getElementById('guestDestroyCancel').addEventListener('click',closeDestroyModal);document.getElementById('guestDestroyConfirm').addEventListener('click',()=>{const key=destroyKeyInput.value.trim();if(!key){guestToast('请输入销毁密钥',true);destroyKeyInput.focus();return}destroyCurrentLink(key)});destroyModal.addEventListener('click',event=>{if(event.target===destroyModal)closeDestroyModal()});document.addEventListener('keydown',event=>{if(event.key==='Escape')closeDestroyModal()});
</script></body></html>`;
}

function renderGuestPage(url, guest, destroyKeyRequired = false, siteLogo = "") {
  return renderCFSubsGuestPage(url, guest, destroyKeyRequired, siteLogo);
}
__name(renderGuestPage, "renderGuestPage");
function renderProviderModule(kind, providers, selectedId, currentUrl = "", options = {}) {
  const api = kind === "api";
  const fieldName = api ? "Api" : "Config";
  const label = api ? "订阅转换后端" : "订阅转换规则";
  const prefix = options.idPrefix || "";
  const pickerId = prefix ? `${prefix}${fieldName}` : `${api ? "api" : "config"}Picker`;
  const currentId = prefix ? `${prefix}${fieldName}Current` : `${api ? "api" : "config"}Current`;
  const statusId = prefix ? `${prefix}${fieldName}Status` : `${api ? "api" : "config"}Status`;
  const selected = providers.find((provider) => provider.id === selectedId);
  const url = selected?.url || currentUrl;
  const custom = !selected;
  const emptyText = api ? "暂无订阅转换后端，请编辑" : "暂无订阅转换规则，请编辑";
  const customField = options.showCustomInput ? `<div class="field provider-custom-input" id="${prefix}${fieldName}CustomField" ${custom ? "" : "hidden"}><label for="${prefix}${fieldName}Url">自定义地址</label><input id="${prefix}${fieldName}Url" type="url" placeholder="${api ? "https://subapi.example.com" : "https://example.com/config.ini"}" value="${escapeHTML(options.customUrl || "")}"></div>` : "";
  const customButton = options.showCustomInput ? "" : `<button type="button" class="button secondary edit-custom" id="edit${fieldName}Custom">编辑</button>`;
  return `<section class="${options.idPrefix ? "guest-edit-provider" : "panel"}"><h2 class="section-title">${label}(${api ? "SUBAPI" : "SUBCONFIG"})</h2><div class="section-note">选择一个${label}。</div>
<select class="native-picker" id="${pickerId}" aria-label="选择${label}" ${prefix ? "" : `data-default-id="${escapeHTML(selectedId)}"`}>
${providers.map((provider) => `<option value="${escapeHTML(provider.url)}" data-id="${escapeHTML(provider.id)}" ${provider.id === selectedId ? "selected" : ""}>${escapeHTML(provider.name)}</option>`).join("")}
<option value="__custom" ${custom ? "selected" : ""}>自定义</option>
</select>
<div class="current-box"><div class="current-title">当前配置</div><div class="current-row"><a id="${currentId}" class="${api ? "current-api-input" : "current-config-input"} current-config-link" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(url || emptyText)}</a>${customButton}</div></div>
${customField}<div class="status-box"><div class="status-title">可用状态</div><div id="${statusId}" class="status-list"></div></div></section>`;
}
function renderGuestEditFeature(tokenData, config, adminMode = false) {
  const editorData = adminMode ? tokenData : {
    ...tokenData,
    sources: [],
    subApi: [],
    subConfig: [],
    customSubApi: "",
    customSubConfig: "",
    noAds: "",
    update: DEFAULT_UPDATE_MINUTES,
    updateEnable: true
  };
  const apis = normalizeProviderList(config.subApis);
  const configs = normalizeProviderList(config.subConfigs);
  const selection = (field, providers) => {
    const reference = Array.isArray(editorData[field]) ? editorData[field][0] : null;
    const id = String(reference?.ID || reference?.id || editorData[`${field}Id`] || editorData[`${field}Ids`]?.[0] || "").trim().toUpperCase();
    const byId = providers.find((provider) => provider.id === id);
    if (byId) return { id: byId.id, custom: false, url: "" };
    const url = String(reference?.URL || reference?.url || (field === "subApi" && typeof editorData.customSubApi === "string" ? editorData.customSubApi : field === "subConfig" && typeof editorData.customSubConfig === "string" ? editorData.customSubConfig : "") || "").trim();
    const byUrl = providers.find((provider) => provider.url === url);
    return byUrl ? { id: byUrl.id, custom: false, url: "" } : { id: "", custom: true, url };
  };
  const api = selection("subApi", apis);
  const configChoice = selection("subConfig", configs);
  const token = escapeHTML(String(tokenData.url || ""));
  const sources = escapeHTML(cleanSourceList(editorData.sources || []).join("\n"));
  const name = escapeHTML(String(editorData.name || ""));
  const noAds = escapeHTML(String(editorData.noAds || ""));
  const minutes = Number.isSafeInteger(Number(editorData.update)) ? Number(editorData.update) : DEFAULT_UPDATE_MINUTES;
  const updateEnabled = normalizeUpdateEnabled(editorData.updateEnable);
  return `<style>
.guest-header-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}
.guest-destroy-modal{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.44);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);overflow-y:auto;overscroll-behavior:contain}
.guest-destroy-dialog{box-sizing:border-box;width:min(440px,100%);padding:22px;border-radius:18px;background:rgba(255,255,255,.97);border:1px solid rgba(229,229,223,.9);box-shadow:0 20px 60px rgba(0,0,0,.24)}
.guest-destroy-dialog h2{margin:0;font-size:18px}.guest-destroy-dialog p{margin:8px 0 14px;color:#777;font-size:13px;line-height:1.6}.guest-destroy-input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid rgba(120,130,140,.35);border-radius:10px;font:inherit}.guest-destroy-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
.guest-destroy-modal.uses-visual-viewport{box-sizing:border-box;inset:auto 0 auto;top:var(--guest-visual-top,0px);height:var(--guest-visual-height,100vh)}
#guestEditModal,#guestEditKeyModal{box-sizing:border-box;padding:48px 20px}
.guest-edit-dialog{box-sizing:border-box;width:min(760px,100%);max-height:calc(100vh - 96px);max-height:calc(100dvh - 96px);overflow-y:auto;overscroll-behavior:contain;margin:auto}
.guest-edit-fields{display:grid;gap:14px}.guest-edit-field label{display:block;margin-bottom:6px}.guest-edit-field textarea{min-height:130px;resize:vertical}.guest-edit-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.guest-edit-toggle{display:flex;align-items:center;gap:9px}.guest-edit-toggle input{width:18px;height:18px;margin:0}.guest-edit-warning{margin:0 0 14px}.guest-edit-password{max-width:100%}
.guest-edit-provider{min-width:0;padding:14px;border:1px solid rgba(120,130,140,.18);border-radius:12px;background:rgba(120,130,140,.035)}.guest-edit-provider .section-title{margin:0 0 5px;font-size:15px}.guest-edit-provider .section-note{margin-bottom:9px}.guest-edit-provider .native-picker{display:block;width:100%;min-height:42px;padding:8px 12px;border:1px solid rgba(229,229,223,.8);border-radius:10px;background:rgba(250,250,250,.7);color:inherit;font:inherit;appearance:auto;-webkit-appearance:auto}.guest-edit-provider .current-box{margin-top:12px}.guest-edit-provider .current-title,.guest-edit-provider .status-title{font-size:13px;font-weight:700;margin:0 0 7px}.guest-edit-provider .current-row{display:flex;align-items:flex-start;gap:8px;min-width:0}.guest-edit-provider .current-config-link{display:flex;align-items:center;min-height:42px;height:auto;width:100%;min-width:0;padding:10px 12px;border:1px solid rgba(229,229,223,.8);border-radius:8px;background:rgba(250,250,250,.7);box-sizing:border-box;color:#1f4b99;text-decoration:none;cursor:pointer;white-space:normal;word-break:break-all;overflow-wrap:anywhere}.guest-edit-provider .current-config-link:hover{border-color:#1f4b99;box-shadow:0 0 0 2px rgba(31,75,153,.10);background:rgba(31,75,153,.04)}.guest-edit-provider .current-config-link[aria-disabled="true"]{color:#888;pointer-events:none;cursor:default}.guest-edit-provider .status-box{margin-top:12px}.guest-edit-provider .status-list{display:grid;gap:7px}.guest-edit-provider .provider-custom-input{margin-top:10px}.guest-edit-provider .provider-custom-input[hidden]{display:none}
.guest-edit-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
@media(max-width:640px){.guest-header-actions{gap:6px}.guest-header-actions .button{padding:6px 9px;font-size:12px}#guestEditModal,#guestEditKeyModal{align-items:center;padding:64px 12px}.guest-edit-row{grid-template-columns:1fr}.guest-edit-dialog{width:100%;max-height:calc(var(--guest-visual-height,100svh) - 128px);padding:18px;margin:auto}.guest-edit-provider{padding:12px}.guest-edit-actions{padding-bottom:4px}}
@media(prefers-color-scheme:dark){.guest-destroy-dialog{background:rgba(30,30,30,.97);border-color:rgba(255,255,255,.1)}.guest-destroy-dialog p{color:#9aa7b5}.guest-destroy-input{background:rgba(0,0,0,.35);border-color:rgba(255,255,255,.12);color:#f3f6f7}.guest-edit-provider{background:rgba(0,0,0,.18);border-color:rgba(255,255,255,.12)}.guest-edit-provider .native-picker{background:#111;color:#f1f1f1;border-color:rgba(255,255,255,.14)}.guest-edit-provider .native-picker option{background:#1b1b1b;color:#f1f1f1}.guest-edit-provider .current-config-link{background:rgba(0,0,0,.3);color:#64b5f6;border-color:rgba(255,255,255,.12)}.guest-edit-provider .current-config-link:hover{color:#64b5f6;border-color:#64b5f6;background:rgba(100,181,246,.08)}.guest-edit-provider .current-config-link[aria-disabled="true"]{color:#9aa7b5}}
</style>
<div class="guest-destroy-modal" id="guestEditModal" aria-hidden="true"><section class="guest-destroy-dialog guest-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="guestEditTitle"><h2 id="guestEditTitle">编辑聚合订阅链接</h2><p class="guest-edit-warning">${adminMode ? "管理员仅可修改 SUBAPI 和 SUBCONFIG，其他订阅内容、路径和密钥不会更改。" : tokenData.destroyKeyHash ? "路径和密钥无法在此修改；查看和保存都需要创建链接时设置的密钥。" : "此链接未设置密钥，可直接查看和编辑。"}</p><div class="guest-edit-fields">
${adminMode ? "" : `<div class="guest-edit-field"><label for="guestEditSources">订阅源地址</label><textarea id="guestEditSources" required placeholder="每行输入一个订阅源地址">${sources}</textarea></div>`}
${renderProviderModule("api", apis, api.id, api.url, { idPrefix: "guestEdit", showCustomInput: true, customUrl: api.url })}
${renderProviderModule("config", configs, configChoice.id, configChoice.url, { idPrefix: "guestEdit", showCustomInput: true, customUrl: configChoice.url })}
${adminMode ? "" : `
<div class="guest-edit-field"><label for="guestEditName">名称</label><div class="section-note">仅用于标签页标题。</div><input id="guestEditName" type="text" maxlength="80" value="${name}" placeholder="选填"></div>
<div class="guest-edit-field"><label for="guestEditNoAds">排除节点（每行一个关键词）</label><textarea id="guestEditNoAds">${noAds}</textarea></div>
<div class="guest-edit-row"><label class="guest-edit-toggle"><input id="guestEditUpdateEnable" type="checkbox" ${updateEnabled ? "checked" : ""}><span>开启推荐自动更新</span></label><div class="guest-edit-field"><label for="guestEditMinutes">推荐更新时间（分钟）</label><input id="guestEditMinutes" type="number" min="0" max="525600" step="1" value="${minutes}" inputmode="numeric"></div></div>
`}
 </div><div class="guest-edit-actions"><button type="button" class="button secondary" id="guestEditCancel">取消</button><button type="button" class="button" id="guestEditSave">保存修改</button></div></section></div>
${adminMode ? "" : `
<div class="guest-destroy-modal" id="guestEditKeyModal" aria-hidden="true"><section class="guest-destroy-dialog" role="dialog" aria-modal="true" aria-labelledby="guestEditKeyTitle"><h2 id="guestEditKeyTitle">验证编辑密钥</h2><p>请输入创建此聚合链接时设置的密钥，验证通过后才能查看和编辑链接内容。</p><input class="guest-destroy-input" id="guestEditKey" type="password" autocomplete="current-password" placeholder="请输入编辑密钥"><div class="guest-destroy-actions"><button type="button" class="button secondary" id="guestEditKeyCancel">取消</button><button type="button" class="button" id="guestEditKeyConfirm">验证并进入编辑</button></div></section></div>
`}
<script>
function initGuestEditFeature(){
var isAdminEditor=${adminMode},shell=document.querySelector('.guest-shell'),destroyButton=document.querySelector('.guest-head-destroy'),editModal=document.getElementById('guestEditModal'),keyModal=document.getElementById('guestEditKeyModal'),destroyModal=document.getElementById('guestDestroyModal'),editButton=document.createElement('button'),apiSelect=document.getElementById('guestEditApi'),configSelect=document.getElementById('guestEditConfig'),apiUrl=document.getElementById('guestEditApiUrl'),configUrl=document.getElementById('guestEditConfigUrl'),keyInput=document.getElementById('guestEditKey'),saveButton=document.getElementById('guestEditSave'),keyConfirmButton=document.getElementById('guestEditKeyConfirm'),adminKeyConfirmButton=document.getElementById('urlAdminEditKeyConfirm'),activeToken=shell?shell.dataset.token:'${token}',verifiedKey='',pendingAdminToken='';
function editToast(message,isError){window.CC(message,isError!==false)}
function syncGuestViewport(){var viewport=window.visualViewport,height=viewport?viewport.height:window.innerHeight,top=viewport?viewport.offsetTop:0,mobile=window.matchMedia('(max-width: 640px)').matches;document.documentElement.style.setProperty('--guest-visual-height',height+'px');document.documentElement.style.setProperty('--guest-visual-top',top+'px');[editModal,keyModal,destroyModal].forEach(function(modal){if(modal)modal.classList.toggle('uses-visual-viewport',mobile)});var editDialog=editModal.querySelector('.guest-edit-dialog');editDialog.style.maxHeight=Math.max(240,height-(mobile?128:96))+'px'}
syncGuestViewport();window.addEventListener('resize',syncGuestViewport);if(window.visualViewport){window.visualViewport.addEventListener('resize',syncGuestViewport);window.visualViewport.addEventListener('scroll',syncGuestViewport)}
editButton.type='button';editButton.className='button secondary guest-head-edit';editButton.textContent='编辑';
var actionGroup=null;
if(!isAdminEditor){actionGroup=document.createElement('div');actionGroup.className='guest-header-actions';destroyButton.parentNode.insertBefore(actionGroup,destroyButton);actionGroup.append(editButton,destroyButton)}
function setupProvider(kind,select,input){
var api=kind==='api',prefix='guestEdit'+(api?'Api':'Config'),current=document.getElementById(prefix+'Current'),statusId=prefix+'Status',customField=document.getElementById(prefix+'CustomField'),emptyText=api?'暂无订阅转换后端，请编辑':'暂无订阅转换规则，请编辑',requestId=0,timer;
function value(){return select.value==='__custom'?input.value.trim():select.value}
function refresh(){var url=value(),id=++requestId;if(!url){current.textContent=emptyText;current.removeAttribute('href');current.setAttribute('aria-disabled','true');window.CFSubsUI.setStatus(statusId,'error',api?'❌ SUBAPI状态异常':'❌ SUBCONFIG状态异常');return}
window.CFSubsUI.setLink(current,url,false);current.setAttribute('aria-disabled','true');window.CFSubsUI.setStatus(statusId,'pending','⏳ 状态检测中');
window.CFSubsUI.checkAvailability(api?'api':'config',url).then(function(result){if(id!==requestId||url!==value())return;window.CFSubsUI.setLink(current,url,result.ok);if(result.ok)current.removeAttribute('aria-disabled');else current.setAttribute('aria-disabled','true');window.CFSubsUI.setStatus(statusId,result.ok?'success':'error',api?'✅ SUBAPI状态正常'+(result.info&&result.info.version?' ('+result.info.version+')':''):'✅ SUBCONFIG状态正常')}).catch(function(){if(id!==requestId||url!==value())return;window.CFSubsUI.setLink(current,url,false);current.setAttribute('aria-disabled','true');window.CFSubsUI.setStatus(statusId,'error',api?'❌ SUBAPI检测失败':'❌ SUBCONFIG检测失败')})}
function sync(){customField.hidden=select.value!=='__custom';var url=value();if(url){current.textContent=url;current.href=url;current.removeAttribute('aria-disabled')}else{current.textContent=emptyText;current.removeAttribute('href');current.setAttribute('aria-disabled','true')}refresh()}
select.addEventListener('change',sync);input.addEventListener('input',function(){if(select.value!=='__custom')return;var url=value();if(url){window.CFSubsUI.setLink(current,url,false);current.setAttribute('aria-disabled','true')}else{current.textContent=emptyText;current.removeAttribute('href');current.setAttribute('aria-disabled','true')}window.clearTimeout(timer);timer=window.setTimeout(refresh,450)});input.addEventListener('change',refresh);sync()
}
setupProvider('api',apiSelect,apiUrl);setupProvider('config',configSelect,configUrl);
function loadTokenData(data,tokenValue){
var pick=function(select,input,reference,customUrl){var ref=Array.isArray(reference)?reference[0]:reference||{},id=String(ref.ID||ref.id||'').toUpperCase(),url=String(ref.URL||ref.url||customUrl||'').trim(),match=Array.from(select.options).find(function(option){return option.dataset.id===id})||Array.from(select.options).find(function(option){return option.value===url&&option.value!=='__custom'});if(match){select.value=match.value;input.value=''}else{select.value='__custom';input.value=url}select.dispatchEvent(new Event('change'))};
activeToken=tokenValue||String(data.URL||data.url||activeToken);var sourceValues=data.SOURCES||data.sources||[],sourcesInput=document.getElementById('guestEditSources'),nameInput=document.getElementById('guestEditName'),noAdsInput=document.getElementById('guestEditNoAds'),minutesInput=document.getElementById('guestEditMinutes'),updateEnableInput=document.getElementById('guestEditUpdateEnable');if(sourcesInput)sourcesInput.value=Array.isArray(sourceValues)?sourceValues.map(function(value){return String(value).trim()}).filter(Boolean).join('\\n'):String(sourceValues||'');if(nameInput)nameInput.value=String(data.NAME??data.name??'');if(noAdsInput)noAdsInput.value=String(data.NOADS??data.noAds??'');if(minutesInput)minutesInput.value=Number.isSafeInteger(Number(data.UPDATE??data.update))?Number(data.UPDATE??data.update):60;if(updateEnableInput)updateEnableInput.checked=(data.UPDATE_ENABLE??data.UPDATEENABLE??data.updateEnable)!==false;
pick(apiSelect,apiUrl,data.SUBAPI||data.subApi,data.CUSTOMSUBAPI||data.customSubApi);pick(configSelect,configUrl,data.SUBCONFIG||data.subConfig,data.CUSTOMSUBCONFIG||data.customSubConfig)
}
async function enterGuestEditor(key){window.CFSubsUI.setButtonBusy(keyConfirmButton,true,'验证中…');try{var response=await fetch('/api/verify-generated-link-edit',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify({token:activeToken,key:key})}),result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||'密钥验证失败');verifiedKey=key;loadTokenData(result.tokenData||{},activeToken);closeKeyModal();openEdit()}catch(error){editToast(error.message||'密钥验证失败');if(keyInput)keyInput.select()}finally{window.CFSubsUI.setButtonBusy(keyConfirmButton,false)}}
if(isAdminEditor){document.querySelectorAll('.url-edit').forEach(function(button){button.addEventListener('click',async function(){pendingAdminToken=button.dataset.token||'';if(!pendingAdminToken){editToast('未选择聚合订阅链接');return}window.CFSubsUI.setButtonBusy(button,true,'读取中…');try{var response=await fetch('/api/admin',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify({type:'url_verify_edit_key',token:pendingAdminToken})}),result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||'读取聚合订阅链接失败');activeToken=pendingAdminToken;loadTokenData(result.tokenData||{},pendingAdminToken);openEdit()}catch(error){editToast(error.message||'读取聚合订阅链接失败')}finally{window.CFSubsUI.setButtonBusy(button,false)}})})}
function closeKeyModal(){if(!keyModal)return;window.CFSubsModal.close(keyModal,{ariaHidden:true});keyInput.value=''}
function closeEdit(){if(keyModal&&keyModal.style.display!=='none')closeKeyModal();verifiedKey='';window.CFSubsModal.close(editModal,{ariaHidden:true})}
function openEdit(){syncGuestViewport();window.CFSubsModal.open(editModal,{ariaHidden:false});if(keyInput)keyInput.value=''}
if(isAdminEditor){editButton.addEventListener('click',openEdit)}else{editButton.addEventListener('click',function(){if(shell&&shell.dataset.keyRequired==='true'){keyInput.value='';syncGuestViewport();window.CFSubsModal.open(keyModal,{ariaHidden:false});keyInput.focus();return}enterGuestEditor('')})}document.getElementById('guestEditCancel').addEventListener('click',closeEdit);var keyCancel=document.getElementById('guestEditKeyCancel');if(keyCancel)keyCancel.addEventListener('click',function(){pendingAdminToken='';closeKeyModal()});
if(adminKeyConfirmButton)adminKeyConfirmButton.addEventListener('click',async function(){var suppliedKey=keyInput.value.trim();if(!pendingAdminToken){editToast('未选择聚合订阅链接');return}window.CFSubsUI.setButtonBusy(adminKeyConfirmButton,true,'验证中…');try{var response=await fetch('/api/admin',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify({type:'url_verify_edit_key',token:pendingAdminToken,key:suppliedKey})}),result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||'密钥验证失败');verifiedKey=suppliedKey;activeToken=pendingAdminToken;loadTokenData(result.tokenData||{},pendingAdminToken);closeKeyModal();openEdit()}catch(error){editToast(error.message||'密钥验证失败');keyInput.select()}finally{window.CFSubsUI.setButtonBusy(adminKeyConfirmButton,false)}});
if(keyConfirmButton)keyConfirmButton.addEventListener('click',function(){if(!isAdminEditor)enterGuestEditor(keyInput.value.trim())});
editModal.addEventListener('click',function(event){if(event.target===editModal)closeEdit()});
if(keyModal)keyModal.addEventListener('click',function(event){if(event.target===keyModal)closeKeyModal()});
document.addEventListener('keydown',function(event){if(event.key!=='Escape')return;if(keyModal&&getComputedStyle(keyModal).display!=='none'){event.stopImmediatePropagation();closeKeyModal()}else if(getComputedStyle(editModal).display!=='none'){event.stopImmediatePropagation();closeEdit()}},true);
if(destroyButton&&!isAdminEditor&&${Boolean(tokenData.destroyKeyHash)})destroyButton.addEventListener('click',function(event){event.preventDefault();event.stopImmediatePropagation();var modal=document.getElementById('guestDestroyModal'),input=document.getElementById('guestDestroyKey');syncGuestViewport();window.CFSubsModal.open(modal);input.value='';input.focus()},true);
saveButton.addEventListener('click',async function(){
if(isAdminEditor){var apiCustom=apiSelect.value==='__custom',configCustom=configSelect.value==='__custom',apiOption=apiSelect.options[apiSelect.selectedIndex],configOption=configSelect.options[configSelect.selectedIndex],adminPayload={type:'url_update_providers',token:activeToken,apiCustom:apiCustom,apiId:apiCustom?'':(apiOption.dataset.id||''),apiUrl:apiCustom?apiUrl.value.trim():'',configCustom:configCustom,configId:configCustom?'':(configOption.dataset.id||''),configUrl:configCustom?configUrl.value.trim():''};window.CFSubsUI.setButtonBusy(saveButton,true,'保存中…');try{var adminResponse=await fetch('/api/admin',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify(adminPayload)}),adminResult=await adminResponse.json();if(!adminResponse.ok||!adminResult.ok)throw new Error(adminResult.error||'保存修改失败');verifiedKey='';closeEdit();editToast('SUBAPI 和 SUBCONFIG 已更新',false)}catch(error){editToast(error.message||'保存修改失败')}finally{window.CFSubsUI.setButtonBusy(saveButton,false)}return}
var sources=document.getElementById('guestEditSources').value.trim(),minutes=Number(document.getElementById('guestEditMinutes').value);
if(!sources){editToast('请至少输入一个订阅源地址');return}
if(!Number.isSafeInteger(minutes)||minutes<0||minutes>525600){editToast('推荐更新时间必须是 0 到 525600 之间的整数分钟');return}
var apiCustom=apiSelect.value==='__custom',configCustom=configSelect.value==='__custom',apiOption=apiSelect.options[apiSelect.selectedIndex],configOption=configSelect.options[configSelect.selectedIndex],payload={token:activeToken,key:verifiedKey,sources:sources,apiCustom:apiCustom,apiId:apiCustom?'':(apiOption.dataset.id||''),apiUrl:apiCustom?apiUrl.value.trim():'',configCustom:configCustom,configId:configCustom?'':(configOption.dataset.id||''),configUrl:configCustom?configUrl.value.trim():'',name:document.getElementById('guestEditName').value,noAds:document.getElementById('guestEditNoAds').value,update:minutes,updateEnable:document.getElementById('guestEditUpdateEnable').checked};
window.CFSubsUI.setButtonBusy(saveButton,true,'保存中…');
try{var response=await fetch('/api/update-generated-link',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify(payload)}),result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||'保存修改失败');closeEdit();editToast('聚合订阅链接已更新',false)}catch(error){editToast(error.message||'保存修改失败')}finally{window.CFSubsUI.setButtonBusy(saveButton,false)}
});
if(actionGroup)window.CFSubsUI.normalizeControls(actionGroup);window.CFSubsUI.normalizeControls(editModal);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initGuestEditFeature);else initGuestEditFeature();
<\/script>`;
}
__name(renderGuestEditFeature, "renderGuestEditFeature");
async function renderSubUIHome(request, url, env) {
  const cfg = await getConfig(env);
  const apis = normalizeProviderList(cfg.subApis);
  const configs = normalizeProviderList(cfg.subConfigs);
  const defaultApiId = String(cfg.defaultSubApiId || "");
  const defaultConfigId = String(cfg.defaultSubConfigId || "");
  let apiId = defaultApiId && apis.some((x) => x.id === defaultApiId) ? defaultApiId : apis[0]?.id || "";
  let configId = defaultConfigId && configs.some((x) => x.id === defaultConfigId) ? defaultConfigId : configs[0]?.id || "";
  let apiCustom = false;
  let configCustom = false;
  let apiUrl = "";
  let configUrl = "";
  const name = "";
  const noAds = "";
  const esc = /* @__PURE__ */ __name((x) => escapeHTML(String(x ?? "")), "esc");
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(cfg.subName || "SUB")}</title>${renderFavicon(cfg.subName || "SUB", cfg.siteLogo)}
<style>
${getSubUIStyles()}
.native-picker{display:block;width:100%;min-height:42px;padding:8px 12px;border:1px solid rgba(229,229,223,.8);border-radius:10px;background:rgba(250,250,250,.7);color:inherit;font:inherit;cursor:pointer;appearance:auto;-webkit-appearance:auto}
.native-picker:focus{outline:none;border-color:var(--ui-focus);box-shadow:0 0 0 3px rgba(59,130,246,.16)}
.current-box{margin-top:12px}.current-title{font-size:13px;font-weight:700;margin:0 0 7px}.current-row{display:flex;align-items:flex-start;gap:8px}
 .current-api-input{width:100%;height:42px;min-width:0}.current-config-input{width:100%;height:auto!important;min-height:42px!important;line-height:1.5;word-break:break-all;overflow-wrap:anywhere;white-space:normal}.current-config-link{display:flex;align-items:center;min-height:42px;height:auto;padding:10px 12px;border:1px solid rgba(229,229,223,.8);border-radius:8px;background:rgba(250,250,250,.7);box-sizing:border-box;color:#1f4b99;text-decoration:none;cursor:pointer;white-space:normal;word-break:break-all;overflow-wrap:anywhere}.current-api-input.current-config-link{height:auto;min-height:42px}.current-config-link:hover{text-decoration:none;border-color:#1f4b99;box-shadow:0 0 0 2px rgba(31,75,153,.10);background:rgba(31,75,153,.04)}.current-config-link:empty{color:#888}.current-config-link:focus-visible{text-decoration:none;outline:none;border-color:#1f4b99;box-shadow:0 0 0 3px rgba(31,75,153,.14)}
.edit-custom{display:none;flex:0 0 auto;min-width:72px}.status-box{margin-top:12px}.status-title{font-size:13px;font-weight:700;margin:0 0 7px}.status-list{display:grid;gap:7px}
.advanced-features-toggle{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:42px;padding:0;border:0;background:transparent;color:inherit;font:inherit;font-size:16px;font-weight:700;text-align:left;cursor:pointer}.advanced-chevron{transition:transform .18s ease}.advanced-features-toggle[aria-expanded="true"] .advanced-chevron{transform:rotate(180deg)}.advanced-features-content{padding-top:16px}.advanced-feature+.advanced-feature{margin-top:20px;padding-top:18px;border-top:1px solid rgba(120,130,140,.2)}.recommended-update-toggle{display:flex;align-items:center;gap:10px;min-height:32px;font-size:15px;font-weight:600;cursor:pointer}.recommended-update-toggle input{width:20px;height:20px;margin:0}.recommended-update-label{display:block;margin-bottom:7px;font-weight:650}
.custom-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.42);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;z-index:1200;padding:20px}.custom-modal{width:min(480px,100%);background:rgba(255,255,255,.96);border:1px solid rgba(229,229,223,.9);border-radius:18px;padding:20px;box-shadow:0 18px 50px rgba(0,0,0,.22)}.custom-modal h3{margin:0;font-size:17px}.custom-modal p{margin:6px 0 14px;color:#888;font-size:12px}.custom-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.aggregate-result-overlay{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.42);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);overflow:auto;padding:20px}.aggregate-result-modal{position:relative;width:min(620px,calc(100vw - 40px));margin:auto;transition:height .2s ease,transform .2s ease}.aggregate-result-close{position:absolute;top:10px;right:10px;width:32px;height:32px;border:0;border-radius:50%;background:transparent;color:#777;font-size:24px;line-height:32px;text-align:center;cursor:pointer}.aggregate-result-close:hover{background:rgba(0,0,0,.07);color:#222}.aggregate-result-url{display:block;width:100%;padding:12px 14px;margin:14px 0 0;border:1px solid rgba(229,229,223,.8);border-radius:10px;background:rgba(250,250,250,.7);color:#1f4b99;word-break:break-all;overflow-wrap:anywhere;line-height:1.55;user-select:text;text-decoration:none;box-sizing:border-box}.aggregate-result-url:hover{text-decoration:none;border-color:#1f4b99;box-shadow:0 0 0 2px rgba(31,75,153,.10)}.aggregate-result-actions{display:flex;justify-content:center;gap:10px;margin:14px auto 0}.aggregate-result-actions .button{width:160px;min-height:40px}.aggregate-result-actions .aggregate-destroy-btn{background:#d93025;color:#fff;border-color:#d93025}.aggregate-result-actions .aggregate-destroy-btn:hover{background:#b91c1c;color:#fff;box-shadow:0 0 0 2px rgba(217,48,37,.12)}.aggregate-result-qr{display:block;margin:16px auto 0;padding:12px;width:max-content;max-width:100%;box-sizing:border-box;background:#fff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.18)}.aggregate-copy-status{min-height:18px;margin:8px 0 0;text-align:center;font-size:13px;font-weight:700;color:transparent}.aggregate-copy-status.success{color:#2e7d32}.aggregate-copy-status.error{color:#c62828}.generated-links-panel{margin-top:14px}.generated-links-list{display:grid;gap:10px;margin-top:10px}.generated-link-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}.generated-link-url{display:block;min-width:0;padding:11px 13px;border:1px solid rgba(229,229,223,.8);border-radius:10px;background:rgba(250,250,250,.7);color:#1f4b99;word-break:break-all;overflow-wrap:anywhere;line-height:1.45;text-decoration:none;box-sizing:border-box}.generated-link-url:hover{text-decoration:none;border-color:#1f4b99;box-shadow:0 0 0 2px rgba(31,75,153,.10)}.generated-link-destroy{width:84px;min-height:40px;background:#d93025!important;color:#fff!important;border-color:#d93025!important}.generated-link-destroy:hover{background:#b91c1c!important;box-shadow:0 0 0 2px rgba(217,48,37,.12)}
@media(prefers-color-scheme:dark){.native-picker{background:#111;color:#f1f1f1;border-color:rgba(255,255,255,.14)}.native-picker option{background:#1b1b1b;color:#f1f1f1}.current-api-input,.current-config-input{background:rgba(0,0,0,.3);color:#64b5f6;border-color:rgba(255,255,255,.12)}.current-config-link{color:#64b5f6;background:rgba(0,0,0,.3);border-color:rgba(255,255,255,.12)}.current-config-link:hover{color:#64b5f6;text-decoration:none;border-color:#64b5f6;background:rgba(100,181,246,.08);box-shadow:0 0 0 2px rgba(100,181,246,.10)}.advanced-feature+.advanced-feature{border-top-color:rgba(255,255,255,.12)}.custom-modal{background:rgba(30,30,30,.97);border-color:rgba(255,255,255,.1)}.aggregate-result-url{background:rgba(0,0,0,.3);border-color:rgba(255,255,255,.12);color:#64b5f6}.aggregate-result-url:hover{color:#64b5f6;border-color:#64b5f6;background:rgba(100,181,246,.08);box-shadow:0 0 0 2px rgba(100,181,246,.10)}.aggregate-result-qr{background:#fff}.aggregate-result-close{color:#aaa}.aggregate-result-close:hover{background:rgba(255,255,255,.08);color:#fff}.aggregate-result-modal>#copyDirect{margin-top:16px}.aggregate-copy-status.success{color:#81c784}.aggregate-copy-status.error{color:#e57373}.generated-link-url{background:rgba(0,0,0,.3);color:#64b5f6;border-color:rgba(255,255,255,.12)}.generated-link-url:hover{color:#64b5f6;border-color:#64b5f6;background:rgba(100,181,246,.08);box-shadow:0 0 0 2px rgba(100,181,246,.10)}}
</style>
</head>
<body>
<main class="page app-shell">
<header class="header home-hero">
<div class="hero-main"><h1 class="title">${esc(cfg.subName || "SUB")}</h1><div class="subtitle">\u751F\u6210\u4E00\u4E2A\u4E13\u5C5E\u4E8E\u4F60\u7684\u805A\u5408\u8BA2\u9605\u94FE\u63A5\uFF0C\u9002\u914DBase64, Clash, Sing-box, Surge, Loon\u7B49\u5E38\u89C1\u683C\u5F0F</div></div>
<div class="backend-version-card"><div class="backend-version-label">\u540E\u7AEF\u7248\u672C</div><div class="backend-version-value" id="apiVersion">\u6B63\u5728\u83B7\u53D6\u2026</div></div>
</header>

<section class="panel"><h2 class="section-title">\u8BA2\u9605\u94FE\u63A5</h2><div class="section-note">\u652F\u6301\u591A\u4E2A\u8BA2\u9605\u5730\u5740\uFF0C\u6BCF\u884C\u4E00\u4E2A\u3002</div><div class="field"><textarea id="sources" placeholder="https://example.com/subscribe&#10;https://example.com/another"></textarea></div></section>

${renderProviderModule("api", apis, apiId)}
${renderProviderModule("config", configs, configId)}

<section class="panel advanced-features"><button type="button" class="advanced-features-toggle" id="advancedFeaturesToggle" aria-expanded="false" aria-controls="advancedFeaturesContent"><span class="advanced-toggle-title">\u9AD8\u7EA7\u529F\u80FD</span><span class="advanced-toggle-meta"><span class="advanced-toggle-hint">\u70B9\u51FB\u5C55\u5F00</span><span class="advanced-chevron" aria-hidden="true">\u25BC</span></span></button><div class="advanced-features-content" id="advancedFeaturesContent" hidden>
<section class="advanced-feature"><h2 class="section-title">名称</h2><div class="section-note">仅用于标签页标题。</div><div class="field"><input id="linkName" type="text" maxlength="80" value="${esc(name)}" placeholder="例如：Apple"></div></section>
<section class="advanced-feature"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><h2 class="section-title" style="margin:0">\u6392\u9664\u8282\u70B9</h2><span id="noAdsCount" class="section-note" style="margin:0;white-space:nowrap" aria-live="polite">\u5C4F\u853D\u89C4\u5219\u6570 0</span></div><div class="section-note">\u6BCF\u884C\u586B\u5199\u4E00\u4E2A\u5173\u952E\u8BCD\uFF0C\u5305\u542B\u5173\u952E\u8BCD\u7684\u8282\u70B9\u4F1A\u88AB\u6392\u9664\u3002</div><div class="field"><textarea id="noAds" placeholder="\u4F8B\u5982\uFF1At.me&#10;\u5E7F\u544A&#10;example.com">${esc(noAds)}</textarea></div></section>
<section class="advanced-feature"><h2 class="section-title">\u63A8\u8350\u81EA\u52A8\u66F4\u65B0</h2><label class="recommended-update-toggle"><input id="recommendedUpdateEnable" type="checkbox" checked><span>\u5F00\u542F</span></label><div class="field"><label for="recommendedUpdateMinutes" class="recommended-update-label">\u63A8\u8350\u66F4\u65B0\u65F6\u95F4\uFF08\u5206\u949F\uFF09</label><input id="recommendedUpdateMinutes" type="number" min="0" max="525600" step="1" value="60" inputmode="numeric"><div class="section-note">\u5173\u95ED\u5F00\u5173\u4E0D\u4F1A\u4FEE\u6539\u5DF2\u4FDD\u5B58\u7684\u5206\u949F\u6570\u3002</div></div></section>
<section class="advanced-feature"><h2 class="section-title">\u5BC6\u94A5\uFF08\u9009\u586B\uFF09</h2><div class="section-note">\u53EF\u9009\u3002\u8BBE\u7F6E\u540E\uFF0C\u7F16\u8F91\u548C\u9500\u6BC1\u805A\u5408\u8BA2\u9605\u94FE\u63A5\u65F6\u9700\u8F93\u5165\u6B64\u5BC6\u94A5\uFF1B\u7559\u7A7A\u5219\u65E0\u9700\u5BC6\u94A5\u5373\u53EF\u7F16\u8F91\u548C\u9500\u6BC1\u3002\u8BF7\u6CE8\u610F\uFF0C\u65E0\u5BC6\u94A5\u7684\u94FE\u63A5\u4EFB\u4F55\u83B7\u5F97\u94FE\u63A5\u5730\u5740\u7684\u4EBA\u90FD\u53EF\u4EE5\u7F16\u8F91\u6216\u9500\u6BC1\u3002</div><div class="field"><input id="destroyKey" type="password" autocomplete="new-password" placeholder="\u9009\u586B\uFF1A\u7F16\u8F91\u548C\u9500\u6BC1\u5BC6\u94A5"></div></section>
<section class="advanced-feature"><h2 class="section-title">\u81EA\u5B9A\u4E49\u94FE\u63A5\u8DEF\u5F84</h2><div class="section-note">\u9009\u586B\u3002\u7559\u7A7A\u65F6\u751F\u6210\u94FE\u63A5\u4F1A\u81EA\u52A8\u4F7F\u7528\u968F\u673A UUID\u3002</div><div class="path-row"><input id="linkPath" type="text" maxlength="128" autocomplete="off" placeholder="\u53EF\u7559\u7A7A\uFF0C\u4F8B\u5982\uFF1A550e8400-e29b-41d4-a716-446655440000"><button type="button" class="button secondary" id="randomLinkPath">\u968F\u673A UUID</button></div></section>
</div></section>
<style>
.advanced-features button.advanced-features-toggle:not(:disabled){min-height:52px;padding:0 14px;background:#edf6ef;border:1px solid #c5dfcb;border-radius:13px;color:#194d2b;box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 2px 7px rgba(22,101,52,.07);text-align:left}
.advanced-toggle-title{font-size:16px;font-weight:750}
.advanced-toggle-meta{display:inline-flex;align-items:center;gap:10px}
.advanced-toggle-hint{padding:4px 9px;border:1px solid rgba(25,77,43,.18);border-radius:999px;background:rgba(255,255,255,.56);font-size:12px;font-weight:650;white-space:nowrap}
.advanced-chevron{display:inline-flex;align-items:center;justify-content:center;width:27px;height:27px;border-radius:50%;background:rgba(25,77,43,.1);font-size:11px;transition:transform .2s ease,background-color .2s ease}
.advanced-features-toggle[aria-expanded="true"] .advanced-chevron{transform:rotate(180deg)}
.advanced-features button.advanced-features-toggle:not(:disabled):hover{background:#1d6b3a;border-color:#1d6b3a;color:#fff;box-shadow:0 6px 16px rgba(22,101,52,.22)}
.advanced-features button.advanced-features-toggle:not(:disabled):hover .advanced-toggle-hint{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.3)}
.advanced-features button.advanced-features-toggle:not(:disabled):hover .advanced-chevron{background:rgba(255,255,255,.18)}
.advanced-features button.advanced-features-toggle:not(:disabled):active{transform:scale(.94)}
.advanced-features button.advanced-features-toggle:not(:disabled):focus-visible{outline:none;border-color:#27864b;box-shadow:0 0 0 3px rgba(22,101,52,.2)}
@media(prefers-color-scheme:dark){
 .advanced-features button.advanced-features-toggle:not(:disabled){background:#17251c;border-color:#35543d;color:#d8f3df;box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 2px 9px rgba(0,0,0,.24)}
 .advanced-toggle-hint{background:rgba(0,0,0,.18);border-color:rgba(167,243,208,.24)}
 .advanced-chevron{background:rgba(167,243,208,.12)}
 .advanced-features button.advanced-features-toggle:not(:disabled):hover{background:#a7f3d0;border-color:#a7f3d0;color:#10251a;box-shadow:0 6px 18px rgba(0,0,0,.35)}
 .advanced-features button.advanced-features-toggle:not(:disabled):hover .advanced-toggle-hint{background:rgba(16,37,26,.08);border-color:rgba(16,37,26,.24)}
 .advanced-features button.advanced-features-toggle:not(:disabled):hover .advanced-chevron{background:rgba(16,37,26,.12)}
 .advanced-features button.advanced-features-toggle:not(:disabled):focus-visible{border-color:#86efac;box-shadow:0 0 0 3px rgba(74,222,128,.22)}
}
@media(max-width:600px){.path-row{grid-template-columns:1fr}.path-row .button{width:100%}}
</style>
<button class="primary" id="generate" type="button">\u751F\u6210\u805A\u5408\u8BA2\u9605\u94FE\u63A5</button>
<section class="panel generated-links-panel" id="generatedLinksPanel" style="display:none"><h2 class="section-title">\u5DF2\u751F\u6210\u7684\u805A\u5408\u8BA2\u9605\u94FE\u63A5</h2><div class="section-note">\u6839\u636E\u672C\u673A\u6D4F\u89C8\u5668\u7F13\u5B58\u663E\u793A\u4F60\u751F\u6210\u8FC7\u7684\u94FE\u63A5\u3002\u94FE\u63A5\u6846\u53EF\u76F4\u63A5\u6253\u5F00\uFF0C\u9500\u6BC1\u540E\u94FE\u63A5\u5C06\u4F1A\u5931\u6548\u3002</div><div id="generatedLinksList" class="generated-links-list"></div></section>
</main>
<div id="aggregateResultModal" class="custom-modal-overlay aggregate-result-overlay"><div class="custom-modal aggregate-result-modal"><button type="button" class="aggregate-result-close" id="aggregateResultClose" aria-label="\u5173\u95ED">\xD7</button><h3>\u805A\u5408\u8BA2\u9605\u94FE\u63A5</h3><p>\u4E8C\u7EF4\u7801\u53EF\u76F4\u63A5\u626B\u7801\u4F7F\u7528\uFF0C\u590D\u5236\u4E0B\u65B9\u8BA2\u9605\u94FE\u63A5\u5373\u53EF\u4F7F\u7528\u3002\u9500\u6BC1\u540E\u94FE\u63A5\u5C06\u4F1A\u5931\u6548\u3002</p><a class="aggregate-result-url" id="direct" href="#" target="_blank" rel="noopener noreferrer"></a><div id="aggregateResultQr" class="aggregate-result-qr"></div><div class="aggregate-result-actions"><button type="button" class="button" id="copyDirect">\u590D\u5236</button><button type="button" class="button aggregate-destroy-btn" id="destroyDirect">\u9500\u6BC1</button></div></div></div>

<div id="customApiModal" class="custom-modal-overlay"><div class="custom-modal"><h3>\u81EA\u5B9A\u4E49\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF</h3><p>\u8F93\u5165\u4F60\u81EA\u5DF1\u7684 SUBAPI \u5730\u5740\u3002</p><input id="customApiInput" placeholder="https://subapi.example.com"><div class="custom-modal-actions"><button type="button" class="button secondary" id="cancelApiCustom">\u53D6\u6D88</button><button type="button" class="button" id="saveApiCustom">\u4FDD\u5B58</button></div></div></div>
<div id="customConfigModal" class="custom-modal-overlay"><div class="custom-modal"><h3>\u81EA\u5B9A\u4E49\u8BA2\u9605\u8F6C\u6362\u89C4\u5219</h3><p>\u8F93\u5165\u4F60\u81EA\u5DF1\u7684 SUBCONFIG \u5730\u5740\u3002</p><input id="customConfigInput" placeholder="https://example.com/config.ini"><div class="custom-modal-actions"><button type="button" class="button secondary" id="cancelConfigCustom">\u53D6\u6D88</button><button type="button" class="button" id="saveConfigCustom">\u4FDD\u5B58</button></div></div></div>

<script src="https://cdn.jsdelivr.net/npm/@keeex/qrcodejs-kx@1.0.2/qrcode.min.js"><\/script>
<script src="/__cfsubs.js" defer><\/script>
</body></html>`;
}
__name(renderSubUIHome, "renderSubUIHome");
function getSubUIStyles() {
  return getToolStyles() + `
.page{width:100%;max-width:1240px;margin:24px auto 40px;padding:0 28px 34px;border:1px solid rgba(255,255,255,.62);border-radius:28px;background:rgba(255,255,255,.34);box-shadow:0 14px 45px rgba(50,70,90,.08);overflow:hidden}
.app-shell{backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
.header{margin:0 -28px 18px;padding:28px 28px 24px;border-bottom:1px solid rgba(120,130,140,.18)}.home-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,520px);gap:28px;align-items:stretch}.hero-main{min-width:0;min-height:132px;height:132px;display:flex;flex-direction:column;align-items:flex-start}.title{margin:0;font-size:52px;font-weight:800;line-height:1.08;letter-spacing:-1.5px}.subtitle{margin-top:auto;padding-top:12px;font-size:14px;line-height:1.5;color:#687384;word-break:keep-all;overflow-wrap:normal;hyphens:none}.backend-version-card{min-height:132px;padding:28px 34px;border:1px solid rgba(59,130,246,.2);border-radius:28px;background:linear-gradient(135deg,rgba(255,255,255,.98) 0%,rgba(242,248,255,.98) 48%,rgba(226,245,235,.96) 100%);box-shadow:0 12px 36px rgba(42,91,128,.12);box-sizing:border-box;display:flex;flex-direction:column;justify-content:center}.backend-version-label{font-size:13.5px;line-height:1.3;color:#69717d;margin-bottom:10px}.backend-version-value{font-size:19px;line-height:1.25;font-weight:750;word-break:break-word;overflow-wrap:anywhere;color:#111}
.app-shell>.panel:first-of-type{margin-top:0}
@media(max-width:900px){.page{max-width:760px;margin:14px auto 28px;padding:0 18px 28px;border-radius:22px}.header{margin:0 -18px 16px;padding:22px 18px 20px}.home-hero{grid-template-columns:1fr;gap:18px}.hero-main{min-height:auto}.title{font-size:40px;letter-spacing:-.9px}.subtitle{margin-top:14px;padding-top:0;font-size:11px;word-break:keep-all;overflow-wrap:normal;hyphens:none}.backend-version-card{min-height:108px;padding:22px 24px;border-radius:22px}.backend-version-label{font-size:12.5px;margin-bottom:7px}.backend-version-value{font-size:16px}}
.panel{margin-top:12px}.row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.checks{display:grid;gap:8px}.check{display:grid;grid-template-columns:18px minmax(0,1fr);align-items:center;gap:8px;margin:0;padding:10px;border:1px solid rgba(229,229,223,.6);border-radius:10px;background:rgba(255,255,255,.5);cursor:pointer}
.check input{width:18px;height:18px;margin:0}.check span{font-weight:600}.check small{grid-column:2;color:#888;font-size:12px;word-break:break-all;overflow-wrap:anywhere}
.primary{width:100%;min-height:42px;margin-top:12px}.result-panel[hidden]{display:none}.result-label{margin-top:12px;margin-bottom:6px;font-size:12px;font-weight:600;color:#666}.result-url{padding:10px;border:1px solid rgba(229,229,223,.8);border-radius:8px;background:rgba(250,250,250,.7);color:#1f4b99;word-break:break-all;overflow-wrap:anywhere}
@media(max-width:600px){.aggregate-result-modal{width:calc(100vw - 40px)}.aggregate-result-actions{gap:8px}.aggregate-result-actions .button{width:calc(50% - 4px)}.row{grid-template-columns:1fr}.generated-link-row{grid-template-columns:minmax(0,1fr) 76px}.generated-link-destroy{width:76px;padding-left:8px;padding-right:8px}.page.app-shell{width:calc(100% - 28px);margin-left:14px;margin-right:14px;padding-left:14px;padding-right:14px}}
@media(prefers-color-scheme:dark){body{background:#000;background-image:radial-gradient(circle at 0% 28%,rgba(0,188,212,.18),transparent 24%),radial-gradient(circle at 100% 100%,rgba(0,120,70,.22),transparent 32%),linear-gradient(180deg,#000 0%,#020807 58%,#00140b 100%);background-attachment:fixed;color:#f4f7f8}.page.app-shell{background:linear-gradient(135deg,rgba(1,5,6,.98) 0%,rgba(2,10,10,.96) 48%,rgba(0,54,35,.92) 100%);border-color:rgba(255,255,255,.13);box-shadow:0 20px 70px rgba(0,0,0,.55)}.header{border-bottom-color:rgba(255,255,255,.10)}.title{color:#fff}.subtitle{color:#9aa7b5}.backend-version-card{background:linear-gradient(135deg,rgba(4,10,14,.98) 0%,rgba(3,18,20,.98) 48%,rgba(0,65,42,.94) 100%);border-color:rgba(255,255,255,.16);box-shadow:0 12px 36px rgba(0,40,25,.28)}.backend-version-label{color:#91a0ae}.backend-version-value{color:#fff}.panel{background:rgba(8,12,14,.78);border-color:rgba(255,255,255,.10)}.section-note{color:#9aa7b5}.field input,.field textarea,.native-picker,.current-api-input,.current-config-input,.current-config-link{background:rgba(2,6,8,.82);border-color:rgba(255,255,255,.13);color:#f3f6f7}.native-picker option{background:#0b1012;color:#f3f6f7}.check{background:rgba(15,22,24,.7);border-color:rgba(255,255,255,.10)}.check small{color:#8e9aa6}.result-label{color:#aab4be}.result-url{background:rgba(2,6,8,.72);color:#64b5f6;border-color:rgba(255,255,255,.12)}}
`;
}
__name(getSubUIStyles, "getSubUIStyles");
async function listJsonManagerItems(env, query = "", origin = "") {
  if (!env.KV) return [];
  const keyword = String(query || "").trim().toLowerCase();
  const result = [];
  let cursor;
  do {
    const page = await env.KV.list({
      prefix: URL_PREFIX,
      ...cursor ? { cursor } : {}
    });
    const values = await Promise.all(page.keys.map(async (key) => {
      const token = key.name.slice(URL_PREFIX.length);
      let item = null;
      let raw = await env.KV.get(key.name);
      if (!raw) return null;
      try {
        item = JSON.parse(raw);
      } catch {
        return null;
      }
      const normalized = upperCaseObject(item);
      delete normalized.NAME;
      delete normalized.PATH;
      delete normalized.SUBSCRIPTIONURL;
      if (Array.isArray(normalized.SOURCES) && normalized.SOURCES.some((source) => !isSourceCiphertext(String(source || "")))) {
        normalized.SOURCES = await encryptSourceList(env, normalized.SOURCES);
      }
      const upperRaw = JSON.stringify(normalized);
      if (upperRaw !== raw) {
        await env.KV.put(key.name, upperRaw);
        raw = upperRaw;
      }
      item = normalizeTokenData(JSON.parse(raw));
      if (keyword && !raw.toLowerCase().includes(keyword) && !token.toLowerCase().includes(keyword)) return null;
      return {
        token,
        subscriptionUrl: `${origin}/${encodeURIComponent(token)}`,
        createdAt: item?.createdAt || "",
        updatedAt: item?.updatedAt || "",
        name: item?.name || "\u8BA2\u9605\u94FE\u63A5",
        raw
      };
    }));
    for (const item of values) if (item) result.push(item);
    cursor = page.list_complete ? void 0 : page.cursor;
  } while (cursor);
  result.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")) || a.token.localeCompare(b.token));
  return result;
}
__name(listJsonManagerItems, "listJsonManagerItems");
async function findGeneratedLinksByProvider(env, field, value) {
  const config = await getConfig(env);
  const apiProviders = normalizeProviderList(config.subApis);
  const configProviders = normalizeProviderList(config.subConfigs);
  const apiProvidersById = new Map(apiProviders.map((provider) => [provider.id, provider.url]));
  const configProvidersById = new Map(configProviders.map((provider) => [provider.id, provider.url]));
  const matches = [];
  let cursor;
  do {
    const page = await env.KV.list({ prefix: URL_PREFIX, ...cursor ? { cursor } : {} });
    for (const entry of page.keys) {
      const raw = await env.KV.get(entry.name);
      if (!raw) continue;
      let stored;
      try {
        stored = upperCaseObject(JSON.parse(raw));
      } catch {
        const token = normalizeToken(entry.name.slice(URL_PREFIX.length));
        throw new Error(`聚合订阅链接数据无效：${token}`);
      }
      const matched = field === "ANY"
        ? tokenProviderValueMatches(stored, "SUBAPI", value, apiProvidersById) || tokenProviderValueMatches(stored, "SUBCONFIG", value, configProvidersById)
        : tokenProviderValueMatches(stored, field, value, field === "SUBAPI" ? apiProvidersById : configProvidersById);
      if (matched) matches.push({ key: entry.name });
    }
    cursor = page.list_complete ? void 0 : page.cursor;
  } while (cursor);
  return matches;
}
__name(findGeneratedLinksByProvider, "findGeneratedLinksByProvider");
async function countGeneratedLinks(env) {
  if (!env.KV) return 0;
  let count = 0;
  let cursor;
  do {
    const page = await env.KV.list({
      prefix: URL_PREFIX,
      ...cursor ? { cursor } : {}
    });
    count += page.keys.length;
    cursor = page.list_complete ? void 0 : page.cursor;
  } while (cursor);
  return count;
}
__name(countGeneratedLinks, "countGeneratedLinks");
function renderGeneratedLinksManagerPage(items, adminPath, config) {
  const esc = (value) => escapeHTML(String(value ?? ""));
  const title = "\u805A\u5408\u8BA2\u9605\u94FE\u63A5\u7BA1\u7406";
  const editorData = normalizeTokenData({});
  const providerOptions = (providers) => normalizeProviderList(providers).map((provider) => `<option value="${esc(provider.id)}">${esc(provider.name)}</option>`).join("");
  const rows = items.length ? items.map((item) => {
    return `<article class="url-entry" data-token="${esc(item.token)}"><input class="url-select ui-choice-control" type="checkbox" aria-label="选择 ${esc(item.token)}" value="${esc(item.token)}"><div class="url-entry-main"><h2>${esc(item.token)}</h2><a class="url-entry-link link-url ui-link-box" href="${esc(item.subscriptionUrl || `/${encodeURIComponent(item.token)}`)}" target="_blank" rel="noopener noreferrer">${esc(item.subscriptionUrl || `/${item.token}`)}</a></div><div class="url-entry-actions"><button class="button secondary url-edit" type="button" data-token="${esc(item.token)}">编辑</button><button class="button danger url-delete" type="button" data-token="${esc(item.token)}">销毁</button></div></article>`;
  }).join("") : '<div class="url-empty">暂无聚合订阅链接</div>';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>${renderFavicon(title, config.siteLogo)}<style>
${getToolStyles()}
.urls-shell{max-width:1100px;padding-top:0!important;padding-bottom:34px}.urls-header{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 -28px 18px;padding:28px;border-bottom:1px solid rgba(120,130,140,.18)}.urls-header .title{font-size:28px}.urls-list{display:grid;gap:10px}.url-bulk-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:12px}.url-bulk-selection{display:flex;align-items:center;gap:9px}.url-bulk-selection input,.url-select{width:18px;height:18px;flex:0 0 auto;margin:0}.url-bulk-actions{display:flex;gap:8px;margin-left:auto}.url-bulk-mode-fields[hidden],.url-bulk-mode-replace[hidden],.url-bulk-mode-destroy[hidden]{display:none}.guest-destroy-actions>[hidden]{display:none!important}.url-entry{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px;border:1px solid rgba(120,130,140,.2);border-radius:12px;background:rgba(255,255,255,.58)}.url-entry-main{min-width:0;flex:1}.url-entry h2{margin:0 0 8px;font-size:16px}.url-entry-link{display:block;overflow-wrap:anywhere}.url-entry-actions{display:flex;flex:0 0 auto;gap:8px}.url-entry-actions .button{min-width:74px}.url-empty{padding:28px 12px;text-align:center;color:#777}.url-bulk-field[hidden]{display:none}.url-bulk-field{margin-top:12px}.url-bulk-field label{display:block;margin-bottom:6px}
@media(max-width:600px){.page.app-shell.urls-shell{width:calc(100% - 28px);margin:14px 14px 28px;padding:0 14px 24px;border-radius:22px}.urls-header{margin:0 -14px 16px;padding:22px 14px 20px}.urls-header .title{font-size:22px}.url-bulk-toolbar{align-items:flex-start;flex-direction:column}.url-bulk-actions{width:100%}.url-bulk-actions .button{flex:1}.url-entry{align-items:flex-start;padding:12px;gap:10px}.url-entry-actions{flex-direction:column}.url-entry-actions .button{min-width:64px;padding:7px 10px}}
@media(prefers-color-scheme:dark){.urls-header{border-bottom-color:rgba(255,255,255,.1)}.url-entry{background:rgba(8,12,14,.78);border-color:rgba(255,255,255,.12)}.url-empty{color:#9aa7b5}}
</style></head><body><main class="page app-shell urls-shell"><header class="header urls-header"><div><h1 class="title">聚合订阅链接管理</h1><div class="subtitle">共 ${items.length} 条聚合订阅链接</div></div><a class="button secondary" href="/${esc(adminPath)}">返回管理面板</a></header><div class="url-bulk-toolbar"><label class="url-bulk-selection"><input id="urlSelectAll" type="checkbox"><span>全选</span></label><span id="urlSelectedCount">已选择 0 条</span><div class="url-bulk-actions"><button class="button secondary" type="button" id="urlBulkReplace">按字段管理</button><button class="button danger" type="button" id="urlBulkDelete">批量销毁</button></div></div><div class="urls-list">${rows}</div></main><div class="guest-destroy-modal" id="urlBulkModal" aria-hidden="true"><section class="guest-destroy-dialog" role="dialog" aria-modal="true" aria-labelledby="urlBulkTitle"><h2 id="urlBulkTitle">按字段管理</h2><p id="urlBulkDescription"></p><div class="url-bulk-field"><label for="urlBulkMode">操作</label><select class="native-picker" id="urlBulkMode"><option value="replace">查找替换</option><option value="destroy">搜索销毁</option></select></div><div class="url-bulk-mode-fields"><div class="url-bulk-field"><label for="urlBulkField">匹配字段</label><select class="native-picker" id="urlBulkField"><option value="SUBAPI">订阅转换后端（SUBAPI）</option><option value="SUBCONFIG">订阅转换规则（SUBCONFIG）</option></select></div><div class="url-bulk-field url-bulk-mode-replace"><label for="urlBulkOldValue">要查找的旧值</label><input id="urlBulkOldValue" type="text" placeholder="输入要查找的旧值" autocomplete="off"><label for="urlBulkNewValue" style="margin-top:12px">替换为</label><input id="urlBulkNewValue" type="text" placeholder="输入替换后的新值" autocomplete="off"></div><div class="url-bulk-field url-bulk-mode-destroy" hidden><label for="urlBulkSearchValue">搜索值</label><input id="urlBulkSearchValue" type="text" placeholder="输入要匹配的字段值" autocomplete="off"><p id="urlBulkSearchResult" role="status">请先搜索并确认匹配数量。</p><button type="button" class="button secondary" id="urlBulkSearch">搜索</button></div></div><div class="guest-destroy-actions"><button type="button" class="button secondary" id="urlBulkCancel">取消</button><button type="button" class="button" id="urlBulkApply">查找并替换全部</button><button type="button" class="button danger" id="urlBulkSearchDestroy" hidden disabled>销毁匹配项</button></div></section></div>${renderGuestEditFeature(editorData, config, true)}<script src="/__cfsubs.js" defer><\/script><script>
(function(){var checks=Array.from(document.querySelectorAll('.url-select')),selectAll=document.getElementById('urlSelectAll'),count=document.getElementById('urlSelectedCount'),bulkModal=document.getElementById('urlBulkModal'),fieldSelect=document.getElementById('urlBulkField');function message(text,error){window.CC(text,error)}function selected(){return checks.filter(function(input){return input.checked}).map(function(input){return input.value})}function updateSelection(){var tokens=selected();count.textContent='已选择 '+tokens.length+' 条';selectAll.checked=checks.length>0&&tokens.length===checks.length;selectAll.indeterminate=tokens.length>0&&tokens.length<checks.length}checks.forEach(function(input){input.addEventListener('change',updateSelection)});selectAll.addEventListener('change',function(){checks.forEach(function(input){input.checked=selectAll.checked});updateSelection()});
function removeEmptyState(){if(!document.querySelector('.url-entry')){var empty=document.createElement('div');empty.className='url-empty';empty.textContent='暂无聚合订阅链接';document.querySelector('.urls-list').appendChild(empty)}}function updateCount(){var rows=document.querySelectorAll('.url-entry').length;document.querySelector('.urls-header .subtitle').textContent='共 '+rows+' 条聚合订阅链接';if(!rows)removeEmptyState()}
async function post(payload){var response=await fetch('/api/admin',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)}),result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||'操作失败');return result}
document.querySelectorAll('.url-delete').forEach(function(button){button.addEventListener('click',async function(){var token=button.dataset.token;if(!token||!confirm('确定销毁这个聚合订阅链接？此操作不可恢复。'))return;button.disabled=true;try{await post({type:'json_delete',token:token});button.closest('.url-entry').remove();message('聚合订阅链接已销毁');updateCount();updateSelection()}catch(error){button.disabled=false;message(error.message||'销毁失败',true)}})});
document.getElementById('urlBulkDelete').addEventListener('click',async function(){var tokens=selected();if(!tokens.length){message('请先选择要销毁的链接',true);return}if(!confirm('确定销毁选中的 '+tokens.length+' 条聚合订阅链接？此操作不可恢复。'))return;var button=this;button.disabled=true;try{var result=await post({type:'url_bulk_delete',tokens:tokens});tokens.forEach(function(token){var row=document.querySelector('.url-entry[data-token="'+CSS.escape(token)+'"]');if(row)row.remove()});message('已销毁 '+result.deleted+' 条聚合订阅链接');updateCount();updateSelection()}catch(error){message(error.message||'批量销毁失败',true)}finally{button.disabled=false}});
document.getElementById('urlBulkReplace').addEventListener('click',function(){window.CFSubsModal.open(bulkModal,{ariaHidden:false})});function closeBulk(){window.CFSubsModal.close(bulkModal,{ariaHidden:true})}document.getElementById('urlBulkCancel').addEventListener('click',closeBulk);bulkModal.addEventListener('click',function(event){if(event.target===bulkModal)closeBulk()});
document.getElementById('urlBulkApply').addEventListener('click',async function(){var field=fieldSelect.value,oldValue=document.getElementById('urlBulkOldValue').value.trim(),newValue=document.getElementById('urlBulkNewValue').value.trim();if(!oldValue||!newValue){message('请填写要查找的旧值和替换后的新值',true);return}if(oldValue===newValue){message('新旧值相同，无需替换',true);return}if(!confirm('将在所有聚合订阅链接中查找并替换字段值，是否继续？'))return;var button=this;button.disabled=true;try{var result=await post({type:'url_bulk_update',field:field,oldValue:oldValue,newValue:newValue});closeBulk();message('已替换 '+result.updated+' 条链接中的 '+result.matched+' 处字段值')}catch(error){message(error.message||'查找替换失败',true)}finally{button.disabled=false}});
updateSelection()})();
async function post(payload){var response=await fetch('/api/admin',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)}),result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||'操作失败');return result}
function message(text,error){window.CC(text,error)}
(function(){var modal=document.getElementById('urlBulkModal'),mode=document.getElementById('urlBulkMode'),field=document.getElementById('urlBulkField'),replacePanel=document.querySelector('.url-bulk-mode-replace'),destroyPanel=document.querySelector('.url-bulk-mode-destroy'),description=document.getElementById('urlBulkDescription'),replaceButton=document.getElementById('urlBulkApply'),destroyButton=document.getElementById('urlBulkSearchDestroy'),searchButton=document.getElementById('urlBulkSearch'),searchValue=document.getElementById('urlBulkSearchValue'),searchResult=document.getElementById('urlBulkSearchResult'),lastQuery=null,matchCount=0;function syncMode(){var destroying=mode.value==='destroy';field.parentNode.hidden=destroying;replacePanel.hidden=destroying;destroyPanel.hidden=!destroying;replaceButton.hidden=destroying;destroyButton.hidden=!destroying;description.textContent=destroying?'输入一个值，同时搜索所有链接的 SUBAPI 和 SUBCONFIG；任一字段匹配就会销毁该链接。仅输入域名时按域名匹配。':'按 SUBAPI 或 SUBCONFIG 的字段值查找替换；仅输入域名时按域名精确匹配。链接路径和密钥不会更改。';if(destroying)invalidate()}function invalidate(){lastQuery=null;destroyButton.disabled=true;searchResult.textContent='条件已更改，请重新搜索。'}mode.addEventListener('change',syncMode);field.addEventListener('change',invalidate);searchValue.addEventListener('input',invalidate);document.getElementById('urlBulkReplace').addEventListener('click',function(){mode.value='replace';syncMode();window.CFSubsModal.open(modal,{ariaHidden:false})});searchButton.addEventListener('click',async function(){var query={field:'ANY',value:searchValue.value.trim()};if(!query.value){searchResult.textContent='请输入要搜索的字段值。';searchValue.focus();return}searchButton.disabled=true;destroyButton.disabled=true;lastQuery=null;try{var result=await post({type:'url_search_provider',field:query.field,value:query.value});lastQuery=query;matchCount=result.count;searchResult.textContent='找到 '+result.count+' 条匹配链接。'+(result.count?'确认后可销毁匹配项。':'没有匹配项。');destroyButton.disabled=result.count===0}catch(error){searchResult.textContent=error.message||'搜索失败';message(error.message||'搜索失败',true)}finally{searchButton.disabled=false}});destroyButton.addEventListener('click',async function(){if(!lastQuery||destroyButton.disabled)return;if(!confirm('确认销毁 '+matchCount+' 条匹配的聚合订阅链接？此操作不可恢复。'))return;destroyButton.disabled=true;try{var result=await post({type:'url_search_provider_delete',field:'ANY',value:lastQuery.value});(result.tokens||[]).forEach(function(token){var row=document.querySelector('.url-entry[data-token="'+CSS.escape(token)+'"]');if(row)row.remove()});window.CFSubsModal.close(modal,{ariaHidden:true});message('已销毁 '+result.deleted+' 条匹配链接');updateCount();updateSelection()}catch(error){message(error.message||'搜索销毁失败',true);destroyButton.disabled=false}});syncMode()})();
<\/script></body></html>`;
}
__name(renderGeneratedLinksManagerPage, "renderGeneratedLinksManagerPage");
async function listKVEntries(env) {
  const result = [];
  let cursor;
  do {
    const page = await env.KV.list(cursor ? { cursor } : {});
    const entries = await Promise.all(page.keys.filter(({ name }) => !name.startsWith("__CF_SUBS_INTERNAL__:") && !name.startsWith(CONFIG_SECTION_PREFIX)).map(async ({ name }) => {
      let value = await env.KV.get(name);
      if (value === null) return null;
      let displayValue = value;
      let exportValue = value;
      let isJson = false;
      try {
        const normalized = upperCaseObject(JSON.parse(value));
        if (name.startsWith(URL_PREFIX)) {
          delete normalized.PATH;
          delete normalized.SUBSCRIPTIONURL;
        }
        if (name.startsWith(URL_PREFIX) && Array.isArray(normalized.SOURCES) && normalized.SOURCES.some((source) => !isSourceCiphertext(String(source || "")))) {
          normalized.SOURCES = await encryptSourceList(env, normalized.SOURCES);
        }
        const normalizedRaw = JSON.stringify(normalized);
        if (normalizedRaw !== value) {
          await env.KV.put(name, normalizedRaw);
          value = normalizedRaw;
        }
        const parsedValue = JSON.parse(value);
        if (name === "CONFIG.JSON") delete parsedValue.CONFIGVERSION;
        displayValue = JSON.stringify(parsedValue, null, 2);
        exportValue = parsedValue;
        isJson = true;
      } catch {
        exportValue = value;
      }
      return { name, value: displayValue, isJson, exportValue };
    }));
    result.push(...entries.filter(Boolean));
    cursor = page.list_complete ? void 0 : page.cursor;
  } while (cursor);
  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}
__name(listKVEntries, "listKVEntries");
function renderJsonManagerPage(entries, adminPath, credentialsConfigured = false) {
  const exportData = Object.fromEntries(entries.map((entry) => [entry.name, entry.exportValue]));
  const safeExportData = JSON.stringify(exportData).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  const safeDisplayEntries = JSON.stringify(entries.map(({ name, value }) => ({ name, value }))).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  const title = `\u5907\u4EFD\u4E0E\u8FC1\u79FB \xB7 ${FILENAME || "SUB"}`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(title)}</title>${renderFavicon(title, SITELOGO)}<style>
${getToolStyles()}
body{min-height:100vh}.json-shell{max-width:1100px;padding-top:0!important;padding-bottom:34px}.json-header{margin:0 -28px 18px;padding:28px;border-bottom:1px solid rgba(120,130,140,.18)}.json-header-main{min-width:0}.json-list{display:grid;gap:10px}.json-entry{min-width:0;border:1px solid rgba(120,130,140,.2);border-radius:12px;padding:14px;background:rgba(255,255,255,.58)}.json-entry-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.json-key{min-width:0;font-size:16px;font-weight:700;overflow-wrap:anywhere}.json-entry-meta{display:flex;align-items:center;gap:10px;flex:0 0 auto}.json-empty{color:#777;text-align:center;padding:28px 12px}.json-actions{display:flex;gap:8px;flex-wrap:wrap}.json-view-overlay{position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.58);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);overscroll-behavior:contain}.json-view-overlay.open{display:flex}.json-view-modal{width:min(900px,100%);max-height:min(82vh,900px);display:flex;flex-direction:column;padding:20px;border:1px solid rgba(120,130,140,.24);border-radius:16px;background:#fff;color:#1f2937;box-shadow:0 18px 55px rgba(0,0,0,.32);overscroll-behavior:contain}.json-view-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.json-view-title{min-width:0;margin:0;font-size:18px;font-weight:750;overflow-wrap:anywhere}.json-view-close{flex:0 0 auto;width:38px;min-width:38px;height:38px;padding:0;font-size:22px;line-height:1}.json-view-value{min-height:0;margin:0;padding:14px;border-radius:10px;background:rgba(245,247,248,.9);font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre;overflow:auto;overscroll-behavior:contain;touch-action:pan-x pan-y;max-height:calc(82vh - 90px)}
.factory-reset-modal{width:min(480px,100%);gap:12px}.factory-reset-modal h2{margin:0;font-size:20px}.factory-reset-modal p{margin:0;color:#b42318;line-height:1.6}.factory-reset-modal label{display:block;margin:4px 0}.factory-reset-modal input{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid rgba(120,130,140,.35);border-radius:9px;font:inherit}.factory-reset-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:4px}
@media(max-width:600px){.page.app-shell.json-shell{width:calc(100% - 28px);margin:14px 14px 28px;padding:0 14px 24px;border-radius:22px}.json-header{margin:0 -14px 16px;padding:22px 14px 20px}.json-header .title{font-size:22px}.json-actions{width:100%}.json-actions .button{flex:1 1 auto;text-align:center}.json-entry{padding:10px}.json-key{font-size:14px;overflow-wrap:anywhere}.json-entry-head{align-items:center}.json-view-overlay{padding:12px}.json-view-modal{max-height:86vh;padding:16px;border-radius:14px}.json-view-value{max-height:calc(86vh - 82px);padding:10px}}
@media(prefers-color-scheme:dark){.json-header{border-bottom-color:rgba(255,255,255,.1)}.json-entry{background:rgba(8,12,14,.78);border-color:rgba(255,255,255,.12)}.json-empty{color:#9aa7b5}.json-view-modal{background:#11191d;border-color:rgba(255,255,255,.16);color:#e7ecef}.json-view-value{background:rgba(2,6,8,.72);color:#e7ecef}.factory-reset-modal p{color:#ff8a80}.factory-reset-modal input{background:rgba(0,0,0,.35);border-color:rgba(255,255,255,.16);color:#f3f6f7}}
</style></head><body><main class="page app-shell json-shell">
<header class="header json-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px"><div class="json-header-main"><h1 class="title">备份与迁移</h1><div class="subtitle">共 ${entries.length} 项 KV 数据；导入时同名键覆盖，其他数据保留</div></div><div class="json-actions"><button type="button" class="button danger" id="factory-reset-open">恢复出厂设置</button><button type="button" class="button" id="json-export-all">导出</button><button type="button" class="button secondary" id="json-import-all">导入</button><button type="button" class="button secondary" id="json-refresh-all">刷新</button><a class="button secondary" href="/${escapeHTML(adminPath)}">返回管理面板</a></div></header>
<div class="json-list">${entries.length ? entries.map((entry, index) => `<article class="json-entry"><div class="json-entry-head"><div class="json-key">${escapeHTML(entry.name)}</div><div class="json-entry-meta"><button type="button" class="button secondary json-show" data-entry-index="${index}">展示</button></div></div></article>`).join("") : '<div class="json-entry json-empty">KV 暂无数据</div>'}</div>
</main><div id="jsonViewOverlay" class="json-view-overlay" aria-hidden="true"><section class="json-view-modal" role="dialog" aria-modal="true" aria-labelledby="jsonViewTitle"><div class="json-view-head"><h2 id="jsonViewTitle" class="json-view-title"></h2><button type="button" class="button secondary json-view-close" id="jsonViewClose" aria-label="关闭">×</button></div><pre id="jsonViewValue" class="json-view-value"></pre></section></div><div id="factoryResetOverlay" class="json-view-overlay" aria-hidden="true"><section class="json-view-modal factory-reset-modal" role="dialog" aria-modal="true" aria-labelledby="factoryResetTitle"><h2 id="factoryResetTitle">恢复出厂设置</h2><p>此操作会永久删除当前 KV 中的全部数据，包括 CONFIG、所有订阅和链接，以及加密密钥。请先导出备份；删除后无法撤销。</p>${credentialsConfigured ? '<label for="factoryResetUsername">管理员用户名</label><input id="factoryResetUsername" type="text" autocomplete="username" required><label for="factoryResetPassword">管理员密码</label><input id="factoryResetPassword" type="password" autocomplete="current-password" required>' : '<p>当前未设置管理员用户名和密码。确认后将直接执行删除。</p>'}<div class="factory-reset-actions"><button type="button" class="button secondary" id="factoryResetCancel">取消</button><button type="button" class="button danger" id="factoryResetConfirm">${credentialsConfigured ? '验证并删除全部数据' : '确认删除全部数据'}</button></div></section></div><script src="/__cfsubs.js" defer><\/script><script>
(function(){
'use strict';
var exportData=${safeExportData};
var displayEntries=${safeDisplayEntries};

function showMessage(message,isError){window.CC(message,isError)}
var viewOverlay=document.getElementById('jsonViewOverlay'),viewTitle=document.getElementById('jsonViewTitle'),viewValue=document.getElementById('jsonViewValue'),viewClose=document.getElementById('jsonViewClose'),lastViewTrigger=null;
function closeJsonView(){window.CFSubsModal.close(viewOverlay,{className:'open',ariaHidden:true});viewTitle.textContent='';viewValue.textContent='';if(lastViewTrigger)lastViewTrigger.focus()}
document.querySelectorAll('.json-show').forEach(function(button){button.addEventListener('click',function(){var entry=displayEntries[Number(button.dataset.entryIndex)];if(!entry)return;lastViewTrigger=button;viewTitle.textContent=entry.name;viewValue.textContent=entry.value;window.CFSubsModal.open(viewOverlay,{className:'open',ariaHidden:false});viewClose.focus()})});
viewClose.addEventListener('click',closeJsonView);
viewOverlay.addEventListener('click',function(event){if(event.target===viewOverlay)closeJsonView()});
document.addEventListener('keydown',function(event){if(event.key==='Escape'&&viewOverlay.classList.contains('open'))closeJsonView()});
var resetOverlay=document.getElementById('factoryResetOverlay'),resetUsername=document.getElementById('factoryResetUsername'),resetPassword=document.getElementById('factoryResetPassword'),resetConfirm=document.getElementById('factoryResetConfirm'),resetCredentialsRequired=${credentialsConfigured};
function closeFactoryReset(){resetOverlay.classList.remove('open');resetOverlay.setAttribute('aria-hidden','true');if(resetPassword)resetPassword.value=''}
document.getElementById('factory-reset-open').addEventListener('click',function(){resetOverlay.classList.add('open');resetOverlay.setAttribute('aria-hidden','false');if(resetUsername)resetUsername.focus()});
document.getElementById('factoryResetCancel').addEventListener('click',closeFactoryReset);
resetOverlay.addEventListener('click',function(event){if(event.target===resetOverlay)closeFactoryReset()});
resetConfirm.addEventListener('click',async function(){var username=resetUsername?resetUsername.value:'',password=resetPassword?resetPassword.value:'';if(resetCredentialsRequired&&(!username||!password)){showMessage('请输入管理员用户名和密码',true);return}if(!confirm('确定永久删除当前 KV 中的全部数据吗？此操作无法撤销。'))return;resetConfirm.disabled=true;try{var response=await fetch(window.location.pathname,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({type:'factory_reset',username:username,password:password})}),result=await response.json().catch(function(){return{}});if(!response.ok||!result.ok)throw new Error(result.error||'恢复出厂设置失败');showMessage('已删除 '+result.deleted+' 项 KV 数据');setTimeout(function(){window.location.assign('/')},900)}catch(error){showMessage(error.message||'恢复出厂设置失败',true);if(resetPassword){resetPassword.value='';resetPassword.focus()}}finally{resetConfirm.disabled=false}});
function downloadExport(){var blob=new Blob([JSON.stringify(exportData,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='kv-export-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(function(){URL.revokeObjectURL(url)},1000);showMessage('已导出全部 KV 数据')}
document.getElementById('json-export-all').addEventListener('click',downloadExport);
document.getElementById('json-refresh-all').addEventListener('click',function(){window.location.reload()});
var input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;document.body.appendChild(input);
document.getElementById('json-import-all').addEventListener('click',function(){input.click()});
input.addEventListener('change',async function(){var file=input.files&&input.files[0];if(!file)return;try{var payload=JSON.parse(await file.text());if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('导入内容必须是一个 JSON 对象');var response=await fetch(window.location.pathname,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({type:'import_all_json',payload:payload})});var result=await response.json().catch(function(){return{}});if(!response.ok||!result.ok)throw new Error(result.error||'导入失败');showMessage('已导入 '+(result.count||0)+' 项数据');setTimeout(function(){window.location.reload()},500)}catch(error){showMessage(error.message||'导入失败',true)}finally{input.value=''}});
})();
<\/script></body></html>`;
}
__name(renderJsonManagerPage, "renderJsonManagerPage");
async function renderAdminPage(url, env, settings) {
  const apis = normalizeProviderList(settings.subApis), configs = normalizeProviderList(settings.subConfigs);
  const generatedLinkCount = await countGeneratedLinks(env);
  const esc = /* @__PURE__ */ __name((x) => escapeHTML(String(x ?? "")), "esc");
  const defaultApiId = String(settings.defaultSubApiId || "");
  const defaultConfigId = String(settings.defaultSubConfigId || "");
  const rows = /* @__PURE__ */ __name((list, type, empty) => list.length ? list.map((x) => {
    return `<div class="link-item provider-item" draggable="true" data-provider-id="${esc(x.id)}">
        <div class="drag-handle" title="\u62D6\u52A8\u6392\u5E8F" aria-label="\u62D6\u52A8\u6392\u5E8F">\u283F</div>
        <div class="provider-main">
            <div class="link-label">${esc(x.name)}</div>
            <a class="provider-url link-url" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.url)}</a>
        </div>
        <div class="actions admin-row-actions">
            <button type="button" class="secondary" data-provider-action="edit" data-provider-type="${esc(type)}" data-provider-id="${esc(x.id)}" data-provider-name="${esc(x.name)}" data-provider-url="${esc(x.url)}">\u7F16\u8F91</button>
            <button type="button" class="danger" data-provider-action="delete" data-provider-type="${esc(type)}" data-provider-id="${esc(x.id)}">\u5220\u9664</button>
        </div>
    </div>`;
  }).join("") : `<div class="empty">${empty}</div>`, "rows");
  const defaultSelect = /* @__PURE__ */ __name((list, type, defaultId) => {
    const label = type === "subapi" ? "SUBAPI" : "SUBCONFIG";
    return `<select class="default-provider-select" data-type="${esc(type)}" aria-label="\u9ED8\u8BA4${label}">
            ${list.length ? list.map((x) => `<option value="${esc(x.id)}" ${x.id === defaultId ? "selected" : ""}>${esc(x.name)}</option>`).join("") : '<option value="">\u6682\u65E0\u914D\u7F6E</option>'}
        </select>`;
  }, "defaultSelect");
  const title = `${settings.subName || "SUB"} \xB7 \u7BA1\u7406\u540E\u53F0`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>${renderFavicon(title, settings.siteLogo)}<style>${getToolStyles()}
.admin-shell{max-width:1100px;padding-top:40px!important;padding-bottom:34px}.admin-shell>.topbar{margin-bottom:18px}.admin-shell>.panel{margin-top:12px}.admin-shell>.panel:first-of-type{margin-top:0}.admin-shell .topbar{padding-bottom:24px}
.sub-head{display:grid;grid-template-columns:max-content minmax(0,1fr);align-items:start;gap:14px}.sub-head .section-title{white-space:nowrap;font-size:16px;line-height:40px;margin:0}.sub-head-actions{display:grid;grid-template-columns:270px 190px;align-items:center;justify-content:end;gap:10px;width:100%}.default-provider-select{width:270px;min-width:270px;height:40px;padding:0 30px 0 12px;border:1px solid rgba(120,120,120,.45);border-radius:9px;background:rgba(255,255,255,.7);color:inherit;font-size:14px;font-weight:600;cursor:pointer;box-sizing:border-box}.default-provider-select:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.18);width:max-content;min-width:270px;max-width:calc(100vw - 40px)}.sub-head-actions>button{width:190px;min-width:190px;height:40px;white-space:nowrap;word-break:keep-all;overflow:hidden;text-overflow:clip;font-size:14px}.provider-main{min-width:0;width:100%;position:relative;z-index:1}.provider-url{display:block;width:100%;margin-top:6px;margin-bottom:0;word-break:break-all;overflow-wrap:anywhere;line-height:1.55}.provider-item{position:relative;padding:12px 104px 12px 42px;cursor:grab;transition:opacity .15s ease,transform .15s ease,box-shadow .15s ease}.provider-item:active{cursor:grabbing}.provider-item.dragging{opacity:.55}.provider-item.drag-over{box-shadow:inset 0 0 0 2px rgba(59,130,246,.45)}.drag-handle{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:22px;line-height:1;color:#8a8a8a;letter-spacing:-3px;user-select:none;cursor:grab;touch-action:none}.admin-row-actions{position:absolute;top:12px;right:12px;display:flex;flex-direction:column;gap:7px;margin-top:0;align-items:stretch;z-index:2}.admin-row-actions button{min-width:68px}.provider-list.saving-order{opacity:.75;pointer-events:none}.empty{font-size:12px;color:#888}.topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.topbar-main{min-width:0;flex:1}.site-title-display{font-size:28px;font-weight:700;line-height:1.2;color:#1a1a1a}.site-title-input{font-size:15px!important}.site-title-input:focus{box-shadow:none!important}.top-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.top-actions .button{min-width:86px}.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;z-index:1000;padding:20px}.modal-content{width:min(460px,100%);background:rgba(255,255,255,.95);border-radius:20px;padding:24px;box-shadow:0 10px 40px rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.5)}.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}@media(max-width:760px){.sub-head{grid-template-columns:1fr;gap:8px}.sub-head-actions{width:100%;grid-template-columns:minmax(0,1fr) 190px}.default-provider-select{width:100%;min-width:0;font-size:14px}.default-provider-select:focus{width:max-content;min-width:0;max-width:100%}}@media(max-width:600px){.admin-shell{width:calc(100% - 28px);margin-left:14px;margin-right:14px;padding-top:34px!important}.top-actions{width:100%;justify-content:stretch}.top-actions .button{flex:1}.sub-head-actions{width:100%;grid-template-columns:minmax(0,1fr) 170px}.default-provider-select{width:100%;min-width:0;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:10px;padding-right:24px}.default-provider-select:focus{width:100%;min-width:0;max-width:100%;font-size:12px}.sub-head-actions>button{width:170px;min-width:170px;white-space:nowrap}.provider-item{padding:12px 12px 12px 38px;display:block}.provider-main{width:100%;padding-right:0}.provider-url{width:100%;margin-top:7px;line-height:1.5}.admin-row-actions{position:static;display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;margin-top:10px}.admin-row-actions button{width:100%;min-width:0;height:40px}.drag-handle{left:10px;top:18px;transform:none;font-size:20px}.modal-content{padding:20px}}.json-count-panel{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:18px}.json-count-main{min-width:0}.json-count-main .section-title{margin-bottom:4px}.json-count-value{grid-column:2;font-size:26px;font-weight:800;white-space:nowrap;text-align:center}.json-count-view{grid-column:3;justify-self:end;min-width:92px;text-align:center;text-decoration:none}.json-count-panel>.json-count-main{grid-column:1}.json-count-panel>.json-count-view{grid-column:3}@media(max-width:600px){.json-count-panel{grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:8px}.json-count-main{min-width:0}.json-count-value{font-size:22px}.json-count-view{min-width:76px;padding-left:12px;padding-right:12px}}@media(prefers-color-scheme:dark){.site-title-display{color:#f5f5f5}.site-title-input{color:#f5f5f5!important}.default-provider-select{background:rgba(30,30,30,.92);border-color:rgba(255,255,255,.18);color:#fff}.modal-content{background:rgba(30,30,30,.96);border-color:rgba(255,255,255,.1)}.empty{color:#aaa}body{background:#000;background-image:radial-gradient(circle at 0% 28%,rgba(0,188,212,.14),transparent 24%),radial-gradient(circle at 100% 100%,rgba(0,120,70,.18),transparent 32%),linear-gradient(180deg,#000 0%,#020807 58%,#00140b 100%);background-attachment:fixed;color:#f4f7f8}.page.admin-shell{background:linear-gradient(135deg,rgba(1,5,6,.98) 0%,rgba(2,10,10,.96) 48%,rgba(0,54,35,.92) 100%);border-color:rgba(255,255,255,.13);box-shadow:0 20px 70px rgba(0,0,0,.55)}.admin-shell .header{border-bottom-color:rgba(255,255,255,.10)}.admin-shell .site-title-display,.admin-shell .section-title,.admin-shell label{color:#fff}.admin-shell .subtitle,.admin-shell .empty{color:#9aa7b5}.admin-shell .provider-item{background:rgba(8,12,14,.78);border-color:rgba(255,255,255,.10)}.admin-shell .provider-url{color:#64b5f6}.admin-shell .default-provider-select,.admin-shell input{background:rgba(2,6,8,.82);border-color:rgba(255,255,255,.13);color:#f3f6f7}.admin-shell .modal-content{background:rgba(12,17,19,.97);border-color:rgba(255,255,255,.12);color:#fff}}
.provider-section-main{display:grid;grid-template-columns:max-content minmax(0,1fr);align-items:center;gap:14px}
.url-count-panel{display:flex;justify-content:space-between;gap:18px}.url-count-panel .json-count-main{grid-column:auto}.url-count-meta{display:flex;align-items:center;flex-wrap:wrap;gap:8px 16px}.url-count-panel .url-count-note{color:#000;font-weight:600}.url-count-panel .json-count-view{grid-column:auto}@media(prefers-color-scheme:dark){.url-count-panel .url-count-note{color:#fff}}
.provider-section-main .provider-section-heading{font-size:16px;font-weight:750;white-space:nowrap}
.provider-section-main .sub-head{display:block;margin:0;min-width:0}
.provider-section-main .sub-head-actions{grid-template-columns:minmax(0,270px) 190px}
.provider-section-main .default-provider-select{width:100%;min-width:0}
.provider-section-main .sub-head-actions>button{width:190px;min-width:0}
.provider-section-toggle{display:flex;align-items:center;justify-content:flex-end;gap:12px;width:100%;min-height:40px;margin-top:10px;padding:0 12px;background:#edf6ef;border:1px solid #c5dfcb;border-radius:10px;color:#194d2b;text-align:left;box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 2px 7px rgba(22,101,52,.07)}
.provider-section-meta{display:flex;align-items:center;justify-content:flex-end;gap:10px;width:100%}
.provider-count{margin-right:auto;padding:4px 9px;border:1px solid rgba(25,77,43,.18);border-radius:999px;background:rgba(255,255,255,.56);font-size:12px;font-weight:650;white-space:nowrap}
.provider-toggle-hint{font-size:12px;font-weight:650;white-space:nowrap}
.provider-section-chevron{display:inline-flex;align-items:center;justify-content:center;width:27px;height:27px;border-radius:50%;background:rgba(25,77,43,.1);font-size:11px;transition:transform .2s ease}
.provider-section-toggle[aria-expanded="true"] .provider-section-chevron{transform:rotate(180deg)}
.provider-section-toggle:not(:disabled):hover{background:#1d6b3a;border-color:#1d6b3a;color:#fff;box-shadow:0 6px 16px rgba(22,101,52,.22)}
.provider-section-toggle:hover .provider-count{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.3)}
.provider-section-content{padding-top:12px}
.provider-section-content[hidden]{display:none}
@media(max-width:760px){.provider-section-main{grid-template-columns:max-content minmax(0,1fr);gap:10px}.provider-section-main .provider-section-heading{font-size:14px}.provider-section-main .sub-head-actions{grid-template-columns:minmax(0,1fr) 150px}.provider-section-main .sub-head-actions>button{width:150px}}
@media(max-width:600px){.provider-section-main{display:grid;grid-template-columns:minmax(0,1fr);gap:8px}.provider-section-main .provider-section-heading{font-size:14px}.provider-section .provider-section-main .sub-head .sub-head-actions{display:flex !important;flex-direction:column !important;align-items:stretch !important;gap:8px !important}.provider-section-main .default-provider-select{width:100%;min-width:0}.provider-section-main .sub-head-actions>button{width:100%;min-width:0;padding:0 10px;font-size:12px}.provider-section-main .sub-head-actions>button:before{content:none}.provider-section-toggle{margin-top:8px}.provider-section-meta{justify-content:flex-end;width:100%}.provider-count{margin-right:auto}}
@media(prefers-color-scheme:dark){.provider-section-toggle{background:#17251c;border-color:#35543d;color:#d8f3df;box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 2px 9px rgba(0,0,0,.24)}.provider-count{background:rgba(0,0,0,.18);border-color:rgba(167,243,208,.24)}.provider-section-chevron{background:rgba(167,243,208,.12)}.provider-section-toggle:not(:disabled):hover{background:#a7f3d0;border-color:#a7f3d0;color:#10251a;box-shadow:0 6px 18px rgba(0,0,0,.35)}.provider-section-toggle:hover .provider-count{background:rgba(16,37,26,.08);border-color:rgba(16,37,26,.24)}}
/* SUBAPI / SUBCONFIG mobile layout fix */
@media(max-width:600px){
  .admin-shell{
    padding-left:14px!important;
    padding-right:14px!important;
  }
  .sub-head-actions{
    display:flex !important;
    flex-direction:column !important;
    align-items:stretch !important;
    width:100% !important;
    gap:12px !important;
  }
  .sub-head-actions .default-provider-select,
  .sub-head-actions>button{
    width:100% !important;
    min-width:0 !important;
    height:42px !important;
  }
  .provider-section .sub-head-actions{
    display:grid !important;
    grid-template-columns:minmax(0,1fr) minmax(120px,auto) !important;
    flex-direction:row !important;
    gap:8px !important;
  }
  .provider-section .sub-head-actions>button{
    width:auto !important;
  }
}
@media(min-width:761px){
  .admin-shell{max-width:1240px}
  .provider-section-main .sub-head-actions{grid-template-columns:minmax(0,380px) 190px}
}
</style></head><body><main class="page app-shell admin-shell" data-admin-path="${esc(settings.adminPath || "admin")}">
<header class="header topbar"><div class="topbar-main"><div class="site-title-display">${esc(settings.subName || "SUB")}</div><div class="subtitle">\u7BA1\u7406\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF\u3001\u8BA2\u9605\u8F6C\u6362\u89C4\u5219\u548C\u7AD9\u70B9\u5B89\u5168\u8BBE\u7F6E\u3002</div></div><div class="top-actions"><button type="button" class="button secondary" data-open-modal="securityModal">\u5B89\u5168</button><button type="button" class="button" data-open-modal="siteModal">\u7AD9\u70B9</button><a class="button danger" href="/${esc(settings.adminPath || "admin")}/logout">\u9000\u51FA</a></div></header>
<section class="panel provider-section"><div class="provider-section-main"><span class="provider-section-heading">\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF(SUBAPI)</span><div class="sub-head"><div class="sub-head-actions">${defaultSelect(apis, "subapi", defaultApiId)}<button type="button" aria-label="\u6DFB\u52A0\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF" data-provider-action="add" data-provider-type="subapi">\uFF0B \u6DFB\u52A0\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF</button></div></div></div><button type="button" class="provider-section-toggle" data-provider-toggle aria-expanded="false" aria-controls="subapiContent"><span class="provider-section-meta"><span class="provider-count">\u914D\u7F6E\u6570 ${apis.length}</span><span class="provider-toggle-hint">\u70B9\u51FB\u5C55\u5F00</span><span class="provider-section-chevron" aria-hidden="true">\u25BC</span></span></button><div class="provider-section-content" id="subapiContent" hidden><div class="sub-grid provider-list" data-provider-type="subapi" style="margin-top:12px">${rows(apis, "subapi", "\u6682\u65E0\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF\uFF0C\u8BF7\u624B\u52A8\u6DFB\u52A0\u3002")}</div></div></section>
<section class="panel provider-section"><div class="provider-section-main"><span class="provider-section-heading">\u8BA2\u9605\u8F6C\u6362\u89C4\u5219(SUBCONFIG)</span><div class="sub-head"><div class="sub-head-actions">${defaultSelect(configs, "subconfig", defaultConfigId)}<button type="button" aria-label="\u6DFB\u52A0\u8BA2\u9605\u8F6C\u6362\u89C4\u5219" data-provider-action="add" data-provider-type="subconfig">\uFF0B \u6DFB\u52A0\u8BA2\u9605\u8F6C\u6362\u89C4\u5219</button></div></div></div><button type="button" class="provider-section-toggle" data-provider-toggle aria-expanded="false" aria-controls="subconfigContent"><span class="provider-section-meta"><span class="provider-count">\u914D\u7F6E\u6570 ${configs.length}</span><span class="provider-toggle-hint">\u70B9\u51FB\u5C55\u5F00</span><span class="provider-section-chevron" aria-hidden="true">\u25BC</span></span></button><div class="provider-section-content" id="subconfigContent" hidden><div class="sub-grid provider-list" data-provider-type="subconfig" style="margin-top:12px">${rows(configs, "subconfig", "\u6682\u65E0\u8BA2\u9605\u8F6C\u6362\u89C4\u5219\uFF0C\u8BF7\u624B\u52A8\u6DFB\u52A0\u3002")}</div></div></section>
<section class="panel json-count-panel url-count-panel"><div class="json-count-main"><h2 class="section-title">聚合订阅链接管理</h2><div class="url-count-meta"><div class="section-note">查看和管理已生成的聚合订阅链接。</div><div class="section-note url-count-note">订阅链接数 ${generatedLinkCount}</div></div></div><a class="button json-count-view" href="/${esc(settings.adminPath || "admin")}/URLS">进入</a></section>
<section class="panel json-count-panel"><div class="json-count-main"><h2 class="section-title">\u5907\u4EFD\u4E0E\u8FC1\u79FB</h2><div class="section-note">\u5907\u4EFD\u3001\u6062\u590D\u5E76\u67E5\u770B KV \u4E2D\u6240\u6709\u914D\u7F6E\u3001\u8BA2\u9605\u4E0E\u94FE\u63A5 JSON\u3002</div></div><a class="button json-count-view" href="/${esc(settings.adminPath || "admin")}/json">\u8FDB\u5165</a></section>
</main>
<div id="providerModal" class="modal-overlay"><div class="modal-content"><h2 class="section-title" id="modalTitle">\u6DFB\u52A0</h2><div class="field"><label for="modalName">\u5907\u6CE8</label><input id="modalName"></div><div class="field"><label for="modalUrl">URL</label><input id="modalUrl" placeholder="https://..."></div><div class="modal-actions"><button type="button" class="secondary" id="providerCancel">\u53D6\u6D88</button><button type="button" id="modalSave">\u4FDD\u5B58</button></div></div></div>
<div id="securityModal" class="modal-overlay"><div class="modal-content"><h2 class="section-title">\u5B89\u5168</h2><div class="section-note">\u4FEE\u6539\u7BA1\u7406\u5458\u8D26\u53F7\u548C\u5BC6\u7801\u3002\u4FEE\u6539\u5BC6\u7801\u65F6\u5FC5\u987B\u8F93\u5165\u4E24\u6B21\uFF1B\u4E24\u6B21\u7559\u7A7A\u8868\u793A\u4FDD\u6301\u539F\u5BC6\u7801\u3002</div><div class="field"><label for="securityUser">\u7BA1\u7406\u5458\u8D26\u53F7</label><input id="securityUser" value="${esc(settings.user || "")}" autocomplete="username"></div><div class="field"><label for="securityPass">\u7BA1\u7406\u5458\u5BC6\u7801</label><input id="securityPass" type="password" placeholder="\u7559\u7A7A\u4FDD\u6301\u539F\u5BC6\u7801" autocomplete="new-password"></div><div class="field"><label for="securityPass2">\u786E\u8BA4\u7BA1\u7406\u5458\u5BC6\u7801</label><input id="securityPass2" type="password" placeholder="\u518D\u6B21\u8F93\u5165\u65B0\u5BC6\u7801" autocomplete="new-password"></div><div class="modal-actions"><button type="button" class="secondary" data-close-modal="securityModal">\u53D6\u6D88</button><button type="button" id="saveSecurity">\u4FDD\u5B58</button></div></div></div>
<div id="siteModal" class="modal-overlay"><div class="modal-content"><h2 class="section-title">\u7AD9\u70B9</h2><div class="field"><label for="siteName">\u7AD9\u70B9\u6807\u9898</label><input id="siteName" value="${esc(settings.subName || "SUB")}" placeholder="SUB"></div><div class="field"><label for="sitePath">\u7BA1\u7406\u5458\u8DEF\u5F84</label><input id="sitePath" value="${esc(settings.adminPath || "admin")}" placeholder="admin"></div><div class="field"><label for="siteLogo">\u5168\u7AD9 Logo \u5730\u5740</label><input id="siteLogo" value="${esc(settings.siteLogo || "")}" placeholder="https://example.com/favicon.png" type="url"><div class="section-note">\u652F\u6301 http:// \u6216 https:// \u76F4\u94FE\uFF1B\u7559\u7A7A\u5219\u4E0D\u8BBE\u7F6E\u3002\u6B64 Logo \u4F1A\u7528\u4E8E\u5168\u7AD9\u6807\u7B7E\u680F\u3002</div></div><div class="modal-actions"><button type="button" class="secondary" data-close-modal="siteModal">\u53D6\u6D88</button><button type="button" id="saveSite">\u4FDD\u5B58</button></div></div></div>
<script src="/__cfsubs.js" defer><\/script></body></html>`;
}
__name(renderAdminPage, "renderAdminPage");

// ../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-ly8n5r/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = WORKER_DEFAULT;

// ../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-ly8n5r/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=_worker.js.map
