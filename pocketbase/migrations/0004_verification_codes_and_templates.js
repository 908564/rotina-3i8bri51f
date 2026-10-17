migrate(
  (app) => {
    // 1. Criar coleção 'verification_codes'
    let verificationCodes
    try {
      verificationCodes = app.findCollectionByNameOrId('verification_codes')
    } catch (_) {
      verificationCodes = new Collection({
        name: 'verification_codes',
        type: 'base',
        // Sem acesso público: manipulado apenas internamente por hooks/servidor
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'email', type: 'email', required: true },
          { name: 'code', type: 'text', required: true },
          { name: 'expiresAt', type: 'date', required: true },
          { name: 'attempts', type: 'number', required: false },
          { name: 'consumed', type: 'bool', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_verification_codes_email ON verification_codes (email)',
          'CREATE INDEX idx_verification_codes_expires ON verification_codes (expiresAt)',
        ],
      })
      app.save(verificationCodes)
    }

    // 2. Atualizar templates de e-mail na coleção '_pb_users_auth_'
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const siteUrlRaw = $os.getenv('SITE_URL') || ''
    const defaultAppUrl = 'https://rotina-2dcbb.goskip.app'
    const appUrl = siteUrlRaw.trim().replace(/\/+$/, '') || defaultAppUrl

    if (users.resetPasswordTemplate) {
      users.resetPasswordTemplate.actionUrl = `${appUrl}/redefinir-senha?token={TOKEN}`
      users.resetPasswordTemplate.subject = 'Redefinição de senha — Rotina'
      users.resetPasswordTemplate.body =
        '<p>Olá,</p>' +
        '<p>Recebemos uma solicitação para redefinir a senha da sua conta no Rotina.</p>' +
        '<p><a class="btn" href="{ACTION_URL}" target="_blank" rel="noopener">Clique aqui para criar uma nova senha</a></p>' +
        '<p>Se você não solicitou a redefinição de senha, desconsidere esta mensagem com segurança.</p>' +
        '<p>Atenciosamente,<br>Equipe Rotina</p>'
    }

    if (users.verificationTemplate) {
      users.verificationTemplate.actionUrl = `${appUrl}/confirmar-email?token={TOKEN}`
      users.verificationTemplate.subject = 'Confirme seu cadastro no Rotina'
      users.verificationTemplate.body =
        '<p>Olá,</p>' +
        '<p>Obrigado por criar sua conta no <strong>Rotina</strong>.</p>' +
        '<p>Para confirmar seu e-mail e ativar a sincronização na nuvem, você pode:</p>' +
        '<p><a class="btn" href="{ACTION_URL}" target="_blank" rel="noopener">Confirmar pelo link</a></p>' +
        '<p>Ou, se preferir, use este código de 6 dígitos direto no app: <strong>{VERIFICATION_CODE}</strong> (válido por 10 minutos).</p>' +
        '<p>Se você não solicitou este cadastro, pode ignorar este e-mail.</p>' +
        '<p>Atenciosamente,<br>Equipe Rotina</p>'
    }

    app.save(users)
  },
  (app) => {
    try {
      const verificationCodes = app.findCollectionByNameOrId('verification_codes')
      app.delete(verificationCodes)
    } catch (_) {}
  },
)
