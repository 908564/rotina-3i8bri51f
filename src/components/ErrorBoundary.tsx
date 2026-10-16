import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log do erro no console para diagnóstico por testers e desenvolvedores
    console.error('ErrorBoundary capturou um erro não tratado:', error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background text-foreground">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-lg text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                Algo deu errado nesta tela
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Ocorreu um erro inesperado na visualização. Seus dados continuam salvos no seu
                aparelho.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-muted/60 border border-border/70 text-left">
                <p className="text-[11px] font-mono text-muted-foreground break-all line-clamp-3">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                onClick={this.handleReload}
                className="w-full sm:w-auto h-11 px-5 rounded-xl bg-[#F59E4C] hover:bg-[#F59E4C]/90 text-white font-semibold text-xs gap-2"
              >
                <RotateCw className="w-4 h-4" /> Recarregar aplicativo
              </Button>
              <Button
                variant="outline"
                onClick={this.handleReset}
                className="w-full sm:w-auto h-11 px-4 rounded-xl text-xs font-semibold"
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
