import type { paths } from "../../api/schema";

// Payout methods for Bangladesh (spec §7.6). The API knows two types: "bank" (bank transfer) and
// "mobile_wallet" (mobile financial services). The label is the provider or bank name the
// store pays through ("bKash", "City Bank"), so wallets pick theirs from the list below.

export type PayoutMethodBody =
  paths["/v1/affiliate/payout-methods"]["post"]["requestBody"]["content"]["application/json"];
export type PayoutMethodType = PayoutMethodBody["type"];

export const PAYOUT_METHOD_TYPES: PayoutMethodType[] = ["mobile_wallet", "bank"];
export const BD_WALLETS = ["bKash", "Nagad", "Rocket", "Upay"] as const;
export const MAX_PAYOUT_METHODS = 5;

const str = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
};

// A Bangladeshi mobile number as 01XXXXXXXXX (11 digits; operators 013–019). Accepts spaces,
// dashes and a +880 / 880 country prefix.
export function normalizeBdMobile(raw: string): string | null {
  let digits = raw.replace(/[\s()-]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("880")) digits = `0${digits.slice(3)}`;
  return /^01[3-9]\d{8}$/.test(digits) ? digits : null;
}

// Bank account numbers: digits only, 6–20 of them.
export function normalizeAccountNumber(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, "");
  return /^\d{6,20}$/.test(digits) ? digits : null;
}

export const isWallet = (v: string): v is (typeof BD_WALLETS)[number] => (BD_WALLETS as readonly string[]).includes(v);

// The posted add form → the API body, or per-field error codes (affiliate.errors.* first, then
// the shared forms.errors.*). `values` holds what to put back in the form after an error.
export function readPayoutMethod(form: FormData): {
  values: Record<string, string>;
  errors: Record<string, string>;
  body?: PayoutMethodBody;
} {
  const type = str(form, "type") === "bank" ? "bank" : "mobile_wallet";
  const accountName = str(form, "accountName");
  const isDefault = form.get("isDefault") === "on";
  const values: Record<string, string> = { type, accountName };
  const errors: Record<string, string> = {};
  if (!accountName) errors.accountName = "required";
  else if (accountName.length > 100) errors.accountName = "tooLong";

  if (type === "mobile_wallet") {
    const provider = str(form, "provider");
    const wallet = str(form, "walletNumber");
    Object.assign(values, { provider, walletNumber: wallet });
    if (!isWallet(provider)) errors.provider = "required";
    const walletNumber = normalizeBdMobile(wallet);
    if (!wallet) errors.walletNumber = "required";
    else if (!walletNumber) errors.walletNumber = "walletNumberInvalid";
    if (Object.keys(errors).length) return { values, errors };
    return {
      values,
      errors,
      body: { type, label: provider, details: { accountName, walletNumber: walletNumber! }, isDefault },
    };
  }

  const bankName = str(form, "bankName");
  const account = str(form, "accountNumber");
  const branch = str(form, "branch");
  const routing = str(form, "routingNumber");
  Object.assign(values, { bankName, accountNumber: account, branch, routingNumber: routing });
  if (!bankName) errors.bankName = "required";
  else if (bankName.length > 60) errors.bankName = "tooLong";
  const accountNumber = normalizeAccountNumber(account);
  if (!account) errors.accountNumber = "required";
  else if (!accountNumber) errors.accountNumber = "accountNumberInvalid";
  if (branch.length > 100) errors.branch = "tooLong";
  const routingNumber = routing.replace(/[\s-]/g, "");
  if (routingNumber && !/^\d{9}$/.test(routingNumber)) errors.routingNumber = "routingNumberInvalid";
  if (Object.keys(errors).length) return { values, errors };
  return {
    values,
    errors,
    body: {
      type,
      label: bankName,
      details: {
        accountName,
        accountNumber: accountNumber!,
        bankName,
        ...(branch ? { branch } : {}),
        ...(routingNumber ? { routingNumber } : {}),
      },
      isDefault,
    },
  };
}

// The edit form: a wallet can switch provider, a bank account can be renamed. Account numbers
// can't change (they're stored encrypted and never sent back): add a new method instead.
export function readPayoutLabel(form: FormData): { label?: string; error?: string } {
  const type = str(form, "type");
  const label = str(form, type === "mobile_wallet" ? "provider" : "bankName");
  if (!label) return { error: "required" };
  if (type === "mobile_wallet" && !isWallet(label)) return { error: "required" };
  if (label.length > 60) return { error: "tooLong" };
  return { label };
}
