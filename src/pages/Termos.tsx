import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Shield } from 'lucide-react'

export const TermosPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-8 flex justify-center">
      <Card className="w-full max-w-2xl rounded-2xl border-border bg-card shadow-sm">
        <CardContent className="p-6 sm:p-10 space-y-6">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="rounded-xl">
              <Link to="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#F59E4C]" />
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Termos de Uso</h1>
            </div>
          </div>

          <div className="inline-block px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-semibold">
            Texto provisório — marcado para revisão jurídica
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <p>
              Bem-vindo ao <strong>Rotina</strong>. Ao acessar ou usar nosso aplicativo com sua
              conta, você concorda com estes termos.
            </p>
            <h2 className="text-base font-semibold text-foreground pt-2">1. Uso do Serviço</h2>
            <p>
              O aplicativo oferece organização pessoal local-first e sincronização em nuvem para
              notas, leituras, estudos, treinos e projetos. O uso é pessoal e intransferível.
            </p>
            <h2 className="text-base font-semibold text-foreground pt-2">
              2. Acesso Fechado e Convites
            </h2>
            <p>
              Nesta fase de desenvolvimento, o cadastro é restrito a convidados autorizados.
              Reservamo-nos o direito de limitar o acesso ou revogar contas que violem regras de uso
              aceitável.
            </p>
            <h2 className="text-base font-semibold text-foreground pt-2">
              3. Seus Dados e Conteúdo
            </h2>
            <p>
              Você é o proprietário de todo o conteúdo gerado (notas, dados de estudo, registros).
              Não comercializamos suas informações pessoais. Você pode exportar ou excluir sua conta
              e registros a qualquer momento.
            </p>
            <h2 className="text-base font-semibold text-foreground pt-2">
              4. Isenção e Disponibilidade
            </h2>
            <p>
              O serviço funciona em modo local-first: seus dados continuam gravados no seu navegador
              mesmo sem conexão. A sincronização na nuvem é fornecida no estado em que se encontra,
              com backups recomendados.
            </p>
          </div>

          <div className="pt-4 border-t border-border">
            <Button asChild variant="outline" className="w-full sm:w-auto rounded-xl">
              <Link to="/">Voltar ao início</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
