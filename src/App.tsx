import { useMemo, useState } from "react";
import CatalogNavigation from "./CatalogNavigation";
import PdfReader from "./PdfReader";
import catalog from "./catalog.json";

export type CatalogPage = {
  id: number;
  page: number;
  sheet: number;
  source_page: number;
  file: string;
  group: string;
  subgroups: string[];
  tm: string | null;
};

const ALL = "Усі";

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export default function App() {
  const catalogs = (catalog.pages as Omit<CatalogPage, "id" | "sheet">[]).map(
    (item, index) => ({
      ...item,
      id: index + 1,
      sheet: item.source_page,
    }),
  );

  // --------------------------------------------------
  // СТАН
  // --------------------------------------------------

  const [selectedGroup, setSelectedGroup] = useState(ALL);
  const [selectedSubgroup, setSelectedSubgroup] = useState(ALL);
  const [selectedBrand, setSelectedBrand] = useState(ALL);

  const [selectedPage, setSelectedPage] = useState(catalogs[0]?.id ?? 1);

  // --------------------------------------------------
  // ГРУПИ
  // --------------------------------------------------

  const groups = useMemo(() => {
    return unique(catalogs.map((item) => item.group));
  }, [catalogs]);

  // --------------------------------------------------
  // ПІДГРУПИ
  // --------------------------------------------------

  const subgroups = useMemo(() => {
    return unique(
      catalogs
        .filter((item) => selectedGroup === ALL || item.group === selectedGroup)
        .flatMap((item) => item.subgroups),
    );
  }, [catalogs, selectedGroup]);

  // --------------------------------------------------
  // ТОРГОВІ МАРКИ
  // --------------------------------------------------

  const brands = useMemo(() => {
    return unique(
      catalogs
        .filter(
          (item) =>
            (selectedGroup === ALL || item.group === selectedGroup) &&
            (selectedSubgroup === ALL ||
              item.subgroups.includes(selectedSubgroup)),
        )
        .map((item) => item.tm)
        .filter((tm): tm is string => Boolean(tm)),
    );
  }, [catalogs, selectedGroup, selectedSubgroup]);

  // --------------------------------------------------
  // ВІДФІЛЬТРОВАНІ КАТАЛОГИ
  // --------------------------------------------------

  const visibleCatalogs = useMemo(() => {
    return catalogs.filter((item) => {
      const matchesGroup =
        selectedGroup === ALL || item.group === selectedGroup;

      const matchesSubgroup =
        selectedSubgroup === ALL || item.subgroups.includes(selectedSubgroup);

      const matchesBrand = selectedBrand === ALL || item.tm === selectedBrand;

      return matchesGroup && matchesSubgroup && matchesBrand;
    });
  }, [catalogs, selectedBrand, selectedGroup, selectedSubgroup]);

  // --------------------------------------------------
  // ПОТОЧНА СТОРІНКА
  // --------------------------------------------------

  const currentPage =
    visibleCatalogs.find((item) => item.id === selectedPage) ??
    visibleCatalogs[0];

  // --------------------------------------------------
  // ЗМІНА ГРУПИ
  // --------------------------------------------------

  function changeGroup(group: string) {
    setSelectedGroup(group);
    setSelectedSubgroup(ALL);
    setSelectedBrand(ALL);

    const firstPage = catalogs.find(
      (item) => group === ALL || item.group === group,
    );

    if (firstPage) {
      setSelectedPage(firstPage.id);
    }
  }

  // --------------------------------------------------
  // ЗМІНА ПІДГРУПИ
  // --------------------------------------------------

  function changeSubgroup(subgroup: string) {
    setSelectedSubgroup(subgroup);
    setSelectedBrand(ALL);

    const firstPage = catalogs.find(
      (item) =>
        (selectedGroup === ALL || item.group === selectedGroup) &&
        (subgroup === ALL || item.subgroups.includes(subgroup)),
    );

    if (firstPage) {
      setSelectedPage(firstPage.id);
    }
  }

  // --------------------------------------------------
  // ЗМІНА ТМ
  // --------------------------------------------------

  function changeBrand(brand: string) {
    setSelectedBrand(brand);

    const firstPage = catalogs.find(
      (item) =>
        (selectedGroup === ALL || item.group === selectedGroup) &&
        (selectedSubgroup === ALL ||
          item.subgroups.includes(selectedSubgroup)) &&
        (brand === ALL || item.tm === brand),
    );

    if (firstPage) {
      setSelectedPage(firstPage.id);
    }
  }

  function resetFilters() {
    setSelectedGroup(ALL);
    setSelectedSubgroup(ALL);
    setSelectedBrand(ALL);
    setSelectedPage(catalogs[0]?.id ?? 1);
  }

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="app-shell">
      <main className="main-area">
        {currentPage ? (
          <PdfReader
            file={currentPage.file}
            title={
              currentPage.tm
                ? `${currentPage.group} — ${currentPage.tm}`
                : currentPage.group
            }
            pages={visibleCatalogs}
            selectedPage={selectedPage}
            onSelectedPageChange={setSelectedPage}
            navigationPanel={
              <CatalogNavigation
                groups={[ALL, ...groups]}
                subgroups={[ALL, ...subgroups]}
                brands={[ALL, ...brands]}
                selectedGroup={selectedGroup}
                selectedSubgroup={selectedSubgroup}
                selectedBrand={selectedBrand}
                onSelectGroup={changeGroup}
                onSelectSubgroup={changeSubgroup}
                onSelectBrand={changeBrand}
                onReset={resetFilters}
              />
            }
          />
        ) : (
          <div className="empty-state reader-empty">
            За вибраними параметрами сторінок не знайдено.
          </div>
        )}
      </main>
    </div>
  );
}
