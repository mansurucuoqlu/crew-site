import nacl from "tweetnacl";
import bs58 from "bs58";

function checkSignature(message: string, signature: string, wallet: string) {
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

  return checkSignature(message, signature, wallet);
}

// Checks "CREW vote | Wallet: X | Submission: 5 | Time: 123" was signed by X,
// is recent, and is for this exact submission
export function verifyVoteMessage(
  wallet: string,
  rawMessage: string,
  signature: string,
  submissionId: number,
  maxAgeMs: number
): boolean {
  const message = rawMessage.replace(/\r\n/g, "\n");
  const match = message.match(
    /^CREW vote \| Wallet: (\w+) \| Submission: (\d+) \| Time: (\d+)$/
  );
  if (!match || match[1] !== wallet || Number(match[2]) !== submissionId) return false;
  if (Date.now() - Number(match[3]) > maxAgeMs) return false;

  return checkSignature(message, signature, wallet);
}
