# WW Solar — e-mails de autenticação
Atualizado em 14/11/2026.

## Infraestrutura existente
- Supabase Auth administra contas, senhas e links de recuperação.
- O SMTP customizado deve usar Resend e o domínio de envio já verificado `auth.wwplatform.com.br`.
- Remetente: `WW Solar <nao-responda@auth.wwplatform.com.br>`.
- URL do catálogo: `https://catalogo.wwplatform.com.br/cliente.html`.

## Recuperação de senha em português
A edição dos e-mails do Supabase **hospedado** é feita no Dashboard, não no Resend:
1. Acesse **Supabase > Authentication > Emails > Templates > Reset Password / Recovery**.
2. Assunto: `WW Solar | Redefina sua senha`.
3. Copie o conteúdo de `docs/email-templates/recuperacao-senha.html` para o editor de corpo HTML.
4. Preserve **exatamente** o campo `href="{{ .ConfirmationURL }}"`: ele contém o link individual criado pelo Supabase.
5. Salve e solicite **um único** novo e-mail de recuperação para testar o assunto, o remetente, o botão, o redirecionamento e a criação de senha.

Não use templates transacionais do Resend em substituição a essa configuração: ao usar SMTP do Supabase, é o Supabase Auth que monta o e-mail e o Resend somente o entrega.

## Rotação da chave SMTP exposta
1. Em **Resend > API Keys**, crie uma nova chave com permissão **Sending access** e limitada a `auth.wwplatform.com.br`.
2. Copie o segredo **diretamente** para **Supabase > Authentication > SMTP > Password**; salve. **Não enviar por chat, não registrar em arquivos nem em repositórios.**
3. Teste o envio e a redefinição de senha usando uma conta controlada.
4. **Somente após confirmar o funcionamento**, revogue a chave antiga chamada `WW Solar - Supabase Auth SMTP`, ID `5db5e12a-3539-420e-93e3-4cb6be5c0a22`, criada em 14/11/2026.
5. Confirme que não houve outros serviços dependentes dessa chave dedicada e verifique os logs de envio.

> Não revogue a chave antes de inserir e validar a substituta. O template e os passos aqui não incluem credenciais. A publicação do arquivo no GitHub **não modifica automaticamente** os templates de produção do Supabase.
