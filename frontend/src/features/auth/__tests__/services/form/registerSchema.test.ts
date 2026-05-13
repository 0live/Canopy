import { getRegisterSchema } from "@/features/auth/services/form/registerSchema";
import type { TFunction } from "i18next";

const t = ((key: string) => key) as TFunction;
const schema = getRegisterSchema(t);

const valid = {
  email: "alice@example.com",
  username: "alice123",
  password: "supersecret1234",
  altcha_payload: "payload",
};

describe("registerSchema", () => {
  it("rejects invalid email", async () => {
    const err = await schema.validate({ ...valid, email: "not-an-email" }, { abortEarly: true }).catch((e) => e);
    expect(err.message).toBe("auth.invalidEmail");
  });

  it("rejects username shorter than 5 characters", async () => {
    const err = await schema.validate({ ...valid, username: "ali" }, { abortEarly: true }).catch((e) => e);
    expect(err.message).toBe("auth.usernameMinLength");
  });

  it("rejects username with special characters", async () => {
    const err = await schema.validate({ ...valid, username: "alice!" }, { abortEarly: true }).catch((e) => e);
    expect(err.message).toBe("auth.usernameInvalidFormat");
  });

  it("rejects password shorter than 12 characters", async () => {
    const err = await schema.validate({ ...valid, password: "short" }, { abortEarly: true }).catch((e) => e);
    expect(err.message).toBe("auth.passwordMinLength");
  });

  it("rejects empty altcha_payload", async () => {
    const err = await schema.validate({ ...valid, altcha_payload: "" }, { abortEarly: true }).catch((e) => e);
    expect(err.message).toBe("auth.captchaRequired");
  });

  it("accepts valid data", async () => {
    await expect(schema.validate(valid)).resolves.toBeDefined();
  });
});
