// Test için sahte Supabase istemcisi: veriler window.__FX içinden okunur.
(function(){
  const today=new Date();const ymd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const dn=n=>{const d=new Date();d.setDate(d.getDate()+n);return ymd(d)};
  const ROLE=localStorage.getItem("__role")||"coach";
  const ME=ROLE==="coach"?"c1":"s1";
  const now=Date.now();
  const st=(status,done,extra)=>Object.assign({day:dn(0),status,cur:status==="study"?{start:now-50*60000,brk:0,bs:0,subj:"Matematik",meth:"Soru çözme"}:null,done:done*60000,log:[{t:now-3600000,m:"Uyandım"}],qs:[{s:"Matematik",n:40,c:30,b:5,k:"Türev"}],prog:false,mood:0,sleep:6.5,dist:2,en:4,str:2,hard:"",meth:{}},extra||{});
  const FX=window.__FX={
    profiles:[{id:"c1",name:"Hasan Karakış",role:"coach"},{id:"s1",name:"Ayşe Yılmaz",role:"student"},{id:"s2",name:"Mehmet Demir",role:"student"},{id:"s3",name:"Zeynep Kaya",role:"student"},{id:"s4",name:"Ali Çelik",role:"student"}],
    daily:[
      {student_id:"s1",day:dn(0),state:st("study",30),snap:{m:80,q:40}},
      {student_id:"s2",day:dn(0),state:st("idle",0),snap:{m:0,q:0}},
      {student_id:"s4",day:dn(0),state:Object.assign(st("break",40),{cur:{start:now-130*60000,brk:0,bs:now-75*60000,subj:"Fizik",meth:"Soru çözme"}}),snap:{m:40,q:10}},
      {student_id:"s3",day:dn(0),state:st("closed",120),snap:{m:120,q:60}},
      ...[1,2,3,4,5,6].flatMap(i=>[{student_id:"s1",day:dn(-i),state:st("closed",90),snap:{m:90,q:50,prog:1,mood:4,sleep:7.5}},{student_id:"s4",day:dn(-i),state:st("closed",0),snap:{m:0,q:0,prog:0,mood:1,sleep:4.5}}])
    ],
    weekly_tasks:[
      {id:1,student_id:"s1",task_date:dn(-1),title:"Türev 40 soru",subject:"Matematik",amount:"40 soru",done:false,source:"coach"},
      {id:2,student_id:"s1",task_date:dn(-2),title:"Paragraf 30 soru",subject:"Türkçe",amount:null,done:false,source:"coach"},
      {id:3,student_id:"s3",task_date:dn(-3),title:"Kimya mol konusu",subject:"Kimya",amount:null,done:false,source:"coach"},
      {id:4,student_id:"s1",task_date:dn(0),title:"Fizik vektörler",subject:"Fizik",amount:null,done:false,source:"coach"},
      {id:5,student_id:"s2",task_date:dn(-1),title:"Tarih tekrar",subject:"Tarih",amount:null,done:true,source:"coach"}
    ],
    messages:[{id:1,student_id:"s2",from_coach:false,body:"Hocam bu hafta deneme sonucum düştü, ne yapmalıyım?",created_at:new Date(now-20*60000).toISOString(),read_at:null,kind:"chat"},{id:2,student_id:"s1",from_coach:true,body:"Ayşe, molan biraz uzadı ☕ 25 dakikalık bir odakla masaya dönelim!",created_at:new Date(now-26*3600000).toISOString(),read_at:new Date(now-25*3600000).toISOString(),kind:"auto"},{id:3,student_id:"s1",from_coach:false,body:"Tamam hocam, döndüm 👍",created_at:new Date(now-25*3600000).toISOString(),read_at:new Date(now-24*3600000).toISOString(),kind:"chat"},{id:4,student_id:"s1",from_coach:true,body:"Süpersin! Akşam deneme sonucunu da yükle.",created_at:new Date(now-50*60000).toISOString(),read_at:null,kind:"chat"}],
    app_settings:[{key:"nudge",value:{on:true,min:60,quiet_from:0,quiet_to:7}},{key:"wa",value:{on:false,chat:true,nudge:true}}],student_contacts:[{student_id:"s1",phone:"905321234567",parent_phone:null,wa_ok:false}],break_nudges:[{student_id:"s3",break_start:now-9000000,sent_at:new Date(now-3600000).toISOString(),push:1,wa_status:null}],
    goals:[],notes:[],exam_results:[{id:801,student_id:"s1",exam_name:"MEBİ 1",exam_type:"TYT",exam_date:dn(-13),total_net:72.5,topics:[]}],exam_targets:[],ai_reports:[],plan_drafts:[],profile_photos:[],topic_progress:[],student_profile:[{student_id:"s1",exam:"YKS",field:"SAY",grade:"12",school:null,target:"Tıp",tags:["Pazartesi grubu"]},{student_id:"s3",exam:"YKS",field:"EA",grade:"12",tags:[]}],exam_calendar:[{id:91,exam_date:(()=>{const d=new Date();d.setDate(d.getDate()-(d.getDay()+6)%7);return ymd(d)})(),title:"MEBİ YKS denemesi (bu hafta)",exam_type:"TYT",scope:"deneme"},{id:92,exam_date:dn(-14),title:"MEBİ YKS denemesi (2 hafta önce)",exam_type:"TYT",scope:"deneme"},{id:93,exam_date:dn(30),title:"MEBİ YKS denemesi (gelecek)",exam_type:"TYT",scope:"deneme"}],meetings:[],plan_templates:[],wrong_book:[{id:501,student_id:"s1",subject:"Matematik",topic:"Türev",cause:"Dikkat hatası",note:"İşaret hatası",img:null,stage:0,next_review:dn(0),created_at:new Date(now-3*864e5).toISOString()}],challenge_prefs:[],consents:[],parent_links:[],leads:[{id:701,name:"Fatma Öz",phone:"905551112233",exam:"YKS",grade:"11. sınıf",note:"Kızım için",status:"yeni",consent:true,created_at:new Date(now-2*3600e3).toISOString()}],packages:[{student_id:"s2",name:"3 aylık",ends_on:dn(3),paid:true,note:null}],challenges:[{id:2,title:"Yeni süre yarışması v2",metric:"minutes",start_day:dn(-3),end_day:dn(3),notified_at:"x",chat_open:true},{id:1,title:"Süre şampiyonluğu",metric:"minutes",start_day:dn(-10),end_day:dn(-4),notified_at:"x",chat_open:true}],push_subs:[]
  };
  window.__CALLS=[];
  function Q(t){this.t=t;this.f=[];this.op="select";this.one=false;this.payload=null}
  const P=Q.prototype;
  ["select"].forEach(m=>P[m]=function(){return this});
  P.eq=function(k,v){this.f.push(r=>r[k]===v);return this};
  P.neq=function(k,v){this.f.push(r=>r[k]!==v);return this};
  P.gte=function(k,v){this.f.push(r=>r[k]>=v);return this};
  P.lte=function(k,v){this.f.push(r=>r[k]<=v);return this};
  P.lt=function(k,v){this.f.push(r=>r[k]<v);return this};
  P.gt=function(k,v){this.f.push(r=>r[k]>v);return this};
  P.is=function(k,v){this.f.push(r=>(r[k]??null)===v);return this};
  P.in=function(k,v){this.f.push(r=>v.includes(r[k]));return this};
  P.order=function(k,o){if(!this.ord)this.ord=[k,!!(o&&o.ascending===false)];return this};P.limit=function(){return this};P.range=function(){return this};
  P.maybeSingle=function(){this.one=true;return this};P.single=function(){this.one=true;return this};
  P.insert=function(p){this.op="insert";this.payload=p;return this};
  P.upsert=function(p){this.op="upsert";this.payload=p;return this};
  P.update=function(p){this.op="update";this.payload=p;return this};
  P.delete=function(){this.op="delete";return this};
  P.then=function(ok,no){
    const L=FX[this.t]||(FX[this.t]=[]);let res;
    window.__CALLS.push(this.t+":"+this.op);
    if(this.op==="select"){let d=L.filter(r=>this.f.every(f=>f(r)));if(this.ord){const [k,desc]=this.ord;d=d.slice().sort((a,b)=>{const x=a[k]??"",y=b[k]??"";return (x<y?-1:x>y?1:0)*(desc?-1:1)})}res={data:this.one?(d[0]||null):d,error:null}}
    else if(this.op==="insert"){const ins=[].concat(this.payload).map(r=>Object.assign({id:Math.round(Math.random()*1e6),created_at:new Date().toISOString(),read_at:null,kind:"chat",wa_status:null},r));ins.forEach(r=>L.push(r));res={data:this.one?ins[0]:ins,error:null}}
    else if(this.op==="update"){L.filter(r=>this.f.every(f=>f(r))).forEach(r=>Object.assign(r,this.payload));res={data:null,error:null}}
    else if(this.op==="upsert"){[].concat(this.payload).forEach(r=>{const k=r.student_id&&!r.day&&!r.key?"student_id":r.key?"key":null;const i=k?L.findIndex(x=>x[k]===r[k]):-1;if(i>=0)Object.assign(L[i],r);else L.push(r)});res={data:null,error:null}}
    else if(this.op==="delete"){FX[this.t]=L.filter(r=>!this.f.every(f=>f(r)));res={data:null,error:null}}
    else res={data:null,error:null};
    return Promise.resolve(res).then(ok,no);
  };
  const ch={on(){return ch},subscribe(){return ch}};
  window.supabase={createClient(){return {
    auth:{getSession:async()=>(window.__NOSESS?{data:{session:null}}:{data:{session:{user:{id:ME,email:(ROLE==="coach"?"hasan":"alic")+"@takip.karakis.app"},access_token:"x"}}}),signOut:async(o)=>{window.__CALLS&&window.__CALLS.push("signOut:"+JSON.stringify(o||{}));return {}},signInWithPassword:async()=>({error:null})},
    from:t=>new Q(t),
    rpc:async(n,a)=>{window.__CALLS.push("rpc:"+n+":"+JSON.stringify(a));
      if(n==="task_reschedule"){let c=0;FX.weekly_tasks.forEach(t=>{if(a.p_ids.includes(t.id)){t.task_date=a.p_date;c++}});return {data:c,error:null}}
      if(n==="msg_read"){FX.messages.forEach(m=>{if(m.student_id===a.p_student&&!m.from_coach)m.read_at=new Date().toISOString()});return {data:null,error:null}}
      if(n==="parent_view")return {data:(window.__PV||{ad:"Ayşe",bugun:dn(0),bitis:new Date(now+20*864e5).toISOString(),gunler:[{gun:dn(-1),dk:120,soru:80},{gun:dn(-3),dk:200,soru:150}],gorev:{toplam:10,tamam:7},denemeler:[{ad:"MEBİ 1",tur:"TYT",tarih:dn(-13),net:72.5}]}),error:null};
      if(n==="push_coverage")return {data:(window.__PUSHCOV||[{student_id:"s1",n:1}]),error:null};
      if(n==="challenge_board")return {data:[{label:"Ayşe Y.",total:640,today:80,live:true},{label:"Zeynep K.",total:520,today:120},{label:"Ali Ç.",total:90,today:0}],error:null};
      return {data:[],error:null}},
    channel:()=>ch
  }}};
})();
