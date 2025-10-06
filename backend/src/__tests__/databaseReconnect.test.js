const mockConnect = jest.fn();

jest.mock("pg", () => {
  const { EventEmitter } = require("events");

  return {
    Pool: class MockPool extends EventEmitter {
      constructor() {
        super();
        this.connect = mockConnect;
      }
    }
  };
});

describe("PostgreSQL pool error handling", () => {
  let pool;
  let exitSpy;
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();

    mockConnect.mockReset();

    exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    pool = require("../../src/config/database");
  });

  afterEach(() => {
    jest.useRealTimers();
    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  const flushAsync = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  test("retries connection without exiting the process", async () => {
    const release = jest.fn();
    mockConnect
      .mockImplementationOnce(() => Promise.reject(new Error("initial failure")))
      .mockImplementationOnce(() => Promise.resolve({ release }));

    pool.emit("error", new Error("idle error"));

    expect(exitSpy).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    await flushAsync();

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "❌ PostgreSQL reconnection attempt failed:",
      expect.any(Error)
    );

    jest.advanceTimersByTime(2000);
    await flushAsync();

    expect(mockConnect).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "🔄 PostgreSQL pool recovered after transient error"
    );
    expect(exitSpy).not.toHaveBeenCalled();
  });

  test("resets reconnect delay after successful recovery", async () => {
    const release = jest.fn();
    mockConnect.mockImplementation(() => Promise.resolve({ release }));

    pool.emit("error", new Error("first"));
    jest.advanceTimersByTime(1000);
    await flushAsync();

    expect(mockConnect).toHaveBeenCalledTimes(1);

    pool.emit("error", new Error("second"));
    jest.advanceTimersByTime(999);
    await flushAsync();
    expect(mockConnect).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1);
    await flushAsync();
    expect(mockConnect).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledTimes(2);
  });
});
