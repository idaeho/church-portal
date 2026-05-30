export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/offerings/:path*",
    "/expenses/:path*",
    "/weekly-report/:path*",
    "/account-book/:path*",
    "/admin/:path*",
    "/income/:path*",
    "/expense-view/:path*",
    "/account-mgmt/:path*",
  ],
};
