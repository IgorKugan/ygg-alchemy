const {readFileSync}=require('node:fs');const {join}=require('node:path');const {runInNewContext}=require('node:vm');
const root=join(__dirname,'../..');
module.exports=function harness(){
 let listener;const data={},callbacks=[],subscriptions=new WeakMap();
 const local={get:async key=>({[key]:structuredClone(data[key])}),set:async values=>{for(const [key,value]of Object.entries(values)){const oldValue=structuredClone(data[key]);data[key]=structuredClone(value);queueMicrotask(()=>callbacks.forEach(fn=>fn({[key]:{oldValue,newValue:structuredClone(value)}},'local')));}}};
 const context={URL,crypto:require('node:crypto').webcrypto,Date,console,chrome:{runtime:{id:'test-extension',getURL:p=>'chrome-extension://test-extension/'+p,onMessage:{addListener:fn=>listener=fn}},storage:{local}}};
 context.importScripts=()=>runInNewContext(readFileSync(join(root,'chrome-extension/shared.js'),'utf8'),context);
 runInNewContext(readFileSync(join(root,'chrome-extension/background.js'),'utf8'),context);
 const send=(message,sender)=>new Promise(resolve=>listener(message,sender,resolve));
 return {data,send,release:api=>{for(const fn of subscriptions.get(api)||[]){const i=callbacks.indexOf(fn);if(i>=0)callbacks.splice(i,1);}},chromeFor:sender=>{const owned=[];const api={runtime:{sendMessage:message=>send(message,sender)},storage:{local,onChanged:{addListener:fn=>{owned.push(fn);callbacks.push(fn);}}}};subscriptions.set(api,owned);return api;}};
};
