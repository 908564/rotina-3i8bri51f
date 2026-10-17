/**
 * Centralização de versões do aplicativo e schemas de dados.
 *
 * NOTA DE ARQUITETURA:
 * - APP_VERSION: Versão do aplicativo Rotina (exibida em Mais, etc). Atualizada a cada release.
 * - DB_VERSION: Versão do banco IndexedDB (`rotina_db`).
 *     v1: stores iniciais (escrita, livros, treino)
 *     v2: estudos (courses, study_pages, etc)
 *     v3: trabalho (projects, achievements, etc)
 *     Importante: NÃO alterar este número a menos que uma migração estrutural real de stores/índices seja feita.
 * - BACKUP_SCHEMA_VERSION: Versão da estrutura do arquivo JSON de backup/exportação.
 *     v1: escrita, leitura, treino
 *     v2: metas de leitura
 *     v3: estudos
 *     v4: trabalho (projetos, conquistas, experiências, anotações)
 *     O backup usa 4 porque passou por mais iterações de payload histórico que o banco bruto.
 */

import packageJson from '../../package.json'

export const APP_VERSION = '0.2.0'

/** Versão estrutural do IndexedDB (rotina_db) */
export const DB_VERSION = 6

/** Versão do formato de exportação de backup JSON */
export const BACKUP_SCHEMA_VERSION = 6
