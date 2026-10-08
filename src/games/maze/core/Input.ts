export class Input {
  keys: Set<string> = new Set();
  mouseX = 0;
  mouseY = 0;
  locked = false;
  /** Fired when pointer lock is released (Esc) — the game should pause */
  onUnlock: (() => void) | null = null;

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Escape") return; // browser handles Esc for pointer lock
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    if (this.keys.size === 0) this.clear();
  };

  // Reset all held keys (called on pause / window blur)
  clear() {
    this.keys.clear();
    this.mouseX = 0;
    this.mouseY = 0;
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this.locked) return;
    this.mouseX += e.movementX;
    this.mouseY += e.movementY;
  };

  private onLockChange = () => {
    const wasLocked = this.locked;
    this.locked = document.pointerLockElement !== null;
    if (wasLocked && !this.locked) {
      // Pointer lock lost (usually Esc): clear stuck keys and notify the game
      this.clear();
      this.onUnlock?.();
    }
  };

  private onBlur = () => {
    this.clear();
  };

  attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("pointerlockchange", this.onLockChange);
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("pointerlockchange", this.onLockChange);
    this.clear();
  }

  isDown(code: string) {
    return this.keys.has(code);
  }

  requestLock(element: HTMLElement) {
    element.requestPointerLock();
  }

  releaseLock() {
    document.exitPointerLock();
  }

  consumeMouse() {
    const x = this.mouseX;
    const y = this.mouseY;
    this.mouseX = 0;
    this.mouseY = 0;
    return { x, y };
  }
}
