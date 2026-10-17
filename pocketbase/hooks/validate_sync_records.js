// Hook para validar o tamanho máximo de 1 MB no campo json 'data' de 'sync_records'
onRecordCreate((e) => {
  const dataRaw = e.record.getString('data')
  if (dataRaw && dataRaw.length > 1048576) {
    throw new BadRequestError('O campo data não pode exceder 1 MB.')
  }
  return e.next()
}, 'sync_records')

onRecordUpdate((e) => {
  const dataRaw = e.record.getString('data')
  if (dataRaw && dataRaw.length > 1048576) {
    throw new BadRequestError('O campo data não pode exceder 1 MB.')
  }
  return e.next()
}, 'sync_records')

// Hook para normalizar e-mail de convites
onRecordCreate((e) => {
  const emailRaw = e.record.getString('email') || ''
  e.record.set('email', emailRaw.trim().toLowerCase())
  return e.next()
}, 'invites')

onRecordUpdate((e) => {
  const emailRaw = e.record.getString('email') || ''
  e.record.set('email', emailRaw.trim().toLowerCase())
  return e.next()
}, 'invites')

// Hook para interceptar cadastro de usuário e exigir convite válido
onRecordCreateRequest((e) => {
  if (e.hasSuperuserAuth()) {
    return e.next()
  }

  const rawEmail = e.record.getString('email') || ''
  const normalizedEmail = rawEmail.trim().toLowerCase()
  e.record.set('email', normalizedEmail)

  if (!normalizedEmail) {
    throw new BadRequestError('E-mail é obrigatório.')
  }

  const matchingInvites = e.app.findRecordsByFilter('invites', 'email = {:email}', '', 1, 0, {
    email: normalizedEmail,
  })

  if (matchingInvites.length === 0) {
    throw new ForbiddenError('Cadastro disponível apenas para convidados no momento.', {
      invite: new ValidationError(
        'invite_required',
        'Cadastro disponível apenas para convidados no momento.',
      ),
    })
  }

  return e.next()
}, 'users')

// Hook no envio de e-mail de verificação para gerar código de 6 dígitos
onMailerRecordVerificationSend((e) => {
  const emailRaw = (e.record && e.record.email) || e.record.getString('email') || ''
  const email = emailRaw.trim().toLowerCase()

  if (!email) {
    return e.next()
  }

  // Gera código aleatório de 6 dígitos numéricos (100000..999999)
  const code = String(Math.floor(100000 + Math.random() * 900000))
  // Validade de 10 minutos
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  try {
    const col = e.app.findCollectionByNameOrId('verification_codes')
    const rec = new Record(col)
    rec.set('email', email)
    rec.set('code', code)
    rec.set('expiresAt', expiresAt)
    rec.set('attempts', 0)
    rec.set('consumed', false)
    e.app.save(rec)
  } catch (err) {
    // Falha silenciosa no armazenamento não impede o envio do e-mail do PB
  }

  // Substitui placeholder {VERIFICATION_CODE} ou injeta no corpo se ausente
  if (e.message) {
    const codeNotice =
      '<p style="margin: 16px 0; padding: 12px; background: #F6F3EE; border-radius: 8px; font-family: sans-serif; font-size: 14px;">' +
      'Código para confirmar no app: <strong style="font-size: 20px; letter-spacing: 4px; color: #B4540F;">' +
      code +
      '</strong><br><small style="color: #6B645C;">Válido por 10 minutos.</small></p>'

    if (e.message.html && e.message.html.indexOf('{VERIFICATION_CODE}') !== -1) {
      e.message.html = e.message.html.split('{VERIFICATION_CODE}').join(code)
    } else if (e.message.html) {
      e.message.html = e.message.html + codeNotice
    }

    if (e.message.text && e.message.text.indexOf('{VERIFICATION_CODE}') !== -1) {
      e.message.text = e.message.text.split('{VERIFICATION_CODE}').join(code)
    } else if (e.message.text) {
      e.message.text =
        e.message.text + '\nCódigo para confirmar no app: ' + code + ' (válido por 10 min)'
    }
  }

  return e.next()
})

// Endpoint customizado para validar o código de 6 dígitos: POST /backend/v1/rotina/verificar-codigo
routerAdd('POST', '/backend/v1/rotina/verificar-codigo', (e) => {
  let emailRaw = ''
  let codeRaw = ''

  try {
    const reqInfo = e.requestInfo()
    if (reqInfo && reqInfo.body) {
      emailRaw = reqInfo.body.email || ''
      codeRaw = reqInfo.body.code || ''
    }
  } catch (_) {}

  if (!emailRaw || !codeRaw) {
    try {
      const data = new DynamicModel({ email: '', code: '' })
      e.bindBody(data)
      emailRaw = data.email || emailRaw
      codeRaw = data.code || codeRaw
    } catch (_) {}
  }

  const email = String(emailRaw).trim().toLowerCase()
  const code = String(codeRaw).trim()

  const genericInvalidError = () =>
    new BadRequestError('Código de verificação inválido ou expirado.')

  if (!email || !code || code.length !== 6) {
    throw genericInvalidError()
  }

  // Verifica se o usuário existe e se já está verificado
  let userRecord
  try {
    userRecord = e.app.findAuthRecordByEmail('_pb_users_auth_', email)
  } catch (_) {
    // Para não vazar existência de terceiros, retorna mensagem genérica
    throw genericInvalidError()
  }

  if (userRecord.getBool('verified')) {
    return e.json(200, {
      success: true,
      verified: true,
      message: 'E-mail já verificado.',
    })
  }

  // Busca os códigos mais recentes para este e-mail
  const nowIso = new Date().toISOString()
  const records = e.app.findRecordsByFilter(
    'verification_codes',
    'email = {:email}',
    '-created',
    5,
    0,
    { email },
  )

  if (!records || records.length === 0) {
    throw genericInvalidError()
  }

  // Pega o código ativo mais recente não consumido
  const activeRecord = records.find((r) => !r.getBool('consumed'))
  if (!activeRecord) {
    throw genericInvalidError()
  }

  const currentAttempts = activeRecord.getInt('attempts') || 0
  const expiresAt = activeRecord.getString('expiresAt')

  // Limite de 5 tentativas por código
  if (currentAttempts >= 5) {
    activeRecord.set('consumed', true)
    e.app.save(activeRecord)
    throw new BadRequestError('Limite de tentativas excedido. Solicite um novo código.')
  }

  // Verifica expiração
  if (expiresAt && expiresAt < nowIso) {
    activeRecord.set('consumed', true)
    e.app.save(activeRecord)
    throw genericInvalidError()
  }

  // Verifica correspondência do código
  const storedCode = activeRecord.getString('code')
  if (storedCode !== code) {
    const nextAttempts = currentAttempts + 1
    activeRecord.set('attempts', nextAttempts)
    if (nextAttempts >= 5) {
      activeRecord.set('consumed', true)
    }
    e.app.save(activeRecord)

    if (nextAttempts >= 5) {
      throw new BadRequestError('Limite de tentativas excedido. Solicite um novo código.')
    }
    throw genericInvalidError()
  }

  // Código correto: marca código como consumido e usuário como verificado
  activeRecord.set('consumed', true)
  e.app.save(activeRecord)

  userRecord.setVerified(true)
  e.app.save(userRecord)

  return e.json(200, {
    success: true,
    verified: true,
    message: 'E-mail verificado com sucesso.',
  })
})
