/** Screens import this module, never Firebase or Google Sign-in. Phase 6 OTA replaces these bodies. */

export const isSignedIn = false;

export async function signIn(): Promise<void> {}

export async function signOut(): Promise<void> {}

export async function pull(): Promise<void> {}

export async function push(): Promise<void> {}
