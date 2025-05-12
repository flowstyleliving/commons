// This file helps TypeScript recognize Jest globals
import '@types/jest';

declare global {
  namespace jest {
    interface Mock<T = any, Y extends any[] = any[]> extends Function {
      new (...args: Y): T;
      (...args: Y): T;
      mockImplementation(fn: (...args: Y) => T): this;
      mockImplementationOnce(fn: (...args: Y) => T): this;
      mockReturnValue(value: T): this;
      mockReturnValueOnce(value: T): this;
      mockResolvedValue(value: T): this;
      mockResolvedValueOnce(value: T): this;
      mockRejectedValue(value: any): this;
      mockRejectedValueOnce(value: any): this;
    }
  }
} 