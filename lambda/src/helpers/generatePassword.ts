import {createHmac} from "crypto";

export default function generatePassword(password: string, salt: string) {
    const hash = createHmac("sha512", salt);
    hash.update(password);
    return hash.digest("hex");
}
