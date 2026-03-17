'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  titleSuffix?: ReactNode;
  actions?: ReactNode;
  contentBelow?: ReactNode;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  backHref?: string;
  className?: string;
};

type NavIconButtonProps = {
  ariaLabel: string;
  onPress: () => void;
  children: ReactNode;
};

const titleClassName =
  'text-3xl sm:text-4xl font-bold neon-glow text-purple-400 break-words';
const navButtonClassName =
  'inline-flex h-11 w-11 items-center justify-center rounded-full border border-purple-500/30 bg-slate-900/70 text-purple-300 transition-all hover:border-purple-400 hover:bg-purple-500/10 hover:text-purple-200';

function NavIconButton({ ariaLabel, onPress, children }: NavIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={onPress}
      className={navButtonClassName}
    >
      {children}
    </button>
  );
}

function BackIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 12 8.954-8.955a1.125 1.125 0 0 1 1.591 0L21.75 12M4.5 9.75v9.375c0 .621.504 1.125 1.125 1.125H9.75v-4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v4.125h4.125c.621 0 1.125-.504 1.125-1.125V9.75"
      />
    </svg>
  );
}

export function PageHeader({
  title,
  subtitle,
  titleSuffix,
  actions,
  contentBelow,
  showBackButton = false,
  showHomeButton = false,
  backHref = '/',
  className = '',
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1 && typeof router.back === 'function') {
      router.back();
      return;
    }

    router.push(backHref);
  };

  const hasNav = showBackButton || showHomeButton;

  return (
    <header className={`mb-8 space-y-4 ${className}`.trim()}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {hasNav && (
            <div className="mb-4 flex items-center gap-2">
              {showBackButton && (
                <NavIconButton ariaLabel="返回上一页" onPress={handleBack}>
                  <BackIcon />
                </NavIconButton>
              )}
              {showHomeButton && (
                <NavIconButton ariaLabel="回到首页" onPress={() => router.push('/')}>
                  <HomeIcon />
                </NavIconButton>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <h1 className={titleClassName}>{title}</h1>
            {titleSuffix}
          </div>

          {subtitle && (
            <div className="mt-1.5 text-sm text-slate-400 sm:text-base">{subtitle}</div>
          )}
        </div>

        {actions && <div className="w-full shrink-0 sm:w-auto">{actions}</div>}
      </div>

      {contentBelow}
    </header>
  );
}
