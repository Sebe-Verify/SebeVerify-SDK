"use strict";var h=Object.defineProperty;var b=Object.getOwnPropertyDescriptor;var v=Object.getOwnPropertyNames;var w=Object.prototype.hasOwnProperty;var E=(i,e)=>{for(var t in e)h(i,t,{get:e[t],enumerable:!0})},k=(i,e,t,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of v(e))!w.call(i,r)&&r!==t&&h(i,r,{get:()=>e[r],enumerable:!(n=b(e,r))||n.enumerable});return i};var U=i=>k(h({},"__esModule",{value:!0}),i);var T={};E(T,{SebeVerifySDK:()=>p,createVerificationSession:()=>L,default:()=>x});module.exports=U(T);var C="https://sebe-verify-sdk.vercel.app";function y(i,e){let t;try{t=new URL(i)}catch{throw new Error(`${e} must be an absolute http(s) URL, got "${i}"`)}if(t.protocol!=="http:"&&t.protocol!=="https:")throw new Error(`${e} must be an http(s) URL, got "${t.protocol}"`)}function S(){if(typeof crypto<"u"&&typeof crypto.randomUUID=="function")return crypto.randomUUID();let i=new Uint8Array(16);if(typeof crypto<"u"&&typeof crypto.getRandomValues=="function")crypto.getRandomValues(i);else for(let t=0;t<16;t++)i[t]=Math.floor(Math.random()*256);i[6]=i[6]&15|64,i[8]=i[8]&63|128;let e=Array.from(i,t=>t.toString(16).padStart(2,"0")).join("");return`${e.slice(0,8)}-${e.slice(8,12)}-${e.slice(12,16)}-${e.slice(16,20)}-${e.slice(20)}`}var p=class{config;eventListeners=new Map;sessionId=null;modalElement=null;webAppUrl;constructor(e){if(!e.apiKey)throw new Error("apiKey is required");if(!e.projectId)throw new Error("projectId is required");if(!e.redirectUrl)throw new Error("redirectUrl is required");y(e.redirectUrl,"redirectUrl");let t=e.webAppUrl||C;y(t,"webAppUrl"),this.config=e,this.webAppUrl=t.replace(/\/$/,"")}on(e,t){return this.eventListeners.has(e)||this.eventListeners.set(e,[]),this.eventListeners.get(e).push(t),this}off(e,t){let n=this.eventListeners.get(e);if(n){let r=n.indexOf(t);r>-1&&n.splice(r,1)}return this}emit(e,t){(this.eventListeners.get(e)||[]).forEach(r=>{try{r(t)}catch(d){console.error(`Error in ${e} handler:`,d)}})}buildVerificationUrl(e){let t=new URLSearchParams({returnUrl:this.config.redirectUrl,projectId:this.config.projectId,apiKey:this.config.apiKey});return`${this.webAppUrl}/verify/${e}?${t.toString()}`}createModal(e){if(this.modalElement)return;if(!document.getElementById("sv-geist-font")){let l=document.createElement("link");l.id="sv-geist-font",l.rel="stylesheet",l.href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@500&display=swap",document.head.appendChild(l)}let t="'Geist', ui-sans-serif, system-ui, -apple-system, sans-serif",n=document.createElement("div");n.setAttribute("role","dialog"),n.setAttribute("aria-modal","true"),n.setAttribute("aria-labelledby","sebeverify-modal-title"),n.style.cssText=`
      position: fixed; inset: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center; padding: 16px;
      background: rgba(14,19,34,0.5);
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
      font-family: ${t};
      -webkit-font-smoothing: antialiased;
    `;let r=document.createElement("div");r.style.cssText=`
      background: #FAFAF6;
      background-image: radial-gradient(ellipse 90% 50% at 50% -5%, rgba(44,91,255,0.07) 0%, transparent 70%);
      border-radius: 26px;
      padding: 32px 28px 28px;
      width: 100%; max-width: 400px;
      box-shadow: 0 1px 0 rgba(14,19,34,0.02), 0 24px 48px -12px rgba(14,19,34,0.22);
      border: 1px solid #E7E6E0;
      text-align: center;
    `;let d=document.createElement("div");d.style.cssText=`
      width: 72px; height: 72px; border-radius: 50%;
      background: #ECF0FF;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px;
    `,d.innerHTML='<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2C5BFF" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';let s=document.createElement("h2");s.id="sebeverify-modal-title",s.style.cssText=`
      margin: 0 0 8px; padding: 0;
      font-size: 22px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2;
      color: #0E1322; font-family: ${t};
    `,s.textContent="Identity Verification";let c=document.createElement("p");c.style.cssText=`
      margin: 0 0 24px; padding: 0;
      font-size: 14px; line-height: 1.55; color: #8B8F9C; font-family: ${t};
    `,c.textContent="Verify your identity to continue. You'll need your ID document and a selfie \u2014 takes about 2 minutes.";let f=document.createElement("div");f.style.cssText=`
      display: flex; align-items: center; gap: 8px;
      background: #FFFFFF; border: 1px solid #E7E6E0; border-radius: 12px;
      padding: 11px 14px; margin-bottom: 20px; text-align: left;
      box-shadow: 0 1px 0 rgba(14,19,34,0.02), 0 4px 8px -4px rgba(14,19,34,0.08);
    `,f.innerHTML=`
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2C5BFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span style="font-size:13px;color:#4B5063;font-family:${t};">ID document &amp; selfie \xB7 ~2 min</span>
    `;let a=document.createElement("a");a.href=e,a.style.cssText=`
      display: flex; align-items: center; justify-content: space-between;
      height: 56px; padding: 0 20px; margin-bottom: 10px;
      background: #2C5BFF; color: #fff; text-decoration: none;
      border-radius: 18px; font-family: ${t};
      font-size: 15px; font-weight: 600; letter-spacing: -0.01em;
      box-shadow: 0 4px 16px rgba(44,91,255,0.3);
      transition: background 0.15s;
    `,a.innerHTML=`
      <span>Start Verification</span>
      <span style="
        display:flex;align-items:center;justify-content:center;
        width:32px;height:32px;border-radius:12px;
        background:rgba(255,255,255,0.2);flex-shrink:0;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </span>
    `,a.addEventListener("mouseover",()=>{a.style.background="#0F36D9"}),a.addEventListener("mouseout",()=>{a.style.background="#2C5BFF"});let o=document.createElement("button");o.type="button",o.textContent="Cancel",o.style.cssText=`
      display: flex; align-items: center; justify-content: center;
      width: 100%; height: 40px; margin-bottom: 20px;
      background: transparent; border: none;
      color: #8B8F9C; font-family: ${t};
      font-size: 13px; font-weight: 500; cursor: pointer;
      transition: color 0.15s;
    `,o.addEventListener("mouseover",()=>{o.style.color="#4B5063"}),o.addEventListener("mouseout",()=>{o.style.color="#8B8F9C"});let u=document.createElement("div");u.style.cssText=`
      padding-top: 16px; border-top: 1px solid #E7E6E0;
      display: flex; align-items: center; justify-content: center; gap: 6px;
    `,u.innerHTML=`
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C2C5CE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <span style="font-size:11px;color:#C2C5CE;font-family:'Geist Mono',ui-monospace,monospace;font-weight:500;letter-spacing:0.04em;text-transform:uppercase;">Secured by SebeVerify</span>
    `,r.append(d,s,c,f,a,o,u),n.appendChild(r);let g=()=>{this.closeModal(),this.emit("cancelled")};o.addEventListener("click",g),n.addEventListener("click",l=>{l.target===n&&g()});let m=l=>{l.key==="Escape"&&g()};document.addEventListener("keydown",m),n.__cleanup=()=>{document.removeEventListener("keydown",m)},document.body.appendChild(n),this.modalElement=n}closeModal(){if(!this.modalElement)return;let e=this.modalElement.__cleanup;e&&e(),this.modalElement.remove(),this.modalElement=null}isMobile(){return typeof window>"u"?!1:/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)}async start(){try{this.emit("started");let e=S();if(this.sessionId=e,this.config.registerSessionUrl){let n=await fetch(this.config.registerSessionUrl,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({sessionId:e})});if(!n.ok){let r=await n.json().catch(()=>({}));throw new Error(r.error??`Session registration failed (${n.status})`)}}let t=this.buildVerificationUrl(e);if(this.isMobile()){window.location.href=t,this.emit("mobile_opened");return}this.createModal(t)}catch(e){this.closeModal();let t=e instanceof Error?e.message:"Unknown error";throw this.emit("error",new Error(t)),e}}destroy(){this.closeModal(),this.eventListeners.clear(),this.sessionId=null}};function x(i){return new p(i)}async function L(i){let e=i.documentType||"national-id",t=i.documentId||`user_${Date.now()}_${Math.random().toString(36).slice(2,11)}`,n=`${i.backendUrl}/projects/${i.projectId}/verification/session/start`,r=await fetch(n,{method:"POST",headers:{"Content-Type":"application/json","X-API-Key":i.apiKey},body:JSON.stringify({document_type:e,document_id:t})});if(!r.ok){let s=await r.json().catch(()=>({detail:"Failed to create verification session"})),c=typeof s?.detail=="string"?s.detail:JSON.stringify(s?.detail??s);throw new Error(`${c||"Failed to create verification session"} (${r.status})`)}return{sessionId:(await r.json()).session_id,backendUrl:i.backendUrl,projectId:i.projectId}}0&&(module.exports={SebeVerifySDK,createVerificationSession});
