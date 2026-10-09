import { logger } from "./logger";

type DevGlobal = typeof globalThis & { __DEV__: boolean };

const devGlobal = globalThis as DevGlobal;

describe("logger", () => {
  const initialDev = devGlobal.__DEV__;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    devGlobal.__DEV__ = initialDev;
    jest.restoreAllMocks();
  });

  describe("when __DEV__ is true", () => {
    beforeEach(() => {
      devGlobal.__DEV__ = true;
    });

    it("forwards warn to console.warn", () => {
      logger.warn("message", 42);

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith("message", 42);
    });

    it("forwards error to console.error", () => {
      const error = new Error("boom");

      logger.error("message", error);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith("message", error);
    });
  });

  describe("when __DEV__ is false", () => {
    beforeEach(() => {
      devGlobal.__DEV__ = false;
    });

    it("does not call console.warn", () => {
      logger.warn("message");

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("does not call console.error", () => {
      logger.error("message");

      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
