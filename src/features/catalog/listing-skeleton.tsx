import { getTranslations } from "next-intl/server";
import { ProductGridSkeleton } from "../../blocks/product-shelf/product-card";

// What a listing shows while its products load: the toolbar's place and a grid of skeleton cards.
export async function ListingSkeleton() {
  const t = await getTranslations("product");
  return (
    <div className="plp">
      <div className="plp__filters" aria-hidden="true" />
      <div>
        <div className="plp__toolbar" aria-hidden="true">
          <div className="sk-line sk-line--short sk" style={{ width: 120 }} />
        </div>
        <div style={{ paddingTop: "var(--space-5)" }}>
          <ProductGridSkeleton count={8} label={t("loading")} />
        </div>
      </div>
    </div>
  );
}
