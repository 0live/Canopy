import { useMutation } from "@tanstack/react-query";
import { setupRootUserApi } from "../services/api/setupRootUserApi";
import type { CompleteRootUserSetupCredentials } from "../types";

export const useCompleteRootUserSetup = () => {
  return useMutation({
    mutationFn: (credentials: CompleteRootUserSetupCredentials) =>
      setupRootUserApi.completeSetup(credentials),
  });
};
