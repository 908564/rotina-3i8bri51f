/* Layout Component - A component that wraps the main content of the app
   - Use this file to add a header, footer, or other elements that should be present on every page
   - This component is used in the App.tsx file to wrap the main content of the app */

import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-200">
      <main className="flex-1 pb-24 pt-[env(safe-area-inset-top,0px)] px-4 sm:px-6 max-w-4xl mx-auto w-full">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
