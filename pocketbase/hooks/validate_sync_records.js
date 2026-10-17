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
