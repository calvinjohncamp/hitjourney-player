(() => {
  'use strict';
  const core=window.HJHeaderLogo,editor=document.getElementById('hjLogoEditor');
  if(!core || !editor) return;
  const find=id=>editor.querySelector('#'+id);
  let draft={...core.defaults},saved={...draft},rowId=null,loaded=false,busy=false,file=null,blob=null,imageLoading=false,imageRevision=0;
  const view=core.create(find('hjLogoPreview'),draft,{preview:true});
  const status=find('hjLogoStatus'),save=find('hjLogoSave'),reset=find('hjLogoReset');
  function message(text,error=false){status.textContent=text;status.dataset.error=String(error);}
  function dirty(){return !!file||JSON.stringify(draft)!==JSON.stringify(saved);}
  function buttons(){save.disabled=busy||imageLoading||!loaded||!dirty()||!core.hex(find('hjLogoHex').value);reset.disabled=busy||!loaded;}
  function render(sync=true){
    view.update(draft);
    if(sync) {
      for(const field of ['width','rotation']) {
        find('hjLogo'+field).value=draft[field];find('hjLogo'+field+'Number').value=draft[field];
      }
      find('hjLogoDjAlign').value=draft.djAlign;find('hjLogoWavesAlign').value=draft.wavesAlign;
      find('hjLogoHex').value=draft.color;find('hjLogoColor').value=draft.color;
      find('hjLogoHex').removeAttribute('aria-invalid');
    }
    buttons();
  }
  function changed(){render();message('Ungespeicherte Änderungen');}
  for(const field of ['width','rotation']) {
    for(const suffix of ['','Number']) find('hjLogo'+field+suffix).addEventListener(suffix?'change':'input',event=>{
      if(event.target.value==='') return;
      draft=core.normalize({...draft,[field]:Number(event.target.value)});changed();
    });
  }
  for(const [id,field] of [['hjLogoDjAlign','djAlign'],['hjLogoWavesAlign','wavesAlign']])find(id).addEventListener('change',event=>{draft[field]=event.target.value;changed();});
  find('hjLogoHex').addEventListener('input',event=>{
    const value=event.target.value.trim();
    const valid=core.hex(value);
    event.target.setAttribute('aria-invalid',String(!valid));
    if(valid){draft.color=value.toUpperCase();find('hjLogoColor').value=draft.color;view.update(draft);message('Ungespeicherte Änderungen');}
    else message('HEX-Farbe bitte als #RRGGBB eingeben.',true);
    buttons();
  });
  find('hjLogoColor').addEventListener('input',event=>{draft.color=event.target.value.toUpperCase();changed();});
  const pipette=find('hjLogoPipette');
  pipette.disabled=!window.EyeDropper;
  if(!window.EyeDropper) find('hjLogoPipetteHint').textContent='Bildschirm-Pipette hier nicht verfügbar. Bitte HEX oder den Farbwähler verwenden.';
  pipette.addEventListener('click',async()=>{
    try {const result=await new EyeDropper().open();draft.color=result.sRGBHex.toUpperCase();changed();}
    catch(error){if(error.name!=='AbortError') message('Pipette konnte nicht geöffnet werden. Bitte HEX verwenden.',true);}
  });
  find('hjLogoFile').addEventListener('change',async event=>{
    const chosen=event.target.files[0];event.target.value='';if(!chosen)return;
    if(!['image/png','image/webp'].includes(chosen.type)||chosen.size>8*1024*1024){message('Bitte PNG oder WebP bis 8 MB verwenden.',true);return;}
    const revision=++imageRevision;imageLoading=true;buttons();message('Bild wird geladen …');
    const url=URL.createObjectURL(chosen);
    try {
      const img=new Image();img.src=url;await img.decode();
      if(revision!==imageRevision){URL.revokeObjectURL(url);return;}
      const ratio=img.naturalWidth/img.naturalHeight;
      if(ratio<.1||ratio>20) throw new Error('Seitenverhältnis muss zwischen 1:10 und 20:1 liegen.');
      if(blob)URL.revokeObjectURL(blob);
      blob=url;file=chosen;draft=core.normalize({...draft,src:url,ratio});changed();
    }catch(error){URL.revokeObjectURL(url);if(revision===imageRevision)message(error.message||'Bild konnte nicht gelesen werden.',true);}
    finally{if(revision===imageRevision){imageLoading=false;buttons();}}
  });
  reset.addEventListener('click',()=>{
    imageRevision++;imageLoading=false;
    if(blob)URL.revokeObjectURL(blob);blob=null;file=null;draft={...saved};render();message('Gespeicherter Stand');
  });
  save.addEventListener('click',async()=>{
    if(busy||imageLoading||!loaded||!core.hex(find('hjLogoHex').value))return;
    busy=true;editor.querySelector('fieldset').disabled=true;buttons();message('Wird gespeichert …');
    try {
      if(file){
        draft.src=await uploadToS3(file,'artwork/header-logo/'+Date.now()+'-'+crypto.randomUUID()+'.'+(file.type==='image/webp'?'webp':'png'));
        file=null;view.update(draft);
      }
      const current=await core.read();
      rowId=current.id;
      const body={row_order:-7,caption:'__header_logo__',cells:[core.normalize(draft)]};
      const route=rowId?'?id=eq.'+encodeURIComponent(rowId)+'&row_order=eq.-7':'';
      const response=await fetch(sbUrl('/rest/v1/home_layout'+route),{method:rowId?'PATCH':'POST',headers:hdrs(),body:JSON.stringify(body)});
      if(!response.ok) throw new Error('Speichern fehlgeschlagen (HTTP '+response.status+').');
      const rows=await response.json();
      if(!rows[0]?.id) throw new Error('Speichern wurde nicht bestätigt. Änderungen bleiben erhalten.');
      rowId=rows[0].id;
      const verified=await core.read();
      if(JSON.stringify(verified.config)!==JSON.stringify(core.normalize(draft))) throw new Error('Gespeicherter Stand konnte nicht bestätigt werden. Bitte erneut speichern.');
      saved={...draft};
      if(blob)URL.revokeObjectURL(blob);blob=null;
      try{localStorage.setItem('hj-header-logo-saved',String(Date.now()));}catch(_){}
      message('Gespeichert · auf der Website aktiv');
    }catch(error){message(error.message,true);}
    finally{busy=false;editor.querySelector('fieldset').disabled=false;render();}
  });
  window.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue='';}});
  render();message('Logo wird geladen …');
  core.read().then(result=>{const edited=dirty();rowId=result.id;saved={...result.config};loaded=true;if(!edited)draft={...saved};render();message(dirty()?'Ungespeicherte Änderungen':'Gespeicherter Stand');})
    .catch(error=>{message(error.message+' Bitte Seite neu laden.',true);buttons();});
})();
