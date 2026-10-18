const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync('api/analyze.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function setup({env={},user={id:'test-user'},providerStatus=200}={}){
 let calls=[];
 const context={exports:{},process:{env},AbortSignal,require:()=>({createClient:()=>({auth:{getUser:async token=>({data:{user:token==='valid'?user:null},error:null})}})}),fetch:async (url,options)=>{calls.push({url,body:JSON.parse(options.body)});return {ok:providerStatus===200,status:providerStatus,json:async()=>({choices:[{message:{content:'{}'}}]})};}};
 vm.runInNewContext(code,context);
 let response={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
 return {handler:context.exports.default,response,calls};
}
const env={EXPO_PUBLIC_SUPABASE_URL:'https://example.supabase.co',EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test-public',OPENROUTER_API_KEY:'test-server-only'};
const body={model:'untrusted-model',messages:[{role:'user',content:[{type:'text',text:'Inspect this evidence'},{type:'image_url',image_url:{url:'data:image/jpeg;base64,aGVsbG8='}}]}]};
test('only POST and configured server are accepted',async()=>{
 const s=setup();await s.handler({method:'GET'},s.response);assert.equal(s.response.code,405);
 await s.handler({method:'POST'},s.response);assert.equal(s.response.code,503);assert.equal(s.calls.length,0);
});
test('requires a verified session before provider access',async()=>{
 for(const authorization of [undefined,'Bearer invalid']){
  const s=setup({env});await s.handler({method:'POST',headers:{authorization},body},s.response);assert.equal(s.response.code,401);assert.equal(s.calls.length,0);
 }
});
test('rejects remote image URLs and malformed payloads',async()=>{
 for(const content of [[],[null],[{type:'image_url',image_url:{url:'https://private.example/image'}}],[{type:'text',text:'x'.repeat(24001)}]]){
  const s=setup({env});await s.handler({method:'POST',headers:{authorization:'Bearer valid'},body:{messages:[{role:'user',content}]}},s.response);assert.equal(s.response.code,400);assert.equal(s.calls.length,0);
 }
});
test('provider request uses server-selected model',async()=>{
 const s=setup({env});await s.handler({method:'POST',headers:{authorization:'Bearer valid'},body},s.response);assert.equal(s.response.code,200);assert.equal(s.calls.length,1);assert.equal(s.calls[0].body.model,'qwen/qwen3-vl-8b-instruct');assert.equal(s.calls[0].body.max_tokens,450);
});
test('provider failures are sanitized',async()=>{
 for(const providerStatus of [402,429]) { const s=setup({env,providerStatus});await s.handler({method:'POST',headers:{authorization:'Bearer valid'},body},s.response);assert.equal(s.response.code,providerStatus);assert.equal(JSON.stringify(s.response.body).includes('test-server-only'),false); }
});
