import { isAdmin } from '../lib/auth.js';
import { send } from '../lib/http.js';
export default function handler(req, res) {
  send(res, 200, { admin: isAdmin(req), extraction: !!process.env.ANTHROPIC_API_KEY });
}
