import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import type { ReactNode, TouchEvent } from "react";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useEffect, useRef, useState } from "react";
import type { CatalogPage } from "./App";

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
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);

  const [loadedFile, setLoadedFile] = useState<string | null>(null);

  /**
   * Позиція всередині дозволеного набору.
   *
   * Наприклад:
   *
   * pages:
   * [
   *   id 101 → page 25
   *   id 102 → page 26
   *   id 103 → page 28
   * ]
   *
   * pageIndex = 0 → PDF 25
   * pageIndex = 1 → PDF 26
   * pageIndex = 2 → PDF 28
   */
  const [pageIndex, setPageIndex] = useState(0);

  const [stageSize, setStageSize] = useState({
    width: 0,
    height: 0,
  });

  const [error, setError] = useState("");

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const touchStart = useRef<{
    x: number;
    y: number;
  } | null>(null);

  /**
   * Реальна сторінка PDF.
   *
   * ВАЖЛИВО:
   * використовуємо саме `page`,
   * а не `id` і не `source_page`.
   */
  const currentCatalogPage = pages[pageIndex];

  const pdfPageNumber = currentCatalogPage?.page;

  // ==================================================
  // ЗАВАНТАЖЕННЯ PDF
  // ==================================================

  useEffect(() => {
    let cancelled = false;

    let destroyLoadingTask: (() => Promise<void>) | undefined;

    setDocument(null);
    setLoadedFile(null);
    setError("");

    void import("pdfjs-dist")
      .then(({ GlobalWorkerOptions, getDocument }) => {
        if (cancelled) return;

        GlobalWorkerOptions.workerSrc = workerUrl;

        const loadingTask = getDocument({
          url: file,
        });

        destroyLoadingTask = () => loadingTask.destroy();

        return loadingTask.promise.then((pdf) => {
          if (!cancelled) {
            setDocument(pdf);
            setLoadedFile(file);
          }
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Не вдалося завантажити цей каталог. Перевірте наявність PDF-файлу.",
          );
        }
      });

    return () => {
      cancelled = true;
      void destroyLoadingTask?.();
    };
  }, [file]);

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

  // ==================================================
  // RESIZE
  // ==================================================

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

  // ==================================================
  // МАЛЮВАННЯ PDF
  // ==================================================

  useEffect(() => {
    if (
      !document ||
      loadedFile !== file ||
      !canvasRef.current ||
      !stageSize.width ||
      !stageSize.height ||
      !pdfPageNumber
    ) {
      return;
    }

    let cancelled = false;
    let renderTask: RenderTask | undefined;

    document
      .getPage(pdfPageNumber)
      .then((pdfPage) => {
        if (cancelled || !canvasRef.current) {
          return;
        }

        const naturalViewport = pdfPage.getViewport({
          scale: 1,
        });

        const scale = Math.min(
          stageSize.width / naturalViewport.width,
          stageSize.height / naturalViewport.height,
        );

        const viewport = pdfPage.getViewport({
          scale,
        });

        const canvas = canvasRef.current;

        const context = canvas.getContext("2d");

        if (!canvas || !context) {
          return;
        }

        const outputScale = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * outputScale);

        canvas.height = Math.floor(viewport.height * outputScale);

        canvas.style.width = `${Math.floor(viewport.width)}px`;

        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        renderTask = pdfPage.render({
          canvas,
          canvasContext: context,
          viewport,
        });

        return renderTask.promise;
      })
      .catch((reason) => {
        if (!cancelled && reason?.name !== "RenderingCancelledException") {
          setError("Не вдалося відобразити сторінку PDF.");
        }
      });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [document, file, loadedFile, pdfPageNumber, stageSize]);

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
  }

  function goNext() {
    goToIndex(pageIndex + 1);
  }

  function goPrevious() {
    goToIndex(pageIndex - 1);
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
  // СВАЙП
  // ==================================================

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;

    touchStart.current = null;

    if (!start) return;

    const touch = event.changedTouches[0];

    if (!touch) return;

    const deltaX = touch.clientX - start.x;

    const deltaY = touch.clientY - start.y;

    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
      return;
    }

    if (deltaX < 0) {
      goNext();
    } else {
      goPrevious();
    }
  }

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
      <div
        className="reader-stage"
        ref={stageRef}
        onTouchStart={(event) => {
          const touch = event.touches[0];

          if (!touch) return;

          touchStart.current = {
            x: touch.clientX,
            y: touch.clientY,
          };
        }}
        onTouchEnd={handleTouchEnd}
      >
        {error ? (
          <div className="reader-message" role="alert">
            {error}
          </div>
        ) : !document ? (
          <div className="reader-message">Завантаження каталогу…</div>
        ) : (
          <canvas
            className="pdf-page"
            ref={canvasRef}
            key={`${file}-${pdfPageNumber}`}
            aria-label={`Сторінка PDF ${pdfPageNumber}`}
          />
        )}
      </div>

      {navigationPanel}
    </section>
  );
}
