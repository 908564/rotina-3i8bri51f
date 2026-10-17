// Lista embutida de senhas comuns (aproximação para proteção contra senhas fracas)
export const COMMON_PASSWORDS = new Set([
  '1234567890',
  '12345678901',
  'password123',
  'password1234',
  'senha123456',
  'admin123456',
  'qwertyuiop',
  'brasil12345',
  '12345678910',
  'iloveyou123',
  'welcome1234',
  'monkey12345',
  'dragon12345',
  'master12345',
  'sunshine123',
  'princess123',
  'football123',
  'shadow12345',
  'superman123',
  'michael1234',
  'rotina12345',
  'trocarsenha1',
])

export interface PasswordStrength {
  score: number // 0 a 4
  label: string
  isTooCommon: boolean
  isTooShort: boolean
  isValid: boolean
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const isTooShort = password.length < 10
  const isTooCommon = COMMON_PASSWORDS.has(password.toLowerCase())

  let score = 0
  if (!isTooShort) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  let label = 'Muito fraca'
  if (score === 1) label = 'Fraca'
  else if (score === 2) label = 'Média'
  else if (score === 3) label = 'Boa'
  else if (score >= 4) label = 'Forte'

  const isValid = !isTooShort && !isTooCommon

  return {
    score,
    label,
    isTooCommon,
    isTooShort,
    isValid,
  }
}
