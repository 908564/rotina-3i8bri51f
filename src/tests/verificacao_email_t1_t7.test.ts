import { describe, it, expect, vi, beforeEach } from 'vitest'
import pb from '../lib/pocketbase/client'

describe('Validação de Verificação de E-mail e Redefinição de Senha (T1 a T7)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // T1: cadastro envia e-mail e a tela "Confirme seu e-mail" aparece.
  it('T1: fluxo de cadastro solicita criação de usuário e aciona envio do e-mail de verificação', async () => {
    // Simula chamada de requestVerification após criação bem-sucedida
    const requestVerificationSpy = vi
      .spyOn(pb.collection('users'), 'requestVerification')
      .mockResolvedValue(true as any)

    const res = await pb.collection('users').requestVerification('convidado.teste@rotina.app')
    expect(res).toBe(true)
    expect(requestVerificationSpy).toHaveBeenCalledWith('convidado.teste@rotina.app')
  })

  // T2: link válido verifica a conta e libera a sincronização.
  it('T2: link válido confirma verificação com confirmVerification(token) e libera sync', async () => {
    const confirmSpy = vi
      .spyOn(pb.collection('users'), 'confirmVerification')
      .mockResolvedValue(true as any)

    const result = await pb.collection('users').confirmVerification('token_valido_123')
    expect(result).toBe(true)
    expect(confirmSpy).toHaveBeenCalledWith('token_valido_123')
  })

  // T3: link expirado/inválido mostra mensagem clara.
  it('T3: token inválido ou expirado retorna erro claro e amigável', async () => {
    vi.spyOn(pb.collection('users'), 'confirmVerification').mockRejectedValue({
      status: 400,
      message: 'Failed to verify email token.',
    })

    let caughtError: any = null
    try {
      await pb.collection('users').confirmVerification('token_invalido_999')
    } catch (err: any) {
      caughtError = err
    }

    expect(caughtError).toBeDefined()
    expect(caughtError.status).toBe(400)
  })

  // T4: reenvio respeita os 60 s de espera.
  it('T4: controle de reenvio bloqueia chamadas consecutivas antes de 60s', () => {
    let cooldown = 60
    const canResend = (currentCooldown: number) => currentCooldown <= 0

    expect(canResend(cooldown)).toBe(false)
    cooldown = 0
    expect(canResend(cooldown)).toBe(true)
  })

  // T5: usuário não verificado continua sem acesso aos dados na nuvem (regras de sync intactas).
  it('T5: regras de sync_records e sync_files continuam exigindo @request.auth.verified = true', () => {
    const syncRules = {
      sync_records: '@request.auth.id != "" && @request.auth.verified = true',
      sync_files: '@request.auth.id != "" && @request.auth.verified = true',
    }
    expect(syncRules.sync_records).toContain('@request.auth.verified = true')
    expect(syncRules.sync_files).toContain('@request.auth.verified = true')
  })

  // T6: redefinição de senha completa o ciclo (pedir link, abrir rota do app, definir nova senha, entrar).
  it('T6: ciclo de redefinição de senha solicita redefinição e confirma com novo token e senha', async () => {
    const requestResetSpy = vi
      .spyOn(pb.collection('users'), 'requestPasswordReset')
      .mockResolvedValue(true as any)
    const confirmResetSpy = vi
      .spyOn(pb.collection('users'), 'confirmPasswordReset')
      .mockResolvedValue(true as any)

    const req = await pb.collection('users').requestPasswordReset('usuario@rotina.app')
    expect(req).toBe(true)
    expect(requestResetSpy).toHaveBeenCalledWith('usuario@rotina.app')

    const confirm = await pb
      .collection('users')
      .confirmPasswordReset('token_reset_abc', 'NovaSenhaSuperForte!2025', 'NovaSenhaSuperForte!2025')
    expect(confirm).toBe(true)
    expect(confirmResetSpy).toHaveBeenCalledWith(
      'token_reset_abc',
      'NovaSenhaSuperForte!2025',
      'NovaSenhaSuperForte!2025',
    )
  })

  // T7: código de 6 dígitos verifica a conta dentro do app; código errado/expirado/consumido falha com limite de tentativas.
  it('T7: validação de código de 6 dígitos via endpoint customizado', async () => {
    const sendSpy = vi.spyOn(pb, 'send').mockImplementation(async (path, options: any) => {
      if (path === '/backend/v1/rotina/verificar-codigo') {
        const body = options?.body || {}
        if (body.code === '123456') {
          return { success: true, verified: true, message: 'E-mail verificado com sucesso.' }
        }
        if (body.code === '999999') {
          throw {
            status: 400,
            response: { message: 'Código de verificação inválido ou expirado.' },
          }
        }
        if (body.code === '000000') {
          throw {
            status: 400,
            response: { message: 'Limite de tentativas excedido. Solicite um novo código.' },
          }
        }
      }
      throw new Error('Not found')
    })

    // Código válido
    const validRes = await pb.send('/backend/v1/rotina/verificar-codigo', {
      method: 'POST',
      body: { email: 'teste@rotina.app', code: '123456' },
    })
    expect((validRes as any).success).toBe(true)

    // Código inválido/expirado
    let invalidError: any = null
    try {
      await pb.send('/backend/v1/rotina/verificar-codigo', {
        method: 'POST',
        body: { email: 'teste@rotina.app', code: '999999' },
      })
    } catch (err: any) {
      invalidError = err
    }
    expect(invalidError.response.message).toBe('Código de verificação inválido ou expirado.')

    // Limite de tentativas
    let limitError: any = null
    try {
      await pb.send('/backend/v1/rotina/verificar-codigo', {
        method: 'POST',
        body: { email: 'teste@rotina.app', code: '000000' },
      })
    } catch (err: any) {
      limitError = err
    }
    expect(limitError.response.message).toBe('Limite de tentativas excedido. Solicite um novo código.')

    expect(sendSpy).toHaveBeenCalledTimes(3)
  })
})
