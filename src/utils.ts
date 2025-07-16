import crypto from "crypto";

export function generateRandomHash(length = 12) {
    return crypto.randomBytes(length).toString("hex");
}
