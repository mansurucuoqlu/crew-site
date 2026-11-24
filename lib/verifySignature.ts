import nacl from "tweetnacl";
import bs58 from "bs58";

// Checks a message like "CREW mod | Wallet: X | Time: 123" was signed by X and is recent
export function verifySignedMessage(
  wallet: string,
  rawMessage: string,
  signature: string,
  prefix: string,
  maxAgeMs: number
): boolean {
  const message = rawMessage.replace(/\r\n/g, "\n");
  const match = message.match(
    new RegExp(`^${prefix} \\| Wallet: (\\w+) \\| Time: (\\d+)$`)
  );
  if (!match || match[1] !== wallet) return false;
  if (Date.now() - Number(match[2]) > maxAgeMs) return false;

  try {
    return nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      bs58.decode(signature),
      bs58.decode(wallet)
    );
  } catch {
    return false;
  }
}