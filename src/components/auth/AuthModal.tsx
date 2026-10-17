import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/lib/auth/AuthContext'
import { evaluatePasswordStrength } from '@/lib/auth/passwordValidation'
import { useToast } from '@/hooks/use-toast'
import {
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
} from 'lucide-react'
import { Link } from 'react-router-dom'

interface AuthModalProps {
  initialMode?: 'welcome' | 'signin' | 'signup' | 'forgot' | 'verify'
  onClose: () => void
  onSuccess?: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialMode = 'welcome',
  onClose,
  onSuccess,
}) => {
  const {
    signIn,
    signUp,
    requestPasswordReset,
    requestVerification,
    confirmVerification,
    verifyCode,
    refreshUser,
    user,
  } = useAuth()

  const [mode, setMode] = useState<'welcome' | 'signin' | 'signup' | 'forgot' | 'verify'>(
    initialMode,
  )
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [verificationWarning, setVerificationWarning] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [codeSubmitting, setCodeSubmitting] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)

  // Mensagens de erro por campo
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    password?: string
    passwordConfirm?: string
    terms?: string
    general?: string
  }>({})
  const { toast } = useToast()

  const passwordStrength = evaluatePasswordStrength(password)

  // Submissão do login
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setFieldErrors({})

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setFieldErrors({ email: 'Informe seu e-mail.' })
      return
    }
    if (!password) {
      setFieldErrors({ password: 'Informe sua senha.' })
      return
    }

    setLoading(true)
    const { error } = await signIn(cleanEmail, password)
    setLoading(false)

    if (error) {
      const msg = 'E-mail ou senha incorretos.'
      setFieldErrors({ general: msg })
      toast({
        title: 'Falha no login',
        description: msg,
        variant: 'destructive',
      })
      return
    }

    toast({
      title: 'Bem-vindo de volta!',
      description: 'Login realizado com sucesso.',
    })
    if (onSuccess) onSuccess()
    onClose()
  }

  // Submissão do cadastro
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setFieldErrors({})
    setVerificationWarning(null)

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setFieldErrors({ email: 'Informe um e-mail válido.' })
      return
    }

    if (!acceptedTerms) {
      setFieldErrors({
        terms: 'Você precisa aceitar os Termos e a Política de Privacidade.',
      })
      toast({
        title: 'Termos e Privacidade',
        description:
          'Você precisa aceitar os Termos e a Política de Privacidade para criar uma conta.',
        variant: 'destructive',
      })
      return
    }

    if (password !== passwordConfirm) {
      setFieldErrors({
        passwordConfirm: 'A confirmação de senha é diferente da senha informada.',
      })
      toast({
        title: 'Senhas não conferem',
        description: 'A confirmação de senha é diferente da senha informada.',
        variant: 'destructive',
      })
      return
    }

    if (!passwordStrength.isValid) {
      const passMsg = passwordStrength.isTooShort
        ? 'A senha deve conter no mínimo 10 caracteres.'
        : 'Esta senha é muito comum e insegura. Escolha uma senha mais forte.'
      setFieldErrors({ password: passMsg })
      toast({
        title: 'Senha fraca ou inválida',
        description: passMsg,
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    const { error, errorCode, verificationSent } = await signUp(cleanEmail, password, name)
    setLoading(false)

    if (error) {
      if (errorCode === 'invite_required') {
        const inviteMsg = 'Cadastro disponível apenas para convidados no momento.'
        setFieldErrors({ email: inviteMsg })
        toast({
          title: 'Acesso restrito',
          description: inviteMsg,
          variant: 'destructive',
        })
      } else if (errorCode === 'email_exists') {
        const emailMsg = 'Este e-mail já tem conta. Entre ou recupere a senha.'
        setFieldErrors({ email: emailMsg })
        toast({
          title: 'E-mail já cadastrado',
          description: emailMsg,
          variant: 'destructive',
        })
      } else if (errorCode === 'weak_password') {
        const passMsg = 'A senha deve conter no mínimo 10 caracteres.'
        setFieldErrors({ password: passMsg })
        toast({
          title: 'Senha inválida',
          description: passMsg,
          variant: 'destructive',
        })
      } else if (errorCode === 'rate_limit') {
        const rateMsg = 'Muitas tentativas. Tente de novo em alguns minutos.'
        setFieldErrors({ general: rateMsg })
        toast({
          title: 'Limite atingido',
          description: rateMsg,
          variant: 'destructive',
        })
      } else if (errorCode === 'network_error') {
        const netMsg = 'Sem conexão. Conecte-se à internet para criar a conta.'
        setFieldErrors({ general: netMsg })
        toast({
          title: 'Sem conexão',
          description: netMsg,
          variant: 'destructive',
        })
      } else {
        const genericMsg = 'Não foi possível criar a conta agora. Tente novamente.'
        if (import.meta.env.DEV) {
          console.error('[signUp error]', error)
        }
        setFieldErrors({ general: genericMsg })
        toast({
          title: 'Erro ao criar conta',
          description: genericMsg,
          variant: 'destructive',
        })
      }
      return
    }

    // Sucesso na criação da conta
    if (verificationSent === false) {
      setVerificationWarning(
        'Conta criada. Não conseguimos enviar o e-mail agora. Toque em Reenviar.',
      )
      toast({
        title: 'Conta criada!',
        description: 'Não conseguimos enviar o e-mail agora. Toque em Reenviar.',
      })
    } else {
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Enviamos um link de confirmação para o seu e-mail.',
      })
    }
    setMode('verify')
  }

  // Submissão de esqueci a senha
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setFieldErrors({ email: 'Informe seu e-mail.' })
      return
    }

    setLoading(true)
    await requestPasswordReset(cleanEmail)
    setLoading(false)

    toast({
      title: 'Link enviado!',
      description: 'Se o e-mail estiver cadastrado, você receberá um link de redefinição de senha.',
    })
    setMode('signin')
  }

  // Reenviar verificação
  const handleResendVerification = async () => {
    const cleanEmail = email.trim().toLowerCase()
    if (resendCooldown > 0 || !cleanEmail || loading) return
    setLoading(true)
    const { error } = await requestVerification(cleanEmail)
    setLoading(false)

    if (error) {
      toast({
        title: 'Não foi possível reenviar',
        description: 'Aguarde alguns minutos e tente novamente.',
        variant: 'destructive',
      })
      return
    }

    setVerificationWarning(null)
    setResendCooldown(60)

    toast({
      title: 'E-mail reenviado',
      description: 'Verifique sua caixa de entrada e spam.',
    })

    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleVerifyWithCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    const cleanCode = verificationCode.trim()

    if (!cleanCode || cleanCode.length !== 6) {
      setCodeError('Digite o código de 6 dígitos recebido por e-mail.')
      return
    }

    setCodeError(null)
    setCodeSubmitting(true)
    const { error, message } = await verifyCode(cleanEmail, cleanCode)
    setCodeSubmitting(false)

    if (error) {
      setCodeError(message || 'Código inválido ou expirado.')
      toast({
        title: 'Código inválido',
        description: message || 'Verifique o código ou solicite um novo.',
        variant: 'destructive',
      })
      return
    }

    toast({
      title: 'E-mail verificado com sucesso!',
      description: 'Sua conta está ativa e sincronizando.',
    })
    if (onSuccess) onSuccess()
    onClose()
  }

  const handleCheckVerified = async () => {
    setLoading(true)
    await refreshUser()
    setLoading(false)
    if (user?.verified) {
      toast({
        title: 'E-mail verificado!',
        description: 'Sua conta está ativa e sincronizando.',
      })
      if (onSuccess) onSuccess()
      onClose()
    } else {
      toast({
        title: 'Ainda não verificado',
        description: 'Clique no link enviado para seu e-mail e depois clique em "Já confirmei".',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl bg-card border-border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* TELA DE BOAS-VINDAS */}
          {mode === 'welcome' && (
            <div className="space-y-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#F59E4C]/10 text-[#F59E4C] flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Bem-vindo ao Rotina
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Seu aplicativo de rotina e produtividade pessoal com sincronização segura na
                  nuvem.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  onClick={() => setMode('signin')}
                  className="w-full h-12 rounded-xl text-sm font-semibold bg-[#B4540F] hover:bg-[#964208] text-white shadow-sm transition-colors cursor-pointer"
                >
                  Entrar com minha conta
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMode('signup')}
                  className="w-full h-12 rounded-xl text-sm font-semibold border-border cursor-pointer"
                >
                  Criar conta (somente convidados)
                </Button>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="w-full h-11 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Usar sem conta (só neste aparelho)
                </Button>
              </div>
            </div>
          )}

          {/* TELA DE ENTRAR (LOGIN) */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-foreground">Entrar</h2>
                <p className="text-xs text-muted-foreground">
                  Acesse sua conta para sincronizar seus dados entre aparelhos.
                </p>
              </div>

              {fieldErrors.general && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{fieldErrors.general}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="signin-email" className="text-xs font-medium">
                    E-mail
                  </Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                    <Input
                      id="signin-email"
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (fieldErrors.email)
                          setFieldErrors((prev) => ({ ...prev, email: undefined }))
                      }}
                      className="h-11 pl-9 rounded-xl text-sm"
                    />
                  </div>
                  {fieldErrors.email && (
                    <p
                      role="alert"
                      className="text-xs text-destructive flex items-center gap-1 mt-1 font-medium"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password" className="text-xs font-medium">
                      Senha
                    </Label>
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-[#B4540F] hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                    <Input
                      id="signin-password"
                      type="password"
                      required
                      placeholder="••••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (fieldErrors.password)
                          setFieldErrors((prev) => ({ ...prev, password: undefined }))
                      }}
                      className="h-11 pl-9 rounded-xl text-sm"
                    />
                  </div>
                  {fieldErrors.password && (
                    <p
                      role="alert"
                      className="text-xs text-destructive flex items-center gap-1 mt-1 font-medium"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {fieldErrors.password}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full h-12 rounded-xl text-sm font-semibold transition-colors disabled:bg-muted disabled:text-[#6B645C] disabled:opacity-100 disabled:cursor-not-allowed bg-[#B4540F] hover:bg-[#964208] text-white shadow-sm cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 animate-spin" /> Entrando...
                    </span>
                  ) : (
                    'Entrar'
                  )}
                </Button>
                <div className="flex items-center justify-between text-xs pt-2">
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Ainda não tem conta?{' '}
                    <span className="text-[#B4540F] font-semibold">Cadastre-se</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Usar sem conta
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TELA DE CRIAR CONTA */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-foreground">Criar Conta</h2>
                <p className="text-xs text-muted-foreground">Fase de acesso fechado por convite.</p>
              </div>

              {fieldErrors.general && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{fieldErrors.general}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name" className="text-xs font-medium">
                    Nome (opcional)
                  </Label>
                  <div className="relative">
                    <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11 pl-9 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-xs font-medium">
                    E-mail do convite
                  </Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                    <Input
                      id="signup-email"
                      type="email"
                      required
                      placeholder="email-convidado@exemplo.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (fieldErrors.email)
                          setFieldErrors((prev) => ({ ...prev, email: undefined }))
                      }}
                      className="h-11 pl-9 rounded-xl text-sm"
                    />
                  </div>
                  {fieldErrors.email && (
                    <p
                      role="alert"
                      className="text-xs text-destructive flex items-center gap-1 mt-1 font-medium"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-xs font-medium">
                    Senha (mínimo 10 caracteres)
                  </Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                    <Input
                      id="signup-password"
                      type="password"
                      required
                      placeholder="Pelo menos 10 caracteres"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (fieldErrors.password)
                          setFieldErrors((prev) => ({ ...prev, password: undefined }))
                      }}
                      className="h-11 pl-9 rounded-xl text-sm"
                    />
                  </div>
                  {fieldErrors.password && (
                    <p
                      role="alert"
                      className="text-xs text-destructive flex items-center gap-1 mt-1 font-medium"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {fieldErrors.password}
                    </p>
                  )}
                  {password && (
                    <div className="text-[11px] pt-1 flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Força:{' '}
                        <strong
                          className={
                            passwordStrength.score >= 3
                              ? 'text-emerald-500'
                              : passwordStrength.score >= 2
                                ? 'text-amber-500'
                                : 'text-red-500'
                          }
                        >
                          {passwordStrength.label}
                        </strong>
                      </span>
                      {passwordStrength.isTooCommon && (
                        <span className="text-red-500 font-medium">Senha muito comum!</span>
                      )}
                      {passwordStrength.isTooShort && (
                        <span className="text-muted-foreground">Mín. 10 caracteres</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-confirm" className="text-xs font-medium">
                    Confirmar senha
                  </Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                    <Input
                      id="signup-confirm"
                      type="password"
                      required
                      placeholder="Repita a senha"
                      value={passwordConfirm}
                      onChange={(e) => {
                        setPasswordConfirm(e.target.value)
                        if (fieldErrors.passwordConfirm)
                          setFieldErrors((prev) => ({ ...prev, passwordConfirm: undefined }))
                      }}
                      className="h-11 pl-9 rounded-xl text-sm"
                    />
                  </div>
                  {fieldErrors.passwordConfirm && (
                    <p
                      role="alert"
                      className="text-xs text-destructive flex items-center gap-1 mt-1 font-medium"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {fieldErrors.passwordConfirm}
                    </p>
                  )}
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(val) => {
                        setAcceptedTerms(Boolean(val))
                        if (fieldErrors.terms)
                          setFieldErrors((prev) => ({ ...prev, terms: undefined }))
                      }}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor="terms"
                      className="text-[11px] text-muted-foreground leading-tight cursor-pointer"
                    >
                      Li e aceito os{' '}
                      <Link to="/termos" target="_blank" className="text-[#B4540F] underline">
                        Termos de Uso
                      </Link>{' '}
                      e a{' '}
                      <Link to="/privacidade" target="_blank" className="text-[#B4540F] underline">
                        Política de Privacidade
                      </Link>
                      .
                    </Label>
                  </div>
                  {fieldErrors.terms && (
                    <p
                      role="alert"
                      className="text-xs text-destructive flex items-center gap-1 pl-6 font-medium"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {fieldErrors.terms}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  type="submit"
                  disabled={loading || !email || !password || !passwordConfirm || !acceptedTerms}
                  className="w-full h-12 rounded-xl text-sm font-semibold transition-colors disabled:bg-muted disabled:text-[#6B645C] disabled:opacity-100 disabled:cursor-not-allowed bg-[#B4540F] hover:bg-[#964208] text-white shadow-sm cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 animate-spin" /> Criando conta...
                    </span>
                  ) : (
                    'Criar conta'
                  )}
                </Button>
                <div className="flex items-center justify-between text-xs pt-2">
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Já tem conta? <span className="text-[#B4540F] font-semibold">Entrar</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TELA DE RECUPERAÇÃO DE SENHA */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-foreground">Recuperar Senha</h2>
                <p className="text-xs text-muted-foreground">
                  Enviaremos um link para você definir uma nova senha no app.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="forgot-email" className="text-xs font-medium">
                  E-mail cadastrado
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                  <Input
                    id="forgot-email"
                    type="email"
                    required
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 pl-9 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full h-12 rounded-xl text-sm font-semibold transition-colors disabled:bg-muted disabled:text-[#6B645C] disabled:opacity-100 disabled:cursor-not-allowed bg-[#B4540F] hover:bg-[#964208] text-white shadow-sm cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 animate-spin" /> Enviando...
                    </span>
                  ) : (
                    'Enviar link de redefinição'
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground pt-1 cursor-pointer"
                >
                  Voltar para login
                </button>
              </div>
            </form>
          )}

          {/* TELA DE CONFIRMAÇÃO DE E-MAIL */}
          {mode === 'verify' && (
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#34BEAA]/10 text-[#34BEAA] flex items-center justify-center mx-auto">
                <Mail className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">Confirme seu e-mail</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enviamos uma mensagem de confirmação para{' '}
                  <strong className="text-foreground">{email.trim().toLowerCase()}</strong>.
                </p>
                {verificationWarning && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs text-left flex items-start gap-2 mt-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <span>{verificationWarning}</span>
                  </div>
                )}
              </div>

              {/* Formulário para validar por código de 6 dígitos */}
              <form onSubmit={handleVerifyWithCode} className="space-y-3 pt-1 text-left">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="verification-code"
                    className="text-xs font-medium text-foreground"
                  >
                    Código de 6 dígitos (recebido por e-mail)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="verification-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                        setVerificationCode(val)
                        if (codeError) setCodeError(null)
                      }}
                      className="h-11 rounded-xl text-center text-lg font-mono tracking-widest"
                    />
                    <Button
                      type="submit"
                      disabled={codeSubmitting || verificationCode.length !== 6}
                      className="h-11 px-4 rounded-xl text-xs font-semibold bg-[#B4540F] hover:bg-[#964208] text-white cursor-pointer"
                    >
                      {codeSubmitting ? <RotateCcw className="w-4 h-4 animate-spin" /> : 'Validar'}
                    </Button>
                  </div>
                  {codeError && (
                    <p
                      role="alert"
                      className="text-xs text-destructive flex items-center gap-1 mt-1 font-medium"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {codeError}
                    </p>
                  )}
                </div>
              </form>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground text-[11px]">
                    ou pelo link do e-mail
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <Button
                  onClick={handleCheckVerified}
                  disabled={loading}
                  variant="outline"
                  className="w-full h-11 rounded-xl text-sm font-semibold border-border text-foreground hover:bg-muted cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 animate-spin" /> Atualizando sessão...
                    </span>
                  ) : (
                    'Já confirmei pelo link'
                  )}
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleResendVerification}
                    className="flex-1 h-11 rounded-xl text-xs font-semibold border-border cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Aguarde ${resendCooldown}s` : 'Reenviar e-mail'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setVerificationWarning(null)
                      setCodeError(null)
                      setVerificationCode('')
                      setMode('signup')
                    }}
                    className="flex-1 h-11 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Trocar e-mail
                  </Button>
                </div>

                <p className="text-[11px] text-muted-foreground pt-1">
                  Não recebeu? Lembre-se de verificar sua pasta de <strong>spam</strong> ou{' '}
                  <strong>lixo eletrônico</strong>. O código expira em 10 minutos.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
