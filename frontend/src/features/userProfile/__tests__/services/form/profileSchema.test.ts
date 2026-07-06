import { getProfileSchema } from "@/features/userProfile/services/forms/profileSchema";
import type { TFunction } from "i18next";

const t = ((key: string) => key) as TFunction;
const schema = getProfileSchema(t);

const valid = {
  username: "testuser",
  email: "test@example.com",
  password: "validpassword123",
  confirmPassword: "validpassword123",
};

describe("profileSchema", () => {
  it("rejects an empty form — username and email are required", async () => {
    await expect(schema.validate({}, { abortEarly: true })).rejects.toBeDefined();
  });

  it("rejects a missing username", async () => {
    const err = await schema
      .validate({ email: "test@example.com" }, { abortEarly: true })
      .catch((e) => e);
    expect(err.message).toBe("auth.requiredUsername");
  });

  it("rejects a missing email", async () => {
    const err = await schema
      .validate({ username: "testuser" }, { abortEarly: true })
      .catch((e) => e);
    expect(err.message).toBe("auth.requiredEmail");
  });

  it("rejects username shorter than 5 characters", async () => {
    const err = await schema.validate({ ...valid, username: "ali" }, { abortEarly: true }).catch((e) => e);
    expect(err.message).toBe("auth.usernameMinLength");
  });

  it("rejects username with special characters", async () => {
    const err = await schema.validate({ ...valid, username: "alice!" }, { abortEarly: true }).catch((e) => e);
    expect(err.message).toBe("auth.usernameInvalidFormat");
  });

  it("rejects invalid email", async () => {
    const err = await schema.validate({ ...valid, email: "not-an-email" }, { abortEarly: true }).catch((e) => e);
    expect(err.message).toBe("auth.invalidEmail");
  });

  it("rejects password shorter than 12 characters", async () => {
    const err = await schema.validate({ ...valid, password: "short" }, { abortEarly: true }).catch((e) => e);
    expect(err.message).toBe("auth.passwordMinLength");
  });

  it("rejects when password is set but confirmPassword is missing", async () => {
    const err = await schema
      .validate({ username: "testuser", email: "test@example.com", password: "validpassword123", confirmPassword: "" }, { abortEarly: true })
      .catch((e) => e);
    expect(err.message).toBe("auth.requiredPassword");
  });

  it("rejects when password and confirmPassword do not match", async () => {
    const err = await schema
      .validate({ ...valid, confirmPassword: "differentpassword456" }, { abortEarly: true })
      .catch((e) => e);
    expect(err.message).toBe("auth.passwordMismatch");
  });

  it("accepts all valid fields with a password change", async () => {
    await expect(schema.validate(valid)).resolves.toBeDefined();
  });

  it("accepts valid fields without a password — password remains optional", async () => {
    await expect(
      schema.validate({ username: "testuser", email: "test@example.com", password: "", confirmPassword: "" })
    ).resolves.toBeDefined();
  });
});
