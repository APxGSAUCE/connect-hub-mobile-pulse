import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { NotificationCenter } from "./NotificationCenter";

const toastSpy = vi.fn();
let fromCalls: string[] = [];
let shouldFail = false;
let deferred: Array<() => void> = [];
let holdRequests = false;

const rows: Record<string, unknown[]> = {
  notifications: [
    {
      id: "n1",
      title: "Leave approved",
      message: "Your leave was approved",
      type: "task",
      is_read: false,
      created_at: "2026-09-20T02:00:00.000Z",
      related_id: null,
      related_type: null,
    },
  ],
  events: [],
  chat_group_members: [{ group_id: "g1" }],
  messages: [
    { id: "m1", content: "Hello there", created_at: "2026-09-21T02:00:00.000Z", sender_id: "other", file_url: null, file_name: null },
  ],
  message_read_receipts: [],
};

const makeQuery = (table: string) => {
  const result = shouldFail
    ? { data: null, error: { message: "boom" } }
    : { data: rows[table] ?? [], error: null };

  const settle = (resolve: (value: unknown) => void) => {
    if (holdRequests) deferred.push(() => resolve(result));
    else resolve(result);
  };

  const query: Record<string, unknown> = {
    then: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
      new Promise(settle).then(onFulfilled, onRejected),
  };
  for (const method of ["select", "eq", "neq", "order", "limit", "in", "update", "not", "gte", "lte", "or", "is"]) {
    query[method] = () => query;
  }
  return query;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      fromCalls.push(table);
      return makeQuery(table);
    },
    rpc: vi.fn(async () => ({ data: null, error: null })),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastSpy }),
}));

vi.mock("@/hooks/useRealtimeSubscription", () => ({
  useRealtimeSubscription: () => {},
}));

const renderPanel = (onCountChange = vi.fn()) => {
  const view = render(
    <MemoryRouter>
      <NotificationCenter unreadCount={2} onCountChange={onCountChange} />
    </MemoryRouter>,
  );
  return { ...view, onCountChange };
};

const openPanel = async () => {
  await userEvent.click(screen.getByRole("button", { name: /activity center/i }));
  await screen.findByText("Activity Center");
};

beforeEach(() => {
  fromCalls = [];
  deferred = [];
  holdRequests = false;
  shouldFail = false;
  toastSpy.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Activity Center", () => {
  it("fetches activity once on mount", async () => {
    renderPanel();
    await waitFor(() => expect(fromCalls).toContain("messages"));
    const initialNotificationFetches = fromCalls.filter((table) => table === "notifications").length;
    expect(initialNotificationFetches).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fromCalls.filter((table) => table === "notifications").length).toBe(1);
  });

  it("keeps the current list visible while refreshing and records a last-updated time", async () => {
    renderPanel();
    await openPanel();
    expect(await screen.findByText("Hello there")).toBeInTheDocument();
    expect(screen.getByTestId("activity-last-updated").textContent).toMatch(/Last updated/);

    holdRequests = true;
    fireEvent.click(screen.getByRole("button", { name: /refresh activity/i }));
    // The list stays rendered instead of being replaced by a spinner.
    expect(screen.getByText("Hello there")).toBeInTheDocument();
    expect(screen.queryByText("Loading activity")).not.toBeInTheDocument();

    await act(async () => {
      holdRequests = false;
      deferred.forEach((release) => release());
      deferred = [];
    });
    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });

  it("does not issue duplicate requests while a fetch is in flight", async () => {
    renderPanel();
    await openPanel();
    const before = fromCalls.filter((table) => table === "notifications").length;

    holdRequests = true;
    const refresh = screen.getByRole("button", { name: /refresh activity/i });
    fireEvent.click(refresh);
    fireEvent.click(refresh);
    fireEvent.click(refresh);

    expect(fromCalls.filter((table) => table === "notifications").length).toBe(before + 1);


    await act(async () => {
      deferred.forEach((release) => release());
      deferred = [];
      holdRequests = false;
    });
  });

  it("shows an error message without repeating the toast", async () => {
    shouldFail = true;
    renderPanel();
    await openPanel();

    expect(await screen.findByRole("alert")).toHaveTextContent(/Could not load the latest activity/i);
    expect(toastSpy).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: /refresh activity/i }));
    await waitFor(() => expect(fromCalls.filter((table) => table === "notifications").length).toBe(2));
    expect(toastSpy).toHaveBeenCalledTimes(1);
  });

  it("marks a single item as read and clears everything in bulk without closing the panel", async () => {
    const { onCountChange } = renderPanel();
    await openPanel();
    await screen.findByText("Hello there");

    await userEvent.click(screen.getByRole("button", { name: /mark new message as read/i }));
    await waitFor(() => expect(onCountChange).toHaveBeenCalled());
    expect(screen.getByText("Activity Center")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /mark all read/i }));
    await waitFor(() => expect(onCountChange).toHaveBeenCalledWith(0));
    expect(screen.getByText("Activity Center")).toBeInTheDocument();
    expect(screen.queryAllByText("Unread")).toHaveLength(0);
  });
});
