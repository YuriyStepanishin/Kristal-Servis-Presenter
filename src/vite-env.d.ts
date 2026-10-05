/// <reference types="vite/client" />

declare module "page-flip" {
  export class PageFlip {
    constructor(
      element: HTMLElement,
      settings: Record<string, number | string | boolean>,
    );
    loadFromHTML(elements: HTMLElement[]): void;
    update(): void;
    on(
      event: "flip",
      callback: (event: { data: number | string }) => void,
    ): void;
    getCurrentPageIndex(): number;
    turnToPage(page: number): void;
    flipNext(): void;
    flipPrev(): void;
    destroy(): void;
  }
}
