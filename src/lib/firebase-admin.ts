import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import { getMessaging } from "firebase-admin/messaging";

/**
 * Admin SDK, server-side only. Never import this into a client component.
 *
 * Creating staff logins has to happen here rather than in the browser:
 * `createUserWithEmailAndPassword` would sign the admin out and into the new
 * account, and leaving public sign-up enabled would let anyone with the web
 * API key mint themselves an account.
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
// Named ADMIN_SDK_* rather than FIREBASE_ADMIN_* — Firebase App Hosting
// reserves any env var starting with FIREBASE_ (also X_GOOGLE_, EXT_, KIT_)
// for its own use and refuses to let a deploy config define one.
// FIREBASE_ADMIN_* is still accepted locally, because that is the name this
// project's .env.local was first filled in with.
const CLIENT_EMAIL = (
  process.env.ADMIN_SDK_CLIENT_EMAIL ?? process.env.FIREBASE_ADMIN_CLIENT_EMAIL
)?.trim();
const PRIVATE_KEY = normalizePrivateKey(
  process.env.ADMIN_SDK_PRIVATE_KEY ?? process.env.FIREBASE_ADMIN_PRIVATE_KEY
);

/**
 * Secret Manager and .env.local both mangle PEM keys. Quotes survive, `\n`
 * stays literal, and pasting from the JSON often drops the BEGIN/END lines
 * entirely — OpenSSL then fails with ERR_OSSL_UNSUPPORTED, which the UI
 * surfaces as "Could not save that login."
 */
function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return raw;

  let key = raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n")
    .trim();

  if (!/BEGIN [A-Z ]*PRIVATE KEY/.test(key)) {
    const body = key.replace(/\s+/g, "");
    if (!body) return key;
    const wrapped = body.match(/.{1,64}/g)?.join("\n") ?? body;
    key = `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----\n`;
  }

  return key;
}

const DATABASE_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

export const HAS_ADMIN_CONFIG = Boolean(
  PROJECT_ID && CLIENT_EMAIL && PRIVATE_KEY && DATABASE_URL
);

const APP_NAME = "visitor-admin";

function adminApp() {
  if (!HAS_ADMIN_CONFIG) {
    throw new Error(
      "Firebase Admin is not configured — set ADMIN_SDK_CLIENT_EMAIL and ADMIN_SDK_PRIVATE_KEY (or FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY)."
    );
  }

  const existing = getApps().find((app) => app.name === APP_NAME);
  if (existing) return getApp(APP_NAME);

  return initializeApp(
    {
      credential: cert({
        projectId: PROJECT_ID,
        clientEmail: CLIENT_EMAIL,
        privateKey: PRIVATE_KEY,
      }),
      databaseURL: DATABASE_URL,
    },
    APP_NAME
  );
}

export const adminAuth = () => getAuth(adminApp());
export const adminDb = () => getDatabase(adminApp());
export const adminMessaging = () => getMessaging(adminApp());

/** True when this uid is recorded as an admin. */
export async function isAdminUid(uid: string): Promise<boolean> {
  const snapshot = await adminDb().ref(`users/${uid}/role`).get();
  return snapshot.val() === "admin";
}
