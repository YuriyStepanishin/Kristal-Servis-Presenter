import { useEffect, useState } from "react";

type SlideNavigationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

export default function SlideNavigation({
  page,
  pageCount,
  onPageChange,
}: SlideNavigationProps) {
  const [pageDraft, setPageDraft] = useState(String(page));

  useEffect(() => {
    setPageDraft(String(page));
  }, [page]);

  function commitPage() {
    const requestedPage = Number(pageDraft);

    if (!Number.isFinite(requestedPage)) {
      setPageDraft(String(page));
      return;
    }

    const nextPage = Math.min(
      pageCount,
      Math.max(1, Math.round(requestedPage)),
    );

    onPageChange(nextPage);
  }

  return (
    <nav className="slide-navigation" aria-label="Навігація по сторінках">
      <button
        className="turn-button"
        type="button"
        aria-label="Попередня сторінка"
        title="Попередня сторінка"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <span aria-hidden="true">←</span>
        <span className="turn-label">Назад</span>
      </button>

      <div className="page-position">
        <label className="page-count">
          <input
            aria-label="Номер сторінки"
            inputMode="numeric"
            type="number"
            min={1}
            max={pageCount}
            value={pageDraft}
            onChange={(event) => setPageDraft(event.target.value)}
            onBlur={commitPage}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
          />

          <span>/ {pageCount}</span>
        </label>

        <input
          className="page-progress"
          aria-label="Перейти до сторінки"
          type="range"
          min={1}
          max={Math.max(1, pageCount)}
          value={page}
          onChange={(event) => onPageChange(Number(event.target.value))}
        />
      </div>

      <button
        className="turn-button"
        type="button"
        aria-label="Наступна сторінка"
        title="Наступна сторінка"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        <span className="turn-label">Далі</span>
        <span aria-hidden="true">→</span>
      </button>
    </nav>
  );
}
