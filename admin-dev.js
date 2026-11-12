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
  async function sendAction(action){
    if(!db)return;
    const input=$('admin-dev-email');
    if(!input.reportValidity())return;
    const email=input.value.trim().toLowerCase();
    if(action==='rotate'&&!window.confirm(
      'Reemitir uma senha para '+email+'? A senha anterior deixará de funcionar.'
    ))return;

    $('admin-dev-submit').disabled=true;
    $('admin-dev-rotate').disabled=true;
    status(action==='rotate'?'Reemitindo senha...':'Criando acesso...');
    $('admin-dev-created').hidden=true;
    oneTime='';$('admin-dev-credentials').textContent='';
    try{
      const {data,error}=await db.functions.invoke('wwsolar-create-customer',{body:{email,action}});
      if(error){
        const httpStatus=Number(error.context?.status||0);
        if(httpStatus===404)throw new Error('Cliente não encontrado ou inativo. Verifique o e-mail cadastrado.');
        if(httpStatus===409)throw new Error(
          action==='rotate'?'Não foi possível confirmar a conta existente. Entre em contato com o suporte.':
          'Este e-mail já pode possuir um cadastro. Use Reemitir senha, se for seu cliente.'
        );
        if(httpStatus===401||httpStatus===403)throw new Error('Sessão administrativa não autorizada. Faça login novamente.');
        if(httpStatus>=500)throw new Error('Falha técnica na operação. A alteração não foi confirmada; procure o suporte.');
        throw new Error('Não foi possível completar a operação. Confira o e-mail e a conexão.');
      }
      if(!data?.email||!data?.password||data?.action!==(action==='rotate'?'rotate':'create'))
        throw new Error('O servidor não confirmou os dados. Não envie credenciais.');

      oneTime='WW Solar — Área do cliente\n'
        +'Acesso: '+new URL('./cliente-dev.html',window.location.href).href+'\n'
        +'E-mail: '+data.email+'\nSenha: '+data.password+'\n'
        +'Guarde esta mensagem em local seguro.';
      $('admin-dev-credentials').textContent=oneTime;
      $('admin-dev-created').hidden=false;
      input.value='';
      status(action==='rotate'
        ?'Senha reemitida. A anterior não funciona mais. Copie e envie a nova ao cliente.'
        :'Acesso criado. Copie as credenciais e encaminhe ao cliente.');
    }catch(e){status(e?.message||'Não foi possível confirmar a operação.');}
    finally{$('admin-dev-submit').disabled=false;$('admin-dev-rotate').disabled=false;}
  }
  $('admin-dev-form').addEventListener('submit',ev=>{
    ev.preventDefault();
    void sendAction('create');
  });
  $('admin-dev-rotate').addEventListener('click',()=>{void sendAction('rotate');});
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