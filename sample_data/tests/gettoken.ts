
import { useAuthGate } from "../useAuthGate";
import { getDb } from "../gate/getDb";

const DEV_SESSION_TOKEN_KEY = "devAuthToken";

export default function  TokenTest() {
    // ✅ hooks no topo
    const db = getDb()
    const authGate = useAuthGate();

        const token = localStorage.getItem(DEV_SESSION_TOKEN_KEY);



    return null;
}