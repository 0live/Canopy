import { getPasswordSchema } from "@/features/userProfile/services/forms/passwordSchema";
import type { TFunction } from "i18next";

const t = ((key: string) => key) as TFunction;
const schema = getPasswordSchema(t);

const valid = {
  password: "validpassword123",
  confirmPassword: "validpassword123",
};

describe("passwordSchema", () => {
  it("rejects an empty form — password is required", async () => {
    const err = await schema.validate({}, { abortEarly: true }).catch((e) => e);
    expect(err.message).toBe("auth.requiredPassword");
  });

  it("rejects password shorter than 12 characters", async () => {
    const err = await schema
      .validate({ password: "short", confirmPassword: "short" }, { abortEarly: true })
      .catch((e) => e);
    expect(err.message).toBe("auth.passwordMinLength");
  });

  it("rejects when confirmPassword is missing", async () => {
    const err = await schema
      .validate({ password: "validpassword123", confirmPassword: "" }, { abortEarly: true })
      .catch((e) => e);
    expect(err.message).toBe("auth.passwordMismatch");
  });

  it("rejects when password and confirmPassword do not match", async () => {
    const err = await schema
      .validate({ ...valid, confirmPassword: "differentpassword456" }, { abortEarly: true })
      .catch((e) => e);
    expect(err.message).toBe("auth.passwordMismatch");
  });

  it("accepts matching valid passwords", async () => {
    await expect(schema.validate(valid)).resolves.toBeDefined();
  });
});
