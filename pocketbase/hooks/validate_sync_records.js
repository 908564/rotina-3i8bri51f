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

// Helper para geração criptograficamente segura de código de 6 dígitos numéricos (100000..999999)
function generateSecureSixDigitCode() {
  if (typeof $security !== 'undefined' && typeof $security.randomString === 'function') {
    // Gera string numérica com entropia criptográfica do Go crypto/rand
    const digits = '0123456789'
    return $security.randomString(6, digits)
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const array = new Uint32Array(1)
    crypto.getRandomValues(array)
    // Mapeia para 100000..999999 uniformemente
    const codeNum = 100000 + (array[0] % 900000)
    return String(codeNum)
  }
  // Fallback seguro caso $security.randomString só aceite tamanho
  if (
    typeof $security !== 'undefined' &&
    typeof $security.randomStringWithAlphabet === 'function'
  ) {
    return $security.randomStringWithAlphabet(6, '0123456789')
  }
  const str = $security.randomString(6)
  // Gera hash numérico
  let numStr = ''
  for (let i = 0; i < str.length; i++) {
    numStr += String(str.charCodeAt(i) % 10)
  }
  return numStr.padStart(6, '0').slice(0, 6)
}

// Hook no envio de e-mail de verificação para gerar código de 6 dígitos
onMailerRecordVerificationSend((e) => {
  const emailRaw = (e.record && e.record.email) || e.record.getString('email') || ''
  const email = emailRaw.trim().toLowerCase()

  if (!email) {
    return e.next()
  }

  const now = new Date()
  const nowIso = now.toISOString()
  const window10mAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString()

  // Rate limit no envio/reenvio: máximo 5 reenvios na janela de 10 minutos por e-mail
  try {
    const recentSends = e.app.findRecordsByFilter(
      'verification_codes',
      'email = {:email} && created >= {:window}',
      '-created',
      10,
      0,
      { email, window: window10mAgo },
    )
    if (recentSends && recentSends.length >= 5) {
      throw new BadRequestError(
        'Muitas solicitações de verificação. Aguarde alguns minutos antes de tentar novamente.',
      )
    }
  } catch (err) {
    if (err instanceof BadRequestError) {
      throw err
    }
  }

  // Gera código aleatório criptograficamente forte de 6 dígitos
  const code = generateSecureSixDigitCode()
  // Validade de 10 minutos
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString()

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

  // A1 e A2: Usar transação atômica ($app.runInTransaction) para evitar condições de corrida (incremento/verificação)
  // e rate limiting por email/janela.
  // A2: Nunca revelar se e-mail existe ou já está verificado na mensagem ou status — retornar genericInvalidError().
  let verifiedSuccess = false

  e.app.runInTransaction((txApp) => {
    // 1. Localiza usuário. Se não existir, erro genérico.
    let userRecord
    try {
      userRecord = txApp.findAuthRecordByEmail('_pb_users_auth_', email)
    } catch (_) {
      throw genericInvalidError()
    }

    // 2. A2: Se já estiver verificado, não vazar estado — responder exatamente o mesmo erro genérico.
    if (userRecord.getBool('verified')) {
      throw genericInvalidError()
    }

    const now = new Date()
    const nowIso = now.toISOString()
    const window10mAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString()

    // 3. A1: Rate limiting e contador acumulado de tentativas por janela de 10 minutos
    // Soma todas as tentativas de códigos gerados na janela recente para evitar que pedir novo código resete tentativas.
    const recentRecords = txApp.findRecordsByFilter(
      'verification_codes',
      'email = {:email} && created >= {:window}',
      '-created',
      20,
      0,
      { email, window: window10mAgo },
    )

    if (!recentRecords || recentRecords.length === 0) {
      throw genericInvalidError()
    }

    let totalWindowAttempts = 0
    for (const r of recentRecords) {
      totalWindowAttempts += r.getInt('attempts') || 0
    }

    if (totalWindowAttempts >= 10) {
      throw new BadRequestError(
        'Limite de tentativas excedido. Solicite um novo código após alguns minutos.',
      )
    }

    // 4. Pega o código ativo mais recente não consumido
    const activeRecord = recentRecords.find((r) => !r.getBool('consumed'))
    if (!activeRecord) {
      throw genericInvalidError()
    }

    const currentAttempts = activeRecord.getInt('attempts') || 0
    const expiresAt = activeRecord.getString('expiresAt')

    // Limite de 5 tentativas por código individual
    if (currentAttempts >= 5) {
      activeRecord.set('consumed', true)
      txApp.save(activeRecord)
      throw new BadRequestError('Limite de tentativas excedido. Solicite um novo código.')
    }

    // Verifica expiração
    if (expiresAt && expiresAt < nowIso) {
      activeRecord.set('consumed', true)
      txApp.save(activeRecord)
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
      txApp.save(activeRecord)

      if (nextAttempts >= 5 || totalWindowAttempts + 1 >= 10) {
        throw new BadRequestError('Limite de tentativas excedido. Solicite um novo código.')
      }
      throw genericInvalidError()
    }

    // Código correto: consome o código e marca todos os códigos anteriores como consumidos
    activeRecord.set('consumed', true)
    txApp.save(activeRecord)

    for (const r of recentRecords) {
      if (r.id !== activeRecord.id && !r.getBool('consumed')) {
        r.set('consumed', true)
        txApp.save(r)
      }
    }

    userRecord.setVerified(true)
    txApp.save(userRecord)
    verifiedSuccess = true
  })

  return e.json(200, {
    success: true,
    verified: true,
    message: 'E-mail verificado com sucesso.',
  })
})
