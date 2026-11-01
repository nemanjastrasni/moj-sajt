type SwipeMovement = { startX: number; startY: number; endX: number; endY: number; elapsed: number; width: number }

export function performanceSwipeDirection(movement: SwipeMovement): "previous" | "next" | null {
  if (!Object.values(movement).every(Number.isFinite) || movement.width <= 0 || movement.elapsed < 0 || movement.elapsed > 1000) return null
  const dx = movement.endX - movement.startX, dy = movement.endY - movement.startY
  const minimum = Math.max(72, Math.min(120, movement.width * .2))
  if (Math.abs(dx) < minimum || Math.abs(dx) < Math.abs(dy) * 2) return null
  return dx < 0 ? "next" : "previous"
}
