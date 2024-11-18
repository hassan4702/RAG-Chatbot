export { default } from "next-auth/middleware";

export const config = { matcher: ["/", "/pdf", "/chat/:id*", "/dashboard"] };
