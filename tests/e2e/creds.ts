import { readFileSync } from "node:fs";

function read(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

const adminFile = read(".admin-credentials.local");
const testFile = read("test-accounts.secrets.local");

const adminPw = adminFile.match(/Password:\s*(\S+)/)?.[1] ?? "";
const sharedPw = testFile.match(/Shared password[^:]*:\s*(\S+)/)?.[1] ?? "";

export const ADMIN = {
  email: "dndadmin@dndluxury.co.za",
  password: adminPw,
};
export const VERIFIED_SELLER = {
  email: "seller-verified@dndluxury.co.za",
  password: sharedPw,
};
export const PENDING_SELLER = {
  email: "seller-pending@dndluxury.co.za",
  password: sharedPw,
};
export const BUYER = {
  email: "buyer@dndluxury.co.za",
  password: sharedPw,
};
