import { test, expect } from "bun:test";
import type { Program } from "../../ast/ts/types";
import { interpretProgram } from "../main";

const numbers = [
  0,
  -1,
  0.1,
  1,
  2,
  Math.PI,
  1e3,
  1e-24,
  NaN,
  Infinity,
  -Infinity,
];

const program: Program = {
  imports: [{ path: "std", symbols: ["f64"] }],
  declarations: (
    [
      { name: "add", op: "+" },
      { name: "sub", op: "-" },
      { name: "mul", op: "*" },
      { name: "div", op: "/" },
    ] as const
  ).map(({ name, op }) => ({
    accessibility: "public",
    function: {
      name,
      arguments: [
        { identifier: "a", type: { identifier: "f64" } },
        { identifier: "b", type: { identifier: "f64" } },
      ],
      returnType: { identifier: "f64" },
      body: [
        {
          return: {
            "binary-operation": {
              lhs: { identifier: "a" },
              op,
              rhs: { identifier: "b" },
            },
          },
        },
      ],
    },
  })),
};

test("arithmetics", async () => {
  const exports = await interpretProgram(program);

  for (const a of numbers) {
    for (const b of numbers) {
      expect(exports.get("add")!(a, b), `add(${a}, ${b})`).toBe(a + b);
      expect(exports.get("sub")!(a, b), `sub(${a}, ${b})`).toBe(a - b);
      expect(exports.get("mul")!(a, b), `mul(${a}, ${b})`).toBe(a * b);
      expect(exports.get("div")!(a, b), `div(${a}, ${b})`).toBe(a / b);
    }
  }
});
