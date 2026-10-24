import "server-only";
import { createHash } from "node:crypto";
import { ACCOUNT_META, type Difficulty } from "./shared";

// Partie secrète du challenge : pour chaque compte (par id), le mot de passe en
// clair et le schéma qui l'obfusque. Rien ici ne doit être envoyé au client :
// la page n'expose que la valeur obfusquée, au joueur de retrouver le schéma.
//
// - Pour les encodages et chiffrements (base64, César, Vigenère…), le mot de
//   passe peut être n'importe quel mot : il se retrouve en inversant le schéma.
// - Pour les hash (MD5, SHA…), le mot de passe est volontairement un mot de
//   passe courant, donc retrouvable via une liste (brute force par dictionnaire).

type Scheme =
  | { kind: "base64" }
  | { kind: "base64x2" }
  | { kind: "hex" }
  | { kind: "base32" }
  | { kind: "caesar"; shift: number }
  | { kind: "rot13" }
  | { kind: "rot47" }
  | { kind: "atbash" }
  | { kind: "reverse" }
  | { kind: "ascii-dec" }
  | { kind: "binary" }
  | { kind: "octal" }
  | { kind: "morse" }
  | { kind: "vigenere"; key: string }
  | { kind: "xor"; key: number }
  | { kind: "md5" }
  | { kind: "sha1" }
  | { kind: "sha256" }
  | { kind: "sha512" };

type Secret = { plaintext: string; scheme: Scheme };

// --- Encodeurs (mot de passe en clair -> valeur montrée au joueur) ---

const shiftLetters = (text: string, shift: number) =>
  text.replace(/[a-z]/gi, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + shift) % 26 + 26) % 26 + base);
  });

const atbash = (text: string) =>
  text.replace(/[a-z]/gi, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(base + 25 - (c.charCodeAt(0) - base));
  });

const vigenere = (text: string, key: string) => {
  let i = 0;
  return text.replace(/[a-z]/gi, (c) => {
    const base = c <= "Z" ? 65 : 97;
    const k = key[i++ % key.length].toLowerCase().charCodeAt(0) - 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + k) % 26) + base);
  });
};

const rot47 = (text: string) =>
  text.replace(/[\x21-\x7e]/g, (c) => String.fromCharCode(33 + ((c.charCodeAt(0) - 33 + 47) % 94)));

const base32 = (text: string) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of Buffer.from(text, "utf8")) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  while (out.length % 8) out += "=";
  return out;
};

const MORSE: Record<string, string> = {
  a: ".-", b: "-...", c: "-.-.", d: "-..", e: ".", f: "..-.", g: "--.", h: "....",
  i: "..", j: ".---", k: "-.-", l: ".-..", m: "--", n: "-.", o: "---", p: ".--.",
  q: "--.-", r: ".-.", s: "...", t: "-", u: "..-", v: "...-", w: ".--", x: "-..-",
  y: "-.--", z: "--..", "0": "-----", "1": ".----", "2": "..---", "3": "...--",
  "4": "....-", "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
};
const morse = (text: string) =>
  text.toLowerCase().split("").map((c) => MORSE[c] ?? c).join(" ");

const xorHex = (text: string, key: number) =>
  [...Buffer.from(text, "utf8")].map((b) => (b ^ key).toString(16).padStart(2, "0")).join("");

const perChar = (text: string, radix: number, pad: number) =>
  text.split("").map((c) => c.charCodeAt(0).toString(radix).padStart(pad, "0")).join(" ");

function encode(scheme: Scheme, plain: string): string {
  switch (scheme.kind) {
    case "base64": return Buffer.from(plain, "utf8").toString("base64");
    case "base64x2": return Buffer.from(Buffer.from(plain, "utf8").toString("base64"), "utf8").toString("base64");
    case "hex": return Buffer.from(plain, "utf8").toString("hex");
    case "base32": return base32(plain);
    case "caesar": return shiftLetters(plain, scheme.shift);
    case "rot13": return shiftLetters(plain, 13);
    case "rot47": return rot47(plain);
    case "atbash": return atbash(plain);
    case "reverse": return plain.split("").reverse().join("");
    case "ascii-dec": return perChar(plain, 10, 0);
    case "binary": return perChar(plain, 2, 8);
    case "octal": return perChar(plain, 8, 0);
    case "morse": return morse(plain);
    case "vigenere": return vigenere(plain, scheme.key);
    case "xor": return xorHex(plain, scheme.key);
    case "md5":
    case "sha1":
    case "sha256":
    case "sha512": return createHash(scheme.kind).update(plain).digest("hex");
  }
}

// Comptes, dans l'ordre des id (1..40) de ACCOUNT_META.
const SECRETS: Secret[] = [
  // --- Facile : encodages et chiffrements classiques ---
  { plaintext: "sunshine", scheme: { kind: "base64" } },
  { plaintext: "dragon", scheme: { kind: "caesar", shift: 3 } },
  { plaintext: "monkey", scheme: { kind: "hex" } },
  { plaintext: "shadow", scheme: { kind: "reverse" } },
  { plaintext: "qwerty", scheme: { kind: "rot13" } },
  { plaintext: "letmein", scheme: { kind: "atbash" } },
  { plaintext: "baseball", scheme: { kind: "ascii-dec" } },
  { plaintext: "football", scheme: { kind: "binary" } },
  { plaintext: "superstar", scheme: { kind: "base32" } },
  { plaintext: "mustang", scheme: { kind: "octal" } },
  { plaintext: "flower", scheme: { kind: "caesar", shift: 7 } },
  { plaintext: "orange", scheme: { kind: "rot13" } },
  { plaintext: "purple", scheme: { kind: "reverse" } },
  { plaintext: "yellow", scheme: { kind: "hex" } },
  // --- Moyen : hash de mots de passe courants, et chiffrements moins directs ---
  { plaintext: "password", scheme: { kind: "md5" } },
  { plaintext: "123456", scheme: { kind: "md5" } },
  { plaintext: "iloveyou", scheme: { kind: "sha1" } },
  { plaintext: "princess", scheme: { kind: "sha1" } },
  { plaintext: "welcome", scheme: { kind: "md5" } },
  { plaintext: "abc123", scheme: { kind: "sha1" } },
  { plaintext: "trustno1", scheme: { kind: "md5" } },
  { plaintext: "batman", scheme: { kind: "sha1" } },
  { plaintext: "secret", scheme: { kind: "rot47" } },
  { plaintext: "hunter", scheme: { kind: "morse" } },
  { plaintext: "cookie", scheme: { kind: "xor", key: 42 } },
  { plaintext: "ginger", scheme: { kind: "vigenere", key: "key" } },
  { plaintext: "pepper", scheme: { kind: "base64x2" } },
  { plaintext: "summer", scheme: { kind: "rot47" } },
  { plaintext: "jordan", scheme: { kind: "xor", key: 99 } },
  { plaintext: "maggie", scheme: { kind: "vigenere", key: "lemon" } },
  // --- Difficile : hash plus longs, Vigenère à clé longue ---
  { plaintext: "computer", scheme: { kind: "sha256" } },
  { plaintext: "michael", scheme: { kind: "sha256" } },
  { plaintext: "jennifer", scheme: { kind: "sha512" } },
  { plaintext: "thomas", scheme: { kind: "sha256" } },
  { plaintext: "chelsea", scheme: { kind: "sha512" } },
  { plaintext: "amanda", scheme: { kind: "sha256" } },
  { plaintext: "charlie", scheme: { kind: "vigenere", key: "crypto" } },
  { plaintext: "daniel", scheme: { kind: "sha512" } },
  { plaintext: "hannah", scheme: { kind: "sha256" } },
  { plaintext: "jessica", scheme: { kind: "sha512" } },
];

// Les deux listes doivent décrire les mêmes comptes (une par id).
if (SECRETS.length !== ACCOUNT_META.length)
  throw new Error(`Cryptobrute : ${ACCOUNT_META.length} comptes publics mais ${SECRETS.length} secrets.`);

const byId = new Map(ACCOUNT_META.map((m, i) => [m.id, SECRETS[i]]));

export type PublicAccount = { id: number; username: string; cipher: string; difficulty: Difficulty };

// Vue envoyée au client : identifiant, valeur obfusquée, difficulté. Pas de schéma.
export function publicAccounts(): PublicAccount[] {
  return ACCOUNT_META.map((m, i) => ({
    id: m.id,
    username: m.username,
    difficulty: m.difficulty,
    cipher: encode(SECRETS[i].scheme, SECRETS[i].plaintext),
  }));
}

/** Vrai si le mot de passe proposé est celui du compte (comparaison exacte). */
export function verifyPassword(id: number, guess: string) {
  const s = byId.get(id);
  return !!s && guess === s.plaintext;
}
