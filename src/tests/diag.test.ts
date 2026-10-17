import { describe, it } from 'vitest'

describe('API Diagnostic', () => {
  it('test api response', async () => {
    const backendUrl = 'https://rotina-2dcbb.shrd01.internal.goskip.dev'

    // 1. Test uninvited email
    try {
      const res1 = await fetch(`${backendUrl}/api/collections/users/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nao_convidado_teste@exemplo.com',
          password: 'SenhaValida10!@#',
          passwordConfirm: 'SenhaValida10!@#',
        })
      })
      const data1 = await res1.json()
      console.log('UNINVITED RESULT:', res1.status, JSON.stringify(data1))
    } catch (e) {
      console.error('UNINVITED ERR:', e)
    }

    // 2. Test invited email
    try {
      const res2 = await fetch(`${backendUrl}/api/collections/users/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'cadu.mendes1140@gmail.com',
          password: 'SenhaValida10!@#',
          passwordConfirm: 'SenhaValida10!@#',
        })
      })
      const data2 = await res2.json()
      console.log('INVITED RESULT:', res2.status, JSON.stringify(data2))
    } catch (e) {
      console.error('INVITED ERR:', e)
    }
  })
})
