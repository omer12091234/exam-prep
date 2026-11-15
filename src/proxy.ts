import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { deployedWithoutAuth, isDemo } from "@/lib/demo";

/** Refreshes the Supabase session cookie and gates everything except /login. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (deployedWithoutAuth) {
    return new NextResponse(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the Vercel project settings.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }
  if (isDemo) return response; // no Supabase configured → local demo, no auth
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data } = await supabase.auth.getClaims();
  const path = request.nextUrl.pathname;
  if (!data?.claims && !path.startsWith("/login") && !path.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|webp|svg)$).*)"],
};
