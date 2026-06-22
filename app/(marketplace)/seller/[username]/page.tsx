import { notFound } from "next/navigation";

/**
 * ANON: public seller profiles are retired. Buyers never see seller identity
 * anywhere — the D&D authentication/evaluation guarantee carries trust instead.
 * Any /seller/<username> request now resolves to the (marketplace) route group's
 * not-found.tsx (in-chrome "retired" UI), and the route is no longer indexed.
 */
export default function SellerProfilePage(): never {
  notFound();
}
