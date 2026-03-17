import type { Metadata } from 'next';
import { SwaggerUi } from './swagger-ui';

export const metadata: Metadata = {
  title: 'API 文档',
  description: '赛事记分工具 Swagger / OpenAPI 文档',
};

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a_0%,#020617_48%,#000000_100%)] px-4 py-8 text-slate-100 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="relative overflow-hidden rounded-3xl border border-cyan-400/25 bg-slate-900/70 p-6 shadow-[0_0_60px_rgba(34,211,238,0.12)] backdrop-blur md:p-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="mb-2 text-xs uppercase tracking-[0.45em] text-cyan-300/80">
                OpenAPI Console
              </p>
              <h1 className="text-3xl font-semibold text-white md:text-5xl">
                赛事记分工具 API 文档
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                这里展示当前项目的接口列表、请求体、统一响应结构和鉴权方式。受保护接口依赖
                `game_score_session` Cookie。
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <a
                href="/api/openapi"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-4 py-2 text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-400/20"
              >
                查看原始 OpenAPI JSON
              </a>
            </div>
          </div>
        </section>

        <SwaggerUi specUrl="/api/openapi" />
      </div>
    </main>
  );
}
