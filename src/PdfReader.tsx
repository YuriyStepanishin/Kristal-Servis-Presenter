import type { PDFDocumentProxy } from "pdfjs-dist";
import type { ReactNode } from "react";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useEffect, useRef, useState } from "react";
import { PageFlip } from "page-flip";
import type { CatalogPage } from "./App";
import SlideNavigation from "./SlideNavigation";

type PdfReaderProps = {
  /**
   * Поточний PDF-файл.
   *
   * Наприклад:
   * /catalogs/02_LASKA_2026_36_листів.pdf
   */
  file: string;

  title: string;

  /**
   * Дозволені записи каталогу.
   *
   * Тут уже є:
   * id
   * page
   * sheet
   * source_page
   * file
   * group
   * subgroups
   * tm
   */
  pages: CatalogPage[];

  /**
   * ID поточної сторінки каталогу.
   */
  selectedPage: number;

  /**
   * Повідомляємо App.tsx,
   * коли користувач перегортає сторінку.
   */
  onSelectedPageChange: (id: number) => void;

  navigationPanel: ReactNode;
};

export default function PdfReader({
  file,
  title,
  pages,
  selectedPage,
  onSelectedPageChange,
  navigationPanel,
}: PdfReaderProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [error, setError] = useState("");
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const stageRef = useRef<HTMLDivElement>(null);
  const bookHostRef = useRef<HTMLDivElement>(null);
  const pageFlipRef = useRef<PageFlip | null>(null);
  const renderNearbyRef = useRef<((index: number) => void) | null>(null);
  const pdfCacheRef = useRef(new Map<string, Promise<PDFDocumentProxy>>());
  const renderedPagesRef = useRef(new Map<string, string>());

  // ==================================================
  // СИНХРОНІЗАЦІЯ З selectedPage
  // ==================================================

  useEffect(() => {
    if (!pages.length) {
      setPageIndex(0);
      return;
    }

    const index = pages.findIndex((page) => page.id === selectedPage);

    if (index >= 0) {
      setPageIndex(index);
      if (pageFlipRef.current?.getCurrentPageIndex() !== index) {
        pageFlipRef.current?.turnToPage(index);
      }
      renderNearbyRef.current?.(index);
      return;
    }

    /**
     * Якщо вибрана сторінка більше
     * не входить до нового набору —
     * переходимо на першу.
     */
    setPageIndex(0);

    onSelectedPageChange(pages[0].id);
  }, [pages, selectedPage, onSelectedPageChange]);

  useEffect(() => {
    const stage = stageRef.current;

    if (!stage) return;

    const observer = new ResizeObserver(([entry]) => {
      setStageSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(stage);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = bookHostRef.current;

    if (!host || !stageSize.width || !stageSize.height || !pages.length) {
      return;
    }

    let cancelled = false;
    const initialIndex = Math.max(
      0,
      pages.findIndex((page) => page.id === selectedPage),
    );
    const pageWidth = Math.floor(
      Math.min(stageSize.width, stageSize.height * 0.707),
    );
    const pageHeight = Math.floor(pageWidth / 0.707);
    const book = document.createElement("div");
    const pageElements = pages.map((page) => {
      const element = document.createElement("div");
      const image = document.createElement("img");
      const cacheKey = `${page.file}:${page.page}`;

      element.className = "flipbook-page";
      element.dataset.pageId = String(page.id);
      element.setAttribute("aria-label", `Сторінка PDF ${page.page}`);
      image.alt = `Сторінка ${page.page}`;
      image.draggable = false;
      image.dataset.cacheKey = cacheKey;
      element.append(image);

      const cachedImage = renderedPagesRef.current.get(cacheKey);
      if (cachedImage) image.src = cachedImage;

      return element;
    });
    const images = pageElements.map((element) => element.querySelector("img")!);

    book.className = "flipbook-book";
    book.style.width = `${pageWidth}px`;
    book.style.height = `${pageHeight}px`;
    host.replaceChildren(book);
    setError("");

    async function renderPage(index: number) {
      const page = pages[index];
      const image = images[index];
      if (
        !page ||
        !image ||
        renderedPagesRef.current.has(image.dataset.cacheKey!)
      ) {
        return;
      }

      try {
        let pdfPromise = pdfCacheRef.current.get(page.file);
        if (!pdfPromise) {
          pdfPromise = import("pdfjs-dist").then(
            ({ GlobalWorkerOptions, getDocument }) => {
              GlobalWorkerOptions.workerSrc = workerUrl;
              return getDocument({ url: page.file }).promise;
            },
          );
          pdfCacheRef.current.set(page.file, pdfPromise);
        }

        const pdf = await pdfPromise;
        const pdfPage = await pdf.getPage(page.page);
        if (cancelled) return;

        const naturalViewport = pdfPage.getViewport({ scale: 1 });
        const scale = Math.min(
          pageWidth / naturalViewport.width,
          pageHeight / naturalViewport.height,
        );
        const viewport = pdfPage.getViewport({ scale });
        const canvas = window.document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) return;

        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
        await pdfPage.render({ canvas, canvasContext: context, viewport })
          .promise;

        if (cancelled) return;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
        renderedPagesRef.current.set(image.dataset.cacheKey!, dataUrl);
        image.src = dataUrl;
      } catch {
        if (!cancelled)
          setError("Не вдалося завантажити або відобразити сторінку PDF.");
      }
    }

    function renderNearby(index: number) {
      for (let offset = -2; offset <= 2; offset += 1) {
        void renderPage(index + offset);
      }
    }

    try {
      const pageFlip = new PageFlip(book, {
        width: pageWidth,
        height: pageHeight,
        size: "fixed",
        startPage: initialIndex,
        showCover: false,
        usePortrait: true,
        flippingTime: 650,
        maxShadowOpacity: 0.24,
        mobileScrollSupport: false,
        autoSize: false,
      });

      pageFlip.on("flip", ({ data }) => {
        if (cancelled || typeof data !== "number") return;
        const nextPage = pages[data];
        if (!nextPage) return;
        setPageIndex(data);
        onSelectedPageChange(nextPage.id);
        renderNearby(data);
      });
      pageFlip.loadFromHTML(pageElements);
      pageFlipRef.current = pageFlip;
      renderNearbyRef.current = renderNearby;
      renderNearby(initialIndex);
    } catch {
      setError("Не вдалося запустити перегортання сторінок.");
    }

    return () => {
      cancelled = true;
      pageFlipRef.current?.destroy();
      pageFlipRef.current = null;
      renderNearbyRef.current = null;
    };
  }, [pages, stageSize.height, stageSize.width, onSelectedPageChange]);

  // ==================================================
  // ПЕРЕГОРТАННЯ
  // ==================================================

  function goToIndex(index: number) {
    if (!pages.length) return;

    const safeIndex = Math.min(pages.length - 1, Math.max(0, index));

    const nextPage = pages[safeIndex];

    if (!nextPage) return;

    setPageIndex(safeIndex);
    onSelectedPageChange(nextPage.id);
    renderNearbyRef.current?.(safeIndex);
    pageFlipRef.current?.turnToPage(safeIndex);
  }

  function goNext() {
    pageFlipRef.current?.flipNext();
  }

  function goPrevious() {
    pageFlipRef.current?.flipPrev();
  }

  // ==================================================
  // КЛАВІАТУРА
  // ==================================================

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        goPrevious();
      }

      if (event.key === "ArrowRight") {
        goNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [pageIndex, pages]);

  // ==================================================
  // НЕМАЄ СТОРІНОК
  // ==================================================

  if (!pages.length) {
    return (
      <section
        className="reader-panel"
        aria-label={`Перегляд каталогу ${title}`}
      >
        <div className="reader-message">
          Для вибраної комбінації немає сторінок каталогу.
        </div>

        {navigationPanel}
      </section>
    );
  }

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <section className="reader-panel" aria-label={`Перегляд каталогу ${title}`}>
      <div className="reader-stage" ref={stageRef}>
        {error ? (
          <div className="reader-message" role="alert">
            {error}
          </div>
        ) : !stageSize.width ? (
          <div className="reader-message">Завантаження каталогу…</div>
        ) : (
          <div className="flipbook-host" ref={bookHostRef} />
        )}
      </div>

      <SlideNavigation
        page={pageIndex + 1}
        pageCount={pages.length}
        onPageChange={(page) => goToIndex(page - 1)}
      />
      {navigationPanel}
    </section>
  );
}
