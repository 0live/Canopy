import { getDbPasswordSchema } from "@/features/userProfile/services/forms/dbAccessSchema";
import type { TFunction } from "i18next";

const t = ((key: string) => key) as TFunction;
const schema = getDbPasswordSchema(t);

const valid = {
  password: "validpassword123",
  confirmPassword: "validpassword123",
};

describe("dbAccessSchema", () => {
  it("rejects empty password", async () => {
    const err = await schema.validateAt("password", { password: "" }).catch((e) => e);
    expect(err.message).toBe("auth.requiredPassword");
  });

  it("rejects password shorter than 12 characters", async () => {
    const err = await schema.validateAt("password", { password: "short" }).catch((e) => e);
    expect(err.message).toBe("auth.passwordMinLength");
  });

  it("rejects missing confirmPassword — undefined triggers required error", async () => {
    const err = await schema.validateAt("confirmPassword", { password: "validpassword123", confirmPassword: undefined }).catch((e) => e);
    expect(err.message).toBe("auth.requiredPassword");
  });

  it("rejects empty string confirmPassword — empty string triggers mismatch", async () => {
    const err = await schema.validateAt("confirmPassword", { password: "validpassword123", confirmPassword: "" }).catch((e) => e);
    expect(err.message).toBe("auth.passwordMismatch");
  });

  it("rejects when password and confirmPassword do not match", async () => {
    const err = await schema.validate({ ...valid, confirmPassword: "differentpassword456" }, { abortEarly: true }).catch((e) => e);
    expect(err.message).toBe("auth.passwordMismatch");
  });

  it("accepts two valid identical passwords", async () => {
    await expect(schema.validate(valid)).resolves.toBeDefined();
  });
});
