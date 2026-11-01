(() => {
  'use strict';
  const defaults = {type:'headerLogo',src:'/assets/mr-dj-logo.png',color:'#85ACC9',width:104,rotation:0,ratio:5079/1129,djAlign:'center',wavesAlign:'center'};
  const hex = value => /^#[\da-f]{6}$/i.test(value);
  function source(value) {
    try {
      const url=new URL(value,location.href);
      return ['https:','http:','blob:'].includes(url.protocol) ? value : defaults.src;
    } catch (_) {return defaults.src;}
  }
  const clamp=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):fallback;
  const alignment=value=>['top','center','bottom'].includes(value)?value:'center';
  function normalize(value={}) {
    return {type:'headerLogo',src:source(String(value.src||defaults.src)),color:hex(String(value.color))?value.color.toUpperCase():defaults.color,
      width:clamp(value.width,40,240,defaults.width),rotation:clamp(value.rotation,-180,180,0),ratio:clamp(value.ratio,.1,20,defaults.ratio),djAlign:alignment(value.djAlign),wavesAlign:alignment(value.wavesAlign)};
  }
  let count=0;
  function create(header,config,{preview=false}={}) {
    header.classList.add('hj-branding-header');
    const link=document.createElement('a');
    link.className='hj-dj-logo';link.href='/dj.html';link.setAttribute('aria-label','Mr. DJ öffnen');
    const id='hj-dj-tint-'+(++count);
    link.innerHTML='<svg class="hj-dj-logo-defs" aria-hidden="true"><defs><filter id="'+id+'" color-interpolation-filters="sRGB"><feFlood/><feComposite in2="SourceAlpha" operator="in"/></filter></defs></svg><img class="hj-dj-logo-image" alt="" draggable="false">';
    link.querySelector('img').style.filter='url(#'+id+')';
    link.addEventListener('click',event=>{
      event.preventDefault();
      if(preview) return;
      if(window.HJFocus) window.HJFocus.navigate('/dj.html');
      else location.assign('/dj.html');
    });
    header.append(link);
    let current=config,geometry={bh:0};
    const reference=header.querySelector('.hj-branding-left img');
    const waves=header.querySelector('.hj-branding-right img');
    function alignLogos() {
      if(!header.isConnected || !header.clientWidth)return;
      const style=getComputedStyle(header);
      const number=value=>parseFloat(value)||0;
      const referenceRect=reference?.getBoundingClientRect();
      const referenceHeight=referenceRect?.height || number(reference && getComputedStyle(reference).maxHeight) || 32;
      const wavesHeight=waves?.getBoundingClientRect().height || number(waves && getComputedStyle(waves).maxHeight) || 10;
      // Reserve the same space for all alignments. Moving either companion logo
      // must not move HitJourney or change the header height.
      const needed=2*Math.max(geometry.bh,referenceHeight)-referenceHeight+number(style.paddingTop)+number(style.paddingBottom)+number(style.borderBottomWidth);
      header.style.setProperty('--dj-header-height',needed.toFixed(3)+'px');
      const headerRect=header.getBoundingClientRect();
      const referenceTop=referenceRect?.height?reference.getBoundingClientRect().top-headerRect.top-header.clientTop:
        number(style.paddingTop)+(header.clientHeight-number(style.paddingTop)-number(style.paddingBottom)-referenceHeight)/2;
      const factor={top:0,center:.5,bottom:1};
      header.style.setProperty('--dj-logo-top',(referenceTop+(referenceHeight-geometry.bh)*factor[current.djAlign]).toFixed(3)+'px');
      header.style.setProperty('--dj-waves-top',(referenceTop+(referenceHeight-wavesHeight)*factor[current.wavesAlign]).toFixed(3)+'px');
      header.style.setProperty('--dj-waves-right',style.paddingRight);
    }
    let alignmentFrame=0;
    const scheduleAlignment=()=>{cancelAnimationFrame(alignmentFrame);alignmentFrame=requestAnimationFrame(alignLogos);};
    function update(value) {
      const cfg=normalize(value);current=cfg;
      let w=cfg.width*Math.min(1,cfg.ratio),h=w/cfg.ratio;
      const rad=cfg.rotation*Math.PI/180;
      let bw=Math.abs(w*Math.cos(rad))+Math.abs(h*Math.sin(rad));
      let bh=Math.abs(w*Math.sin(rad))+Math.abs(h*Math.cos(rad));
      const scale=Math.min(1,Math.max(1,header.clientWidth-72)/bw);
      w*=scale;h*=scale;bw*=scale;bh*=scale;
      for(const [key,val] of Object.entries({'box-width':bw+'px','box-height':bh+'px',width:w+'px',height:h+'px',angle:cfg.rotation+'deg'})) header.style.setProperty('--dj-logo-'+key,val);
      geometry={bh};
      alignLogos();
      link.querySelector('feFlood').setAttribute('flood-color',cfg.color);
      const img=link.querySelector('img');
      if(img.getAttribute('src')!==cfg.src) img.src=cfg.src;
      return cfg;
    }
    update(config);
    let lastWidth=header.clientWidth;
    const observer=new ResizeObserver(()=>{
      if(header.clientWidth!==lastWidth){lastWidth=header.clientWidth;update(current);}
      else scheduleAlignment();
    });
    observer.observe(header);
    for(const img of [reference,waves])if(img){observer.observe(img);img.addEventListener('load',scheduleAlignment);img.addEventListener('error',scheduleAlignment);}
    return {link,update};
  }
  async function read() {
    const key=typeof SB_KEY==='undefined'?SB_ANON:SB_KEY;
    const res=await fetch(SB_URL+'/rest/v1/home_layout?select=id,cells&row_order=eq.-7&limit=1',{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store'});
    if(!res.ok) throw new Error('Logo konnte nicht geladen werden (HTTP '+res.status+').');
    const rows=await res.json();
    const row=rows[0];
    if(row && row.cells?.[0]?.type!=='headerLogo') throw new Error('Logo-Speicherplatz ist bereits belegt.');
    return {id:row?.id||null,config:normalize(row?.cells?.[0]||defaults)};
  }
  window.HJHeaderLogo={defaults,normalize,hex,create,read};
  const header=document.getElementById('mainHeader');
  if(header) {
    document.getElementById('logoHome')?.classList.add('hj-branding-left');
    document.getElementById('makingWaves')?.classList.add('hj-branding-right');
    const view=create(header,defaults);
    read().then(saved=>view.update(saved.config)).catch(error=>console.warn('[HitJourney Logo]',error.message));
    window.addEventListener('storage',event=>{if(event.key==='hj-header-logo-saved') read().then(saved=>view.update(saved.config)).catch(()=>{});});
    window.addEventListener('focus',()=>read().then(saved=>view.update(saved.config)).catch(()=>{}));
  }
})();
