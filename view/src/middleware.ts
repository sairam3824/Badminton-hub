export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/matches/:path*",
    "/players/:path*",
    "/stats/:path*",
    "/venues/:path*",
    "/teams/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
  ],
};
