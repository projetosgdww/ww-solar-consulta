// Configure apenas em um ambiente Supabase EXCLUSIVO do WW Solar, após homologação.
// URL e publishable key são públicas; NUNCA coloque chaves administrativas nem senhas aqui.
// Projeto não configurado => acesso desabilitado, sem fallback para catálogo público.
window.WWSOLAR_CLIENTE_CONFIG = Object.freeze({
  supabaseUrl: "",
  publishableKey: "",
  whatsapp: "5585992723637"
});
