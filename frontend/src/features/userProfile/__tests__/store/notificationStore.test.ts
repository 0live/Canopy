import { createNotificationSlice } from "@/features/userProfile/store/notificationStore";
import { create } from "zustand";

function createFreshStore() {
  return create(createNotificationSlice);
}

describe("notificationStore — initial state", () => {
  it("starts with unreadCount at 0", () => {
    const store = createFreshStore();
    expect(store.getState().unreadCount).toBe(0);
  });
});

describe("notificationStore — setUnreadCount", () => {
  it("updates unreadCount to the given value", () => {
    const store = createFreshStore();
    store.getState().setUnreadCount(5);
    expect(store.getState().unreadCount).toBe(5);
  });

  it("resets unreadCount to 0", () => {
    const store = createFreshStore();
    store.getState().setUnreadCount(10);
    store.getState().setUnreadCount(0);
    expect(store.getState().unreadCount).toBe(0);
  });
});

describe("notificationStore — incrementUnreadCount", () => {
  it("increments unreadCount from 0 to 1", () => {
    const store = createFreshStore();
    store.getState().incrementUnreadCount();
    expect(store.getState().unreadCount).toBe(1);
  });

  it("accumulates correctly after three increments", () => {
    const store = createFreshStore();
    store.getState().incrementUnreadCount();
    store.getState().incrementUnreadCount();
    store.getState().incrementUnreadCount();
    expect(store.getState().unreadCount).toBe(3);
  });
});

describe("notificationStore — store isolation", () => {
  it("each fresh store starts independently at 0", () => {
    const storeA = createFreshStore();
    storeA.getState().setUnreadCount(42);

    const storeB = createFreshStore();
    expect(storeB.getState().unreadCount).toBe(0);
  });
});
