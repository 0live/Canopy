import { getLoginSchema } from "@/features/auth/services/form/loginSchema";
import type { TFunction } from "i18next";

const t = ((key: string) => key) as TFunction;
const schema = getLoginSchema(t);

describe("loginSchema", () => {
  it("rejects empty username", async () => {
    const err = await schema.validate({ username: "", password: "secret" }, { abortEarly: true }).catch((e) => e);
    expect(err.message).toBe("auth.requiredUsername");
  });

  it("rejects empty password", async () => {
    const err = await schema.validate({ username: "alice", password: "" }, { abortEarly: true }).catch((e) => e);
    expect(err.message).toBe("auth.requiredPassword");
  });

  it("accepts valid credentials", async () => {
    await expect(schema.validate({ username: "alice", password: "secret" })).resolves.toBeDefined();
  });
});
