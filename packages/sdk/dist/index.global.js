"use strict";var SebeVerify=(()=>{var d=Object.defineProperty;var g=Object.getOwnPropertyDescriptor;var f=Object.getOwnPropertyNames;var u=Object.prototype.hasOwnProperty;var m=(i,e)=>{for(var t in e)d(i,t,{get:e[t],enumerable:!0})},h=(i,e,t,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of f(e))!u.call(i,s)&&s!==t&&d(i,s,{get:()=>e[s],enumerable:!(n=g(e,s))||n.enumerable});return i};var b=i=>h(d({},"__esModule",{value:!0}),i);var w={};m(w,{SebeVerifySDK:()=>a,createVerificationSession:()=>y,default:()=>l,getVerificationStatus:()=>x,initiateVerification:()=>v,verifyUser:()=>I});var a=class{config;eventListeners=new Map;sessionId=null;modalElement=null;frontendUrl="";webAppUrl="";constructor(e){if(!e.apiKey)throw new Error("apiKey is required");if(!e.projectId)throw new Error("projectId is required");this.config=e,this.eventListeners=new Map,typeof window<"u"&&(this.frontendUrl=window.location.origin,this.webAppUrl=e.webAppUrl||this.frontendUrl)}on(e,t){return this.eventListeners.has(e)||this.eventListeners.set(e,[]),this.eventListeners.get(e).push(t),this}off(e,t){let n=this.eventListeners.get(e);if(n){let s=n.indexOf(t);s>-1&&n.splice(s,1)}return this}emit(e,t){(this.eventListeners.get(e)||[]).forEach(s=>{try{s(t)}catch(r){console.error(`Error in ${e} handler:`,r)}})}getApiHeaders(){return{"Content-Type":"application/json","X-API-Key":this.config.apiKey}}createSession(){let e=crypto.randomUUID();return this.sessionId=e,e}createModal(e){if(this.modalElement)return;let t=document.createElement("div");t.style.cssText=`
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.9); z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;let n=document.createElement("div");n.style.cssText=`
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 20px; padding: 40px;
      max-width: 420px; text-align: center; color: white;
      box-shadow: 0 25px 50px rgba(0,0,0,0.5);
    `,n.innerHTML=`
      <div style="font-size: 56px; margin-bottom: 20px;">\u{1F512}</div>
      <h2 style="margin: 0 0 12px; font-size: 24px; font-weight: 600;">Verification Ready</h2>
      <p style="color: #9ca3af; margin: 0 0 32px; line-height: 1.5;">
        Click below to complete your identity verification
      </p>
      <a href="${e}" style="
        display: block;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        text-decoration: none;
        padding: 16px 32px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 16px;
        margin-bottom: 20px;
      ">Start Verification</a>
      <button id="sdk-cancel-btn" style="
        background: transparent;
        border: 1px solid #4b5563;
        color: #9ca3af;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
      ">Cancel</button>
      <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #374151;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
          You'll be redirected to complete verification
        </p>
      </div>
    `;let s=n.querySelector("#sdk-cancel-btn");s&&s.addEventListener("click",()=>{this.closeModal(),this.emit("cancelled")}),t.appendChild(n),document.body.appendChild(t),this.modalElement=t}closeModal(){this.modalElement&&(this.modalElement.remove(),this.modalElement=null)}isMobile(){return typeof window>"u"?!1:/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)}async start(){try{this.emit("started");let e=this.createSession(),t=`${this.webAppUrl}/verify/${e}?returnUrl=${encodeURIComponent(this.config.redirectUrl)}&projectId=${encodeURIComponent(this.config.projectId)}&apiKey=${encodeURIComponent(this.config.apiKey)}`;if(this.isMobile()){window.location.href=t,this.emit("mobile_opened");return}this.createModal(t)}catch(e){this.closeModal();let t=e instanceof Error?e.message:"Unknown error";throw this.emit("error",new Error(t)),e}}async submitDocument(e){throw this.sessionId?new Error("submitDocument() is not supported in this version. Use start() to open the verification flow \u2014 the SDK web app handles all backend communication."):new Error("No active session. Call start() first.")}destroy(){this.closeModal(),this.eventListeners.clear(),this.sessionId=null}};function l(i){return new a(i)}var c=new Map;async function y(i){let e=i.backendUrl||"http://localhost:8000",t=i.documentType||"national-id",n=i.documentId||`user_${Date.now()}_${Math.random().toString(36).slice(2,11)}`,s=`${e}/projects/${i.projectId}/verification/session/start`,r=await fetch(s,{method:"POST",headers:{"Content-Type":"application/json","X-API-Key":i.apiKey},body:JSON.stringify({document_type:t,document_id:n})});if(!r.ok){let o=await r.json().catch(()=>({detail:"Failed to create verification session"})),p=typeof o?.detail=="string"?o.detail:JSON.stringify(o?.detail??o);throw new Error(`${p||"Failed to create verification session"} (${r.status})`)}return{sessionId:(await r.json()).session_id,backendUrl:e,projectId:i.projectId}}function v(i){let e=`sess_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,t=i.backendUrl||"http://localhost:3000",n={success:!0,sessionId:e,status:"pending"};return c.set(e,n),{sessionId:e,verificationUrl:`${t}/verify/${e}`}}function I(i){if(!c.get(i.sessionId))return{success:!1,sessionId:i.sessionId,status:"rejected",message:"Session not found"};let t={success:!0,sessionId:i.sessionId,status:"approved",message:"Verification completed successfully",requestId:`req_${Date.now()}`,verifiedAt:new Date().toISOString()};return c.set(i.sessionId,t),t}function x(i){return c.get(i)||null}return b(w);})();
