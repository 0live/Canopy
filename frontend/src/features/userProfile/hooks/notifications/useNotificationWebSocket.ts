import { QUERY_KEYS } from "@/shared/constants/queryKeys";
import { useAppStore } from "@/shared/store";
import { ToastType } from "@/shared/types/Toast";
import { showToast } from "@/shared/utils/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { NotificationKey, type NotificationWsMessage } from "../../types";

const MAX_RETRIES = 10;
const MAX_DELAY_MS = 30_000;

function buildWsUrl(token: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/notifications/ws-notifications?token=${token}`;
}

function calculateBackoff(attempt: number): number {
  return Math.min(1_000 * 2 ** attempt, MAX_DELAY_MS);
}

export function useNotificationWebSocket() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const accessToken = useAppStore((s) => s.accessToken);
  const incrementUnreadCount = useAppStore((s) => s.incrementUnreadCount);

  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTokenRef = useRef<string | null>(null);
  const wasConnectedRef = useRef(false);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      incrementUnreadCount();
      showToast(t("notifications.newNotification"), ToastType.Info);

      try {
        const msg: NotificationWsMessage = JSON.parse(event.data);
        if (msg.key === NotificationKey.ROLES_CHANGED) {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTH.CURRENT_USER() });
        }
      } catch {
        // Malformed message — ignore
      }
    },
    [incrementUnreadCount, queryClient, t]
  );

  useEffect(() => {
    if (!accessToken) {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    activeTokenRef.current = accessToken;
    retryRef.current = 0;

    function connect(token: string) {
      if (wsRef.current) wsRef.current.close();

      const ws = new WebSocket(buildWsUrl(token));
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        // Only sync missed notifications on reconnect, not on initial connection
        if (wasConnectedRef.current) {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS.ALL() });
        }
        wasConnectedRef.current = true;
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => attemptReconnect(token);
    }

    function attemptReconnect(token: string) {
      if (retryRef.current >= MAX_RETRIES) return;
      if (activeTokenRef.current !== token) return;

      const delay = calculateBackoff(retryRef.current);
      retryRef.current += 1;

      timerRef.current = setTimeout(() => {
        const currentToken = activeTokenRef.current;
        if (currentToken) connect(currentToken);
      }, delay);
    }

    connect(accessToken);

    return () => {
      activeTokenRef.current = null;
      wasConnectedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [accessToken, handleMessage, queryClient]);
}
