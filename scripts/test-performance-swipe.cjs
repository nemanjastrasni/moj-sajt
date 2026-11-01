/* eslint-disable @typescript-eslint/no-require-imports -- Gesture boundary tests use the existing CommonJS test runner. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { test } = require("node:test")
const assert = require("node:assert/strict")
const { performanceSwipeDirection: direction } = require("../lib/performance/swipe.ts")
const movement = { startX: 200, startY: 200, endX: 100, endY: 205, elapsed: 300, width: 390 }

test("left opens next and right opens previous", () => {
  assert.equal(direction(movement), "next")
  assert.equal(direction({ ...movement, endX: 300 }), "previous")
})
test("taps and short drags do not change songs", () => {
  for (const delta of [0, 5, 30, 71, 77]) assert.equal(direction({ ...movement, endX: movement.startX - delta }), null)
  assert.equal(direction({ ...movement, endX: 122 }), "next")
})
test("vertical and diagonal movements remain scrolling gestures", () => {
  for (const endY of [251, 300, 400, 149, 100]) assert.equal(direction({ ...movement, endY }), null)
})
test("long presses and invalid durations cannot navigate", () => {
  for (const elapsed of [-1, 1001, 2000, NaN, Infinity]) assert.equal(direction({ ...movement, elapsed }), null)
  assert.equal(direction({ ...movement, elapsed: 1000 }), "next")
})
test("distance threshold scales with the screen but remains bounded", () => {
  assert.equal(direction({ ...movement, width: 320, endX: 129 }), null)
  assert.equal(direction({ ...movement, width: 320, endX: 128 }), "next")
  assert.equal(direction({ ...movement, width: 1366, endX: 81 }), null)
  assert.equal(direction({ ...movement, width: 1366, endX: 80 }), "next")
})
test("invalid coordinates or screen widths fail closed", () => {
  for (const field of Object.keys(movement)) for (const value of [NaN, Infinity, -Infinity]) assert.equal(direction({ ...movement, [field]: value }), null)
  for (const width of [0, -1]) assert.equal(direction({ ...movement, width }), null)
})
