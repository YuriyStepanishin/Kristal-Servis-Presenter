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
  return (
    <nav className="slide-navigation" aria-label="Навігація по сторінках">
      <div className="page-position">
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
    </nav>
  );
}
