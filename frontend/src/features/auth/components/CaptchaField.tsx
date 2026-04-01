import "altcha";
import { FormControl, FormField, FormItem, FormMessage } from "../../../shared/components/ui/form";
import { useCaptchaField } from "../hooks/useCaptchaField";
import type { CaptchaFieldProps } from "../types";

export function CaptchaField({ form }: CaptchaFieldProps) {
  const { widgetRef, challengeUrl } = useCaptchaField(form);

  return (
    <FormField control={form.control} name="altcha_payload" render={() => (
      <FormItem className="flex flex-col items-center">
        <FormControl>
          <altcha-widget ref={widgetRef} challengeurl={challengeUrl} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );
}
