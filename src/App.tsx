import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from '@/lib/context'
import { AuthProvider } from '@/lib/auth/AuthContext'
import { Toaster } from '@/components/ui/toaster'
import Layout from '@/components/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'

import Index from '@/pages/Index'
import ModulosPage from '@/pages/Modulos'
import EscritaPage from '@/pages/Escrita'
import LeituraPage from '@/pages/Leitura'
import TreinoPage from '@/pages/Treino'
import EstudosPage from '@/pages/Estudos'
import TrabalhoPage from '@/pages/Trabalho'
import ResumoPage from '@/pages/Resumo'
import MaisPage from '@/pages/Mais'
import NotFound from '@/pages/NotFound'
import { RedefinirSenhaPage } from '@/pages/RedefinirSenha'
import { ConfirmarEmailPage } from '@/pages/ConfirmarEmail'
import { TermosPage } from '@/pages/Termos'
import { PrivacidadePage } from '@/pages/Privacidade'

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <Routes>
              {/* Páginas autônomas */}
              <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
              <Route path="/confirmar-email" element={<ConfirmarEmailPage />} />
              <Route path="/termos" element={<TermosPage />} />
              <Route path="/privacidade" element={<PrivacidadePage />} />

              <Route path="/" element={<Layout />}>
                <Route index element={<Index />} />
                <Route path="modulos" element={<ModulosPage />} />
                <Route path="escrita" element={<EscritaPage />} />
                <Route path="leitura" element={<LeituraPage />} />
                <Route path="treino" element={<TreinoPage />} />
                <Route path="estudos" element={<EstudosPage />} />
                <Route path="trabalho" element={<TrabalhoPage />} />
                <Route path="resumo" element={<ResumoPage />} />
                <Route path="mais" element={<MaisPage />} />
                <Route path="404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster />
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
