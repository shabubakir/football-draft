export class Input {
  keys: Set<string> = new Set();
  mouseX = 0;
  mouseY = 0;
  locked = false;

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);
    if (e.code === "Escape") this.locked = false;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.locked) return;
    this.mouseX += e.movementX;
    this.mouseY += e.movementY;
  };

  private onLockChange = () => {
    this.locked = document.pointerLockElement !== null;
  };

  attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("pointerlockchange", this.onLockChange);
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("pointerlockchange", this.onLockChange);
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
