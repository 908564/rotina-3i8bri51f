import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/AuthContext'
import { CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react'

export const ConfirmarEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const { confirmVerification } = useAuth()

  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setErrorMsg('Token de verificação ausente ou link inválido.')
      return
    }

    confirmVerification(token).then(({ error }) => {
      setLoading(false)
      if (error) {
        setErrorMsg(
          'Link de confirmação inválido ou expirado. Você pode solicitar um novo e-mail pelo app.',
        )
      } else {
        setSuccess(true)
      }
    })
  }, [token, confirmVerification])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl border-border bg-card shadow-lg">
        <CardContent className="p-6 sm:p-8 space-y-6 text-center">
          {loading ? (
            <div className="space-y-4 py-8">
              <Loader2 className="w-8 h-8 text-[#F59E4C] animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Validando seu e-mail...</p>
            </div>
          ) : success ? (
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-foreground">E-mail verificado!</h1>
                <p className="text-xs text-muted-foreground">
                  Sua conta está ativa e a sincronização na nuvem já está disponível.
                </p>
              </div>
              <Button
                onClick={() => navigate('/')}
                className="w-full h-12 rounded-xl text-sm font-semibold bg-[#F59E4C] hover:bg-[#F59E4C]/90 text-white"
              >
                Abrir o aplicativo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-foreground">Link inválido ou expirado</h1>
                <p className="text-xs text-muted-foreground leading-relaxed">{errorMsg}</p>
              </div>
              <Button
                asChild
                className="w-full h-12 rounded-xl text-sm font-semibold bg-[#F59E4C] hover:bg-[#F59E4C]/90 text-white"
              >
                <Link to="/">Voltar ao aplicativo</Link>
              </Button>
              <Button asChild variant="outline" className="w-full h-11 rounded-xl text-xs">
                <Link to="/mais">Ir para Minha Conta</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
