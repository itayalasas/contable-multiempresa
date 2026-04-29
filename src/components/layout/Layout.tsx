import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile) return;
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen, isMobile]);

  useEffect(() => {
    const handleFormKeydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== 'Enter') return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target.isContentEditable) return;

      const tagName = target.tagName.toLowerCase();
      if (tagName === 'textarea') return;
      if (tagName === 'button') return;

      const inputType = (target as HTMLInputElement).type;
      if (inputType === 'submit') return;

      const form = target.closest('form');
      if (!form) return;

      event.preventDefault();

      const focusable = Array.from(
        form.querySelectorAll<HTMLElement>(
          'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
        )
      ).filter(el => {
        if (el.tabIndex === -1) return false;
        const rects = el.getClientRects();
        return rects.length > 0;
      });

      const currentIndex = focusable.indexOf(target);
      const nextElement = focusable[currentIndex + 1];

      if (nextElement) {
        nextElement.focus();
        return;
      }

      if (typeof (form as HTMLFormElement).requestSubmit === 'function') {
        (form as HTMLFormElement).requestSubmit();
      }
    };

    document.addEventListener('keydown', handleFormKeydown, true);
    return () => document.removeEventListener('keydown', handleFormKeydown, true);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} isMobile={isMobile} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-x-auto overflow-y-auto bg-gray-50 p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="max-w-[1920px] mx-auto">
            {children}
          </div>
        </main>

        <footer className="bg-white border-t border-gray-200 py-4 px-6">
          <div className="max-w-[1920px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">ContaEmpresa</span>
              <span className="text-xs text-gray-500">v2.0.0</span>
            </div>
            <div className="text-xs text-gray-500">
              Sistema Multi-País
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
