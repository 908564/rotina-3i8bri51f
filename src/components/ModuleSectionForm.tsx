import React from 'react'
import {
  TaskModule,
  Livro,
  Course,
  Project,
  TaskEscritaData,
  TaskLeituraData,
  TaskTreinoData,
  TaskEstudosData,
  TaskTrabalhoData,
  TreinoTipo,
  EstudosVinculoTipo,
  EstudosAtividadeTipo,
  TrabalhoTipo,
} from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BookOpen, GraduationCap, Briefcase, Dumbbell, PenLine, Plus } from 'lucide-react'

interface ModuleSectionFormProps {
  module: TaskModule
  books: Livro[]
  courses: Course[]
  projects: Project[]
  sportSuggestions: string[]
  onOpenQuickBookModal?: () => void

  // Escrita
  escritaData: TaskEscritaData
  onChangeEscrita: (data: Partial<TaskEscritaData>) => void

  // Leitura
  leituraData: TaskLeituraData
  onChangeLeitura: (data: Partial<TaskLeituraData>) => void

  // Treino
  treinoData: TaskTreinoData
  onChangeTreino: (data: Partial<TaskTreinoData>) => void

  // Estudos
  estudosData: TaskEstudosData
  onChangeEstudos: (data: Partial<TaskEstudosData>) => void

  // Trabalho
  trabalhoData: TaskTrabalhoData
  onChangeTrabalho: (data: Partial<TaskTrabalhoData>) => void
}

export function ModuleSectionForm({
  module,
  books,
  courses,
  projects,
  sportSuggestions,
  onOpenQuickBookModal,
  escritaData,
  onChangeEscrita,
  leituraData,
  onChangeLeitura,
  treinoData,
  onChangeTreino,
  estudosData,
  onChangeEstudos,
  trabalhoData,
  onChangeTrabalho,
}: ModuleSectionFormProps) {
  if (module === 'geral') {
    return null
  }

  return (
    <div className="p-3.5 rounded-2xl bg-[#F6F3EE] dark:bg-[#25201B] border border-[#EAE4DB] dark:border-[#38332B] space-y-3.5 animate-in fade-in duration-150">
      {/* 1. ESCRITA */}
      {module === 'escrita' && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#4C54C2]">
            <PenLine className="w-3.5 h-3.5" />
            <span>Configurações de Escrita</span>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Tipo de escrita</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChangeEscrita({ tipo: 'diario' })}
                className={`h-10 min-h-[40px] rounded-xl text-xs font-bold border transition-all ${
                  escritaData.tipo === 'diario'
                    ? 'bg-[#4C54C2] text-white border-transparent'
                    : 'bg-white dark:bg-[#1E1A16] text-[#1F1B16] dark:text-[#F6F3EE] border-[#EAE4DB] dark:border-[#38332B]'
                }`}
              >
                Diário sobre o dia
              </button>
              <button
                type="button"
                onClick={() => onChangeEscrita({ tipo: 'ideia' })}
                className={`h-10 min-h-[40px] rounded-xl text-xs font-bold border transition-all ${
                  escritaData.tipo === 'ideia'
                    ? 'bg-[#4C54C2] text-white border-transparent'
                    : 'bg-white dark:bg-[#1E1A16] text-[#1F1B16] dark:text-[#F6F3EE] border-[#EAE4DB] dark:border-[#38332B]'
                }`}
              >
                Ideia
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label htmlFor="escrita-tema" className="text-xs font-semibold">
                Tema / Título sugerido (opcional)
              </Label>
              <span className="text-[10px] text-muted-foreground">
                {(escritaData.tema || '').length}/80
              </span>
            </div>
            <Input
              id="escrita-tema"
              maxLength={80}
              placeholder="Ex.: Reflexão sobre foco matinal"
              value={escritaData.tema || ''}
              onChange={(e) => onChangeEscrita({ tema: e.target.value.slice(0, 80) })}
              className="h-10 text-xs rounded-xl border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16]"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="escrita-meta-min" className="text-xs font-semibold">
              Meta de minutos (opcional)
            </Label>
            <Input
              id="escrita-meta-min"
              type="number"
              min="1"
              placeholder="Ex.: 15"
              value={escritaData.metaMinutos ?? ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : undefined
                onChangeEscrita({ metaMinutos: val && val > 0 ? val : undefined })
              }}
              className="h-10 text-xs rounded-xl border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16]"
            />
          </div>
        </div>
      )}

      {/* 2. LEITURA */}
      {module === 'leitura' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-[#1F7F6E]">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Configurações de Leitura
            </span>
            {onOpenQuickBookModal && (
              <button
                type="button"
                onClick={onOpenQuickBookModal}
                className="text-[11px] font-bold text-[#1F7F6E] hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Novo livro
              </button>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="leitura-book" className="text-xs font-semibold">
              Livro
            </Label>
            <select
              id="leitura-book"
              value={leituraData.bookId || ''}
              onChange={(e) => onChangeLeitura({ bookId: e.target.value || undefined })}
              className="w-full h-10 px-3 text-xs font-medium rounded-xl border border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16] text-[#1F1B16] dark:text-[#F6F3EE] focus:outline-none"
            >
              <option value="">Selecione um livro...</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} {b.status === 'lendo' ? '• (Lendo agora)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="leitura-meta-pag" className="text-xs font-semibold">
                Meta de páginas (opc.)
              </Label>
              <Input
                id="leitura-meta-pag"
                type="number"
                min="1"
                placeholder="Ex.: 20"
                value={leituraData.metaPaginas ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : undefined
                  onChangeLeitura({ metaPaginas: val && val > 0 ? val : undefined })
                }}
                className="h-10 text-xs rounded-xl border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16]"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="leitura-meta-min" className="text-xs font-semibold">
                Meta de minutos (opc.)
              </Label>
              <Input
                id="leitura-meta-min"
                type="number"
                min="1"
                placeholder="Ex.: 30"
                value={leituraData.metaMinutos ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : undefined
                  onChangeLeitura({ metaMinutos: val && val > 0 ? val : undefined })
                }}
                className="h-10 text-xs rounded-xl border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="leitura-ate-pag" className="text-xs font-semibold">
              Até a página (opcional)
            </Label>
            <Input
              id="leitura-ate-pag"
              type="number"
              min="1"
              placeholder="Ex.: 150"
              value={leituraData.atePagina ?? ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : undefined
                onChangeLeitura({ atePagina: val && val > 0 ? val : undefined })
              }}
              className="h-10 text-xs rounded-xl border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16]"
            />
          </div>
        </div>
      )}

      {/* 3. TREINO */}
      {module === 'treino' && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#B8503E]">
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Configurações de Treino</span>
          </div>

          {/* Tipo de treino: Musculação | Cardio | Outros */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Tipo</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['musculacao', 'cardio', 'outros'] as TreinoTipo[]).map((t) => {
                const label =
                  t === 'musculacao' ? 'Musculação' : t === 'cardio' ? 'Cardio' : 'Outros'
                const isSel = treinoData.tipo === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      if (t === 'musculacao') {
                        onChangeTreino({
                          tipo: 'musculacao',
                          musculacao: treinoData.musculacao || {
                            subtipo: 'academia',
                            diaOuGrupo: '',
                          },
                        })
                      } else if (t === 'cardio') {
                        onChangeTreino({
                          tipo: 'cardio',
                          cardio: treinoData.cardio || {
                            modalidade: 'corrida',
                            intensidade: 'moderada',
                          },
                        })
                      } else {
                        onChangeTreino({
                          tipo: 'outros',
                          outros: treinoData.outros || { esporte: '' },
                        })
                      }
                    }}
                    className={`h-9 min-h-[36px] rounded-xl text-xs font-bold border transition-all ${
                      isSel
                        ? 'bg-[#B8503E] text-white border-transparent'
                        : 'bg-white dark:bg-[#1E1A16] text-[#1F1B16] dark:text-[#F6F3EE] border-[#EAE4DB] dark:border-[#38332B]'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Subformulário: Musculação */}
          {treinoData.tipo === 'musculacao' && (
            <div className="space-y-3 pt-1 border-t border-[#EAE4DB] dark:border-[#38332B]">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Modalidade</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeTreino({
                        musculacao: {
                          subtipo: 'academia',
                          diaOuGrupo: treinoData.musculacao?.diaOuGrupo || '',
                        },
                      })
                    }
                    className={`h-9 min-h-[36px] rounded-xl text-xs font-bold border transition-all ${
                      treinoData.musculacao?.subtipo !== 'calistenia'
                        ? 'bg-[#1F1B16] text-white dark:bg-[#F6F3EE] dark:text-[#1F1B16] border-transparent'
                        : 'bg-white dark:bg-[#1E1A16] border-[#EAE4DB] dark:border-[#38332B]'
                    }`}
                  >
                    Academia
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeTreino({
                        musculacao: {
                          subtipo: 'calistenia',
                          diaOuGrupo: treinoData.musculacao?.diaOuGrupo || '',
                        },
                      })
                    }
                    className={`h-9 min-h-[36px] rounded-xl text-xs font-bold border transition-all ${
                      treinoData.musculacao?.subtipo === 'calistenia'
                        ? 'bg-[#1F1B16] text-white dark:bg-[#F6F3EE] dark:text-[#1F1B16] border-transparent'
                        : 'bg-white dark:bg-[#1E1A16] border-[#EAE4DB] dark:border-[#38332B]'
                    }`}
                  >
                    Calistenia
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="musc-grupo" className="text-xs font-semibold">
                  Dia do plano ou grupo muscular
                </Label>
                <Input
                  id="musc-grupo"
                  placeholder="Ex.: Treino A (Peito e Tríceps) ou Pernas"
                  value={treinoData.musculacao?.diaOuGrupo || ''}
                  onChange={(e) =>
                    onChangeTreino({
                      musculacao: {
                        subtipo: treinoData.musculacao?.subtipo || 'academia',
                        diaOuGrupo: e.target.value,
                      },
                    })
                  }
                  className="h-10 text-xs rounded-xl border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16]"
                />
              </div>
            </div>
          )}

          {/* Subformulário: Cardio */}
          {treinoData.tipo === 'cardio' && (
            <div className="space-y-3 pt-1 border-t border-[#EAE4DB] dark:border-[#38332B]">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Modalidade</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['corrida', 'caminhada', 'bicicleta'] as const).map((m) => {
                    const label =
                      m === 'corrida' ? 'Corrida' : m === 'caminhada' ? 'Caminhada' : 'Bicicleta'
                    const isSel = (treinoData.cardio?.modalidade || 'corrida') === m
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() =>
                          onChangeTreino({
                            cardio: {
                              modalidade: m,
                              intensidade: treinoData.cardio?.intensidade || 'moderada',
                              metaDistancia: treinoData.cardio?.metaDistancia,
                              metaTempo: treinoData.cardio?.metaTempo,
                            },
                          })
                        }
                        className={`h-9 min-h-[36px] rounded-xl text-xs font-bold border transition-all ${
                          isSel
                            ? 'bg-[#1F1B16] text-white dark:bg-[#F6F3EE] dark:text-[#1F1B16] border-transparent'
                            : 'bg-white dark:bg-[#1E1A16] border-[#EAE4DB] dark:border-[#38332B]'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="cardio-dist" className="text-xs font-semibold">
                    Meta de distância (km)
                  </Label>
                  <Input
                    id="cardio-dist"
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="Ex.: 5.0"
                    value={treinoData.cardio?.metaDistancia ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : undefined
                      onChangeTreino({
                        cardio: {
                          modalidade: treinoData.cardio?.modalidade || 'corrida',
                          intensidade: treinoData.cardio?.intensidade || 'moderada',
                          metaDistancia: val && val > 0 ? val : undefined,
                          metaTempo: treinoData.cardio?.metaTempo,
                        },
                      })
                    }}
                    className="h-10 text-xs rounded-xl border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16]"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cardio-tempo" className="text-xs font-semibold">
                    Meta de tempo (min)
                  </Label>
                  <Input
                    id="cardio-tempo"
                    type="number"
                    min="1"
                    placeholder="Ex.: 30"
                    value={treinoData.cardio?.metaTempo ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : undefined
                      onChangeTreino({
                        cardio: {
                          modalidade: treinoData.cardio?.modalidade || 'corrida',
                          intensidade: treinoData.cardio?.intensidade || 'moderada',
                          metaDistancia: treinoData.cardio?.metaDistancia,
                          metaTempo: val && val > 0 ? val : undefined,
                        },
                      })
                    }}
                    className="h-10 text-xs rounded-xl border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nível de intensidade</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['leve', 'moderada', 'intensa'] as const).map((lvl) => {
                    const label =
                      lvl === 'leve' ? 'Leve' : lvl === 'moderada' ? 'Moderada' : 'Intensa'
                    const isSel = (treinoData.cardio?.intensidade || 'moderada') === lvl
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() =>
                          onChangeTreino({
                            cardio: {
                              modalidade: treinoData.cardio?.modalidade || 'corrida',
                              intensidade: lvl,
                              metaDistancia: treinoData.cardio?.metaDistancia,
                              metaTempo: treinoData.cardio?.metaTempo,
                            },
                          })
                        }
                        className={`h-9 min-h-[36px] rounded-xl text-xs font-bold border transition-all ${
                          isSel
                            ? 'bg-[#B8503E] text-white border-transparent'
                            : 'bg-white dark:bg-[#1E1A16] border-[#EAE4DB] dark:border-[#38332B]'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Subformulário: Outros */}
          {treinoData.tipo === 'outros' && (
            <div className="space-y-3 pt-1 border-t border-[#EAE4DB] dark:border-[#38332B]">
              <div className="space-y-1">
                <Label htmlFor="outros-esporte" className="text-xs font-semibold">
                  Nome do esporte
                </Label>
                <Input
                  id="outros-esporte"
                  placeholder="Ex.: Natação, Futebol, Tênis, Ioga..."
                  value={treinoData.outros?.esporte || ''}
                  onChange={(e) =>
                    onChangeTreino({
                      outros: {
                        esporte: e.target.value,
                        duracao: treinoData.outros?.duracao,
                      },
                    })
                  }
                  className="h-10 text-xs rounded-xl border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16]"
                />

                {sportSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    <span className="text-[10px] text-muted-foreground mr-1">Sugestões:</span>
                    {sportSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          onChangeTreino({
                            outros: {
                              esporte: s,
                              duracao: treinoData.outros?.duracao,
                            },
                          })
                        }
                        className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-[#1E1A16] border border-[#EAE4DB] dark:border-[#38332B] hover:border-[#B8503E]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="outros-duracao" className="text-xs font-semibold">
                  Duração opcional (minutos)
                </Label>
                <Input
                  id="outros-duracao"
                  type="number"
                  min="1"
                  placeholder="Ex.: 45"
                  value={treinoData.outros?.duracao ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined
                    onChangeTreino({
                      outros: {
                        esporte: treinoData.outros?.esporte || '',
                        duracao: val && val > 0 ? val : undefined,
                      },
                    })
                  }}
                  className="h-10 text-xs rounded-xl border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. ESTUDOS */}
      {module === 'estudos' && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#6A4BB0]">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Configurações de Estudos</span>
          </div>

          {/* Vínculo: Faculdade, Curso, Certificação ou Outros (estudo autônomo) */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Vínculo</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(
                [
                  { key: 'faculdade', label: 'Faculdade' },
                  { key: 'curso', label: 'Curso' },
                  { key: 'certificacao', label: 'Certificação' },
                  { key: 'outros', label: 'Autônomo' },
                ] as { key: EstudosVinculoTipo; label: string }[]
              ).map((v) => {
                const isSel = estudosData.vinculoTipo === v.key
                return (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => {
                      onChangeEstudos({
                        vinculoTipo: v.key,
                        courseId: v.key !== 'outros' ? estudosData.courseId : undefined,
                        estudoAutonomoNome:
                          v.key === 'outros' ? estudosData.estudoAutonomoNome : undefined,
                      })
                    }}
                    className={`h-9 min-h-[36px] rounded-xl text-xs font-bold border transition-all ${
                      isSel
                        ? 'bg-[#6A4BB0] text-white border-transparent'
                        : 'bg-white dark:bg-[#1E1A16] border-[#EAE4DB] dark:border-[#38332B]'
                    }`}
                  >
                    {v.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Selecionar curso se faculdade, curso ou certificação */}
          {estudosData.vinculoTipo && estudosData.vinculoTipo !== 'outros' && (
            <div className="space-y-1">
              <Label htmlFor="estudos-course" className="text-xs font-semibold">
                Selecionar item existente
              </Label>
              <select
                id="estudos-course"
                value={estudosData.courseId || ''}
                onChange={(e) => onChangeEstudos({ courseId: e.target.value || undefined })}
                className="w-full h-10 px-3 text-xs font-medium rounded-xl border border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16] text-[#1F1B16] dark:text-[#F6F3EE] focus:outline-none"
              >
                <option value="">Nenhum curso específico</option>
                {courses
                  .filter((c) =>
                    estudosData.vinculoTipo ? c.type === estudosData.vinculoTipo : true,
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.institution})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Se autônomo */}
          {estudosData.vinculoTipo === 'outros' && (
            <div className="space-y-1">
              <Label htmlFor="estudos-autonomo" className="text-xs font-semibold">
                Nome do estudo autônomo
              </Label>
              <Input
                id="estudos-autonomo"
                placeholder="Ex.: Algoritmos e Estruturas de Dados"
                value={estudosData.estudoAutonomoNome || ''}
                onChange={(e) => onChangeEstudos({ estudoAutonomoNome: e.target.value })}
                className="h-10 text-xs rounded-xl border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16]"
              />
            </div>
          )}

          {/* Tipo de atividade */}
          <div className="space-y-1">
            <Label htmlFor="estudos-atividade" className="text-xs font-semibold">
              Tipo de atividade
            </Label>
            <select
              id="estudos-atividade"
              value={estudosData.tipoAtividade}
              onChange={(e) =>
                onChangeEstudos({ tipoAtividade: e.target.value as EstudosAtividadeTipo })
              }
              className="w-full h-10 px-3 text-xs font-medium rounded-xl border border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16] text-[#1F1B16] dark:text-[#F6F3EE] focus:outline-none"
            >
              <option value="assistir_aula">Assistir aula</option>
              <option value="ler">Ler</option>
              <option value="exercicios">Exercícios</option>
              <option value="revisar">Revisar</option>
              <option value="entrega_prova">Entrega/Prova</option>
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label htmlFor="estudos-tema" className="text-xs font-semibold">
                Tema / Assunto (opcional)
              </Label>
              <span className="text-[10px] text-muted-foreground">
                {(estudosData.tema || '').length}/80
              </span>
            </div>
            <Input
              id="estudos-tema"
              maxLength={80}
              placeholder="Ex.: Capítulo 4 — Dinâmica dos Fluidos"
              value={estudosData.tema || ''}
              onChange={(e) => onChangeEstudos({ tema: e.target.value.slice(0, 80) })}
              className="h-10 text-xs rounded-xl border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16]"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="estudos-meta-min" className="text-xs font-semibold">
              Meta de minutos (opcional)
            </Label>
            <Input
              id="estudos-meta-min"
              type="number"
              min="1"
              placeholder="Ex.: 45"
              value={estudosData.metaMinutos ?? ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : undefined
                onChangeEstudos({ metaMinutos: val && val > 0 ? val : undefined })
              }}
              className="h-10 text-xs rounded-xl border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16]"
            />
          </div>
        </div>
      )}

      {/* 5. TRABALHO */}
      {module === 'trabalho' && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#3F5A70]">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Configurações de Trabalho</span>
          </div>

          <div className="space-y-1">
            <Label htmlFor="trabalho-proj" className="text-xs font-semibold">
              Projeto
            </Label>
            <select
              id="trabalho-proj"
              value={trabalhoData.projectId || ''}
              onChange={(e) => onChangeTrabalho({ projectId: e.target.value || undefined })}
              className="w-full h-10 px-3 text-xs font-medium rounded-xl border border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16] text-[#1F1B16] dark:text-[#F6F3EE] focus:outline-none"
            >
              <option value="">Nenhum projeto específico</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Tipo de atividade</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['tarefa', 'reuniao', 'entrega'] as TrabalhoTipo[]).map((t) => {
                const label = t === 'tarefa' ? 'Tarefa' : t === 'reuniao' ? 'Reunião' : 'Entrega'
                const isSel = trabalhoData.tipo === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onChangeTrabalho({ tipo: t })}
                    className={`h-9 min-h-[36px] rounded-xl text-xs font-bold border transition-all ${
                      isSel
                        ? 'bg-[#3F5A70] text-white border-transparent'
                        : 'bg-white dark:bg-[#1E1A16] border-[#EAE4DB] dark:border-[#38332B]'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#1E1A16] border border-[#EAE4DB] dark:border-[#38332B]">
            <label
              htmlFor="trabalho-sugerir"
              className="text-xs font-semibold text-[#1F1B16] dark:text-[#F6F3EE] cursor-pointer"
            >
              Sugerir registrar conquista ao concluir
            </label>
            <input
              id="trabalho-sugerir"
              type="checkbox"
              checked={trabalhoData.sugerirConquista}
              onChange={(e) => onChangeTrabalho({ sugerirConquista: e.target.checked })}
              className="w-5 h-5 rounded accent-[#3F5A70] cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  )
}
