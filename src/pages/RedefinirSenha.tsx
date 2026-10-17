import React, { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth/AuthContext'
import { evaluatePasswordStrength } from '@/lib/auth/passwordValidation'
import { useToast } from '@/hooks/use-toast'
import { KeyRound, CheckCircle2, AlertCircle } from 'lucide-react'

export const RedefinirSenhaPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const { confirmPasswordReset } = useAuth()
  const { toast } = useToast()

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const strength = evaluatePasswordStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      toast({
        title: 'Token inválido',
        description: 'O link de redefinição expirou ou é inválido.',
        variant: 'destructive',
      })
      return
    }

    if (password !== passwordConfirm) {
      toast({
        title: 'Senhas diferentes',
        description: 'A confirmação deve ser idêntica à nova senha.',
        variant: 'destructive',
      })
      return
    }

    if (!strength.isValid) {
      toast({
        title: 'Senha fraca ou inválida',
        description: strength.isTooShort
          ? 'Mínimo de 10 caracteres.'
          : 'Esta senha é muito comum. Escolha uma senha mais forte.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    const { error } = await confirmPasswordReset(token, password)
    setLoading(false)

    if (error) {
      toast({
        title: 'Falha ao redefinir',
        description: 'O link de redefinição pode ter expirado. Solicite outro.',
        variant: 'destructive',
      })
      return
    }

    setSuccess(true)
    toast({
      title: 'Senha alterada!',
      description: 'Sua senha foi atualizada com sucesso.',
    })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl border-border bg-card shadow-lg">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-[#F59E4C]/10 text-[#F59E4C] flex items-center justify-center mx-auto">
            <KeyRound className="w-6 h-6" />
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-foreground">Redefinir Senha</h1>
            <p className="text-xs text-muted-foreground">
              Crie uma nova senha de no mínimo 10 caracteres para sua conta Rotina.
            </p>
          </div>

          {success ? (
            <div className="text-center space-y-4 pt-2">
              <div className="flex items-center justify-center gap-2 text-emerald-500 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                Senha redefinida com sucesso!
              </div>
              <Button
                onClick={() => navigate('/')}
                className="w-full h-12 rounded-xl text-sm font-semibold bg-[#F59E4C] hover:bg-[#F59E4C]/90 text-white"
              >
                Ir para o aplicativo
              </Button>
            </div>
          ) : !token ? (
            <div className="text-center space-y-4 pt-2">
              <div className="flex items-center justify-center gap-2 text-red-500 text-sm">
                <AlertCircle className="w-5 h-5" />
                Link inválido ou sem token.
              </div>
              <Button asChild variant="outline" className="w-full h-11 rounded-xl text-xs">
                <Link to="/">Voltar ao início</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-xs font-medium">
                  Nova senha
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  placeholder="Mínimo 10 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl text-sm"
                />
                {password && (
                  <div className="text-[11px] pt-1 flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Força:{' '}
                      <strong
                        className={
                          strength.score >= 3
                            ? 'text-emerald-500'
                            : strength.score >= 2
                              ? 'text-amber-500'
                              : 'text-red-500'
                        }
                      >
                        {strength.label}
                      </strong>
                    </span>
                    {strength.isTooCommon && (
                      <span className="text-red-500 font-medium">Muito comum!</span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-xs font-medium">
                  Confirmar nova senha
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  placeholder="Repita a nova senha"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="h-11 rounded-xl text-sm"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-sm font-semibold bg-[#F59E4C] hover:bg-[#F59E4C]/90 text-white mt-2"
              >
                {loading ? 'Salvando nova senha...' : 'Salvar nova senha'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
