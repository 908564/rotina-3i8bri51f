import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Lock } from 'lucide-react'

export const PrivacidadePage: React.FC = () => {
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
              <Lock className="w-5 h-5 text-[#34BEAA]" />
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Política de Privacidade
              </h1>
            </div>
          </div>

          <div className="inline-block px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-semibold">
            Texto provisório — marcado para revisão jurídica
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <p>
              A sua privacidade é prioridade fundamental no <strong>Rotina</strong>. Esta política
              descreve como tratamos seus dados pessoais e registros locais e em nuvem.
            </p>
            <h2 className="text-base font-semibold text-foreground pt-2">
              1. Armazenamento Local-First
            </h2>
            <p>
              O Rotina opera primariamente no seu dispositivo através do IndexedDB. Mesmo sem
              conexão à internet ou sem conta, seus dados residem no seu navegador.
            </p>
            <h2 className="text-base font-semibold text-foreground pt-2">
              2. Sincronização na Nuvem
            </h2>
            <p>
              Quando você opta por criar e verificar uma conta na nuvem, seus registros e arquivos
              anexos são sincronizados de forma criptografada em trânsito com a instância de nuvem
              PocketBase dedicada. Nenhum outro usuário tem acesso aos seus registros ou arquivos.
            </p>
            <h2 className="text-base font-semibold text-foreground pt-2">
              3. Não Rastreamento e Logs
            </h2>
            <p>
              Não gravamos senhas, tokens de autorização ou conteúdos confidenciais em logs de
              servidor. Não vendemos nem compartilhamos seus dados com corretores de dados ou
              plataformas de publicidade.
            </p>
            <h2 className="text-base font-semibold text-foreground pt-2">
              4. Exclusão de Conta e Dados
            </h2>
            <p>
              Você tem direito total sobre seus dados. Ao acionar a exclusão de conta em Mais &gt;
              Conta, todos os registros e arquivos associados ao seu identificador são removidos
              imediatamente em cascata dos servidores da nuvem.
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
