interface Env {
  ASSETS: Fetcher
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/health') {
      return Response.json({
        ok: true,
        service: "apoorvs-chess",
        runtime: "cloudflare-workers",
        timestamp: new Date().toISOString(),
      })
    }
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
