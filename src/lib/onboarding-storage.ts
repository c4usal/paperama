const ONBOARDING_KEY = "paperama:onboarding-v1";

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(ONBOARDING_KEY) === "1";
}

export function markOnboardingComplete(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDING_KEY, "1");
}
