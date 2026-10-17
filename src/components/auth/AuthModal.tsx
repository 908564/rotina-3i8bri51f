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
  initialMode?: 'welcome' | 'signin' | 'signup' | 'forgot'
  onClose: () => void
  onSuccess?: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialMode = 'welcome',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'welcome' | 'signin' | 'signup' | 'forgot' | 'verify'>(
    initialMode,
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const { signIn, signUp, requestPasswordReset, requestVerification, refreshUser, user } = useAuth()
  const { toast } = useToast()

  const passwordStrength = evaluatePasswordStrength(password)

  // Submissão do login
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      toast({
        title: 'Falha no login',
        description: 'E-mail ou senha incorretos.',
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
    if (!email || !password) return

    if (!acceptedTerms) {
      toast({
        title: 'Termos e Privacidade',
        description:
          'Você precisa aceitar os Termos e a Política de Privacidade para criar uma conta.',
        variant: 'destructive',
      })
      return
    }

    if (password !== passwordConfirm) {
      toast({
        title: 'Senhas não conferem',
        description: 'A confirmação de senha é diferente da senha informada.',
        variant: 'destructive',
      })
      return
    }

    if (!passwordStrength.isValid) {
      toast({
        title: 'Senha fraca ou inválida',
        description: passwordStrength.isTooShort
          ? 'A senha deve conter no mínimo 10 caracteres.'
          : 'Esta senha é muito comum e insegura. Escolha uma senha mais forte.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    const { error, inviteRequired } = await signUp(email, password, name)
    setLoading(false)

    if (error) {
      if (inviteRequired) {
        toast({
          title: 'Acesso restrito',
          description: 'Cadastro disponível apenas para convidados no momento.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Erro ao criar conta',
          description: 'Não foi possível completar o cadastro. Verifique os dados.',
          variant: 'destructive',
        })
      }
      return
    }

    toast({
      title: 'Conta criada com sucesso!',
      description: 'Enviamos um link de confirmação para o seu e-mail.',
    })
    setMode('verify')
  }

  // Submissão de esqueci a senha
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    await requestPasswordReset(email)
    setLoading(false)

    toast({
      title: 'Link enviado!',
      description: 'Se o e-mail estiver cadastrado, você receberá um link de redefinição de senha.',
    })
    setMode('signin')
  }

  // Reenviar verificação
  const handleResendVerification = async () => {
    if (resendCooldown > 0 || !email) return
    setLoading(true)
    await requestVerification(email)
    setLoading(false)
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
                  className="w-full h-12 rounded-xl text-sm font-semibold bg-[#F59E4C] hover:bg-[#F59E4C]/90 text-white"
                >
                  Entrar com minha conta
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMode('signup')}
                  className="w-full h-12 rounded-xl text-sm font-semibold border-border"
                >
                  Criar conta (somente convidados)
                </Button>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="w-full h-11 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground"
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
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 pl-9 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password" className="text-xs font-medium">
                      Senha
                    </Label>
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-[#F59E4C] hover:underline"
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
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pl-9 rounded-xl text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-sm font-semibold bg-[#F59E4C] hover:bg-[#F59E4C]/90 text-white"
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
                <div className="flex items-center justify-between text-xs pt-2">
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Ainda não tem conta?{' '}
                    <span className="text-[#F59E4C] font-semibold">Cadastre-se</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-muted-foreground hover:text-foreground"
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
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 pl-9 rounded-xl text-sm"
                    />
                  </div>
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
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pl-9 rounded-xl text-sm"
                    />
                  </div>
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
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className="h-11 pl-9 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-1">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(val) => setAcceptedTerms(Boolean(val))}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="terms"
                    className="text-[11px] text-muted-foreground leading-tight cursor-pointer"
                  >
                    Li e aceito os{' '}
                    <Link to="/termos" target="_blank" className="text-[#F59E4C] underline">
                      Termos de Uso
                    </Link>{' '}
                    e a{' '}
                    <Link to="/privacidade" target="_blank" className="text-[#F59E4C] underline">
                      Política de Privacidade
                    </Link>
                    .
                  </Label>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-sm font-semibold bg-[#F59E4C] hover:bg-[#F59E4C]/90 text-white"
                >
                  {loading ? 'Criando conta...' : 'Criar conta'}
                </Button>
                <div className="flex items-center justify-between text-xs pt-2">
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Já tem conta? <span className="text-[#F59E4C] font-semibold">Entrar</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-muted-foreground hover:text-foreground"
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
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-sm font-semibold bg-[#F59E4C] hover:bg-[#F59E4C]/90 text-white"
                >
                  {loading ? 'Enviando...' : 'Enviar link de redefinição'}
                </Button>
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground pt-1"
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
                  <strong className="text-foreground">{email}</strong>. Abra o link no e-mail para
                  ativar a sincronização na nuvem.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <Button
                  onClick={handleCheckVerified}
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-sm font-semibold bg-[#34BEAA] hover:bg-[#34BEAA]/90 text-white"
                >
                  {loading ? 'Verificando...' : 'Já confirmei'}
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleResendVerification}
                    className="flex-1 h-11 rounded-xl text-xs font-semibold border-border"
                  >
                    {resendCooldown > 0 ? `Aguarde ${resendCooldown}s` : 'Reenviar e-mail'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setMode('signup')}
                    className="flex-1 h-11 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Trocar e-mail
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
