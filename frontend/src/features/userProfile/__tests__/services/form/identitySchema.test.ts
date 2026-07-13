import { getIdentitySchema } from "@/features/userProfile/services/forms/identitySchema";
import type { TFunction } from "i18next";

const t = ((key: string) => key) as TFunction;
const schema = getIdentitySchema(t);

const valid = {
  username: "testuser",
  email: "test@example.com",
};

describe("identitySchema", () => {
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

  it("accepts valid identity fields", async () => {
    await expect(schema.validate(valid)).resolves.toBeDefined();
  });
});
