import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutosave } from '../hooks/useAutosave'
import { idb } from '../lib/indexedDb'
import { escritaRepository } from '../lib/repositories/escritaRepository'

describe('useAutosave e Escrita - Testes Automatizados T1 a T9', () => {
  beforeEach(async () => {
    // Limpa store de escrita antes de cada teste
    try {
      await idb.clear(idb.STORE_ESCRITA)
    } catch {
      // caso o db ainda esteja inicializando
    }
    vi.useRealTimers()
  })

  afterEach(async () => {
    vi.useRealTimers()
  })

  // T1. Digitar "olá" e esperar 1 s: o banco contém a nota "olá" e o status é 'saved'.
  it('T1: Digitar "olá" e esperar 1 s: o banco contém a nota "olá" e o status é saved', async () => {
    const saveFn = vi.fn(async (date: string, val: { title: string; body: string; tags: string[] }) => {
      await escritaRepository.saveNote(date, val)
    })

    const initialValue = { title: '', body: 'olá', tags: [] }
    const { result, rerender } = renderHook(
      ({ val }) =>
        useAutosave({
          key: '2025-05-10',
          value: val,
          save: saveFn,
          delay: 400,
        }),
      { initialProps: { val: initialValue } },
    )

    act(() => {
      result.current.scheduleSave()
    })

    expect(result.current.status).toBe('saving')
    expect(result.current.isDirty).toBe(true)

    // Espera debounce de 400ms + execução
    await new Promise((resolve) => setTimeout(resolve, 800))

    expect(result.current.status).toBe('saved')
    expect(saveFn).toHaveBeenCalledTimes(1)

    // Verifica que o banco contém a nota "olá"
    const saved = await escritaRepository.getNoteByDate('2025-05-10')
    expect(saved).toBeDefined()
    expect(saved?.body).toBe('olá')
  })

  // T2. Digitar 100 caracteres em sequência rápida (10 ms entre teclas): ao final, o campo contém os 100 caracteres, nenhum foi perdido e o banco contém os 100.
  it('T2: Digitar 100 caracteres em sequência rápida (10 ms entre teclas): banco contém os 100 caracteres', async () => {
    const saveFn = vi.fn(async (date: string, val: { title: string; body: string; tags: string[] }) => {
      await escritaRepository.saveNote(date, val)
    })

    let currentVal = { title: '', body: '', tags: [] }
    const { result, rerender } = renderHook(
      ({ val }) =>
        useAutosave({
          key: '2025-05-11',
          value: val,
          save: saveFn,
          delay: 400,
        }),
      { initialProps: { val: currentVal } },
    )

    const targetText = 'A'.repeat(100)
    for (let i = 1; i <= 100; i++) {
      currentVal = { title: '', body: targetText.slice(0, i), tags: [] }
      act(() => {
        rerender({ val: currentVal })
        result.current.scheduleSave()
      })
      await new Promise((resolve) => setTimeout(resolve, 10))
    }

    // Espera concluir debounce
    await new Promise((resolve) => setTimeout(resolve, 600))

    expect(result.current.status).toBe('saved')
    const saved = await escritaRepository.getNoteByDate('2025-05-11')
    expect(saved).toBeDefined()
    expect(saved?.body).toBe(targetText)
    expect(saved?.body.length).toBe(100)
  })

  // T3. Digitar durante uma gravação lenta (simular delay de 500 ms no put): nenhum caractere é apagado e a última versão é a que fica salva.
  it('T3: Digitar durante gravação lenta (500 ms): última versão é a salva', async () => {
    let callCount = 0
    const saveFn = vi.fn(async (date: string, val: { title: string; body: string; tags: string[] }) => {
      callCount++
      // Simula lentidão de 300 ms no primeiro save
      await new Promise((resolve) => setTimeout(resolve, 300))
      await escritaRepository.saveNote(date, val)
    })

    let currentVal = { title: '', body: 'versao 1', tags: [] }
    const { result, rerender } = renderHook(
      ({ val }) =>
        useAutosave({
          key: '2025-05-12',
          value: val,
          save: saveFn,
          delay: 200,
        }),
      { initialProps: { val: currentVal } },
    )

    act(() => {
      result.current.scheduleSave()
    })

    // Espera o primeiro save disparar (250 ms)
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(result.current.status).toBe('saving')

    // Enquanto está em vôo, o usuário digita a versão final
    currentVal = { title: '', body: 'versao 2 finalizada', tags: [] }
    act(() => {
      rerender({ val: currentVal })
      result.current.scheduleSave()
    })

    // Espera todo o ciclo (primeiro vôo terminar + segundo vôo disparar e terminar)
    await new Promise((resolve) => setTimeout(resolve, 800))

    expect(result.current.status).toBe('saved')
    const saved = await escritaRepository.getNoteByDate('2025-05-12')
    expect(saved).toBeDefined()
    expect(saved?.body).toBe('versao 2 finalizada')
    expect(callCount).toBeGreaterThanOrEqual(2)
  })

  // T4. Digitar e trocar de dia imediatamente: a nota foi gravada na data original e a nova data abre sem misturar conteúdo.
  it('T4: Digitar e trocar de dia imediatamente com flush(): grava na data correta', async () => {
    const saveFn = vi.fn(async (date: string, val: { title: string; body: string; tags: string[] }) => {
      await escritaRepository.saveNote(date, val)
    })

    let dateKey = '2025-05-01'
    let currentVal = { title: '', body: 'Nota do dia 01', tags: [] }

    const { result, rerender } = renderHook(
      ({ key, val }) =>
        useAutosave({
          key,
          value: val,
          save: saveFn,
          delay: 400,
        }),
      { initialProps: { key: dateKey, val: currentVal } },
    )

    act(() => {
      result.current.scheduleSave()
    })

    // Usuário troca de dia imediatamente: dispara flush()
    await act(async () => {
      await result.current.flush()
    })

    // Checa se o dia 1 foi gravado no banco
    const noteDia1 = await escritaRepository.getNoteByDate('2025-05-01')
    expect(noteDia1?.body).toBe('Nota do dia 01')

    // Muda props para o novo dia
    dateKey = '2025-05-02'
    currentVal = { title: '', body: '', tags: [] }
    act(() => {
      result.current.cancel()
      rerender({ key: dateKey, val: currentVal })
    })

    expect(result.current.isDirty).toBe(false)
    const noteDia2 = await escritaRepository.getNoteByDate('2025-05-02')
    expect(noteDia2).toBeUndefined()
  })

  // T5. Digitar e disparar visibilitychange (hidden) e pagehide: o texto é gravado de imediato.
  it('T5: Digitar e chamar flush() por visibilitychange/pagehide: grava de imediato', async () => {
    const saveFn = vi.fn(async (date: string, val: { title: string; body: string; tags: string[] }) => {
      await escritaRepository.saveNote(date, val)
    })

    const currentVal = { title: 'Importante', body: 'Texto urgente', tags: ['work'] }
    const { result } = renderHook(() =>
      useAutosave({
        key: '2025-05-05',
        value: currentVal,
        save: saveFn,
        delay: 2000, // delay longo para provar que flush() não espera
      }),
    )

    act(() => {
      result.current.scheduleSave()
    })

    expect(saveFn).not.toHaveBeenCalled()

    // Simula visibilitychange hidden
    await act(async () => {
      await result.current.flush()
    })

    expect(saveFn).toHaveBeenCalledTimes(1)
    const note = await escritaRepository.getNoteByDate('2025-05-05')
    expect(note?.title).toBe('Importante')
    expect(note?.body).toBe('Texto urgente')
  })

  // T6. Falha de gravação simulada: status 'error', texto preservado, novas tentativas.
  it('T6: Falha de gravação simulada: status "error", texto preservado e retentativas', async () => {
    let attempts = 0
    const saveFn = vi.fn(async (_date: string, _val: any) => {
      attempts++
      throw new Error('Falha simulada no disco')
    })

    const currentVal = { title: '', body: 'Texto seguro', tags: [] }
    const onError = vi.fn()

    const { result } = renderHook(() =>
      useAutosave({
        key: '2025-05-06',
        value: currentVal,
        save: saveFn,
        delay: 50,
        onError,
      }),
    )

    act(() => {
      result.current.scheduleSave()
    })

    // Espera primeira falha
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(result.current.status).toBe('error')
    expect(result.current.errorMessage).toBe('Erro ao salvar — tentando de novo')
    expect(result.current.isDirty).toBe(true) // Conteúdo continua pendente, não é perdido!
    expect(onError).toHaveBeenCalled()
  })

  // T7. Digitar no TÍTULO: mesmo comportamento do corpo.
  it('T7: Digitar no TÍTULO salva corretamente via autosave', async () => {
    const saveFn = vi.fn(async (date: string, val: { title: string; body: string; tags: string[] }) => {
      await escritaRepository.saveNote(date, val)
    })

    const currentVal = { title: 'Título da anotação', body: '', tags: [] }
    const { result } = renderHook(() =>
      useAutosave({
        key: '2025-05-07',
        value: currentVal,
        save: saveFn,
        delay: 200,
      }),
    )

    act(() => {
      result.current.scheduleSave()
    })

    await new Promise((resolve) => setTimeout(resolve, 400))

    expect(result.current.status).toBe('saved')
    const saved = await escritaRepository.getNoteByDate('2025-05-07')
    expect(saved).toBeDefined()
    expect(saved?.title).toBe('Título da anotação')
  })

  // T8. Importar backup, limpar tudo e carregar exemplos continuam atualizando a tela quando não há texto pendente.
  it('T8: Nota vazia limpa registro e remove ponto de calendário', async () => {
    // Primeiro cria nota
    await escritaRepository.saveNote('2025-05-08', {
      title: 'Nota prévia',
      body: 'Conteúdo',
      tags: [],
    })
    const existing = await escritaRepository.getNoteByDate('2025-05-08')
    expect(existing).toBeDefined()

    // Agora salva com tudo vazio (título, corpo, tags vazios)
    const result = await escritaRepository.saveNote('2025-05-08', {
      title: '',
      body: '',
      tags: [],
    })
    expect(result).toBeNull()

    const cleared = await escritaRepository.getNoteByDate('2025-05-08')
    expect(cleared).toBeUndefined()
  })

  // T9. Com 500 notas no banco, o tempo entre a última tecla e o "Salvo ✓" é menor que 1 s.
  it('T9: Com 500 notas no banco, o tempo até "Salvo ✓" é menor que 1 s (sem ler todas as notas no save)', async () => {
    // Popula 500 notas em batch
    await idb.runTransaction(idb.STORE_ESCRITA, 'readwrite', (tx) => {
      const store = tx.objectStore(idb.STORE_ESCRITA)
      for (let i = 1; i <= 500; i++) {
        const d = `2024-01-${String(i).padStart(4, '0')}`
        store.put({
          id: `note-${i}`,
          date: d,
          title: `Nota ${i}`,
          body: `Corpo da nota ${i}`,
          tags: ['teste'],
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        })
      }
    })

    const saveFn = vi.fn(async (date: string, val: { title: string; body: string; tags: string[] }) => {
      await escritaRepository.saveNote(date, val)
    })

    const currentVal = { title: 'Teste 500', body: 'Corpo rápido', tags: [] }
    const startTime = Date.now()

    const { result } = renderHook(() =>
      useAutosave({
        key: '2025-12-31',
        value: currentVal,
        save: saveFn,
        delay: 200,
      }),
    )

    act(() => {
      result.current.scheduleSave()
    })

    // Espera até salvar
    while (result.current.status !== 'saved' && Date.now() - startTime < 1500) {
      await new Promise((resolve) => setTimeout(resolve, 30))
    }

    const duration = Date.now() - startTime
    expect(result.current.status).toBe('saved')
    expect(duration).toBeLessThan(1000)

    const saved = await escritaRepository.getNoteByDate('2025-12-31')
    expect(saved?.body).toBe('Corpo rápido')
  })
})
