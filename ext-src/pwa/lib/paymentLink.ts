import bs58 from "bs58";

export type PaymentLinkPayload = {
  // Amount in SOL requested by recipient
  requestedAmount: string;
  // Unique link ID for tracking
  linkId: string;
  // optional: suggested start offset for scanning UTXOs
  offset?: number;
};

export function newPaymentLinkSecret(): Uint8Array {
  // 32 bytes is plenty; we base58-encode for URL friendliness.
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function generateLinkId(): string {
  // Generate a short unique ID for the payment link
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bs58.encode(bytes);
}

export function encodeSecretBase58(secret: Uint8Array): string {
  return bs58.encode(secret);
}

export function decodeSecretBase58(secret58: string): Uint8Array {
  return bs58.decode(secret58);
}

export function buildPaymentLinkUrl(origin: string, payload: PaymentLinkPayload) {
  const params = new URLSearchParams();
  params.set("amount", payload.requestedAmount);
  params.set("id", payload.linkId);
  if (typeof payload.offset === "number") params.set("o", String(payload.offset));
  return `${origin}/private-payments/pay?${params.toString()}`;
}

export function parsePaymentLinkPayload(url: URL): PaymentLinkPayload {
  const amount = url.searchParams.get("amount");
  const id = url.searchParams.get("id");
  if (!amount) throw new Error("Missing `amount` in payment link");
  if (!id) throw new Error("Missing `id` in payment link");
  const o = url.searchParams.get("o");
  return { requestedAmount: amount, linkId: id, offset: o ? Number(o) : undefined };
}
