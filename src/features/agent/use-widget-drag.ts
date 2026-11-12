import { type KeyboardEvent, type MouseEvent, type PointerEvent, useEffect, useRef, useState } from "react";

export function useWidgetDrag(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ id: number; x: number; y: number; startX: number; startY: number } | null>(null);
  const dragged = useRef(false);

  const move = (x: number, y: number) => {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return;
    setOffset((current) => ({
      x: Math.min(Math.max(x, current.x - bounds.left + 8), current.x + window.innerWidth - bounds.right - 8),
      y: Math.min(Math.max(y, current.y - bounds.top + 8), current.y + window.innerHeight - bounds.bottom - 8),
    }));
  };

  useEffect(() => {
    if (!enabled) {
      setOffset({ x: 0, y: 0 });
      drag.current = null;
      return;
    }
    const constrain = () => {
      const bounds = ref.current?.getBoundingClientRect();
      if (!bounds) return;
      const x = bounds.left < 8 ? 8 - bounds.left : Math.min(0, window.innerWidth - bounds.right - 8);
      const y = bounds.top < 8 ? 8 - bounds.top : Math.min(0, window.innerHeight - bounds.bottom - 8);
      if (x || y) setOffset((current) => ({ x: current.x + x, y: current.y + y }));
    };
    const observer = new ResizeObserver(constrain);
    if (ref.current) observer.observe(ref.current);
    window.addEventListener("resize", constrain);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", constrain);
    };
  }, [enabled]);

  return {
    ref,
    style: enabled ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : undefined,
    handleProps: {
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (event.button !== 0) return;
        const control = (event.target as Element).closest("button, input, select, textarea, a");
        if (control && control !== event.currentTarget) return;
        dragged.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: offset.x, startY: offset.y };
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        const current = drag.current;
        if (!current || current.id !== event.pointerId) return;
        if (!dragged.current && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 5) return;
        dragged.current = true;
        move(current.startX + event.clientX - current.x, current.startY + event.clientY - current.y);
      },
      onPointerUp() {
        drag.current = null;
      },
      onLostPointerCapture() {
        drag.current = null;
      },
      onPointerCancel() {
        drag.current = null;
        dragged.current = false;
      },
      onClickCapture(event: MouseEvent<HTMLElement>) {
        if (!dragged.current) return;
        dragged.current = false;
        event.preventDefault();
        event.stopPropagation();
      },
    },
    onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
      const directions: Record<string, [number, number]> = {
        ArrowLeft: [-16, 0],
        ArrowRight: [16, 0],
        ArrowUp: [0, -16],
        ArrowDown: [0, 16],
      };
      const direction = directions[event.key];
      if (!direction) return;
      event.preventDefault();
      move(offset.x + direction[0], offset.y + direction[1]);
    },
  };
}
