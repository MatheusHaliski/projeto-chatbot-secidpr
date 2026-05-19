"use client";

const HASH_ALGORITHM = "SHA-256";
const ITERATIONS = 310000;
const SALT_LENGTH = 16;
const APP_PEPPER = "vs-usercontrol-v1";

const textEncoder = new TextEncoder();

const toBase64 = (buffer: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buffer)));

const fromBase64 = (value: string) =>
    Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const buildSalt = (salt: Uint8Array) => {
    const pepperBytes = textEncoder.encode(APP_PEPPER);
    const merged = new Uint8Array(salt.length + pepperBytes.length);
    merged.set(salt, 0);
    merged.set(pepperBytes, salt.length);
    return merged;
};

export type PasswordDigest = {
    hash: string;
    salt: string;
    iterations: number;
    hashAlgorithm: string;
};

export const createPasswordDigest = async (
    password: string
): Promise<PasswordDigest> => {
    const saltBytes = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const salt = toBase64(saltBytes.buffer);
    const hash = await hashPassword(password, salt);

    return {
        hash,
        salt,
        iterations: ITERATIONS,
        hashAlgorithm: HASH_ALGORITHM,
    };
};

export const hashPassword = async (
    password: string,
    saltBase64: string,
    iterations = ITERATIONS
): Promise<string> => {
    const passwordKey = await crypto.subtle.importKey(
        "raw",
        textEncoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
    );
    const salt = buildSalt(fromBase64(saltBase64));
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt,
            iterations,
            hash: HASH_ALGORITHM,
        },
        passwordKey,
        256
    );

    return toBase64(derivedBits);
};

export const verifyPassword = async (
    password: string,
    digest: PasswordDigest
): Promise<boolean> => {
    if (
        !digest.hash ||
        !digest.salt ||
        !digest.iterations ||
        (digest.hashAlgorithm && digest.hashAlgorithm !== HASH_ALGORITHM)
    ) {
        return false;
    }

    const candidate = await hashPassword(
        password,
        digest.salt,
        digest.iterations
    );
    return candidate === digest.hash;
};