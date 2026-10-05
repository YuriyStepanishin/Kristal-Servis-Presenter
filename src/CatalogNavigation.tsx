import { useState } from "react";

type CatalogNavigationProps = {
  groups: string[];
  subgroups: string[];
  brands: string[];

  selectedGroup: string;
  selectedSubgroup: string;
  selectedBrand: string;

  onSelectGroup: (value: string) => void;
  onSelectSubgroup: (value: string) => void;
  onSelectBrand: (value: string) => void;
  onReset: () => void;
};

export default function CatalogNavigation({
  groups,
  subgroups,
  brands,
  selectedGroup,
  selectedSubgroup,
  selectedBrand,
  onSelectGroup,
  onSelectSubgroup,
  onSelectBrand,
  onReset,
}: CatalogNavigationProps) {
  const [openLevel, setOpenLevel] = useState<string | null>(null);

  const levels = [
    {
      title: "Група",
      options: groups,
      selected: selectedGroup,
      onSelect: onSelectGroup,
    },
    {
      title: "Підгрупа",
      options: subgroups,
      selected: selectedSubgroup,
      onSelect: onSelectSubgroup,
    },
    {
      title: "ТМ",
      options: brands,
      selected: selectedBrand,
      onSelect: onSelectBrand,
    },
  ];

  return (
    <nav className="catalog-filter-dock" aria-label="Фільтри каталогу">
      <div className="catalog-filter-levels">
        {levels.map((level) => (
          <div className="catalog-filter" key={level.title}>
            <button
              className="catalog-filter-trigger"
              type="button"
              aria-expanded={openLevel === level.title}
              onClick={() =>
                setOpenLevel((current) =>
                  current === level.title ? null : level.title,
                )
              }
            >
              <span className="catalog-filter-label">{level.title}</span>
              <span className="catalog-filter-value">{level.selected}</span>
              <span className="catalog-filter-chevron" aria-hidden="true">
                {openLevel === level.title ? "⌄" : "⌃"}
              </span>
            </button>

            {openLevel === level.title && (
              <div className="catalog-filter-menu" aria-label={level.title}>
                <div className="catalog-filter-options">
                  {level.options.map((option) => {
                    const active = level.selected === option;

                    return (
                      <button
                        className={
                          active
                            ? "catalog-filter-option active"
                            : "catalog-filter-option"
                        }
                        type="button"
                        key={option}
                        aria-pressed={active}
                        onClick={() => {
                          level.onSelect(option);
                          setOpenLevel(null);
                        }}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
        <button
          className="catalog-filter-trigger catalog-reset-trigger"
          type="button"
          aria-label="Скидання всіх фільтрів"
          title="Скидання всіх фільтрів"
          onClick={() => {
            onReset();
            setOpenLevel(null);
          }}
        >
          <span className="catalog-filter-label">Фільтри</span>
          <span className="catalog-filter-value">Скидання</span>
        </button>
      </div>
    </nav>
  );
}
