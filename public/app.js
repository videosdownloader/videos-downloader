'use strict';

function $(id){return document.getElementById(id);}

var urlInput=$('url'),clearBtn=$('clearBtn'),pasteBtn=$('pasteBtn'),fetchBtn=$('fetchBtn');
var preview=$('preview'),thumbnail=$('thumbnail'),title=$('title'),uploaderName=$('uploaderName');
var duration=$('duration'),downloadBtn=$('downloadBtn'),progress=$('progress');
var barFill=$('barFill'),pctNum=$('pctNum'),statusText=$('statusText'),subText=$('subText');
var statSpeed=$('statSpeed'),statEta=$('statEta'),statSize=$('statSize');
var qualitySection=$('qualitySection'),qualityList=$('qualityList'),qualityCount=$('qualityCount');
var toastWrap=$('toastWrap'),platformLabel=$('platformLabel'),inputPlatform=$('inputPlatform');
var palette=$('palette'),paletteInput=$('paletteInput'),paletteList=$('paletteList'),paletteBtn=$('paletteBtn');
var historyBtn=$('historyBtn'),hamburger=$('hamburger'),hamburgerIcon=$('hamburgerIcon'),mobileMenu=$('mobileMenu');
var navDrop=$('navDrop'),navDropBtn=$('navDropBtn');
var historyDrawer=$('historyDrawer'),drawerOverlay=$('drawerOverlay'),closeDrawer=$('closeDrawer'),drawerBody=$('drawerBody');

var currentUrl='',currentFormat='mp4',selectedQuality={formatId:'best',height:'best'},pollTimer=null,currentPlatform='generic';
var HISTORY_KEY='anik_download_history_v1';

function toast(msg,type){
  type=type||'info';
  if(!toastWrap)return;
  var el=document.createElement('div');
  el.className='toast '+type;
  var svg='<svg viewBox="0 0 24 24">';
  if(type==='success')svg+='<polyline points="20 6 9 17 4 12"/>';
  else if(type==='error')svg+='<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
  else if(type==='warn')svg+='<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>';
  else svg+='<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>';
  svg+='</svg>';
  el.innerHTML=svg+'<span></span>';
  el.querySelector('span').textContent=msg;
  toastWrap.appendChild(el);
  setTimeout(function(){
    el.style.transition='opacity .3s, transform .3s';
    el.style.opacity='0';el.style.transform='translateY(-8px)';
    setTimeout(function(){el.remove();},300);
  },3200);
}

var ICONS={
  youtube:'<svg viewBox="0 0 24 24" fill="#ff0000"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1 31.4 31.4 0 0 0 .5-5.8 31.4 31.4 0 0 0-.5-5.8zM9.5 15.6V8.4l6.3 3.6z"/></svg>',
  tiktok:'<svg viewBox="0 0 24 24" fill="#000"><path d="M19.6 6.7a4.8 4.8 0 0 1-2.8-2.9 7.5 7.5 0 0 1-.1-1.8h-3.5v14.2a2.9 2.9 0 1 1-2.1-2.8V9.7a6.4 6.4 0 1 0 5.6 6.4V8.9a8.2 8.2 0 0 0 4.4 1.3V6.8z"/></svg>',
  instagram:'<svg viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#e1306c"/></svg>',
  facebook:'<svg viewBox="0 0 24 24" fill="#1877f2"><path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4h-3v-3.5h3V9.4c0-3 1.8-4.6 4.5-4.6 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z"/></svg>',
  twitter:'<svg viewBox="0 0 24 24" fill="#000"><path d="M18.2 2.3h3.3l-7.2 8.3 8.5 11.1h-6.7l-5.2-6.8-6 6.8H1.6l7.7-8.8L1.1 2.3h6.9l4.7 6.2zm-1.2 17.5h1.8L7.1 4.1H5.1z"/></svg>',
  reddit:'<svg viewBox="0 0 24 24" fill="#ff4500"><circle cx="12" cy="14" r="7"/><circle cx="8.5" cy="14" r="1.2" fill="#fff"/><circle cx="15.5" cy="14" r="1.2" fill="#fff"/></svg>',
  vimeo:'<svg viewBox="0 0 24 24" fill="#1ab7ea"><path d="M22.4 7.4c-.1 2-1.5 4.7-4.2 8.2-2.8 3.6-5.2 5.4-7.2 5.4-1.2 0-2.2-1.1-3-3.4l-1.7-6c-.6-2.2-1.3-3.4-2-3.4-.2 0-.7.3-1.6 1L1.6 8c1-.9 2-1.8 3-2.7 1.4-1.2 2.4-1.8 3.1-1.9 1.6-.1 2.6 1 3 3.3.4 2.4.7 4 .9 4.6.5 2.2 1 3.3 1.6 3.3.5 0 1.2-.7 2.1-2.2.9-1.5 1.4-2.6 1.5-3.3.1-1.3-.4-2-1.5-2-.5 0-1 .1-1.6.4 1.1-3.5 3.2-5.2 6.2-5.1 2.2.1 3.2 1.5 3.1 4z"/></svg>',
  twitch:'<svg viewBox="0 0 24 24" fill="#9146ff"><path d="M4 2v18h4v3h4l3-3h4l5-5V2zm16 11l-3 3h-5l-3 3v-3H6V4h14zM16 6v5h-2V6zm-5 0v5H9V6z"/></svg>',
  generic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/></svg>'
};

function detectPlatform(url){
  try{
    var host=new URL(url).hostname.replace(/^www\./,'').toLowerCase();
    if(host.indexOf('youtube')!==-1||host==='youtu.be')return 'youtube';
    if(host.indexOf('tiktok')!==-1)return 'tiktok';
    if(host.indexOf('instagram')!==-1)return 'instagram';
    if(host.indexOf('facebook')!==-1||host==='fb.watch')return 'facebook';
    if(host.indexOf('twitter')!==-1||host==='x.com'||host==='t.co')return 'twitter';
    if(host.indexOf('reddit')!==-1)return 'reddit';
    if(host.indexOf('vimeo')!==-1)return 'vimeo';
    if(host.indexOf('twitch')!==-1)return 'twitch';
    return 'generic';
  }catch(e){return 'generic';}
}

function updatePlatformIndicator(){
  if(!urlInput||!inputPlatform||!platformLabel)return;
  var val=urlInput.value.trim();
  if(!val){
    inputPlatform.innerHTML=ICONS.generic;
    platformLabel.textContent='Detecting…';
    currentPlatform='generic';return;
  }
  var p=detectPlatform(val);
  currentPlatform=p;
  inputPlatform.innerHTML=ICONS[p]||ICONS.generic;
  platformLabel.textContent=p==='generic'?'Any source':p.charAt(0).toUpperCase()+p.slice(1);
}

if(urlInput){
  urlInput.addEventListener('input',function(){
    var hasVal=!!urlInput.value.trim();
    if(clearBtn)clearBtn.classList.toggle('hidden',!hasVal);
    updatePlatformIndicator();
  });
  urlInput.addEventListener('paste',function(){
    setTimeout(function(){
      var hasVal=!!urlInput.value.trim();
      if(clearBtn)clearBtn.classList.toggle('hidden',!hasVal);
      updatePlatformIndicator();
    },50);
  });
  urlInput.addEventListener('keydown',function(e){
    if(e.key==='Enter'){e.preventDefault();if(fetchBtn)fetchBtn.click();}
  });
}

if(clearBtn)clearBtn.addEventListener('click',function(){
  urlInput.value='';clearBtn.classList.add('hidden');
  if(pasteBtn)pasteBtn.classList.add('hidden');
  urlInput.focus();updatePlatformIndicator();
});

if(pasteBtn)pasteBtn.addEventListener('click',async function(){
  try{
    var text=await navigator.clipboard.readText();
    if(text){urlInput.value=text.trim();urlInput.dispatchEvent(new Event('input'));pasteBtn.classList.add('hidden');toast('Pasted from clipboard','success');}
  }catch(e){toast('Could not read clipboard','error');}
});

async function checkClipboard(){
  if(!navigator.clipboard||!navigator.clipboard.readText)return;
  try{
    var text=await navigator.clipboard.readText();
    if(text&&/^https?:\/\//i.test(text.trim())&&urlInput&&!urlInput.value.trim()){
      if(pasteBtn)pasteBtn.classList.remove('hidden');
    }
  }catch(e){}
}
checkClipboard();

function closeMobileMenu(){
  if(!mobileMenu||!hamburger)return;
  mobileMenu.classList.remove('open');
  hamburger.setAttribute('aria-expanded','false');
  document.body.classList.remove('no-scroll');
  if(hamburgerIcon)hamburgerIcon.innerHTML='<line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="17" x2="21" y2="17"/>';
}

if(hamburger&&mobileMenu){
  hamburger.addEventListener('click',function(e){
    e.preventDefault();e.stopPropagation();
    if(mobileMenu.classList.contains('open'))closeMobileMenu();
    else{
      mobileMenu.classList.add('open');
      hamburger.setAttribute('aria-expanded','true');
      document.body.classList.add('no-scroll');
      if(hamburgerIcon)hamburgerIcon.innerHTML='<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
    }
  });
  mobileMenu.querySelectorAll('a[data-close]').forEach(function(a){a.addEventListener('click',closeMobileMenu);});
  window.addEventListener('resize',function(){if(window.innerWidth>=1000)closeMobileMenu();});
}

if(navDropBtn&&navDrop){
  navDropBtn.addEventListener('click',function(e){
    e.preventDefault();e.stopPropagation();
    navDrop.classList.toggle('open');
    navDropBtn.setAttribute('aria-expanded',navDrop.classList.contains('open')?'true':'false');
  });
  document.addEventListener('click',function(e){
    if(!navDrop.contains(e.target)){navDrop.classList.remove('open');navDropBtn.setAttribute('aria-expanded','false');}
  });
}

document.querySelectorAll('.segmented button').forEach(function(btn){
  btn.addEventListener('click',function(){
    document.querySelectorAll('.segmented button').forEach(function(b){b.classList.remove('active');});
    btn.classList.add('active');
    currentFormat=btn.dataset.format||'mp4';
    if(qualitySection)qualitySection.style.display=currentFormat==='mp3'?'none':'block';
  });
});

if(fetchBtn)fetchBtn.addEventListener('click',async function(){
  var url=urlInput?urlInput.value.trim():'';
  if(!url)return toast('Please enter a video link','warn');
  if(!/^https?:\/\//i.test(url))return toast('Link must start with http:// or https://','warn');
  fetchBtn.disabled=true;
  fetchBtn.innerHTML='<svg class="spin" viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg><span>Fetching…</span>';
  if(preview)preview.classList.remove('show');
  if(progress)progress.classList.remove('show','success');
  if(pollTimer){clearInterval(pollTimer);pollTimer=null;}
  try{
    var res=await fetch('/api/info',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url})});
    var data=await res.json();
    if(!res.ok)throw new Error(data.error||'Could not fetch video');
    currentUrl=url;
    currentPlatform=data.platform||detectPlatform(url);
    if(thumbnail){thumbnail.src=data.thumbnail||'';thumbnail.onerror=function(){this.alt='No preview';};}
    if(title)title.textContent=data.title||'Untitled';
    if(uploaderName)uploaderName.textContent=data.uploader?'by '+data.uploader:'Unknown source';
    if(duration){
      if(data.duration>0){
        var h=Math.floor(data.duration/3600);var m=Math.floor((data.duration%3600)/60);var s=Math.floor(data.duration%60);
        duration.textContent=h>0?h+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'):m+':'+String(s).padStart(2,'0');
        duration.classList.add('show');
      }else duration.classList.remove('show');
    }
    currentFormat='mp4';
    document.querySelectorAll('.segmented button').forEach(function(b){b.classList.toggle('active',b.dataset.format==='mp4');});
    if(qualitySection)qualitySection.style.display='block';
    buildQualities(data.qualities||[]);
    if(preview)preview.classList.add('show');
    toast('Video loaded','success');
    setTimeout(function(){if(preview)preview.scrollIntoView({behavior:'smooth',block:'start'});},200);
  }catch(e){toast(e.message||'Failed','error');}
  finally{
    fetchBtn.disabled=false;
    fetchBtn.innerHTML='<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><span>Fetch Video</span>';
  }
});

function buildQualities(list){
  if(!qualityList)return;
  qualityList.innerHTML='';
  var total=(list.length||0)+1;
  if(qualityCount)qualityCount.textContent=total+' option'+(total!==1?'s':'');
  selectedQuality={formatId:'best',height:'best'};
  qualityList.appendChild(makeQuality({height:'best',formatId:'best',label:'Best Available',badge:{text:'Auto',color:'blue'},fps:0,filesize:0},true));
  list.forEach(function(q){qualityList.appendChild(makeQuality(q,false));});
  if(!list.length){
    var f=document.createElement('div');
    f.style.cssText='text-align:center;padding:12px;font-size:12px;color:var(--text-3)';
    f.textContent='Using best available quality';
    qualityList.appendChild(f);
  }
}

function makeQuality(q,isBest){
  var el=document.createElement('button');
  el.type='button';
  el.className='q'+(isBest?' active':'');
  el.dataset.formatId=q.formatId||'best';
  el.dataset.height=String(q.height);
  var res=document.createElement('div');
  res.className='q-res';
  res.textContent=q.height==='best'?'★':q.height;
  var info=document.createElement('div');
  info.className='q-info';
  var name=document.createElement('div');
  name.className='q-name';
  name.textContent=isBest?'Best Available':(q.label||'Unknown');
  if(q.badge){
    var b=document.createElement('span');
    var bText=typeof q.badge==='string'?q.badge:q.badge.text;
    var color=typeof q.badge==='object'?q.badge.color:'blue';
    b.className='q-tag '+color;
    b.textContent=bText;
    name.appendChild(document.createTextNode(' '));
    name.appendChild(b);
  }
  var meta=document.createElement('div');
  meta.className='q-meta';
  var parts=[];
  parts.push(q.height==='best'?'auto':q.height+'p');
  if(q.fps>=50)parts.push(q.fps+'fps');
  if(q.filesize>0)parts.push(formatBytes(q.filesize));
  meta.textContent=parts.join(' · ');
  info.appendChild(name);info.appendChild(meta);
  var check=document.createElement('div');
  check.className='q-check';
  check.innerHTML='<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
  el.appendChild(res);el.appendChild(info);el.appendChild(check);
  return el;
}

if(qualityList)qualityList.addEventListener('click',function(e){
  var item=e.target.closest('.q');
  if(!item)return;
  qualityList.querySelectorAll('.q').forEach(function(c){c.classList.remove('active');});
  item.classList.add('active');
  selectedQuality={formatId:item.dataset.formatId||'best',height:item.dataset.height||'best'};
  if(navigator.vibrate)try{navigator.vibrate(8);}catch(err){}
});

function formatBytes(bytes){
  if(!bytes||bytes<=0)return '';
  var units=['B','KB','MB','GB'],i=0,v=Number(bytes);
  while(v>=1024&&i<units.length-1){v/=1024;i++;}
  return v.toFixed(v<10?1:0)+units[i];
}

if(downloadBtn)downloadBtn.addEventListener('click',async function(){
  if(!currentUrl)return toast('Fetch a video first','warn');
  if(progress){progress.classList.add('show');progress.classList.remove('success');}
  if(barFill)barFill.style.width='0%';
  if(pctNum)pctNum.textContent='0';
  if(statSpeed)statSpeed.textContent='—';
  if(statEta)statEta.textContent='—';
  if(statSize)statSize.textContent='—';
  if(statusText)statusText.textContent='Preparing…';
  if(subText)subText.textContent='Initializing download';
  downloadBtn.disabled=true;
  downloadBtn.innerHTML='<svg class="spin" viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg><span>Downloading…</span>';
  setTimeout(function(){if(progress)progress.scrollIntoView({behavior:'smooth',block:'center'});},200);
  if(pollTimer){clearInterval(pollTimer);pollTimer=null;}
  try{
    var res=await fetch('/api/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:currentUrl,format:currentFormat,formatId:currentFormat==='mp3'?'':(selectedQuality.formatId||'best'),quality:currentFormat==='mp3'?'best':(selectedQuality.height||'best')})});
    var data=await res.json();
    if(!res.ok)throw new Error(data.error||'Could not start');
    var jobId=data.jobId;var fails=0;
    pollTimer=setInterval(async function(){
      try{
        var r=await fetch('/api/status/'+jobId+'?_='+Date.now());
        fails=0;
        if(!r.ok){clearInterval(pollTimer);pollTimer=null;resetDownloadBtn();if(statusText)statusText.textContent='Failed';if(subText)subText.textContent='Job expired';toast('Job lost','error');return;}
        var st=await r.json();
        updateProgressUI(st);
      }catch(err){
        fails++;
        if(fails>15){clearInterval(pollTimer);pollTimer=null;resetDownloadBtn();if(statusText)statusText.textContent='Connection lost';if(subText)subText.textContent='Check server';toast('Server not responding','error');}
      }
    },1000);
  }catch(e){resetDownloadBtn();if(statusText)statusText.textContent='Failed';if(subText)subText.textContent=e.message;toast(e.message,'error');}
});

function updateProgressUI(d){
  if(d.status==='starting'){
    if(statusText)statusText.textContent='Connecting…';
    if(subText)subText.textContent='Establishing link to source';
  }else if(d.status==='downloading'){
    var p=Math.max(0,Math.min(100,d.progress||0));
    if(barFill)barFill.style.width=p+'%';
    if(pctNum)pctNum.textContent=Math.floor(p);
    if(statusText)statusText.textContent='Downloading…';
    if(subText)subText.textContent=p.toFixed(1)+'% complete';
    if(statSpeed)statSpeed.textContent=d.speed||'—';
    if(statEta)statEta.textContent=d.eta||'—';
    if(statSize)statSize.textContent=d.totalSize||'—';
  }else if(d.status==='merging'){
    if(barFill)barFill.style.width='99%';
    if(pctNum)pctNum.textContent='99';
    if(statusText)statusText.textContent='Processing…';
    if(subText)subText.textContent='Merging audio and video';
  }else if(d.status==='completed'){
    if(pollTimer){clearInterval(pollTimer);pollTimer=null;}
    if(barFill)barFill.style.width='100%';
    if(pctNum)pctNum.textContent='100';
    if(statusText)statusText.textContent='Complete';
    if(subText)subText.textContent='Saving to your device';
    if(progress)progress.classList.add('success');
    if(statSpeed)statSpeed.textContent='✓';
    if(statEta)statEta.textContent='Done';
    saveHistoryItem({
      title:title?title.textContent:'Untitled',
      thumbnail:thumbnail?thumbnail.src:'',
      url:currentUrl,
      platform:currentPlatform,
      quality:selectedQuality.height||'best',
      format:currentFormat,
      time:Date.now()
    });
    var a=document.createElement('a');
    a.href='/api/file/'+encodeURIComponent(d.file);
    a.download=d.file;a.style.display='none';
    document.body.appendChild(a);a.click();
    setTimeout(function(){a.remove();},100);
    resetDownloadBtn();
    toast('Download complete','success');
    setTimeout(function(){if(progress)progress.classList.remove('show');},5000);
  }else if(d.status==='error'){
    if(pollTimer){clearInterval(pollTimer);pollTimer=null;}
    if(statusText)statusText.textContent='Failed';
    if(subText)subText.textContent=d.error||'Try again';
    resetDownloadBtn();
    toast(d.error||'Download failed','error');
  }
}

function resetDownloadBtn(){
  if(!downloadBtn)return;
  downloadBtn.disabled=false;
  downloadBtn.innerHTML='<svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>Download Now</span>';
}

function getHistoryList(){
  try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');}catch(e){return [];}
}

function saveHistoryItem(item){
  try{
    var list=getHistoryList();
    list.unshift(item);
    if(list.length>30)list.length=30;
    localStorage.setItem(HISTORY_KEY,JSON.stringify(list));
  }catch(e){}
}

function timeAgo(ts){
  var diff=Math.floor((Date.now()-ts)/1000);
  if(diff<60)return 'just now';
  if(diff<3600)return Math.floor(diff/60)+'m ago';
  if(diff<86400)return Math.floor(diff/3600)+'h ago';
  return Math.floor(diff/86400)+'d ago';
}

function renderHistory(){
  if(!drawerBody)return;
  var list=getHistoryList();
  if(!list.length){
    drawerBody.innerHTML='<div class="drawer-empty"><svg viewBox="0 0 24 24" style="width:40px;height:40px;stroke:var(--text-4);stroke-width:1.5;fill:none;stroke-linecap:round;stroke-linejoin:round;margin-bottom:12px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><p>No downloads yet</p><small>Your recent downloads will appear here</small></div>';
    return;
  }
  drawerBody.innerHTML='';
  list.forEach(function(item){
    var el=document.createElement('button');
    el.type='button';
    el.className='hist-item';
    var thumbHtml=item.thumbnail?'<img src="'+item.thumbnail+'" alt="" onerror="this.style.display=\'none\'">':'';
    el.innerHTML=
      '<div class="hist-thumb">'+thumbHtml+'</div>'+
      '<div class="hist-info">'+
        '<div class="hist-title"></div>'+
        '<div class="hist-meta">'+
          '<span class="pill">'+(item.platform||'video')+'</span>'+
          '<span>'+(item.quality&&item.quality!=='best'?item.quality+'p':'auto')+'</span>'+
          '<span>'+timeAgo(item.time||Date.now())+'</span>'+
        '</div>'+
      '</div>';
    el.querySelector('.hist-title').textContent=item.title||'Untitled';
    el.addEventListener('click',function(){
      if(item.url&&urlInput){
        urlInput.value=item.url;
        urlInput.dispatchEvent(new Event('input'));
        closeHistoryDrawer();
        toast('Link restored','success');
      }
    });
    drawerBody.appendChild(el);
  });
}

function openHistoryDrawer(){
  if(!historyDrawer)return;
  renderHistory();
  historyDrawer.classList.add('open');
  if(drawerOverlay)drawerOverlay.classList.add('open');
  document.body.classList.add('no-scroll');
}

function closeHistoryDrawer(){
  if(!historyDrawer)return;
  historyDrawer.classList.remove('open');
  if(drawerOverlay)drawerOverlay.classList.remove('open');
  document.body.classList.remove('no-scroll');
}

if(historyBtn)historyBtn.addEventListener('click',openHistoryDrawer);
if(closeDrawer)closeDrawer.addEventListener('click',closeHistoryDrawer);
if(drawerOverlay)drawerOverlay.addEventListener('click',closeHistoryDrawer);

document.querySelectorAll('.faq-q').forEach(function(btn){
  btn.addEventListener('click',function(){
    var item=btn.parentElement;
    var isOpen=item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(function(i){i.classList.remove('open');});
    if(!isOpen)item.classList.add('open');
  });
});

var commands=[
  {title:'Focus input',hint:'/',icon:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',action:function(){if(urlInput){urlInput.focus();urlInput.scrollIntoView({behavior:'smooth',block:'center'});}}},
  {title:'Clear input',hint:'Esc',icon:'<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',action:function(){if(urlInput){urlInput.value='';urlInput.dispatchEvent(new Event('input'));urlInput.focus();}}},
  {title:'Fetch video',hint:'Enter',icon:'<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',action:function(){if(fetchBtn)fetchBtn.click();}},
  {title:'Start download',hint:'D',icon:'<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',action:function(){if(downloadBtn&&!downloadBtn.disabled)downloadBtn.click();}},
  {title:'Download history',hint:'H',icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',action:function(){openHistoryDrawer();}},
  {title:'How to Use',icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',action:function(){window.location.href='/how-to-use';}},
  {title:'About Us',icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',action:function(){window.location.href='/about';}},
  {title:'Privacy Policy',icon:'<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',action:function(){window.location.href='/privacy';}},
  {title:'Contact Support',icon:'<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>',action:function(){window.location.href='/contact';}}
];

var paletteIndex=0;var filteredCommands=commands;

function openPalette(){
  if(!palette)return;
  palette.classList.add('open');
  if(paletteInput)paletteInput.value='';
  setTimeout(function(){if(paletteInput)paletteInput.focus();},50);
  filteredCommands=commands;paletteIndex=0;renderPalette();
}
function closePalette(){if(palette)palette.classList.remove('open');}
function renderPalette(){
  if(!paletteList)return;
  paletteList.innerHTML='';
  if(!filteredCommands.length){paletteList.innerHTML='<div class="palette-section" style="padding:20px;text-align:center">No results</div>';return;}
  var sec=document.createElement('div');
  sec.className='palette-section';sec.textContent='Actions';
  paletteList.appendChild(sec);
  filteredCommands.forEach(function(cmd,i){
    var el=document.createElement('button');
    el.type='button';
    el.className='palette-item'+(i===paletteIndex?' selected':'');
    el.innerHTML=cmd.icon+'<span class="title"></span>'+(cmd.hint?'<span class="hint">'+cmd.hint+'</span>':'');
    el.querySelector('.title').textContent=cmd.title;
    el.addEventListener('click',function(){closePalette();cmd.action();});
    paletteList.appendChild(el);
  });
}

if(paletteBtn)paletteBtn.addEventListener('click',openPalette);
if(palette)palette.addEventListener('click',function(e){if(e.target===palette)closePalette();});
if(paletteInput){
  paletteInput.addEventListener('input',function(){
    var q=paletteInput.value.toLowerCase().trim();
    filteredCommands=commands.filter(function(c){return c.title.toLowerCase().indexOf(q)!==-1;});
    paletteIndex=0;renderPalette();
  });
  paletteInput.addEventListener('keydown',function(e){
    if(e.key==='ArrowDown'){e.preventDefault();paletteIndex=Math.min(paletteIndex+1,filteredCommands.length-1);renderPalette();}
    else if(e.key==='ArrowUp'){e.preventDefault();paletteIndex=Math.max(paletteIndex-1,0);renderPalette();}
    else if(e.key==='Enter'){e.preventDefault();if(filteredCommands[paletteIndex]){closePalette();filteredCommands[paletteIndex].action();}}
  });
}

document.addEventListener('keydown',function(e){
  var isTyping=e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA';
  if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();if(palette&&palette.classList.contains('open'))closePalette();else openPalette();return;}
  if(e.key==='Escape'){
    if(palette&&palette.classList.contains('open')){closePalette();return;}
    if(historyDrawer&&historyDrawer.classList.contains('open')){closeHistoryDrawer();return;}
    if(mobileMenu&&mobileMenu.classList.contains('open')){closeMobileMenu();return;}
    if(navDrop&&navDrop.classList.contains('open')){navDrop.classList.remove('open');return;}
    if(isTyping){e.target.blur();return;}
  }
  if(isTyping)return;
  if(e.key==='/'){e.preventDefault();if(urlInput)urlInput.focus();}
  else if(e.key==='?'){e.preventDefault();openPalette();}
  else if(e.key.toLowerCase()==='h'){e.preventDefault();openHistoryDrawer();}
  else if(e.key.toLowerCase()==='d'){e.preventDefault();if(downloadBtn&&!downloadBtn.disabled)downloadBtn.click();}
});

window.__newsletter=function(){toast('Thanks for subscribing!','success');};

function updateYear(){
  var year=new Date().getFullYear();
  document.querySelectorAll('#yearBadge, .year-badge').forEach(function(el){el.textContent=year;});
}
updateYear();
window.addEventListener('focus',updateYear);
document.addEventListener('visibilitychange',function(){if(!document.hidden)updateYear();});

if('serviceWorker' in navigator){
  navigator.serviceWorker.getRegistrations().then(function(regs){regs.forEach(function(r){r.unregister();});}).catch(function(){});
}

updatePlatformIndicator();
console.log('%c✅ Anik Tools loaded (Fluent Design)','color:#0078d4;font-weight:bold;font-size:13px');
