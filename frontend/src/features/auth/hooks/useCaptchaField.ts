import { useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import { CAPTCHA_CHALLENGE_URL } from "../services/api/authApi";
import type { RegisterFormData } from "../services/form/registerSchema";

export function useCaptchaField(form: UseFormReturn<RegisterFormData>) {
  const widgetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const widget = widgetRef.current;
    if (!widget) return;

    const handleStateChange = (e: Event) => {
      const { state, payload } = (e as CustomEvent<{ state: string; payload: string }>).detail;
      if (state === "verified") {
        form.setValue("altcha_payload", payload, { shouldValidate: true });
      } else {
        form.setValue("altcha_payload", "", { shouldValidate: false });
      }
    };

    widget.addEventListener("statechange", handleStateChange);
    return () => widget.removeEventListener("statechange", handleStateChange);
  }, [form]);

  return { widgetRef, challengeUrl: CAPTCHA_CHALLENGE_URL };
}
