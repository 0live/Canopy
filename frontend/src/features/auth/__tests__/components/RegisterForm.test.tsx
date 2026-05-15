// Factory prevents Vitest from loading the real module (auto-mock would still run side effects)
vi.mock("altcha", () => ({}));

import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/utils/renderWithProviders";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

// Simulates the altcha widget completing verification — fires the statechange event
// that useCaptchaField listens to, setting altcha_payload in the form.
function simulateCaptchaVerified() {
  document.querySelector("altcha-widget")?.dispatchEvent(
    new CustomEvent("statechange", { detail: { state: "verified", payload: "test-captcha-token" } })
  );
}

const validData = {
  email: "alice@example.com",
  username: "alice123",
  password: "supersecret1234",
};

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("auth.email"), validData.email);
  await user.type(screen.getByLabelText("auth.username"), validData.username);
  await user.type(screen.getByLabelText("auth.password"), validData.password);
  act(() => { simulateCaptchaVerified(); });
}

describe("RegisterForm", () => {
  it("renders email/username/password fields and CAPTCHA", () => {
    renderWithProviders(<RegisterForm />);
    expect(screen.getByLabelText("auth.email")).toBeInTheDocument();
    expect(screen.getByLabelText("auth.username")).toBeInTheDocument();
    expect(screen.getByLabelText("auth.password")).toBeInTheDocument();
    expect(document.querySelector("altcha-widget")).toBeInTheDocument();
  });

  it("shows validation errors on empty submit without calling the API", async () => {
    const registerSpy = vi.fn();
    server.use(http.post("/api/auth/register", () => { registerSpy(); return HttpResponse.json({}, { status: 201 }); }));
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await user.click(screen.getByRole("button", { name: "auth.register" }));

    await waitFor(() => expect(screen.getByText("auth.captchaRequired")).toBeInTheDocument());
    expect(registerSpy).not.toHaveBeenCalled();
  });

  it("shows email error on email_exists 409", async () => {
    server.use(
      http.post("/api/auth/register", () => HttpResponse.json({ key: "user.email_exists" }, { status: 409 }))
    );
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "auth.register" }));

    await waitFor(() => expect(screen.getByText("user.email_exists")).toBeInTheDocument());
  });

  it("shows username error on username_exists 409", async () => {
    server.use(
      http.post("/api/auth/register", () => HttpResponse.json({ key: "user.username_exists" }, { status: 409 }))
    );
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "auth.register" }));

    await waitFor(() => expect(screen.getByText("user.username_exists")).toBeInTheDocument());
  });

  it("shows success message after successful register", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "auth.register" }));

    await waitFor(() => expect(screen.getByText("auth.registerSuccess")).toBeInTheDocument());
  });
});
