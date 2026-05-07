var h="https://sebe-verify-sdk-deploy-fork.vercel.app";function y(r,e){let t;try{t=new URL(r)}catch{throw new Error(`${e} must be an absolute http(s) URL, got "${r}"`)}if(t.protocol!=="http:"&&t.protocol!=="https:")throw new Error(`${e} must be an http(s) URL, got "${t.protocol}"`)}function b(){if(typeof crypto<"u"&&typeof crypto.randomUUID=="function")return crypto.randomUUID();let r=new Uint8Array(16);if(typeof crypto<"u"&&typeof crypto.getRandomValues=="function")crypto.getRandomValues(r);else for(let t=0;t<16;t++)r[t]=Math.floor(Math.random()*256);r[6]=r[6]&15|64,r[8]=r[8]&63|128;let e=Array.from(r,t=>t.toString(16).padStart(2,"0")).join("");return`${e.slice(0,8)}-${e.slice(8,12)}-${e.slice(12,16)}-${e.slice(16,20)}-${e.slice(20)}`}var f=class{config;eventListeners=new Map;sessionId=null;modalElement=null;webAppUrl;constructor(e){if(!e.apiKey)throw new Error("apiKey is required");if(!e.projectId)throw new Error("projectId is required");if(!e.redirectUrl)throw new Error("redirectUrl is required");y(e.redirectUrl,"redirectUrl");let t=e.webAppUrl||h;y(t,"webAppUrl"),this.config=e,this.webAppUrl=t.replace(/\/$/,"")}on(e,t){return this.eventListeners.has(e)||this.eventListeners.set(e,[]),this.eventListeners.get(e).push(t),this}off(e,t){let n=this.eventListeners.get(e);if(n){let i=n.indexOf(t);i>-1&&n.splice(i,1)}return this}emit(e,t){(this.eventListeners.get(e)||[]).forEach(i=>{try{i(t)}catch(s){console.error(`Error in ${e} handler:`,s)}})}buildVerificationUrl(e){let t=new URLSearchParams({returnUrl:this.config.redirectUrl,projectId:this.config.projectId,apiKey:this.config.apiKey});return`${this.webAppUrl}/verify/${e}?${t.toString()}`}createModal(e){if(this.modalElement)return;let t=document.createElement("div");t.setAttribute("role","dialog"),t.setAttribute("aria-modal","true"),t.setAttribute("aria-labelledby","sebeverify-modal-title"),t.style.cssText=`
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.9); z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;let n=document.createElement("div");n.style.cssText=`
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 20px; padding: 40px;
      max-width: 420px; text-align: center; color: white;
      box-shadow: 0 25px 50px rgba(0,0,0,0.5);
    `;let i=document.createElement("div");i.style.cssText="font-size: 56px; margin-bottom: 20px;",i.textContent="\u{1F512}";let s=document.createElement("h2");s.id="sebeverify-modal-title",s.style.cssText="margin: 0 0 12px; font-size: 24px; font-weight: 600;",s.textContent="Verification Ready";let o=document.createElement("p");o.style.cssText="color: #9ca3af; margin: 0 0 32px; line-height: 1.5;",o.textContent="Click below to complete your identity verification";let a=document.createElement("a");a.href=e,a.textContent="Start Verification",a.style.cssText=`
      display: block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 20px;
    `;let c=document.createElement("button");c.type="button",c.textContent="Cancel",c.style.cssText=`
      background: transparent;
      border: 1px solid #4b5563;
      color: #9ca3af;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
    `;let d=document.createElement("div");d.style.cssText="margin-top: 24px; padding-top: 24px; border-top: 1px solid #374151;";let l=document.createElement("p");l.style.cssText="color: #6b7280; font-size: 12px; margin: 0;",l.textContent="You'll be redirected to complete verification",d.appendChild(l),n.append(i,s,o,a,c,d),t.appendChild(n);let p=()=>{this.closeModal(),this.emit("cancelled")};c.addEventListener("click",p),t.addEventListener("click",u=>{u.target===t&&p()});let m=u=>{u.key==="Escape"&&p()};document.addEventListener("keydown",m),t.__cleanup=()=>{document.removeEventListener("keydown",m)},document.body.appendChild(t),this.modalElement=t}closeModal(){if(!this.modalElement)return;let e=this.modalElement.__cleanup;e&&e(),this.modalElement.remove(),this.modalElement=null}isMobile(){return typeof window>"u"?!1:/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)}async start(){try{this.emit("started");let e=b();this.sessionId=e;let t=this.buildVerificationUrl(e);if(this.isMobile()){window.location.href=t,this.emit("mobile_opened");return}this.createModal(t)}catch(e){this.closeModal();let t=e instanceof Error?e.message:"Unknown error";throw this.emit("error",new Error(t)),e}}destroy(){this.closeModal(),this.eventListeners.clear(),this.sessionId=null}};function g(r){return new f(r)}async function x(r){let e=r.documentType||"national-id",t=r.documentId||`user_${Date.now()}_${Math.random().toString(36).slice(2,11)}`,n=`${r.backendUrl}/projects/${r.projectId}/verification/session/start`,i=await fetch(n,{method:"POST",headers:{"Content-Type":"application/json","X-API-Key":r.apiKey},body:JSON.stringify({document_type:e,document_id:t})});if(!i.ok){let o=await i.json().catch(()=>({detail:"Failed to create verification session"})),a=typeof o?.detail=="string"?o.detail:JSON.stringify(o?.detail??o);throw new Error(`${a||"Failed to create verification session"} (${i.status})`)}return{sessionId:(await i.json()).session_id,backendUrl:r.backendUrl,projectId:r.projectId}}export{f as SebeVerifySDK,x as createVerificationSession,g as default};
