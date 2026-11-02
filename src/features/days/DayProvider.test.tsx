import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { logger } from "../../../lib/logger";
import type { DayClosing } from "../../data/dayClosing";
import { DayProvider } from "./DayProvider";
import { useOpenDay } from "./useOpenDay";

const THU_29 = "2026-10-29";
const FRI_30 = "2026-10-30";

/* The `AppState` listeners, called by `goTo`. */
let listeners: ((state: AppStateStatus) => void)[];
const remove = jest.fn();

function goTo(state: AppStateStatus) {
  return act(() => {
    for (const listener of listeners) {
      listener(state);
    }
  });
}

let logError: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers();
  listeners = [];
  remove.mockClear();
  jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((_type, listener) => {
      listeners.push(listener as (state: AppStateStatus) => void);
      return { remove };
    });
  logError = jest.spyOn(logger, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

function wrapperFor(closing: DayClosing) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <DayProvider closing={closing}>{children}</DayProvider>;
  };
}

describe("DayProvider, with a simulated closing", () => {
  let openKey: string;
  let calls: string[];
  let closing: { close: jest.Mock; msUntilRefresh: jest.Mock };

  beforeEach(() => {
    openKey = THU_29;
    calls = [];
    closing = {
      close: jest.fn(() => {
        calls.push("close");
        return { openKey, closedKeys: [] };
      }),
      msUntilRefresh: jest.fn(() => 1000),
    };
  });

  const renderOpenDay = () =>
    renderHook(() => useOpenDay(), { wrapper: wrapperFor(closing) });

  const failOnce = (error: Error) =>
    closing.close.mockImplementationOnce(() => {
      throw error;
    });

  it("closes the days when it mounts", async () => {
    const { result } = await renderOpenDay();

    expect(closing.close).toHaveBeenCalledTimes(1);
    expect(result.current.openKey).toBe(THU_29);
  });

  it("closes the days when the app comes back to the foreground only", async () => {
    await renderOpenDay();

    await goTo("background");
    await goTo("inactive");
    expect(closing.close).toHaveBeenCalledTimes(1);

    await goTo("active");
    expect(closing.close).toHaveBeenCalledTimes(2);
  });

  it("closes the days at midnight, then sets the timer again", async () => {
    const { result } = await renderOpenDay();
    openKey = FRI_30;

    await act(() => jest.advanceTimersByTime(999));
    expect(closing.close).toHaveBeenCalledTimes(1);

    await act(() => jest.advanceTimersByTime(1));
    expect(closing.close).toHaveBeenCalledTimes(2);
    expect(result.current.openKey).toBe(FRI_30);

    await act(() => jest.advanceTimersByTime(1000));
    expect(closing.close).toHaveBeenCalledTimes(3);
  });

  it("keeps the pending timer while the open day does not change", async () => {
    const { result } = await renderOpenDay();

    await act(() => jest.advanceTimersByTime(500));
    await goTo("active");
    await act(() => result.current.write(() => undefined));
    await act(() => result.current.write(() => undefined));
    expect(closing.msUntilRefresh).toHaveBeenCalledTimes(1);

    await act(() => jest.advanceTimersByTime(500));
    expect(closing.close).toHaveBeenCalledTimes(5);
    expect(closing.msUntilRefresh).toHaveBeenCalledTimes(2);
  });

  it("sets the timer again when the open day changes", async () => {
    const { result } = await renderOpenDay();
    await act(() => jest.advanceTimersByTime(500));
    openKey = FRI_30;

    await act(() => result.current.write(() => undefined));
    expect(closing.msUntilRefresh).toHaveBeenCalledTimes(2);

    await act(() => jest.advanceTimersByTime(999));
    expect(closing.close).toHaveBeenCalledTimes(2);
    await act(() => jest.advanceTimersByTime(1));
    expect(closing.close).toHaveBeenCalledTimes(3);
  });

  it("write closes the days, then runs fn with the open day", async () => {
    const { result } = await renderOpenDay();
    openKey = FRI_30;
    calls = [];

    const value = await act(() =>
      result.current.write((key) => {
        calls.push(`write ${key}`);
        return 42;
      }),
    );

    expect(calls).toEqual(["close", `write ${FRI_30}`]);
    expect(value).toBe(42);
    expect(result.current.openKey).toBe(FRI_30);
  });

  it("write passes the error of the closing on, without calling fn", async () => {
    const { result } = await renderOpenDay();
    const failure = new Error("disk full");
    failOnce(failure);
    const fn = jest.fn();

    expect(() => result.current.write(fn)).toThrow(failure);
    expect(fn).not.toHaveBeenCalled();
    expect(logError).not.toHaveBeenCalled();
  });

  it("logs the error of an automatic closing, keeps the open day and tries again", async () => {
    failOnce(new Error("locked"));
    const { result } = await renderOpenDay();

    expect(logError).toHaveBeenCalledWith(
      "DayProvider: closing of the days failed",
      new Error("locked"),
    );
    expect(result.current.openKey).toBeNull();

    await goTo("active");
    expect(result.current.openKey).toBe(THU_29);

    failOnce(new Error("locked again"));
    openKey = FRI_30;
    await goTo("active");
    expect(logError).toHaveBeenCalledTimes(2);
    expect(result.current.openKey).toBe(THU_29);
  });

  it("sets the timer again after a failed closing, and closes at midnight", async () => {
    failOnce(new Error("locked"));
    const { result } = await renderOpenDay();
    expect(result.current.openKey).toBeNull();
    openKey = FRI_30;

    await act(() => jest.advanceTimersByTime(1000));
    expect(closing.close).toHaveBeenCalledTimes(2);
    expect(result.current.openKey).toBe(FRI_30);

    await act(() => jest.advanceTimersByTime(1000));
    expect(closing.close).toHaveBeenCalledTimes(3);
  });

  it("keeps the pending timer when the closing of write fails", async () => {
    const { result } = await renderOpenDay();
    await act(() => jest.advanceTimersByTime(500));
    failOnce(new Error("disk full"));

    expect(() => result.current.write(jest.fn())).toThrow("disk full");
    expect(closing.msUntilRefresh).toHaveBeenCalledTimes(1);

    await act(() => jest.advanceTimersByTime(500));
    expect(closing.close).toHaveBeenCalledTimes(3);
  });

  it("sets a timer after a failed closing when none is pending", async () => {
    /* The timer of the mount cannot be set. */
    closing.msUntilRefresh.mockImplementationOnce(() => {
      throw new RangeError("unknown time zone");
    });
    const { result } = await renderOpenDay();
    await act(() => jest.advanceTimersByTime(2000));
    expect(closing.close).toHaveBeenCalledTimes(1);
    failOnce(new Error("disk full"));

    expect(() => result.current.write(jest.fn())).toThrow("disk full");
    expect(closing.msUntilRefresh).toHaveBeenCalledTimes(2);

    await act(() => jest.advanceTimersByTime(999));
    expect(closing.close).toHaveBeenCalledTimes(2);
    await act(() => jest.advanceTimersByTime(1));
    expect(closing.close).toHaveBeenCalledTimes(3);
  });

  it("never hides the error of the closing behind the error of the timer", async () => {
    const timerFailure = new RangeError("unknown time zone");
    closing.msUntilRefresh.mockImplementation(() => {
      throw timerFailure;
    });
    const { result } = await renderOpenDay();
    const failure = new Error("disk full");
    failOnce(failure);
    const fn = jest.fn();

    expect(() => result.current.write(fn)).toThrow(failure);
    expect(fn).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(
      "DayProvider: midnight timer not set",
      timerFailure,
    );
  });

  it("removes the listener and the timer when it unmounts", async () => {
    const { unmount } = await renderOpenDay();

    await unmount();
    await act(() => jest.advanceTimersByTime(10_000));

    expect(remove).toHaveBeenCalledTimes(1);
    expect(closing.close).toHaveBeenCalledTimes(1);
  });

  it("still closes the days before a write once unmounted, without a timer", async () => {
    const { result, unmount } = await renderOpenDay();
    const { write } = result.current;
    await unmount();
    /* The timers left by React, not by the provider. */
    jest.clearAllTimers();
    openKey = FRI_30;
    calls = [];

    const value = write((key) => {
      calls.push(`write ${key}`);
      return 42;
    });

    expect(calls).toEqual(["close", `write ${FRI_30}`]);
    expect(value).toBe(42);
    expect(jest.getTimerCount()).toBe(0);
    expect(closing.msUntilRefresh).toHaveBeenCalledTimes(1);
  });
});

describe("useOpenDay", () => {
  it("throws outside of a DayProvider", async () => {
    /* React reports the error of the render on the console. */
    jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(renderHook(() => useOpenDay())).rejects.toThrow(
      "useOpenDay must be used within a DayProvider",
    );
  });
});
