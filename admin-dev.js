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
      if(error||!data?.email||!data?.password)throw Error('Falha');
      oneTime='WW Solar — Área do cliente\n'
        +'Acesso: https://projetosgdww.github.io/ww-solar-consulta/cliente.html\n'
        +'E-mail: '+data.email+'\nSenha: '+data.password+'\n'
        +'Guarde esta mensagem em local seguro.';
      $('admin-dev-credentials').textContent=oneTime;
      $('admin-dev-created').hidden=false;
      $('admin-dev-form').reset();
      status('Acesso criado. Copie as credenciais e encaminhe ao cliente.');
    }catch(e){status('Não foi possível criar o acesso. Verifique se o e-mail já está cadastrado ou contate o suporte.');}
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