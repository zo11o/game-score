'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    SwaggerUIBundle?: (options: {
      url: string;
      domNode: HTMLElement;
      deepLinking: boolean;
      displayRequestDuration: boolean;
      docExpansion: 'list' | 'full' | 'none';
      defaultModelsExpandDepth: number;
      tryItOutEnabled: boolean;
    }) => void;
  }
}

const SWAGGER_UI_SCRIPT_ID = 'swagger-ui-bundle';
const SWAGGER_UI_STYLE_ID = 'swagger-ui-style';
const SWAGGER_UI_SCRIPT_SRC =
  'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js';
const SWAGGER_UI_STYLE_HREF =
  'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css';

function ensureSwaggerStyle() {
  if (document.getElementById(SWAGGER_UI_STYLE_ID)) {
    return;
  }

  const link = document.createElement('link');
  link.id = SWAGGER_UI_STYLE_ID;
  link.rel = 'stylesheet';
  link.href = SWAGGER_UI_STYLE_HREF;
  document.head.appendChild(link);
}

function loadSwaggerScript() {
  if (window.SwaggerUIBundle) {
    return Promise.resolve();
  }

  const existingScript = document.getElementById(
    SWAGGER_UI_SCRIPT_ID
  ) as HTMLScriptElement | null;

  if (existingScript?.dataset.loaded === 'true') {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const handleLoad = () => {
      script.dataset.loaded = 'true';
      resolve();
    };

    const handleError = () => {
      reject(new Error('Failed to load Swagger UI bundle'));
    };

    const script =
      existingScript ??
      Object.assign(document.createElement('script'), {
        id: SWAGGER_UI_SCRIPT_ID,
        src: SWAGGER_UI_SCRIPT_SRC,
        async: true,
      });

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (!existingScript) {
      document.body.appendChild(script);
    }
  });
}

export function SwaggerUi({ specUrl }: { specUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    ensureSwaggerStyle();

    loadSwaggerScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.SwaggerUIBundle) {
          return;
        }

        window.SwaggerUIBundle({
          url: specUrl,
          domNode: containerRef.current,
          deepLinking: true,
          displayRequestDuration: true,
          docExpansion: 'list',
          defaultModelsExpandDepth: 1,
          tryItOutEnabled: true,
        });
        setIsReady(true);
      })
      .catch((loadError) => {
        console.error(loadError);
        if (!cancelled) {
          setError('Swagger UI 资源加载失败，请检查外网访问或稍后重试。');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [specUrl]);

  return (
    <div className="relative min-h-[65vh] rounded-3xl border border-cyan-400/25 bg-slate-950/80 shadow-[0_0_40px_rgba(34,211,238,0.12)]">
      {!isReady && !error ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-slate-950/80 text-cyan-100">
          正在加载 Swagger UI...
        </div>
      ) : null}
      {error ? (
        <div className="flex min-h-[65vh] items-center justify-center px-6 py-12 text-center text-sm text-rose-200">
          {error}
        </div>
      ) : (
        <div ref={containerRef} className="swagger-ui-wrapper min-h-[65vh] p-2" />
      )}
    </div>
  );
}
