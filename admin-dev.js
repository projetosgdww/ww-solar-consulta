(() => {
  'use strict';
  const $=id=>document.getElementById(id),cfg=window.WWSOLAR_CLIENTE_CONFIG||{};
  let db=null,oneTime='';
  const status=m=>{$('admin-dev-status').textContent=m;};
  async function init(){
    if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.supabaseUrl||'')
       ||!cfg.publishableKey||!window.supabase?.createClient){
      status('Administração DEV não configurada. Nenhuma conta foi criada.');return;
    }
    db=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey);
    const {data,error}=await db.auth.getUser();
    if(error||data?.user?.app_metadata?.wwsolar_role!=='admin'){
      status('Acesso restrito ao administrador. Faça login na área do cliente com sua conta administrativa.');return;
    }
    $('admin-dev-form').hidden=false;
    status('Administrador autenticado. Informe o e-mail para liberar um acesso.');
  }
  $('admin-dev-form').addEventListener('submit',async ev=>{
    ev.preventDefault();if(!db)return;
    const email=$('admin-dev-email').value.trim().toLowerCase();
    $('admin-dev-submit').disabled=true;status('Criando acesso...');
    $('admin-dev-created').hidden=true;oneTime='';
    try{
      const {data,error}=await db.functions.invoke('wwsolar-create-customer',{body:{email}});
      if(error){
        const httpStatus=Number(error.context?.status||0);
        if(httpStatus===409)throw new Error('Não foi possível criar este acesso. Confirme se o e-mail já possui cadastro.');
        if(httpStatus===401||httpStatus===403)throw new Error('Sua sessão administrativa não foi autorizada. Faça login novamente.');
        if(httpStatus>=500)throw new Error('Falha técnica no servidor de cadastro. Nenhum acesso foi confirmado; tente novamente ou informe o suporte.');
        throw new Error('Não foi possível concluir o cadastro. Confira o e-mail e tente novamente.');
      }
      if(!data?.email||!data?.password)throw new Error('O servidor não confirmou a criação. Não envie credenciais.');

      oneTime='WW Solar — Área do cliente\n'
        +'Acesso: '+new URL('./cliente-dev.html',window.location.href).href+'\n'
        +'E-mail: '+data.email+'\nSenha: '+data.password+'\n'
        +'Guarde esta mensagem em local seguro.';
      $('admin-dev-credentials').textContent=oneTime;
      $('admin-dev-created').hidden=false;
      $('admin-dev-form').reset();
      status('Acesso criado. Copie as credenciais e encaminhe ao cliente.');
    }catch(e){status(e?.message||'Não foi possível confirmar o cadastro.');}
    finally{$('admin-dev-submit').disabled=false;}
  });
  $('admin-dev-copy').addEventListener('click',async()=>{
    if(!oneTime)return;
    try{await navigator.clipboard.writeText(oneTime);status('Credenciais copiadas.');}
    catch(e){status('Selecione e copie o texto apresentado.');}
  });
  $('admin-dev-clear').addEventListener('click',()=>{
    oneTime='';$('admin-dev-credentials').textContent='';
    $('admin-dev-created').hidden=true;status('Credenciais retiradas da tela.');
  });
  init();
})();