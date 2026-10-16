/* Main App Component - Handles routing (using react-router-dom), query client and other providers - use this file to add all routes */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppProvider } from '@/lib/context'
import Index from './pages/Index'
import EscritaPage from './pages/Escrita'
import LeituraPage from './pages/Leitura'
import TreinoPage from './pages/Treino'
import EstudosPage from './pages/Estudos'
import MaisPage from './pages/Mais'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'

const App = () => (
  <AppProvider>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/escrita" element={<EscritaPage />} />
            <Route path="/leitura" element={<LeituraPage />} />
            <Route path="/treino" element={<TreinoPage />} />
            <Route path="/estudos" element={<EstudosPage />} />
            <Route path="/mais" element={<MaisPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </AppProvider>
)

export default App
